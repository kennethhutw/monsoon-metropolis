'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRole } from '@/hooks/useRole'
import { useWallet } from '@/hooks/useWallet'
import { useRouter, usePathname } from 'next/navigation'
import { UserRole } from '@/types/user'
import { ConnectWalletButton } from '@/components/shared/ConnectWalletButton'
import {
  LayoutDashboard, ClipboardCheck, ShieldCheck, Link2, Bell,
  FileUp, ClipboardList, Wallet, CreditCard, Brain, BadgeCheck,
  Users, Settings, Activity, HelpCircle, LogOut, type LucideIcon,
} from 'lucide-react'

const NAV_ITEMS: Record<UserRole, { href: string; label: string; icon: LucideIcon }[]> = {
  bank: [
    { href: '/bank/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/bank/cases', label: 'Case Management', icon: ClipboardCheck },
    { href: '/bank/risk', label: 'Risk Analysis', icon: ShieldCheck },
    { href: '/bank/chain', label: 'On-Chain Records', icon: Link2 },
    { href: '/bank/alerts', label: 'Alert Center', icon: Bell },
  ],
  exporter: [
    { href: '/exporter/apply', label: 'Apply for Financing', icon: FileUp },
    { href: '/exporter/applications', label: 'My Applications', icon: ClipboardList },
    { href: '/exporter/kyb', label: 'KYB Verification', icon: ShieldCheck },
  ],
  importer: [
    { href: '/importer/payables', label: 'Payables', icon: Wallet },
    { href: '/importer/limits', label: 'Credit Limits', icon: CreditCard },
    { href: '/importer/kyb', label: 'Verification', icon: ShieldCheck },
  ],
  researcher: [
    { href: '/researcher', label: 'Research Tools', icon: Brain },
  ],
  admin: [
    { href: '/admin', label: 'System Overview', icon: LayoutDashboard },
    { href: '/bank/cases', label: 'Case Management', icon: ClipboardCheck },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/cvi-applications', label: 'CVI Applications', icon: BadgeCheck },
    { href: '/admin/thresholds', label: 'Threshold Settings', icon: Settings },
    { href: '/admin/audit-log', label: 'Audit Log', icon: ClipboardCheck },
    { href: '/admin/health', label: 'System Health', icon: Activity },
  ],
}

// The one nav item per role that the CVA eligibility check should warn on.
const KYB_HREF: Partial<Record<UserRole, string>> = {
  exporter: '/exporter/kyb',
  importer: '/importer/kyb',
}

export function Nav() {
  const { role, user, logout } = useRole()
  const { address, isConnected, disconnect } = useWallet()
  const router = useRouter()
  const pathname = usePathname()
  const [cvaEligible, setCvaEligible] = useState<boolean | null>(null)

  const kybHref = role ? KYB_HREF[role] : undefined

  useEffect(() => {
    if (!isConnected || !address || !kybHref) { setCvaEligible(null); return }
    fetch(`/api/contracts/cva-eligibility/${address}`)
      .then((r) => r.json())
      .then((d) => setCvaEligible(Boolean(d.eligible)))
      .catch(() => setCvaEligible(null))
  }, [isConnected, address, kybHref])

  if (!role) return null

  const items = NAV_ITEMS[role] || []

  // Longest-matching-href wins, so a sub-page (e.g. /bank/cases/{id}) highlights
  // its section (/bank/cases) without also lighting up a shorter sibling
  // whose href happens to be a prefix (e.g. /admin matching /admin/users/{id}).
  const activeHref = items
    .map(i => i.href)
    .filter(href => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0]

  const handleLogout = () => {
    if (isConnected) disconnect()
    logout()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface border-r border-border-subtle flex flex-col py-8 px-4 shrink-0 z-50">
      <div className="mb-10 px-2 flex items-center gap-3">
        <Image src="/ms-logo.png" alt="Monsoon" width={40} height={40} className="w-10 h-10 rounded-lg object-cover shrink-0" />
        <div>
          <h1 className="text-headline-md font-bold text-primary leading-none">Monsoon</h1>
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold font-mono mt-1">Trade Finance</p>
        </div>
      </div>

      <div className="mb-4 px-2">
        <ConnectWalletButton cvaEligible={kybHref ? cvaEligible : null} />
      </div>

      <nav className="flex-1 space-y-1">
        {items.map(item => {
          const active = item.href === activeHref
          const needsAttention = !active && item.href === kybHref && cvaEligible === false
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 py-3 px-4 rounded-lg transition-colors ${
                active
                  ? 'text-primary font-bold border-r-4 border-primary bg-surface-container-low'
                  : needsAttention
                    ? 'text-risk-medium font-semibold hover:bg-surface-container-low'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <Icon size={20} strokeWidth={active || needsAttention ? 2.25 : 2} className="shrink-0" />
              <span className="text-label-md font-mono flex-1">{item.label}</span>
              {needsAttention && <span className="w-2 h-2 rounded-full bg-risk-medium shrink-0" title="Not yet CVA-verified" />}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-border-subtle space-y-1">
        <div className="px-4 pb-2">
          <p className="text-body-md font-medium text-ink truncate">{user?.name}</p>
          <p className="text-label-md text-ink-faint truncate">{user?.organization}</p>
        </div>
        <Link
          href="#"
          className="flex items-center gap-3 py-3 px-4 rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          <HelpCircle size={20} strokeWidth={2} className="shrink-0" />
          <span className="text-label-md font-mono">Support</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 py-3 px-4 rounded-lg text-error hover:bg-surface-container-low transition-colors"
        >
          <LogOut size={20} strokeWidth={2} className="shrink-0" />
          <span className="text-label-md font-mono">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
