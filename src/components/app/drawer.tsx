'use client'

import type { ReactNode } from 'react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

type DrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  className?: string
}

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
  className,
}: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className={cn(
          'w-full border-border-subtle bg-bg-surface p-0 text-text-primary sm:max-w-md',
          className
        )}
      >
        <SheetHeader className="border-b border-border-subtle px-4 py-3 text-left">
          <SheetTitle className="text-text-primary">{title}</SheetTitle>
        </SheetHeader>
        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto px-4 py-4">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
