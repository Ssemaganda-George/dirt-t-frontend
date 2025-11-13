import { Service } from '../types'

const PENDING_KEY = 'admin:pending_services'

function load<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save<T>(k: string, v: T) {
  localStorage.setItem(k, JSON.stringify(v))
}

export interface PendingServiceRecord {
  vendor_id: string
  service_id: string
  name: string
  category: Service['category']
  price: number
  currency: string
  created_at: string
}

export function getPendingServices(): PendingServiceRecord[] {
  return load<PendingServiceRecord[]>(PENDING_KEY, [])
}

export function addPendingService(vendorId: string, svc: Service) {
  const list = getPendingServices()
  // Avoid duplicates
  if (list.some(x => x.vendor_id === vendorId && x.service_id === svc.id)) return
  const rec: PendingServiceRecord = {
    vendor_id: vendorId,
    service_id: svc.id,
    name: svc.name,
    category: svc.category,
    price: svc.price,
    currency: svc.currency,
    created_at: svc.created_at,
  }
  save(PENDING_KEY, [rec, ...list])
}

export function removePendingService(vendorId: string, serviceId: string) {
  const list = getPendingServices()
  const next = list.filter(x => !(x.vendor_id === vendorId && x.service_id === serviceId))
  save(PENDING_KEY, next)
}
