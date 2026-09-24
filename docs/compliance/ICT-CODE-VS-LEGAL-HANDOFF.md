# ICT checklist — code vs legal handoff

**Date:** 24 September 2026  
**Purpose:** DirtTrails engineering completes everything that can be enforced in product/code. Everything else is routed to legal / finance / leadership / MoUs.

## Already completed in product (engineering)

| Checklist topic | Status | Evidence |
|-----------------|--------|----------|
| Informed consent (unticked + third parties named) | Yes | Privacy/terms checkout + signup; form marked Yes |
| Incident response plan + annual exercise + CERT link | Yes | `INCIDENT-RESPONSE-PLAN.md`, exercise record, Appendix 11A |
| AES-256 / TLS 1.3 / RBAC | Yes | TLS probes + RLS; Appendix 7A |
| 400% resize + keyboard | Yes | Live 320px tests; Appendix 9A |
| Audit logs + access controls | Yes | Login IP fix + `security_change_audit`; Appendix 3A |
| Vendor operator agreement (hash-bound acceptance) | Code complete | Legal must classify under Electronic Signatures Act |
| Booking/order clickwrap terms acceptance | Code done | Needs **legal** ETA recognition letter for Yes |
| Breach incident register + PDPO/CERT evidence fields | Code done | Needs **ops/legal** for notification duty Yes |
| Dependency vulnerability scanning (CI weekly) | Code done | Pen-test still **external** |
| Adult-only signup DOB gate | Code done | Independent ID verification is **external/NIRA** |

## Engineering backlog remaining in repo

| Topic | Notes |
|-------|-------|
| Full WCAG 2.2 AA remediation | Wait for formal audit findings (legal/a11y vendor), then code fixes |
| Advanced/qualified e-sign integration | Only if legal rejects clickwrap+hash for ESA |

## Send to legal / leadership / finance (not code)

1. **Electronic Transactions Act 2011** — validate clickwrap + stored terms version/timestamp as electronic contracts.  
2. **Electronic Signatures Act 2011** — decide if clickwrap+hash is enough for high-value B2B, or require advanced/qualified signatures / e-sign vendor.  
3. **Age / guardian** — confirm adult-only + family-via-adult policy; guardian workflow N/A or required.  
4. **PDPO** — register as data controller/processor; appoint/register DPO; cloud **DPIA**; processor DPAs (Supabase, MarzPay, email).  
5. **Breach notification** — approve staff SOP; legal review of Regulation 33(1) “immediate” vs checklist “48 hours”.  
6. **Tax** — DST 5%, VAT 18%, WHT 15% applicability and remittance.  
7. **NISF leadership** — board/accounting officer cyber-risk ownership statement.  
8. **Pen test** — authorize tester, scope, schedule (CI audit is not a pen test).  
9. **Full WCAG 2.2 AA** — commission formal accessibility audit (engineering can remediate findings).  
10. **NITA-U Conformity Certificate**, Regulatory Compliance Portal filing.  
11. **MoUs** — NIRA e-KYC, URA/EFRIS, UWA permits, DCIC e-Visa, **UGHub** — mark **N/A** unless product needs government data exchange.  
12. **Infra** — SIEM, enterprise IDS/IPS, UPS/RAID redundancy statements from hosting (Vercel/Supabase) vs on-prem wording.  
13. **IT asset register + media sanitization** — operational policy.

## How to brief legal

Attach: this file, current `output/pdf/DirtTrails_ICT_Checklist_Response_2026-09-24.pdf`, and the `docs/compliance/*` evidence packs. Ask them to return Yes/No/N/A per row with any required wording for privacy/terms.
