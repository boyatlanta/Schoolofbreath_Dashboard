# Telegram Human-in-the-Loop (HITL) Review Workflow

## File

- `docs/n8n-telegram-hitl-review-workflow.json`

## What this workflow does

This is a **separate control workflow** for human approval in Telegram:

1. Receives AI draft review requests via webhook.
2. Sends review card to Telegram with actions:
   - `✅ Approve`
   - `❌ Reject`
   - `✏️ Edit`
3. Handles Telegram callbacks and edits (`/edit <review_id> <text>`).
4. Supports reject sub-actions:
   - `♻️ Regenerate`
   - `🛑 Cancel`
5. Calls back your existing execution webhook with final decision (`approved`/`rejected`).

## Required Supabase table

Preferred: use the migration already added in this repo:

- `supabase/migrations/20260414133000_create_telegram_ai_reviews.sql`

Apply it with:

```bash
supabase db push
```

If you need manual SQL, run this once:

```sql
create table if not exists public.telegram_ai_reviews (
  review_id text primary key,
  email_id text,
  from_email text,
  subject text,
  original_text text,
  ai_reply text,
  chat_message text,
  chat_id text,
  callback_url text,
  status text default 'pending',
  created_at timestamptz default now()
);

create index if not exists idx_telegram_ai_reviews_status on public.telegram_ai_reviews(status);
```

## Inbound webhook contract (from your existing AI flow)

POST to this workflow webhook path:

- `/webhook/telegram-ai-review-request`

Body:

```json
{
  "review_id": "rev_12345", 
  "email_id": "email_row_id",
  "from_email": "user@example.com",
  "subject": "Question",
  "original_text": "Original incoming email body",
  "ai_reply": "AI draft",
  "chat_message": "Prompt/context used for regeneration",
  "chat_id": "<telegram chat id>",
  "callback_url": "https://n8n-production-bbef9.up.railway.app/webhook/14d0be78-8198-4117-a0c5-4e75f2de9d57"
}
```

Notes:

- `review_id` should be short and stable (recommended).
- `callback_url` points to your existing "send approved reply + delete DB" workflow.

## Decision callback payload sent by this workflow

On approve:

```json
{
  "decision": "approved",
  "review_id": "...",
  "email_id": "...",
  "from_email": "...",
  "subject": "...",
  "ai_reply": "...",
  "source": "telegram_hitl"
}
```

On reject/cancel:

```json
{
  "decision": "rejected",
  "review_id": "...",
  "email_id": "...",
  "source": "telegram_hitl"
}
```

## Important n8n notes

- Telegram Trigger can be active only once per bot at a time in n8n. Keep one Telegram Trigger workflow per bot token.
- This flow expects Telegram callback query payloads and message payloads from Telegram Trigger.

## Sources

- Telegram Trigger events and constraints: https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.telegramtrigger/
- Telegram message operations (Send Message, Reply Markup/Inline Keyboard, Send and Wait): https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.telegram/message-operations/
- Telegram callback operations (Answer Query): https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.telegram/callback-operations/
- n8n Telegram Trigger source (event payload behavior): https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/Telegram/TelegramTrigger.node.ts
- n8n Telegram node source (inline keyboard/callback_data fields): https://raw.githubusercontent.com/n8n-io/n8n/master/packages/nodes-base/nodes/Telegram/Telegram.node.ts
