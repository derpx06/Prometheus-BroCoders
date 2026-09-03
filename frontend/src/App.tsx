import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { AppProvider } from './store/app'
import { UploadProvider } from './store/upload'
import { AppLayout } from './components/app/AppLayout'
import { Landing } from './pages/Landing'
import { Home } from './pages/Home'
import { Learning } from './pages/Learning'
import { NotesReader } from './pages/NotesReader'
import { Quiz } from './pages/Quiz'
import { Flashcards } from './pages/Flashcards'
import { Library } from './pages/Library'
import { Practice } from './pages/Practice'
import { Progress } from './pages/Progress'
import { StudyPack } from './pages/StudyPack'
import { Settings, Profile } from './pages/Account'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppProvider>
        {/* UploadProvider needs the router for post-ingest navigation and app state for
            the pack it creates, so it sits between the two. */}
        <UploadProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Home />} />
              <Route path="learn" element={<Learning />} />
              <Route path="library" element={<Library />} />
              <Route path="practice" element={<Practice />} />
              <Route path="progress" element={<Progress />} />
              <Route path="pack/:id" element={<StudyPack />} />
              <Route path="notes/:id" element={<NotesReader />} />
              <Route path="quiz/:id" element={<Quiz />} />
              <Route path="flashcards/:id" element={<Flashcards />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
              {/* Older links from earlier sessions */}
              <Route path="learning" element={<Navigate to="/app/learn" replace />} />
              <Route path="notes" element={<Navigate to="/app/library" replace />} />
              <Route path="quizzes" element={<Navigate to="/app/practice" replace />} />
              <Route path="flashcards" element={<Navigate to="/app/practice" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </UploadProvider>
        </AppProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
