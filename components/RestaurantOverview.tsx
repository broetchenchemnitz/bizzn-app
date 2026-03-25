"use client"

import { ShoppingBag, TrendingUp, UtensilsCrossed, ArrowUpRight, Clock } from 'lucide-react'

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent?: boolean
}

function KpiCard({ icon, label, value, sub, accent = false }: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl p-6 flex flex-col gap-4 border transition-shadow hover:shadow-md ${
        accent
          ? 'bg-[#77CC00] border-[#66b300] text-white'
          : 'bg-white border-gray-100 text-gray-900'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            accent ? 'bg-white/20' : 'bg-[#F0FBD8]'
          }`}
        >
          <span className={accent ? 'text-white' : 'text-[#77CC00]'}>{icon}</span>
        </div>
        <ArrowUpRight
          className={`w-4 h-4 ${accent ? 'text-white/70' : 'text-gray-300'}`}
        />
      </div>
      <div>
        <p className={`text-sm font-medium ${accent ? 'text-white/80' : 'text-gray-500'}`}>
          {label}
        </p>
        <p className={`text-3xl font-bold tracking-tight mt-0.5 ${accent ? 'text-white' : 'text-gray-900'}`}>
          {value}
        </p>
        <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
      </div>
    </div>
  )
}

interface StatusBadgeProps {
  label: string
  active: boolean
}

function StatusBadge({ label, active }: StatusBadgeProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-[#77CC00]/40 transition-colors cursor-pointer">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full ${active ? 'bg-[#77CC00]' : 'bg-gray-300'}`}
        />
        <span className={`text-xs font-medium ${active ? 'text-[#77CC00]' : 'text-gray-400'}`}>
          {active ? 'Aktiv' : 'Inaktiv'}
        </span>
      </div>
    </div>
  )
}

export default function RestaurantOverview() {
  return (
    <div className="space-y-6">
      {/* Live Status Bar */}
      <div className="flex items-center gap-2 bg-[#F0FBD8] border border-[#77CC00]/30 rounded-xl px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#77CC00] opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#77CC00]" />
        </span>
        <span className="text-sm font-semibold text-[#4a8500]">Restaurant live</span>
        <span className="text-xs text-[#4a8500]/70 ml-auto flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Daten werden live aktualisiert
        </span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<ShoppingBag className="w-6 h-6" />}
          label="Live Bestellungen"
          value="12"
          sub="3 in Zubereitung · 9 in Lieferung"
          accent
        />
        <KpiCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Tagesumsatz"
          value="€ 847"
          sub="+18% gegenüber gestern"
        />
        <KpiCard
          icon={<UtensilsCrossed className="w-6 h-6" />}
          label="Aktive Speisen"
          value="34"
          sub="6 in Speisekarte pausiert"
        />
      </div>

      {/* Channel Status */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
          Bestellkanäle
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatusBadge label="🛵  Lieferung" active={true} />
          <StatusBadge label="🛍️  Abholung (Takeaway)" active={true} />
          <StatusBadge label="📱  In-Store / QR-Code" active={false} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button className="flex items-center justify-center gap-2 bg-[#77CC00] hover:bg-[#66b300] text-white font-semibold px-5 py-3.5 rounded-xl text-sm transition-colors shadow-sm">
          <ShoppingBag className="w-4 h-4" />
          Bestellungen verwalten
        </button>
        <button className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-5 py-3.5 rounded-xl text-sm border border-gray-200 transition-colors shadow-sm">
          <UtensilsCrossed className="w-4 h-4" />
          Speisekarte bearbeiten
        </button>
      </div>
    </div>
  )
}
