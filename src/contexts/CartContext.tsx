import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react'

interface CartItem {
  id: string
  serviceId: string
  service: any
  bookingData: {
    date: string
    guests: number
    specialRequests: string
    contactName: string
    contactEmail: string
    contactPhone: string
    paymentMethod: string
    // Hotel-specific
    checkInDate: string
    checkOutDate: string
    rooms: number
    roomType: string
    // Transport-specific
    pickupLocation: string
    dropoffLocation: string
    returnTrip: boolean
    // General
    [key: string]: any
  }
  category: string
  totalPrice: number
  currency: string
  savedAt: string
  status: 'saved' | 'pending' | 'completed'
}

interface CartState {
  items: CartItem[]
  isLoading: boolean
  error: string | null
}

type CartAction =
  | { type: 'ADD_TO_CART'; payload: Omit<CartItem, 'id' | 'savedAt' | 'status'> }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_ITEM'; payload: { id: string; updates: Partial<CartItem> } }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'LOAD_CART'; payload: CartItem[] }

const initialState: CartState = {
  items: [],
  isLoading: false,
  error: null
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_TO_CART':
      const newItem: CartItem = {
        ...action.payload,
        id: Date.now().toString(),
        savedAt: new Date().toISOString(),
        status: 'saved'
      }
      return {
        ...state,
        items: [...state.items, newItem]
      }

    case 'REMOVE_FROM_CART':
      return {
        ...state,
        items: state.items.filter(item => item.id !== action.payload)
      }

    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        items: state.items.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        )
      }

    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }

    case 'LOAD_CART':
      return {
        ...state,
        items: action.payload,
        isLoading: false
      }

    default:
      return state
  }
}

interface CartContextType {
  state: CartState
  dispatch: React.Dispatch<CartAction>
  addToCart: (item: Omit<CartItem, 'id' | 'savedAt' | 'status'>) => void
  removeFromCart: (id: string) => void
  updateCartItem: (id: string, updates: Partial<CartItem>) => void
  clearCart: () => void
  getCartCount: () => number
  getCartTotal: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('dirtTrails_cart')
    if (savedCart) {
      try {
        const cartItems = JSON.parse(savedCart)
        dispatch({ type: 'LOAD_CART', payload: cartItems })
      } catch (error) {
        console.error('Error loading cart from localStorage:', error)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dirtTrails_cart', JSON.stringify(state.items))
  }, [state.items])

  const addToCart = (item: Omit<CartItem, 'id' | 'savedAt' | 'status'>) => {
    dispatch({ type: 'ADD_TO_CART', payload: item })
  }

  const removeFromCart = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: id })
  }

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    dispatch({ type: 'UPDATE_CART_ITEM', payload: { id, updates } })
  }

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' })
  }

  const getCartCount = () => {
    return state.items.length
  }

  const getCartTotal = () => {
    return state.items.reduce((total, item) => total + item.totalPrice, 0)
  }

  const value = {
    state,
    dispatch,
    addToCart,
    removeFromCart,
    updateCartItem,
    clearCart,
    getCartCount,
    getCartTotal
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}