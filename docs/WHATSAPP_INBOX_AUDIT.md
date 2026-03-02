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
  Se il valore è sbagliato o mancante: in produzione il webhook risponde **500** (secret not configured) o **401** (signature verification failed) e i messaggi non vengono salvati.   Controlla i log Railway per `POST /webhook/whatsapp`: messaggi tipo `WEBHOOK_SECRET_NOT_CONFIGURED` o `INVALID_SIGNATURE` indicano che la variabile manca o non coincide con l’App Secret di Meta.

---

## 3b. Secret giusto ma continua a non andare

Se **META_APP_SECRET** / **META_WHATSAPP_APP_SECRET** sono corretti ma l’Inbox ancora non si aggiorna, usa i log Railway per capire dove si blocca.

- **Ricevi 401 (INVALID_SIGNATURE)**  
  La firma non coincide anche se il secret è giusto. Cause possibili:  
  1. **Body modificato** da proxy o da Railway prima di arrivare all’app (es. parsing/ri-serializzazione JSON che cambia i byte). Nei log ora compare anche `bodyLength`: confrontalo con la dimensione che Meta invia.  
  2. **Secret con caratteri invisibili** (spazio, newline) copiati da Meta: ri-copia l’App Secret, incolla in un editor di testo, rimuovi spazi e a capo, poi incolla in Railway.  
  3. **Stai usando il Token invece dell’App Secret**: l’App Secret è in Settings → Basic → App Secret; il Token è in WhatsApp → API Setup. Devono essere diversi.

- **Non ricevi 401, ma l’Inbox non si aggiorna**  
  Il webhook arriva e la firma è OK. Cosa controllare:  
  1. **Log “WhatsApp inbound message persisted”**  
     Se dopo un messaggio di test **non** compare questo messaggio nei log Railway, la richiesta non arriva al punto di persist (es. errore prima: payload non valido, conversation non risolta, ecc.). Cerca nel log eventuali errori subito prima.  
  2. **Log “WhatsApp inbound message persisted” presente**  
     Allora il messaggio è stato salvato. Se non lo vedi in Inbox: stai guardando l’**istruttore giusto**? Il webhook usa `phone_number_id` / `display_phone_number` e **DEFAULT_INSTRUCTOR_ID**; le conversazioni compaiono nell’Inbox di quell’istruttore. Verifica che l’istruttore con cui fai login abbia il numero WhatsApp collegato in Impostazioni e che in `instructor_whatsapp_accounts` ci sia la riga con quel numero (o che **DEFAULT_INSTRUCTOR_ID** sia l’UUID di quell’istruttore).  
  3. **Errore dopo la persist**  
     Se c’è un’eccezione dopo `persistInboundMessageWithInboxBridge` (es. audit o orchestration), il webhook può restituire 5xx ma il messaggio potrebbe essere già in DB; controlla comunque i log per non perdere altri errori.

- **In Meta le chiamate al webhook risultano “delivered”**  
  Significa che Meta ha ricevuto 2xx. Se l’Inbox non si aggiorna, il problema è lato nostro (instructor_id, conversazione sbagliata, o frontend che non aggiorna). Usa **Refresh** in Inbox e controlla i log come sopra.

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

---

## 7. Setup Inbox WhatsApp per un nuovo istruttore (checklist step-by-step)

Ogni istruttore deve collegare **il proprio numero WhatsApp** (quello che riceve i messaggi) a Frostdesk. Nessuna variabile d’ambiente per istruttore: tutto è in DB e in Meta. Flusso: **numero che riceve in Meta** = stesso numero collegato in Frostdesk → messaggi in arrivo su quel numero compaiono nell’Inbox di quell’istruttore.

### Lato Frostdesk (istruttore)

1. **Login**  
   L’istruttore accede all’app Instructor (es. https://www.frostdesk.ai) con le proprie credenziali.

2. **Onboarding (se non completato)**  
   Nel form di onboarding inserire il **Telefono WhatsApp** in formato E.164 (es. `+393401234567`). Salvare. Questo crea/aggiorna il collegamento numero → istruttore in `instructor_whatsapp_accounts`.

3. **Impostazioni (se onboarding già fatto)**  
   Andare in **Impostazioni** → sezione **WhatsApp** (o “Collega WhatsApp”). Inserire o aggiornare il **numero WhatsApp** (E.164) che riceverà i messaggi dei clienti. Confermare. L’app chiama **POST /instructor/whatsapp/connect** e aggiorna `instructor_whatsapp_accounts` per quell’istruttore.

4. **Verifica in DB (opzionale)**  
   In `instructor_whatsapp_accounts` deve esistere una riga con `instructor_id` = UUID dell’istruttore e `phone_number` = numero in E.164. Il campo `phone_number_id` può essere `NULL` fino al primo messaggio ricevuto (il webhook lo completerà).

### Lato Meta (configurazione app / numeri)

5. **Numero che riceve i messaggi**  
   Il numero che l’istruttore ha inserito in Frostdesk deve essere un numero **WhatsApp Business** che **riceve** messaggi. In Meta for Developers → App (es. Frostdesk) → **WhatsApp** → **API Setup** (o **Configuration**): il numero deve essere aggiunto/registrato come numero che riceve messaggi (test number o numero di produzione collegato allo stesso WhatsApp Business Account).

6. **Webhook e sottoscrizioni (una sola volta per app)**  
   - **Callback URL**: `https://TUO-DOMINIO-API/webhook/whatsapp` (es. `https://frostdeskapi-production.up.railway.app/webhook/whatsapp`).  
   - **Verify token**: stesso valore di `META_WHATSAPP_VERIFY_TOKEN` (o `META_VERIFY_TOKEN`) su Railway.  
   - **Use cases**: evento **`messages`** deve essere **Subscribed**.  
   (Se già configurato per un altro istruttore, non ripetere.)

7. **Variabili API (Railway, una sola volta)**  
   Sul servizio API devono essere impostate: `META_APP_SECRET` (o `META_WHATSAPP_APP_SECRET`), `META_WHATSAPP_VERIFY_TOKEN` (o `META_VERIFY_TOKEN`), `META_WHATSAPP_TOKEN`. Opzionale: `META_WHATSAPP_PHONE_NUMBER_ID` (per outbound). Nessuna variabile “per istruttore”.

### Test

8. **Primo messaggio**  
   Un cliente (o l’istruttore da un altro numero) invia un messaggio **al** numero WhatsApp Business dell’istruttore (quello collegato in Frostdesk). Meta invia il webhook; il backend fa il match per `display_phone_number` (e aggiorna `phone_number_id` se era `NULL`). La conversazione viene creata/aggiornata con quell’`instructor_id`.

9. **Inbox**  
   L’istruttore apre **Inbox** su Frostdesk e clicca **Refresh** (o aspetta il polling 5s). La conversazione deve comparire con l’ultimo messaggio aggiornato.

### Riepilogo

| Dove | Cosa |
|------|------|
| **Frostdesk** | Istruttore collega il numero in Onboarding o Impostazioni → `instructor_whatsapp_accounts` |
| **Meta** | Il numero deve ricevere messaggi (numero Business); webhook e `messages` già configurati per l’app |
| **Nessuna variabile per istruttore** | Mapping numero → istruttore solo in DB; API usa le stesse variabili Meta per tutti |
