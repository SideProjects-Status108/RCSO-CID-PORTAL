import { redirect } from 'next/navigation'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DocumentsPanel } from '@/components/training/resources/documents-panel'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { isTrainingWriter } from '@/lib/training/access'
import { listDocuments, signDownloadUrl } from '@/lib/training/document-queries'

export const dynamic = 'force-dynamic'

const CURATED_LINKS: Array<{ title: string; href: string; description: string }> = [
  {
    title: 'Washington Criminal Procedure (RCW 10)',
    href: 'https://app.leg.wa.gov/rcw/default.aspx?cite=10',
    description: 'Statutory framework for arrests, warrants, and criminal process.',
  },
  {
    title: 'WA Rules of Evidence',
    href: 'https://www.courts.wa.gov/court_rules/?fa=court_rules.list&group=ga&set=ER',
    description: 'State rules of evidence used in court proceedings.',
  },
  {
    title: 'Riley v. California — Supreme Court opinion',
    href: 'https://www.supremecourt.gov/opinions/13pdf/13-132_8l9c.pdf',
    description: 'Required reading before PBLE 6 (Digital Device Search Warrant).',
  },
  {
    title: 'RCSO Policy Manual (agency intranet)',
    href: '#',
    description: 'Coordinator upload pending — currently replaced by Documents below.',
  },
]

export default async function TrainingResourcesPage() {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const writer = isTrainingWriter(session.profile)

  const docs = await listDocuments()
  const withUrls = await Promise.all(
    docs.map(async (d) => ({
      ...d,
      signed_url: await signDownloadUrl(d.object_path),
    })),
  )

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-text-primary">
          Training Resources
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
          Required reading, reference materials, forms, and external links. Training writers can
          upload new documents; everyone else can download.
        </p>
      </header>

      <DocumentsPanel initial={withUrls} canManage={writer} />

      <Card>
        <CardHeader>
          <CardTitle>External references</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {CURATED_LINKS.map((l) => (
              <li key={l.title} className="rounded-md border border-border-subtle bg-bg-surface p-3">
                <a
                  href={l.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-text-primary hover:underline"
                >
                  {l.title}
                </a>
                <p className="mt-0.5 text-xs text-text-secondary">{l.description}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
