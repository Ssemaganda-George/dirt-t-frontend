# Home Page — Booking.com Layout & Flow Audit

Audit of `src/pages/Home.tsx` (index `/`) against Booking.com-style **layout, structure, and flow** (not brand colors).  
Related files: `src/components/PublicLayout.tsx`, `src/pages/CategoryPage.tsx`, `src/components/CitySearchInput.tsx`, `src/lib/bookingFlow.ts`.

**Date:** 2025-06-03

---

## Executive summary

The homepage already has a Booking-like **visual shell** (hero search, sticky category tabs, popular destinations, category carousels). The main gaps are **behavior**, **mobile completeness**, and **what happens after Search** — search fields are partly decorative, results stay on the same page in a dense grid, and the richer category/results layout on `CategoryPage` is not used from home.

---

## What already exists (foundation)

| Element | Status | Location |
|--------|--------|----------|
| Full-viewport hero + media carousel | ✅ Present | `Home.tsx` — hero section |
| Multi-field search bar (Where / When / Guests + Search) | ✅ UI only | `Home.tsx` ~lines 723–795 |
| Sticky category tabs below hero | ✅ Present | `Home.tsx` ~lines 799–833 |
| Popular destinations grid | ✅ Present (Explore view only) | `Home.tsx` ~lines 835–875 |
| Category horizontal carousels (default Explore) | ✅ Present | `Home.tsx` ~lines 917–964 |
| Inline search/filter results on same page | ✅ Present | `Home.tsx` ~lines 904–915 |
| Service cards with ratings, save, pricing | ✅ Present | `ServiceCard` in `Home.tsx` |

---

## Critical issues (broken or disconnected)

### 1. Search button does nothing

**Severity:** High  
**File:** `src/pages/Home.tsx` (~786–792)

The hero **Search** button has no `onClick` handler. It does not navigate, scroll to results, or enter an explicit “search mode.” Filtering only occurs because `searchQuery` updates `filteredServices` as the user types.

**Booking.com pattern:** Search is the primary action → navigates to a dedicated results page with filters and sort.

**Fix direction:** Add `handleSearch()` that navigates to e.g. `/category/{slug}?q=...&checkIn=...&checkOut=...&guests=...` based on the active tab.

---

### 2. Date and guests are not used in filtering

**Severity:** High  
**File:** `src/pages/Home.tsx`

State exists:

- `searchDate` (~line 299)
- `guestCount` (~line 300)

`filteredServices` (~569–648) only uses:

- `searchQuery`
- `selectedCategories`
- Service approval / vendor status

**Impact:** “When” and “Guests” in the hero are **decorative** — they do not affect listings or pass through to booking flows.

**Fix direction:** Apply to filters where data supports it; pass via URL `location.state` or query params to `CategoryPage` / `ServiceDetail` / `HotelBooking` (see `buildBookingNavigateState` in `src/lib/bookingFlow.ts`).

---

### 3. Stays need check-in + check-out (and optionally rooms)

**Severity:** High (for hotel/stays parity)  
**File:** `src/pages/Home.tsx`

Hero has a **single** “When” date field. Booking.com and the app’s own `HotelBooking.tsx` use **check-in / check-out** (and often **rooms**).

**Fix direction:** For Stays tab (or `cat_hotels`), show two date fields + room selector; align with `HotelBooking` and `ServiceDetail` sidebar.

---

### 4. Mobile hero search is incomplete

**Severity:** High  
**File:** `src/pages/Home.tsx` (~749, 765)

Date and Guests use `hidden sm:flex` — on small screens users only see **Where** + Search, with no alternative (bottom sheet, expandable row, or full-screen search).

**Fix direction:** Mobile-specific search row or sheet with dates/guests; or tap-to-expand hero search.

---

### 5. “Where” is plain text, not location autocomplete

**Severity:** Medium  
**Files:** `Home.tsx` vs `src/components/CitySearchInput.tsx`

Hero uses a generic `<input>`. `ServiceDetail`, `Login`, `EditProfile`, etc. use **`CitySearchInput`** with `searchCities()` autocomplete.

**Fix direction:** Reuse `CitySearchInput` in the hero “Where” field for structured destinations.

---

### 6. Category tabs don’t align with data or navigation

**Severity:** Medium–High  
**File:** `src/pages/Home.tsx`

| Problem | Detail |
|--------|--------|
| Flights tab shown | Tab bar includes `cat_flights` (~806), but `fetchCategories` **filters out** `cat_flights` (~516). |
| Tabs filter locally only | `handleCategorySelect` updates state; does **not** navigate to `/category/hotels` etc. |
| Richer SRP unused | `CategoryPage.tsx` has sticky search bar, sidebar filters, sort — not used from home tabs. |

**Fix direction:** Tab click → navigate to `/category/{slug}` with query params; hide Flights until category is live in DB.

---

### 7. Search results layout is not Booking.com SRP

**Severity:** Medium (layout/flow goal)  
**File:** `src/pages/Home.tsx` (~905–915)

When searching or filtering by tab, home shows a **6-column thumbnail grid** (`ServiceCard`). Booking.com search results use:

- Sort row (recommended, price, rating)
- Result count
- **Horizontal list rows** (image left, content right)
- Left filter sidebar (exists on `CategoryPage`, not on home)

**Fix direction:** Move post-search UI to `CategoryPage` (or dedicated `/search` route) with list-row component.

---

### 8. Popular destinations don’t carry search context

**Severity:** Medium  
**File:** `src/pages/Home.tsx` (~849–871)

Hardcoded cities link to `/category/{slug}` only — no `location`, `checkIn`, `checkOut`, or `guests` query params.

**Fix direction:** Append hero search state to destination links, or prefill category page from URL.

---

### 9. Duplicate search UX (hero vs header modal)

**Severity:** Medium  
**Files:** `Home.tsx`, `src/components/PublicLayout.tsx` (`GlobalSearchModal`)

Two entry points for search without a single funnel.

**Fix direction:** One primary search on home; header opens same flow or focuses hero; avoid divergent behavior.

---

### 10. Dead or inconsistent code

**Severity:** Low (cleanup)  
**File:** `src/pages/Home.tsx`

| Item | Detail |
|------|--------|
| `isDropdownOpen` | State + click-outside listener (~294, 310–319); **no dropdown UI** in render. |
| Inline `ServiceDetail` | Branch ~660–667 with `selectedService`; navigation uses `navigate('/service/...')` — branch may be unreachable. |
| Label mismatch | Tabs say “Stays”; `categories` state uses “Homes & Stays” for `cat_hotels`. |

**Fix direction:** Remove dead state/branches or implement missing UI.

---

## Missing sections (Booking.com home layout patterns)

These are common Booking **home content blocks** not yet on the index page:

| Section | Purpose |
|--------|---------|
| Search morphs by active tab | Stays → dates + rooms; Flights → from/to; Restaurants → date/time; etc. |
| Deals / featured stays row | Promotional cards with “from X / night” |
| Browse by property type | Chips: hotel, apartment, resort, etc. |
| Recently viewed / continue search | `localStorage` or account-backed history |
| Trending near last searched city | Location-aware row |
| Trust strip | Short horizontal: cancellation, support, reviews |
| Compact sticky search on scroll | Mini search bar after leaving hero |
| Footer promo bands on home | Optional; partial coverage may exist in `PublicLayout` |

**Note:** Default **Explore** view (horizontal category carousels) is closer to **Airbnb / Netflix** discovery than Booking’s “search-first, then browse.” That is a product choice, not necessarily a bug.

---

## Flow comparison

### Your home today

```
Hero + search UI (partially wired)
    → Category tabs (filter locally on /)
    → Popular destinations (static links)
    → Carousels OR 6-col grid on same page
    → /service/:slug (detail)
    → /service/:slug/book/:category (wizard checkout)
```

### Booking.com-style target

```
Hero search (submits with params)
    → SRP: /category/... or /search?... (filters + sort + list rows)
    → Property page (room table + sticky reserve box)
    → Checkout (single page + sticky summary)
    → Confirmation / My trips
```

Gap: home never hands off to **SRP** (`CategoryPage` layout) with committed search params.

---

## Cross-reference: related codebase

| Area | File | Relevance |
|------|------|-----------|
| Category results + filters | `src/pages/CategoryPage.tsx` | Target for hero Search navigation |
| Booking navigate state | `src/lib/bookingFlow.ts` | `buildBookingNavigateState`, drawer vs full page |
| Hotel checkout wizard | `src/pages/HotelBooking.tsx` | Expects check-in/out; 3-step flow |
| Property sidebar | `src/pages/ServiceDetail.tsx` | `CitySearchInput`, date/guest prefill |
| User bookings list | `src/pages/Bookings.tsx` | “My trips” equivalent |
| i18n hero copy | `src/i18n/translations.ts` | `hero_title`, `search_placeholder` |
| Booking UI docs | `BOOKING_PAGES_MASTER_SUMMARY.md` | Confirmation pages already rich |

---

## Recommended fix order (priority)

1. **`handleSearch()`** — wire Search button → `/category/{slug}` with query params.  
2. **Read params in `CategoryPage`** — filter by `q`, `checkIn`, `checkOut`, `guests` where possible.  
3. **Stays:** check-in + check-out (+ rooms) in hero when Stays tab active.  
4. **Wire or remove** `searchDate` / `guestCount` until fully integrated.  
5. **Mobile** — dates/guests accessible on small screens.  
6. **`CitySearchInput`** in hero Where field.  
7. **Hide or implement Flights** tab consistently with DB categories.  
8. **Popular destinations** — pass search context in links.  
9. **Cleanup** — `isDropdownOpen`, unused `ServiceDetail` branch, label consistency.  
10. **Optional:** deals row, property-type chips, recent searches, sticky mini-search.

---

## Out of scope for this audit

- Color palette / brand tokens  
- Legal scraping or copying Booking.com HTML/CSS  
- Backend availability APIs (room-level pricing requires schema support)  
- Map split view on SRP (phase 2)

---

## Tracking

Use this document as a checklist. When an item is fixed, note the PR or commit below.

| # | Issue | Status | PR / commit |
|---|--------|--------|-------------|
| 1 | Search button handler | ⬜ Open | |
| 2 | Date/guests in filter + URL | ⬜ Open | |
| 3 | Check-in / check-out for stays | ⬜ Open | |
| 4 | Mobile search fields | ⬜ Open | |
| 5 | CitySearchInput on hero | ⬜ Open | |
| 6 | Tabs → CategoryPage + flights consistency | ⬜ Open | |
| 7 | SRP layout (list rows, not home grid) | ⬜ Open | |
| 8 | Popular destinations query params | ⬜ Open | |
| 9 | Unify hero vs GlobalSearchModal | ⬜ Open | |
| 10 | Dead code cleanup | ⬜ Open | |
