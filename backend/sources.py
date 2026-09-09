"""Source ingestion: anything a learner brings in -> plain text.

Three kinds, one output. Whatever arrives here becomes a row in `sources`, and from that
point nothing downstream knows or cares whether the text came from a PDF, a paste, or a
lecture video — which is what makes "upload once, generate many times" possible.
"""
from __future__ import annotations

import html
import io
import json
import re
import zipfile

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MIN_TEXT_CHARS = 200

_XML_TAG = re.compile(r"<[^>]+>")
_YT_ID = re.compile(
    r"(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)


class IngestError(Exception):
    """Carries a message intended to be shown to the person who uploaded the thing."""

    def __init__(self, message: str, status: int = 422):
        super().__init__(message)
        self.status = status


def normalise(text: str) -> str:
    text = text.replace("\r\n", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def require_enough_text(text: str, what: str) -> str:
    text = normalise(text)
    if len(text) < MIN_TEXT_CHARS:
        raise IngestError(
            f"There is not enough readable text in {what}. "
            "A scanned PDF needs OCR first, and a few sentences is not enough to find "
            "concepts in — aim for at least a couple of paragraphs."
        )
    return text


# ---------------------------------------------------------------------- files

def _docx_text(raw: bytes) -> str:
    """Paragraph text out of a .docx without adding a dependency."""
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        xml = z.read("word/document.xml").decode("utf-8", "ignore")
    xml = re.sub(r"</w:p>", "\n", xml)
    return html.unescape(_XML_TAG.sub("", xml))


def _pptx_text(raw: bytes) -> str:
    """Slide text out of a .pptx. Same trick as .docx — the slides are XML in a zip."""
    out: list[str] = []
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        slides = sorted(
            (n for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
            key=lambda n: int(re.findall(r"\d+", n)[-1]),
        )
        for name in slides:
            xml = z.read(name).decode("utf-8", "ignore")
            xml = re.sub(r"</a:p>", "\n", xml)
            out.append(html.unescape(_XML_TAG.sub("", xml)))
    return "\n\n".join(out)


def extract_file(raw: bytes, filename: str) -> str:
    if len(raw) > MAX_UPLOAD_BYTES:
        raise IngestError("That file is larger than 20 MB.", status=413)

    name = (filename or "material").lower()
    try:
        if name.endswith(".pdf"):
            from pypdf import PdfReader

            reader = PdfReader(io.BytesIO(raw))
            text = "\n".join((p.extract_text() or "") for p in reader.pages)
        elif name.endswith(".docx"):
            text = _docx_text(raw)
        elif name.endswith(".pptx"):
            text = _pptx_text(raw)
        elif name.endswith((".doc", ".ppt")):
            raise IngestError(
                "That is the old binary Office format, which this build cannot read. "
                "Save it as .docx or .pptx, or export a PDF."
            )
        else:
            text = raw.decode("utf-8", "ignore")
    except IngestError:
        raise
    except Exception:
        raise IngestError("We could not read that file.")

    return require_enough_text(text, filename or "that file")


# -------------------------------------------------------------------- youtube

def youtube_id(url: str) -> str | None:
    match = _YT_ID.search(url.strip())
    if match:
        return match.group(1)
    # A bare id pasted on its own
    bare = url.strip()
    return bare if re.fullmatch(r"[A-Za-z0-9_-]{11}", bare) else None


def _caption_tracks(page: str) -> list[dict]:
    """Pull captionTracks out of the watch page's embedded player response."""
    marker = '"captionTracks":'
    at = page.find(marker)
    if at == -1:
        return []
    start = page.find("[", at)
    depth, end = 0, -1
    for i in range(start, min(len(page), start + 200_000)):
        if page[i] == "[":
            depth += 1
        elif page[i] == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end == -1:
        return []
    try:
        tracks = json.loads(page[start:end])
    except json.JSONDecodeError:
        return []
    return [t for t in tracks if isinstance(t, dict) and t.get("baseUrl")]


def _pick_track(tracks: list[dict]) -> dict:
    """Prefer a real English track, then any manual track, then anything at all."""
    def lang(t: dict) -> str:
        return (t.get("languageCode") or "").lower()

    manual = [t for t in tracks if t.get("kind") != "asr"]
    for pool in (manual, tracks):
        english = [t for t in pool if lang(t).startswith("en")]
        if english:
            return english[0]
        if pool:
            return pool[0]
    return tracks[0]


def _title(page: str) -> str | None:
    match = re.search(r'<meta name="title" content="([^"]*)"', page)
    return html.unescape(match.group(1)) if match else None


def fetch_youtube(url: str) -> tuple[str, str]:
    """(transcript, title) for a YouTube URL.

    This reads the caption track the watch page itself advertises. It needs network access
    and it depends on YouTube's page shape, which they change without notice — so every
    failure path below says what went wrong and points at Paste text, rather than leaving
    a spinner running. There is no API key involved.
    """
    import httpx

    video_id = youtube_id(url)
    if not video_id:
        raise IngestError("That does not look like a YouTube link.")

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    try:
        with httpx.Client(timeout=20, follow_redirects=True, headers=headers) as client:
            page = client.get(f"https://www.youtube.com/watch?v={video_id}").text
            tracks = _caption_tracks(page)
            if not tracks:
                raise IngestError(
                    "That video has no captions we can read, so there is no transcript to "
                    "learn from. Open the transcript on YouTube, copy it, and use Paste text "
                    "— it runs through exactly the same pipeline."
                )
            track = _pick_track(tracks)
            raw = client.get(f"{track['baseUrl']}&fmt=json3").text
    except IngestError:
        raise
    except Exception:
        raise IngestError(
            "We could not reach YouTube to fetch that transcript. Check the connection, or "
            "paste the transcript text instead."
        )

    try:
        events = json.loads(raw).get("events") or []
    except json.JSONDecodeError:
        raise IngestError(
            "YouTube returned a caption format we could not parse. Paste the transcript "
            "text instead and it will work."
        )

    pieces = [
        seg.get("utf8", "")
        for event in events
        for seg in (event.get("segs") or [])
    ]
    transcript = " ".join(p for p in pieces if p and p != "\n")
    # Auto-captions arrive with no sentence punctuation at all; the concept extractor splits
    # on sentence boundaries, so without this it sees one enormous sentence and finds nothing.
    transcript = re.sub(r"\s+", " ", transcript).strip()
    if transcript and not re.search(r"[.!?]", transcript):
        transcript = _punctuate(transcript)

    title = _title(page) or f"YouTube video {video_id}"
    return require_enough_text(transcript, "that video's captions"), title


def _punctuate(text: str, words_per_sentence: int = 18) -> str:
    """Insert sentence breaks into unpunctuated auto-captions.

    Crude on purpose: it only needs to give the sentence splitter something to cut on. The
    boundaries are approximate, which affects which sentence gets quoted as evidence but not
    which concepts are found.
    """
    words = text.split()
    out: list[str] = []
    for i in range(0, len(words), words_per_sentence):
        chunk = " ".join(words[i : i + words_per_sentence]).strip()
        if chunk:
            out.append(chunk[0].upper() + chunk[1:] + ".")
    return " ".join(out)
