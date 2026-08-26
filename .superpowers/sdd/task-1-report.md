# Task 1 Report: Quote math (tested)

## What was implemented

Pure TypeScript quote payment-link math in `src/lib/quotePayLink.ts`, with Vitest coverage in `src/tests/quotePayLink.test.ts`.

**Types exported:**
- `ChargeType` — `'full' | 'deposit' | 'custom'`
- `QuoteLineItem` — line row with computed `amount`
- `QuoteCollectGate` — quote state for collect-open gating

**Functions exported:**
- `lineAmount(qty, unitPrice)` — qty × unit price, rounded to 2 decimals via `money()`
- `withLineAmounts(rows)` — maps input rows to `QuoteLineItem[]` with amounts
- `sumLineItems(items)` — sums line amounts with `money()` rounding
- `chargeDisplayAmount(agreedTotal, type, custom?)` — full, 50% deposit, or validated custom charge
- `remainingUgx(agreedTotalUgx, amountPaidUgx)` — non-negative integer remainder
- `nextInvoiceNo(year, lastSeq)` — `DT-Q-{year}-{seq}` with zero-padded 3-digit sequence
- `isQuoteCollectOpen(q)` — gate for whether payment collection is allowed
- `thisCollectUgx(q)` — caps collect amount to remaining balance (exported per brief; not covered by tests)

TDD was followed: test file created first, RED run confirmed missing module, implementation added, GREEN run passed all 5 tests.

## TDD Evidence

### RED — before implementation

**Command:**
```bash
npx vitest run src/tests/quotePayLink.test.ts
```

**Output (excerpt):**
```
 FAIL  src/tests/quotePayLink.test.ts [ src/tests/quotePayLink.test.ts ]
Error: Cannot find module '../lib/quotePayLink' imported from 'C:/Users/user/Desktop/dirt-t-frontend/src/tests/quotePayLink.test.ts'

 Test Files  1 failed (1)
      Tests  no tests
```

Exit code: 1

### GREEN — after implementation

**Command:**
```bash
npx vitest run src/tests/quotePayLink.test.ts
```

**Output (excerpt):**
```
 ✓ src/tests/quotePayLink.test.ts (5 tests) 10ms

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Exit code: 0

## Files changed

| File | Action |
|------|--------|
| `src/tests/quotePayLink.test.ts` | Created — 5 test cases from brief |
| `src/lib/quotePayLink.ts` | Created — full implementation from brief |

No other files modified. No npm packages added. No git commit.

## Self-review findings

1. **Implementation matches brief verbatim** — all exported symbols and logic align with the task specification.
2. **All brief test cases pass** — line totals (162 + 80 = 242), charge modes, remaining UGX, invoice numbering, collect gate scenarios.
3. **`thisCollectUgx` exported but untested** — intentional per brief; caps `collect_amount_ugx` to `remainingUgx(...)`.
4. **Unused import in test file** — `lineAmount` is imported but not referenced in assertions (copied from brief as-is).
5. **Test title vs prefix mismatch** — first test title references `DT-INV-2026-003` but `nextInvoiceNo` produces `DT-Q-` prefix; behavior matches brief, naming is cosmetic only.
6. **Collect gate test gap** — test description mentions "cancelled" but no explicit `cancelled` status assertion; `isQuoteCollectOpen` does block `cancelled` in code.
7. **Mixed rounding strategy** — display amounts use 2-decimal `money()`; UGX remainder uses integer `Math.round`. Consistent with brief; callers should not mix currencies without awareness.
8. **Time-dependent expiry** — `isQuoteCollectOpen` compares `valid_until` to `Date.now()`; tests use `2099-01-01` so stable in practice.
9. **No linter errors** on either file.

## Concerns

- **`thisCollectUgx` has no unit tests** — acceptable for Task 1 per brief, but a later task should add coverage before payment integration.
- **`cancelled` status untested** — logic handles it; adding one assertion would harden the gate.
- **Mojibake in test fixture strings** (`â€"`) — copied verbatim from brief; does not affect math but may look wrong in UI if reused literally.

## Review fixes (Task 1)

**Changes:**
- Added `thisCollectUgx` test (caps collect to remaining UGX)
- Added explicit `isQuoteCollectOpen` assertions for `cancelled`, `draft`, and past `valid_until`
- Removed unused `lineAmount` import
- Replaced mojibake `â€"` with ASCII `-` in fixture strings

**Command:**
```bash
npx vitest run src/tests/quotePayLink.test.ts
```

**Output (excerpt):**
```
 ✓ src/tests/quotePayLink.test.ts (6 tests) 9ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

**Result:** PASS (exit code 0)
