import { createContext, useContext, useState, useEffect } from 'react'
import { generateDID, getKeyPairFromStorage, saveKeyPairToStorage } from '../utils/crypto'

const WalletContext = createContext()

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}

export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check if wallet exists in localStorage
    const storedWallet = localStorage.getItem('identity_wallet')
    if (storedWallet) {
      try {
        const walletData = JSON.parse(storedWallet)
        setWallet(walletData)
        setIsAuthenticated(true)
      } catch (e) {
        console.error('Failed to load wallet:', e)
      }
    }
  }, [])

  const createWallet = async (username) => {
    try {
      const { did, keyPair } = await generateDID()
      const walletData = {
        username,
        did,
        publicKey: keyPair.getPublic('hex'),
        createdAt: new Date().toISOString()
      }
      
      // Save private key securely (in production, use proper key management)
      saveKeyPairToStorage(keyPair)
      
      // Register DID on blockchain
      const response = await fetch('/api/did/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          did,
          publicKey: walletData.publicKey
        })
      })

      if (!response.ok) {
        throw new Error('Failed to register DID on blockchain')
      }

      localStorage.setItem('identity_wallet', JSON.stringify(walletData))
      setWallet(walletData)
      setIsAuthenticated(true)
      
      return walletData
    } catch (error) {
      console.error('Error creating wallet:', error)
      throw error
    }
  }

  const login = (username) => {
    const storedWallet = localStorage.getItem('identity_wallet')
    if (storedWallet) {
      const walletData = JSON.parse(storedWallet)
      if (walletData.username === username) {
        setWallet(walletData)
        setIsAuthenticated(true)
        return true
      }
    }
    return false
  }

  const logout = () => {
    localStorage.removeItem('identity_wallet')
    setWallet(null)
    setIsAuthenticated(false)
  }

  return (
    <WalletContext.Provider value={{
      wallet,
      isAuthenticated,
      createWallet,
      login,
      logout
    }}>
      {children}
    </WalletContext.Provider>
  )
}
