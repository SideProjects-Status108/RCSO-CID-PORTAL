'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { sanitizeInternalRedirect } from '@/lib/auth/safe-redirect'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type LoginFormProps = {
  bootstrapSignupEnabled: boolean
}

export function LoginForm({ bootstrapSignupEnabled }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const reason = searchParams.get('reason')

  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setFormError(error.message)
      return
    }
    router.push(sanitizeInternalRedirect(searchParams.get('next')))
    router.refresh()
  }

  return (
    <Card className="w-full max-w-md border-border-subtle bg-bg-surface shadow-none">
      <CardHeader className="space-y-3 text-center">
        <Image
          src="/branding/cid-portal-app-icon.png"
          alt="Rutherford County Sheriff's Office CID Portal"
          width={512}
          height={512}
          className="mx-auto h-40 w-40 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.6)] sm:h-48 sm:w-48"
          priority
        />
        <CardTitle className="font-heading text-xl tracking-wide text-text-primary">
          CID PORTAL
        </CardTitle>
        <CardDescription className="text-text-secondary">
          Sign in with your department email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reason === 'signup_disabled' ? (
          <p className="mb-4 rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-xs text-text-secondary">
            Public sign-up is disabled. Ask an administrator to create your account
            in Supabase, then sign in here.
          </p>
        ) : null}
        {urlError === 'no_profile' ? (
          <p className="mb-4 rounded-md border border-accent-primary/30 bg-bg-elevated px-3 py-2 text-xs text-text-secondary">
            Your account exists but no profile row was found. An administrator must
            insert your <span className="font-mono text-accent-primary">profiles</span>{' '}
            record (see migration SQL comments), then try again.
          </p>
        ) : null}
        {urlError && urlError !== 'no_profile' ? (
          <p className="mb-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {decodeURIComponent(urlError)}
          </p>
        ) : null}
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-text-secondary">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="border-border-subtle bg-bg-app text-text-primary"
              {...form.register('email')}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-danger">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-text-secondary">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="border-border-subtle bg-bg-app text-text-primary"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-danger">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          {formError ? (
            <p className="text-sm text-danger" role="alert">
              {formError}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="w-full border border-accent-primary/30 bg-accent-primary text-bg-app hover:bg-accent-primary-hover"
          >
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        {bootstrapSignupEnabled ? (
          <p className="mt-4 text-center text-xs text-text-disabled">
            One-time bootstrap?{' '}
            <Link href="/signup" className="text-accent-teal underline-offset-2 hover:underline">
              Create first account
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
