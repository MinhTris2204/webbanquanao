import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import api from '../utils/api'

const CartContext = createContext()

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [cartCount, setCartCount] = useState(0)

  const fetchCartCount = async () => {
    if (!isAuthenticated) {
      setCartCount(0)
      return
    }

    try {
      const res = await api.get('/api/cart')
      const count = res.data.cart_items?.reduce((sum, item) => sum + item.quantity, 0) || 0
      setCartCount(count)
    } catch (err) {
      console.error('Error fetching cart count:', err)
      setCartCount(0)
    }
  }

  useEffect(() => {
    fetchCartCount()
  }, [isAuthenticated])

  return (
    <CartContext.Provider value={{ cartCount, fetchCartCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }
  return context
}
