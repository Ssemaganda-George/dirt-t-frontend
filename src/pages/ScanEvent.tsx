import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import QrScanner from 'qr-scanner'
import { getServiceById, createEventOTP, verifyEventOTP, verifyTicketByCode } from '../lib/database'
import { useAuth } from '../contexts/AuthContext'

export default function ScanEventPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [service, setService] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [otpRequested, setOtpRequested] = useState(false)
  const [otp, setOtp] = useState('')
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
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

  // Manual verification state
  const [manualCode, setManualCode] = useState('')
  const [isManualProcessing, setIsManualProcessing] = useState(false)
  const [showManualEntry, setShowManualEntry] = useState(false)

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return null
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
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

  const submitOtp = async (e: any) => {
    e.preventDefault()
    if (!id) return
    try {
      const res = await verifyEventOTP(id, otp)
      if (res.valid) {
        setVerified(true)
      } else {
        setError('Invalid or expired OTP')
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

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop()
      }
    }
  }, [])

  if (loading) return <div className="p-6">Loading...</div>
  if (!service) return <div className="p-6">Event not found</div>

  if (verified) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Event Banner Header - Compact when scanning */}
        <div className={`fixed top-16 left-0 right-0 z-10 bg-gray-900 overflow-hidden transition-all duration-300 ${
          isScanning ? 'h-20 md:h-24' : 'h-48 md:h-56'
        }`}>
          {service.images && service.images.length > 0 && (
            <img
              src={service.images[0]}
              alt={service.title}
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-center text-white px-4 transition-all duration-300 ${
              isScanning ? 'scale-90' : 'scale-100'
            }`}>
              <h1 className={`font-semibold mb-1 transition-all duration-300 ${
                isScanning ? 'text-sm md:text-base' : 'text-lg md:text-xl'
              }`}>Event Verification</h1>
              <p className={`font-bold mb-2 text-white drop-shadow-lg transition-all duration-300 ${
                isScanning ? 'text-lg md:text-xl' : 'text-2xl md:text-3xl'
              }`}>{service.title}</p>

              {/* Event Details - Hidden when scanning for cleaner interface */}
              {!isScanning && (
                <div className="flex flex-row items-center justify-center gap-3 text-xs text-white/90">
                  {service.event_datetime ? (
                    <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-md px-2 py-1">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-xs">{new Date(service.event_datetime).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}</span>
                    </div>
                  ) : (
                    <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-md px-2 py-1">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-xs">Date not set</span>
                    </div>
                  )}
                  {(service.location || service.event_location) ? (
                    <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-md px-2 py-1">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium text-xs">{service.event_location || service.location}</span>
                    </div>
                  ) : (
                    <div className="flex items-center bg-white/15 backdrop-blur-sm rounded-md px-2 py-1">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium text-xs">Location not set</span>
                    </div>
                  )}
                </div>
              )}

              {/* Compact event info when scanning */}
              {isScanning && (
                <div className="flex flex-row items-center justify-center gap-2 text-xs text-white/90 mt-1">
                  {service.event_datetime && (
                    <span className="font-medium">
                      {new Date(service.event_datetime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                  {(service.location || service.event_location) && (
                    <>
                      <span className="text-white/60">•</span>
                      <span className="font-medium truncate max-w-32">
                        {service.event_location || service.location}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scanning Interface - positioned below header when active */}
        {isScanning && (
          <div className="fixed top-64 md:top-72 left-0 right-0 bottom-0 z-10 max-h-screen overflow-hidden">
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
                          <span className="text-sm text-gray-900">{formatTimestamp(scanResult.ticket.used_at)}</span>
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
      {otpRequested ? (
        <form onSubmit={submitOtp} className="mt-4">
          <label className="block text-sm font-medium text-gray-700">OTP</label>
          <input value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2" />
          {error && <div className="text-red-600 mt-2">{error}</div>}
          <div className="mt-4">
            <button className="px-4 py-2 bg-primary-600 text-white rounded">Verify OTP</button>
          </div>
        </form>
      ) : (
        <div className="mt-4 text-gray-500">Requesting OTP…</div>
      )}
    </div>
  )
}
