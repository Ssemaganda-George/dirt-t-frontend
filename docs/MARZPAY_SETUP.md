# MarzPay payment integration

This project uses **MarzPay** for Mobile Money (MTN / Airtel) payments. The flow is implemented with three Supabase Edge Functions and the Payment page in the frontend.

## Edge Functions

| Function | Purpose |
|----------|---------|
| `marzpay-collect` | Initiates a payment: validates phone, calls MarzPay collect-money API, stores a row in `payments`, returns reference for polling. |
| `marzpay-webhook` | Receives MarzPay callbacks: updates `payments`, and when status is `completed` updates `orders`, creates transaction, bookings, and tickets. |
| `marzpay-payment-status` | Returns payment status by `reference` (used by the frontend to poll until completed/failed). |

## Environment variables (Supabase Edge Functions)

Set these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or via CLI):

| Variable | Required | Description |
|----------|----------|-------------|
| `MARZPAY_API_CREDENTIALS` | Yes | Base64-encoded MarzPay API credentials (e.g. from MarzPay dashboard). |
| `MARZPAY_API_URL` | No | Default: `https://wallet.wearemarz.com/api/v1` |
| `APP_URL` or `FRONTEND_URL` | No | Used for any redirects; optional for this flow. |
| `TELEGRAM_BOT_TOKEN` | No | If set, payment completed/failed notifications are sent to Telegram. |
| `TELEGRAM_CHAT_ID` | No | Comma-separated chat IDs for Telegram notifications. |

Supabase injects `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically.

## Webhook URL for MarzPay

Configure MarzPay to send payment callbacks to your Edge Function:

```
https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/marzpay-webhook
```

Replace `<YOUR_PROJECT_REF>` with your Supabase project reference (from project URL in dashboard).

## Frontend flow

1. User is on **Checkout** → enters buyer details → **Next** goes to **Payment** (`/checkout/:orderId/payment`).
2. On **Payment**, user selects Mobile Money, enters phone number (e.g. 0712345678 or +256712345678), selects MTN or Airtel.
3. **Pay with Mobile Money** calls `marzpay-collect` with `order_id`, `amount` (order total + service fee), `phone_number`, and optional `user_id` if logged in.
4. Frontend subscribes to **Supabase Realtime** for the `payments` row (filter by `reference`). When the webhook updates the row to `completed` or `failed`, the UI updates immediately.
5. On `completed`, user is redirected to `/tickets/:orderId`. Tickets are created by the webhook when MarzPay sends the success callback.

## Realtime

The `payments` table must be in your Supabase Realtime publication so the Payment page can subscribe to status changes:

- **Supabase Dashboard** → **Database** → **Replication** (or **Publications**): ensure `payments` is included in the publication used by Realtime (e.g. `supabase_realtime`).

## Database

- **payments**: one row per MarzPay attempt; `order_id` links to `orders` for ticket orders; `reference` is unique and used for webhook and status polling.
- **orders**: when the webhook receives a successful payment, it sets `orders.status = 'paid'` and `orders.reference` to the payment reference, then runs the same “confirm order + issue tickets” logic (transaction, bookings, `book_tickets_atomic`).

No schema changes are required if you already have `payments.order_id` and nullable `payments.user_id`.
