import { Suspense } from 'react'

import { LoginForm } from '@/app/(auth)/login/login-form'

export default function LoginPage() {
  const bootstrapSignupEnabled = process.env.ALLOW_BOOTSTRAP_SIGNUP === 'true'

  return (
    <Suspense fallback={null}>
      <LoginForm bootstrapSignupEnabled={bootstrapSignupEnabled} />
    </Suspense>
  )
}
