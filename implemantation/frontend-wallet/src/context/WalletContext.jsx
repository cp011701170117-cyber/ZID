import { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'

const WalletContext = createContext(null)

export function WalletProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('session')
    if (stored) {
      const parsed = JSON.parse(stored)
      setSession(parsed)
      setIsAuthenticated(true)
    }
  }, [])

  const loginWithWallet = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed')
    }

    const provider = new ethers.BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const address = await signer.getAddress()

    // 1️⃣ Get nonce
    const nonceRes = await fetch(`/api/auth/nonce?address=${address}`)
    const { nonce } = await nonceRes.json()

    // 2️⃣ Sign nonce
    const signature = await signer.signMessage(nonce)

    // 3️⃣ Verify signature
    const verifyRes = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, signature })
    })

    const data = await verifyRes.json()
    if (!verifyRes.ok) {
      throw new Error(data.error || 'Login failed')
    }

    const sessionData = {
      token: data.token,
      address,
      did: data.did,
      username: data.username || 'User'
    }

    localStorage.setItem('session', JSON.stringify(sessionData))
    setSession(sessionData)
    setIsAuthenticated(true)

    return sessionData
  }

  const logout = () => {
    localStorage.removeItem('session')
    setSession(null)
    setIsAuthenticated(false)
  }

  return (
    <WalletContext.Provider
      value={{
        session,
        isAuthenticated,
        loginWithWallet, // ✅ EXPORTED
        logout
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
