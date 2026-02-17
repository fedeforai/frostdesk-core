# Availability Conflicts — logica e troubleshooting

## Cosa sono i “conflicts”

La pagina **Availability Conflicts** (sidebar → **Conflicts**) mostra i **conflitti** tra:

1. **Finestre di disponibilità** (`instructor_availability`)  
   Orari ricorrenti in cui il maestro si è dichiarato disponibile (es. “Lunedì 09:00–12:00”, “Martedì 14:00–18:00”).

2. **Eventi in calendario** (`calendar_events_cache`)  
   Eventi presi dal calendario esterno (es. Google Calendar): riunioni, impegni personali, ecc.

Un **conflitto** c’è quando una finestra di disponibilità e un evento di calendario **si sovrappongono** (stesso giorno e orari che si incrociano). In quel caso il sistema non dovrebbe vendere lezione in quell’orario, perché il maestro in realtà è già impegnato.

Esempi:
- Disponibilità: lunedì 10:00–12:00. Calendario: evento lunedì 11:00–12:00 → **conflitto**.
- Disponibilità: martedì 14:00–18:00. Calendario: evento “tutto il giorno” martedì → **conflitto** (evento all-day = conflitto con tutta la disponibilità di quel giorno).

La pagina serve al maestro per **vedere** questi conflitti e decidere se correggere la disponibilità o il calendario.

---

## Flusso tecnico (dove nasce l’errore)

```
[Browser] Pagina "Availability Conflicts"
    ↓
    loadConflicts() → fetchAvailabilityConflicts()
    ↓
    GET /api/instructor/availability/conflicts  (stesso origin, cookie di sessione)
    ↓
[Next.js] Route app/api/instructor/[...path]
    ↓
    Legge sessione (getServerSession), se manca → 401
    Proxy verso: GET {API_BASE}/instructor/availability/conflicts
    Authorization: Bearer <token>
    ↓
[API Fastify] GET /instructor/availability/conflicts
    ↓
    getUserIdFromJwt → requireOnboarded (profilo + onboarding completato)
    Se 404 o 403 → risposta 404/403
    ↓
    listAvailabilityCalendarConflicts(profile.id)
    ↓
[DB] Query SQL:
    instructor_availability av
    INNER JOIN calendar_events_cache ce ON av.instructor_id = ce.instructor_id
    WHERE sovrapposizione (stesso giorno + orari che si incrociano)
    ↓
    Ritorna lista conflitti (o [] se nessuno)
    ↓
API risponde: { ok: true, items: [...] }
    ↓
Client: setConflicts(data); se fetch fallisce → setError → "Couldn't load conflicts..."
```

Se in uno di questi passi qualcosa va male (API non raggiungibile, 401/403/500, errore DB), la UI non riceve `{ ok: true, items }` e mostra **“Couldn't load conflicts. Check your connection and retry.”**.

---

## Cosa significa l’errore “Couldn't load conflicts”

Il messaggio viene mostrato quando:

1. **401** → di solito non lo vedi: il client reindirizza al login.
2. **403** → vedi “Not authorized” (onboarding non completato o profilo non autorizzato).
3. **500** → l’API ha restituito errore (es. eccezione nel backend). La UI mostra “Couldn't load conflicts. Check your connection and retry.” (e in `loadConflicts` viene usato il messaggio generico).
4. **502** → il proxy non riesce a parlare con l’API (API spenta o `NEXT_PUBLIC_API_URL` sbagliato). Stesso messaggio generico.
5. **Rete / CORS / fetch fallito** → stesso messaggio.

Quindi “Couldn't load conflicts” è il messaggio **generico** per: “la richiesta non è andata a buon fine” (salvo 401 che manda al login e 403 che mostra “Not authorized”).

---

## Cause tipiche e cosa fare

| Causa | Sintomo | Cosa fare |
|-------|--------|-----------|
| **API non in esecuzione** | 502 dal proxy | Avviare l’API (es. `pnpm --filter @frostdesk/api dev`) e verificare che risponda su `NEXT_PUBLIC_API_URL` (es. :3001). |
| **Sessione scaduta / cookie** | 401 (di solito redirect) o proxy 401 | Rifare login dall’app instructor. |
| **Onboarding non completato** | 403 “Onboarding must be completed to view conflicts” | Completare onboarding dal flusso instructor. |
| **Tabella DB mancante** | Errore tipo “relation … does not exist” | Applicare le migration (es. `calendar_events_cache`, `instructor_availability`). Dopo il fix l’endpoint può restituire `items: []` invece di 500. |
| **Errore SQL (tipo/dati)** | 500 dall’API | Controllare i log dell’API; verificare che `calendar_events_cache` e `instructor_availability` abbiano lo schema atteso. |

---

## Logica della query conflitti (in breve)

- **Tabella disponibilità** (`instructor_availability`): `instructor_id`, `day_of_week` (0–6), `start_time`, `end_time` (tipo TIME), `is_active`.
- **Tabella eventi** (`calendar_events_cache`): `instructor_id`, `start_at`, `end_at` (TIMESTAMPTZ), `is_all_day`, `title`, ecc.

La query:
- fa **JOIN** su `instructor_id` (stesso maestro);
- filtra `av.is_active = true`;
- considera **due casi**:
  - **Evento all-day**: stesso `day_of_week` (giorno della settimana) → conflitto con tutta la disponibilità di quel giorno.
  - **Evento con orario**: stesso `day_of_week` e intervalli che si sovrappongono (`av.start_time < ce.end_at` e `av.end_time > ce.start_at`).

I risultati sono ordinati per giorno e orario e restituiti come lista di “conflitti” (finestra disponibilità + evento in conflitto).

---

## Riepilogo

- **Availability Conflicts** = sovrapposizioni tra “quando sono disponibile” e “quando ho già impegni in calendario”.
- **Flusso**: Browser → Next (proxy con cookie) → API Fastify → DB (`listAvailabilityCalendarConflicts`).
- **“Couldn't load conflicts”** = richiesta fallita (500, 502, rete, ecc.); controllare API attiva, migration applicate, e log backend per il dettaglio.
