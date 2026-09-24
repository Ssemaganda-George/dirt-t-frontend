# DirtTrails ICT checklist — what the product already does, and what legal still needs to finish

**Company:** DirtTrails Safaris  
**Document for:** Legal, finance, and leadership (non-technical)  
**Date:** 24 September 2026  
**About this checklist:** Uganda Ministry of ICT–aligned technical review form covering contracts, security, privacy, accessibility, and government registrations.

**Please attach when you brief counsel:**
- This document  
- The filled response PDF: `output/pdf/DirtTrails_ICT_Checklist_Response_2026-09-24.pdf`  
- Any certificates or letters legal later obtains (PDPO, tax, NITA, MoUs)

---

## How to use this document

For each checklist question we say:

1. **What the system already does** — in everyday language (what a traveler, vendor, or admin experiences).  
2. **What is still needed** — almost always a legal opinion, registration, policy, or government process — not more software.  
3. **Suggested mark** — Yes / Partial / No / N/A from an engineering view.

---

## Snapshot for busy readers

### Already in good shape on the product side (can mark Yes from tech)

The live booking platform already:

- Records who agreed to terms and privacy (with a clear unticked checkbox, not a pre-ticked box).  
- Keeps a security trail of important changes (bookings, payments, wallets, vendor status, etc.) and login IPs.  
- Has a written incident response plan that was practiced once (tabletop exercise), with links to Uganda CERT and PDPO forms.  
- Encrypts data the way modern cloud hosts do, uses strong HTTPS (TLS 1.3), and limits who can see what by role (traveler / vendor / admin).  
- Works with larger text / zoom and keyboard navigation on the main public pages we tested.

### Built in the product, but legal must still “sign off” the checkbox

- Electronic bookings/contracts (tech records the agreement; **legal** must say Ugandan law accepts that style of online agreement).  
- Vendor “signature” of the operator agreement (tech stores a sealed copy of exactly what they accepted; **legal** must say if that counts as a digital signature under the Act).  
- Adult-only accounts (tech blocks under-18 signups by date of birth; **legal** must confirm that policy and whether guardian flows or ID checks are required).  
- Data-breach register (tech tracks incidents and reminds staff to notify PDPO; **people** must still file the official form).  
- Security scans of software libraries (automated weekly); a full **penetration test** by an authorized tester is still outstanding.  
- Cloud firewalls and backups (we use reputable hosts; **ops/legal** may need letters that match the checklist’s “UPS / RAID” wording).

### Not a software job — legal, finance, or leadership own these

Tax (DST, VAT, withholding), PDPO registration, appointing a Data Protection Officer, cloud privacy impact assessment (DPIA), contracts with Supabase/MarzPay as data processors, board ownership of cyber risk, SIEM tooling, IT asset lists, NITA certificates, and government MoUs (NIRA, URA, UWA, immigration, UGHub). Many MoU rows are likely **N/A** for a private travel marketplace unless you choose to integrate.

---

## Category 1 — Laws on electronic deals, signatures, fraud logs, and tax

### 1. Are online bookings and customer agreements legally valid electronic contracts?

**What the system already does**  
When someone books a hotel, tour, transport, event, activity, or buys tickets, they must actively tick agreement to the Terms (the box starts empty). The system stores:

- which version of the Terms they saw,  
- the exact time they accepted, and  
- which account (or guest session) accepted.

Restaurant reservations follow the same idea for rules that apply, without taking payment.

**What legal still needs to do**  
Confirm in writing that this click-to-agree method is recognized under Uganda’s Electronic Transactions Act, 2011, and that the Terms text is approved.

**Suggested mark after legal sign-off:** Yes (today: Partial until that opinion exists).

---

### 2. Do high-value / B2B vendor agreements use non-repudiable digital signatures?

**What the system already does**  
Vendors must accept a specific **Vendor Operator Agreement**. The system:

- shows them the exact agreement text,  
- stores a digital “fingerprint” (hash) of that text so nobody can quietly change what was agreed later,  
- links the acceptance to the vendor’s logged-in identity and time,  
- blocks admin approval of the vendor until that acceptance is on file,  
- stops vendors from using the portal without accepting (if they somehow skipped it).

This is stronger than a casual checkbox, but it is **not** a government e-sign certificate product unless legal asks for one.

**What legal still needs to do**  
Decide whether this sealed acceptance meets the Electronic Signatures Act, 2011 for DirtTrails, or whether you must buy a specialized e-sign solution.

**Suggested mark:** Partial until legal decides; then Yes / No / Partial with their wording.

---

### 3. Does the platform keep audit logs and access controls to deter and trace fraud?

**What the system already does**  
- Remembers recent logins and (going forward) the IP address used.  
- Automatically records a change history when bookings, orders, payments, wallet balances, vendor records, or user profiles are created, changed, or deleted.  
- Sensitive payment dumps and bank payout details are not dumped raw into that history.  
- Only admins can open the security change log in the admin panel.  
- Travellers and vendors only see their own data; money settlement is not left to the public website alone.

**What legal / ops may still polish**  
How long to keep logs and who may share them with investigators. That does not block a technical **Yes**.

**Suggested mark:** Yes.

---

### 4–6. Digital Services Tax (5%), Withholding Tax (15%), VAT (18%)

**What the system already does**  
Takes and records **payments for paid bookings** via MarzPay (mobile money). It does **not** itself register DirtTrails for tax or auto-remit DST/VAT/WHT to URA.

**What finance / legal must do**  
Decide if each tax applies, register if needed, and set remittance. Engineering can later show tax on invoices **after** you define the rules.

**Suggested mark:** Yes / No / N/A — finance decision only.

---

## Category 2 — Cybersecurity

### 7. Does senior leadership formally own cyber risk?

**What the system already does**  
Nothing that replaces a board / accounting-officer policy.

**What leadership / legal must do**  
Sign a short ownership statement. Mark **Yes** when signed.

---

### 8. Firewalls and intrusion detection / prevention

**What the system already does**  
Runs on modern cloud hosts (website and database). Traffic to the site uses HTTPS with long-term browser security headers. The app also enforces “who can see what” inside the database.

**What legal / ops must do**  
Either accept “cloud provider protections + our access rules” as meeting this row for a SaaS marketplace (ideally with a short letter from / about the hosts), or buy named enterprise IDS/IPS and document it.

**Suggested mark:** Partial until that acceptance or purchase is recorded.

---

### 9. Is a SIEM (security monitoring cockpit) in place?

**What the system already does**  
Keeps important logs and an incident register. That is **not** a full SIEM product watching everything in real time.

**What leadership must do**  
Buy SIEM later, or formally accept risk / N/A at current size.

**Suggested mark:** No (or N/A with written risk acceptance).

---

### 10. Regular vulnerability assessments and penetration tests

**What the system already does**  
Automatically checks software libraries for known security advisories on a weekly schedule.

**What security / legal must do**  
Hire and schedule a proper penetration test (with written scope). Library scanning alone is not a full pen test.

**Suggested mark:** Partial until pen test is done (or Yes if you accept Partial for now).

---

### 11. Incident Response Plan, tested yearly, linked to National CERT

**What the system / ops already does**  
- Written playbook: who leads, how to contain, how to report.  
- Practiced once in a tabletop exercise (no live fake report to regulators during the exercise).  
- Admin screen to log personal-data incidents, with links to CERT and PDPO forms, and fields to store the filing reference after staff submit.

**What legal should note**  
Humans still submit CERT/PDPO forms through official websites — the app does not send traveler data to those forms automatically (by design).

**Suggested mark:** Yes.

---

### 12. Redundant power / dual feeds / RAID for payment databases

**What the system relies on**  
A managed cloud database and hosting provider (backups and provider-side resilience), not DirtTrails-owned server rooms with UPS units.

**What legal / ops must do**  
Get provider SLA / reliability wording and map it to this checklist, or mark Partial / N/A with explanation that you are cloud-hosted.

**Suggested mark:** Partial (cloud) until ops attaches provider evidence.

---

### 13. IT asset register and wiping devices before disposal

**What the system already does**  
Not applicable inside the booking app.

**What ops must do**  
Keep a list of company devices and wipe rules for phones/laptops that held passwords.

**Suggested mark:** No until the policy exists; then Yes.

---

## Category 3 — Privacy and data protection

### 14–15. PDPO registration and a registered Data Protection Officer

**What the system already does**  
Processes bookings and accounts; does not file PDPO paperwork for you.

**What legal / HR must do**  
Register DirtTrails with PDPO; appoint and register a DPO. Until then the platform admin is only an interim privacy contact.

**Suggested mark:** No until filings are done.

---

### 16. Informed consent (active tick boxes; third parties named)

**What the system already does**  
- Signup and checkout use **empty** checkboxes people must tick themselves.  
- Privacy text names who else may receive data: the **service vendor**, **MarzPay** for paid bookings, and **Supabase** for hosting and login. Restaurant bookings are not charged through MarzPay.  
- The system stores that the person consented and which notice version they saw.

**What legal should still do**  
Spot-check that the published Privacy Policy matches reality.

**Suggested mark:** Yes.

---

### 17. Age checks and guardian consent for under-18s

**What the system already does**  
- Only adults (18+) may create accounts.  
- Signup asks for date of birth and an unticked “I am 18+” confirmation.  
- Policy: an adult may book a trip that includes children; children may not open their own accounts.  
- This is **self-declared** age, not a national ID check.

**What legal must do**  
Confirm this adult-only model is enough, or require guardian workflows / ID (e.g. NIRA) — which would be a new project.

**Suggested mark:** Partial until legal confirms Yes / N/A / further requirements.

---

### 18. Breach tracking and PDPO notice within 48 hours

**What the system already does**  
Admins can open a breach case with the time they learned of it, a summary, deadlines, and space to paste the PDPO (and CERT) reference **after** filing. The screen tells staff to notify **immediately**, not to wait out the clock.

**What legal / ops must do**  
Name who files Form 7, practice the steps, and keep proof. The website cannot submit to PDPO by itself.

**Suggested mark:** Partial until the human procedure is approved and tested.

---

### 19. Privacy impact assessment (DPIA) for cloud hosting outside Uganda

**What the system already does**  
Data is hosted on a cloud database/auth provider (region chosen at project setup).

**What legal must do**  
Complete and file the DPIA showing equivalent protection.

**Suggested mark:** No until filed.

---

### 20. Encryption, secure connections, and role-based access

**What the system already does**  
- Public site and API connections use modern HTTPS (including TLS 1.3 verified on live hosts).  
- Host encrypts stored customer data (AES-256 per provider security commitments).  
- Access is split by role: travelers see their trips; vendors see their business; admins see operations; wallets and settlement are tightly controlled.

**Suggested mark:** Yes.

---

### 21. Contracts with third-party processors (Supabase, MarzPay, email, etc.)

**What the system already does**  
Uses those vendors technically.

**What legal must do**  
Sign data-processing / confidentiality agreements that meet DPPA.

**Suggested mark:** No until DPAs are signed.

---

## Category 4 — Accessibility and government system links

### 22. Full WCAG accessibility (screen readers, contrast, full AA)

**What the system already does**  
Basic accessibility: skip-to-content, clearer focus outlines, proper buttons on key mobile navigation. This is **not** a full WCAG AA certificate.

**What must still happen**  
Commission a formal accessibility audit; engineering will fix what the audit finds.

**Suggested mark:** No / Partial until audit passes.

---

### 23. Large text (about 400% zoom) and keyboard-only use

**What the system already does**  
We tested the live site at a very narrow width (same idea as strong zoom). Main pages reflow without forcing sideways scrolling; keyboard users can skip to main content and tab through named controls (search, categories, account, cart).

**Suggested mark:** Yes.

---

### 24–26. Government interoperability (e-GIF) and UGHub

**What the system already does**  
Uses normal modern web APIs (JSON) for DirtTrails’ own app. It is **not** plugged into UGHub or a government data highway.

**What legal / leadership must do**  
Unless you plan government data exchange, mark these **N/A** with a short note: private marketplace, no federated government exchange. If you do plan it, that becomes a separate project and MoU.

**Suggested mark:** N/A (recommended) or No if the auditor insists without N/A.

---

## Category 5 — Certificates and government MoUs

### 27. NITA-U Conformity Certificate

**Not a product feature.** Apply through NITA-U. Mark Yes when you have the certificate.

### 28–31. MoUs with NIRA, URA, UWA, DCIC (IDs, tax invoices, park permits, e-visas)

**What the system already does**  
Books travel services between travelers and vendors. It does **not** currently pull national IDs, URA EFRIS, UWA permits, or immigration e-visa status in real time.

**Recommended approach:** Mark **N/A** unless leadership chooses to build those integrations. Chasing MoUs “just for the form” without a product need creates cost and delay.

### 32. Legal/privacy docs verified on NITA compliance portal

**Admin / legal filing** at compliance.nita.go.ug when documents are ready. Not done by the booking app.

---

## What we recommend you ask legal to return

For each row above that is not already **Tech Yes**, please return:

| Checklist row | Their answer (Yes / No / Partial / N/A) | One-sentence reason | Any wording change needed in Privacy/Terms |
|---------------|----------------------------------------|---------------------|--------------------------------------------|

**Highest priority for them:**
1. Electronic Transactions Act opinion on click-to-agree bookings.  
2. Electronic Signatures Act opinion on the vendor sealed agreement.  
3. PDPO registration + DPO path.  
4. Tax applicability (DST / VAT / WHT).  
5. Confirm **N/A** (or not) for UGHub and MoUs.  
6. Approve breach-notification staffing SOP.

Engineering can implement follow-ups (tax display, e-sign vendor, NIRA checks, etc.) **after** those decisions.

---

## Plain-language glossary

| Term | Meaning |
|------|---------|
| Clickwrap / unticked box | User must actively tick “I agree”; nothing is pre-ticked. |
| Hash / sealed fingerprint | A unique code of the exact agreement text so later edits are detectable. |
| RLS / roles | Database rules so each user type only sees allowed data. |
| MarzPay | Payment partner for mobile money on **paid** bookings (not restaurant reservations). |
| Supabase | Cloud host for login accounts and booking database. |
| PDPO | Uganda Personal Data Protection Office. |
| CERT | Uganda national cyber incident reporting channel. |
| UGHub | Government integration platform — only relevant if DirtTrails exchanges data with government systems. |

---

*End of handoff. This is the single document for non-technical briefing of legal and leadership.*
