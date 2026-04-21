import SignupForm from '@/components/SignupForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Registrieren | Bizzn',
  description: 'Erstelle dein Bizzn-Konto und bringe dein Restaurant online.',
}

export default function SignupPage() {
  return <SignupForm />
}
