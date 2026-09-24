# ICT checklist — tech done vs legal remaining

**Platform:** DirtTrails Safaris  
**Checklist:** ICT Technical Review & Compliance Checklist (Ministry of ICT alignment)  
**Assessment date:** 24 September 2026  
**Purpose:** Single handoff document. Explains, row by row, what engineering implemented in the product, and what legal / finance / leadership / external partners must still complete before Ministry submission.

**Evidence pack (attach when briefing legal):**
- This document
- `output/pdf/DirtTrails_ICT_Checklist_Response_2026-09-24.pdf`
- Supporting evidence under `docs/compliance/` (IR plan, TLS probes, a11y tests, audit logs, vendor agreement, etc.)

---

## How to read this document

| Label | Meaning |
|-------|---------|
| **Tech Yes** | Product controls are implemented and evidenced. Form can be marked Yes from an engineering view. |
| **Tech partial** | Engineering delivered what it can; checkbox still needs legal, ops, or an external provider decision. |
| **Legal / external** | Not solvable in application code. Ownership sits with counsel, finance, leadership, or government MoUs. |
| **Usually N/A** | Applies to government data-exchange platforms; DirtTrails is a private marketplace unless you deliberately integrate. |

---

## Category 1 — National ICT policies, laws & regulatory requirements

### 1. Electronic contracts, bookings, and customer agreements (Electronic Transactions Act, 2011)

**Tech status: Partial (implementation done)**

**What tech did:**
- Unticked terms acceptance on booking and ticket payment paths.
- Server-stored terms version (`2026-09-24`), acceptance timestamp, and accepting Auth identity.
- Guest checkout with private sessions; acceptance fields protected from direct tampering.
- Evidence: `termsAcceptance.ts`, `termsVersion.ts`, booking/order migrations, Appendix 1 in the response PDF.

**What legal must do:**
- Issue a written opinion that DirtTrails clickwrap + stored version/timestamp satisfies legal recognition under the Electronic Transactions Act, 2011.
- Approve final Terms of Service wording if not already signed off.
- Then mark the checklist row **Yes** (or state required changes).

---

### 2. Non-repudiable digital signatures for high-value / B2B vendor agreements (Electronic Signatures Act, 2011)

**Tech status: Partial (artifact implemented; legal classification open)**

**What tech did:**
- Versioned Vendor Operator Agreement (`VENDOR-OPERATOR-AGREEMENT-2026-09-24.md`).
- SHA-256 hash of the exact agreement text stored with vendor + authenticated user + timestamp (+ optional IP/UA).
- Vendor portal gate forces acceptance if missing.
- Admin cannot approve a vendor until the current-version acceptance exists.
- Evidence: `vendor_agreement_acceptances`, `accept_vendor_operator_agreement` RPC, `VendorAgreementGate.tsx`, `VENDOR-AGREEMENT-SIGNATURE-2026-09-24.md`.

**What legal must do:**
- Decide whether clickwrap + SHA-256 + Auth binding is enough under the Electronic Signatures Act for DirtTrails B2B activation.
- If not, specify required advanced/qualified e-sign product or process.
- Then mark **Yes**, **No**, or **Partial** with reasoning.

---

### 3. System-level audit logs and access controls (Computer Misuse Act, 2011)

**Tech status: Yes**

**What tech did:**
- Login history now captures IP from `auth.sessions.ip` (previously always null).
- Immutable `security_change_audit` triggers on bookings, orders, payments, transactions, wallets, vendors, profiles.
- Sensitive payout fields and raw payment webhook payloads stripped from audit JSON.
- Admin-only RLS; admin UI at `/admin/security-change-audit`.
- Broader RLS on public tables (prior work).
- Evidence: migration `20260924200000_security_audit_and_vendor_agreement.sql`, `AUDIT-LOGS-2026-09-24.md`, Appendix 3A.

**What legal / ops should still confirm (optional polish):**
- Retention period and who may disclose logs to investigators.
- Does not block marking **Yes** on technical grounds.

---

### 4. 5% Digital Services Tax (DST) registration (Income Tax Act Sec 86A)

**Tech status: Legal / external — not covered in code**

**What tech did:** Nothing tax-registration specific (and should not invent tax logic without finance).

**What legal / finance must do:**
- Determine if DirtTrails is a non-resident entity subject to DST.
- Register / remittance process if applicable.
- Mark **Yes**, **No**, or **N/A**.

---

### 5. 15% Withholding Tax (WHT) on non-resident related digital transactions

**Tech status: Legal / external — not covered in code**

**What legal / finance must do:** Applicability, configuration, remittance. Mark **Yes / No / N/A**.

---

### 6. 18% VAT on electronic supplies to Ugandan consumers (charge + quarterly remit)

**Tech status: Legal / external — not covered in code**

**What legal / finance must do:** VAT registration, pricing display rules, remittance calendar. Mark **Yes / No / N/A**.  
Engineering can implement tax display later **after** finance defines rates and rules.

---

## Category 2 — Cybersecurity (NISF 2026)

### 7. Senior leadership accountability for institutional cyber risk

**Tech status: Legal / leadership — not covered in code**

**What legal / board must do:** Formal ownership statement (Board / Accounting Officer). Mark **Yes** when signed.

---

### 8. Boundary / endpoint protection (enterprise firewalls, IDS/IPS)

**Tech status: Partial (hosted platform controls)**

**What tech relies on:**
- HTTPS / HSTS on Vercel app hosts.
- Supabase / cloud provider network and edge protections.
- Application RLS and Edge Function secrets for money paths.

**What legal / ops must do:**
- Accept provider-managed controls as equivalent for a cloud SaaS marketplace, **or** procure named IDS/IPS and document it.
- Mark **Yes** with hosting evidence letters, or **No** / **Partial**.

---

### 9. SIEM deployed for real-time log analysis across all components

**Tech status: Legal / external — not covered**

**What tech has instead:** Postgres audit tables, provider logs, admin incident register — **not** a SIEM.

**What leadership / security must do:** Procure SIEM or formally accept risk / N/A for current scale.

---

### 10. Regular vulnerability assessments and penetration tests

**Tech status: Partial**

**What tech did:**
- Weekly `npm audit` CI workflow (dependency advisories).
- Record: `VULNERABILITY-ASSESSMENT-2026-09-24.md` (if committed) / CI artifacts.

**What legal / security must do:**
- Authorize and schedule a penetration test (scope, tester, rules of engagement).
- Mark **Yes** only when both recurring assessment **and** pen-test evidence exist (or accept Partial).

---

### 11. Formal Incident Response Plan, tested yearly, linked to National CERT/CC

**Tech status: Yes**

**What tech / ops did:**
- Operational IR plan v1.0 with named roster and CERT/CC + PDPO links.
- Annual tabletop exercise `IR-EX-2026-09-24` recorded.
- Admin incident register with CERT/CC reference fields.
- Evidence: `INCIDENT-RESPONSE-PLAN.md`, `INCIDENT-RESPONSE-EXERCISE-2026-09-24.md`, Appendix 11A.

**What legal should note:** Live CERT/CC and PDPO filings remain human actions through official channels (correct — do not auto-file PII).

---

### 12. Infrastructure redundancy (UPS, dual feeds, RAID) for critical booking/payment databases

**Tech status: Partial (cloud hosting)**

**What tech relies on:** Supabase managed Postgres HA/backups; Vercel multi-region edge for frontend.

**What legal / ops must do:** Obtain provider redundancy/SLA statements and map them to this checklist wording (on-prem UPS/RAID language may not fit 1:1). Mark **Yes / Partial / N/A** with evidence letters.

---

### 13. IT asset register + data sanitization before hardware disposal

**Tech status: Legal / ops — not covered in code**

**What ops must do:** Maintain asset register and wipe procedures (especially if any company-owned devices hold credentials).

---

## Category 3 — Data protection, privacy & information security (DPPA 2019)

### 14. Formal registration as data controller/processor with PDPO (annual renewal)

**Tech status: Legal / external — not covered**

**What legal must do:** File and renew with PDPO. Mark **Yes** when certificate/proof exists.

---

### 15. Designated DPO appointed, qualified, and registered with PDPO

**Tech status: Legal / HR — not covered**

**What legal / HR must do:** Appoint, qualify, register DPO. Current roster uses Platform Administrator as interim privacy contact pending registration.

---

### 16. Informed consent — active affirmative actions; third-party recipients named

**Tech status: Yes**

**What tech did:**
- Unticked privacy acknowledgement on signup paths.
- Unticked terms + privacy on booking/ticket checkout (including guests).
- Notice names vendor, MarzPay (paid bookings only), Supabase (hosting/auth); restaurants not charged.
- Consent recorded with versions and timestamps.
- Evidence: Appendix 4; Privacy Policy sharing section.

**What legal should still review:** Final privacy notice wording and recipient list accuracy (ongoing).

---

### 17. Age verification and parental/guardian consent for under-18 travelers

**Tech status: Partial**

**What tech did:**
- Accounts are adult-only (18+).
- Date of birth + unticked 18+ confirmation on tourist and vendor signup.
- Self-reported DOB checked client/server-side; not stored as full DOB on profile by design of the current flow.
- Policy text: adults may book for family including minors; minors may not create accounts.

**What legal must do:**
- Confirm adult-only + family-via-adult is acceptable under DPPA for DirtTrails.
- Decide if guardian consent workflow is required or **N/A**.
- Decide if self-reported DOB is enough or ID/NIRA verification is required (would need MoU/product work).

---

### 18. Incident tracking that triggers PDPO breach notification within 48 hours

**Tech status: Partial**

**What tech did:**
- Admin-only `data_breach_incidents` register with awareness time, internal 48-hour marker, PDPO Form 7 link, delivery reference fields, CERT/CC fields, immutable event history.
- UI urges **immediate** notification (Regulation 33(1)), not “wait 48 hours”.

**What legal / ops must do:**
- Approve staff SOP and who files Form 7.
- Run and record a dry-run (no live filing) if required for evidence.
- Clarify checklist “48 hours” vs Regulation 33(1) “immediate”.
- Mark **Yes** when protocol is staffed and tested; engineering alone cannot auto-submit to PDPO.

---

### 19. DPIA filed for cloud storage outside Uganda (equivalent protection)

**Tech status: Legal / external — not covered**

**What legal must do:** DPIA for Supabase/AWS-region hosting; file as required. Mark **Yes** when filed.

---

### 20. Technical measures: AES-256 at rest, TLS 1.3 in transit, RBAC

**Tech status: Yes**

**What tech did:**
- Live TLS 1.3 probes on `bookings.dirt-trails.com`, `www.dirt-trails.com`, and Supabase API.
- AES-256 at rest per Supabase published security controls.
- RLS on all public tables; role-based policies (tourist / vendor / admin).
- Evidence: `TECHNICAL-SECURITY-CONTROLS-2026-09-24.md`, `evidence/tls-probe-2026-09-24.json`, Appendix 7A.

---

### 21. Third-party processor agreements enforcing DPPA on sub-contractors

**Tech status: Legal / external — not covered**

**What legal must do:** Execute / obtain DPAs with Supabase, MarzPay, email provider, and any other processors. Mark **Yes** when signed.

---

## Category 4 — Digital service standards, accessibility & interoperability

### 22. Full WCAG 2.0/2.2 AA (screen reader, contrast, etc.)

**Tech status: Partial / No for full AA**

**What tech did:**
- Skip-to-content, named nav landmark, focus styles, native controls on key mobile nav.
- Not a full AA conformance claim.

**What legal / accessibility must do:**
- Commission a formal WCAG audit.
- Engineering remediates findings afterward.
- Mark **Yes** only after audit pass (or Partial with remediations tracked).

---

### 23. Up to 400% text resizing and full keyboard operability

**Tech status: Yes**

**What tech did:**
- Production tests at 320 CSS px width (400% of 1280 reference) on home, tours, sample service, privacy.
- Skip link → main content; named keyboard focusables verified.
- Evidence: `A11Y-400-KEYBOARD-2026-09-24.md`, Appendix 9A.

**Limit (documented):** Full WCAG AA remains separate; empty checkout without an order is not a form surface.

---

### 24. APIs aligned with e-GIF (standardized XML or JSON)

**Tech status: Partial / usually N/A until a government exchange exists**

**What tech has:** JSON/REST via Supabase and Edge Functions.

**What legal / NITA engagement must do:**
- If no government data exchange is planned: mark **N/A** with applicability note.
- If exchange is planned: agree Technical Interoperability Agreement and schemas with the receiving entity.

---

### 25. Integration with UGHub (WSO2) for real-time federated exchange

**Tech status: No — usually N/A**

**What tech did:** No UGHub client or gateway config exists (by design for a private marketplace).

**What legal / leadership must do:** Mark **N/A** unless DirtTrails formally requests UGHub onboarding.

---

### 26. Central API gateway controls (OAuth 2.0, rate limits, centralized logging) via UGHub

**Tech status: No — usually N/A**

Same as above. Supabase Auth ≠ UGHub gateway. Mark **N/A** unless UGHub is adopted.

---

## Category 5 — Administrative approvals, registrations & collaboration permissions

### 27. NITA-U Conformity Certificate (Level 1/2/3)

**Tech status: Legal / external — not covered**

**What must be done:** Apply via NITA-U process; attach certificate when granted.

---

### 28. MoU/SLA with NIRA for real-time e-KYC NIN checks

**Tech status: Usually N/A** (unless product requires NIN verification)

**What legal must do:** Mark **N/A** or pursue MoU if age/KYC strategy requires NIRA.

---

### 29. MoU with URA for TIN checks and EFRIS invoicing

**Tech status: Usually N/A** (unless tax automation is required)

**What finance / legal must do:** Mark **N/A** or pursue integration after tax model is fixed.

---

### 30. Data-sharing SLA with UWA for gorilla/park permits

**Tech status: Usually N/A**

Mark **N/A** unless DirtTrails automates UWA permits.

---

### 31. Linkage with DCIC for e-Visa status checks

**Tech status: Usually N/A**

Mark **N/A** unless international guest visa checks become a product feature.

---

### 32. Legal and privacy documents verified via NITA-U Regulatory Compliance Portal

**Tech status: Legal / admin — not covered**

**What legal must do:** Submit/verify documents at compliance.nita.go.ug when ready.

---

## Summary tables

### Tech-side Yes (ready from engineering)

1. Audit logs and access controls  
2. Incident Response Plan + yearly exercise + CERT linkage  
3. Informed consent mechanisms  
4. AES-256 / TLS 1.3 / RBAC  
5. 400% text resize + keyboard operability  

### Tech partial — legal or ops still own the final Yes

| Item | Engineering delivered | Legal / ops still need |
|------|----------------------|-------------------------|
| Electronic contracts (ETA) | Clickwrap + stored acceptance | Legal recognition opinion |
| Digital signatures (ESA) | Hash-bound vendor agreement | ESA classification |
| Age / guardian | Adult-only DOB gate | Policy / ID / guardian decision |
| PDPO breach notification | Incident register + Form 7 fields | Staffed SOP + filing practice |
| Vuln + pen test | Dependency CI audit | Authorized pen test |
| Firewalls / IDS / redundancy | Cloud provider stack | Accept provider evidence or procure more |
| Full WCAG AA | Partial a11y hardening | Formal audit + remediations |
| e-GIF | JSON APIs | N/A or government TIA |

### Legal / finance / leadership only (no product Yes yet)

- DST, WHT, VAT  
- PDPO registration, DPO, DPIA, processor DPAs  
- Leadership cyber-risk ownership  
- SIEM  
- IT asset register / media wipe  
- NITA Conformity Certificate  
- NITA compliance portal verification  
- NIRA / URA / UWA / DCIC / UGHub (usually **N/A**)  

---

## Suggested next actions for legal

1. Read this file + the response PDF appendices.  
2. For each **Legal / external** and **Tech partial** row, return: **Yes / No / N/A** + one-line rationale.  
3. Especially prioritize: ETA opinion, ESA opinion on vendor hash acceptance, PDPO registration path, tax applicability, and N/A confirmations for UGHub and MoUs.  
4. Return any required privacy/terms wording changes to engineering for a follow-up patch.

---

## Related engineering documents

| File | Topic |
|------|--------|
| `ICT-CODE-VS-LEGAL-HANDOFF.md` | Short handoff list |
| `INCIDENT-RESPONSE-PLAN.md` | IR plan |
| `INCIDENT-RESPONSE-EXERCISE-2026-09-24.md` | Annual IR exercise |
| `TECHNICAL-SECURITY-CONTROLS-2026-09-24.md` | Encryption / TLS / RBAC |
| `A11Y-400-KEYBOARD-2026-09-24.md` | 400% + keyboard |
| `AUDIT-LOGS-2026-09-24.md` | Fraud audit trail |
| `VENDOR-AGREEMENT-SIGNATURE-2026-09-24.md` | Vendor agreement hashing |
| `VENDOR-OPERATOR-AGREEMENT-2026-09-24.md` | Agreement text |
| `evidence/tls-probe-2026-09-24.json` | TLS probe results |
| `evidence/a11y-reflow-keyboard-2026-09-24.json` | Accessibility probe results |
