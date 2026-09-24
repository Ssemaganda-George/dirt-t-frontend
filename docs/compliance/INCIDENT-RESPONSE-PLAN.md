# DirtTrails incident response plan

Version: draft 1, 24 September 2026. Owner and approval: **not yet assigned**. This document becomes operational policy only after leadership appoints an incident lead and approves it.

## Scope and contacts

Use this plan for suspected unauthorized access, personal data exposure, malware, account takeover, service disruption, and similar cyber incidents affecting DirtTrails bookings, travelers, vendors, or infrastructure. The admin incident register is at `/admin/data-breach-incidents`; it is restricted to admin accounts and retains a change history. It currently tracks personal data breaches, so incidents without a personal data component also need a case in the organization's chosen incident system until a general register exists.

Before activation, leadership must fill and verify this contact roster: incident lead and deputy; engineering on-call; data protection officer or privacy contact; legal adviser; hosting provider escalation; communications approver. Keep a copy available when the app is unavailable. Do not put passwords or recovery secrets in this document.

## First response

1. **Record awareness immediately.** Note who observed the event, UTC time, affected services, current impact, and a short factual summary. For a suspected personal data breach, create an admin incident record using the actual time the breach became known. Avoid copying affected personal data into the summary.
2. **Assign an incident lead and severity.** Critical: active exploitation, broad personal data exposure, or core booking service unavailable. High: credible targeted compromise or limited personal data exposure. Lower: contained suspicious activity with no confirmed exposure. Escalate uncertain cases as High until triaged.
3. **Preserve evidence.** Save relevant request IDs, timestamps, logs, deployment IDs, database change IDs, and screenshots in restricted storage. Record who collected each item and when. Do not post secrets or personal data in chat, tickets, or public forms.
4. **Contain safely.** Disable compromised credentials or access paths, restrict exposed policies, or roll back a harmful deployment. Record every action and its timestamp. Changes to payment, vendor wallet, or ledger state require a separate integrity review before action.
5. **Assess data and service impact.** Identify categories and approximate number of affected people, entry point, duration, data accessed, and likely consequences. Separate confirmed facts from hypotheses.

## External reporting and communication

- **PDPO:** For a personal data breach, prepare [Form 7](https://pdpo.go.ug/media/2022/02/Form_7_-_Notification_of_Data_Breach.pdf) and notify the PDPO immediately under Regulation 33(1). The 48-hour marker in the admin register is an internal escalation marker, not a waiting period. Record the submission time and reference only after delivery. The incident lead and privacy/legal contact decide the exact filing content and any affected-person notification.
- **National CERT/CC:** For a cyber incident requiring national coordination or assistance, use the [official reporting form](https://cert.ug/form/reporter-s-contact-information) or verified CERT contact channel. Its form asks reporters not to submit personally identifiable information or other sensitive material. Record the submission reference in the admin incident register when the incident is a personal data breach. Do not claim a report was sent merely because a record was opened.
- **Travelers, vendors, and providers:** The communications approver coordinates factual notices based on confirmed impact. Avoid speculative claims. Preserve a copy of each notice and its delivery record in restricted storage.

## Recovery and closure

Confirm the exploit path is closed, credentials rotated where needed, data access checked, and booking experience working before restoring normal operation. The incident lead signs off recovery and records residual risks. Within seven days of containment, document root cause, timeline, affected data and services, reporting decisions, corrective actions, owners, and deadlines. Do not delete the incident record or its change history.

## Annual exercise requirement

Schedule at least one tabletop or simulated incident every 12 months. Suggested scenario: an exposed traveler inquiry table while guest checkout remains active. Run the exercise with the incident lead, engineering, privacy/legal contact, and communications approver. Record the date, participants, scenario, detection time, decisions, PDPO/CERT reporting decision, notification draft, recovery checks, and corrective actions. Do **not** send a live regulator notification during an exercise. Leadership should approve the exercise result and track open actions.

**Evidence status on 24 September 2026:** Plan drafted; no approved owner roster, annual exercise record, or tested regulator-reporting protocol was found. Checklist answer remains **No**.
