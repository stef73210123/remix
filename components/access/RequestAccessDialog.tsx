'use client'

import { ReactNode, useState } from 'react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { RequestAccessForm } from './RequestAccessForm'

interface RequestAccessDialogProps {
  /** The trigger element. Pass a <button>/<a>/<Link> — Radix asChild clones it. */
  children: ReactNode
  /** Optional pre-selected asset slug (e.g. from the asset detail page). */
  defaultAsset?: string
}

/**
 * Wraps any trigger element with the Request Access modal. On click, opens a
 * Lightbox-style Dialog containing the request-access form. Dismissible via
 * backdrop click, ESC, or the built-in X button (all handled by Radix).
 */
export function RequestAccessDialog({ children, defaultAsset }: RequestAccessDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <RequestAccessForm
          defaultAsset={defaultAsset}
          compact
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
