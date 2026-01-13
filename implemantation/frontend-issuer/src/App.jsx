import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import IssueCredential from './pages/IssueCredential'
import CredentialHistory from './pages/CredentialHistory'

function App() {
  const [currentView, setCurrentView] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-800">Issuer Dashboard</h1>
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'dashboard'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('issue')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'issue'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Issue Credential
              </button>
              <button
                onClick={() => setCurrentView('history')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  currentView === 'history'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                History
              </button>
            </div>
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

export default App
