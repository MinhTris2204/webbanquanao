import { Outlet } from 'react-router-dom'
import CustomerNavbar from '../components/CustomerNavbar'

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNavbar />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
