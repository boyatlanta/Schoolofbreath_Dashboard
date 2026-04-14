# Gmail Chat API -> Telegram HITL Entry Flow

## File

- `docs/n8n-gmail-chat-api-hitl-entry.json`

## Purpose

This is a variant of your `n8n-gmail-chat-api-minimal` flow.

It keeps your existing logic and adds one extra step:

- After `Reply Exists?1` (true path) and `Save to Supabase`, it calls Telegram HITL workflow webhook.

Path:

`Reply Exists?1 -> Save to Supabase -> Send To Telegram HITL1 -> Wait Between Items1`

## What is sent to Telegram HITL workflow

Node: `Send To Telegram HITL1`

Payload includes:

- `review_id`
- `email_id`
- `from_email`
- `subject`
- `original_text`
- `ai_reply`
- `chat_message`
- `chat_id`
- `callback_url`

## Required paired workflow

Import and activate also:

- `docs/n8n-telegram-hitl-review-workflow.json`

This second workflow handles:

- Telegram buttons: Approve / Reject / Edit
- Regenerate / Cancel actions
- Callback to your send webhook on final decision

## Environment variables used

In this entry flow:

- `TELEGRAM_HITL_WEBHOOK_URL`
  - default: `https://n8n-production-bbef9.up.railway.app/webhook/telegram-ai-review-request`
- `TELEGRAM_REVIEW_CHAT_ID`
- `EMAIL_APPROVAL_CALLBACK_URL`
  - default: `https://n8n-production-bbef9.up.railway.app/webhook/14d0be78-8198-4117-a0c5-4e75f2de9d57`

## Existing webhook compatibility

When admin approves from Telegram, the HITL workflow calls your existing send webhook endpoint.
This keeps your send-email execution path unchanged.
