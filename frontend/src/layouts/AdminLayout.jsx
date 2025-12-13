import { Outlet } from 'react-router-dom'
import AdminNavbar from '../components/AdminNavbar'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNavbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
