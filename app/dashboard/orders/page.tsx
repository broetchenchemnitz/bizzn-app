export const metadata = {
  title: "KDS (Bestellungen) | Bizzn Dashboard",
};

export default function OrdersPage() {
  return (
    <div className="bg-[#1A1A1A] text-white min-h-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-[#C7A17A]">
          KDS (Bestellungen)
        </h1>
        <div className="flex gap-4">
          <span
            id="kds-live-status"
            className="flex items-center text-sm text-gray-400 bg-[#242424] px-3 py-1.5 rounded-full border border-[#333333]"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Live Sync aktiv
          </span>
        </div>
      </div>

      <div className="bg-[#242424] border border-[#333333] rounded-xl p-8 text-center min-h-[50vh] flex flex-col justify-center">
        <h2 className="text-xl font-semibold text-gray-300 mb-2">
          Kitchen Display System
        </h2>
        <p className="text-gray-500">
          Wartet auf eingehende Bestellungen...
        </p>
      </div>
    </div>
  );
}
