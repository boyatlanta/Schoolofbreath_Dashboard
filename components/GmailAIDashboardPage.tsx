import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import {
  Bold,
  Copy,
  Database,
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
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
  X,
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

type StatusFilter = 'all' | EmailStatus;

interface EmailUpdatePayload {
  subject?: string;
  ai_reply?: string;
  status?: EmailStatus;
}

const DEFAULT_WEBHOOK_URL =
  'https://n8n-production-bbef9.up.railway.app/webhook/14d0be78-8198-4117-a0c5-4e75f2de9d57';

const WEBHOOK_URL = (import.meta.env.VITE_GMAIL_REPLY_WEBHOOK_URL || DEFAULT_WEBHOOK_URL).trim();

const SUPABASE_URL = (
  import.meta.env.VITE_GMAIL_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL ||
  ''
).trim();

const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_GMAIL_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

const SQL_SCRIPTS = [
  {
    name: '1. Create table',
    description: 'Creates the emails table (subject + status).',
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

CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON public.emails (from_email);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails (status);`,
  },
  {
    name: '2. RLS + realtime',
    description: 'Row level security and Supabase Realtime publication.',
    sql: `ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for all users" ON public.emails;
CREATE POLICY "Enable all operations for all users" ON public.emails
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.emails TO anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'emails'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.emails;
  END IF;
END $$;`,
  },
] as const;

const tableMissingError = (message: string): boolean => {
  const n = message.toLowerCase();
  return n.includes('relation') && n.includes('emails') && n.includes('does not exist');
};

const sanitizeHtml = (value: string): string => (value.trim() ? value : '');

const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const HtmlToolbarEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  className?: string;
}> = ({ value, onChange, className }) => {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML !== value) {
      if (el) el.innerHTML = value;
    }
  }, [value]);

  const execCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
  };

  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (!url) return;
    execCommand('createLink', url);
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
        role="textbox"
        aria-multiline
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        className="min-h-[180px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none focus:ring-2 focus:ring-teal-primary/30"
      />
    </div>
  );
};

const DatabaseSetupView: React.FC<{
  setupStatus: SetupStatus;
  isCheckingSetup: boolean;
  hasSupabaseUrl: boolean;
  hasSupabaseKey: boolean;
  onCheckSetup: () => void;
}> = ({ setupStatus, isCheckingSetup, hasSupabaseUrl, hasSupabaseKey, onCheckSetup }) => (
  <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-primary/10 text-teal-primary">
          <Database size={28} />
        </div>
        <div>
          <h1 className="font-serif text-2xl font-bold text-deep-teal">Gmail AI database</h1>
          <p className="mt-1 text-sm text-slate-600">
            Connect a Supabase project and run the SQL below so this dashboard can store messages and replies.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm text-amber-900">
        <p className="font-semibold">Environment</p>
        <ul className="list-inside list-disc space-y-1 text-amber-800/90">
          <li>
            <code className="rounded bg-white/60 px-1">VITE_GMAIL_SUPABASE_URL</code> or{' '}
            <code className="rounded bg-white/60 px-1">VITE_SUPABASE_URL</code>
            {hasSupabaseUrl ? ' — set' : ' — missing'}
          </li>
          <li>
            <code className="rounded bg-white/60 px-1">VITE_GMAIL_SUPABASE_ANON_KEY</code> or{' '}
            <code className="rounded bg-white/60 px-1">VITE_SUPABASE_ANON_KEY</code>
            {hasSupabaseKey ? ' — set' : ' — missing'}
          </li>
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCheckSetup}
          disabled={isCheckingSetup || !hasSupabaseUrl || !hasSupabaseKey}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-deep-teal disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={18} className={isCheckingSetup ? 'animate-spin' : ''} />
          Check connection
        </button>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Supabase dashboard
          <ExternalLink size={16} />
        </a>
      </div>

      {setupStatus.error && (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {setupStatus.error}
        </p>
      )}

      {setupStatus.isSetup && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Table detected. Reload the page or use “Check connection” — you should leave this setup screen automatically.
        </p>
      )}
    </div>

    <div className="space-y-6">
      {SQL_SCRIPTS.map((script) => (
        <div key={script.name} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-serif text-lg font-bold text-deep-teal">{script.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{script.description}</p>
          <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">{script.sql}</pre>
          <button
            type="button"
            className="mt-3 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            onClick={async () => {
              await navigator.clipboard.writeText(script.sql);
              toast.success('SQL copied');
            }}
          >
            Copy SQL
          </button>
        </div>
      ))}
    </div>
  </div>
);

const statusChipClass: Record<EmailStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  draft: 'bg-slate-200 text-slate-800',
  sent: 'bg-emerald-100 text-emerald-900',
};

export const GmailAIDashboardPage: React.FC = () => {
  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }, []);

  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [draftReply, setDraftReply] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({ isSetup: false });
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  const filteredEmails = useMemo(() => {
    if (statusFilter === 'all') return emails;
    return emails.filter((e) => e.status === statusFilter);
  }, [emails, statusFilter]);

  const selectedEmail = useMemo(
    () => emails.find((e) => e.id === selectedId) || null,
    [emails, selectedId],
  );

  useEffect(() => {
    if (!selectedEmail) {
      setDraftReply('');
      return;
    }
    setDraftReply(selectedEmail.ai_reply || '');
  }, [selectedEmail?.id, selectedEmail?.ai_reply]);

  const loadEmails = useCallback(async () => {
    if (!supabase) {
      setEmails([]);
      setIsLoading(false);
      setNeedsSetup(true);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (tableMissingError(error.message)) {
        setNeedsSetup(true);
        setSetupStatus({ isSetup: false, error: error.message });
      } else {
        toast.error(error.message);
      }
      setEmails([]);
      setIsLoading(false);
      return;
    }

    setNeedsSetup(false);
    setEmails((data as EmailRecord[]) || []);
    setIsLoading(false);
  }, [supabase]);

  const loadEmailsRef = useRef(loadEmails);

  useEffect(() => {
    loadEmailsRef.current = loadEmails;
  }, [loadEmails]);

  const onCheckSetup = useCallback(async () => {
    if (!supabase) {
      setSetupStatus({
        isSetup: false,
        error:
          'Missing Supabase variables. Set VITE_GMAIL_SUPABASE_URL / VITE_GMAIL_SUPABASE_ANON_KEY or the generic VITE_SUPABASE_* equivalents.',
      });
      return;
    }

    setIsCheckingSetup(true);
    setSetupStatus({ isSetup: false });
    try {
      const { error } = await supabase.from('emails').select('id').limit(1);
      if (error && tableMissingError(error.message)) {
        setSetupStatus({ isSetup: false, error: error.message });
        setNeedsSetup(true);
        return;
      }
      if (error) {
        setSetupStatus({ isSetup: false, error: error.message });
        setNeedsSetup(true);
        return;
      }
      setSetupStatus({ isSetup: true });
      setNeedsSetup(false);
      await loadEmailsRef.current();
    } finally {
      setIsCheckingSetup(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    if (!supabase || needsSetup) {
      setRealtimeConnected(false);
      return;
    }

    const channel = supabase
      .channel('gmail-emails')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'emails' },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const row = payload.new as EmailRecord;
            setEmails((prev) => {
              if (prev.some((e) => e.id === row.id)) return prev;
              return [row, ...prev];
            });
            return;
          }
          if (payload.eventType === 'UPDATE' && payload.new) {
            const row = payload.new as EmailRecord;
            setEmails((prev) => prev.map((e) => (e.id === row.id ? row : e)));
            if (selectedIdRef.current === row.id) {
              setDraftReply(row.ai_reply || '');
            }
            return;
          }
          if (payload.eventType === 'DELETE' && payload.old) {
            const id = (payload.old as { id?: string }).id;
            if (id) {
              setEmails((prev) => prev.filter((e) => e.id !== id));
              setSelectedId((cur) => (cur === id ? null : cur));
            }
          }
        },
      )
      .subscribe((status) => setRealtimeConnected(status === 'SUBSCRIBED'));

    channelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, needsSetup]);

  const updateEmailRow = async (id: string, patch: EmailUpdatePayload): Promise<EmailRecord | null> => {
    if (!supabase) throw new Error('Missing Supabase configuration');

    const payload = {
      ...patch,
      ...(patch.ai_reply !== undefined ? { ai_reply: sanitizeHtml(patch.ai_reply) } : {}),
    };

    const { data, error } = await supabase.from('emails').update(payload).eq('id', id).select().single();

    if (error) throw new Error(error.message);
    const row = data as EmailRecord;
    setEmails((prev) => prev.map((e) => (e.id === id ? row : e)));
    return row;
  };

  const deleteEmailRow = async (id: string) => {
    if (!supabase) throw new Error('Missing Supabase configuration');
    const { error } = await supabase.from('emails').delete().eq('id', id);
    if (error) throw new Error(error.message);
    setEmails((prev) => prev.filter((e) => e.id !== id));
    setSelectedId((cur) => (cur === id ? null : cur));
  };

  const saveDraft = async () => {
    if (!selectedEmail) return;
    setIsSaving(true);
    try {
      await updateEmailRow(selectedEmail.id, {
        ai_reply: draftReply,
        status: selectedEmail.status === 'sent' ? 'sent' : 'draft',
      });
      toast.success('Draft saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const suggestReply = async () => {
    if (!selectedEmail) return;
    if (!isGmailGeminiConfigured()) {
      toast.error('Set VITE_GOOGLE_AI_API_KEY (and optionally VITE_GOOGLE_AI_MODEL) in your environment');
      return;
    }
    setIsAiLoading(true);
    try {
      const html = await suggestGmailAiReplyHtml({
        from_email: selectedEmail.from_email,
        subject: selectedEmail.subject,
        text: selectedEmail.text,
        previous_reply_html: draftReply || selectedEmail.ai_reply,
      });
      setDraftReply(html);
      toast.success('Suggestion ready — review and save or send');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'AI suggestion failed');
    } finally {
      setIsAiLoading(false);
    }
  };

  const sendReply = async (email: EmailRecord): Promise<WebhookResult> => {
    const bodyHtml = sanitizeHtml(draftReply || email.ai_reply || '');
    if (!bodyHtml) {
      throw new Error('No AI reply available to send');
    }

    await updateEmailRow(email.id, { ai_reply: bodyHtml, status: 'sent' });

    try {
      const merged = {
        ...email,
        ai_reply: bodyHtml,
        status: 'sent' as const,
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: merged.id,
          from_email: merged.from_email,
          subject: merged.subject,
          original_message: merged.text,
          ai_reply: merged.ai_reply,
          status: 'sent',
          timestamp: new Date().toISOString(),
          action: 'send_reply',
        }),
      });

      if (!response.ok) {
        return { success: false, error: `Webhook failed with status ${response.status}` };
      }
      return { success: true };
    } catch (caught) {
      return {
        success: false,
        error: caught instanceof Error ? caught.message : 'Unknown webhook error',
      };
    }
  };

  const handleApproveSend = async () => {
    if (!selectedEmail) return;
    try {
      const result = await sendReply(selectedEmail);
      if (result.success) {
        toast.success(`Reply sent to ${selectedEmail.from_email} and webhook delivered`);
      } else {
        toast.warn(`Reply marked as sent but webhook failed: ${result.error || 'Unknown error'}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send reply');
    }
  };

  const insertTestEmail = async () => {
    if (!supabase) {
      toast.error('Configure Supabase first');
      return;
    }

    const id = `demo_${Date.now()}`;
    const row: EmailRecord = {
      id,
      from_email: 'demo@example.com',
      subject: 'Demo inbound message',
      text: 'This is a test message inserted from the dashboard. Replace with pipeline data.',
      ai_reply: '<p>Thank you for your message — this is a sample reply draft.</p>',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('emails').insert(row);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Test row inserted');
    setEmails((prev) => [row, ...prev.filter((e) => e.id !== id)]);
    setSelectedId(id);
  };

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
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

  if (needsSetup) {
    return (
      <DatabaseSetupView
        setupStatus={setupStatus}
        isCheckingSetup={isCheckingSetup}
        hasSupabaseUrl
        hasSupabaseKey
        onCheckSetup={onCheckSetup}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-6">
        <div className="rounded-3xl border border-slate-200 bg-white px-8 py-10 text-center shadow-sm">
          <RefreshCw className="mx-auto mb-3 animate-spin text-teal-primary" size={34} />
          <h2 className="font-serif text-xl font-bold text-deep-teal">Loading Gmail AI</h2>
          <p className="mt-1 text-sm text-slate-600">Fetching messages from Supabase…</p>
        </div>
      </div>
    );
  }

  const totals = {
    total: emails.length,
    withReply: emails.filter((e) => !!e.ai_reply).length,
    sent: emails.filter((e) => e.status === 'sent').length,
    pending: emails.filter((e) => e.status === 'pending').length,
    draft: emails.filter((e) => e.status === 'draft').length,
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-6 py-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-primary/10 text-teal-primary">
            <Mail size={28} />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-deep-teal">Gmail AI inbox</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Review AI drafts, edit replies, then approve to trigger your n8n webhook ({WEBHOOK_URL.slice(0, 48)}
              …).
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                {realtimeConnected ? <Wifi size={14} className="text-emerald-600" /> : <WifiOff size={14} />}
                Realtime {realtimeConnected ? 'live' : 'connecting'}
              </span>
              <span className={`inline-flex items-center gap-1 ${isGmailGeminiConfigured() ? 'text-emerald-700' : 'text-amber-700'}`}>
                <Sparkles size={14} />
                Gemini {isGmailGeminiConfigured() ? 'ready' : 'not configured'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadEmails()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            onClick={insertTestEmail}
            className="inline-flex items-center gap-2 rounded-xl bg-deep-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-primary"
          >
            <Plus size={16} />
            Insert test row
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(
          [
            ['Total', totals.total],
            ['With draft / reply', totals.withReply],
            ['Sent', totals.sent],
            ['Pending', totals.pending],
            ['Draft status', totals.draft],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 font-serif text-2xl font-bold text-deep-teal">{value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'draft', 'sent'] as StatusFilter[]).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${
              statusFilter === filter
                ? 'bg-teal-primary text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Messages ({filteredEmails.length})
            </h2>
          </div>
          <ul className="max-h-[calc(100vh-320px)] overflow-y-auto p-2">
            {filteredEmails.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">No messages match this filter.</li>
            ) : (
              filteredEmails.map((email) => (
                <li key={email.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(email.id)}
                    className={`mb-1 w-full rounded-2xl border px-3 py-3 text-left transition ${
                      selectedId === email.id
                        ? 'border-teal-primary/40 bg-teal-primary/5'
                        : 'border-transparent hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-deep-teal">{email.from_email}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusChipClass[email.status]}`}>
                        {email.status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{email.subject || '(no subject)'}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(email.created_at)}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="min-h-[480px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!selectedEmail ? (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center text-slate-500">
              <Mail className="mb-3 text-slate-300" size={48} />
              <p className="text-sm">Select a message to edit the AI reply and send.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-lg font-bold text-deep-teal">{selectedEmail.from_email}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusChipClass[selectedEmail.status]}`}>
                      {selectedEmail.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{selectedEmail.subject || '(no subject)'}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Received {formatDateTime(selectedEmail.created_at)} · ID{' '}
                    <code className="rounded bg-slate-100 px-1">{selectedEmail.id}</code>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(selectedEmail.text)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy size={14} />
                    Copy original
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Delete message ${selectedEmail.id}?`)) return;
                      void deleteEmailRow(selectedEmail.id)
                        .then(() => toast.success('Message deleted'))
                        .catch(() => toast.error('Delete failed'));
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Original message</h3>
                  <div className="max-h-64 overflow-auto rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
                    <pre className="whitespace-pre-wrap font-sans">{selectedEmail.text}</pre>
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">AI reply (HTML)</h3>
                  <HtmlToolbarEditor value={draftReply} onChange={setDraftReply} />
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={isAiLoading}
                  onClick={() => void suggestReply()}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-light/40 bg-teal-primary/10 px-4 py-2.5 text-sm font-semibold text-teal-primary hover:bg-teal-primary/15 disabled:opacity-60"
                >
                  <Sparkles size={18} className={isAiLoading ? 'animate-pulse' : ''} />
                  {isAiLoading ? 'Suggesting…' : 'Suggest with AI'}
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void saveDraft()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Save size={18} />
                  {isSaving ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleApproveSend()}
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-deep-teal"
                >
                  <Send size={18} />
                  {selectedEmail.status === 'sent' ? 'Resend (webhook)' : 'Approve & send'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-800"
                >
                  <X size={18} />
                  Close detail
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
