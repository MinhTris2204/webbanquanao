import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { SocketProvider } from './context/SocketContext'
import { ToastProvider } from './components/Toast'
import CookieConsent from './components/CookieConsent'
import CustomerChat from './components/CustomerChat'
import CustomerLayout from './layouts/CustomerLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Search from './pages/Search'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import Profile from './pages/Profile'
import StoreInfoPage from './pages/StoreInfoPage'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <ToastProvider>
      <CartProvider>
        <SocketProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <CookieConsent />
        <CustomerChat />
        <Routes>
        {/* Customer Routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/info/:key" element={<StoreInfoPage />} />
        </Route>
      </Routes>
    </Router>
        </SocketProvider>
      </CartProvider>
    </ToastProvider>
  )
}

export default App
