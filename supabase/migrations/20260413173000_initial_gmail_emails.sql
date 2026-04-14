-- Initial Gmail AI dashboard schema
-- Matches fields used in components/GmailAIDashboardPage.tsx

CREATE TABLE IF NOT EXISTS public.emails (
  id TEXT PRIMARY KEY,
  from_email TEXT NOT NULL,
  subject TEXT,
  text TEXT NOT NULL,
  ai_reply TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'draft', 'sent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON public.emails (from_email);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails (status);
CREATE INDEX IF NOT EXISTS idx_emails_subject ON public.emails (subject);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_emails_updated_at ON public.emails;
CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for all users" ON public.emails;
CREATE POLICY "Enable all operations for all users" ON public.emails
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.emails TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1
       FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'emails'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
  END IF;
END
$$;
