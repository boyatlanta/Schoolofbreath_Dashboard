# Send Approved Reply Workflow Notes

File:
- `docs/n8n-send-approved-reply-delete-db.json`

This workflow does:
1. Receive webhook from dashboard `send_reply` action.
2. Map webhook payload fields into `/email/reply` API body.
3. Send the email via `POST https://breathing-ejercices-api.vercel.app/email/reply`.
4. Delete sent row from `public.emails` in Supabase by `email_id`.

Webhook payload expected (from dashboard):
- `email_id`
- `from_email`
- `subject`
- `ai_reply`

Mapping:
- `originalMessageId` <- `email_id`
- `to` <- normalized `from_email` (extracts email from `Name <email@domain>`)
- `subject` <- `subject`
- `text` <- `ai_reply`

Delete condition:
- `emails.id = email_id`
