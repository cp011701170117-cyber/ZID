import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import IssueCredential from './pages/IssueCredential'
import CredentialHistory from './pages/CredentialHistory'
import Login from './pages/Login'
import { IssuerProvider, useIssuer } from './context/IssuerContext'

function InnerApp() {
  const [currentView, setCurrentView] = useState('dashboard')
  const { isAuthenticated } = useIssuer()

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Ambient blobs */}
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />

      <nav className="zid-navbar">
        <div className="zid-navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="zid-logo">
              <div className="zid-logo-mark">ZID</div>
              <span className="zid-logo-text">ZID</span>
            </div>
            <span className="zid-portal-badge">Issuer Portal</span>
          </div>

          <div className="zid-nav-links">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`zid-nav-link${currentView === 'dashboard' ? ' active' : ''}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('issue')}
              className={`zid-nav-link${currentView === 'issue' ? ' active' : ''}`}
            >
              Issue Credential
            </button>
            <button
              onClick={() => setCurrentView('history')}
              className={`zid-nav-link${currentView === 'history' ? ' active' : ''}`}
            >
              History
            </button>
          </div>
        </div>
      </nav>

      <main>
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'issue' && <IssueCredential />}
        {currentView === 'history' && <CredentialHistory />}
      </main>
    </div>
  )
}

function App() {
  return (
    <IssuerProvider>
      <InnerApp />
    </IssuerProvider>
  )
}

export default App
