# Pilot Mock Payloads (Documentation Only)

This file contains example WhatsApp webhook payloads for pilot testing.
These are **documentation only** - not production code.

Use these payloads to simulate different customer scenarios without real WhatsApp integration.

---

## 1. Non-Booking Message

**Scenario:** Customer sends a general inquiry, not related to booking.

**Use case:** Test conversation creation, message persistence, and human inbox visibility.

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "id": "wamid.HBgNMTIzNDU2Nzg5MDEyABUSFgA5RkQ4QjY3MkE1N0I2ODdGAA==",
                "from": "393331234567",
                "timestamp": "1737744000",
                "type": "text",
                "text": {
                  "body": "Ciao, vorrei informazioni sui corsi di sci"
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

**Expected behavior:**
- Conversation created with `channel = 'whatsapp'`
- Message persisted in both `inbound_messages` and `messages` tables
- Message visible in Admin Human Inbox
- No booking created

---

## 2. Booking Request (Incomplete)

**Scenario:** Customer asks about booking but doesn't provide all required information.

**Use case:** Test conversation flow, message persistence, and human review workflow.

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "id": "wamid.HBgNMTIzNDU2Nzg5MDEyABUSFgA5RkQ4QjY3MkE1N0I2ODdGAB==",
                "from": "393339876543",
                "timestamp": "1737744100",
                "type": "text",
                "text": {
                  "body": "Vorrei prenotare una lezione per domani"
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

**Expected behavior:**
- Conversation created/resolved
- Message persisted
- Message visible in Admin Human Inbox
- Human can respond asking for missing details (date, time, duration)
- No booking created automatically (manual only in pilot)

---

## 3. Booking Follow-Up

**Scenario:** Customer responds to a previous conversation with additional booking details.

**Use case:** Test conversation resolution (existing conversation), message linking, and conversation continuity.

```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "id": "wamid.HBgNMTIzNDU2Nzg5MDEyABUSFgA5RkQ4QjY3MkE1N0I2ODdGAC==",
                "from": "393339876543",
                "timestamp": "1737744200",
                "type": "text",
                "text": {
                  "body": "Perfetto, alle 10:00 va bene. Quanto dura una lezione?"
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

**Expected behavior:**
- Conversation resolved via `channel_identity_mapping` (same phone number)
- Message linked to existing conversation
- Message persisted and visible in conversation timeline
- Conversation state remains `open` or `requires_human`

---

## Testing Instructions

### Using curl

```bash
# Replace with your API URL
API_URL="http://localhost:3000"

# Test non-booking message
curl -X POST ${API_URL}/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "id": "wamid.test.001",
          "from": "393331234567",
          "timestamp": "1737744000",
          "type": "text",
          "text": {
            "body": "Ciao, vorrei informazioni"
          }
        }]
      }
    }]
  }]
}
EOF
```

### Verification

After sending a mock payload, verify:

1. **Database:**
   ```sql
   -- Check inbound_messages
   SELECT * FROM inbound_messages 
   WHERE channel = 'whatsapp' 
   ORDER BY received_at DESC LIMIT 1;
   
   -- Check messages table
   SELECT * FROM messages 
   WHERE channel = 'whatsapp' AND direction = 'inbound'
   ORDER BY created_at DESC LIMIT 1;
   
   -- Check conversation
   SELECT * FROM conversations 
   WHERE channel = 'whatsapp' 
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Admin UI:**
   - Navigate to `/admin/human-inbox`
   - Verify message appears in inbox
   - Click conversation to see timeline

---

## Notes

- **Message IDs:** Use unique IDs for each test (e.g., `wamid.test.001`, `wamid.test.002`)
- **Phone numbers:** Use consistent phone numbers to test conversation resolution
- **Timestamps:** Use Unix timestamps (seconds since epoch)
- **Idempotency:** Sending the same payload twice should not create duplicates

---

## Important

⚠️ **These payloads are for PILOT TESTING ONLY**

- Do not use in production
- Do not commit real customer data
- Do not expose these payloads publicly
- Always validate and sanitize in production
