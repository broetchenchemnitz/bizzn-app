import Image from 'next/image'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-white">
      <div className="flex flex-col items-center gap-8">
        <Image src="/logo.svg" alt="Bizzn Logo" width={200} height={75} priority />
        <h1 className="text-4xl font-bold text-brand">Welcome to Bizzn</h1>
      </div>
    </main>
  )
}
