import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QrScanner from 'qr-scanner'
import { getServiceById, createEventOTP, verifyEventOTP, verifyPassword, verifyTicketByCode, getActiveScanSession } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'
import { formatDateTime } from '../lib/utils'
import LoginModal from '../components/LoginModal'

export default function ScanEventPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [service, setService] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [otpRequested, setOtpRequested] = useState(false)
  const [otp, setOtp] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Password-based OTP state
  const [usePasswordMode, setUsePasswordMode] = useState(false)
  
  // Secure mode state
  const [useSecureMode, setUseSecureMode] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  
  // Logout dropdown state
  const [showLogoutDropdown, setShowLogoutDropdown] = useState(false)
  
  // QR scanning state
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showScanDialog, setShowScanDialog] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)
  const isProcessingRef = useRef(false)

  // Scan session state
  const [activeScanSession, setActiveScanSession] = useState<any>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Manual verification state
  const [manualCode, setManualCode] = useState('')
  const [isManualProcessing, setIsManualProcessing] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)

  const togglePasswordMode = () => {
    setUsePasswordMode(!usePasswordMode)
    setUseSecureMode(false) // Disable secure mode when enabling password mode
    setPasswordInput('')
    setOtp('')
    setError(null)
  }

  const toggleSecureMode = () => {
    if (!useSecureMode) {
      // Enabling secure mode - show login modal
      setShowLoginModal(true)
    } else {
      // Disabling secure mode
      setUseSecureMode(false)
      setUsePasswordMode(false) // Disable password mode when disabling secure mode
      setPasswordInput('')
      setOtp('')
      setError(null)
    }
  }

  const handleLoginSuccess = () => {
    setShowLoginModal(false)
    setUseSecureMode(true)
    setUsePasswordMode(false)
    setPasswordInput('')
    setOtp('')
    setError(null)
    setVerified(true)
  }

  const handleLoginModalClose = () => {
    setShowLoginModal(false)
    setUseSecureMode(false)
  }

  const handleLogout = async () => {
    try {
      // Sign out from Supabase authentication
      await signOut()
      
      // Reset all authentication states
      setUseSecureMode(false)
      setVerified(false)
      setShowLogoutDropdown(false)
      setOtp('')
      setPasswordInput('')
      setError(null)
      setOtpRequested(false)
      
      // Clear any active scan session
      setActiveScanSession(null)
      setTimeRemaining(0)
      setSessionExpired(false)
      
      // Stop scanning if active
      stopScanning()
      
      // Navigate back to trigger re-authentication
      window.location.reload()
    } catch (error) {
      console.error('Error signing out:', error)
      // Still reset local state even if signOut fails
      setUseSecureMode(false)
      setVerified(false)
      setShowLogoutDropdown(false)
      setOtp('')
      setPasswordInput('')
      setError(null)
      setOtpRequested(false)
      setActiveScanSession(null)
      setTimeRemaining(0)
      setSessionExpired(false)
      stopScanning()
      window.location.reload()
    }
  }

  const handleCloseScanDialog = () => {
    // Clear all dialog states to return to the 2 icons view
    setShowScanDialog(false)
    setShowManualEntry(false)
    setScanResult(null)
    setScanError(null)
    setManualCode('')
    setIsProcessing(false)
    setIsManualProcessing(false)
    isProcessingRef.current = false
    setLastScannedCode(null)
  }

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const svc = await getServiceById(id)
        setService(svc)

        // If service not found or not an event, show not found
        if (!svc) {
          setError('Event not found')
          return
        }

        // Check if scanning is enabled for this event
        if (!svc.scan_enabled) {
          setError('Ticket scanning is not enabled for this event')
          return
        }

        // If visitor is vendor of service or admin and scan_enabled, allow immediate access
        if (svc.scan_enabled && user?.id) {
          // If user is admin or vendor owner, skip OTP
          if (user?.id === svc.vendors?.user_id) {
            setVerified(true)
            return
          }
          // TODO: if we have profile role check, skip for admins
        }

        // For any guest/random user we will request an OTP when they land
        await createEventOTP(id)
        setOtpRequested(true)
      } catch (err: any) {
        console.error('Error loading service or requesting OTP:', err)
        setError(err?.message || 'Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, user?.id])

  // Separate useEffect for scan session check - runs independently of user authentication
  useEffect(() => {
    if (!id) return
    const checkScanSession = async () => {
      try {
        // Check for active scan session (takes precedence over user login)
        const scanSession = await getActiveScanSession(id)
        if (scanSession) {
          setActiveScanSession(scanSession)
          setVerified(true)

          // Calculate initial time remaining
          const endTime = new Date(scanSession.end_time).getTime()
          const now = Date.now()
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
          setTimeRemaining(remaining)

          // Clear any errors and OTP state since we have a valid scan session
          setError(null)
          setOtpRequested(false)
        }
      } catch (err: any) {
        console.error('Error checking scan session:', err)
      }
    }
    checkScanSession()
  }, [id])

  // Countdown timer for scan sessions
  useEffect(() => {
    if (!activeScanSession || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1
        if (newTime <= 0) {
          setSessionExpired(true)
          setVerified(false)
          setError('Scan session has expired')
          return 0
        }
        return newTime
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [activeScanSession, timeRemaining])

  const submitOtp = async (e: any) => {
    e.preventDefault()
    if (!id) return

    // Handle password-based OTP verification
    if (usePasswordMode) {
      // Allow any vendor or admin password to work
      try {
        const isValidPassword = await verifyPassword(passwordInput)
        if (isValidPassword) {
          setVerified(true)
          setError(null)
        } else {
          setError('Invalid password. Please try again.')
          setPasswordInput('') // Clear the input for retry
        }
      } catch (err: any) {
        setError('Password verification failed. Please try again.')
        setPasswordInput('') // Clear the input for retry
      }
      return
    }

    // Handle regular OTP verification
    try {
      const res = await verifyEventOTP(id, otp)
      if (res.valid) {
        setVerified(true)
      } else {
        // Check if user is a vendor/admin of this event
        const isVendorOrAdmin = user?.id && service?.vendors?.user_id === user.id

        if (isVendorOrAdmin) {
          // Vendor/admin can try logging in again normally
          setError('Invalid or expired OTP. Please try logging in again.')
        } else {
          // Non-vendor users get redirected to request new OTP
          navigate(`/request-otp/${id}`)
          return
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed')
    }
  }

  const startScanning = async () => {
    console.log('Starting QR scanner...')
    
    // Check if we're in a secure context
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setScanError('Camera access requires HTTPS. Please ensure you\'re accessing this page over a secure connection.')
      return
    }

    setIsScanning(true)
    setScanError(null)
    setScanResult(null)
    setLastScannedCode(null)
    setIsProcessing(false)

    // Wait for the video element to be available
    await new Promise(resolve => setTimeout(resolve, 100))

    if (!videoRef.current) {
      console.error('Video element not found')
      setScanError('Video element not available')
      setIsScanning(false)
      return
    }

    console.log('Video element found, initializing QR scanner...')

    try {
      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera()
      console.log('Camera available:', hasCamera)
      
      if (!hasCamera) {
        throw new Error('No camera found on this device')
      }

      const qrScanner = new QrScanner(
        videoRef.current,
        async (result) => {
          console.log('QR code detected:', result.data)
          
          // Stop scanning immediately to prevent multiple detections
          if (qrScannerRef.current) {
            qrScannerRef.current.stop()
            setIsScanning(false)
          }
          
          await handleScanResult(result.data)
        },
        {
          onDecodeError: (err) => {
            console.error('QR decode error:', err)
            // Don't show decode errors to user, just log them
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use back camera on mobile
        }
      )

      console.log('QR scanner created, starting...')
      qrScannerRef.current = qrScanner
      await qrScanner.start()
      console.log('QR scanner started successfully')
    } catch (err: any) {
      console.error('Error starting scanner:', err)
      let errorMessage = 'Failed to access camera'
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and try again.'
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found on this device.'
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.'
      } else if (err.message) {
        errorMessage += ': ' + err.message
      }
      
      setScanError(errorMessage)
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current = null
    }
    setIsScanning(false)
    setIsProcessing(false)
    isProcessingRef.current = false
    setLastScannedCode(null)
  }

  const handleScanResult = async (qrData: string) => {
    // Prevent any scanning while processing or if same code recently scanned
    if (!id || isProcessingRef.current || lastScannedCode === qrData) {
      console.log('Scan blocked - processing:', isProcessingRef.current, 'same code:', lastScannedCode === qrData)
      return
    }

    console.log('Processing QR code:', qrData)
    isProcessingRef.current = true
    setIsProcessing(true)
    setLastScannedCode(qrData)
    setScanError(null)

    // Clear previous result and show processing state
    setScanResult(null)

    try {
      // Extract ticket code from URL if it's a service URL with ticket parameter
      let ticketCode = qrData
      if (qrData.startsWith('https://bookings.dirt-trails.com/service/')) {
        // Extract ticket code from query parameter: /service/{slug}?ticket={ticketCode}
        const url = new URL(qrData)
        const ticketParam = url.searchParams.get('ticket')
        if (ticketParam) {
          ticketCode = ticketParam
          console.log('Extracted ticket code from service URL:', ticketCode)
        }
      } else if (qrData.startsWith('https://bookings.dirt-trails.com/verify-ticket/')) {
        // Fallback for old verification URLs
        const url = new URL(qrData)
        const pathParts = url.pathname.split('/')
        if (pathParts.length >= 3 && pathParts[1] === 'verify-ticket') {
          ticketCode = pathParts[2]
          console.log('Extracted ticket code from verification URL:', ticketCode)
        }
      }

      const result = await verifyTicketByCode(ticketCode, id)
      
      if (result.valid) {
        const wasAlreadyUsed = (result as any).already_used || false
        
        // Ticket is valid - show dialog for successful scan
        setScanResult({
          success: true,
          message: wasAlreadyUsed ? 'Ticket verified (previously used)!' : 'Ticket verified successfully!',
          ticket: result.ticket,
          ticketStatus: wasAlreadyUsed ? 'used' : 'new'
        })
        setShowScanDialog(true)
        
        console.log('Ticket verified successfully')
      } else {
        setScanResult({
          success: false,
          message: result.message,
          ticketStatus: 'invalid'
        })
        setShowScanDialog(true)
        
        console.log('Ticket verification failed:', result.message)
      }
    } catch (err: any) {
      console.error('Error verifying ticket:', err)
      setScanResult({
        success: false,
        message: err.message || 'Error verifying ticket',
        ticketStatus: 'invalid'
      })
      setShowScanDialog(true)
      
      // Stop scanning on errors too
      stopScanning()
    } finally {
      setIsProcessing(false)
      // Reset last scanned code after a longer delay to prevent accidental re-scans
      setTimeout(() => {
        setLastScannedCode(null)
        // Note: Scanning will restart when user closes dialog (handled by useEffect)
      }, 8000) // Increased from 3 to 8 seconds
    }
  }

  const verifyManualCode = async (e: any) => {
    e.preventDefault()
    if (!manualCode.trim() || !id) return

    console.log('Verifying manual ticket code:', `TKT-${manualCode}`)
    setIsManualProcessing(true)

    try {
      // Prepend TKT- prefix for verification
      const fullCode = `TKT-${manualCode.trim().toUpperCase()}`
      const result = await verifyTicketByCode(fullCode, id)
      
      if (result.valid) {
        const wasAlreadyUsed = (result as any).already_used || false
        
        // Ticket is valid - show dialog for successful scan
        setScanResult({
          success: true,
          message: wasAlreadyUsed ? 'Ticket verified (previously used)!' : 'Ticket verified successfully!',
          ticket: result.ticket,
          ticketStatus: wasAlreadyUsed ? 'used' : 'new'
        })
        setShowScanDialog(true)
        
        console.log('Ticket verified successfully')
      } else {
        setScanResult({
          success: false,
          message: result.message,
          ticketStatus: 'invalid'
        })
        setShowScanDialog(true)
        
        console.log('Ticket verification failed:', result.message)
      }
    } catch (err: any) {
      console.error('Error verifying ticket:', err)
      setScanResult({
        success: false,
        message: err.message || 'Error verifying ticket',
        ticketStatus: 'invalid'
      })
      setShowScanDialog(true)
    } finally {
      setIsManualProcessing(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showLogoutDropdown && !(event.target as Element).closest('.logout-dropdown')) {
        setShowLogoutDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showLogoutDropdown])

  if (loading) return <div className="p-6">Loading...</div>
  if (!service) return <div className="p-6">Event not found</div>

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Event Banner Header - Full screen hero */}
        <div className={`fixed top-0 left-0 right-0 z-10 bg-gray-900 overflow-hidden transition-all duration-300 ${
          isScanning ? 'h-28 md:h-32' : 'h-56 md:h-72'
        }`}>
          {service.images && service.images.length > 0 && (
            <img
              src={service.images[0]}
              alt={service.title}
              className="w-full h-full object-cover"
              style={{ pointerEvents: 'none' }}
            />
          )}
          <div className="absolute inset-0 bg-black/40" style={{ pointerEvents: 'none' }}></div>
          
          <div className="absolute inset-0 flex flex-col justify-center px-3 sm:px-4 py-2 sm:py-3">
            <div className={`text-center text-white transition-all duration-300 ${
              isScanning ? 'space-y-1' : 'space-y-3 sm:space-y-4'
            }`}>
              {/* Event Title - Primary focus */}
              <h2 className={`font-bold text-white drop-shadow-lg leading-tight transition-all duration-300 ${
                isScanning ? 'text-lg sm:text-xl md:text-2xl' : 'text-xl sm:text-2xl md:text-3xl lg:text-4xl'
              }`}>{service.title}</h2>

              {/* Event Details - Hidden when scanning for cleaner interface */}
              {!isScanning && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mt-24 sm:mt-28 px-2">
                  {service.event_datetime ? (
                    <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10">
                      <span className="font-medium text-xs sm:text-sm text-white">{new Date(service.event_datetime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                  ) : (
                    <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10">
                      <span className="font-medium text-xs sm:text-sm text-white/80">Date not set</span>
                    </div>
                  )}
                  {(service.location || service.event_location) ? (
                    <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10 max-w-xs sm:max-w-none">
                      <span className="font-medium text-xs sm:text-sm text-white truncate">{service.event_location || service.location}</span>
                    </div>
                  ) : (
                    <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-2 border border-white/10">
                      <span className="font-medium text-xs sm:text-sm text-white/80">Location not set</span>
                    </div>
                  )}
                </div>
              )}

              {/* Compact event info when scanning - Better spacing and typography */}
              {isScanning && (
                <div className="flex flex-row items-center justify-center gap-2 mt-2 px-2">
                  {service.event_datetime && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-md px-2 sm:px-3 py-1">
                      <span className="font-semibold text-xs sm:text-sm text-white">
                        {new Date(service.event_datetime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                  {(service.location || service.event_location) && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-md px-2 sm:px-3 py-1 max-w-32 sm:max-w-48">
                      <span className="font-semibold text-xs sm:text-sm text-white truncate">
                        {service.event_location || service.location}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Logout Dropdown - Top Right Corner - Outside header to avoid pointer event conflicts */}
        {/* {(useSecureMode || user?.id) && ( */}
          <div className="fixed top-4 right-4 z-50">
            <div className="relative logout-dropdown">
              <button
                onClick={() => setShowLogoutDropdown(!showLogoutDropdown)}
                className="flex items-center justify-center w-10 h-10 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors border border-white/20 cursor-pointer"
                aria-label="User menu"
                style={{ pointerEvents: 'auto' }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              {showLogoutDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                      <div className="font-medium">{user?.email || 'Authenticated User'}</div>
                      <div className="text-xs text-gray-500 capitalize">
                        {useSecureMode ? 'Secure Mode' : (profile?.role === 'vendor' ? 'Secure Event Mode' : (profile?.role || 'User'))}
                      </div>
                      {activeScanSession && !sessionExpired && (
                        <div className="text-xs text-red-600 mt-1 font-medium">
                          Session expires in: {Math.floor(timeRemaining / 3600)}:{String(Math.floor((timeRemaining % 3600) / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        {/* )} */}

        {/* Scanning Interface - positioned below header when active */}
        {isScanning && (
          <div className="fixed top-28 md:top-32 left-0 right-0 bottom-0 z-10 max-h-screen overflow-hidden">
            {/* Camera Container with Professional Styling - Constrained to viewport */}
            <div className="h-full max-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 overflow-hidden backdrop-blur-sm flex flex-col">
              {/* Camera Viewfinder - Takes most of the space */}
              <div className="flex-1 relative p-4 min-h-0">
                <div className="relative bg-black rounded-xl overflow-hidden shadow-inner h-full max-h-full">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />

                  {/* Professional Viewfinder Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Corner brackets - hidden on mobile for cleaner look */}
                    <div className="hidden md:block absolute top-3 left-3 w-8 h-8 border-l-3 border-t-3 border-white/80 rounded-tl-lg"></div>
                    <div className="hidden md:block absolute top-3 right-3 w-8 h-8 border-r-3 border-t-3 border-white/80 rounded-tr-lg"></div>
                    <div className="hidden md:block absolute bottom-3 left-3 w-8 h-8 border-l-3 border-b-3 border-white/80 rounded-bl-lg"></div>
                    <div className="hidden md:block absolute bottom-3 right-3 w-8 h-8 border-r-3 border-b-3 border-white/80 rounded-br-lg"></div>

                    {/* Center scanning line */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60 animate-pulse"></div>
                  </div>
                </div>
              </div>

              {/* Status and Controls - Fixed at bottom */}
              <div className="px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border-t border-gray-700/50">
                {/* Status Text */}
                <div className="text-center mb-3 md:mb-4">
                  <p className="text-white text-sm font-medium tracking-wide">
                    {isProcessing ? 'Verifying ticket...' : 'Point camera at QR code'}
                  </p>
                  {!isProcessing && (
                    <p className="text-gray-400 text-xs mt-1 hidden md:block">Position the code within the frame</p>
                  )}
                </div>

                {/* Stop Scanning Button */}
                <button
                  onClick={stopScanning}
                  className="w-full py-2.5 md:py-3 px-4 md:px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] border border-red-500/20"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10l6 6m0-6l-6 6" />
                    </svg>
                    Stop Scanning
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={`container mx-auto px-4 py-6 max-w-2xl ${isScanning ? 'hidden' : 'fixed left-0 right-0 top-64 md:top-72 bottom-0 flex items-center justify-center'}`}>

          {/* Simplified Icon Interface */}
          <div className="flex items-center justify-center space-x-8">
            {/* Scan Icon */}
            <button
              onClick={startScanning}
              className="group flex flex-col items-center justify-center w-32 h-32 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 21h4.01" />
              </svg>
              <span className="text-sm font-medium">Scan</span>
            </button>

            {/* Write Icon */}
            <button
              onClick={() => setShowManualEntry(true)}
              className="group flex flex-col items-center justify-center w-32 h-32 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="text-sm font-medium">Write</span>
            </button>
          </div>

          {/* Manual Entry Modal */}
          {showManualEntry && (
            <div className="fixed left-0 right-0 top-64 md:top-72 bottom-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Manual Entry</h3>
                    <button
                      onClick={() => {
                        // Clear all dialog states to return to the 2 icons view
                        setShowScanDialog(false)
                        setShowManualEntry(false)
                        setScanResult(null)
                        setScanError(null)
                        setManualCode('')
                        setIsProcessing(false)
                        setIsManualProcessing(false)
                        isProcessingRef.current = false
                        setLastScannedCode(null)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={verifyManualCode} className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-10 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-mono text-sm">TKT-</span>
                      </div>
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center font-mono text-lg"
                        disabled={isManualProcessing}
                        autoFocus
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!manualCode.trim() || isManualProcessing}
                      className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
                        !manualCode.trim() || isManualProcessing
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isManualProcessing ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Verifying...
                        </div>
                      ) : (
                        'Verify Ticket'
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Hidden video element for QR scanner */}
          <video 
            ref={videoRef} 
            className="hidden"
            playsInline
            muted
          />

          {/* Scan Result Dialog */}
          {showScanDialog && scanResult && (
            <div className="fixed left-0 right-0 top-64 md:top-72 bottom-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                      scanResult.ticketStatus === 'new' ? 'bg-green-500' :
                      scanResult.ticketStatus === 'used' ? 'bg-blue-500' : 'bg-red-500'
                    }`}>
                      {scanResult.ticketStatus === 'new' ? (
                        <span className="text-white font-bold text-2xl">✓</span>
                      ) : (
                        <div className="relative">
                          <div className="w-6 h-6 border-2 border-white rounded-full"></div>
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-0.5 bg-white rotate-45"></div>
                        </div>
                      )}
                    </div>
                    <h3 className="ml-3 text-lg font-semibold text-gray-900">
                      {scanResult.ticketStatus === 'new' ? 'Ticket Verified' :
                       scanResult.ticketStatus === 'used' ? 'Ticket Already Used' : 'Invalid Ticket'}
                    </h3>
                  </div>
                  
                  <p className={`mb-4 ${scanResult.success ? 'text-gray-700' : 'text-red-600'}`}>
                    {scanResult.message}
                  </p>
                  
                  {scanResult.ticket && scanResult.success && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6">
                      <div className="flex justify-between">
                        <span className="font-medium text-sm text-gray-600">Ticket Code:</span>
                        <span className="font-mono text-sm text-gray-900">{scanResult.ticket.code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-sm text-gray-600">Type:</span>
                        <span className="text-sm text-gray-900">{scanResult.ticket.ticket_types?.title}</span>
                      </div>
                      {scanResult.ticket.used_at && (
                        <div className="flex justify-between">
                          <span className="font-medium text-sm text-gray-600">Verified:</span>
                          <span className="text-sm text-gray-900">{formatDateTime(scanResult.ticket.used_at)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <button
                      onClick={handleCloseScanDialog}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        scanResult.success ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-600 text-white hover:bg-gray-700'
                      }`}
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {scanError && (
            <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-gray-900 text-sm">{scanError}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold">Event verification required</h2>
      <p className="mt-2">An OTP has been sent to the event organizer and an admin. Enter the OTP below to proceed.</p>

      {/* Mode toggles */}
      <div className="mt-4 mb-4 space-y-2">
        {user?.id && (
          <button
            type="button"
            onClick={togglePasswordMode}
            className="text-sm text-primary-600 hover:text-primary-800 underline block"
          >
            {usePasswordMode ? 'Use OTP instead' : 'Use vendor/admin password instead'}
          </button>
        )}
        
        <button
          type="button"
          onClick={toggleSecureMode}
          className={`text-sm underline block ${useSecureMode ? 'text-red-600 hover:text-red-800' : 'text-blue-600 hover:text-blue-800'}`}
        >
          {useSecureMode ? 'Disable secure mode' : 'Enable secure mode'}
        </button>
        
        {useSecureMode && (
          <div className="text-xs text-gray-600 mt-1">
            Secure mode: Additional verification required for enhanced security
          </div>
        )}
      </div>

      {otpRequested || usePasswordMode ? (
        <form onSubmit={submitOtp} className="mt-4 space-y-4">
          {usePasswordMode ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter vendor or admin password
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">OTP</label>
                <input 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                  placeholder="Enter OTP"
                />
              </div>
            </>
          )}

          {error && <div className="text-red-600 mt-2 text-sm">{error}</div>}
          <div className="mt-4">
            <button 
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded font-medium transition-colors"
            >
              {usePasswordMode ? 'Verify Password' : 'Verify OTP'}
            </button>
          </div>
        </form>
      ) : useSecureMode ? (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-green-800 font-medium">Secure mode enabled</p>
              <p className="text-green-600 text-sm">You have been authenticated and can now scan tickets.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 text-gray-500">Requesting OTP…</div>
      )}

      {/* Login Modal for Secure Mode */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={handleLoginModalClose}
        onSuccess={handleLoginSuccess}
        restrictToScanPage={true}
        serviceId={id}
      />
    </div>
  )
}
