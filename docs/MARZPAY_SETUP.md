# MarzPay payment integration

This project uses **MarzPay** for **Mobile Money** (MTN / Airtel) and **card** (Visa / Mastercard) payments. The flow is implemented with three Supabase Edge Functions and checkout pages in the frontend.

## Payment methods

| Method | API | Customer experience |
|--------|-----|---------------------|
| Mobile money (default) | `POST /collect-money` with `phone_number` | USSD prompt on phone; UI polls until complete |
| Card | `POST /collect-money` with `method: "card"` (no phone) | Redirect to MarzPay hosted checkout; return URL polls until complete |

Card collections require an active **Card Payments** subscription on the MarzPay business account.

## Edge Functions

| Function | Purpose |
|----------|---------|
| `marzpay-collect` | Initiates a payment: validates input, calls MarzPay collect-money API, stores a row in `payments`, returns reference (MoMo) or `redirect_url` (card). |
| `marzpay-webhook` | Receives MarzPay callbacks: updates `payments`, and when status is `completed` updates `orders`, creates transaction, bookings, and tickets. |
| `marzpay-payment-status` | Returns payment status by `reference` (used by the frontend to poll until completed/failed). |

## Environment variables (Supabase Edge Functions)

Set these in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or via CLI):

| Variable | Required | Description |
|----------|----------|-------------|
| `MARZPAY_API_CREDENTIALS` | Yes | Base64-encoded MarzPay API credentials (e.g. from MarzPay dashboard). |
| `MARZPAY_API_URL` | No | Default: `https://wallet.wearemarz.com/api/v1` |
| `APP_URL` or `FRONTEND_URL` | Yes (card) | Frontend base URL for card return redirects (e.g. `https://bookings.dirt-trails.com`). |
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

### Ticket checkout (Checkout page)

1. User selects **Mobile Money** or **Debit/credit card**.
2. **Mobile Money:** enter phone, pay on page, Realtime + poll until complete.
3. **Card:** collect returns `redirect_url` → browser redirects to MarzPay → after payment, MarzPay returns to `/checkout/:orderId/payment?reference=...` → existing reference watcher completes → tickets.

### Legacy Payment page

1. User is on **Checkout** → enters buyer details → **Next** goes to **Payment** (`/checkout/:orderId/payment`).
2. On **Payment**, user selects Mobile Money, enters phone number (e.g. 0712345678 or +256712345678), selects MTN or Airtel.
3. **Pay with Mobile Money** calls `marzpay-collect` with `order_id`, `amount` (order total + service fee), `phone_number`, and optional `user_id` if logged in.
4. Frontend subscribes to **Supabase Realtime** for the `payments` row (filter by `reference`). When the webhook updates the row to `completed` or `failed`, the UI updates immediately.
5. On `completed`, user is redirected to `/tickets/:orderId`. Tickets are created by the webhook when MarzPay sends the success callback.

### Card return URL

For card payments, `marzpay-collect` sets MarzPay `callback_url` to:

```
{APP_URL}/checkout/{orderId}/payment?reference={reference}
```

The Payment page already watches `?reference=` for donation flows; the same watcher handles card returns.

## Realtime

The `payments` table must be in your Supabase Realtime publication so the Payment page can subscribe to status changes:

- **Supabase Dashboard** → **Database** → **Replication** (or **Publications**): ensure `payments` is included in the publication used by Realtime (e.g. `supabase_realtime`).

## Database

- **payments**: one row per MarzPay attempt; `order_id` links to `orders` for ticket orders; `reference` is unique; `provider` is `mtn`, `airtel`, or `card`; `phone_number` is null for card.
- **orders**: when the webhook receives a successful payment, it sets `orders.status = 'paid'` and `orders.reference` to the payment reference, then runs the same “confirm order + issue tickets” logic (transaction, bookings, `book_tickets_atomic`).

No schema changes are required if you already have `payments.order_id` and nullable `payments.user_id`.
