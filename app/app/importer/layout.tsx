import { RoleGuard } from '@/components/shared/RoleGuard'
import { Nav } from '@/components/shared/Nav'
import { AiAssistantPanel } from '@/components/shared/AiAssistantPanel'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['importer', 'admin']}>
      <div className="min-h-screen">
        <Nav />
        <main className="ml-60 min-h-screen overflow-auto">{children}</main>
        <AiAssistantPanel />
      </div>
    </RoleGuard>
  )
}
