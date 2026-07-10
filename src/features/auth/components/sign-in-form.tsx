'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { signIn } from '@/lib/auth/client'
import { ROUTES } from '@/lib/constants/routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function SignInForm() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const { error: signInError } = await signIn.email({ email, password })
    if (signInError) {
      setError(signInError.message ?? t('signInError'))
      return
    }
    router.push(ROUTES.DASHBOARD)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('signInTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button type="submit" className="w-full">
            {t('signInSubmit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
