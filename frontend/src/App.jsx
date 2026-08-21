import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Files from './pages/Files'
import Logs from './pages/Logs'
import Rules from './pages/Rules'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/login"
        element={
          <ErrorBoundary>
            <Login />
          </ErrorBoundary>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/alerts"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Alerts />
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/files"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Files />
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/logs"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Logs />
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
      <Route
        path="/rules"
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Rules />
            </ProtectedRoute>
          </ErrorBoundary>
        }
      />
    </Routes>
  )
}

export default App
