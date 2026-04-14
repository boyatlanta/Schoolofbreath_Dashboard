# Gmail -> /chat -> Supabase (No OpenAI Node)

## Import file

- `docs/n8n-gmail-chat-api-minimal.json`

## What changed

- Removed OpenAI Assistant/Thread/Run nodes from this workflow.
- Removed OpenAI model node as well.
- Added `Loop Over Unread1` (`Loop Over Items / splitInBatches`) with `Batch Size = 1`.
- Added `Wait Between Items1` (`Wait` node, `amount = 1`) and loop-back connection.
- Flow is now:
  1. IMAP new email
  2. Loop item-by-item (`Batch Size = 1`)
  3. Build `chat_message` from email content
  4. Check existing record in Supabase by message unique key
  5. Continue only when status is not `sent`
  6. POST directly to `https://breathing-ejercices-api.vercel.app/chat`
  7. Save reply to Supabase `emails.ai_reply`
  8. Wait 1s, then continue with next unread item

## Payload sent to `/chat`

```json
{
  "message": "<email-based prompt>"
}
```

The flow still normalizes sender email for internal use/debug, so values like `Shura Shura <shurakd8@gmail.com>` are parsed as `shurakd8@gmail.com`.

## Status gate step

- Node: `Check Existing in Supabase1` checks current email by `id = messageId`.
- Node: `Is Not Sent?1` allows flow only when `status != sent`.
- If status is `sent`, workflow stops before calling `/chat`.

## Multi-unread safety

- The flow now builds the DB key from `messageId` with fallback to `metadata["message-id"]` and then IMAP `attributes.uid`.
- This avoids collisions/crashes when IMAP returns multiple unread items and top-level `messageId` is missing.
- Every branch reconnects to `Wait Between Items1`, then back into `Loop Over Unread1`, so each unread email is processed sequentially.

## Loop wiring detail

- `Loop Over Unread1` is wired from its **loop output** into processing and from `Wait Between Items1` back into loop input.
- The done output is intentionally left unused to avoid accidental done->loop feedback wiring.

## Expected `/chat` response mapping

The flow reads these from API response:

- `text` -> base reply text used as `final_reply`
- `text` -> reply text saved into `final_reply`
- `sessionId` -> stored in `chat_session_id` debug field
- `selectedGuide` -> stored in `chat_selected_guide` debug field

## Node names

- `Loop Over Unread1`
- `Wait Between Items1`
- `Build Chat Message1`
- `Store Chat API1`
- `Normalize Chat Reply1`
- `Check Existing in Supabase1`
- `Is Not Sent?1`
- `Finalize Adapted Reply1`
- `Reply Exists?1`
- `Save to Supabase`
- `Capture Chat Failure`
