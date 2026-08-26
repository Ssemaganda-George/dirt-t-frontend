import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  const mem: Record<string, string> = {}
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => mem[key] ?? null,
      setItem: (key: string, value: string) => {
        mem[key] = String(value)
      },
      removeItem: (key: string) => {
        delete mem[key]
      },
      clear: () => {
        for (const key of Object.keys(mem)) delete mem[key]
      },
      key: (index: number) => Object.keys(mem)[index] ?? null,
      get length() {
        return Object.keys(mem).length
      },
    },
    configurable: true,
  })
})

import { publicPayUrl } from '../repositories/QuoteRepository'

describe('publicPayUrl', () => {
  it('uses SSR fallback origin and /pay/{token}', () => {
    expect(publicPayUrl('abc123')).toBe('https://bookings.dirt-trails.com/pay/abc123')
  })
})
