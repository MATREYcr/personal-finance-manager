'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { signUp } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AuthSplitPanel } from '@/components/auth-split-panel'

export default function SignUpPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: signUpError } = await signUp.email({ name, email, password })
    if (signUpError) {
      setError(signUpError.message ?? t('signUpError'))
      return
    }
    router.push('/dashboard')
  }

  return (
    <AuthSplitPanel>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t('signUpTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder={t('name')} value={name} onChange={(e) => setName(e.target.value)} required />
            <Input type="email" placeholder={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder={t('password')} value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">{t('signUpSubmit')}</Button>
          </form>
        </CardContent>
      </Card>
    </AuthSplitPanel>
  )
}
