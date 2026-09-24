# Vendor operator agreement — engineering evidence

**Checklist criterion (Category 1):** Non-repudiable digital signatures for high-value tour operator / B2B vendor agreements (Electronic Signatures Act, 2011).

**Assessment date:** 24 September 2026  
**Engineering status:** **Code complete** for versioned, hash-bound acceptance.  
**Checklist Yes/No for ESA:** **Legal decision required** — counsel must say whether clickwrap + SHA-256 + authenticated user binding satisfies the Act for DirtTrails, or whether an advanced/qualified e-sign product is mandatory.

## What code does

- Canonical text: `docs/compliance/VENDOR-OPERATOR-AGREEMENT-2026-09-24.md` / `src/lib/vendorOperatorAgreement.ts`
- SHA-256: `8b9bcf1d07b68811b8f40ebd385ff90c49c513854a87ea35d2d8d3c49b051d49`
- RPC `accept_vendor_operator_agreement` stores vendor_id, user_id, version, hash, timestamp, optional IP/UA
- Vendor portal gate forces acceptance if missing
- Admin cannot approve a vendor (`update_vendor_status_atomic` → `approved`) without current-version acceptance

## What legal must decide

Whether this artifact is “non-repudiable digital signature” under Ugandan law for B2B activation, or N/A / Partial until a certified e-sign flow is procured.
