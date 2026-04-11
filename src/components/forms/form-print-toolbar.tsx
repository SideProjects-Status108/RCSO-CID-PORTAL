'use client'

import Link from 'next/link'
import { Printer } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'

export function FormPrintToolbar() {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className={buttonVariants({
          className: 'border border-neutral-800 bg-neutral-900 text-white hover:bg-neutral-800',
        })}
      >
        <Printer className="mr-2 size-4" />
        Print
      </button>
      <Link
        href="/forms"
        className={buttonVariants({ variant: 'outline', className: 'border-neutral-300' })}
      >
        Back to forms
      </Link>
    </div>
  )
}
