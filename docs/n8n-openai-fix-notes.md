# n8n OpenAI Assistant Fix Notes

## What was wrong

1. The workflow used `POST /v1/threads/runs` directly (one-shot). It works, but in practice it is harder to debug and was less reliable in your flow than the explicit sequence used in `schoolofbreathV3`.
2. Messages were fetched immediately when run status became `completed`, which can return no assistant message yet.
3. Failures only captured `status`, not `last_error.message`, so root cause was hidden.
4. The API key was hardcoded in workflow JSON.
5. Run-level instructions were overriding/appending behavior in a way that could leak policy text (for example returning `SOURCES/OUTPUT/...` instead of the final answer).

## What this fixed workflow changes

- Mirrors `schoolofbreathV3/services/chatAssistantService.ts` flow:
  - Create thread
  - Add user message
  - Create run
  - Poll run status
  - Wait a little after `completed`
  - Fetch messages and extract assistant text
- Adds `Wait 1s After Complete` before reading messages.
- Adds `Draft Exists?1` so empty responses are surfaced as a failure branch.
- Captures `last_error.message` in `Capture Failure`.
- Uses `{{$env.OPENAI_API_KEY}}` instead of embedding a secret.
- Uses `additional_instructions` (short and focused) instead of long policy blocks in the run body.
- Reads messages scoped to the current run (`run_id={{ $json.id }}`).
- If assistant returns JSON (`answer`, `shortcuts`), extracts `answer`; otherwise falls back to plain text.

## Important security action

Your message included a real OpenAI key in plain text. Treat it as compromised.

1. Revoke that key in OpenAI dashboard.
2. Create a new key.
3. Store it in n8n env (`OPENAI_API_KEY`) or n8n credential, not in node JSON.

## File to import

- `docs/n8n-gmail-ai-openai-fixed.json`

## Reference alignment

The sequence above follows the logic from:

- `/Users/usuario/Documents/abhi/v2/apps/webapp/schoolofbreathV3/services/chatAssistantService.ts`

## Should we include the long instruction block every run?

No. Put core policy in the Assistant configuration once.  
In the run request, only pass short `additional_instructions` when you need tiny per-message behavior tweaks.

## About using only `Create a Conversation` node

If your node is `@n8n/n8n-nodes-langchain.openAi` with:

- Resource: `Conversation`
- Operation: `Create a Conversation`

that node only creates/stores conversation state. It does **not** produce the final AI answer by itself.

Also, in OpenAI node V2 (n8n `1.117.0+`), n8n moved to the Responses API and removed Assistants API support, so conversation operations do not expose `assistant_id`.

If you must use an existing OpenAI Assistant (`asst_...`) and its attached knowledge/files, keep using the HTTP Request Assistants flow (the JSON template in this repo).  
If you move to OpenAI node V2 only, use `Text -> Generate a Model Response` and redesign prompts/tools without `assistant_id`.
