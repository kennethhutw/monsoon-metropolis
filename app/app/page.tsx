'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ShieldCheck, FileCheck, Sparkles, Zap, ArrowRight, CheckCircle2,
  FileEdit, BarChart3, UserCheck, Layers, Landmark,
} from 'lucide-react'

const ROLE_REDIRECT: Record<string, string> = {
  bank:       '/bank/dashboard',
  exporter:   '/exporter/applications',
  importer:   '/importer/payables',
  researcher: '/researcher',
  admin:      '/admin',
}

const PROCESS_STEPS = [
  { n: '01', icon: FileEdit,    title: 'KYB & CVI Issuance', body: 'Exporter completes KYB — Cleanverse issues a wallet-bound CVI credential.' },
  { n: '02', icon: Layers,      title: 'Invoice → CVA',       body: 'The invoice is minted as a CVA-backed NFT with a unique hash and transfer restrictions.' },
  { n: '03', icon: UserCheck,   title: 'Buyer Confirmation',  body: 'Buyer confirms the receivable on-chain — a digital Notice of Assignment.' },
  { n: '04', icon: BarChart3,   title: 'AI Risk Scoring',     body: 'AI engine scores buyer credit and invoice authenticity across four dimensions.' },
  { n: '05', icon: ShieldCheck, title: 'Bank Approval',       body: 'Bank reviews and approves the case via the Monsoon Admin Portal.' },
  { n: '06', icon: Landmark,    title: 'Disbursement & Settlement', body: 'Funds are disbursed; repayment auto-settles and releases the CVA.' },
]

function NetworkGraphic() {
  return (
    <svg viewBox="0 0 400 400" className="w-full h-full max-w-md mx-auto" aria-hidden="true">
      <circle cx="200" cy="200" r="150" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
      <circle cx="200" cy="200" r="100" fill="none" stroke="var(--border-subtle)" strokeWidth="1" />
      <circle cx="200" cy="200" r="50" fill="none" stroke="var(--primary-container)" strokeWidth="1.5" strokeDasharray="4 6" />
      <circle cx="200" cy="200" r="10" fill="var(--primary)" />
      {[
        [200, 50], [340, 130], [340, 270], [200, 350], [60, 270], [60, 130],
      ].map(([x, y], i) => (
        <g key={i}>
          <line x1="200" y1="200" x2={x} y2={y} stroke="var(--primary-container)" strokeWidth="1" opacity="0.4" />
          <circle cx={x} cy={y} r={i === 1 || i === 4 ? 8 : 5} fill={i === 1 || i === 4 ? 'var(--primary-container)' : 'var(--outline-variant)'} />
        </g>
      ))}
    </svg>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const stored = sessionStorage.getItem('monsoon_user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        const dest = user?.role ? (ROLE_REDIRECT[user.role] ?? '/login') : '/login'
        router.replace(dest)
        return
      } catch {
        // corrupt session — fall through to landing page
      }
    }
    setChecking(false)
  }, [router])

  if (checking) return null

  return (
    <main className="bg-background text-ink overflow-x-hidden">
      {/* Top nav */}
      <header className="sticky top-0 z-40 h-16 px-6 md:px-10 flex items-center justify-between bg-background/90 backdrop-blur-md border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <Image src="/ms-logo.png" alt="Monsoon" width={32} height={32} className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-headline-md font-extrabold text-primary">Monsoon</span>
        </div>
        <Link href="/login" className="px-5 py-2 bg-primary text-on-primary rounded-lg shadow-sm hover:opacity-90 transition-all text-label-md font-bold font-mono">
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center px-6 md:px-10 bg-surface-bright">
        <div className="max-w-[1440px] mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-16 items-center py-16">
          <div className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-fixed text-on-primary-fixed-variant text-label-md font-bold rounded-full w-fit font-mono tracking-wide">
              <ShieldCheck size={16} />
              RWA TRADE FINANCE PROTOCOL
            </div>
            <h1 className="text-display-lg text-on-background max-w-xl text-wrap-balance">
              Bridging the gap between unpaid invoices and on-chain liquidity
            </h1>
            <p className="text-body-lg text-on-surface-variant max-w-lg">
              Monsoon digitizes trade receivables financing for Asia&apos;s SME exporters — KYB, invoice
              verification, buyer confirmation, and AI risk scoring, with Cleanverse&apos;s CVI and CVA
              embedded at every trust-critical step, settled on Monad.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="bg-primary text-on-primary px-8 py-4 rounded-xl text-body-lg font-semibold hover:opacity-95 transition-all shadow-md inline-flex items-center gap-2">
                Sign In to Demo <ArrowRight size={18} />
              </Link>
              <a href="#process" className="border border-border-subtle bg-surface text-on-surface px-8 py-4 rounded-xl text-body-lg font-semibold hover:bg-surface-container-low transition-all">
                See How It Works
              </a>
            </div>
            <div className="flex gap-12 mt-2">
              <div>
                <p className="text-label-md text-ink-muted uppercase font-mono">Avg. Approval Time</p>
                <p className="text-headline-lg text-primary font-bold">3.2 Days</p>
              </div>
              <div>
                <p className="text-label-md text-ink-muted uppercase font-mono">On-Chain Verification</p>
                <p className="text-headline-lg text-primary font-bold">94.1%</p>
              </div>
            </div>
          </div>
          <div className="hidden md:flex justify-center items-center">
            <NetworkGraphic />
          </div>
        </div>
      </section>

      {/* Core infrastructure */}
      <section className="py-24 px-6 md:px-10 bg-surface">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-headline-lg text-on-background mb-4">Core Verification Infrastructure</h2>
            <p className="text-on-surface-variant text-body-lg max-w-2xl mx-auto">
              Every trust-critical step in the financing lifecycle is backed by a verifiable, on-chain primitive.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-surface-container-low p-10 rounded-xl border border-border-subtle hover:border-primary-container/30 transition-all">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <span className="inline-flex text-primary p-3 bg-surface rounded-xl shadow-card"><ShieldCheck size={32} /></span>
                  <h3 className="text-headline-md">KYB Verification (CVI)</h3>
                  <p className="text-on-surface-variant">Exporters and buyers complete KYB once. Cleanverse issues a wallet-bound CVI credential that gates every downstream action.</p>
                  <ul className="space-y-3 text-body-md text-ink-muted">
                    <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-risk-low" /> AML / CFT Screening</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-risk-low" /> Beneficial Ownership Check</li>
                    <li className="flex items-center gap-2"><CheckCircle2 size={18} className="text-risk-low" /> Continuous Re-Verification</li>
                  </ul>
                </div>
                <div className="relative h-56 bg-surface rounded-lg shadow-card flex items-center justify-center border border-border-subtle">
                  <ShieldCheck size={72} className="text-primary-container/30" />
                </div>
              </div>
            </div>
            <div className="md:col-span-4 bg-surface-container-low p-10 rounded-xl border border-border-subtle hover:border-primary-container/30 transition-all flex flex-col justify-between">
              <div className="space-y-6">
                <span className="inline-flex text-primary p-3 bg-surface rounded-xl shadow-card"><FileCheck size={32} /></span>
                <h3 className="text-headline-md">Asset Verification (CVA)</h3>
                <p className="text-on-surface-variant">Every invoice is minted as a CVA-backed NFT with a unique hash — the same receivable can never be financed twice.</p>
              </div>
              <div className="mt-8 pt-6 border-t border-border-subtle">
                <a href="#process" className="text-primary text-title-lg font-medium flex items-center gap-2 group">
                  See the flow <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
            <div className="md:col-span-6 bg-surface-container-low p-10 rounded-xl border border-border-subtle hover:border-primary-container/30 transition-all">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex text-primary p-3 bg-surface rounded-xl shadow-card"><Sparkles size={32} /></span>
                  <div className="px-2 py-1 bg-primary text-white text-[10px] rounded uppercase font-bold tracking-widest font-mono">AI Powered</div>
                </div>
                <h3 className="text-headline-md">AI Risk Assessment</h3>
                <p className="text-on-surface-variant">Four-dimension scoring — financial health, on-chain behavior, industry conditions, and ESG — re-evaluated as new trade data lands on-chain.</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface/70 p-4 rounded-lg">
                    <p className="text-risk-low text-headline-md font-semibold">0.87%</p>
                    <p className="text-label-md text-ink-muted font-mono">Overdue Rate</p>
                  </div>
                  <div className="bg-surface/70 p-4 rounded-lg">
                    <p className="text-primary text-headline-md font-semibold">94.1%</p>
                    <p className="text-label-md text-ink-muted font-mono">On-Chain Coverage</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-6 bg-primary p-10 rounded-xl border border-primary text-on-primary flex flex-col justify-center gap-6 relative overflow-hidden">
              <Zap size={160} className="absolute -top-6 -right-6 opacity-10" />
              <div className="relative z-10 space-y-6">
                <h3 className="text-headline-lg">Automatic Settlement</h3>
                <p className="opacity-80 text-body-lg max-w-md">Once the buyer repays, FinancingPool settles instantly on Monad and releases the CVA back to the exporter — no manual reconciliation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six-step process */}
      <section id="process" className="py-24 px-6 md:px-10 bg-surface-bright border-y border-border-subtle scroll-mt-16">
        <div className="max-w-[1440px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-headline-lg text-on-background">Six-Step Financing Protocol</h2>
            <p className="text-on-surface-variant text-body-lg mt-4">From KYB to on-chain settlement — every step verified, nothing manual.</p>
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-6 gap-8">
            <div className="hidden md:block absolute top-10 left-0 right-0 h-[2px] bg-border-subtle z-0" />
            {PROCESS_STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div key={step.n} className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border-8 border-surface-bright ${
                    i === 0 ? 'bg-primary text-white' : 'bg-surface-container-highest text-primary'
                  }`}>
                    <Icon size={24} />
                  </div>
                  <h4 className="text-title-lg text-primary mb-1 font-mono">{step.n}</h4>
                  <p className="text-body-md font-medium text-on-surface mb-1">{step.title}</p>
                  <p className="text-label-md text-ink-muted">{step.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-10">
        <div className="max-w-4xl mx-auto bg-primary rounded-3xl p-16 text-center text-on-primary">
          <h2 className="text-display-lg mb-6 text-wrap-balance">Ready to see it in action?</h2>
          <p className="text-body-lg mb-10 opacity-80 max-w-xl mx-auto">
            Explore the full Monsoon demo — every role, every step, verified on Monad Testnet.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-primary px-10 py-4 rounded-xl text-headline-md font-semibold hover:opacity-90 transition-all">
            Sign In to Demo <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-border-subtle py-12 px-6 md:px-10">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/ms-logo.png" alt="Monsoon" width={24} height={24} className="w-6 h-6 rounded object-cover" />
            <span className="text-title-lg font-bold text-primary">Monsoon</span>
          </div>
          <p className="text-label-md text-ink-muted text-center">
            Built for Cleanverse Build: Trusted Assets Hackathon — RWA Track · Monad Testnet
          </p>
        </div>
      </footer>
    </main>
  )
}
