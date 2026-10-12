'use client'
import { useRole } from './useRole'

// Admin 專用操作 Hook
export function useAdmin() {
  const { role } = useRole()
  const isAdmin = role === 'admin'

  return { isAdmin }
}
