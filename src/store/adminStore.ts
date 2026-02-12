import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Service } from '../types'

export interface PendingServiceRecord {
  vendor_id: string
  service_id: string
  title: string
  category_id: string
  price: number
  currency: string
  created_at: string
}

interface AdminStore {
  pendingServices: PendingServiceRecord[]
  addPendingService: (vendorId: string, svc: Service) => void
  removePendingService: (vendorId: string, serviceId: string) => void
  getPendingServices: () => PendingServiceRecord[]
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      pendingServices: [],

      addPendingService: (vendorId: string, svc: Service) => {
        const list = get().pendingServices
        // Avoid duplicates
        if (list.some(x => x.vendor_id === vendorId && x.service_id === svc.id)) return

        const rec: PendingServiceRecord = {
          vendor_id: vendorId,
          service_id: svc.id,
          title: svc.title,
          category_id: svc.category_id,
          price: svc.price,
          currency: svc.currency,
          created_at: svc.created_at,
        }

        set({ pendingServices: [rec, ...list] })
      },

      removePendingService: (vendorId: string, serviceId: string) => {
        const list = get().pendingServices
        const next = list.filter(x => !(x.vendor_id === vendorId && x.service_id === serviceId))
        set({ pendingServices: next })
      },

      getPendingServices: () => get().pendingServices,
    }),
    {
      name: 'admin:pending_services',
    }
  )
)

// Export legacy functions for backward compatibility during migration
export function getPendingServices(): PendingServiceRecord[] {
  return useAdminStore.getState().getPendingServices()
}

export function addPendingService(vendorId: string, svc: Service) {
  useAdminStore.getState().addPendingService(vendorId, svc)
}

export function removePendingService(vendorId: string, serviceId: string) {
  useAdminStore.getState().removePendingService(vendorId, serviceId)
}
