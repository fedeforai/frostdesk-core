# Pilot Verification Checklist

This checklist verifies that all pilot-blocking issues are resolved.

---

## ✅ Checklist

### 1. API Server Starts Without Errors

```bash
npm run dev -w @frostdesk/api
```

**Expected:**
- Server starts on port 3000 (or configured port)
- No module resolution errors
- No missing export errors
- All routes registered successfully

**Status:** ⬜ Not verified

---

### 2. Admin UI Builds Successfully

```bash
npm run dev -w apps/admin
```

**Expected:**
- Next.js dev server starts
- No build errors
- No TypeScript errors
- No import errors from `@frostdesk/db` in Next.js pages

**Status:** ⬜ Not verified

---

### 3. WhatsApp Webhook Responds Correctly

```bash
curl -X POST http://localhost:3000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "id": "wamid.test.001",
            "from": "393331234567",
            "timestamp": "1737744000",
            "type": "text",
            "text": {
              "body": "Test message"
            }
          }]
        }
      }]
    }]
  }'
```

**Expected:**
- Response: `{ "ok": true }`
- HTTP 200 status
- No errors in server logs

**Status:** ⬜ Not verified

---

### 4. Message Visible in Admin Inbox

**Steps:**
1. Send webhook payload (step 3)
2. Navigate to `/admin/human-inbox`
3. Verify message appears in inbox

**Expected:**
- Message visible in inbox list
- Channel shows "whatsapp"
- Last message text visible
- Timestamp correct

**Status:** ⬜ Not verified

---

### 5. Manual Reply Disables AI

**Steps:**
1. Navigate to conversation detail page
2. Send a manual outbound message via `ConversationSendBox`
3. Verify AI is disabled

**Expected:**
- Message sent successfully
- `ai_enabled` set to `false` in database
- AI mode toggle shows "Paused"
- Badge "AI paused by human" appears

**Verification SQL:**
```sql
SELECT id, ai_enabled, updated_at
FROM conversations
WHERE id = '<conversation-id>'
ORDER BY updated_at DESC
LIMIT 1;
```

**Status:** ⬜ Not verified

---

### 6. Badge "AI paused by human" Visible

**Steps:**
1. Send manual outbound message (step 5)
2. Reload conversation detail page
3. Verify badge appears

**Expected:**
- Badge visible next to AI mode toggle
- Badge text: "AI paused by human"
- Badge only appears when:
  - `ai_enabled === false`
  - AND last outbound message was from human
  - AND human message is more recent than any AI event

**Status:** ⬜ Not verified

---

## 🎯 Success Criteria

All 6 items must pass for pilot to be unblocked.

---

## 📝 Notes

- If any item fails, document the error and fix before proceeding
- All fixes must respect RALPH-safe constraints
- No schema changes allowed
- No new features beyond what's needed for pilot
