-- Outbound WhatsApp send queue: persistent jobs for reliable delivery with retry.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.outbound_send_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages (id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  destination_phone TEXT NOT NULL,
  message_text TEXT NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'dead')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  last_error TEXT,
  external_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_retry_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbound_send_jobs_idempotency_key
  ON public.outbound_send_jobs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outbound_send_jobs_status_next_retry
  ON public.outbound_send_jobs (status, next_retry_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_outbound_send_jobs_conversation_id
  ON public.outbound_send_jobs (conversation_id);

COMMENT ON TABLE public.outbound_send_jobs IS 'Queue of outbound WhatsApp messages; processed by worker with retry and rate limiting.';
