import { supabase } from './supabaseClient'

// Simple in-memory cache with TTL for performance optimization
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(private defaultTTL: number = 300000) { // 5 minutes default
    this.startCleanup()
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    }
    this.cache.set(key, entry)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key)
        }
      }
    }, 60000) // Clean up every minute
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Global cache instances
export const serviceCache = new MemoryCache(300000) // 5 minutes for services
export const ticketCache = new MemoryCache(60000) // 1 minute for tickets
export const userCache = new MemoryCache(600000) // 10 minutes for users

// Cache keys
export const CACHE_KEYS = {
  SERVICE_BY_ID: (id: string) => `service:${id}`,
  SERVICE_BY_SLUG: (slug: string) => `service_slug:${slug}`,
  SERVICES_LIST: (vendorId?: string) => `services:${vendorId || 'all'}`,
  TICKET_TYPE_AVAILABILITY: (id: string) => `ticket_availability:${id}`,
  USER_PROFILE: (id: string) => `user:${id}`,
  VENDOR_PROFILE: (id: string) => `vendor:${id}`,
  SERVICE_CATEGORIES: 'service_categories'
}

// Cached service functions
export async function getCachedServiceById(serviceId: string) {
  const cacheKey = CACHE_KEYS.SERVICE_BY_ID(serviceId)
  let service = serviceCache.get(cacheKey)

  if (!service) {
    service = await getServiceById(serviceId)
    if (service) {
      serviceCache.set(cacheKey, service)
    }
  }

  return service
}

export async function getCachedServiceBySlug(serviceSlug: string) {
  const cacheKey = CACHE_KEYS.SERVICE_BY_SLUG(serviceSlug)
  let service = serviceCache.get(cacheKey)

  if (!service) {
    service = await getServiceBySlug(serviceSlug)
    if (service) {
      serviceCache.set(cacheKey, service)
    }
  }

  return service
}

export async function getCachedServices(vendorId?: string) {
  const cacheKey = CACHE_KEYS.SERVICES_LIST(vendorId)
  let services = serviceCache.get(cacheKey)

  if (!services) {
    services = await getServices(vendorId)
    serviceCache.set(cacheKey, services)
  }

  return services
}

export async function getCachedAvailableTickets(ticketTypeId: string): Promise<number> {
  const cacheKey = CACHE_KEYS.TICKET_TYPE_AVAILABILITY(ticketTypeId)
  const cached = ticketCache.get(cacheKey)

  if (cached === null || cached === undefined) {
    const availability = await getAvailableTickets(ticketTypeId)
    ticketCache.set(cacheKey, availability, 30000) // 30 seconds for availability
    return availability
  }

  return cached as number
}

// Cache invalidation helpers
export function invalidateServiceCache(serviceId?: string, vendorId?: string) {
  if (serviceId) {
    serviceCache.delete(CACHE_KEYS.SERVICE_BY_ID(serviceId))
    // Also invalidate slug cache if we had it
    const service = serviceCache.get(CACHE_KEYS.SERVICE_BY_ID(serviceId)) as any
    if (service?.slug) {
      serviceCache.delete(CACHE_KEYS.SERVICE_BY_SLUG(service.slug))
    }
  }

  if (vendorId) {
    serviceCache.delete(CACHE_KEYS.SERVICES_LIST(vendorId))
  }

  // Also clear general services list
  serviceCache.delete(CACHE_KEYS.SERVICES_LIST())
}

export function invalidateTicketCache(ticketTypeId?: string) {
  if (ticketTypeId) {
    ticketCache.delete(CACHE_KEYS.TICKET_TYPE_AVAILABILITY(ticketTypeId))
  } else {
    // Clear all ticket cache
    ticketCache.clear()
  }
}

export function invalidateUserCache(userId?: string) {
  if (userId) {
    userCache.delete(CACHE_KEYS.USER_PROFILE(userId))
    userCache.delete(CACHE_KEYS.VENDOR_PROFILE(userId))
  } else {
    userCache.clear()
  }
}

// Import the actual functions to avoid circular imports
import { getServiceById, getServiceBySlug, getServices, getAvailableTickets } from './database'

// Connection pooling and optimization
export class ConnectionPool {
  private activeConnections: number = 0
  private maxConnections: number = 10
  private queue: Array<() => void> = []

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeOp = async () => {
        this.activeConnections++
        try {
          const result = await operation()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          this.activeConnections--
          this.processQueue()
        }
      }

      if (this.activeConnections < this.maxConnections) {
        executeOp()
      } else {
        this.queue.push(executeOp)
      }
    })
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.activeConnections < this.maxConnections) {
      const nextOp = this.queue.shift()
      if (nextOp) nextOp()
    }
  }

  getStats() {
    return {
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
      queueLength: this.queue.length
    }
  }
}

// Global connection pool for database operations
export const dbConnectionPool = new ConnectionPool()

// Optimized database operations with connection pooling
export async function executeWithPooling<T>(
  operation: () => Promise<T>,
  operationName: string = 'database_operation'
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await dbConnectionPool.execute(operation)
    const duration = Date.now() - startTime
    console.log(`${operationName} completed in ${duration}ms`)
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`${operationName} failed after ${duration}ms:`, error)
    throw error
  }
}

// Health check function
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: Record<string, boolean>
  metrics: Record<string, any>
}> {
  const checks: Record<string, boolean> = {}
  const metrics: Record<string, any> = {}

  // Database connectivity check
  try {
    const start = Date.now()
    const { error } = await supabase.from('services').select('count').limit(1).single()
    const duration = Date.now() - start
    checks.database = !error
    metrics.database_response_time = duration
  } catch (err) {
    checks.database = false
    metrics.database_error = err instanceof Error ? err.message : 'Unknown error'
  }

  // Cache health
  checks.cache = true // Cache is always available (in-memory)
  metrics.cache_entries = {
    services: serviceCache['cache'].size,
    tickets: ticketCache['cache'].size,
    users: userCache['cache'].size
  }

  // Connection pool health
  const poolStats = dbConnectionPool.getStats()
  checks.connection_pool = poolStats.activeConnections < poolStats.maxConnections
  metrics.connection_pool = poolStats

  // Overall status
  const healthyChecks = Object.values(checks).filter(Boolean).length
  const totalChecks = Object.keys(checks).length

  let status: 'healthy' | 'degraded' | 'unhealthy'
  if (healthyChecks === totalChecks) {
    status = 'healthy'
  } else if (healthyChecks >= totalChecks * 0.5) {
    status = 'degraded'
  } else {
    status = 'unhealthy'
  }

  return { status, checks, metrics }
}