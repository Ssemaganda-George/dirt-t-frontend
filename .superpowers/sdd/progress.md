# SDD progress — quote payment links

Branch: feat/quote-payment-links
No commits (plan + user rule). Live SQL for Task 2 is on Travel Tails.

Task 1: complete (working tree, review approved after test-gap fix)
Task 2: complete (migration on disk + applied to Travel Tails after review/fixes)
Task 3: complete (working tree, review approved). Minors: raw RPC envelope on getQuotePayPage; QuoteStatus duplicate of QuoteCollectGate.
Task 4: complete (working tree, review approved after vendor-listing stale-state fix). Minors: zero-price custom lines; create vs refresh error copy; copy link on cancelled/paid rows.
Task 5: complete (working tree, review approved after hiding MobileBottomNav + PlanTripFab on /pay/). Justified: paid/deposit copy before expiry.
Task 6: complete. Deployed `marzpay-collect` v18 (verify_jwt true). Quote bookings overwrite amount from DB.
Task 7: complete. Deployed `process-payment-fulfillment-queue` v17 (verify_jwt true) including `quoteSettlement.ts`.
Task 8: not started — real MarzPay smoke. Frontend `/admin/quotes` and `/pay/:token` still uncommitted (local/preview only until the SPA is shipped). Halt if ledger ≠ wallets.
