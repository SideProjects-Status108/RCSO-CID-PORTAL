import { notFound, redirect } from 'next/navigation'

import {
  fetchDraftForTemplate,
  fetchTemplateById,
} from '@/lib/forms/queries'
import { getSessionUserWithProfile } from '@/lib/auth/get-session'
import { FormNewClient } from '@/components/forms/form-new-client'

export const dynamic = 'force-dynamic'

export default async function NewFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ templateId: string }>
  searchParams: Promise<{ draft?: string }>
}) {
  const session = await getSessionUserWithProfile()
  if (!session) redirect('/login')

  const { templateId } = await params
  const { draft: draftParam } = await searchParams

  const template = await fetchTemplateById(templateId)
  if (!template) notFound()

  let draft = null
  let initialCaseLabel: string | null = null

  if (draftParam) {
    const loaded = await fetchDraftForTemplate(
      session.user.id,
      templateId,
      draftParam
    )
    if (loaded) {
      draft = loaded.submission
      initialCaseLabel = loaded.case_number
    }
  }

  return (
    <FormNewClient
      template={template}
      draft={draft}
      initialCaseLabel={initialCaseLabel}
    />
  )
}
