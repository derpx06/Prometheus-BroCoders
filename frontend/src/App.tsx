import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { AuthProvider, useAuth } from './store/auth'
import { AppProvider } from './store/app'
import { UploadProvider } from './store/upload'
import { AppLayout } from './components/app/AppLayout'
import { Landing } from './pages/Landing'
import { AcceptInvite, JoinClass, Login, Signup } from './pages/Auth'
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
import { Create } from './pages/Create'
import { Classes, ClassDetail } from './pages/Classes'
import { AssignmentDetail, Assignments, AttemptPlayer } from './pages/Assignments'
import { MaterialView } from './pages/MaterialView'
import { Analytics } from './pages/Analytics'
import { QuestionBank } from './pages/QuestionBank'
import { Teachers } from './pages/Teachers'

/**
 * Client-side guards are *navigation*, not authorisation.
 *
 * Every protected endpoint checks the session and the role again on the server, which is
 * where the real decision is made — these components only keep people out of screens that
 * would be empty for them.
 */

function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <Splash />
  if (status === 'anonymous') {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  return <>{children}</>
}

function RequireTeacher({ children }: { children: ReactNode }) {
  const { status, isTeacher } = useAuth()
  if (status === 'loading') return <Splash />
  if (status === 'anonymous') return <Navigate to="/login" replace />
  if (!isTeacher) return <Navigate to="/app" replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { status, isAdmin } = useAuth()
  if (status === 'loading') return <Splash />
  if (!isAdmin) return <Navigate to="/app" replace />
  return <>{children}</>
}

/** Deliberately almost nothing: the session check takes one request, and a skeleton of a
 *  layout we may not end up rendering is worse than a quiet pause. */
function Splash() {
  return <div className="min-h-dvh bg-canvas" />
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppProvider>
            {/* UploadProvider needs the router for post-ingest navigation and app state for
                the pack it creates, so it sits between the two. */}
            <UploadProvider>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route path="/join" element={<JoinClass />} />
                <Route path="/join/:code" element={<JoinClass />} />

                <Route path="/app" element={<AppLayout />}>
                  <Route index element={<Home />} />

                  {/* Open to the anonymous demo as well as to signed-in users: these read
                      whatever material the app store is holding, server-backed or bundled. */}
                  <Route path="library" element={<Library />} />
                  <Route path="practice" element={<Practice />} />
                  <Route path="progress" element={<Progress />} />
                  <Route path="pack/:id" element={<StudyPack />} />
                  <Route path="notes/:id" element={<NotesReader />} />
                  <Route path="quiz/:id" element={<Quiz />} />
                  <Route path="flashcards/:id" element={<Flashcards />} />
                  <Route path="learn" element={<Learning />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="profile" element={<Profile />} />

                  {/* Signed in */}
                  <Route
                    path="create"
                    element={
                      <RequireAuth>
                        <Create />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="classes"
                    element={
                      <RequireAuth>
                        <Classes />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="classes/:id"
                    element={
                      <RequireAuth>
                        <ClassDetail />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="assignments"
                    element={
                      <RequireAuth>
                        <Assignments />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="assignments/:id"
                    element={
                      <RequireAuth>
                        <AssignmentDetail />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="attempt/:id"
                    element={
                      <RequireAuth>
                        <AttemptPlayer />
                      </RequireAuth>
                    }
                  />
                  <Route
                    path="material/:id"
                    element={
                      <RequireAuth>
                        <MaterialView />
                      </RequireAuth>
                    }
                  />

                  {/* Teacher and above */}
                  <Route
                    path="bank"
                    element={
                      <RequireTeacher>
                        <QuestionBank />
                      </RequireTeacher>
                    }
                  />
                  <Route
                    path="analytics"
                    element={
                      <RequireTeacher>
                        <Analytics />
                      </RequireTeacher>
                    }
                  />

                  {/* Administrator */}
                  <Route
                    path="teachers"
                    element={
                      <RequireAdmin>
                        <Teachers />
                      </RequireAdmin>
                    }
                  />

                  {/* Older links from earlier sessions */}
                  <Route path="learning" element={<Navigate to="/app/learn" replace />} />
                  <Route path="notes" element={<Navigate to="/app/library" replace />} />
                  <Route path="quizzes" element={<Navigate to="/app/practice" replace />} />
                  <Route path="flashcards" element={<Navigate to="/app/practice" replace />} />
                  <Route path="source/:id" element={<SourceRedirect />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </UploadProvider>
          </AppProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

/** `/app/source/:id` is the natural URL for a source; the screen that renders one is the
 *  existing study-pack page, which keys packs as `src-<id>`. */
function SourceRedirect() {
  const { pathname } = useLocation()
  const id = pathname.split('/').pop() ?? ''
  return <Navigate to={`/app/pack/src-${id}`} replace />
}
