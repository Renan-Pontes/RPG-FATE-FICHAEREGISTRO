import { createContext, useContext, useState, useEffect } from 'react'
import * as api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed)
      } catch {
        localStorage.removeItem('auth')
      }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const data = await api.login(username, password)
    localStorage.setItem('auth', JSON.stringify(data))
    setUser(data)
    return data
  }

  const register = async (username, email, password) => {
    const data = await api.register(username, email, password)
    localStorage.setItem('auth', JSON.stringify(data))
    setUser(data)
    return data
  }

  const logout = () => {
    localStorage.removeItem('auth')
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isGameMaster: user?.is_game_master || false,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
