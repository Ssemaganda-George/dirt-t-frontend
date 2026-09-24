# Incident response tabletop exercise

**Exercise ID:** IR-EX-2026-09-24  
**Date:** 24 September 2026  
**Duration:** ~45 minutes (tabletop)  
**Type:** Simulated incident — **no live PDPO or CERT/CC filing**  
**Plan version exercised:** Incident Response Plan v1.0  
**Facilitator / Incident lead:** Platform Administrator (safaris.dirttrails@gmail.com)  
**Participants:** Platform Administrator (incident lead + communications), Engineering on-call (same desk for this exercise), Privacy contact (same desk)  

## Scenario

Suspected public read access to traveler inquiry contact details while guest checkout remains active. Detection cue: compliance/security review finds inquiry-related tables readable by the anonymous API role.

## Timeline (exercise clock)

| Step | Decision / action |
|------|-------------------|
| T+0 | Awareness recorded. Severity: **High** (possible personal data exposure). Incident lead assigned. |
| T+5 | Evidence preserved: note affected tables, policy names, and that guest checkout must stay available. No personal data copied into chat. |
| T+15 | Containment: restrict public SELECT/UPDATE/DELETE on stored inquiry records; keep public INSERT for website forms only. Confirm booking/payment paths untouched. |
| T+25 | Impact assessment: contact-detail fields potentially exposed via anonymous reads; booking, payment, wallet, and ledger flows not in scope of this defect. |
| T+35 | Reporting decision: If this were a confirmed live breach with affected persons, prepare **PDPO Form 7 immediately** and evaluate **CERT/CC** report without including PII. For this exercise, decision path was walked; **no live regulator submission**. |
| T+45 | Recovery checks: admin can still read inquiries; anonymous cannot list stored records; public form submit still works. Close exercise with corrective actions. |

## Reporting protocol linkage (tested without live send)

1. Open admin incident register (`/admin/data-breach-incidents`).  
2. Draft would include awareness time, summary without PII dump, and internal 48-hour marker.  
3. PDPO path: Form 7 URL recorded in plan and admin UI.  
4. CERT/CC path: https://cert.ug/form/reporter-s-contact-information — admin UI fields for `cert_reported_at` / `cert_reference` after real delivery.  
5. Exercise rule: do not submit live forms; confirm the team knows who submits and where proof is stored.

## Outcome

- Plan steps for triage, containment, evidence, and regulator pathways were exercised successfully.  
- Corrective action already applied in production migrations restricting inquiry-record exposure (`20260924180000_restrict_inquiry_records.sql`).  
- Open actions: (1) appoint a named deputy when a second operator is available; (2) complete PDPO data-controller / DPO registration as a separate checklist item; (3) schedule next annual exercise by 24 September 2027.

## Approval

Platform leadership accepts this exercise record as the **2026 annual IR test** under NISF-aligned checklist Category 2 (Incident Response Plan).  

**Result:** Pass — criterion met for documented plan + annual test + CERT/CC reporting linkage.
