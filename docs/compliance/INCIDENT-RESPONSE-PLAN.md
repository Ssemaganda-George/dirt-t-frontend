# DirtTrails incident response plan

**Version:** 1.0 (operational)  
**Effective date:** 24 September 2026  
**Next annual exercise due:** on or before 24 September 2027  
**Approved by:** Platform leadership (DirtTrails Safaris)  
**Document owner / Incident lead:** Platform Administrator — safaris.dirttrails@gmail.com  

This plan is operational policy for DirtTrails. Keep an offline copy available when the app is unavailable. Do not store passwords or recovery secrets in this document.

## Contact roster (active)

| Role | Assignee | Contact |
|------|----------|---------|
| Incident lead | Platform Administrator | safaris.dirttrails@gmail.com |
| Deputy incident lead | Engineering on-call (same mailbox until a deputy is named) | safaris.dirttrails@gmail.com |
| Engineering on-call | Platform engineering | safaris.dirttrails@gmail.com |
| Privacy / DPO contact | Platform Administrator (pending PDPO DPO registration) | safaris.dirttrails@gmail.com |
| Legal adviser | External counsel on retainer / engagement as needed | Via incident lead |
| Hosting / Auth escalation | Supabase support (project dashboard → Support) | Via incident lead |
| Communications approver | Platform Administrator | safaris.dirttrails@gmail.com |
| National CERT/CC reporting | Official form — no PII in submissions | https://cert.ug/form/reporter-s-contact-information |
| PDPO breach notification | Form 7 — notify immediately under Regulation 33(1) | https://pdpo.go.ug/media/2022/02/Form_7_-_Notification_of_Data_Breach.pdf |

Update this roster when people change. Until additional staff are appointed, the Platform Administrator holds multiple roles and must escalate conflicts of interest to counsel.

## Scope

Use this plan for suspected unauthorized access, personal data exposure, malware, account takeover, service disruption, and similar cyber incidents affecting DirtTrails bookings, travelers, vendors, or infrastructure.

The admin incident register is at `/admin/data-breach-incidents` (admin-only, change history retained). It tracks personal-data breaches and CERT/CC submission evidence. Incidents without a personal-data component still follow this plan and must be recorded in restricted notes until a general cyber register exists.

## First response

1. **Record awareness immediately.** Note who observed the event, UTC time, affected services, current impact, and a short factual summary. For a suspected personal data breach, create an admin incident record using the actual time the breach became known. Avoid copying affected personal data into the summary.
2. **Assign an incident lead and severity.** Critical: active exploitation, broad personal data exposure, or core booking service unavailable. High: credible targeted compromise or limited personal data exposure. Lower: contained suspicious activity with no confirmed exposure. Escalate uncertain cases as High until triaged.
3. **Preserve evidence.** Save relevant request IDs, timestamps, logs, deployment IDs, database change IDs, and screenshots in restricted storage. Record who collected each item and when. Do not post secrets or personal data in chat, tickets, or public forms.
4. **Contain safely.** Disable compromised credentials or access paths, restrict exposed policies, or roll back a harmful deployment. Record every action and its timestamp. Changes to payment, vendor wallet, or ledger state require a separate integrity review before action.
5. **Assess data and service impact.** Identify categories and approximate number of affected people, entry point, duration, data accessed, and likely consequences. Separate confirmed facts from hypotheses.

## External reporting and communication

- **PDPO:** For a personal data breach, prepare Form 7 and notify the PDPO **immediately** under Regulation 33(1). The 48-hour marker in the admin register is an internal escalation marker, not a waiting period. Record the submission time and reference only after delivery.
- **National CERT/CC:** For a cyber incident requiring national coordination or assistance, use the official reporting form or verified CERT contact channel. Do not submit personally identifiable information or other sensitive material on that form. Record the submission reference in the admin incident register when applicable. Do not claim a report was sent merely because a record was opened.
- **Travelers, vendors, and providers:** The communications approver coordinates factual notices based on confirmed impact. Avoid speculative claims. Preserve a copy of each notice and its delivery record in restricted storage.

## Recovery and closure

Confirm the exploit path is closed, credentials rotated where needed, data access checked, and booking experience working before restoring normal operation. The incident lead signs off recovery and records residual risks. Within seven days of containment, document root cause, timeline, affected data and services, reporting decisions, corrective actions, owners, and deadlines. Do not delete the incident record or its change history.

## Annual exercise requirement

At least one tabletop or simulated incident every 12 months. Run with the incident lead, engineering, privacy contact, and communications approver. Record date, participants, scenario, detection time, decisions, PDPO/CERT reporting decision, notification draft, recovery checks, and corrective actions. **Do not send a live regulator notification during an exercise.** Leadership approves the exercise result and tracks open actions.

**Current exercise evidence:** See `docs/compliance/INCIDENT-RESPONSE-EXERCISE-2026-09-24.md` (completed 24 September 2026).

## Evidence status

| Criterion | Status |
|-----------|--------|
| Formal documented plan | Yes — this Version 1.0 |
| Named owners / roster | Yes — table above |
| Annual test | Yes — exercise record dated 24 September 2026 |
| Linked CERT/CC reporting | Yes — plan steps + admin register fields + official form URL |

**Checklist answer (Cat 2 — Incident Response Plan): Yes**
