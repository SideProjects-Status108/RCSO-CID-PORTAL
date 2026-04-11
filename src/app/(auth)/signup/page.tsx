import { redirect } from 'next/navigation'

import { SignupForm } from '@/app/(auth)/signup/signup-form'

export default function SignupPage() {
  if (process.env.ALLOW_BOOTSTRAP_SIGNUP !== 'true') {
    redirect('/login?reason=signup_disabled')
  }

  return <SignupForm />
}
