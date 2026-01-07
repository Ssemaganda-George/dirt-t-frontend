import React, { createContext, useContext, useReducer, ReactNode } from 'react'

interface BookingState {
  serviceId: string | null
  service: any | null
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
  currentStep: number
  isLoading: boolean
  error: string | null
}

type BookingAction =
  | { type: 'SET_SERVICE'; payload: { serviceId: string; service: any } }
  | { type: 'UPDATE_BOOKING_DATA'; payload: Partial<BookingState['bookingData']> }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_BOOKING' }

const initialState: BookingState = {
  serviceId: null,
  service: null,
  bookingData: {
    date: '',
    guests: 1,
    specialRequests: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    paymentMethod: 'card',
    checkInDate: '',
    checkOutDate: '',
    rooms: 1,
    roomType: 'Standard',
    pickupLocation: '',
    dropoffLocation: '',
    returnTrip: false
  },
  currentStep: 1,
  isLoading: false,
  error: null
}

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_SERVICE':
      return {
        ...state,
        serviceId: action.payload.serviceId,
        service: action.payload.service,
        currentStep: 1,
        error: null
      }
    case 'UPDATE_BOOKING_DATA':
      return {
        ...state,
        bookingData: { ...state.bookingData, ...action.payload }
      }
    case 'SET_STEP':
      return { ...state, currentStep: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    case 'RESET_BOOKING':
      return initialState
    default:
      return state
  }
}

interface BookingContextType {
  state: BookingState
  dispatch: React.Dispatch<BookingAction>
  setService: (serviceId: string, service: any) => void
  updateBookingData: (data: Partial<BookingState['bookingData']>) => void
  setStep: (step: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  resetBooking: () => void
}

const BookingContext = createContext<BookingContextType | undefined>(undefined)

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState)

  const setService = (serviceId: string, service: any) => {
    dispatch({ type: 'SET_SERVICE', payload: { serviceId, service } })
  }

  const updateBookingData = (data: Partial<BookingState['bookingData']>) => {
    dispatch({ type: 'UPDATE_BOOKING_DATA', payload: data })
  }

  const setStep = (step: number) => {
    dispatch({ type: 'SET_STEP', payload: step })
  }

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }

  const setError = (error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }

  const resetBooking = () => {
    dispatch({ type: 'RESET_BOOKING' })
  }

  const value = {
    state,
    dispatch,
    setService,
    updateBookingData,
    setStep,
    setLoading,
    setError,
    resetBooking
  }

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking() {
  const context = useContext(BookingContext)
  if (context === undefined) {
    throw new Error('useBooking must be used within a BookingProvider')
  }
  return context
}