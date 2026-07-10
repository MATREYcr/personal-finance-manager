import { AuthSplitPanel } from '@/components/layout/auth-split-panel'
import { SignInForm } from '@/features/auth/components/sign-in-form'

export default function SignInPage() {
  return (
    <AuthSplitPanel>
      <SignInForm />
    </AuthSplitPanel>
  )
}
