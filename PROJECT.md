# DirtTrails — Project Description

**DirtTrails** is a tourism and travel booking platform that connects travelers with local businesses: hotels, restaurants, transport, tours, activities, events, shops, and flights. The app serves three audiences—**tourists** (travelers), **vendors** (businesses), and **platform **admins**—through a single React frontend with role-based routing and Supabase as the backend.

---

## Overview

- **Product name:** DirtTrails (frontend package: `dirttrails-admin`)
- **Purpose:** Browse, book, and pay for travel services; manage listings and bookings (vendors); oversee platform, finances, and content (admins).
- **Deployment:** Public booking site (e.g. `bookings.dirt-trails.com`); admin and vendor areas are protected by role.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | React 18, TypeScript |
| **Build** | Vite 4 |
| **Routing** | React Router v7 |
| **Data & state** | TanStack React Query, React Context (Auth, Booking, Cart, Preferences) |
| **Backend / DB** | Supabase (PostgreSQL, Auth, RPC, storage) |
| **Styling** | Tailwind CSS |
| **Maps** | Leaflet, react-leaflet |
| **Payments** | MarzPay (wallet API) — configured via `MARZPAY_*` env vars |
| **PDF / export** | html2canvas, html2pdf.js |
| **QR** | qrcode, qr-scanner (tickets, event check-in) |
| **i18n** | Centralized translations (en, pt, fr) in `src/i18n/translations.ts` |

---

## User Roles

1. **Tourist** — Browse services, book, pay, view bookings/tickets, save favorites, manage profile and preferences.
2. **Vendor** — Business dashboard: services, bookings, events, tickets, availability, messages, inquiries, transactions, visitor activity, profile, settings.
3. **Admin** — Platform dashboard: businesses, tourists, services (by category), all booking types, tickets, partnerships, wallets, DirtTrails wallet, finance, hero video, visitor activity, reviews, messages, settings.

---

## Service Categories

The platform supports multiple service types, each with category-specific fields (e.g. hotels: room types, check-in/out; transport: vehicle type, pickup/dropoff; events: ticket types, scan check-in):

- **Activities / Events** — Activities and events with optional internal ticketing and QR scan.
- **Hotels** — Accommodation (homes & stays).
- **Restaurants** — Dining, reservations, menus.
- **Shops** — Retail, pickup, delivery.
- **Tours** — Tour packages, itineraries, guides.
- **Transport** — Vehicles, routes, pickup/dropoff, driver options.
- **Flights** — Flight listings (economy/business/first, seats, amenities).

Admin has dedicated service and booking sub-pages per category (e.g. `services/activities`, `bookings/hotels`).

---

## Main Features

### Public / Tourist

- **Home** — Hero, categories, featured services, search, category-based copy.
- **Services** — Browse by category (`/category/:category`), service detail (`/service/:slug`), booking flow (`/service/:slug/book/:category`), inquiries.
- **Vendor profile** — Public vendor page (`/vendor/:vendorId`).
- **Booking & payments** — Checkout (`/checkout/:orderId`), payment (`/checkout/:orderId/payment`), booking detail, guest and logged-in bookings.
- **Tickets** — Ticket receipt (`/tickets/:orderId`), verify ticket (`/verify-ticket/:ticketCode`), event scan (`/scan/:id`), request OTP.
- **User account** — Profile, bookings, saved items, settings, edit profile (protected).
- **Support** — Help center, contact, safety, terms, travel insurance, visa processing, internet connectivity, refer business, referral form, hospitality class.
- **Partner** — Partner-with-us and vendor login entry points.

### Vendor

- Dashboard, profile, settings.
- Services CRUD and management.
- Events and internal ticketing.
- Bookings, availability, tickets, messages, inquiries.
- Transactions and visitor activity.

### Admin

- Dashboard, profile, settings.
- Businesses, tourists (user management).
- Services per category (activities, hotels, restaurants, shops, tours, transport).
- Bookings (global and per type: events, flights, hotels, restaurants, shops, tours, transport).
- Tickets, partnerships, activation requests.
- Wallets (vendor wallets), DirtTrails wallet, finance.
- Hero video manager, visitor activity, reviews, messages (including vendor messages).

---

## Key Integrations

- **Supabase** — Auth, database, RPC (e.g. `update_wallet_balance_atomic` for wallet credits), storage. Uses anon key in the client; service role and URLs in env for server/backend use.
- **MarzPay** — Payment/wallet API; webhook URL points to Supabase Edge Function; credentials and base URL in `.env`.
- **App URL** — `NEXT_PUBLIC_APP_URL` / `APP_URL` for redirects and callbacks (e.g. bookings app URL, ngrok for dev).

---

## Project Structure (high level)

```
dirt-t-frontend/
├── src/
│   ├── App.tsx              # Routes, lazy-loaded pages, role-based layout
│   ├── main.tsx             # React + QueryClientProvider
│   ├── components/          # Layout (Layout, PublicLayout, VendorLayout), UI, receipts, carousels
│   ├── contexts/            # Auth, Booking, Cart, Preferences
│   ├── hooks/               # useServiceDetailQuery, useOrderQuery, hook (useServices etc.)
│   ├── i18n/                # translations (en, pt, fr)
│   ├── lib/                 # database, supabaseClient, utils, creditWallet, cache, cities, etc.
│   ├── pages/               # All route targets (Home, admin/*, vendor/*, public pages)
│   ├── store/               # vendorStore
│   └── types/               # Shared TypeScript types (User, Service, Booking, etc.)
├── .env                     # Supabase, MarzPay, app URLs (do not commit secrets)
├── package.json
└── PROJECT.md               # This file
```

---

## Scripts (package.json)

- `npm run dev` — Vite dev server.
- `npm run build` — `tsc && vite build`.
- `npm run preview` / `npm run start` — Preview production build.
- `npm run lint` — ESLint (TypeScript/TSX).
- `npm run migration` — Run migrations via `run_migration.cjs`.
- `npm run migrate` — Apply migrations script (`scripts/apply_migrations.sh`).

---

## Environment Variables (summary)

- **Supabase:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client); `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server/backend).
- **MarzPay:** `MARZPAY_API_CREDENTIALS`, `MARZPAY_API_URL`.
- **App URLs:** `NEXT_PUBLIC_APP_URL`, `APP_URL`.
- Optional: `VITE_VENDOR_EMAIL_ENDPOINT` for vendor signup emails.

---

## Notes

- The app is mobile-friendly (viewport meta, touch targets).
- Lazy loading and route preloading are used for better performance.
- Visitor tracking and analytics hooks exist (e.g. `AppVisitorTracker`).
- Reviews support KPI ratings and moderation (pending/approved/rejected).
- Wallet operations use atomic RPC to avoid race conditions.
