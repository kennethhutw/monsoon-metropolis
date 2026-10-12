import type { Metadata } from 'next'
import { Geist, JetBrains_Mono } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Toaster } from 'sonner'
import { Web3Provider } from '@/components/providers/Web3Provider'
import '../src/app/globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

// JetBrains Mono renders hashes, wallet addresses, and currency amounts —
// a deliberate visual split between "human content" and "machine / on-chain
// data" (see stitch_modern_fintech_redesign DESIGN.md).
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Monsoon | Compliant Trade Receivables Financing',
  description: 'Blockchain-based trade receivables financing platform, powered by Cleanverse.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background text-foreground">
        <Web3Provider>
          {children}
          <Toaster position="top-right" richColors />
        </Web3Provider>
        <GoogleAnalytics gaId="G-405139335" />
      </body>
    </html>
  )
}
