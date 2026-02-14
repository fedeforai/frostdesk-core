# Discovery: Spunte di ricezione (delivery / read receipts)

## Stato attuale

- **UI (MessageBubble):** supporta 5 stati per l’ultimo messaggio outbound:
  - `idle` — nessun badge
  - `sending` — "Sending…"
  - `sent` — ✓ Sent (grigio)
  - `delivered` — ✓✓ Delivered (grigio)
  - `read` — ✓✓ Read (blu)
- **InstructorConversationView:** dopo l’invio di una risposta:
  1. `sending` → chiamata API
  2. `sent` → successo
  3. dopo ~1.5–2.5 s → `delivered` (simulato)
  4. dopo altri ~1.2–2.2 s → `read` (simulato)

Quindi le spunte di **consegnato** e **letto** sono oggi **solo simulate** lato client (timeout); non c’è ancora persistenza né webhook.

## Cosa serve per spunte reali (WhatsApp / canali)

1. **Webhook / evento da canale**  
   Es. Meta Cloud API: aggiornamenti di stato messaggio (sent, delivered, read). Ricevere questi eventi e identificarli con un `message_id` (nostro o ID messaggio canale).

2. **Persistenza**  
   Decidere dove salvare lo stato:
   - opzione A: colonne su `messages` (es. `delivery_status`, `delivered_at`, `read_at`);
   - opzione B: tabella `message_status_events` (message_id, status, at, channel).

3. **API**  
   Esporre lo stato per messaggio (es. in GET conversazione o GET messaggi) in modo che il client non debba simulare.

4. **Client**  
   L’inbox instructor (HumanInboxPage e/o InstructorConversationView) deve usare lo stato restituito dall’API invece del timeout simulato; MessageBubble è già pronto per `sent` / `delivered` / `read`.

## Riferimenti

- `apps/instructor/components/MessageBubble.tsx` — tipo `ReplyStatus`, badge Sent/Delivered/Read
- `apps/instructor/components/InstructorConversationView.tsx` — flusso simulato sending → sent → delivered → read
- Eventuale webhook WhatsApp: vedi `DISCOVERY_CONVERSATION_INGESTION_AI_STATE_WHATSAPP.md` e integrazione con message status (delivery/read) quando disponibile
