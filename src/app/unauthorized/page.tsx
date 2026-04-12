import Link from 'next/link'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-bg-app px-6 py-16">
      <h1 className="text-center text-2xl font-semibold text-text-primary">
        Unauthorized
      </h1>
      <p className="max-w-md text-center text-sm text-text-secondary">
        You are signed in, but your role does not allow access to this area. If you
        believe this is a mistake, contact a CID administrator.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ size: 'default' }),
            'border border-accent-primary/30 bg-accent-primary text-bg-app hover:bg-accent-primary-hover'
          )}
        >
          Back to dashboard
        </Link>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'default' }),
            'border-accent-teal/40 text-accent-teal hover:bg-accent-teal/10'
          )}
        >
          Switch account
        </Link>
      </div>
    </div>
  )
}
