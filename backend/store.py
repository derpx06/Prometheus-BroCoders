"""Mongo repositories. Scope is always derived from the signed-in user."""
from __future__ import annotations
import time, uuid
from dataclasses import dataclass
from typing import Any, Iterable
from pymongo import DESCENDING
from .db import database

def _id() -> str: return uuid.uuid4().hex[:16]
def now() -> float: return time.time()
def _doc(row: dict | None) -> dict | None:
    if not row: return None
    row = dict(row); row.pop("_id", None); return row
def _docs(rows) -> list[dict]: return [_doc(x) for x in rows]
def _scope(user: "User") -> dict:
    return {"$or": [{"owner_id": user.id}, {"school_id": user.school_id}]} if user.school_id else {"owner_id": user.id}

@dataclass
class User:
    id: str; name: str; email: str; role: str; school_id: str | None; created_at: float
    @property
    def is_teacher(self): return self.role in ("teacher", "admin")
    @property
    def is_admin(self): return self.role == "admin"
    def public(self): return {"id":self.id,"name":self.name,"email":self.email,"role":self.role,"schoolId":self.school_id}
def _user(row: dict | None) -> User | None:
    row = _doc(row)
    return User(**{k: row[k] for k in ("id","name","email","role","school_id","created_at")}) if row else None

def create_school(name: str, **fields: Any) -> str:
    sid=_id(); database().schools.insert_one({"id":sid,"name":name,"type":fields.get("type") or "school","city":fields.get("city"),"country":fields.get("country"),"plan":fields.get("plan") or "trial","created_at":now()}); return sid
def get_school(school_id: str | None) -> dict | None: return _doc(database().schools.find_one({"id":school_id})) if school_id else None
def create_user(name,email,password_hash,role,school_id=None) -> User:
    ts=now(); row={"id":_id(),"name":name,"email":email.strip().lower(),"password_hash":password_hash,"role":role,"school_id":school_id,"created_at":ts}; database().users.insert_one(row); return _user(row)  # type: ignore
def register_school_admin(school_name,admin,school_fields=None) -> User:
    # Atlas supports transactions, but compensating delete also works on standalone dev Mongo.
    sid=create_school(school_name, **(school_fields or {}))
    try: return create_user(admin["name"],admin["email"],admin["password_hash"],"admin",sid)
    except Exception: database().schools.delete_one({"id":sid}); raise
def user_by_email(email): return _doc(database().users.find_one({"email":email.strip().lower()}))
def user_by_id(user_id): return _user(database().users.find_one({"id":user_id}))
def users_in_school(school_id, role=None):
    q={"school_id":school_id}; 
    if role: q["role"]=role
    return _docs(database().users.find(q, {"_id":0,"password_hash":0}).sort("created_at",DESCENDING))
def delete_user(user_id,school_id): return database().users.delete_one({"id":user_id,"school_id":school_id,"role":{"$ne":"admin"}}).deleted_count > 0

def create_invitation(token_hash,email,role,created_by,school_id=None,class_id=None,ttl_days=14):
    exp=now()+ttl_days*86400; row={"id":_id(),"token_hash":token_hash,"email":email.strip().lower(),"role":role,"school_id":school_id,"class_id":class_id,"created_by":created_by,"expires_at":exp,"accepted_at":None,"created_at":now()}; database().invitations.insert_one(row); return {"id":row["id"],"email":row["email"],"role":role,"expiresAt":exp}
def invitation_by_hash(token_hash): return _doc(database().invitations.find_one({"token_hash":token_hash,"accepted_at":None,"expires_at":{"$gt":now()}}))
def accept_invitation(invite_id): database().invitations.update_one({"id":invite_id,"accepted_at":None},{"$set":{"accepted_at":now()}})
def pending_invitations(school_id): return _docs(database().invitations.find({"school_id":school_id,"accepted_at":None,"expires_at":{"$gt":now()}},{"_id":0,"id":1,"email":1,"role":1,"expires_at":1,"created_at":1}).sort("created_at",DESCENDING))

def create_source(user,kind,title,text,origin=None):
    row={"id":_id(),"owner_id":user.id,"school_id":user.school_id,"kind":kind,"title":title,"origin":origin,"char_count":len(text),"text":text,"created_at":now()}; database().sources.insert_one(row); row.pop("text"); return row
def get_source(user,source_id,with_text=False):
    row=_doc(database().sources.find_one({"$and":[{"id":source_id},_scope(user)]}))
    if row and not with_text: row.pop("text",None)
    return row
def list_sources(user,limit=100): return _docs(database().sources.find(_scope(user),{"text":0}).sort("created_at",DESCENDING).limit(limit))
def delete_source(user,source_id): return database().sources.delete_one({"id":source_id,"owner_id":user.id}).deleted_count>0
def save_analysis(source_id,subject,concepts,edges,bank): database().source_analyses.replace_one({"source_id":source_id},{"source_id":source_id,"subject":subject,"concepts":concepts,"edges":edges,"bank":bank,"created_at":now()},upsert=True)
def get_analysis(source_id):
    row=_doc(database().source_analyses.find_one({"source_id":source_id})); 
    return {k:row[k] for k in ("subject","concepts","edges","bank")} if row else None

def create_material(user,kind,title,body,source_id=None,subject=None,grade=None,status="draft"):
    ts=now(); row={"id":_id(),"owner_id":user.id,"school_id":user.school_id,"source_id":source_id,"kind":kind,"title":title,"subject":subject,"grade":grade,"status":status,"body":body,"created_at":ts,"updated_at":ts}; database().materials.insert_one(row); return row
def get_material(user,material_id): return _doc(database().materials.find_one({"$and":[{"id":material_id},_scope(user)]}))
def get_material_for_student(user,material_id):
    assignment=database().assignments.find_one({"material_id":material_id,"published_at":{"$ne":None}})
    if not assignment or not database().class_members.find_one({"class_id":assignment["class_id"],"user_id":user.id}): return None
    return _doc(database().materials.find_one({"id":material_id}))
def list_materials(user,kind=None,limit=200):
    q=_scope(user); q={"$and":[q,{"kind":kind}]} if kind else q
    return _docs(database().materials.find(q,{"body":0}).sort("updated_at",DESCENDING).limit(limit))
def update_material(user,material_id,patch):
    fields={k:v for k,v in patch.items() if k in {"title","subject","grade","status","body"}}
    if fields: fields["updated_at"]=now(); database().materials.update_one({"id":material_id,"owner_id":user.id},{"$set":fields})
    return get_material(user,material_id)
def delete_material(user,material_id): return database().materials.delete_one({"id":material_id,"owner_id":user.id}).deleted_count>0

def create_bank_item(user,item,source_id=None):
    row={"id":_id(),"owner_id":user.id,"school_id":user.school_id,"source_id":source_id,"question":item["question"],"type":item.get("type","mcq"),"options":item.get("options") or [],"answer":item.get("answer",""),"explanation":item.get("explanation"),"subject":item.get("subject"),"grade":item.get("grade"),"topic":item.get("topic"),"difficulty":item.get("difficulty","medium"),"bloom":item.get("bloom"),"tags":item.get("tags") or [],"created_at":now()}; database().question_bank.insert_one(row); return row
def bank_item(user,item_id): return _doc(database().question_bank.find_one({"$and":[{"id":item_id},_scope(user)]}))
def list_bank(user,limit=300): return _docs(database().question_bank.find(_scope(user)).sort("created_at",DESCENDING).limit(limit))
def delete_bank_item(user,item_id): return database().question_bank.delete_one({"id":item_id,"owner_id":user.id}).deleted_count>0

def create_class(user,name,join_code,**fields):
    row={"id":_id(),"teacher_id":user.id,"school_id":user.school_id,"name":name,"subject":fields.get("subject"),"grade":fields.get("grade"),"join_code":join_code,"archived":0,"created_at":now()}; database().classes.insert_one(row); return row
def class_by_id(class_id): return _doc(database().classes.find_one({"id":class_id}))
def class_by_code(code): return _doc(database().classes.find_one({"join_code":code.strip().upper(),"archived":0}))
def teaches(user,class_id):
    row=class_by_id(class_id)
    return bool(row and (row["teacher_id"]==user.id or (user.is_admin and row["school_id"]==user.school_id) or database().class_members.find_one({"class_id":class_id,"user_id":user.id,"role":"co_teacher"})))
def is_member(user,class_id): return bool(database().class_members.find_one({"class_id":class_id,"user_id":user.id}))
def classes_taught(user):
    q={"$or":[{"teacher_id":user.id}, {"school_id":user.school_id}]} if user.is_admin and user.school_id else {"teacher_id":user.id}
    out=[]
    for row in _docs(database().classes.find(q).sort("created_at",DESCENDING)):
        row["student_count"]=database().class_members.count_documents({"class_id":row["id"],"role":"student"}); out.append(row)
    return out
def classes_joined(user):
    out=[]
    for m in database().class_members.find({"user_id":user.id}):
        row=class_by_id(m["class_id"])
        if row and not row.get("archived"):
            teacher=user_by_id(row["teacher_id"]); row["teacher_name"]=teacher.name if teacher else ""; out.append(row)
    return sorted(out,key=lambda x:x["created_at"],reverse=True)
def add_member(class_id,user_id,role="student"): database().class_members.update_one({"class_id":class_id,"user_id":user_id},{"$setOnInsert":{"class_id":class_id,"user_id":user_id,"role":role,"joined_at":now()}},upsert=True)
def remove_member(class_id,user_id): return database().class_members.delete_one({"class_id":class_id,"user_id":user_id}).deleted_count>0
def class_members(class_id):
    out=[]
    for m in database().class_members.find({"class_id":class_id}):
        u=user_by_id(m["user_id"])
        if u: out.append({"id":u.id,"name":u.name,"email":u.email,"role":m["role"],"joined_at":m["joined_at"]})
    return sorted(out,key=lambda x:x["name"].lower())
def archive_class(user,class_id): return database().classes.update_one({"id":class_id,"teacher_id":user.id},{"$set":{"archived":1}}).modified_count>0

def _assignment(row):
    if not row:return None
    row=_doc(row); material=_doc(database().materials.find_one({"id":row["material_id"]})); classroom=class_by_id(row["class_id"])
    if material: row["material_kind"]=material["kind"]; row["material_title"]=material["title"]; row["source_id"]=material.get("source_id")
    if classroom: row["class_name"]=classroom["name"]
    return row
def create_assignment(user,class_id,material_id,title,instructions,due_at,publish=True):
    row={"id":_id(),"class_id":class_id,"material_id":material_id,"assigned_by":user.id,"title":title,"instructions":instructions,"due_at":due_at,"published_at":now() if publish else None,"created_at":now()}; database().assignments.insert_one(row); return _assignment(row)
def assignment_by_id(assignment_id): return _assignment(database().assignments.find_one({"id":assignment_id}))
def assignments_for_class(class_id):
    out=[]
    for row in database().assignments.find({"class_id":class_id}).sort("created_at",DESCENDING):
        x=_assignment(row); x["submissions"]=database().attempts.count_documents({"assignment_id":x["id"],"submitted_at":{"$ne":None}}); out.append(x)
    return out
def assignments_for_student(user):
    ids=[x["class_id"] for x in database().class_members.find({"user_id":user.id})]; out=[]
    for row in database().assignments.find({"class_id":{"$in":ids},"published_at":{"$ne":None}}):
        x=_assignment(row); attempt=_doc(database().attempts.find_one({"assignment_id":x["id"],"user_id":user.id,"submitted_at":{"$ne":None}},sort=[("submitted_at",DESCENDING)])); x["attempt_id"]=attempt["id"] if attempt else None; x["score"]=attempt.get("score") if attempt else None; out.append(x)
    return sorted(out,key=lambda x:(x["due_at"] is None,x["due_at"] or 0,-x["created_at"]))
def assignment_is_locked(assignment_id): return bool(database().attempts.find_one({"assignment_id":assignment_id,"submitted_at":{"$ne":None}}))

def create_attempt(user,kind,assignment_id=None,material_id=None,source_id=None,max_score=None):
    row={"id":_id(),"user_id":user.id,"assignment_id":assignment_id,"material_id":material_id,"source_id":source_id,"kind":kind,"started_at":now(),"max_score":max_score,"submitted_at":None,"score":None}; database().attempts.insert_one(row); return attempt_by_id(user,row["id"])
def attempt_by_id(user,attempt_id):
    row=_doc(database().attempts.find_one({"id":attempt_id,"user_id":user.id}))
    if row: row["answers"]=_docs(database().answers.find({"attempt_id":attempt_id}).sort("answered_at",1))
    return row
def open_attempt(user,assignment_id): return _doc(database().attempts.find_one({"user_id":user.id,"assignment_id":assignment_id,"submitted_at":None},sort=[("started_at",DESCENDING)]))
def record_answer(attempt_id,question_ref,response,correct,score,concept=None,prompt=None):
    row={"id":_id(),"attempt_id":attempt_id,"question_ref":question_ref,"prompt":prompt,"response":response,"correct":bool(correct),"score":score,"concept":concept,"answered_at":now()}; database().answers.insert_one(row); return {"id":row["id"],"correct":bool(correct),"score":score}
def submit_attempt(user,attempt_id):
    answers=_docs(database().answers.find({"attempt_id":attempt_id})); total=sum(float(x["score"]) for x in answers); database().attempts.update_one({"id":attempt_id,"user_id":user.id,"submitted_at":None},{"$set":{"submitted_at":now(),"score":total},"$setOnInsert":{}})
    database().attempts.update_one({"id":attempt_id,"user_id":user.id,"max_score":None},{"$set":{"max_score":float(len(answers))}}); return attempt_by_id(user,attempt_id)
def attempts_for_user(user,limit=50):
    out=[]
    for row in database().attempts.find({"user_id":user.id,"submitted_at":{"$ne":None}}).sort("submitted_at",DESCENDING).limit(limit):
        x=_doc(row); m=_doc(database().materials.find_one({"id":x.get("material_id")})); s=_doc(database().sources.find_one({"id":x.get("source_id")})); x["material_title"]=m.get("title") if m else None; x["material_kind"]=m.get("kind") if m else None; x["source_title"]=s.get("title") if s else None; out.append(x)
    return out
def attempts_for_assignment(assignment_id):
    out=[]
    for row in database().attempts.find({"assignment_id":assignment_id,"submitted_at":{"$ne":None}}).sort("submitted_at",DESCENDING):
        x=_doc(row); u=user_by_id(x["user_id"]); x["student_name"]=u.name if u else ""; x["student_id"]=x["user_id"]; out.append(x)
    return out
def answers_for_assignment(assignment_id):
    ids=[x["id"] for x in database().attempts.find({"assignment_id":assignment_id,"submitted_at":{"$ne":None}})]; return _docs(database().answers.find({"attempt_id":{"$in":ids}}))
def answers_for_user(user,limit=2000):
    ids=[x["id"] for x in database().attempts.find({"user_id":user.id})]; return _docs(database().answers.find({"attempt_id":{"$in":ids}}).sort("answered_at",DESCENDING).limit(limit))

def get_or_create_study_state(user,source_id,concept_count):
    row=_doc(database().study_states.find_one({"user_id":user.id,"source_id":source_id}))
    if row:return row["id"]
    sid=_id(); database().study_states.insert_one({"id":sid,"user_id":user.id,"source_id":source_id,"day":0,"created_at":now(),"updated_at":now()}); database().concept_mastery.insert_many([{"study_state_id":sid,"concept_idx":i,"p_known":.2,"attempts":0,"ease":2.5,"interval":0,"reps":0,"due":0,"seen":[]} for i in range(concept_count)]); return sid
def load_mastery(state_id):
    return {r["concept_idx"]:{"p_known":r["p_known"],"attempts":r["attempts"],"ease":r["ease"],"interval":r["interval"],"reps":r["reps"],"due":r["due"],"seen":set(r["seen"])} for r in _docs(database().concept_mastery.find({"study_state_id":state_id}).sort("concept_idx",1))}
def save_mastery(state_id,idx,m):
    database().concept_mastery.update_one({"study_state_id":state_id,"concept_idx":idx},{"$set":{"p_known":m["p_known"],"attempts":m["attempts"],"ease":m["ease"],"interval":m["interval"],"reps":m["reps"],"due":m["due"],"seen":sorted(m["seen"])}}); database().study_states.update_one({"id":state_id},{"$set":{"updated_at":now()}})
def study_day(state_id):
    row=_doc(database().study_states.find_one({"id":state_id})); return int(row.get("day",0)) if row else 0
def mastery_by_source(user,source_ids: Iterable[str]):
    states={x["id"]:x["source_id"] for x in database().study_states.find({"user_id":user.id,"source_id":{"$in":list(source_ids)}})}; out={}
    for r in database().concept_mastery.find({"study_state_id":{"$in":list(states)}}):
        if r["attempts"]>0: out.setdefault(states[r["study_state_id"]],[]).append(r["p_known"])
    return out

def chat_history(user,source_id,limit=100): return _docs(database().chat_messages.find({"user_id":user.id,"source_id":source_id}).sort("created_at",1).limit(limit))
def save_chat_message(user,source_id,role,content,citations=None):
    row={"id":_id(),"user_id":user.id,"source_id":source_id,"role":role,"content":content,"citations":citations or [],"created_at":now()}; database().chat_messages.insert_one(row); return row
