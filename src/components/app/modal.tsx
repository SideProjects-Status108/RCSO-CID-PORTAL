'use client'

import type { ReactNode } from 'react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  className?: string
}

export function Modal({
  open,
  onOpenChange,
  title,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'max-h-[90vh] max-w-lg overflow-y-auto border-border-subtle bg-bg-surface text-text-primary sm:max-w-lg',
          className
        )}
      >
        <DialogHeader>
          <DialogTitle className="text-text-primary">{title}</DialogTitle>
        </DialogHeader>
        <div className="px-1 pb-2">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
