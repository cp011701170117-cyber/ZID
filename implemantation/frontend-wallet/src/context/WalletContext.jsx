import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { apiRequest } from '../utils/api'
import {
  createSession
} from '../utils/sessionManager'

const WalletContext = createContext(null)

// NOTE: apiRequest already knows base URL

export function WalletProvider({ children }) {
  const [session, setSession] = useState(() => {
    const stored = sessionStorage.getItem('session')
    return stored ? JSON.parse(stored) : null
  })
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(sessionStorage.getItem('session')))
  const [loading, setLoading] = useState(false)

  const loginWithWallet = async () => {
    try {
      setLoading(true)
      sessionStorage.removeItem('userSession')

      if (!window.ethereum) {
        throw new Error('MetaMask not installed')
      }

      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // 1️⃣ Get nonce from backend
      const { nonce } = await apiRequest('/auth/nonce', {
        method: 'POST',
        body: { address }
      })

      // 2️⃣ Sign nonce
      const signature = await signer.signMessage(nonce)

      // 3️⃣ Verify signature
      const data = await apiRequest('/auth/verify', {
        method: 'POST',
        body: { address, signature }
      })

      const sessionData = {
        token: data.token,
        address,
        did: data.did,
        role: data.role || 'holder'
      }

      sessionStorage.clear()
      createSession({ role: sessionData.role, address })
      sessionStorage.setItem('session', JSON.stringify(sessionData))
      setSession(sessionData)
      setIsAuthenticated(true)

      return sessionData
    } catch (err) {
      console.error('Login error:', err)
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
    window.location.href = '/login'
  }

  const registerDID = async (username) => {
    if (!session?.address) {
      throw new Error('No wallet address available')
    }
    const data = await apiRequest('/did/register', {
      method: 'POST',
      body: { username, address: session.address }
    })

    const updated = { ...session, did: data.did || data.id || session.did }
    setSession(updated)
    sessionStorage.setItem('session', JSON.stringify(updated))
    return data
  }


  return (
    <WalletContext.Provider
      value={{
        session,
        isAuthenticated,
        loading,
        loginWithWallet,
        logout,
        registerDID
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
