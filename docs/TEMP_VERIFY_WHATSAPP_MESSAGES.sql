-- TEMPORARY SQL VERIFICATION QUERIES
-- Do not commit this file
-- Use these queries to verify WhatsApp message persistence after webhook

-- ============================================================================
-- 1) Verify inbound_messages contains the WhatsApp message
-- ============================================================================

-- Check all WhatsApp inbound messages
SELECT 
  id,
  channel,
  conversation_id,
  external_message_id,
  sender_identity,
  message_type,
  message_text,
  received_at,
  created_at
FROM inbound_messages
WHERE channel = 'whatsapp'
ORDER BY received_at DESC
LIMIT 10;

-- Check specific message by external_message_id (replace with actual WhatsApp message ID)
-- SELECT 
--   id,
--   channel,
--   conversation_id,
--   external_message_id,
--   sender_identity,
--   message_text,
--   received_at
-- FROM inbound_messages
-- WHERE channel = 'whatsapp'
--   AND external_message_id = 'wamid.XXXXX'; -- Replace with actual WhatsApp message ID

-- ============================================================================
-- 2) Verify messages contains the same message with direction='inbound'
-- ============================================================================

-- Check all inbound messages in messages table
SELECT 
  id,
  conversation_id,
  channel,
  direction,
  message_text,
  sender_identity,
  external_message_id,
  created_at
FROM messages
WHERE direction = 'inbound'
  AND channel = 'whatsapp'
ORDER BY created_at DESC
LIMIT 10;

-- Check specific conversation messages
-- SELECT 
--   id,
--   conversation_id,
--   direction,
--   message_text,
--   sender_identity,
--   created_at
-- FROM messages
-- WHERE conversation_id = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' -- Replace with actual conversation_id
-- ORDER BY created_at ASC;

-- ============================================================================
-- 3) Verify conversation_id matches between both tables
-- ============================================================================

-- Join query to verify messages exist in both tables with matching conversation_id
SELECT 
  im.id AS inbound_message_id,
  im.external_message_id,
  im.conversation_id AS inbound_conversation_id,
  im.message_text AS inbound_message_text,
  im.received_at AS inbound_received_at,
  m.id AS message_id,
  m.conversation_id AS message_conversation_id,
  m.direction,
  m.message_text AS message_text,
  m.created_at AS message_created_at,
  CASE 
    WHEN im.conversation_id = m.conversation_id THEN 'MATCH'
    ELSE 'MISMATCH'
  END AS conversation_match
FROM inbound_messages im
LEFT JOIN messages m ON (
  m.conversation_id = im.conversation_id
  AND m.external_message_id = im.external_message_id
  AND m.direction = 'inbound'
  AND m.channel = 'whatsapp'
)
WHERE im.channel = 'whatsapp'
ORDER BY im.received_at DESC
LIMIT 20;

-- ============================================================================
-- 4) Verify conversation exists and has correct channel
-- ============================================================================

-- Check conversations linked to WhatsApp messages
SELECT DISTINCT
  c.id AS conversation_id,
  c.channel,
  c.status,
  c.ai_enabled,
  c.created_at AS conversation_created_at,
  COUNT(im.id) AS inbound_message_count,
  COUNT(m.id) AS message_count
FROM conversations c
LEFT JOIN inbound_messages im ON im.conversation_id = c.id AND im.channel = 'whatsapp'
LEFT JOIN messages m ON m.conversation_id = c.id AND m.channel = 'whatsapp' AND m.direction = 'inbound'
WHERE c.channel = 'whatsapp'
GROUP BY c.id, c.channel, c.status, c.ai_enabled, c.created_at
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================================
-- 5) Quick verification: Count messages by table
-- ============================================================================

-- Count WhatsApp messages in each table
SELECT 
  'inbound_messages' AS table_name,
  COUNT(*) AS message_count
FROM inbound_messages
WHERE channel = 'whatsapp'
UNION ALL
SELECT 
  'messages (inbound)' AS table_name,
  COUNT(*) AS message_count
FROM messages
WHERE channel = 'whatsapp' AND direction = 'inbound';
