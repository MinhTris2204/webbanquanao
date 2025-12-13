import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
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
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <Routes>
        {/* Customer Routes */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
