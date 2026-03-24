import LoginForm from '@/components/LoginForm'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Login | Bizzn',
  description: 'Authenticate to access your Bizzn account.',
}

export default function LoginPage() {
  return (
    <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <LoginForm />
    </div>
  )
}
