import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { apiRequest } from '../utils/api'
import {
  createSession
} from '../utils/sessionManager'

const IssuerContext = createContext(null)

export function IssuerProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)

  const [credentials, setCredentials] = useState([])
  const [credentialsLoading, setCredentialsLoading] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('issuerSession')
    if (stored) {
      const parsed = JSON.parse(stored)
      setSession(parsed)
      setIsAuthenticated(true)
    }
  }, [])

  const loginWithWallet = async () => {
    try {
      setLoading(true)
      if (!window.ethereum) {
        throw new Error('MetaMask not installed')
      }
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      const { nonce } = await apiRequest('/auth/issuer/nonce', {
        method: 'POST',
        body: { address }
      })

      const signature = await signer.signMessage(nonce)

      const data = await apiRequest('/auth/issuer/verify', {
        method: 'POST',
        body: { address, signature }
      })

      const sessionData = {
        token: data.token,
        address,
        did: data.did,
        role: data.role || 'issuer'
      }

      sessionStorage.clear()
      createSession({ role: sessionData.role, address })
      sessionStorage.setItem('issuerSession', JSON.stringify(sessionData))
      // also keep simple token for api helper
      sessionStorage.setItem('token', data.token)
      setSession(sessionData)
      setIsAuthenticated(true)
      return sessionData
    } catch (err) {
      console.error('Issuer login error:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    sessionStorage.clear()
    localStorage.clear()
    setSession(null)
    setIsAuthenticated(false)
    setCredentials([])
    window.location.href = '/login'
  }

  // fetch credentials for this issuer from backend
  const loadCredentials = useCallback(async () => {
    if (!session?.did) return
    setCredentialsLoading(true)
    try {
      const data = await apiRequest(`/credentials/issuer/${encodeURIComponent(session.did)}`)
      setCredentials(data.credentials || [])
    } catch (err) {
      console.error('Failed to load issuer credentials', err)
      setCredentials([])
    } finally {
      setCredentialsLoading(false)
    }
  }, [session])

  useEffect(() => {
    if (isAuthenticated && session?.did) {
      loadCredentials()
    }
  }, [isAuthenticated, session, loadCredentials])

  return (
    <IssuerContext.Provider
      value={{
        session,
        isAuthenticated,
        loading,
        loginWithWallet,
        logout,
        credentials,
        loadCredentials,
        credentialsLoading
      }}
    >
      {children}
    </IssuerContext.Provider>
  )
}

export function useIssuer() {
  const ctx = useContext(IssuerContext)
  if (!ctx) throw new Error('useIssuer must be used inside IssuerProvider')
  return ctx
}
