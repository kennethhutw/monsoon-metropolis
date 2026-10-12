'use client'
import { useRole } from '@/hooks/useRole'
import { UserRole } from '@/types/user'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { role, isLoading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!role || !allowedRoles.includes(role))) {
      router.replace('/login')
    }
  }, [role, isLoading, allowedRoles, router])

  if (isLoading) return null
  if (!role || !allowedRoles.includes(role)) return null

  return <>{children}</>
}
