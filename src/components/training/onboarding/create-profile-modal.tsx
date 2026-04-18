'use client'

import { useState, useTransition } from 'react'

import { Modal } from '@/components/app/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDitOnboardingAction, type CreateDitOnboardingResult } from '@/app/(dashboard)/training/actions'
import { cn } from '@/lib/utils'

type CreateProfileModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (result: CreateDitOnboardingResult) => void
}

type FieldErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'cellNumber' | 'badgeNumber', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[0-9+()\-.\s]{10,20}$/
const BADGE_RE = /^[A-Za-z0-9-]{2,20}$/

function validate(fields: {
  firstName: string
  lastName: string
  email: string
  cellNumber: string
  badgeNumber: string
}): FieldErrors {
  const errs: FieldErrors = {}
  if (!fields.firstName.trim()) errs.firstName = 'Required'
  else if (fields.firstName.trim().length > 50) errs.firstName = 'Max 50 characters'

  if (!fields.lastName.trim()) errs.lastName = 'Required'
  else if (fields.lastName.trim().length > 50) errs.lastName = 'Max 50 characters'

  if (!fields.email.trim()) errs.email = 'Required'
  else if (!EMAIL_RE.test(fields.email.trim())) errs.email = 'Invalid email format'

  if (!fields.cellNumber.trim()) errs.cellNumber = 'Required'
  else if (!PHONE_RE.test(fields.cellNumber.trim())) errs.cellNumber = 'Invalid phone format'

  if (!fields.badgeNumber.trim()) errs.badgeNumber = 'Required'
  else if (!BADGE_RE.test(fields.badgeNumber.trim())) errs.badgeNumber = 'Letters, numbers, and dashes only'

  return errs
}

export function CreateProfileModal({ open, onOpenChange, onCreated }: CreateProfileModalProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [cellNumber, setCellNumber] = useState('')
  const [badgeNumber, setBadgeNumber] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function reset() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setCellNumber('')
    setBadgeNumber('')
    setErrors({})
    setServerError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fields = { firstName, lastName, email, cellNumber, badgeNumber }
    const v = validate(fields)
    setErrors(v)
    setServerError(null)
    if (Object.keys(v).length > 0) return

    startTransition(async () => {
      const result = await createDitOnboardingAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        cellNumber: cellNumber.trim(),
        badgeNumber: badgeNumber.trim(),
      })
      if (!result.ok) {
        if (result.code === 'DUPLICATE_BADGE') {
          setErrors((prev) => ({ ...prev, badgeNumber: result.message }))
        } else if (result.code === 'PROFILE_NOT_FOUND' || result.code === 'DUPLICATE_EMAIL') {
          setErrors((prev) => ({ ...prev, email: result.message }))
        } else {
          setServerError(result.message)
        }
        return
      }
      onCreated(result)
      reset()
      onOpenChange(false)
    })
  }

  return (
    <Modal open={open} onOpenChange={handleOpenChange} title="Create DIT profile" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-3 text-sm" noValidate>
        <p className="text-xs text-text-secondary">
          The trainee must already have a portal account. Enter their details below; the account
          will be linked, role set to DIT, and a pre-start survey link issued.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="firstName" label="First name" error={errors.firstName}>
            <Input
              id="firstName"
              autoComplete="given-name"
              maxLength={50}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              aria-invalid={Boolean(errors.firstName)}
              disabled={pending}
            />
          </Field>

          <Field id="lastName" label="Last name" error={errors.lastName}>
            <Input
              id="lastName"
              autoComplete="family-name"
              maxLength={50}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              aria-invalid={Boolean(errors.lastName)}
              disabled={pending}
            />
          </Field>
        </div>

        <Field id="email" label="Email" error={errors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.email)}
            disabled={pending}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="cellNumber" label="Cell number" error={errors.cellNumber}>
            <Input
              id="cellNumber"
              type="tel"
              autoComplete="tel"
              value={cellNumber}
              onChange={(e) => setCellNumber(e.target.value)}
              aria-invalid={Boolean(errors.cellNumber)}
              disabled={pending}
            />
          </Field>

          <Field id="badgeNumber" label="Badge number" error={errors.badgeNumber}>
            <Input
              id="badgeNumber"
              value={badgeNumber}
              onChange={(e) => setBadgeNumber(e.target.value.toUpperCase())}
              aria-invalid={Boolean(errors.badgeNumber)}
              disabled={pending}
            />
          </Field>
        </div>

        {serverError ? (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {serverError}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Creating...' : 'Create profile'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={cn(error && 'text-danger')}>
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  )
}
