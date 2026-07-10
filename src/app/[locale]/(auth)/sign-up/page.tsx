import { AuthSplitPanel } from '@/components/layout/auth-split-panel'
import { SignUpForm } from '@/features/auth/components/sign-up-form'

export default function SignUpPage() {
  return (
    <AuthSplitPanel>
      <SignUpForm />
    </AuthSplitPanel>
  )
}
