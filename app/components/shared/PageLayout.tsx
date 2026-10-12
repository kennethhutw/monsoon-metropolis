'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { UserRole } from '@/types/user'
import { DemoBadge } from './DemoBadge'

interface PageLayoutProps {
  title: string
  subtitle?: string
  role?: UserRole
  actions?: React.ReactNode
  children: React.ReactNode
}

const ROLE_LABELS: Record<string, string> = {
  bank: 'Bank', exporter: 'Exporter', importer: 'Importer', researcher: 'Researcher', admin: 'Admin',
}

// Each role's landing page — reaching it collapses the breadcrumb to a
// single, non-link crumb instead of "Role > Role".
const ROLE_HOME: Record<string, string> = {
  bank: '/bank/dashboard',
  exporter: '/exporter/applications',
  importer: '/importer/payables',
  researcher: '/researcher',
  admin: '/admin',
}

// Keyed by the first two path segments ("role/section"). Used to insert an
// intermediate, clickable crumb for pages nested under a listing page (e.g.
// a case detail page nested under Case Management).
const SECTION_META: Record<string, { label: string; href: string }> = {
  'bank/dashboard': { label: 'Overview', href: '/bank/dashboard' },
  'bank/cases': { label: 'Case Management', href: '/bank/cases' },
  'bank/risk': { label: 'Risk Analysis', href: '/bank/risk' },
  'bank/chain': { label: 'On-Chain Records', href: '/bank/chain' },
  'bank/alerts': { label: 'Alert Center', href: '/bank/alerts' },
  'exporter/apply': { label: 'Apply for Financing', href: '/exporter/apply' },
  'exporter/applications': { label: 'My Applications', href: '/exporter/applications' },
  'exporter/kyb': { label: 'KYB Verification', href: '/exporter/kyb' },
  'exporter/status': { label: 'My Applications', href: '/exporter/applications' },
  'importer/payables': { label: 'Payables', href: '/importer/payables' },
  'importer/limits': { label: 'Credit Limits', href: '/importer/limits' },
  'admin/users': { label: 'User Management', href: '/admin/users' },
  'admin/thresholds': { label: 'Threshold Settings', href: '/admin/thresholds' },
  'admin/audit-log': { label: 'Audit Log', href: '/admin/audit-log' },
  'admin/health': { label: 'System Health', href: '/admin/health' },
  'admin/ai-config': { label: 'AI Settings', href: '/admin/ai-config' },
  'admin/contracts': { label: 'Contract Management', href: '/admin/contracts' },
  'admin/demo-data': { label: 'Demo Data', href: '/admin/demo-data' },
}

interface Crumb {
  label: string
  href?: string
}

function useBreadcrumb(title: string): Crumb[] {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const roleSeg = segments[0]
  const roleLabel = ROLE_LABELS[roleSeg]

  if (!roleLabel) return [{ label: title }]

  const roleHome = ROLE_HOME[roleSeg]
  if (pathname === roleHome) {
    return [{ label: roleLabel }]
  }

  const crumbs: Crumb[] = [{ label: roleLabel, href: roleHome }]

  const sectionKey = segments.length >= 2 ? `${segments[0]}/${segments[1]}` : undefined
  const sectionMeta = sectionKey ? SECTION_META[sectionKey] : undefined
  if (sectionMeta && sectionMeta.href !== pathname && sectionMeta.label !== title) {
    crumbs.push({ label: sectionMeta.label, href: sectionMeta.href })
  }

  crumbs.push({ label: title })
  return crumbs
}

function Breadcrumb({ title }: { title: string }) {
  const crumbs = useBreadcrumb(title)
  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-1 text-body-md text-on-surface-variant mb-2" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight size={14} className="text-outline-variant shrink-0" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-primary-container transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span className="text-ink font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}

export function PageLayout({
  title,
  subtitle,
  actions,
  children,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border-subtle">
        <div className="max-w-[1440px] mx-auto px-10 py-5 flex items-center justify-between gap-6">
          <div>
            <Breadcrumb title={title} />
            <div className="flex items-center gap-2.5">
              <h1 className="text-headline-md font-bold text-primary leading-tight text-wrap-balance">{title}</h1>
              <DemoBadge />
            </div>
            {subtitle && (
              <p className="text-body-md text-on-surface-variant mt-1">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </header>
      <div className="max-w-[1440px] mx-auto px-10 py-8">
        {children}
      </div>
    </div>
  )
}
