# TASK 14.1.6 — Admin UI Visibility Check (Manual Verification)

## 🎯 Obiettivo

Verificare che i messaggi WhatsApp inbound siano visibili nell'Admin Inbox dopo il webhook.

## ⚠️ GAP IDENTIFICATO

**Problema**: L'Admin Inbox interroga la tabella `messages`, ma il webhook WhatsApp persiste solo in `inbound_messages`.

- **Human Inbox Repository** (`packages/db/src/human_inbox_repository.ts`):
  - Query: `SELECT ... FROM messages WHERE ...`
  - Colonne attese: `direction`, `message_text`, `created_at`

- **WhatsApp Webhook** (`apps/api/src/routes/webhook_whatsapp.ts`):
  - Persistenza: `persistInboundMessage()` → `inbound_messages` table
  - Non inserisce in `messages` table

**Risultato atteso**: I messaggi potrebbero non essere visibili nell'inbox fino a quando non viene implementata la sincronizzazione tra `inbound_messages` e `messages`.

## 📋 Checklist Verifica Manuale

### STEP 1 — Preparazione Test Payload

Crea un payload mock WhatsApp valido:

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "id": "wamid.test-12345",
                "from": "393331234567",
                "timestamp": "1737744000",
                "type": "text",
                "text": {
                  "body": "Ciao, vorrei prenotare una lezione"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

### STEP 2 — Invio Webhook

```bash
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d @payload.json
```

**Verifica risposta**:
- ✅ HTTP 200
- ✅ `{ "ok": true }`

### STEP 3 — Verifica Database

Controlla che il messaggio sia stato persistito:

```sql
-- Verifica inbound_messages
SELECT 
  id,
  channel,
  conversation_id,
  external_message_id,
  sender_identity,
  message_text,
  received_at
FROM inbound_messages
WHERE channel = 'whatsapp'
  AND external_message_id = 'wamid.test-12345'
ORDER BY received_at DESC
LIMIT 1;

-- Verifica conversation creata
SELECT 
  c.id,
  c.channel,
  c.status,
  c.created_at
FROM conversations c
WHERE c.id = (
  SELECT conversation_id 
  FROM inbound_messages 
  WHERE external_message_id = 'wamid.test-12345'
  LIMIT 1
);
```

**Verifica**:
- ✅ Riga presente in `inbound_messages`
- ✅ Conversation creata con `channel = 'whatsapp'`
- ✅ `sender_identity` = numero WhatsApp

### STEP 4 — Verifica Admin Inbox UI

1. Apri browser: `http://localhost:3001/admin/human-inbox`
2. Verifica:
   - ✅ La conversazione appare nella lista
   - ✅ Channel = "whatsapp"
   - ✅ Last Message mostra il testo del messaggio
   - ✅ Timestamp corretto
   - ✅ Status badge visibile

**⚠️ SE IL MESSAGGIO NON APPARE**:
- Verifica che la query `human_inbox_repository.ts` interroghi anche `inbound_messages` OPPURE
- Implementa sincronizzazione `inbound_messages` → `messages` (task futuro)

### STEP 5 — Verifica Conversation Detail

1. Clicca sulla conversazione nell'inbox
2. Naviga a: `/admin/conversations/[conversationId]`
3. Verifica:
   - ✅ Messaggio visibile nella timeline
   - ✅ Testo completo del messaggio
   - ✅ Timestamp corretto
   - ✅ Sender identity = numero WhatsApp

## 🧪 Test Idempotenza

Invia lo stesso payload due volte:

```bash
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d @payload.json

# Attendi 2 secondi

curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d @payload.json
```

**Verifica**:
- ✅ Nessun errore di duplicato
- ✅ Nessuna riga duplicata in `inbound_messages`
- ✅ Stesso `conversation_id` per entrambe le chiamate

## ✅ Definition of Done

- [ ] Webhook risponde `{ ok: true }`
- [ ] Messaggio persistito in `inbound_messages`
- [ ] Conversation creata/resolta correttamente
- [ ] **Messaggio visibile in `/admin/human-inbox`** ← **CRITICO**
- [ ] Messaggio visibile in conversation detail
- [ ] Idempotenza verificata (no duplicati)

## 🛑 STOP CONDITION

Dopo questa verifica:

- ❌ **NON** aggiungere outbound
- ❌ **NON** chiamare AI
- ❌ **NON** creare booking
- ❌ **NON** anticipare task futuri

**Fermarsi e fare recap.**

## 📝 Note Tecniche

### Schema Tables

**`inbound_messages`** (dove persistiamo):
- `channel`, `conversation_id`, `external_message_id`
- `sender_identity`, `message_text`, `received_at`

**`messages`** (dove l'inbox cerca):
- `conversation_id`, `direction`, `message_text`
- `sender_identity`, `created_at`

### Possibili Soluzioni Future

1. **Opzione A**: Modificare `human_inbox_repository.ts` per unire `inbound_messages` e `messages`
2. **Opzione B**: Inserire anche in `messages` quando persistiamo `inbound_messages`
3. **Opzione C**: Creare una view materializzata che unisce le due tabelle

**Per ora**: Verificare manualmente se il gap impedisce la visibilità.
