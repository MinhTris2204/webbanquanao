import { Outlet } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'

export default function AdminLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50">
        <AdminNavbar />
      </header>
      
      {/* Main Content - Takes remaining space */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
