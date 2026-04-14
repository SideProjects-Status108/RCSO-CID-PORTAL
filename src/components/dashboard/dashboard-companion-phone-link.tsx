'use client'

import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Check, Copy, Mail, Smartphone } from 'lucide-react'

import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function DashboardCompanionPhoneLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const mailto = `mailto:?subject=${encodeURIComponent('CID Portal — open on your phone')}&body=${encodeURIComponent(
    `Open this link on your phone to use the CID Portal companion:\n\n${url}\n\nYou must be signed in.`
  )}`

  return (
    <section
      aria-label="Open companion app on phone"
      className="rounded-lg border border-accent-primary/25 bg-bg-surface p-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="shrink-0 self-start rounded-lg border border-border-subtle bg-bg-surface p-2">
          <QRCode value={url} size={144} level="M" fgColor="#e8e6e0" bgColor="#252830" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="size-5 text-accent-primary" strokeWidth={1.75} aria-hidden />
            <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-text-primary">
              Phone companion
            </h2>
          </div>
          <p className="font-sans text-sm text-text-secondary">
            Scan the QR code or copy the link, then open it on your department phone. Use{' '}
            <span className="text-text-primary">Add to Home Screen</span> for a quick-launch icon.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
              {copied ? (
                <Check className="size-4" strokeWidth={1.75} aria-hidden />
              ) : (
                <Copy className="size-4" strokeWidth={1.75} aria-hidden />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <a
              href={mailto}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex items-center gap-1.5')}
            >
              <Mail className="size-4" strokeWidth={1.75} aria-hidden />
              Email link
            </a>
          </div>
          <p className="truncate font-code text-xs text-text-disabled" title={url}>
            {url}
          </p>
        </div>
      </div>
    </section>
  )
}
