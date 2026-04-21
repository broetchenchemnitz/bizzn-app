import LoginForm from '@/components/LoginForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Login | Bizzn',
  description: 'Melde dich an, um dein Restaurant auf Bizzn zu verwalten.',
}

export default function LoginPage() {
  return <LoginForm />
}
