import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import QrScanner from 'qr-scanner'
import { getServiceById, createEventOTP, verifyEventOTP, verifyTicketByCode, markTicketUsed } from '../lib/database'
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const qrScannerRef = useRef<QrScanner | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      setLoading(true)
      try {
        const svc = await getServiceById(id)
        setService(svc)

        // If service not found or not an event, show not found
        if (!svc) return

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
    if (!videoRef.current) return

    setIsScanning(true)
    setScanError(null)
    setScanResult(null)

    try {
      const qrScanner = new QrScanner(
        videoRef.current,
        async (result) => {
          console.log('QR code detected:', result.data)
          await handleScanResult(result.data)
        },
        {
          onDecodeError: (err) => {
            console.error('QR decode error:', err)
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      )

      qrScannerRef.current = qrScanner
      await qrScanner.start()
    } catch (err: any) {
      console.error('Error starting scanner:', err)
      setScanError('Failed to access camera: ' + err.message)
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current = null
    }
    setIsScanning(false)
  }

  const handleScanResult = async (qrData: string) => {
    if (!id) return

    try {
      setScanError(null)
      const result = await verifyTicketByCode(qrData, id)
      
      if (result.valid) {
        // Mark ticket as used
        await markTicketUsed(result.ticket.id)
        setScanResult({
          success: true,
          message: 'Ticket verified and marked as used!',
          ticket: result.ticket
        })
      } else {
        setScanResult({
          success: false,
          message: result.message
        })
      }
    } catch (err: any) {
      console.error('Error verifying ticket:', err)
      setScanResult({
        success: false,
        message: err.message || 'Error verifying ticket'
      })
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
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold">Event Verification Portal</h2>
        <p className="mt-2">Access granted for event: {service.title}</p>
        
        <div className="mt-6">
          <button
            onClick={isScanning ? stopScanning : startScanning}
            className={`px-6 py-3 rounded-lg font-medium ${
              isScanning 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isScanning ? 'Stop Scanning' : 'Scan Ticket'}
          </button>
        </div>

        {isScanning && (
          <div className="mt-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video 
                ref={videoRef} 
                className="w-full max-w-md mx-auto"
                playsInline
                muted
              />
            </div>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Point your camera at a ticket QR code
            </p>
          </div>
        )}

        {scanResult && (
          <div className={`mt-6 p-4 rounded-lg ${
            scanResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                scanResult.success ? 'bg-green-500' : 'bg-red-500'
              }`}>
                <span className="text-white text-sm">
                  {scanResult.success ? '✓' : '✗'}
                </span>
              </div>
              <div className="ml-3">
                <p className={`font-medium ${
                  scanResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {scanResult.message}
                </p>
                {scanResult.ticket && (
                  <div className="mt-2 text-sm text-gray-600">
                    <p>Ticket: {scanResult.ticket.code}</p>
                    <p>Type: {scanResult.ticket.ticket_types?.title}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {scanError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{scanError}</p>
          </div>
        )}
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
