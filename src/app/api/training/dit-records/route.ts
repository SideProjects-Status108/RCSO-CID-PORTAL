import { NextResponse } from 'next/server'

import { createDitOnboardingAction } from '@/app/(dashboard)/training/actions'
import { requireJsonSession } from '@/lib/training/api-auth'

type PostBody = Partial<{
  firstName: string
  lastName: string
  email: string
  cellNumber: string
  badgeNumber: string
}>

const STATUS_BY_CODE: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  PROFILE_NOT_FOUND: 404,
  ALREADY_ACTIVE_DIT: 409,
  DUPLICATE_BADGE: 409,
  DUPLICATE_EMAIL: 409,
  INTERNAL: 500,
}

export async function POST(request: Request) {
  const gate = await requireJsonSession()
  if (!gate.ok) return gate.response

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const firstName = body.firstName?.trim() ?? ''
  const lastName = body.lastName?.trim() ?? ''
  const email = body.email?.trim() ?? ''
  const cellNumber = body.cellNumber?.trim() ?? ''
  const badgeNumber = body.badgeNumber?.trim() ?? ''

  if (!firstName || !lastName || !email || !cellNumber || !badgeNumber) {
    return NextResponse.json(
      { error: 'firstName, lastName, email, cellNumber, and badgeNumber are required' },
      { status: 400 }
    )
  }

  const result = await createDitOnboardingAction({
    firstName,
    lastName,
    email,
    cellNumber,
    badgeNumber,
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message, code: result.code },
      { status: STATUS_BY_CODE[result.code] ?? 400 }
    )
  }
  return NextResponse.json(result)
}
