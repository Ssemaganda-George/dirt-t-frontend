# DirtTrails API interoperability assessment — 24 September 2026

## Scope and evidence

The current Vite frontend calls Supabase PostgREST, Auth, RPCs, and Edge Functions. The Edge Functions commonly exchange JSON over HTTPS. The live Supabase project has active functions for booking communications, visitor sessions, trip planning, and payment operations. This is evidence of JSON/REST use, not of an approved government interoperability contract.

A repository search found no UGHub, WSO2, or government gateway client or configuration. A live schema search found no UGHub or gateway tables or routines. No signed technical interoperability agreement, government API contract, or UGHub onboarding evidence was provided. These searches cannot prove that no separate external integration exists; they establish what is evidenced in this repository and project.

## Checklist answers

1. **e-GIF XML/JSON alignment — No, not evidenced.** JSON responses alone do not establish semantic, organizational, and technical alignment. NITA-U's e-GIF calls for API-centric open specifications and a Technical Interoperability Agreement specifying acceptable formats. Before changing an API, identify the government data exchange, agree on its data model and contract, and test it with the receiving entity.
2. **UGHub real-time federation — No.** No UGHub client, endpoint, credentials, VPN configuration, or UAT record is present. NITA-U's onboarding procedure includes an expression of interest, service request, VPN setup, MoU/SLA, integration, UAT, and production setup.
3. **Central gateway OAuth 2.0, rate limits, and logs — No.** Supabase authentication and platform logs do not demonstrate that DirtTrails traffic traverses the UGHub gateway with its required OAuth, rate-limit, and logging configuration. This should be assessed after a specific UGHub service is approved and onboarded.

These e-GIF materials describe government service interoperability; whether each item applies to this private marketplace must be agreed with the auditor and relevant authority. No production integration was created without a counterparty, contract, or test environment.

## Primary sources

- [NITA-U e-Government Interoperability Framework](https://www.nita.go.ug/sites/default/files/2025-07/e-GIF.pdf), sections 3.5 and 4.6.
- [NITA-U UGHub integration service and onboarding procedure](https://nita.go.ug/services/e-government-services/integration-service-ughub).
