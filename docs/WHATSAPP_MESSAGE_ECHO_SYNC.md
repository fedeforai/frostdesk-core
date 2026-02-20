# WhatsApp message echo sync (inbox ↔ app)

When the business (instructor) replies **from the WhatsApp app** on their phone, that message is also visible on WhatsApp for the customer but was not previously stored in Frostdesk. This feature syncs those "echo" messages into the Frostdesk inbox so the thread stays consistent.

## How it works

1. **Detection**  
   The webhook `POST /webhook/whatsapp` receives the same Meta payload for both:
   - **Inbound:** customer → business (`message.from` = customer).
   - **Echo:** business → customer, sent from the business phone (`message.from` = business number).

   We treat the event as an echo when `value.metadata.display_phone_number` exists and matches `message.from` (after normalizing phones).

2. **Resolution**  
   For an echo, the customer is the **recipient** of the message: `message.to`. We resolve the conversation with `resolveConversationByChannel('whatsapp', message.to, instructorId)`.

3. **Persistence**  
   We insert one row into `messages` with `direction = 'outbound'`, `sender_identity = 'whatsapp_echo'`, and the echo `external_message_id`. Persistence is **idempotent** on `(conversation_id, external_message_id)` so retries do not create duplicates.

## Meta configuration

- The **same** webhook URL is used for inbound and for echoes.
- Meta includes `metadata.display_phone_number` in the payload when the message is sent from the business number; we use it to detect echoes. No extra env vars are required.
- If you use a **WhatsApp Business Account** and the "message echoes" (or similar) subscription, ensure the webhook is subscribed to the **messages** field so you receive both incoming messages and echoes. In Meta for Developers → your app → WhatsApp → Configuration → Webhook fields, subscribe to **messages**.

## Behaviour summary

| Source of message        | Stored in Frostdesk? | How |
|--------------------------|----------------------|-----|
| Customer sends to business | Yes                 | Inbound path: `persistInboundMessageWithInboxBridge` |
| Business replies from Frostdesk | Yes            | Manual send path: `persistOutboundMessage` + API send |
| Business replies from WhatsApp app | Yes        | Echo path: `persistOutboundMessageFromEcho` |

After this, the inbox is effectively **simultaneous**: messages from the customer and replies from the business (from Frostdesk or from WhatsApp) all appear in the same thread.
