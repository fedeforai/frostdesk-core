# ROADMAP — FrostDesk Market-Ready v1 (Pilot)

**Scope:** Single source of truth per portare frostdesk-core a market-ready v1 per pilot (maestri indipendenti). Definisce fasi, ordine non negoziabile, responsabilità Cursor vs intervento manuale, criteri di accettazione e prompt di esecuzione.

---

## 1. Baseline corrente

- **TA-1 Auth & Admin:** Completata. JWT Supabase validato server-side; `requireAdminUser` applicato a tutte le admin routes; nessuna fiducia su `userId` client-side.
- **QA Phase 0:** Documentata e verificabile: [QA_PHASE_0_AUTH_ADMIN_PROTOCOL.md](QA_PHASE_0_AUTH_ADMIN_PROTOCOL.md).
- **Security audit coverage:** Documentata: [SECURITY_ADMIN_ROUTE_COVERAGE_AUDIT.md](SECURITY_ADMIN_ROUTE_COVERAGE_AUDIT.md).
- **Audit logging design:** Definito in [architecture/TA-2_ADMIN_AUDIT_LOGGING.md](architecture/TA-2_ADMIN_AUDIT_LOGGING.md) e [IMPLEMENTATION_ADMIN_AUDIT_TICKETS.md](IMPLEMENTATION_ADMIN_AUDIT_TICKETS.md).
- **Architettura:** Coerente con TA-1, TA-3, TA-4; modello maestri indipendenti (1 maestro = 1 tenant; nessun school_id nel codice FrostDesk).

Baseline considerata solida e investor-safe.

---

## 2. Target market-ready v1

FrostDesk è **market-ready v1** quando tutti i seguenti sono veri:

| # | Criterio |
|---|----------|
| 1 | Auth e admin abuse-proof (JWT, requireAdminUser, no trust client) |
| 2 | Conversation lifecycle canonico e visibile (state machine + UI stato) |
| 3 | Booking v1 senza double booking; override sempre auditato |
| 4 | WhatsApp inbound e outbound manuale funzionanti |
| 5 | Pagamento collegato a booking (test mode accettabile) |
| 6 | Audit events per tutte le azioni critiche (fail-open) |
| 7 | UI operativa per operatori (filtri, stati, error/empty states) |
| 8 | KPI minimi visibili (dashboard admin) |
| 9 | Onboarding maestro ripetibile (checklist ops, is_active) |

**Non include (v1):** Self-serve signup, billing plans complessi, multi-tenant avanzato, automazioni AI aggressive.

---

## 3. Definizioni operative

- **RALPH-safe:** Cursor può implementare in PR piccole, testabili, senza refactor non richiesti e senza cambi di shape API non pianificati. Dove indicato "parziale", una parte è automatizzabile (codice/config) e una richiede manuale (dashboard, credenziali, decisioni prodotto).
- **Manual:** Richiede decisione prodotto, accesso a dashboard (Supabase, Meta, Stripe, Vercel) o test UI umani. Cursor prepara codice e stampa istruzioni precise; non esegue azioni esterne.

---

## 4. Macro ordine (non negoziabile)

| Ordine | Fase |
|--------|------|
| A | Ship foundation (deploy, env, parity) |
| B | Audit logging (admin actions append-only, fail-open) |
| C | Conversation lifecycle (state machine canonica + UI stato) |
| D | Booking engine v1 (no double booking, override auditato) |
| E | WhatsApp correctness (inbound, outbound manuale, handoff) |
| F | Payments v1 (Stripe Connect 1:1 maestro) |
| G | Ops UX (filtri, error/empty states, performance) |
| H | Observability e safety (correlation id, KPI, kill switch) |
| I | Maestro onboarding v1 (config + checklist ops) |

---

## 5. Fasi A–I (tabella sintetica)

### Phase A — Ship foundation

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| A1 | Aggiungere `pnpm-workspace.yaml` (packages: apps/*, packages/*) | Si | No | `pnpm -w install` senza warning; nessun breaking change |
| A2 | Env split: root solo backend keys; apps/web solo VITE_*; documentare in .env.example | Si | No | Web non espone segreti; build ok |
| A3 | Config deploy web (Vercel): build command, output dir, env VITE_* in doc | Parziale | Si (creare progetto, env su Vercel) | Doc/vercel.json pronti; deploy effettivo manuale |
| A4 | Config deploy API: Dockerfile o host doc (Fly/Render/Railway), porta 3001, health | Parziale | Si | Repo pronto; deploy e env prod manuali |

### Phase B — Audit logging (admin)

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| B1 | Modello evento audit (tipo TS) + tabella append-only `admin_audit_events` (migration packages/db) | Si | No | Tabella solo INSERT; no UPDATE/DELETE |
| B2 | Writer fail-open; emit su tutte le admin write (override booking, send draft, override status, ecc.) | Si | No | Ogni write admin emette 1 evento; fallimento audit non cambia response |
| B3 | (Opzionale) Log accessi admin (solo metadata, no PII). Doc in repo. | Si | No | Allineato a TA-2 |

### Phase C — Conversation lifecycle

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| C1 | Doc state machine: stati + transizioni + invarianti. Types in packages/db. Validazione in API. | Parziale | Si (approvazione stati prodotto) | Doc + types; transizioni validate lato API |
| C2 | Aggiungere `conversation.state` (migration), default coerente con C1 | Si | No | Query esistenti non rotte; stato persistito |
| C3 | Ingestion/azioni impostano stato (inbound NEW/OPEN; escalation NEEDS_HUMAN; booking BOOKED; CLOSED) | Si | No | Webhook e azioni cambiano stato come da doc |
| C4 | UI: badge stato e filtri (read-only) | Si | No | List e detail coerenti con stato DB |

### Phase D — Booking engine v1

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| D1 | Booking entity: schema status lifecycle TA-4; repository e servizi read/write | Si | No | Create/read ok; transizioni solo via state machine |
| D2 | Lock anti double booking: constraint o lock su (instructor_id, date, time slot) | Si | No | Test concorrenza passante |
| D3 | Flusso conferma/cancel/override: admin override con reason, audit (booking_audit + admin audit) | Parziale | Si (copy/UX conferma) | Override solo admin; audit scritto |
| D4 | Check disponibilità (read-only) prima di conferma; blocca se slot occupato | Parziale | Si (OAuth/credenziali calendar) | Comportamento documentato |

### Phase E — WhatsApp correctness

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| E1 | Validazione payload webhook: schema chiaro, 400 + reason su payload invalido | Si | No | Payload sbagliato 400; valido 200 |
| E2 | Inbound: salvare message, associare conversation, aggiornare stato (C3). Idempotenza external_message_id | Si | No | curl/test crea message e conversation |
| E3 | Outbound manuale: route admin send; verifica E2E con token Meta | Parziale | Si (Meta token, verifica invio) | Messaggio arriva su WhatsApp reale |
| E4 | Doc handoff: quando AI si ferma; draft only, no auto-send. Soglie documentate | Parziale | Si (soglie prodotto) | Policy chiara; gating rispettato |

### Phase F — Payments v1 (1 maestro = 1 Stripe Connect)

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| F1 | Stripe Connect: scaffolding (env, connected account per instructor). Onboarding test mode | Parziale | Si (Stripe, Connect settings) | Test mode onboarding documentato |
| F2 | Payment intent per booking; salvare payment status su booking; stato paid solo da webhook Stripe | Si | No | Booking paid aggiornato solo da evento Stripe |
| F3 | Webhook Stripe: handler payment_intent.succeeded; aggiorna booking + audit event | Si | Si (endpoint URL, signing secret) | Evento ricevuto e persistito; audit scritto |

### Phase G — Ops UX

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| G1 | Filtri inbox (stato, canale, search) e quick actions | Si | Si (priorità layout/UX) | Operazioni comuni in pochi click |
| G2 | Error states e empty states: nessuna pagina blank; messaggi chiari | Si | No | Ogni percorso ha feedback visivo |
| G3 | Performance: indici, pagination, budget query su liste | Si | No | List load entro soglia; no timeout |

### Phase H — Observability e safety

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| H1 | Correlation ID (o request id) in request/response e log strutturati | Si | No | Log filtrabili per request |
| H2 | KPI endpoints (conversion, escalation, tempi); per maestro dove applicabile. Dashboard read | Parziale | Si (definizione KPI) | Numeri reali su dashboard |
| H3 | Kill switch AI + quote: switch globale disabilita draft; quote enforce | Parziale | Si (policy) | Switch disattiva draft; quote rispettate |

### Phase I — Maestro onboarding v1 (1 maestro = 1 tenant)

| Id | Task | RALPH | Manual | Acceptance |
|----|------|--------|--------|------------|
| I1 | Modello config maestro: instructor profile (timezone, currency, is_active, whatsapp_number_id). Nessun school_id | Parziale | Si (campi minimi) | Nuovi maestri configurabili senza dev |
| I2 | Disponibilità v1: tabella availability (instructor_id, day_of_week, start/end). Validazione booking e anti double booking | Si | Si (formato orari prodotto) | Validazione e lock coerenti |
| I3 | Prezzi/tipologie lezione (flat): lesson_types (instructor_id, type, duration_minutes, price) | Si | No | Dati persistiti e usabili per booking |
| I4 | Checklist UI ops: maestro creato, WhatsApp, disponibilità, prezzi, pagamenti, test booking. Maestro non attivo finché checklist incompleta | Parziale | Si (contenuto checklist) | Ops completa onboarding senza support dev |
| I5 | Go-live: campo is_active; solo admin può attivare; evento audit obbligatorio | Si | No | Attivazione tracciata |

---

## 6. Elenco ticket (dettaglio)

Per ogni ticket: Id, Owner, Scope, Tasks, Guardrails, Acceptance, Rollback.

### A1 — pnpm-workspace.yaml

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / DevOps |
| **Scope** | Aggiungere `pnpm-workspace.yaml` con packages: `apps/*`, `packages/*`. Nessun cambio a package.json workspaces se si mantiene compatibilità npm. |
| **Tasks** | Creare `pnpm-workspace.yaml` in root. Verificare `pnpm -w install` e build. |
| **Guardrails** | Nessun refactor di script esistenti; opzionale se il team resta su npm. |
| **Acceptance** | `pnpm -w install` senza warning; nessun breaking change per chi usa npm. |
| **Rollback** | Rimuovere `pnpm-workspace.yaml`. |

### A2 — Env split

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Full-stack |
| **Scope** | Root .env solo backend keys; apps/web/.env.local solo VITE_*; documentare in .env.example. |
| **Tasks** | Aggiornare .env.example con split chiaro; verificare che web non carichi segreti; build web ok. |
| **Guardrails** | Non esporre SUPABASE_SERVICE_ROLE o API secrets in frontend. |
| **Acceptance** | Web non ha variabili segrete; build non fallisce. |
| **Rollback** | Revert modifiche .env.example e eventuali dotenv in apps/web. |

### A3 — Config deploy web (Vercel)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | DevOps / Full-stack |
| **Scope** | Configurazione deploy in repo (vercel.json o doc); build command, output dir, env VITE_*. |
| **Tasks** | Aggiungere vercel.json (o equivalente) e doc con variabili d'ambiente; non creare progetto Vercel né inserire segreti. |
| **Guardrails** | Nessun segreto in repo; deploy effettivo è manuale. |
| **Acceptance** | Doc e config pronti; deploy manuale con istruzioni chiare. |
| **Rollback** | Rimuovere vercel.json; aggiornare doc. |

### A4 — Config deploy API

| Campo | Contenuto |
|-------|-----------|
| **Owner** | DevOps / Backend |
| **Scope** | Dockerfile o documentazione host (Fly/Render/Railway); porta 3001, endpoint /health. |
| **Tasks** | Aggiungere Dockerfile o doc deploy; non inserire segreti prod. |
| **Guardrails** | Env prod e creazione risorse su provider sono manuali. |
| **Acceptance** | Repo pronto per deploy; istruzioni per env e health check. |
| **Rollback** | Rimuovere Dockerfile o doc aggiunti. |

### B1 — Admin audit events (modello + tabella)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Tipo TS per evento audit (TA-2); tabella append-only `admin_audit_events` (o riuso `audit_events` se schema compatibile). Migration in packages/db. |
| **Tasks** | Definire tipo evento (timestamp, actor_user_id, route, method, target_identifiers, outcome, error_code). Creare migration INSERT-only; nessun UPDATE/DELETE. |
| **Guardrails** | Nessun dato sensibile (no token, no body, no PII). Riferimento: [architecture/TA-2_ADMIN_AUDIT_LOGGING.md](architecture/TA-2_ADMIN_AUDIT_LOGGING.md). |
| **Acceptance** | Tabella esistente; solo INSERT consentito; schema allineato a TA-2. |
| **Rollback** | Migration rollback per tabella nuova. |

### B2 — Admin audit writer + emit

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Writer fail-open (non blocca request); chiamata su tutte le admin write (override booking, send draft, override status, ecc.). |
| **Tasks** | Implementare writer che accetta evento e persiste; try/catch, nessun throw al caller. Instrumentare ogni route admin che fa write. |
| **Guardrails** | Audit failure non deve mai cambiare status/body della response. Riferimento: [IMPLEMENTATION_ADMIN_AUDIT_TICKETS.md](IMPLEMENTATION_ADMIN_AUDIT_TICKETS.md) T2, T4, T5. |
| **Acceptance** | Ogni write admin emette 1 evento; fallimento audit non cambia response. |
| **Rollback** | Rimuovere writer e emit da ogni route. |

### B3 — Admin access logging (opzionale)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Log accessi a endpoint admin (solo metadata: route, method, actor_user_id, outcome). No PII, no payload. |
| **Tasks** | Aggiungere log strutturato dopo requireAdminUser; documentare in repo. |
| **Guardrails** | Allineato a TA-2: cosa non loggare. |
| **Acceptance** | Accessi admin tracciabili; nessun dato sensibile in log. |
| **Rollback** | Rimuovere log aggiunto. |

### C1 — Conversation state machine (doc + types)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Product |
| **Scope** | Documento state machine: stati (es. new, collecting_info, ready_to_book, booked, escalated, closed), transizioni consentite, invarianti. Types in packages/db. Validazione transizioni in API. |
| **Tasks** | Scrivere doc; definire enum/type stato; funzione di validazione transizione; integrare in API dove si cambia stato. |
| **Guardrails** | Approvazione lista stati da prodotto. Riferimento: [TA-3_CONVERSATION_LIFECYCLE.md](TA-3_CONVERSATION_LIFECYCLE.md). |
| **Acceptance** | Doc + types in repo; transizioni validate lato API. |
| **Rollback** | Revert doc e types; rimuovere validazione da API. |

### C2 — conversation.state (migration)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Aggiungere colonna `state` a `conversations` con default coerente con C1. |
| **Tasks** | Migration ADD COLUMN; default valore sicuro; nessun breaking change per query esistenti. |
| **Guardrails** | Nessun cambio di comportamento senza C1 approvato. |
| **Acceptance** | Query esistenti non rotte; stato persistito. |
| **Rollback** | Migration rollback (rimuovere colonna). |

### C3 — Ingestion/azioni set state

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Inbound imposta NEW/OPEN; escalation NEEDS_HUMAN; booking confirm BOOKED; chiusura CLOSED. Piccoli PR. |
| **Tasks** | Aggiornare webhook ingestion e azioni (conferma booking, escalation, chiusura) per scrivere conversation.state. |
| **Guardrails** | Transizioni solo consentite dalla state machine C1. |
| **Acceptance** | Webhook sample e azioni cambiano stato come da doc. |
| **Rollback** | Revert modifiche a ingestion e servizi. |

### C4 — UI stato (badge + filtri)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Frontend |
| **Scope** | Badge stato in list e detail; filtri per stato. Read-only, nessuna scrittura da UI. |
| **Tasks** | Leggere conversation.state da API; mostrare badge; filtri in list. |
| **Guardrails** | Nessuna logica di transizione in frontend. |
| **Acceptance** | List e detail coerenti con stato DB. |
| **Rollback** | Rimuovere badge e filtri stato. |

### D1 — Booking entity (schema + servizi)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Verificare/estendere schema bookings (status lifecycle TA-4: draft/proposed/confirmed/cancelled/expired); relazione conversation_id, instructor_id, time range. Repository e servizi read/write. |
| **Tasks** | Migration se serve; allineare status a TA-4; repository e servizi che usano state machine per transizioni. |
| **Guardrails** | Nessuna transizione diretta; solo via state machine. Riferimento: [TA-4_BOOKING_LIFECYCLE.md](TA-4_BOOKING_LIFECYCLE.md). |
| **Acceptance** | Create/read ok; transizioni solo via state machine. |
| **Rollback** | Revert migration e cambi servizi. |

### D2 — Anti double booking

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Constraint o lock su (instructor_id, date, time slot). Due insert stesso slot falliscono in modo deterministico. |
| **Tasks** | Unique constraint o advisory lock/query; test concorrenza. |
| **Guardrails** | Nessun bypass per admin (admin usa override auditato, non insert duplicato). |
| **Acceptance** | Test concorrenza passante. |
| **Rollback** | Rimuovere constraint/lock. |

### D3 — Conferma / cancel / override + audit

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Full-stack |
| **Scope** | Flusso conferma e cancel; admin override con reason; audit (booking_audit + admin audit event). |
| **Tasks** | Implementare conferma/cancel con transizione e booking_audit; admin override con reason e admin audit event; copy/UX conferma (manuale). |
| **Guardrails** | Override solo da admin (requireAdminUser); reason e audit obbligatori. |
| **Acceptance** | Conferma/cancel/override scrivono audit; override solo admin. |
| **Rollback** | Revert override e audit admin; tenere booking_audit esistente. |

### D4 — Check disponibilità (read-only)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Prima di conferma booking, check disponibilità (calendar/availability); blocca se slot occupato. |
| **Tasks** | Integrazione read-only con calendar o tabella availability; validazione prima di confirm. Documentare comportamento; OAuth/credenziali calendar sono manuali. |
| **Guardrails** | Nessuna scrittura su calendar in questo ticket; solo lettura e blocco. |
| **Acceptance** | Comportamento documentato; test con o senza calendar. |
| **Rollback** | Rimuovere check; conferma senza validazione slot. |

### E1 — Validazione webhook WhatsApp

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Schema validation payload webhook; 400 + reason su payload invalido. |
| **Tasks** | Validazione struttura (entry, changes, messages, id, from, timestamp, text.body); risposta 400 con codice/msg chiaro. |
| **Guardrails** | Payload valido 200; nessuna scrittura su payload invalido. |
| **Acceptance** | Payload sbagliato 400; valido 200. |
| **Rollback** | Revert validazione stretta se rompe client. |

### E2 — Inbound ingestion (message + conversation + state)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Salvare message, associare conversation, aggiornare stato (C3). Idempotenza su external_message_id. |
| **Tasks** | Persist message; resolve/create conversation; set conversation.state; idempotenza su external_message_id. |
| **Guardrails** | Nessun duplicato message; stato coerente con C1. |
| **Acceptance** | curl/test crea message e conversation; stato aggiornato. |
| **Rollback** | Revert modifiche ingestion. |

### E3 — Outbound manuale (verifica E2E)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Ops |
| **Scope** | Route admin send già presente; verifica E2E con token Meta. |
| **Tasks** | Verificare route; documentare invio; test con token Meta (manuale). |
| **Guardrails** | Nessun auto-send; solo invio manuale da admin. |
| **Acceptance** | Messaggio arriva su WhatsApp reale. |
| **Rollback** | N/A (verifica). |

### E4 — Doc handoff

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Product |
| **Scope** | Documentare quando AI si ferma e handoff a umano; draft only, no auto-send; soglie (se presenti). |
| **Tasks** | Doc policy handoff; soglie prodotto (manuale); gating rispettato in codice. |
| **Guardrails** | Nessun auto-send da AI. |
| **Acceptance** | Policy chiara; gating rispettato. |
| **Rollback** | Revert doc; eventuale revert gating. |

### F1 — Stripe Connect scaffolding

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Ops |
| **Scope** | Env e tipo connected account per instructor; onboarding test mode. |
| **Tasks** | Scaffolding codice (env, tipo account); doc onboarding test mode. Account Stripe e Connect settings sono manuali. |
| **Guardrails** | Nessun segreto live in repo. |
| **Acceptance** | Test mode onboarding documentato. |
| **Rollback** | Rimuovere scaffolding. |

### F2 — Payment intent per booking

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Creare payment intent per booking; salvare payment status su booking; stato paid solo da webhook Stripe. |
| **Tasks** | Collegamento booking ↔ payment intent; campo payment_status su booking; aggiornamento solo da webhook. |
| **Guardrails** | Stato paid mai impostato da codice applicativo; solo da webhook Stripe. |
| **Acceptance** | Booking paid aggiornato solo da evento Stripe. |
| **Rollback** | Revert link booking-payment. |

### F3 — Webhook Stripe

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Handler payment_intent.succeeded (e eventuali altri); aggiorna booking + audit event. |
| **Tasks** | Endpoint webhook; verifica firma; aggiorna booking; scrivi admin audit event. Endpoint URL e signing secret sono manuali. |
| **Guardrails** | Verifica signing; idempotenza su event_id. |
| **Acceptance** | Evento ricevuto e persistito; audit scritto. |
| **Rollback** | Disabilitare webhook; revert handler. |

### G1 — Filtri inbox e quick actions

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Frontend |
| **Scope** | Filtri per stato, canale, search; quick actions per operazioni comuni. |
| **Tasks** | UI filtri; integrazione con API esistenti; quick actions (es. apro conversazione, invia draft). Priorità layout/UX (manuale). |
| **Guardrails** | Nessun refactor API non pianificato. |
| **Acceptance** | Operazioni comuni in pochi click. |
| **Rollback** | Revert filtri e quick actions. |

### G2 — Error e empty states

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Frontend |
| **Scope** | Nessuna pagina blank; messaggi di errore e empty state chiari. |
| **Tasks** | Componenti error state e empty state; uso nelle liste e detail. |
| **Guardrails** | Nessun messaggio tecnico esposto all'utente. |
| **Acceptance** | Ogni percorso ha feedback visivo. |
| **Rollback** | Revert componenti. |

### G3 — Performance (indici, pagination)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Indici su query liste; pagination; budget query. |
| **Tasks** | Analizzare query lente; aggiungere indici; pagination dove serve; limit/offset coerenti. |
| **Guardrails** | Indici non devono bloccare write critici. |
| **Acceptance** | List load entro soglia; no timeout. |
| **Rollback** | Rimuovere indici se impattano write. |

### H1 — Correlation ID

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Request id / correlation id in request e response; log strutturati. |
| **Tasks** | Middleware che genera/propaga id; header response (opzionale); log con id. |
| **Guardrails** | Nessun PII nel log. |
| **Acceptance** | Log filtrabili per request. |
| **Rollback** | Rimuovere middleware e header. |

### H2 — KPI endpoints

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Product |
| **Scope** | KPI (conversion, escalation, tempi); per maestro dove applicabile; dashboard read. |
| **Tasks** | Endpoint o estensione esistente; definizione KPI (manuale). Dashboard che legge KPI. |
| **Guardrails** | Solo read; nessuna scrittura. |
| **Acceptance** | Numeri reali su dashboard. |
| **Rollback** | Revert endpoint/dashboard. |

### H3 — Kill switch AI + quote

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Product |
| **Scope** | Switch globale che disabilita draft AI; enforcement quote. |
| **Tasks** | Flag kill switch (DB o env); check prima di generare draft; quote enforce. Policy (manuale). |
| **Guardrails** | Kill switch non blocca risposta API; solo blocca generazione draft. |
| **Acceptance** | Switch disattiva draft; quote rispettate. |
| **Rollback** | Revert flag e check. |

### I1 — Modello config maestro

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend / Product |
| **Scope** | Instructor profile: timezone, currency, is_active, whatsapp_number_id, ecc. Nessun school_id. |
| **Tasks** | Migration/estensione tabella instructor/profile; campi minimi da raccogliere (manuale). |
| **Guardrails** | Nessuna gerarchia scuola-istruttore. |
| **Acceptance** | Nuovi maestri configurabili senza dev. |
| **Rollback** | Migration rollback. |

### I2 — Disponibilità v1

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Tabella availability (instructor_id, day_of_week, start_time, end_time). Validazione booking e anti double booking. |
| **Tasks** | Migration; repository; uso in D2 e D4. Formato orari (manuale). |
| **Guardrails** | Coerente con D2 (lock slot). |
| **Acceptance** | Validazione e lock coerenti. |
| **Rollback** | Migration rollback; rimuovere uso da booking. |

### I3 — Prezzi / tipologie lezione (flat)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Tabella lesson_types (instructor_id, type, duration_minutes, price). Solo pilot. |
| **Tasks** | Migration; repository; lettura da booking/UI. |
| **Guardrails** | Nessun pacchetto/sconto automatico in v1. |
| **Acceptance** | Dati persistiti e usabili per booking. |
| **Rollback** | Migration rollback. |

### I4 — Checklist UI ops

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Frontend / Ops |
| **Scope** | Checklist: maestro creato, WhatsApp, disponibilità, prezzi, pagamenti, test booking. Maestro non visibile/attivo finché incompleta. |
| **Tasks** | UI checklist; stati per step; blocco visibilità/attività fino a completamento. Contenuto checklist (manuale). |
| **Guardrails** | Solo admin/ops vede checklist. |
| **Acceptance** | Ops completa onboarding senza support dev. |
| **Rollback** | Revert UI e logica blocco. |

### I5 — Go-live (is_active)

| Campo | Contenuto |
|-------|-----------|
| **Owner** | Backend |
| **Scope** | Campo is_active; solo admin può attivare; evento audit obbligatorio. |
| **Tasks** | Campo su instructor/profile; route admin per set is_active; audit event a ogni attivazione/disattivazione. |
| **Guardrails** | Solo requireAdminUser può cambiare is_active. |
| **Acceptance** | Attivazione tracciata. |
| **Rollback** | Revert route e audit; eventuale rimozione campo. |

---

## 7. Dipendenze e ordine ticket

- **A:** A1, A2 indipendenti; A3, A4 dopo A2.
- **B:** B1 prima di B2; B2 dopo identificazione di tutte le admin write; B3 opzionale dopo B2.
- **C:** C1 prima di C2, C3, C4; C2 prima di C3 e C4.
- **D:** D1 prima di D2, D3, D4; D2 e D3 possono essere paralleli dopo D1; D4 può dipendere da I2 (availability).
- **E:** E1, E2 prima di E3; E4 indipendente (doc/policy).
- **F:** F1 prima di F2, F3; F2 prima di F3.
- **G, H:** Dopo D/E dove servono dati; ordine G1, G2, G3 e H1, H2, H3.
- **I:** I1 prima di I2, I3, I4, I5; I2 prima di I4 (checklist); I5 dopo I4.

---

## 8. Prompt Cursor (ready-to-paste)

```
You are implementing FrostDesk market-ready v1.

Rules:
- Follow phases A → I strictly. Do NOT reorder.
- Small, testable PRs only.
- No refactors of unrelated code.
- No endpoint shape changes unless required by the phase.
- All admin/critical writes must emit audit events (fail-open).
- If a step requires manual action (Vercel, Supabase, Meta, Stripe),
  stop after code/config and output exact manual instructions.

For each step:
1. Title (Phase + Step)
2. Files touched
3. Code changes (minimal)
4. Tests or manual verification
5. Acceptance checklist

Start with Phase A1.
```

---

## 9. Riferimenti

- [TA-1 Identity & Auth](architecture/TA-1_IDENTITY_AUTH.md)
- [TA-2 Admin Audit Logging](architecture/TA-2_ADMIN_AUDIT_LOGGING.md)
- [TA-3 Conversation Lifecycle](TA-3_CONVERSATION_LIFECYCLE.md)
- [TA-4 Booking Lifecycle](TA-4_BOOKING_LIFECYCLE.md)
- [IMPLEMENTATION_ADMIN_AUDIT_TICKETS.md](IMPLEMENTATION_ADMIN_AUDIT_TICKETS.md)
- [QA_PHASE_0_AUTH_ADMIN_PROTOCOL.md](QA_PHASE_0_AUTH_ADMIN_PROTOCOL.md)
- [SECURITY_ADMIN_ROUTE_COVERAGE_AUDIT.md](SECURITY_ADMIN_ROUTE_COVERAGE_AUDIT.md)
