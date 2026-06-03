# DirtTrails frontend architecture (Supabase era)

Stay on Supabase until the API migration in `audit-2026-06-03.md`. These rules keep the codebase testable and ready for a later port.

## Layers (top → bottom)

| Layer | Path | May import | Must not |
|-------|------|------------|----------|
| **UI** | `pages/`, `components/`, `contexts/` | `services/`, `repositories/`, `hooks/`, `types/` | `supabase` directly (except auth session in `AuthContext` until ported) |
| **Hooks** | `hooks/` | `services/`, `repositories/`, `lib/` utilities | Raw `supabase.from` / `.rpc` |
| **Services** | `services/` | `repositories/`, `types/`, pure `lib/` | `supabase` — orchestrate only |
| **Repositories** | `repositories/` | `supabaseClient`, `types/`, pure helpers | React |
| **Domain / pure** | `services/PricingService.ts`, `lib/*Validation*` | `types/` only | Any I/O |
| **Types** | `types/` | — | Any I/O |

## Import conventions

```ts
// Preferred (new code)
import { getServices } from '../repositories/ServiceRepository'
import { cancelBookingOnPaymentFailure } from '../services/BookingService'

// Allowed (legacy barrel — same implementations)
import { getServices } from '../lib/database'

// Avoid in pages/components
import { supabase } from '../lib/supabaseClient'
```

## Payments (MarzPay)

- Collect: `initiateMarzpayCollect` in `lib/marzpayApi.ts`
- Status polling: `fetchMarzpayPaymentStatus` in `lib/marzpayApi.ts`
- Booking flows: `watchMarzpayPayment` in `hooks/watchMarzpayPayment.ts` (fixed interval + optional burst)
- Order/checkout: `useMarzpayPaymentWatch` + exponential backoff (`lib/marzpayPollMessages.ts`) — used by `Checkout`, `useOrderPaymentFlow`, legacy `Payment` donation URL
- Booking cancel on failed payment: `BookingService` → `BookingRepository`

## Adding features

1. Add or extend a **repository** function (Supabase I/O).
2. Add **service** orchestration if multiple repos or side effects (email, wallet).
3. Call from page/hook — never duplicate queries in the page.

## Verification

```bash
npm run build
npm run lint
```

Automated tests (`npm run test`) are optional until the architecture pass is complete.
