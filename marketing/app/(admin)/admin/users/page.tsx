'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { User, UserRole } from '@/types'

type UserWithStatus = User & { has_password: boolean }

const ROLES: UserRole[] = ['admin', 'gp', 'lp', 'dealroom']
const ASSET_OPTIONS = ['circularplatform', 'livingstonfarm', 'wrenofthewoods']

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'destructive',
  gp: 'default',
  lp: 'secondary',
  dealroom: 'outline',
}

interface UserFormState {
  email: string
  name: string
  role: UserRole
  asset_access: string[]
  active: boolean
  notes: string
}

const emptyForm = (): UserFormState => ({
  email: '',
  name: '',
  role: 'lp',
  asset_access: [],
  active: true,
  notes: '',
})

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [resendingInvite, setResendingInvite] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to load users')
      const data = await res.json()
      setUsers(data)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const openCreate = () => {
    setEditingUser(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setForm({
      email: user.email,
      name: user.name,
      role: user.role,
      asset_access: user.asset_access,
      active: user.active,
      notes: user.notes || '',
    })
    setDialogOpen(true)
  }

  const toggleAsset = (slug: string) => {
    setForm((f) => ({
      ...f,
      asset_access: f.asset_access.includes(slug)
        ? f.asset_access.filter((a) => a !== slug)
        : [...f.asset_access, slug],
    }))
  }

  const handleSave = async () => {
    if (!form.email || !form.name || !form.role) {
      toast.error('Email, name, and role are required')
      return
    }
    setSaving(true)
    try {
      const method = editingUser ? 'PATCH' : 'POST'
      const res = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Save failed')
        return
      }
      toast.success(editingUser ? 'User updated' : 'User created — invite email sent')
      setDialogOpen(false)
      loadUsers()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: User) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Delete failed')
        return
      }
      toast.success('User deactivated')
      setDeleteTarget(null)
      loadUsers()
    } catch {
      toast.error('Network error')
    }
  }

  const handleResendInvite = async (user: User) => {
    setResendingInvite(user.email)
    try {
      const res = await fetch('/api/admin/users/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to resend invite')
        return
      }
      toast.success(`Invite sent to ${user.email}`)
    } catch {
      toast.error('Network error')
    } finally {
      setResendingInvite(null)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">Add, edit, and manage platform users</p>
      </div>

      <div className="flex items-center justify-between gap-4 mb-6">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={openCreate}>Add User</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Assets</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Password</th>
                <th className="px-4 py-2 text-left font-medium">Joined</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.email} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{user.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-2">
                    <Badge variant={ROLE_COLORS[user.role] as 'default' | 'secondary' | 'outline' | 'destructive'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {user.asset_access.length > 0 ? user.asset_access.join(', ') : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={user.active ? 'outline' : 'secondary'}>
                      {user.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2">
                    {user.has_password ? (
                      <Badge variant="outline" className="text-xs text-green-700 border-green-300">Set</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Invite pending</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{user.created_at}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!user.has_password && user.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          onClick={() => handleResendInvite(user)}
                          disabled={resendingInvite === user.email}
                        >
                          {resendingInvite === user.email ? 'Sending…' : 'Resend Invite'}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(user)}
                        disabled={!user.active}
                      >
                        Deactivate
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={!!editingUser}
                placeholder="investor@example.com"
                type="email"
              />
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Asset Access</Label>
              <div className="flex flex-wrap gap-2">
                {ASSET_OPTIONS.map((slug) => (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => toggleAsset(slug)}
                    className={`rounded-md border px-3 py-1 text-sm transition-colors ${
                      form.asset_access.includes(slug)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {slug}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Deactivate User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            This will deactivate <span className="font-medium text-foreground">{deleteTarget?.name}</span> ({deleteTarget?.email}).
            They will no longer be able to log in. This does not delete their data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
