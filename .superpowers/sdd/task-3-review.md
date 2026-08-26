### Spec Compliance

- ✅ Spec compliant
- ⚠️ Cannot verify from diff: `listQuotes` against live `quotes` table and admin RLS (Task 2 migration file exists in repo but is outside this diff; implementer notes RPCs not applied to live yet). Controller should confirm migration applied on Travel Tails before admin UI integration.
- ⚠️ Cannot verify from diff: restaurant category halt (`restaurants_have_no_payment_links`) surfaces correctly at runtime — enforcement lives in Task 2 SQL, not this client.

### Strengths

- All required exports present with correct signatures: `QuoteRow`, `listQuotes`, `createQuotePayLink`, `getQuotePayPage`, `enableQuoteBalanceLink`, `cancelQuotePayLink`, `publicPayUrl` (`QuoteRepository.ts:114–184`).
- `publicPayUrl` body matches the brief verbatim (`QuoteRepository.ts:181–184`).
- `create_quote_pay_link` RPC call uses all 15 `p_*` arg names matching Task 2 SQL (`QuoteRepository.ts:126–143`; migration `20260826120000_quote_payment_links.sql:77–93`).
- `get_quote_pay_page`, `enable_quote_balance_link`, and `cancel_quote_pay_link` use correct `p_token` / `p_quote_id` params (`QuoteRepository.ts:155, 165, 176`).
- `ChargeType` and `QuoteLineItem` imported from `../lib/quotePayLink`, not redefined (`QuoteRepository.ts:2, 36–37, 59`).
- Empty invoice number normalized to `null` via `emptyToNull` (`QuoteRepository.ts:102–106, 138`).
- Error contract correct: transport errors throw; mutating RPCs throw on `success !== true` via `assertRpcSuccess` (`QuoteRepository.ts:108–112, 144–146, 166–168, 177–178`); `getQuotePayPage` returns `null` on `success !== true` or `error === 'not_found'` (`QuoteRepository.ts:154–159`).
- `listQuotes` select/order matches brief exactly (`QuoteRepository.ts:115–118`).
- `pricing_source?: 'tier' | 'override' | 'quote'` added to `Booking` (`booking.ts:47`).
- Barrel export added (`index.ts:200`).
- Test scope matches brief: only `publicPayUrl` SSR fallback, no Supabase RPC mocks (`quoteRepository.test.ts:234–237`).
- No new npm packages; no commits (per plan).

### Issues

#### Critical (Must Fix)

None.

#### Important (Should Fix)

None.

#### Minor (Nice to Have)

- `getQuotePayPage` returns the raw RPC envelope, so callers receive a `success: true` property not declared on `QuotePayPage` (`QuoteRepository.ts:159`). Strip `success`/`error` before return if Task 5 destructures strictly.
- `QuoteStatus` union duplicates the status literals already on `QuoteCollectGate` in `quotePayLink.ts` (`QuoteRepository.ts:23`). Could import/share later if status types proliferate.
- Post-`assertRpcSuccess` field access uses `as string` / `as number` without runtime guards (`QuoteRepository.ts:148–150, 170–171`). Low risk given SQL contract, but undefined would propagate silently.

### Assessment

**Task quality:** Approved

**Reasoning:** The repository implements every brief requirement with correct RPC wiring, error semantics, and file structure. Code is concise, follows existing repository conventions, and tests cover exactly what the brief mandates. Remaining items are pre-live-integration verification (outside this diff) and minor response-shape polish.
