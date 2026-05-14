/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_AI_API_KEY?: string;
  readonly VITE_GOOGLE_AI_MODEL?: string;
  readonly VITE_GOOGLE_IMAGE_MODEL?: string;
  readonly VITE_GMAIL_REPLY_WEBHOOK_URL?: string;
  readonly VITE_GMAIL_SUPABASE_URL?: string;
  readonly VITE_GMAIL_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
