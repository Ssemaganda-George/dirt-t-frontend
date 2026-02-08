import { performHealthCheck } from './cache'
import { dbCircuitBreaker } from './concurrency'

// Monitoring and alerting system for the ticketing system
interface Alert {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
  timestamp: number
  resolved: boolean
  resolvedAt?: number
  metadata?: Record<string, any>
}

interface Metric {
  name: string
  value: number
  timestamp: number
  tags?: Record<string, string>
}

class MonitoringSystem {
  private alerts: Alert[] = []
  private metrics: Metric[] = []
  private maxMetrics: number = 1000
  private maxAlerts: number = 100
  private alertCallbacks: Array<(alert: Alert) => void> = []

  // Track system metrics
  private systemStats = {
    totalRequests: 0,
    errorCount: 0,
    avgResponseTime: 0,
    lastHealthCheck: 0,
    uptime: Date.now()
  }

  constructor() {
    // Start periodic health monitoring
    setInterval(() => this.performPeriodicHealthCheck(), 60000) // Every minute
    setInterval(() => this.cleanupOldData(), 300000) // Every 5 minutes
  }

  // Alert management
  createAlert(type: Alert['type'], message: string, metadata?: Record<string, any>): string {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      resolved: false,
      metadata
    }

    this.alerts.unshift(alert)

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts)
    }

    // Notify subscribers
    this.alertCallbacks.forEach(callback => callback(alert))

    console.log(`[${type.toUpperCase()}] ${message}`, metadata || '')
    return alert.id
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert && !alert.resolved) {
      alert.resolved = true
      alert.resolvedAt = Date.now()
    }
  }

  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  getAllAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(0, limit)
  }

  onAlert(callback: (alert: Alert) => void): void {
    this.alertCallbacks.push(callback)
  }

  // Metrics collection
  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: Metric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    }

    this.metrics.push(metric)

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }

    // Update system stats
    this.updateSystemStats(name, value)
  }

  getMetrics(name?: string, timeRange?: number): Metric[] {
    let filtered = this.metrics

    if (name) {
      filtered = filtered.filter(m => m.name === name)
    }

    if (timeRange) {
      const cutoff = Date.now() - timeRange
      filtered = filtered.filter(m => m.timestamp >= cutoff)
    }

    return filtered
  }

  getMetricSummary(name: string, timeRange: number = 3600000): {
    count: number
    sum: number
    avg: number
    min: number
    max: number
  } | null {
    const metrics = this.getMetrics(name, timeRange)
    if (metrics.length === 0) return null

    const values = metrics.map(m => m.value)
    return {
      count: metrics.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    }
  }

  // System stats tracking
  private updateSystemStats(metricName: string, value: number): void {
    switch (metricName) {
      case 'request_duration':
        this.systemStats.totalRequests++
        this.systemStats.avgResponseTime =
          (this.systemStats.avgResponseTime * (this.systemStats.totalRequests - 1) + value) / this.systemStats.totalRequests
        break
      case 'error_count':
        this.systemStats.errorCount += value
        break
    }
  }

  getSystemStats() {
    return {
      ...this.systemStats,
      uptime: Date.now() - this.systemStats.uptime,
      errorRate: this.systemStats.totalRequests > 0 ? this.systemStats.errorCount / this.systemStats.totalRequests : 0
    }
  }

  // Health monitoring
  private async performPeriodicHealthCheck(): Promise<void> {
    try {
      const health = await performHealthCheck()
      this.systemStats.lastHealthCheck = Date.now()

      // Record health metrics
      this.recordMetric('health_check_status', health.status === 'healthy' ? 1 : 0, { status: health.status })

      // Create alerts for health issues
      if (health.status === 'unhealthy') {
        this.createAlert('error', 'System health check failed', {
          checks: health.checks,
          metrics: health.metrics
        })
      } else if (health.status === 'degraded') {
        this.createAlert('warning', 'System health degraded', {
          checks: health.checks,
          metrics: health.metrics
        })
      }

      // Check circuit breaker status
      const circuitState = dbCircuitBreaker.getState()
      if (circuitState === 'OPEN') {
        this.createAlert('error', 'Database circuit breaker is OPEN', {
          state: circuitState
        })
      }

    } catch (error) {
      console.error('Health check failed:', error)
      this.createAlert('error', 'Health check system failure', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Cleanup old data
  private cleanupOldData(): void {
    const oneHourAgo = Date.now() - 3600000
    const oneDayAgo = Date.now() - 86400000

    // Keep metrics for 1 hour
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo)

    // Keep alerts for 1 day
    this.alerts = this.alerts.filter(a => a.timestamp > oneDayAgo || !a.resolved)
  }

  // Performance monitoring decorators
  async monitorOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    tags?: Record<string, string>
  ): Promise<T> {
    const startTime = Date.now()

    try {
      const result = await operation()
      const duration = Date.now() - startTime

      this.recordMetric('request_duration', duration, { operation: operationName, ...tags })
      this.recordMetric('request_success', 1, { operation: operationName, ...tags })

      return result
    } catch (error) {
      const duration = Date.now() - startTime

      this.recordMetric('request_duration', duration, { operation: operationName, ...tags })
      this.recordMetric('request_error', 1, { operation: operationName, ...tags })
      this.recordMetric('error_count', 1, { operation: operationName, ...tags })

      this.createAlert('error', `Operation ${operationName} failed`, {
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        tags
      })

      throw error
    }
  }
}

// Global monitoring instance
export const monitoring = new MonitoringSystem()

// Convenience functions for common monitoring tasks
export function recordTicketBooking(duration: number, success: boolean, ticketTypeId?: string): void {
  monitoring.recordMetric('ticket_booking_duration', duration, {
    success: success.toString(),
    ticket_type: ticketTypeId || 'unknown'
  })

  if (!success) {
    monitoring.recordMetric('ticket_booking_failed', 1, { ticket_type: ticketTypeId || 'unknown' })
  }
}

export function recordTicketScan(duration: number, success: boolean, scannerId?: string): void {
  monitoring.recordMetric('ticket_scan_duration', duration, {
    success: success.toString(),
    scanner: scannerId || 'unknown'
  })

  if (!success) {
    monitoring.recordMetric('ticket_scan_failed', 1, { scanner: scannerId || 'unknown' })
  }
}

export function recordDatabaseOperation(duration: number, operation: string, success: boolean): void {
  monitoring.recordMetric('db_operation_duration', duration, {
    operation,
    success: success.toString()
  })

  if (!success) {
    monitoring.recordMetric('db_operation_failed', 1, { operation })
  }
}

// Alert thresholds and automated responses
export class AlertManager {
  private thresholds = {
    errorRate: 0.05, // 5% error rate
    responseTime: 5000, // 5 seconds
    circuitBreakerOpen: true
  }

  checkThresholds(): void {
    const stats = monitoring.getSystemStats()
    const recentErrors = monitoring.getMetricSummary('error_count', 300000) // Last 5 minutes

    // Check error rate
    if (stats.errorRate > this.thresholds.errorRate) {
      monitoring.createAlert('warning', `High error rate detected: ${(stats.errorRate * 100).toFixed(2)}%`, {
        errorRate: stats.errorRate,
        totalRequests: stats.totalRequests,
        errorCount: stats.errorCount
      })
    }

    // Check response time
    if (stats.avgResponseTime > this.thresholds.responseTime) {
      monitoring.createAlert('warning', `Slow response time detected: ${stats.avgResponseTime.toFixed(0)}ms`, {
        avgResponseTime: stats.avgResponseTime
      })
    }

    // Check recent errors
    if (recentErrors && recentErrors.sum > 10) {
      monitoring.createAlert('error', `High error count in last 5 minutes: ${recentErrors.sum}`, {
        recentErrors: recentErrors.sum
      })
    }
  }
}

export const alertManager = new AlertManager()

// Set up periodic threshold checking
setInterval(() => alertManager.checkThresholds(), 60000) // Every minute