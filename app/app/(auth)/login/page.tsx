'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRole } from '@/hooks/useRole'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, Landmark, Truck, ShoppingCart, LineChart, Settings2,
} from 'lucide-react'
import { MOCK_USERS } from '@/data/mockUsers'
import { UserRole } from '@/types/user'

const ROLE_REDIRECT: Record<string, string> = {
  bank:       '/bank/dashboard',
  exporter:   '/exporter/applications',
  importer:   '/importer/payables',
  researcher: '/researcher',
  admin:      '/admin',
}

const DEMO_ROLES: { role: UserRole; label: string; icon: typeof Landmark }[] = [
  { role: 'bank', label: 'Bank', icon: Landmark },
  { role: 'exporter', label: 'Exporter', icon: Truck },
  { role: 'importer', label: 'Importer', icon: ShoppingCart },
  { role: 'researcher', label: 'Researcher', icon: LineChart },
  { role: 'admin', label: 'Admin', icon: Settings2 },
]

export default function LoginPage() {
  const { login } = useRole()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const success = await login(email.trim(), password)
    if (success) {
      const stored = sessionStorage.getItem('monsoon_user')
      const user = stored ? JSON.parse(stored) : null
      const dest = user?.role ? ROLE_REDIRECT[user.role] : '/bank/dashboard'
      router.push(dest)
    } else {
      setError('Invalid email or password')
      setLoading(false)
    }
  }

  const handleDemoRole = async (role: UserRole) => {
    const user = MOCK_USERS.find(u => u.role === role)
    if (!user) return
    setEmail(user.email)
    setPassword(user.password)
    setLoading(true)
    const success = await login(user.email, user.password)
    if (success) {
      router.push(ROLE_REDIRECT[role])
    } else {
      setError('Invalid email or password')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Left: brand panel */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-primary relative items-center justify-center p-12 overflow-hidden">
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <div className="mb-8 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
            <Image src="/ms-logo.png" alt="Monsoon" width={64} height={64} className="w-16 h-16 rounded-lg object-cover" />
          </div>
          <h1 className="text-display-lg text-white mb-4">Monsoon</h1>
          <p className="text-body-lg text-primary-fixed opacity-90 mb-12">
            Compliant trade receivables financing for Asia&apos;s SME exporters — verified end-to-end
            with Cleanverse CVI and CVA, settled on Monad.
          </p>
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-left">
              <div className="text-label-md text-primary-fixed mb-1 uppercase tracking-wider font-mono">Avg. Approval Time</div>
              <div className="text-headline-md text-white font-semibold">3.2 Days</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm text-left">
              <div className="text-label-md text-primary-fixed mb-1 uppercase tracking-wider font-mono">On-Chain Verification</div>
              <div className="text-headline-md text-white font-semibold">94.1%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-surface">
        <div className="w-full max-w-md space-y-8">
          <div className="md:hidden flex flex-col items-center mb-8">
            <Image src="/ms-logo.png" alt="Monsoon" width={40} height={40} className="w-10 h-10 rounded-lg object-cover mb-2" />
            <h1 className="text-headline-lg text-primary">Monsoon</h1>
          </div>

          <div className="space-y-2">
            <h2 className="text-headline-md text-on-surface">Welcome Back</h2>
            <p className="text-body-md text-on-surface-variant">Access your Monsoon dashboard.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant ml-1 font-mono" htmlFor="email">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                    <Mail size={16} />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@monsoon.demo"
                    required
                    autoComplete="email"
                    className="pl-10 h-12 bg-surface-container-low border-border-subtle rounded-xl focus-visible:ring-primary-container focus-visible:border-primary-container"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-label-md text-on-surface-variant ml-1 font-mono" htmlFor="password">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-outline">
                    <Lock size={16} />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="pl-10 pr-10 h-12 bg-surface-container-low border-border-subtle rounded-xl focus-visible:ring-primary-container focus-visible:border-primary-container"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-outline hover:text-primary transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-body-md text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary-container text-white text-title-lg rounded-xl shadow-lg shadow-primary-container/20 hover:bg-primary transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
            <div className="pt-8 border-t border-border-subtle">
              <div className="flex items-center justify-center mb-6 gap-4">
                <span className="h-px w-full bg-border-subtle" />
                <span className="text-label-md text-on-surface-variant whitespace-nowrap uppercase tracking-widest font-mono">Demo Accounts</span>
                <span className="h-px w-full bg-border-subtle" />
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {DEMO_ROLES.map(({ role, label, icon: Icon }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleDemoRole(role)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-surface-container-low border border-border-subtle rounded-full text-body-md text-on-surface hover:bg-primary-fixed hover:border-primary-fixed-dim transition-all disabled:opacity-50"
                  >
                    <Icon size={16} className="text-primary" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
