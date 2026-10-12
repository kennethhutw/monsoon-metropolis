'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PageLayout } from '@/components/shared/PageLayout'
import { DataWrapper } from '@/components/shared/DataWrapper'
import { EmptyState } from '@/components/shared/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { useRole } from '@/hooks/useRole'
import { AdminUserRow, UserRole } from '@/types/user'
import { Pencil, KeyRound, UserPlus, Lock } from 'lucide-react'

export const ROLE_LABEL: Record<UserRole, string> = {
  bank: 'Bank', exporter: 'Exporter', importer: 'Importer', researcher: 'Researcher', admin: 'Admin'
}
const ROLES = Object.keys(ROLE_LABEL) as UserRole[]

export function RoleSelect({ value, onChange }: { value: UserRole; onChange: (r: UserRole) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as UserRole)}
      className="w-full h-10 text-body-md border border-border-subtle rounded-lg px-3 bg-surface"
    >
      {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
    </select>
  )
}

export function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-label-md text-on-surface-variant font-mono">{label}</label>
      {children}
    </div>
  )
}

interface EditForm { name: string; organization: string; role: UserRole; walletAddress: string }

export function EditUserDialog({ user, onSaved }: { user: AdminUserRow; onSaved: (u: AdminUserRow) => void }) {
  const { user: actor } = useRole()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EditForm>({ name: user.name, organization: user.organization, role: user.role, walletAddress: user.walletAddress ?? '' })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, actorEmail: actor?.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved({ ...user, ...data, nftCount: user.nftCount })
      toast.success('User updated', { description: user.email })
      setOpen(false)
    } catch (error) {
      toast.error('Update failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Pencil size={14} className="mr-1" /> Edit
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {user.email}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <FormField label="Name">
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Organization">
            <Input value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} />
          </FormField>
          <FormField label="Role">
            <RoleSelect value={form.role} onChange={r => setForm(f => ({ ...f, role: r }))} />
          </FormField>
          <FormField label="Wallet Address">
            <Input
              value={form.walletAddress}
              onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))}
              placeholder="0x… (used to count minted invoice NFTs)"
              className="font-mono"
            />
          </FormField>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ResetPasswordDialog({ user }: { user: AdminUserRow }) {
  const { user: actor } = useRole()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleReset = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, actorEmail: actor?.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Password reset', { description: user.email })
      setOpen(false)
      setPassword('')
    } catch (error) {
      toast.error('Reset failed', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <KeyRound size={14} className="mr-1" /> Reset Password
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password for {user.email}</DialogTitle>
        </DialogHeader>
        <FormField label="New Password">
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
        </FormField>
        <DialogFooter>
          <Button onClick={handleReset} disabled={saving || !password}>{saving ? 'Resetting…' : 'Reset Password'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface AddForm { email: string; password: string; role: UserRole; name: string; organization: string; walletAddress: string }
const EMPTY_ADD_FORM: AddForm = { email: '', password: '', role: 'exporter', name: '', organization: '', walletAddress: '' }

function AddUserDialog({ onCreated }: { onCreated: (u: AdminUserRow) => void }) {
  const { user: actor } = useRole()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<AddForm>(EMPTY_ADD_FORM)

  const canSubmit = form.email && form.password && form.name && form.organization

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, actorEmail: actor?.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onCreated(data)
      toast.success('User created', { description: form.email })
      setForm(EMPTY_ADD_FORM)
      setOpen(false)
    } catch (error) {
      toast.error('Failed to create user', { description: error instanceof Error ? error.message : 'Please try again' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <UserPlus size={14} className="mr-1" /> Add User
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <FormField label="Email">
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="name@company.com" />
          </FormField>
          <FormField label="Password">
            <Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete="new-password" />
          </FormField>
          <FormField label="Name">
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Organization">
            <Input value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} />
          </FormField>
          <FormField label="Role">
            <RoleSelect value={form.role} onChange={r => setForm(f => ({ ...f, role: r }))} />
          </FormField>
          <FormField label="Wallet Address (optional)">
            <Input value={form.walletAddress} onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))} placeholder="0x…" className="font-mono" />
          </FormField>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={saving || !canSubmit}>{saving ? 'Creating…' : 'Create User'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(setUsers)
      .catch(() => setError('Failed to load user list'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <PageLayout
      title="User Management"
      subtitle="All system users"
      actions={<AddUserDialog onCreated={(u) => setUsers(prev => prev ? [...prev, u] : [u])} />}
    >
      <div className="bg-surface rounded-xl border border-border-subtle shadow-card overflow-hidden">
        <DataWrapper data={users} loading={loading} error={error}
          empty={<EmptyState title="No users yet" />}
          skeleton={<div className="divide-y">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-none w-full" />)}</div>}
        >
          {data => (
            <div className="overflow-x-auto">
              <table className="w-full text-body-md">
                <thead className="bg-surface-container-low border-b border-border-subtle">
                  <tr>{['Name','Email','Role','Organization','Wallet Address',''].map(h => <th key={h} className="text-left px-5 py-3 text-label-md font-medium text-ink-faint uppercase font-mono">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {data.map(u => (
                    <tr key={u.id}>
                      <td className="px-5 py-3.5 font-semibold whitespace-nowrap">
                        <a href={`/admin/users/${u.id}`} className="text-ink hover:text-primary hover:underline">{u.name}</a>
                      </td>
                      <td className="px-5 py-3.5 text-on-surface-variant font-mono text-label-md">{u.email}</td>
                      <td className="px-5 py-3.5"><span className="text-label-md px-2 py-0.5 rounded-full bg-primary-fixed/40 text-primary font-mono">{ROLE_LABEL[u.role]}</span></td>
                      <td className="px-5 py-3.5 text-on-surface-variant whitespace-nowrap">{u.organization}</td>
                      <td className="px-5 py-3.5 text-on-surface-variant font-mono text-label-md">
                        {u.walletAddress ? `${u.walletAddress.slice(0, 6)}…${u.walletAddress.slice(-4)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2 justify-end">
                          <EditUserDialog user={u} onSaved={(updated) => setUsers(prev => prev?.map(x => x.id === updated.id ? updated : x) ?? prev)} />
                          {u.isSeed ? (
                            <span className="inline-flex items-center gap-1 text-label-md text-ink-faint px-2" title="Demo account — password can't be reset from this panel">
                              <Lock size={13} /> Demo
                            </span>
                          ) : (
                            <ResetPasswordDialog user={u} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DataWrapper>
      </div>
    </PageLayout>
  )
}
