import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ToastProvider } from './components/Toast'
import AdminLayout from './layouts/AdminLayout'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/Dashboard'
import AdminProducts from './pages/admin/Products'
import AdminOrders from './pages/admin/Orders'
import AdminUsers from './pages/admin/Users'
import AdminVouchers from './pages/admin/Vouchers'
import AdminStoreInfo from './pages/admin/StoreInfo'
import AdminPromotions from './pages/admin/Promotions'
import AdminReviews from './pages/admin/Reviews'
import AdminChat from './pages/admin/Chat'
import CustomerInsights from './pages/admin/CustomerInsights'

function AdminApp() {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <SocketProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<AdminLogin />} />
        
        {isAuthenticated && isAdmin ? (
          <Route element={<AdminLayout />}>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/products" element={<AdminProducts />} />
            <Route path="/orders" element={<AdminOrders />} />
            <Route path="/vouchers" element={<AdminVouchers />} />
            <Route path="/promotions" element={<AdminPromotions />} />
            <Route path="/reviews" element={<AdminReviews />} />
            <Route path="/users" element={<AdminUsers />} />
            <Route path="/customer-insights" element={<CustomerInsights />} />
            <Route path="/store-info" element={<AdminStoreInfo />} />
            <Route path="/chat" element={<AdminChat />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
      </SocketProvider>
    </ToastProvider>
  )
}

export default AdminApp
