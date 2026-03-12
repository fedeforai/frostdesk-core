# Intellectual Property Protection Considerations

This document lists areas where the product and organisation should consider protecting **intellectual property (IP)**: source code, trade secrets, branding, data assets, and confidential information.

---

## 1. Source code and algorithms

| Area | Risk | Protection to consider |
|------|------|-------------------------|
| Proprietary business logic | Theft, reverse engineering, copying by competitors | Clear ownership (employment/contractor agreements); access control (need-to-know); no public repos for core logic. |
| AI prompts, models, pipelines | Extraction of prompts or model behaviour; replication by others | Treat prompts/config as confidential; restrict who can read/edit; consider non-disclosure for sensitive AI behaviour. |
| Internal APIs and schemas | Unauthorised use or cloning of API design | Document what is “internal only”; auth and scoping so only intended clients can call; avoid exposing internal shapes in public docs. |
| Third-party and open-source code | Mixing in GPL/AGPL or unclear licenses; losing track of obligations | License audit (e.g. FOSSA, ScanCode); CONTRIBUTING / NOTICE files; clear policy on what can be imported and under which license. |

---

## 2. Trade secrets and confidential information

| Area | Risk | Protection to consider |
|------|------|-------------------------|
| Pricing, margins, strategy | Leaks to competitors or customers | Confidentiality in contracts; access limited to roles that need it; no strategy in public repos or docs. |
| Integrations (Stripe, WhatsApp, etc.) | Details of implementation or workarounds becoming known | Keep integration details in private docs; avoid committing API keys, webhook secrets, or detailed flow descriptions in public places. |
| Runbooks, incidents, post-mortems | Operational know-how and weaknesses | Store in private wikis/docs; classify as internal/confidential; control who can export or share. |
| Roadmaps and unreleased features | Competitors or press learning plans early | Share only with need-to-know; mark as confidential; avoid detailed public roadmaps if sensitive. |

---

## 3. Branding and trademarks

| Area | Risk | Protection to consider |
|------|------|-------------------------|
| Product name, logo, taglines | Generic use or dilution; confusion with others | Use consistently; consider trademark registration; monitor misuse (domain squatting, copycats). |
| Marketing and public content | Unauthorised reuse or misattribution | Copyright notices; terms of use for site/content; watermarking or clear attribution where relevant. |
| Third-party use of our brand | Partners or integrators using logo/name incorrectly | Brand guidelines; approval process for co-marketing; contractual limits on use. |

---

## 4. Data as an asset

| Area | Risk | Protection to consider |
|------|------|-------------------------|
| Customer and instructor data | Theft, misuse, or unauthorised sharing | Access control; encryption at rest and in transit; data-processing agreements; retention and deletion policies. |
| Aggregated analytics, metrics | Insights extracted and reused by others | Restrict who can export; anonymise where possible; treat dashboards/reports as confidential. |
| Training data (if used for AI) | Inclusion of PII or confidential content in models | Data governance; consent and legal basis; avoid training on sensitive data without clear policy. |
| Backups and exports | Unauthorised access or exfiltration | Secure storage; access logging; encryption; clear ownership of backup copies. |

---

## 5. People and contracts

| Area | Risk | Protection to consider |
|------|------|-------------------------|
| Employees | Taking code, clients, or secrets when leaving | IP assignment in contract; confidentiality and non-compete (where enforceable); offboarding (access revocation, handover). |
| Contractors and agencies | Owning or reusing code we paid for | Contractual assignment of IP; clear “work for hire” or equivalent; no use of our code in their other projects without agreement. |
| Open-source contributors | Unclear ownership of contributions | CLA or DCO; CONTRIBUTING.md with license and ownership terms; only accept contributions under compatible licenses. |
| Partners and integrators | Access to APIs or docs leading to copying or misuse | NDAs where appropriate; API terms of use; rate limits and monitoring; revocable keys. |

---

## 6. Technical and operational safeguards

| Area | Protection to consider |
|------|-------------------------|
| Repository access | Private repos for core product; branch protection; required reviews; no long-lived broad tokens. |
| Secrets and config | No secrets in code; use env/vault; rotate keys; limit who can read production secrets. |
| Build and deploy | Reproducible builds; signed artifacts if needed; deploy only from controlled pipelines. |
| Documentation | Separate public vs internal docs; mark confidential; version and access control for internal material. |
| Monitoring and audit | Log access to sensitive systems and data; alert on unusual exports or bulk access; retain logs for investigations. |

---

## 7. Current state in the codebase (reference)

- **License:** Check root `LICENSE` and per-package notices for what is proprietary vs open.
- **Secrets:** Documented in `docs/SECRETS_AND_ENV.md`; env-based config; no keys in repo.
- **Third-party use:** Stripe, Meta/WhatsApp, Supabase, etc. used under their terms; no redistribution of their SDKs in ways that conflict with their licenses.
- **Contributions:** If the project ever accepts external contributions, add CONTRIBUTING.md and clarify IP (e.g. CLA or DCO) before accepting patches.

This section is a starting point; adjust as you formalise IP policy (legal, HR, and product).
