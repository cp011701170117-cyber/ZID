import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Credentials from './pages/Credentials'
import Verification from './pages/Verification'

function App() {
  return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="/verification" element={<Verification />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
  )
}

export default App
