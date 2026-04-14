-- Telegram HITL review session table
-- Stores temporary review state for approve/reject/edit actions in Telegram.

CREATE TABLE IF NOT EXISTS public.telegram_ai_reviews (
  review_id TEXT PRIMARY KEY,
  email_id TEXT,
  from_email TEXT,
  subject TEXT,
  original_text TEXT,
  ai_reply TEXT,
  chat_message TEXT,
  chat_id TEXT,
  callback_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'edited', 'regenerated', 'approved', 'rejected', 'cancelled')
  ),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_ai_reviews_status ON public.telegram_ai_reviews (status);
CREATE INDEX IF NOT EXISTS idx_telegram_ai_reviews_created_at ON public.telegram_ai_reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telegram_ai_reviews_email_id ON public.telegram_ai_reviews (email_id);
CREATE INDEX IF NOT EXISTS idx_telegram_ai_reviews_chat_id ON public.telegram_ai_reviews (chat_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_telegram_ai_reviews_updated_at ON public.telegram_ai_reviews;
CREATE TRIGGER update_telegram_ai_reviews_updated_at
  BEFORE UPDATE ON public.telegram_ai_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.telegram_ai_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for all users" ON public.telegram_ai_reviews;
CREATE POLICY "Enable all operations for all users" ON public.telegram_ai_reviews
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.telegram_ai_reviews TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'telegram_ai_reviews'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_ai_reviews;
  END IF;
END
$$;
