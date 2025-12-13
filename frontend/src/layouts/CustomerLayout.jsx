import { Outlet } from 'react-router-dom'
import CustomerNavbar from '../components/CustomerNavbar'
import Footer from '../components/Footer'

export default function CustomerLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50">
        <CustomerNavbar />
      </header>
      
      {/* Main Content - Takes remaining space */}
      <main className="flex-1">
        <Outlet />
      </main>
      
      {/* Footer - Always at bottom */}
      <Footer />
    </div>
  )
}
