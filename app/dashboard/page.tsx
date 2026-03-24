export const metadata = {
  title: 'Dashboard | Bizzn',
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to your secure Bizzn workspace. This route is protected by Edge Middleware.
        </p>
      </div>
    </div>
  )
}
