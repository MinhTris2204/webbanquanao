import { Outlet } from 'react-router-dom'
import CustomerNavbar from '../components/CustomerNavbar'
import Footer from '../components/Footer'

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CustomerNavbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
