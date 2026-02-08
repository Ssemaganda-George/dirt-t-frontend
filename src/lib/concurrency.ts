import { supabase } from './supabaseClient'

// Rate limiting and queuing utilities for high-traffic scenarios

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyPrefix: string
}

interface QueueItem {
  id: string
  operation: string
  data: any
  priority: number
  createdAt: number
  retryCount: number
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get existing requests for this key
    const existingRequests = this.requests.get(key) || []

    // Filter out requests outside the current window
    const validRequests = existingRequests.filter(timestamp => timestamp > windowStart)

    // Check if under the limit
    if (validRequests.length < config.maxRequests) {
      validRequests.push(now)
      this.requests.set(key, validRequests)
      return true
    }

    return false
  }

  getRemainingRequests(key: string, config: RateLimitConfig): number {
    const now = Date.now()
    const windowStart = now - config.windowMs
    const existingRequests = this.requests.get(key) || []
    const validRequests = existingRequests.filter(timestamp => timestamp > windowStart)
    return Math.max(0, config.maxRequests - validRequests.length)
  }

  reset(key: string): void {
    this.requests.delete(key)
  }
}

class OperationQueue {
  private queue: QueueItem[] = []
  private processing: boolean = false
  private maxRetries: number = 3
  private retryDelay: number = 1000 // 1 second

  async add(item: Omit<QueueItem, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const queueItem: QueueItem = {
      ...item,
      id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      retryCount: 0
    }

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(existing => existing.priority < item.priority)
    if (insertIndex === -1) {
      this.queue.push(queueItem)
    } else {
      this.queue.splice(insertIndex, 0, queueItem)
    }

    // Start processing if not already processing
    if (!this.processing) {
      this.process()
    }

    return queueItem.id
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      try {
        await this.executeOperation(item)
      } catch (error) {
        console.error(`Failed to execute queued operation ${item.operation}:`, error)

        if (item.retryCount < this.maxRetries) {
          // Retry with exponential backoff
          item.retryCount++
          const delay = this.retryDelay * Math.pow(2, item.retryCount - 1)
          setTimeout(() => {
            this.queue.unshift(item) // Add back to front for retry
            if (!this.processing) this.process()
          }, delay)
          this.processing = false
          return
        } else {
          console.error(`Operation ${item.operation} failed after ${this.maxRetries} retries`)
        }
      }
    }

    this.processing = false
  }

  private async executeOperation(item: QueueItem): Promise<void> {
    switch (item.operation) {
      case 'book_tickets':
        await this.bookTickets(item.data)
        break
      case 'verify_ticket':
        await this.verifyTicket(item.data)
        break
      case 'create_booking':
        await this.createBooking(item.data)
        break
      default:
        throw new Error(`Unknown operation: ${item.operation}`)
    }
  }

  private async bookTickets(data: { ticketTypeId: string; quantity: number; orderId: string }): Promise<void> {
    const { data: result, error } = await supabase.rpc('book_tickets_atomic', {
      p_ticket_type_id: data.ticketTypeId,
      p_quantity: data.quantity,
      p_order_id: data.orderId
    })

    if (error || !result?.success) {
      throw new Error(result?.error || error?.message || 'Failed to book tickets')
    }
  }

  private async verifyTicket(data: { code: string; serviceId?: string }): Promise<void> {
    const { data: result, error } = await supabase.rpc('verify_and_use_ticket_atomic', {
      p_ticket_code: data.code,
      p_service_id: data.serviceId || null
    })

    if (error || !result?.success) {
      throw new Error(result?.error || error?.message || 'Failed to verify ticket')
    }
  }

  private async createBooking(data: any): Promise<void> {
    // Use atomic booking creation with capacity validation
    const { data: result, error } = await supabase.rpc('create_booking_atomic', {
      p_service_id: data.service_id,
      p_tourist_id: data.tourist_id,
      p_vendor_id: data.vendor_id,
      p_booking_date: data.booking_date,
      p_service_date: data.service_date,
      p_guests: data.guests,
      p_total_amount: data.total_amount,
      p_currency: data.currency,
      p_special_requests: data.special_requests,
      p_guest_name: data.guest_name,
      p_guest_email: data.guest_email,
      p_guest_phone: data.guest_phone,
      p_pickup_location: data.pickup_location,
      p_dropoff_location: data.dropoff_location
    });

    if (error || !result?.success) {
      throw new Error(result?.error || error?.message || 'Failed to create booking');
    }
  }

  getQueueLength(): number {
    return this.queue.length
  }

  clear(): void {
    this.queue = []
  }
}

// Global instances
export const rateLimiter = new RateLimiter()
export const operationQueue = new OperationQueue()

// Rate limit configurations
export const RATE_LIMITS = {
  TICKET_BOOKING: {
    maxRequests: 10, // 10 booking requests per user
    windowMs: 60000, // per minute
    keyPrefix: 'booking'
  },
  TICKET_SCANNING: {
    maxRequests: 5, // 5 scans per scanner per second
    windowMs: 1000,
    keyPrefix: 'scan'
  },
  API_REQUESTS: {
    maxRequests: 100, // 100 general API requests per user
    windowMs: 60000, // per minute
    keyPrefix: 'api'
  }
}

// Utility functions for rate limiting
export function checkRateLimit(userId: string, action: keyof typeof RATE_LIMITS): boolean {
  const config = RATE_LIMITS[action]
  const key = `${config.keyPrefix}_${userId}`
  return rateLimiter.isAllowed(key, config)
}

export function getRemainingRequests(userId: string, action: keyof typeof RATE_LIMITS): number {
  const config = RATE_LIMITS[action]
  const key = `${config.keyPrefix}_${userId}`
  return rateLimiter.getRemainingRequests(key, config)
}

// Queued operations with rate limiting
export async function queueTicketBooking(
  userId: string,
  ticketTypeId: string,
  quantity: number,
  orderId: string
): Promise<string> {
  // Check rate limit first
  if (!checkRateLimit(userId, 'TICKET_BOOKING')) {
    throw new Error('Rate limit exceeded. Please try again later.')
  }

  return operationQueue.add({
    operation: 'book_tickets',
    data: { ticketTypeId, quantity, orderId },
    priority: 1 // High priority for bookings
  })
}

export async function queueTicketVerification(
  scannerId: string,
  code: string,
  serviceId?: string
): Promise<string> {
  // Check rate limit for scanning
  if (!checkRateLimit(scannerId, 'TICKET_SCANNING')) {
    throw new Error('Scanning too frequently. Please slow down.')
  }

  return operationQueue.add({
    operation: 'verify_ticket',
    data: { code, serviceId },
    priority: 2 // High priority for verification
  })
}

// Circuit breaker pattern for external service calls
class CircuitBreaker {
  private failures: number = 0
  private lastFailureTime: number = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  getState(): string {
    return this.state
  }

  reset(): void {
    this.failures = 0
    this.state = 'CLOSED'
    this.lastFailureTime = 0
  }
}

// Global circuit breaker for database operations
export const dbCircuitBreaker = new CircuitBreaker()

// Wrapper for database operations with circuit breaker
export async function executeWithCircuitBreaker<T>(
  operation: () => Promise<T>,
  operationName: string = 'database_operation'
): Promise<T> {
  try {
    return await dbCircuitBreaker.execute(operation)
  } catch (error) {
    if (error instanceof Error && error.message === 'Circuit breaker is OPEN') {
      console.error(`${operationName} failed: Circuit breaker is OPEN`)
      throw new Error(`${operationName} is temporarily unavailable due to high error rate`)
    }
    throw error
  }
}