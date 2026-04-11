'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Shield } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { signupSchema, type SignupFormValues } from '@/lib/validations/auth'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SignupForm() {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirm: '' },
  })

  async function onSubmit(values: SignupFormValues) {
    setFormError(null)
    const supabase = createClient()
    const origin = window.location.origin
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    })
    if (error) {
      setFormError(error.message)
      return
    }
    if (data.session) {
      setDone(true)
      router.refresh()
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <Card className="w-full max-w-md border-border-subtle bg-bg-surface shadow-none">
        <CardHeader className="text-center">
          <CardTitle className="text-text-primary">Check next steps</CardTitle>
          <CardDescription className="text-left text-text-secondary">
            If sign-up succeeded, create the matching{' '}
            <span className="font-mono text-accent-gold">profiles</span> row in
            Supabase (see migration file SQL comment), set your role to{' '}
            <span className="font-mono text-accent-gold">admin</span>, then turn
            off bootstrap sign-up and disable public sign-ups in Supabase Auth
            settings before production.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className={cn(
              buttonVariants({ size: 'default' }),
              'inline-flex w-full border border-accent-gold/30 bg-accent-gold text-bg-app hover:bg-accent-gold/90'
            )}
          >
            Continue to sign in
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-border-subtle bg-bg-surface shadow-none">
      <CardHeader className="space-y-3 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated">
          <Shield className="size-7 text-accent-gold" strokeWidth={1.5} aria-hidden />
        </div>
        <CardTitle className="text-xl text-text-primary">Bootstrap sign-up</CardTitle>
        <CardDescription className="text-text-secondary">
          Use once to create the first auth user. Afterwards disable this route and
          public sign-ups.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-accent-gold/40 bg-bg-elevated px-3 py-2 text-xs text-text-secondary">
          <p className="font-medium text-accent-gold">Before production</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>
              In Supabase: Authentication → Providers → Email → disable{' '}
              <span className="font-medium text-text-primary">Allow new users to sign up</span>.
            </li>
            <li>
              Set <span className="font-mono text-accent-teal">ALLOW_BOOTSTRAP_SIGNUP=false</span>{' '}
              in this app&apos;s environment so <span className="font-mono">/signup</span> is
              unreachable.
            </li>
          </ul>
        </div>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => void onSubmit(v))}
          noValidate
        >
          <div className="space-y-2">
            <Label htmlFor="su-email" className="text-text-secondary">
              Email
            </Label>
            <Input
              id="su-email"
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
            <Label htmlFor="su-password" className="text-text-secondary">
              Password
            </Label>
            <Input
              id="su-password"
              type="password"
              autoComplete="new-password"
              className="border-border-subtle bg-bg-app text-text-primary"
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <p className="text-xs text-danger">
                {form.formState.errors.password.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-confirm" className="text-text-secondary">
              Confirm password
            </Label>
            <Input
              id="su-confirm"
              type="password"
              autoComplete="new-password"
              className="border-border-subtle bg-bg-app text-text-primary"
              {...form.register('confirm')}
            />
            {form.formState.errors.confirm ? (
              <p className="text-xs text-danger">
                {form.formState.errors.confirm.message}
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
            className="w-full border border-accent-gold/30 bg-accent-gold text-bg-app hover:bg-accent-gold/90"
          >
            {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="text-center text-xs text-text-disabled">
          <Link href="/login" className="text-accent-teal underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
