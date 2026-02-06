# Pilot Metrics (Weekly) — Market-aligned

Obiettivo: misurare se FrostDesk crea valore reale per istruttori e admin durante il pilot, **senza PII, senza vanity metrics, senza nuove feature**. Le metriche servono a decidere cosa rafforzare, cosa tagliare, cosa rimandare.

Tutte le metriche sono **misurabili via audit_log**, **azionabili**, e **non includono PII**.

---

## 1. Le 6 metriche pilot

### 1️⃣ AI Draft Adoption Rate

**Domanda:** Gli istruttori usano davvero i draft o li ignorano?

**Definizione:** `ai_draft_approved` / `ai_draft_generated` (stesso periodo).

**Target pilot:**
- ≥ 40% = valore percepito
- < 25% = problema di contenuto o timing

**Fonte:** `audit_log` — `action IN ('ai_draft_generated', 'ai_draft_approved')`.

---

### 2️⃣ AI Draft Skip Reasons (Distribution)

**Domanda:** Perché FrostDesk non propone o non genera draft?

**Definizione:** Distribuzione settimanale di: `gate_denied`, `intent_non_operative`, `confidence_low`, `quality_blocked`, `error` (da `payload->>'reason'` su `ai_draft_skipped`).

**Target pilot:**
- `confidence_low` + `intent_non_operative` > 60% = sistema prudente (bene)
- `quality_blocked` > 20% = guardrail troppo rigidi o prompt da rivedere

**Fonte:** `audit_log` — `action = 'ai_draft_skipped'`.

---

### 3️⃣ Human Escalation Rate

**Domanda:** Quante conversazioni richiedono intervento umano?

**Definizione:** `conversations_with_human_action` / `total_active_conversations`.

**Target pilot:** 100% automatico NON è un obiettivo. 30–60% escalation è sano nel pilot.

**Fonte (proxy):** eventi di intervento umano oggi in audit: `ai_draft_approved`, `admin_send_ai_draft`, `admin_override_booking_status`. Totale attive = conversazioni con almeno un `inbound_message_received` nel periodo. *(Ideale: human_handled, manual_reply, admin_override — allineare nomi quando possibile.)*

---

### 4️⃣ Time-to-First-Action (TTFA)

**Domanda:** FrostDesk accelera davvero le operazioni?

**Definizione:** Tempo medio (o mediano) tra `inbound_message_received` e il **primo evento utile**: `ai_draft_generated`, `ai_draft_approved`, o (quando disponibile) risposta umana.

**Target pilot:** ↓ settimana su settimana. Il valore assoluto conta meno del trend.

**Fonte:** `audit_log` — `created_at` e correlazione per `entity_id` (conversation).

---

### 5️⃣ Draft Quality Signals (No PII)

**Domanda:** I draft sono troppo lunghi o problematici?

**Definizione:** Su `ai_draft_generated`: (1) % con `was_truncated = true`; (2) media di `violations_count`.

**Target pilot:**
- `was_truncated` < 50% (se > 50%, prompt troppo verbose)
- `violations_count` stabile o in calo

**Fonte:** `audit_log` — `action = 'ai_draft_generated'`, `payload.was_truncated`, `payload.violations_count`.

---

### 6️⃣ Admin Override Density

**Domanda:** Quanto il sistema richiede “correzione dall’alto”?

**Definizione:** `admin_override_actions` / `total_bookings_or_conversations`. Conteggio di azioni `action LIKE 'admin_%'` (es. `admin_send_ai_draft`, `admin_override_booking_status`).

**Target pilot:** Alto all’inizio = normale. Deve scendere col tempo.

**Fonte:** `audit_log` — `action LIKE 'admin_%'`. Denominatore: conversazioni attive (con almeno un evento nel periodo) o totale booking/conversation a scelta.

---

## 2. Regole di utilizzo

- ❌ Non ottimizzare una metrica isolata
- ❌ Non confrontare istruttori tra loro
- ❌ Non cambiare il sistema prima di 2 settimane
- ✅ Guardare **trend settimanali**
- ✅ Incrociare numeri + **feedback umano**
- ✅ **Annotare** eventi anomali

---

## 3. Runbook

### Come eseguire

- **Strumento:** `psql` sul DB Postgres o Supabase SQL Editor.
- **Periodo:** Ultimi 7 giorni (default). In `scripts/pilot_metrics_weekly.sql` fare find-replace prima di eseguire:
  - `:start_ts` → `(now() - interval '7 days')`
  - `:end_ts` → `now()`
- **Nessuna PII:** Le query usano solo `audit_log`. Niente message text, phone, nomi.

### Output settimanale (max 10 minuti)

Ogni settimana produrre solo questo:

**Week X — Pilot Review**

1. Draft adoption: _X%_ (_±Y%_ vs settimana prima)
2. Top skip reason: _reason_ (_Z%_)
3. Escalation rate: _X%_ (stable / ↑ / ↓)
4. TTFA: _Nm Ns_ (↓ / ↑ _Ns_)
5. Draft quality: truncation _X%_, avg violations _N_
6. Admin overrides: _N_ total

Note: _eventuali osservazioni (es. draft troppo lunghi su INFO_REQUEST; istruttori ok su booking, freddi su reschedule)_.

Stop.

---

## 4. SQL (copy-paste)

Periodo di default: ultimi 7 giorni. Sostituire i bound dove serve.

### 1️⃣ AI Draft Adoption Rate

```sql
WITH gen AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action = 'ai_draft_generated'
    AND created_at >= now() - interval '7 days' AND created_at < now()
),
approved AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action = 'ai_draft_approved'
    AND created_at >= now() - interval '7 days' AND created_at < now()
)
SELECT
  (SELECT n FROM gen) AS drafts_generated,
  (SELECT n FROM approved) AS drafts_approved,
  CASE WHEN (SELECT n FROM gen) > 0
    THEN round(100.0 * (SELECT n FROM approved) / (SELECT n FROM gen), 2)
    ELSE NULL END AS adoption_rate_pct;
```

---

### 2️⃣ AI Draft Skip Reasons (Distribution)

```sql
SELECT
  coalesce(payload->>'reason', 'unknown') AS reason,
  count(*) AS cnt,
  round(100.0 * count(*) / nullif(sum(count(*)) OVER (), 0), 2) AS pct
FROM audit_log
WHERE action = 'ai_draft_skipped'
  AND created_at >= now() - interval '7 days' AND created_at < now()
GROUP BY payload->>'reason'
ORDER BY cnt DESC;
```

---

### 3️⃣ Human Escalation Rate (proxy)

```sql
WITH active AS (
  SELECT count(DISTINCT entity_id) AS n FROM audit_log
  WHERE action = 'inbound_message_received' AND entity_type = 'conversation' AND entity_id IS NOT NULL
    AND created_at >= now() - interval '7 days' AND created_at < now()
),
handled AS (
  SELECT count(DISTINCT entity_id) AS n FROM audit_log
  WHERE action IN ('ai_draft_approved', 'admin_send_ai_draft', 'admin_override_booking_status')
    AND entity_id IS NOT NULL
    AND created_at >= now() - interval '7 days' AND created_at < now()
)
SELECT
  (SELECT n FROM active) AS total_active_conversations,
  (SELECT n FROM handled) AS conversations_with_human_action,
  CASE WHEN (SELECT n FROM active) > 0
    THEN round(100.0 * (SELECT n FROM handled) / (SELECT n FROM active), 2)
    ELSE NULL END AS escalation_rate_pct;
```

---

### 4️⃣ Time-to-First-Action (TTFA)

Primo evento utile = `ai_draft_generated` o `ai_draft_approved` dopo l’inbound (stessa conversazione).

```sql
WITH conv_first_inbound AS (
  SELECT entity_id AS cid, min(created_at) AS t0
  FROM audit_log
  WHERE action = 'inbound_message_received' AND entity_type = 'conversation' AND entity_id IS NOT NULL
    AND created_at >= now() - interval '7 days' AND created_at < now()
  GROUP BY entity_id
),
conv_first_action AS (
  SELECT entity_id AS cid, min(created_at) AS t1
  FROM audit_log
  WHERE action IN ('ai_draft_generated', 'ai_draft_approved') AND entity_type = 'conversation' AND entity_id IS NOT NULL
    AND created_at >= now() - interval '7 days' AND created_at < now()
  GROUP BY entity_id
),
diffs AS (
  SELECT extract(epoch FROM (a.t1 - i.t0)) / 60.0 AS minutes
  FROM conv_first_inbound i
  JOIN conv_first_action a ON a.cid = i.cid
  WHERE a.t1 >= i.t0
)
SELECT
  count(*) AS n_conversations,
  round(avg(minutes)::numeric, 2) AS avg_minutes_ttfa,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes)::numeric, 2) AS median_minutes_ttfa
FROM diffs;
```

---

### 5️⃣ Draft Quality Signals (No PII)

```sql
SELECT
  count(*) AS total_drafts,
  count(*) FILTER (WHERE (payload->>'was_truncated') = 'true') AS truncated_count,
  round(100.0 * count(*) FILTER (WHERE (payload->>'was_truncated') = 'true') / nullif(count(*), 0), 2) AS was_truncated_pct,
  round(avg(NULLIF(payload->>'violations_count', '')::numeric), 2) AS avg_violations_count
FROM audit_log
WHERE action = 'ai_draft_generated'
  AND created_at >= now() - interval '7 days' AND created_at < now();
```

---

### 6️⃣ Admin Override Density

```sql
WITH admin_actions AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action LIKE 'admin_%'
    AND created_at >= now() - interval '7 days' AND created_at < now()
),
active_conversations AS (
  SELECT count(DISTINCT entity_id) AS n FROM audit_log
  WHERE entity_type = 'conversation' AND entity_id IS NOT NULL
    AND created_at >= now() - interval '7 days' AND created_at < now()
)
SELECT
  (SELECT n FROM admin_actions) AS admin_override_actions,
  (SELECT n FROM active_conversations) AS total_active_conversations,
  CASE WHEN (SELECT n FROM active_conversations) > 0
    THEN round((SELECT n FROM admin_actions)::numeric / (SELECT n FROM active_conversations), 2)
    ELSE NULL END AS admin_override_density;
```

---

## 5. Error rate (opzionale)

```sql
WITH err AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action = 'ai_draft_skipped' AND payload->>'reason' = 'error'
    AND created_at >= now() - interval '7 days' AND created_at < now()
),
inb AS (
  SELECT count(*) AS n FROM audit_log
  WHERE action = 'inbound_message_received'
    AND created_at >= now() - interval '7 days' AND created_at < now()
)
SELECT
  (SELECT n FROM err) AS draft_skipped_error,
  (SELECT n FROM inb) AS inbound_logged,
  CASE WHEN (SELECT n FROM inb) > 0 THEN round(100.0 * (SELECT n FROM err) / (SELECT n FROM inb), 4) ELSE NULL END AS error_rate_pct;
```

---

**Acceptance Prompt 3:** Le 6 metriche sono misurabili via audit_log, nessuna include PII, nessuna richiede nuove feature, tutte sono azionabili. ✅
