import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import {
  AlertCircle,
  Bold,
  Clock,
  Copy,
  Database,
  Edit3,
  ExternalLink,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings,
  Sparkles,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'react-toastify';

import { isGmailGeminiConfigured, suggestGmailAiReplyHtml } from '../services/gmailAiReplyService';

type EmailStatus = 'pending' | 'sent' | 'draft';

type SetupStatus = {
  isSetup: boolean;
  error?: string;
};

type WebhookResult = {
  success: boolean;
  error?: string;
};

interface EmailRecord {
  id: string;
  from_email: string;
  subject: string | null;
  text: string;
  ai_reply: string | null;
  status: EmailStatus;
  created_at: string;
  updated_at: string;
}

interface EmailInsertPayload {
  id: string;
  from_email: string;
  subject?: string;
  text: string;
  ai_reply?: string;
  status: EmailStatus;
}

interface EmailUpdatePayload {
  subject?: string;
  ai_reply?: string;
  status?: EmailStatus;
  updated_at?: string;
}

const DEFAULT_WEBHOOK_URL =
  'https://n8n-production-bbef9.up.railway.app/webhook/14d0be78-8198-4117-a0c5-4e75f2de9d57';

const LEGACY_WEBHOOK_TOKEN = '4c4c9dda-6bae-4d15-988a-d4ce8dd28228';

const configuredWebhookUrl = (import.meta.env.VITE_GMAIL_REPLY_WEBHOOK_URL || '').trim();
const WEBHOOK_URL =DEFAULT_WEBHOOK_URL

const SUPABASE_URL = "https://cebbqkpenodkviegawnr.supabase.co"

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlYmJxa3Blbm9ka3ZpZWdhd25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTcyNzQsImV4cCI6MjA4NTY5MzI3NH0.bgeWRIWFR1dFxnhbfxuG4KxxsnfKtPLS19PAFzm0RvQ"

const SQL_SCRIPTS = [
  {
    name: '1. Create Table',
    description: 'Creates the emails table with full structure (subject + status included).',
    sql: `-- Create the emails table
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

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON public.emails(from_email);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_subject ON public.emails(subject);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_emails_updated_at ON public.emails;
CREATE TRIGGER update_emails_updated_at
  BEFORE UPDATE ON public.emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();`,
  },
  {
    name: '2. Setup Security + Realtime',
    description: 'Enable RLS policies and subscribe the table to Supabase Realtime.',
    sql: `ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

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
$$;`,
  },
  {
    name: '3. Add Sample Data',
    description: 'Insert sample records for testing full flow.',
    sql: `INSERT INTO public.emails (id, from_email, subject, text, ai_reply, status)
VALUES
(
  'msg_001',
  'customer@example.com',
  'Missing package support request',
  'Hi, I am having trouble with my recent order. Tracking says delivered but I did not receive it. Can you help?',
  '<p>Thank you for reaching out. I understand your concern and I am checking this with our shipping partner right away. I will get back to you with next steps within 24 hours.</p>',
  'pending'
),
(
  'msg_002',
  'support@client.com',
  'Project requirements meeting',
  'We need to schedule a meeting to discuss the new project requirements. Are you available next week?',
  '<p>I would be happy to schedule this. I am available Tuesday, Wednesday, and Friday afternoon next week. Let me know your preferred time and I will send a calendar invite.</p>',
  'draft'
),
(
  'msg_003',
  'billing@company.com',
  'Invoice mismatch',
  'There seems to be an error on our latest invoice. The amount charged does not match our agreed pricing.',
  '<p>Thank you for flagging this. I have escalated your case to billing and we are reviewing the discrepancy now. We will send a corrected invoice within 2 business days.</p>',
  'sent'
)
ON CONFLICT (id) DO NOTHING;`,
  },
] as const;

const tableMissingError = (message: string): boolean => {
  const normalized = message.toLowerCase();
  return normalized.includes('relation') && normalized.includes('emails') && normalized.includes('does not exist');
};

const toLocalDate = (dateString: string): string => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString();
};

const sanitizeHtml = (value: string): string => {
  if (!value.trim()) return '';
  return value;
};

const HtmlToolbarEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const execCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
  };

  const addLink = () => {
    const link = window.prompt('Enter URL');
    if (!link) return;
    execCommand('createLink', link);
  };

  return (
    <div className={className || ''}>
      <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
        >
          <Bold size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
        >
          <Italic size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
        >
          <List size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
        >
          <ListOrdered size={15} />
        </button>
        <button
          type="button"
          onClick={addLink}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white"
        >
          <LinkIcon size={15} />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        className="min-h-[110px] rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-primary/20"
      />
    </div>
  );
};

const StatusBadge: React.FC<{ status: EmailStatus }> = ({ status }) => {
  const statusStyle =
    status === 'sent'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'draft'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-100 text-slate-800';

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${statusStyle}`}>
      {status}
    </span>
  );
};

const DatabaseSetupView: React.FC<{
  setupStatus: SetupStatus | null;
  isCheckingSetup: boolean;
  hasSupabaseUrl: boolean;
  hasSupabaseKey: boolean;
  onCheckSetup: () => Promise<void>;
}> = ({
  setupStatus,
  isCheckingSetup,
  hasSupabaseUrl,
  hasSupabaseKey,
  onCheckSetup,
}) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('SQL script copied');
    } catch {
      toast.error('Could not copy script. Please copy manually.');
    }
  };

  return (
    <div className="min-h-screen px-2 py-4 sm:px-4 sm:py-6 lg:px-10">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="mb-6 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-2xl bg-teal-primary/10 p-3 text-teal-primary">
            <Database size={30} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-deep-teal sm:text-3xl">Database Setup Required</h1>
          <p className="mt-2 text-xs text-slate-600 sm:text-sm">
            The Gmail table is not available yet. Run the SQL scripts below in your Supabase project.
          </p>
        </div>

        <div className="mb-6 flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle size={18} />
            <span className="text-sm font-semibold">Database Status</span>
          </div>
          <button
            onClick={() => void onCheckSetup()}
            disabled={isCheckingSetup}
            className="inline-flex items-center rounded-xl bg-deep-teal px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {isCheckingSetup ? (
              <>
                <RefreshCw size={14} className="mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Database size={14} className="mr-2" />
                Test Connection
              </>
            )}
          </button>
        </div>

        {setupStatus && (
          <div
            className={`mb-6 rounded-xl border p-3 text-sm ${
              setupStatus.isSetup
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {setupStatus.isSetup ? 'Database is configured correctly.' : setupStatus.error}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="mb-3 font-serif text-xl font-bold text-deep-teal">Setup Instructions</h2>
          <ol className="space-y-1 text-sm text-slate-700">
            <li>1. Open the Supabase SQL editor for your project.</li>
            <li>2. Run each script below in order.</li>
            <li>3. Return here and click Test Connection.</li>
            <li>
              4. Supabase dashboard: {' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center font-semibold text-teal-primary hover:underline"
              >
                Open dashboard <ExternalLink size={13} className="ml-1" />
              </a>
            </li>
          </ol>
        </div>

        <div className="space-y-4">
          {SQL_SCRIPTS.map((script) => (
            <div key={script.name} className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800">{script.name}</p>
                  <p className="text-xs text-slate-500">{script.description}</p>
                </div>
                <button
                  onClick={() => void copyToClipboard(script.sql)}
                  className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy size={13} className="mr-1" />
                  Copy
                </button>
              </div>
              <pre className="max-h-56 overflow-auto bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">{script.sql}</pre>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-teal-light/20 bg-teal-primary/5 p-4">
          <h3 className="mb-3 font-serif text-lg font-bold text-deep-teal">Environment Variables</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>VITE_GMAIL_SUPABASE_URL (or VITE_SUPABASE_URL)</span>
              <span className={`font-semibold ${hasSupabaseUrl ? 'text-emerald-700' : 'text-rose-700'}`}>
                {hasSupabaseUrl ? 'Set' : 'Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
              <span>VITE_GMAIL_SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY)</span>
              <span className={`font-semibold ${hasSupabaseKey ? 'text-emerald-700' : 'text-rose-700'}`}>
                {hasSupabaseKey ? 'Set' : 'Missing'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmailCard: React.FC<{
  email: EmailRecord;
  onUpdateEmail: (id: string, updates: EmailUpdatePayload) => Promise<EmailRecord>;
  onDeleteEmail: (id: string) => Promise<void>;
  onSendReply: (email: EmailRecord) => Promise<WebhookResult>;
  compact?: boolean;
}> = ({ email, onUpdateEmail, onDeleteEmail, onSendReply, compact = false }) => {
  const [isEditingReply, setIsEditingReply] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editedReply, setEditedReply] = useState(email.ai_reply || '');
  const [editedSubject, setEditedSubject] = useState(email.subject || '');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isGeminiReplyLoading, setIsGeminiReplyLoading] = useState(false);

  useEffect(() => {
    setEditedReply(email.ai_reply || '');
  }, [email.ai_reply]);

  useEffect(() => {
    setEditedSubject(email.subject || '');
  }, [email.subject]);

  const handleSaveSubject = async () => {
    setIsActionLoading(true);
    try {
      await onUpdateEmail(email.id, { subject: editedSubject.trim() });
      setIsEditingSubject(false);
      toast.success('Subject updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update subject');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveReply = async () => {
    if (!editedReply.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    setIsActionLoading(true);
    try {
      await onUpdateEmail(email.id, { ai_reply: sanitizeHtml(editedReply) });
      setIsEditingReply(false);
      toast.success('AI reply updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update AI reply');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this email?')) return;

    setIsActionLoading(true);
    try {
      await onDeleteEmail(email.id);
      toast.success('Email deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete email');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!email.ai_reply) {
      toast.error('No AI reply available to send');
      return;
    }

    setIsActionLoading(true);
    try {
      const result = await onSendReply(email);
      if (result.success) {
        toast.success(`Reply sent to ${email.from_email} and webhook delivered`);
      } else {
        toast.warn(`Reply marked as sent but webhook failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reply');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGeminiReplyIdea = async () => {
    if (!isGmailGeminiConfigured()) {
      toast.error('Set VITE_GOOGLE_AI_API_KEY (and optionally VITE_GOOGLE_AI_MODEL) in your environment');
      return;
    }
    if (!email.text.trim()) {
      toast.error('Original message is empty');
      return;
    }

    setIsGeminiReplyLoading(true);
    try {
      const html = await suggestGmailAiReplyHtml({
        from_email: email.from_email,
        subject: email.subject,
        text: email.text,
        previous_reply_html: isEditingReply ? editedReply : email.ai_reply,
      });
      setEditedReply(sanitizeHtml(html));
      setIsEditingReply(true);
      toast.success('AI regenerated a fresh draft — review and save');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI regeneration failed');
    } finally {
      setIsGeminiReplyLoading(false);
    }
  };

  const showGeminiReplyIdea = email.status !== 'sent';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Mail size={15} className="text-slate-500" />
            <p className="truncate text-sm font-semibold text-slate-800">{email.from_email}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isEditingSubject ? (
              <>
                <input
                  type="text"
                  value={editedSubject}
                  onChange={(event) => setEditedSubject(event.target.value)}
                  placeholder="Enter subject"
                  className="w-full min-w-0 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-primary/20 sm:w-[260px]"
                />
                <button
                  onClick={() => void handleSaveSubject()}
                  disabled={isActionLoading}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-teal-primary hover:bg-teal-primary/10"
                >
                  <Save size={13} />
                </button>
                <button
                  onClick={() => {
                    setEditedSubject(email.subject || '');
                    setIsEditingSubject(false);
                  }}
                  disabled={isActionLoading}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <X size={13} />
                </button>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-500">{email.subject || 'No subject'}</span>
                <button
                  onClick={() => setIsEditingSubject(true)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  <Edit3 size={13} />
                </button>
              </>
            )}
            <StatusBadge status={email.status} />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:justify-end">
          <span className={`rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-600 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {toLocalDate(email.created_at)}
          </span>
          <button
            onClick={() => void handleDelete()}
            disabled={isActionLoading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      <section className="mb-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Original Message</p>
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{email.text}</p>
      </section>

      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">AI Reply</p>
          <div className="flex flex-wrap items-center gap-1">
            {showGeminiReplyIdea && (
              <button
                type="button"
                onClick={() => void handleGeminiReplyIdea()}
                disabled={isActionLoading || isGeminiReplyLoading}
                title="Regenerate reply with AI while keeping original intent"
                className="inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
              >
                <Sparkles size={13} className={compact ? '' : 'mr-1'} />
                {!compact && (isGeminiReplyLoading ? 'Regenerating…' : 'AI Regenerate')}
              </button>
            )}
            {!isEditingReply && (
              <button
                type="button"
                onClick={() => setIsEditingReply(true)}
                className="inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                <Edit3 size={13} className={compact ? '' : 'mr-1'} />
                {!compact && 'Edit'}
              </button>
            )}
          </div>
        </div>

        {isEditingReply ? (
          <div>
            <HtmlToolbarEditor value={editedReply} onChange={setEditedReply} className="mb-2" />
            <div className="flex flex-wrap items-center gap-2">
              {showGeminiReplyIdea && (
                <button
                  type="button"
                  onClick={() => void handleGeminiReplyIdea()}
                  disabled={isActionLoading || isGeminiReplyLoading}
                  className="inline-flex items-center rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 disabled:opacity-60"
                >
                  <Sparkles size={13} className="mr-1" />
                  {isGeminiReplyLoading ? 'Regenerating…' : 'AI Regenerate'}
                </button>
              )}
              <button
                onClick={() => void handleSaveReply()}
                disabled={isActionLoading}
                className="inline-flex items-center rounded-lg bg-teal-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                <Save size={13} className="mr-1" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditedReply(email.ai_reply || '');
                  setIsEditingReply(false);
                }}
                disabled={isActionLoading}
                className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
              >
                <X size={13} className="mr-1" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div
              className="prose prose-sm max-w-none rounded-xl border border-teal-light/20 bg-teal-primary/5 p-3 text-sm"
              dangerouslySetInnerHTML={{
                __html: email.ai_reply || '<p class="text-slate-500">No AI reply generated yet</p>',
              }}
            />

            {email.status !== 'sent' && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                
                {email.ai_reply && (
                  <button
                    onClick={() => void handleSendReply()}
                    disabled={isActionLoading}
                    className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Send size={13} className="mr-1" />
                    Send Reply
                  </button>
                )}
              </div>
            )}

            {email.ai_reply && email.status === 'sent' && (
              <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                <Send size={12} className="mr-1" />
                Sent
              </span>
            )}
          </div>
        )}
      </section>
    </article>
  );
};

export const GmailAIDashboardPage: React.FC = () => {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false,
  );

  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [debugConnectionStatus, setDebugConnectionStatus] = useState('unknown');
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [showAdvancedAddFields, setShowAdvancedAddFields] = useState<boolean>(() =>
    typeof window !== 'undefined' ? !window.matchMedia('(max-width: 767px)').matches : true,
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isGeminiSuggestingNewEmail, setIsGeminiSuggestingNewEmail] = useState(false);
  const [newEmail, setNewEmail] = useState<{
    from_email: string;
    subject: string;
    text: string;
    ai_reply: string;
    status: EmailStatus;
  }>({
    from_email: '',
    subject: '',
    text: '',
    ai_reply: '',
    status: 'pending',
  });

  const statusMapRef = useRef<Record<string, EmailStatus>>({});

  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }, []);

  const fetchEmails = useCallback(async (): Promise<EmailRecord[]> => {
    if (!supabase) {
      throw new Error('Missing Supabase configuration. Set VITE_GMAIL_SUPABASE_URL and VITE_GMAIL_SUPABASE_ANON_KEY.');
    }

    const { data, error: queryError } = await supabase
      .from('emails')
      .select('*')
      .order('created_at', { ascending: false });

    if (queryError) {
      if (tableMissingError(queryError.message)) {
        throw new Error('DATABASE_NOT_SETUP');
      }
      throw new Error(`Failed to fetch emails: ${queryError.message}`);
    }

    return (data || []) as EmailRecord[];
  }, [supabase]);

  const checkDatabaseSetup = useCallback(async (): Promise<SetupStatus> => {
    if (!supabase) {
      return {
        isSetup: false,
        error: 'Missing Supabase environment variables. Configure VITE_GMAIL_SUPABASE_URL and VITE_GMAIL_SUPABASE_ANON_KEY.',
      };
    }

    try {
      const { error: checkError } = await supabase
        .from('emails')
        .select('*', { head: true, count: 'exact' })
        .limit(1);

      if (checkError) {
        if (tableMissingError(checkError.message)) {
          return { isSetup: false, error: "Table 'emails' does not exist. Run the setup scripts." };
        }
        return { isSetup: false, error: checkError.message };
      }

      return { isSetup: true };
    } catch (caughtError) {
      return {
        isSetup: false,
        error: caughtError instanceof Error ? caughtError.message : 'Unknown database error',
      };
    }
  }, [supabase]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!supabase) {
      setIsConnected(false);
      return false;
    }

    setIsCheckingConnection(true);
    try {
      const { error: pingError } = await supabase
        .from('emails')
        .select('*', { head: true, count: 'exact' })
        .limit(1);
      const connected = !pingError;
      setIsConnected(connected);
      return connected;
    } catch {
      setIsConnected(false);
      return false;
    } finally {
      setIsCheckingConnection(false);
    }
  }, [supabase]);

  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const connected = await checkConnection();
      if (!connected) {
        setDebugConnectionStatus('Connection failed');
        return;
      }

      const data = await fetchEmails();
      setDebugConnectionStatus(`Connected - ${data.length} emails found`);
    } catch (caughtError) {
      setDebugConnectionStatus(
        caughtError instanceof Error ? `Diagnostics failed: ${caughtError.message}` : 'Diagnostics failed',
      );
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const loadEmails = useCallback(async () => {
    const data = await fetchEmails();
    setEmails(data);
    const statusMap: Record<string, EmailStatus> = {};
    data.forEach((item) => {
      statusMap[item.id] = item.status;
    });
    statusMapRef.current = statusMap;
  }, [fetchEmails]);

  const initializeDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const setup = await checkDatabaseSetup();
    setSetupStatus(setup);

    if (!setup.isSetup) {
      setNeedsSetup(true);
      setIsLoading(false);
      return;
    }

    try {
      setNeedsSetup(false);
      await loadEmails();
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.message === 'DATABASE_NOT_SETUP') {
        setNeedsSetup(true);
      } else {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load emails');
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkDatabaseSetup, loadEmails]);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const applyMobileState = (matches: boolean) => {
      setIsMobile(matches);
      if (!matches) {
        setShowAdvancedAddFields(true);
      }
    };

    applyMobileState(mobileQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      applyMobileState(event.matches);
    };

    if (typeof mobileQuery.addEventListener === 'function') {
      mobileQuery.addEventListener('change', listener);
      return () => mobileQuery.removeEventListener('change', listener);
    }

    mobileQuery.addListener(listener);
    return () => mobileQuery.removeListener(listener);
  }, []);

  useEffect(() => {
    void initializeDashboard();
  }, [initializeDashboard]);

  useEffect(() => {
    void checkConnection();
    const interval = window.setInterval(() => {
      void checkConnection();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [checkConnection]);

  useEffect(() => {
    if (!supabase || needsSetup) return;

    let isMounted = true;

    const channel: RealtimeChannel = supabase
      .channel('gmail-emails-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emails' },
        (payload) => {
          if (!isMounted) return;
          const newEmail = payload.new as EmailRecord;
          statusMapRef.current[newEmail.id] = newEmail.status;

          setEmails((previous) => {
            const exists = previous.some((entry) => entry.id === newEmail.id);
            if (exists) {
              return previous.map((entry) => (entry.id === newEmail.id ? newEmail : entry));
            }
            return [newEmail, ...previous];
          });

          toast.info(`New email from ${newEmail.from_email}`);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emails' },
        (payload) => {
          if (!isMounted) return;
          const updatedEmail = payload.new as EmailRecord;
          const previousStatus = statusMapRef.current[updatedEmail.id];
          statusMapRef.current[updatedEmail.id] = updatedEmail.status;

          setEmails((previous) =>
            previous.map((entry) => (entry.id === updatedEmail.id ? updatedEmail : entry)),
          );

          if (previousStatus && previousStatus !== updatedEmail.status) {
            toast.info(`Email ${updatedEmail.id} changed to ${updatedEmail.status}`);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'emails' },
        (payload) => {
          if (!isMounted) return;
          const deletedId = String(payload.old.id);
          delete statusMapRef.current[deletedId];
          setEmails((previous) => previous.filter((entry) => entry.id !== deletedId));
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [needsSetup, supabase]);

  const refreshEmails = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      await loadEmails();
      toast.success('Emails refreshed successfully');
    } catch (caughtError) {
      if (caughtError instanceof Error && caughtError.message === 'DATABASE_NOT_SETUP') {
        setNeedsSetup(true);
        setSetupStatus({ isSetup: false, error: "Table 'emails' does not exist. Run setup scripts." });
      } else {
        const message = caughtError instanceof Error ? caughtError.message : 'Failed to refresh emails';
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const onCheckSetup = async () => {
    setIsCheckingSetup(true);
    try {
      const status = await checkDatabaseSetup();
      setSetupStatus(status);
      if (status.isSetup) {
        toast.success('Database is configured correctly');
        await initializeDashboard();
      }
    } finally {
      setIsCheckingSetup(false);
    }
  };

  const addEmail = async () => {
    if (!supabase) {
      toast.error('Missing Supabase configuration');
      return;
    }

    if (!newEmail.from_email.trim() || !newEmail.text.trim()) {
      toast.error('Email and message are required');
      return;
    }

    setIsAdding(true);

    const payload: EmailInsertPayload = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      from_email: newEmail.from_email.trim(),
      subject: newEmail.subject.trim() || undefined,
      text: newEmail.text.trim(),
      ai_reply: newEmail.ai_reply.trim() ? sanitizeHtml(newEmail.ai_reply) : undefined,
      status: newEmail.status,
    };

    try {
      const { data, error: insertError } = await supabase
        .from('emails')
        .insert(payload)
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to add email: ${insertError.message}`);
      }

      const created = data as EmailRecord;
      statusMapRef.current[created.id] = created.status;
      setEmails((previous) => [created, ...previous]);

      setNewEmail({
        from_email: '',
        subject: '',
        text: '',
        ai_reply: '',
        status: 'pending',
      });
      setIsAddFormOpen(false);
      toast.success('Email added successfully');
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : 'Failed to add email');
    } finally {
      setIsAdding(false);
    }
  };

  const suggestNewEmailAiReplyWithGemini = async () => {
    if (!isGmailGeminiConfigured()) {
      toast.error('Set VITE_GOOGLE_AI_API_KEY (and optionally VITE_GOOGLE_AI_MODEL) in your environment');
      return;
    }
    if (!newEmail.text.trim()) {
      toast.error('Add the original message first');
      return;
    }

    setIsGeminiSuggestingNewEmail(true);
    try {
      const html = await suggestGmailAiReplyHtml({
        from_email: newEmail.from_email.trim() || 'sender@example.com',
        subject: newEmail.subject,
        text: newEmail.text,
        previous_reply_html: newEmail.ai_reply.trim() ? newEmail.ai_reply : null,
      });
      setNewEmail((previous) => ({ ...previous, ai_reply: sanitizeHtml(html) }));
      toast.success('Gemini suggested a reply — review before adding');
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : 'Gemini suggestion failed');
    } finally {
      setIsGeminiSuggestingNewEmail(false);
    }
  };

  const updateEmail = async (id: string, updates: EmailUpdatePayload): Promise<EmailRecord> => {
    if (!supabase) {
      throw new Error('Missing Supabase configuration');
    }

    const payload: EmailUpdatePayload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await supabase
      .from('emails')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update email: ${updateError.message}`);
    }

    const updated = data as EmailRecord;
    statusMapRef.current[updated.id] = updated.status;
    setEmails((previous) => previous.map((entry) => (entry.id === id ? updated : entry)));
    return updated;
  };

  const deleteEmail = async (id: string) => {
    if (!supabase) {
      throw new Error('Missing Supabase configuration');
    }

    const { error: deleteError } = await supabase.from('emails').delete().eq('id', id);
    if (deleteError) {
      throw new Error(`Failed to delete email: ${deleteError.message}`);
    }

    delete statusMapRef.current[id];
    setEmails((previous) => previous.filter((entry) => entry.id !== id));
  };

  const sendReply = async (email: EmailRecord): Promise<WebhookResult> => {
    if (!email.ai_reply) {
      throw new Error('No AI reply available to send');
    }

    await updateEmail(email.id, { status: 'sent' });

    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_id: email.id,
          from_email: email.from_email,
          subject: email.subject,
          original_message: email.text,
          ai_reply: email.ai_reply,
          status: 'sent',
          timestamp: new Date().toISOString(),
          action: 'send_reply',
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Webhook failed with status ${response.status}` };
      }

      return { success: true };
    } catch (caughtError) {
      return {
        success: false,
        error: caughtError instanceof Error ? caughtError.message : 'Unknown webhook error',
      };
    }
  };

  const totalEmails = emails.length;
  const emailsWithReplies = emails.filter((entry) => !!entry.ai_reply).length;
  const sentEmails = emails.filter((entry) => entry.status === 'sent').length;
  const pendingEmails = emails.filter((entry) => entry.status === 'pending').length;
  const draftEmails = emails.filter((entry) => entry.status === 'draft').length;
  const recentEmails = emails.filter((entry) => {
    const created = new Date(entry.created_at).getTime();
    if (Number.isNaN(created)) return false;
    return created > Date.now() - 24 * 60 * 60 * 1000;
  }).length;

  if (needsSetup) {
    return (
      <DatabaseSetupView
        setupStatus={setupStatus}
        isCheckingSetup={isCheckingSetup}
        hasSupabaseUrl={Boolean(SUPABASE_URL)}
        hasSupabaseKey={Boolean(SUPABASE_ANON_KEY)}
        onCheckSetup={onCheckSetup}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 animate-spin text-teal-primary" size={34} />
          <h2 className="font-serif text-2xl font-bold text-deep-teal">Loading Gmail Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">Connecting to your email database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-2 py-4 sm:px-4 sm:py-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3 sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-deep-teal p-2.5 text-white sm:p-3">
                  <Mail size={isMobile ? 22 : 28} />
                </div>
                {!isMobile && (
                  <div className="rounded-xl bg-gold p-2 text-white">
                    <Zap size={18} />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-serif text-2xl font-bold text-deep-teal sm:text-3xl">Gmail AI Dashboard</h1>
                <p className="text-xs text-slate-600 sm:text-sm">Manage inbox messages with AI-powered reply workflows.</p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
              <button
                onClick={() => void checkConnection()}
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                  isConnected === null
                    ? 'bg-slate-100 text-slate-700'
                    : isConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                }`}
                title="Click to refresh connection status"
              >
                {isCheckingConnection ? (
                  <>
                    <RefreshCw size={13} className="mr-1 animate-spin" />
                    Checking...
                  </>
                ) : isConnected ? (
                  <>
                    <Wifi size={13} className="mr-1" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff size={13} className="mr-1" />
                    Disconnected
                  </>
                )}
              </button>

              <button
                onClick={() => void refreshEmails()}
                disabled={isRefreshing}
                className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:px-4 sm:text-sm"
              >
                <RefreshCw size={14} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500 sm:gap-4">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1">
              <Clock size={12} className="mr-1" />
              {recentEmails} in last 24h
            </span>
            {!isMobile && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1">
                Draft emails: {draftEmails}
              </span>
            )}
          </div>
        </section>

        {error && (
          <section className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="mt-0.5 text-rose-700" />
              <div>
                <p className="text-sm font-semibold text-rose-900">Connection Error</p>
                <p className="text-sm text-rose-700">{error}</p>
                <p className="mt-1 text-xs text-rose-600">
                  Verify your Supabase environment values and ensure the `emails` table exists.
                </p>
              </div>
            </div>
          </section>
        )}

        {isMobile ? (
          <section className="mb-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-bold text-deep-teal">{totalEmails}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{pendingEmails}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sent</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{sentEmails}</p>
            </div>
          </section>
        ) : (
          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Emails</p>
                  <p className="mt-1 text-3xl font-bold text-deep-teal">{totalEmails}</p>
                </div>
                <div className="rounded-xl bg-teal-primary/10 p-2 text-teal-primary">
                  <Mail size={18} />
                </div>
              </div>
              <p className="text-xs text-emerald-700">All time</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Sent Replies</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600">{sentEmails}</p>
                </div>
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <Send size={18} />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {totalEmails > 0 ? Math.round((sentEmails / totalEmails) * 100) : 0}% sent
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending</p>
                  <p className="mt-1 text-3xl font-bold text-amber-600">{pendingEmails}</p>
                </div>
                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                  <Clock size={18} />
                </div>
              </div>
              <p className="text-xs text-slate-500">Awaiting action</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">With AI Replies</p>
                  <p className="mt-1 text-3xl font-bold text-indigo-600">{emailsWithReplies}</p>
                </div>
                <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700">
                  <Zap size={18} />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {totalEmails > 0 ? Math.round((emailsWithReplies / totalEmails) * 100) : 0}% coverage
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Real-time Status</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600">Live</p>
                </div>
                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                  <RefreshCw size={18} />
                </div>
              </div>
              <p className="inline-flex items-center text-xs font-semibold text-emerald-700">
                <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Connected
              </p>
            </div>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-3 lg:gap-6">
          <div className="order-1 space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:mb-5">
                <h2 className="font-serif text-xl font-bold text-deep-teal sm:text-2xl">Email Inbox</h2>
                {!isMobile && (
                  <p className="inline-flex items-center text-sm text-slate-600">
                    <Users size={14} className="mr-1" />
                    {totalEmails} messages
                  </p>
                )}
              </div>

              {emails.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center sm:p-10">
                  <Mail size={44} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold text-slate-700">No emails yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add your first email to start generating AI replies.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {emails.map((email) => (
                    <EmailCard
                      key={email.id}
                      email={email}
                      onUpdateEmail={updateEmail}
                      onDeleteEmail={deleteEmail}
                      onSendReply={sendReply}
                      compact={isMobile}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="hidden space-y-4 lg:block">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h3 className="mb-4 font-serif text-lg font-bold text-deep-teal sm:text-xl">Quick Actions</h3>

              {!isAddFormOpen ? (
                <button
                  onClick={() => setIsAddFormOpen(true)}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Plus size={15} className="mr-2" />
                  Add New Email
                </button>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void addEmail();
                  }}
                >
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-teal-primary">From Email</label>
                    <input
                      type="email"
                      value={newEmail.from_email}
                      onChange={(event) => setNewEmail((previous) => ({ ...previous, from_email: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-primary/20"
                      placeholder="customer@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-teal-primary">Subject</label>
                    <input
                      type="text"
                      value={newEmail.subject}
                      onChange={(event) => setNewEmail((previous) => ({ ...previous, subject: event.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-primary/20"
                      placeholder="Subject line"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-teal-primary">Message</label>
                    <textarea
                      value={newEmail.text}
                      onChange={(event) => setNewEmail((previous) => ({ ...previous, text: event.target.value }))}
                      className="min-h-[90px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-primary/20"
                      placeholder="Original email message"
                      required
                    />
                  </div>

                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setShowAdvancedAddFields((value) => !value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      {showAdvancedAddFields ? 'Hide advanced fields' : 'Show advanced fields'}
                    </button>
                  )}

                  {(!isMobile || showAdvancedAddFields) && (
                    <>
                      <div>
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <label className="block text-[10px] font-bold uppercase tracking-widest text-teal-primary">AI Reply</label>
                          {isGmailGeminiConfigured() && (
                            <button
                              type="button"
                              onClick={() => void suggestNewEmailAiReplyWithGemini()}
                              disabled={isGeminiSuggestingNewEmail || isAdding}
                              className="inline-flex items-center rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                            >
                              <Sparkles size={13} className="mr-1" />
                              {isGeminiSuggestingNewEmail ? 'Gemini…' : 'Gemini idea'}
                            </button>
                          )}
                        </div>
                        <HtmlToolbarEditor
                          value={newEmail.ai_reply}
                          onChange={(value) => setNewEmail((previous) => ({ ...previous, ai_reply: value }))}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-teal-primary">Status</label>
                        <select
                          value={newEmail.status}
                          onChange={(event) =>
                            setNewEmail((previous) => ({ ...previous, status: event.target.value as EmailStatus }))
                          }
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-primary/20"
                        >
                          <option value="pending">Pending</option>
                          <option value="draft">Draft</option>
                          <option value="sent">Sent</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="submit"
                      disabled={isAdding}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-teal-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {isAdding ? 'Adding...' : 'Add Email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddFormOpen(false);
                        setShowAdvancedAddFields(!isMobile);
                        setNewEmail({
                          from_email: '',
                          subject: '',
                          text: '',
                          ai_reply: '',
                          status: 'pending',
                        });
                      }}
                      className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-serif text-xl font-bold text-deep-teal">Recent Activity</h3>
              <div className="space-y-2">
                {emails.slice(0, 3).map((email) => (
                  <div key={email.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                    <div className="rounded-lg bg-teal-primary/10 p-1.5 text-teal-primary">
                      <Mail size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-700">{email.from_email}</p>
                      <p className="text-xs text-slate-500">{toLocalDate(email.created_at)}</p>
                    </div>
                  </div>
                ))}
                {emails.length === 0 && <p className="py-4 text-center text-sm text-slate-500">No recent activity</p>}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-deep-teal to-teal-primary p-5 text-white shadow-sm">
              <h3 className="mb-3 font-serif text-xl font-bold">AI Features</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Zap size={15} className="text-gold" />
                  Smart reply generation
                </li>
                <li className="flex items-center gap-2">
                  <RefreshCw size={15} className="text-emerald-300" />
                  Real-time synchronization
                </li>
                <li className="flex items-center gap-2">
                  <Users size={15} className="text-sky-200" />
                  Shared team workflow
                </li>
              </ul>
            </div>
          </aside>
        </section>
      </div>

      {!isMobile && (
        <>
          {!isDebugOpen ? (
            <button
              onClick={() => setIsDebugOpen(true)}
              className="fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg"
              title="Open debug panel"
            >
              <Settings size={18} />
            </button>
          ) : (
            <div className="fixed bottom-6 right-6 z-40 w-[360px] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="inline-flex items-center font-semibold text-slate-800">
                  <Settings size={14} className="mr-1" />
                  Debug Panel
                </h4>
                <button onClick={() => setIsDebugOpen(false)} className="text-slate-500 hover:text-slate-700">
                  <X size={16} />
                </button>
              </div>

              <div className="mb-3 space-y-1 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span>Supabase URL</span>
                  <span className={SUPABASE_URL ? 'text-emerald-700' : 'text-rose-700'}>{SUPABASE_URL ? 'Set' : 'Missing'}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span>Supabase Key</span>
                  <span className={SUPABASE_ANON_KEY ? 'text-emerald-700' : 'text-rose-700'}>
                    {SUPABASE_ANON_KEY ? 'Set' : 'Missing'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span>Webhook URL</span>
                  <span className={WEBHOOK_URL ? 'text-emerald-700' : 'text-rose-700'}>{WEBHOOK_URL ? 'Set' : 'Missing'}</span>
                </div>
              </div>

              <div className="mb-3 rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">{debugConnectionStatus}</div>

              <button
                onClick={() => void runDiagnostics()}
                disabled={isRunningDiagnostics}
                className="inline-flex w-full items-center justify-center rounded-xl bg-deep-teal px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isRunningDiagnostics ? (
                  <>
                    <RefreshCw size={14} className="mr-2 animate-spin" />
                    Running diagnostics...
                  </>
                ) : (
                  <>
                    <Database size={14} className="mr-2" />
                    Run diagnostics
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GmailAIDashboardPage;
