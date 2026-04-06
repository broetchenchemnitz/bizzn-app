'use client'

import { useState, useEffect } from 'react'
import CustomerAuthModal from '@/components/storefront/CustomerAuthModal'
import { getCustomerSession, signOutCustomer } from '@/app/actions/customer'
import { LogOut, User } from 'lucide-react'

type Props = {
  projectId: string
  projectName: string
}

export default function CustomerBar({ projectId, projectName }: Props) {
  const [customerName, setCustomerName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getCustomerSession().then(({ name, email }) => {
      setCustomerName(name ?? (email ? email.split('@')[0] : null))
      setIsLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    await signOutCustomer()
    setCustomerName(null)
  }

  if (isLoading) return null // Kein Flicker beim ersten Render

  if (customerName) {
    return (
      <div className="flex items-center justify-between gap-3 mt-3 px-1">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <div className="w-6 h-6 rounded-full bg-[#C7A17A]/20 flex items-center justify-center flex-shrink-0">
            <User className="w-3.5 h-3.5 text-[#C7A17A]" />
          </div>
          <span>
            👋 Hallo, <strong className="text-[#1A1A1A]">{customerName}</strong>!
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
          title="Abmelden"
        >
          <LogOut className="w-3.5 h-3.5" />
          Abmelden
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 px-1">
      <CustomerAuthModal
        projectId={projectId}
        projectName={projectName}
        onSuccess={(name) => setCustomerName(name)}
      />
    </div>
  )
}
