-- Fix chat_logs: de-duplicate by session_id, add unique constraint, and create an
-- upsert RPC so the public chatbot can save conversations without RLS blocking the
-- pre-check SELECT (which currently causes a fresh INSERT for every patient message,
-- making the same conversation appear as multiple chat-log entries to the admin).

-- 1) De-duplicate existing chat_logs by session_id, keeping the row with the most messages
WITH ranked AS (
  SELECT id, session_id,
    ROW_NUMBER() OVER (
      PARTITION BY session_id
      ORDER BY jsonb_array_length(COALESCE(messages, '[]'::jsonb)) DESC,
               updated_at DESC,
               created_at DESC
    ) AS rn
  FROM public.chat_logs
)
DELETE FROM public.chat_logs c
USING ranked r
WHERE c.id = r.id AND r.rn > 1;

-- 2) Add unique constraint on session_id (now safe after dedupe)
ALTER TABLE public.chat_logs
  ADD CONSTRAINT chat_logs_session_id_key UNIQUE (session_id);

-- 3) Upsert RPC for chatbot conversations. Bypasses RLS via SECURITY DEFINER.
-- Whenever the patient sends a new message we also reset admin_read=false so
-- the admin dashboard re-flags the conversation as needing attention.
CREATE OR REPLACE FUNCTION public.upsert_chat_log_messages(
  p_session_id text,
  p_messages jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_session_id IS NULL OR length(p_session_id) = 0 THEN
    RAISE EXCEPTION 'Missing session_id';
  END IF;
  IF p_messages IS NULL OR jsonb_typeof(p_messages) <> 'array' THEN
    RAISE EXCEPTION 'Messages must be a JSON array';
  END IF;
  IF length(p_messages::text) > 200000 THEN
    RAISE EXCEPTION 'Conversation too large';
  END IF;

  INSERT INTO public.chat_logs (session_id, messages, admin_read)
  VALUES (p_session_id, p_messages, false)
  ON CONFLICT (session_id) DO UPDATE
    SET messages = EXCLUDED.messages,
        admin_read = false,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_chat_log_messages(text, jsonb) TO anon, authenticated;