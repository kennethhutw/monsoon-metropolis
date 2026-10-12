'use client'
import { useState, useEffect } from 'react'
import { AppUser, UserRole } from '@/types/user'

// TODO（Supabase Auth）：替換為：
// const { data: { user } } = await supabase.auth.getUser()
// const role = user?.user_metadata?.role as UserRole

export function useRole() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 🔵 MOCK：從 sessionStorage 讀取登入狀態
    const stored = sessionStorage.getItem('monsoon_user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) return false
      const appUser = (await res.json()) as AppUser
      sessionStorage.setItem('monsoon_user', JSON.stringify(appUser))
      setUser(appUser)
      return true
    } catch (error) {
      console.error('[useRole] login failed:', error)
      return false
    }
  }

  const logout = () => {
    sessionStorage.removeItem('monsoon_user')
    setUser(null)
    fetch('/api/auth/logout', { method: 'POST' }).catch((error) => console.error('[useRole] logout failed:', error))
  }

  return {
    user,
    role: user?.role as UserRole | null,
    isLoading,
    login,
    logout,
  }
}
