# WhatsApp Inbox — Audit: “non si aggiorna” / dati vecchi

Quando l’Inbox mostra “Last message 10d ago” e non si aggiorna dopo nuovi messaggi WhatsApp, le cause tipiche sono: webhook Meta non raggiunge l’API, variabili Meta mancanti/errate, o (meno spesso) polling/endpoint lato frontend. Questo documento è un audit da seguire per risolvere il bug.

---

## 1. Flusso dati (dove nasce l’aggiornamento)

1. **Meta** invia un POST al **webhook** dell’API per ogni messaggio in arrivo.
2. L’API (**POST /webhook/whatsapp**) verifica la firma, risolve l’istruttore (phone_number_id / auto-associazione), persiste il messaggio (`persistInboundMessageWithInboxBridge` → tabelle `conversations` + `messages`).
3. L’app Instructor chiama **GET /instructor/conversations** (polling ogni **5 secondi** da `HumanInboxPage` → `getConversations()` → `usePolling(refreshConversationListSoft, 5000, ...)`).
4. L’API risponde con dati da `getInstructorInbox(profile.id)` che legge da `conversations` e `messages` filtrati per `instructor_id`.

Se i dati restano vecchi, il problema è a monte: **o il webhook non riceve i messaggi, o non li persiste correttamente**. Il polling (5s) e l’endpoint (/instructor/conversations) sono già configurati per aggiornare la lista.

---

## 2. Webhook Meta: URL e verifica

- **URL che Meta deve chiamare:**  
  `https://TUO-DOMINIO-API/webhook/whatsapp`  
  Esempio: `https://frostdeskapi-production.up.railway.app/webhook/whatsapp`

- **Dove configurarlo:**  
  Meta for Developers → tua App → **WhatsApp** → **Configuration** → **Webhook** → **Callback URL**.  
  Inserire esattamente l’URL sopra (nessuno slash finale, solo **POST** abilitato per i messaggi).

- **Verifica:**  
  - **GET** (verifica URL da Meta): l’API risponde 400 se mancano `hub.mode`, `hub.verify_token`, `hub.challenge`; risponde 403 se il token non coincide; altrimenti restituisce `hub.challenge` in plain text.  
  - **POST**: Meta invia i payload dei messaggi. Se l’URL è sbagliato o l’API non è raggiungibile, Meta non recapita i messaggi e l’Inbox non si aggiorna.

- **Controllo in Meta:**  
  Nella sezione Webhook di Meta c’è spesso un log delle chiamate (delivery, read, message, ecc.). Verificare che le chiamate risultino **delivered** e non errori (4xx/5xx o timeout). Se non ci sono chiamate, l’URL è sbagliato o l’API non è raggiungibile da internet.

---

## 2b. Sottoscrizione eventi webhook (Use cases) — ⚠️ Causa frequente “Inbox non si aggiorna”

Oltre al **Callback URL**, Meta richiede di **sottoscrivere** i singoli tipi di evento che devono essere inviati al webhook. Se un evento è **Unsubscribed**, Meta **non invia** nessun POST per quel tipo di evento.

- **Dove:**  
  Meta for Developers → tua App (es. Frostdesk) → **WhatsApp** → **Configuration** → sezione **Webhook** (o **Use cases** nella sidebar). Tabella **Webhook fields** / **Use cases**.

- **Evento obbligatorio per i messaggi in arrivo:**  
  **`messages`** — deve essere **Subscribed** (toggle attivo).  
  Se `messages` è **Unsubscribed**, Meta non invia mai i messaggi in entrata al Callback URL → l’API non riceve nulla → l’Inbox resta con dati vecchi (“Last message 10d ago”).

- **Cosa fare:**  
  1. Nella lista degli eventi (account_alerts, account_update, messages, message_echoes, ecc.) trovare **`messages`**.  
  2. Attivare il toggle **Subscribe** per **`messages`** (e salvare se richiesto).  
  3. Opzionale ma utile: **`message_echoes`** se vuoi ricevere anche le conferme di messaggi inviati; **`message_deliveries`** / **`message_reads`** per status di consegna/lettura.

Dopo aver sottoscritto **`messages`**, invia un messaggio di test dal numero WhatsApp collegato e verifica che in Meta compaiano chiamate al webhook e che l’Inbox si aggiorni (o usa Refresh).

---

## 3. Variabili d’ambiente (Railway – servizio API)

L’API legge queste variabili in `apps/api/src/routes/webhook_whatsapp.ts` e `apps/api/src/lib/startup_checks.ts`:

| Variabile | Uso | Obbligatoria (prod) |
|-----------|-----|----------------------|
| **META_APP_SECRET** oppure **META_WHATSAPP_APP_SECRET** | Firma HMAC-SHA256 delle richieste POST (X-Hub-Signature-256). Senza una delle due, il webhook risponde 500 e rifiuta i messaggi. | Sì |
| **META_WHATSAPP_VERIFY_TOKEN** oppure **META_VERIFY_TOKEN** | Token per la verifica GET del webhook da Meta. Deve coincidere con quello impostato in Meta (Callback URL verify token). | Sì (per verificare l’URL) |
| **META_WHATSAPP_TOKEN** | Token per chiamate outbound verso WhatsApp Cloud API (es. invio messaggi). Richiesto da startup check in prod. | Sì |
| **META_WHATSAPP_PHONE_NUMBER_ID** | Phone number ID Meta (usato per outbound e contesto). | Consigliata |
| **DEFAULT_INSTRUCTOR_ID** | Instructor a cui associare i messaggi quando il `phone_number_id` non è ancora associato (es. UUID da instructor_profiles.id). | Consigliata per multi-tenant |

In produzione, **senza META_APP_SECRET o META_WHATSAPP_APP_SECRET** le richieste POST al webhook vengono rifiutate e i messaggi non vengono mai salvati → l’Inbox non si aggiorna.

- **Dove controllare:**  
  Railway → progetto → servizio **API** → **Variables**.  
  Verificare che i valori siano corretti (nessuno spazio, token uguale a quello in Meta).

- **Come verificare che META_APP_SECRET (o META_WHATSAPP_APP_SECRET) sia giusta su Railway:**  
  Il valore deve essere **esattamente** l’**App Secret** dell’app Meta: Meta for Developers → tua App (es. Frostdesk) → **Settings** → **Basic** → **App Secret** (Show → copia). Su Railway imposta una delle due variabili (`META_APP_SECRET` oppure `META_WHATSAPP_APP_SECRET`) con quel valore, **senza spazi prima/dopo** e senza virgolette nel valore.  
  Se il valore è sbagliato o mancante: in produzione il webhook risponde **500** (secret not configured) o **401** (signature verification failed) e i messaggi non vengono salvati. Controlla i log Railway per `POST /webhook/whatsapp`: messaggi tipo `WEBHOOK_SECRET_NOT_CONFIGURED` o `INVALID_SIGNATURE` indicano che la variabile manca o non coincide con l’App Secret di Meta.

---

## 4. Polling e endpoint (frontend)

- **Endpoint usato per la lista conversazioni:**  
  **GET /instructor/conversations**  
  (chiamato da `getConversations()` in `apps/instructor/lib/instructorApi.ts`; base URL da `getApiBaseUrl()` che in browser passa dal proxy Next `/api` se configurato.)

- **Intervallo di polling:**  
  **5 secondi** (`usePolling(refreshConversationListSoft, 5000, !pollingBlocked)` in `HumanInboxPage.tsx`).  
  Il polling è “visibility-aware”: quando il tab non è visibile può non eseguire il tick, ma quando l’utente torna sulla pagina il refresh parte.

- **Messaggi della conversazione aperta:**  
  Polling ogni **2 secondi** (`useLivePolling` con `intervalMs: 2000`) per la conversazione selezionata.

Se l’endpoint e il polling fossero sbagliati, vedresti comunque dati “vecchi” coerenti con l’ultima risposta dell’API. Se l’API restituisce dati aggiornati ma la UI no, controllare cache/proxy. In genere il problema è che **l’API non riceve nuovi messaggi** (webhook o variabili), quindi i dati in DB restano vecchi.

---

## 5. Checklist operativa

- [ ] **Meta Use cases / Webhook fields: `messages` Subscribed**  
  In Meta → App → WhatsApp → Configuration (o Use cases), nella tabella Webhook fields verificare che **`messages`** sia **Subscribed** (toggle attivo). Se è Unsubscribed, Meta non invia i messaggi in arrivo → Inbox non si aggiorna. Vedi § 2b.

- [ ] **Meta Webhook URL**  
  Configuration → Callback URL = `https://TUO-DOMINIO-API/webhook/whatsapp` (es. Railway).  
  Verify token uguale a **META_WHATSAPP_VERIFY_TOKEN** / **META_VERIFY_TOKEN** su Railway.

- [ ] **Railway (API)**  
  Variabili impostate: **META_APP_SECRET** o **META_WHATSAPP_APP_SECRET**, **META_WHATSAPP_VERIFY_TOKEN** (o META_VERIFY_TOKEN), **META_WHATSAPP_TOKEN**.  
  Opzionale ma utile: **META_WHATSAPP_PHONE_NUMBER_ID**, **DEFAULT_INSTRUCTOR_ID**.

- [ ] **Log Meta**  
  In Meta, nella sezione Webhook, verificare che le chiamate per i messaggi risultino consegnate (nessun 4xx/5xx). Se ci sono errori, controllare i log Railway per **POST /webhook/whatsapp** (signature, 500, ecc.).

- [ ] **DB e instructor_id**  
  Ogni maestro ha il proprio numero WhatsApp nel profilo. La tabella **instructor_whatsapp_accounts** deve avere una riga per l’istruttore con **phone_number** in E.164. Al primo messaggio il webhook associa il **phone_number_id** di Meta a quella riga; le conversazioni vengono create con quell’**instructor_id** e compaiono nella sua Inbox. Se manca la riga o il numero non corrisponde, i messaggi possono andare all’istruttore di default (DEFAULT_INSTRUCTOR_ID) o non essere associati correttamente.

- [ ] **Refresh manuale**  
  In Inbox, pulsante **Refresh**: forza una nuova chiamata a GET /instructor/conversations. Se dopo aver inviato un messaggio di test da WhatsApp e cliccato Refresh la lista non si aggiorna, il problema è quasi certamente webhook o variabili (o DB), non il polling.

---

## 6. Riferimenti nel codice

| Cosa | File / route |
|------|-------------------------------|
| Webhook POST/GET | `apps/api/src/routes/webhook_whatsapp.ts` |
| Firma webhook | `META_APP_SECRET` / `META_WHATSAPP_APP_SECRET` in webhook_whatsapp.ts e `apps/api/src/lib/whatsapp_webhook_verify.js` |
| Verify token (GET) | `META_WHATSAPP_VERIFY_TOKEN` / `META_VERIFY_TOKEN` in webhook_whatsapp.ts |
| Lista conversazioni API | GET `/instructor/conversations` → `apps/api/src/routes/instructor/conversations.ts` → `getInstructorInbox(profile.id)` |
| Repository inbox | `packages/db/src/instructor_inbox_repository.ts` (`getInstructorInbox`) |
| Polling lista (5s) | `apps/instructor/components/inbox/HumanInboxPage.tsx` → `usePolling(refreshConversationListSoft, 5000, ...)` |
| Chiamata lista | `getConversations()` → GET `/instructor/conversations` in `apps/instructor/lib/instructorApi.ts` |

---

Dopo aver verificato webhook URL, variabili Meta e (se necessario) instructor_whatsapp_accounts + DEFAULT_INSTRUCTOR_ID, i nuovi messaggi dovrebbero essere persistiti e l’Inbox aggiornarsi entro pochi secondi (polling 5s). Se il problema persiste, i log Railway per **POST /webhook/whatsapp** e il log delle delivery in Meta sono il passo successivo per capire se le richieste arrivano e come risponde l’API.
