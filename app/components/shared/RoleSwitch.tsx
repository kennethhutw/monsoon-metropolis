'use client'
import { useRole } from '@/hooks/useRole'
import { UserRole } from '@/types/user'
import { useRouter } from 'next/navigation'
import { MOCK_USERS } from '@/data/mockUsers'

const ROLE_LABELS: Record<UserRole, string> = {
  bank: 'Bank',
  exporter: 'Exporter',
  importer: 'Importer',
  researcher: 'Researcher',
  admin: 'Admin',
}

const ROLE_REDIRECT: Record<UserRole, string> = {
  bank: '/bank/dashboard',
  exporter: '/exporter/applications',
  importer: '/importer/payables',
  researcher: '/researcher',
  admin: '/admin',
}

export function RoleSwitch() {
  const { role, login } = useRole()
  const router = useRouter()

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null

  const handleSwitch = async (targetRole: UserRole) => {
    const user = MOCK_USERS.find(u => u.role === targetRole)
    if (!user) return
    const success = await login(user.email, user.password)
    if (success) router.push(ROLE_REDIRECT[targetRole])
  }

  return (
    <div className="fixed bottom-4 right-4 bg-surface border border-border-subtle rounded-xl shadow-modal p-3 z-50">
      <p className="text-label-md text-ink-faint mb-2 font-bold font-mono tracking-wide">DEMO ROLE SWITCH</p>
      <div className="flex flex-col gap-1">
        {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
          <button
            key={r}
            onClick={() => handleSwitch(r)}
            className={`text-body-md px-3 py-1.5 rounded-lg text-left transition-colors ${
              role === r
                ? 'bg-primary-container text-on-primary'
                : 'hover:bg-surface-container-low text-on-surface-variant'
            }`}
          >
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>
    </div>
  )
}
