const DEFAULT_MODEL = 'gemini-2.5-flash';
const MODEL_FALLBACKS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];

const compact = (value: string): string => value.replace(/\s+/g, ' ').trim();

const getGoogleApiKey = () => "";
const getConfiguredModel = (): string => compact(import.meta.env.VITE_GOOGLE_AI_MODEL || DEFAULT_MODEL);

export const isGmailGeminiConfigured = (): boolean => Boolean(getGoogleApiKey());

const normalizeHtmlFragment = (raw: string): string => {
  let text = raw.trim();
  if (!text) return '';

  const fence = text.match(/^```(?:html)?\s*([\s\S]*?)```$/im);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  if (!text.includes('<')) {
    return text ? `<p>${text}</p>` : '';
  }

  return text;
};

export type GmailGeminiReplyInput = {
  from_email: string;
  subject?: string | null;
  text: string;
  previous_reply_html?: string | null;
};

/**
 * Returns an HTML fragment suitable for the existing AI Reply field (same storage + sanitize path).
 */
export const suggestGmailAiReplyHtml = async (input: GmailGeminiReplyInput): Promise<string> => {
  const apiKey = getGoogleApiKey();
  if (!apiKey) {
    throw new Error('VITE_GOOGLE_AI_API_KEY is not set');
  }

  const configuredModel = getConfiguredModel();
  const modelCandidates = [configuredModel, ...MODEL_FALLBACKS]
    .map((value) => compact(value))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
  const original = input.text.trim();
  if (!original) {
    throw new Error('Original message is empty');
  }

  const instructions = [
    'You draft professional email replies for an admin team (The School of Breath).',
    'Return ONLY an HTML fragment for the reply body. No subject line.',
    'Allowed tags: <p>, <br>, <strong>, <em>, <a href="...">. Keep it concise and warm.',
    'Do not use <html>, <head>, or <body>. No markdown, no code fences in your answer.',
    'If the incoming message is unclear, acknowledge and ask one brief clarifying question.',
  ];

  const prev = compact(input.previous_reply_html || '');
  if (prev) {
    instructions.push(
      'There is an existing draft below. Write a fresh alternative with different wording and structure while keeping the same intent and facts.',
      `Existing draft HTML (may truncate): ${prev.slice(0, 6000)}`,
    );
  }

  const userText = [
    instructions.join('\n'),
    '',
    `From: ${input.from_email}`,
    `Subject: ${input.subject?.trim() || '(no subject)'}`,
    'Original message:',
    original.slice(0, 12000),
  ].join('\n');

  let lastError: string | null = null;

  for (const model of modelCandidates) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: userText }],
            },
          ],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 1024,
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      const errLower = errText.toLowerCase();
      const modelUnavailable =
        response.status === 404 &&
        (errLower.includes('no longer available') ||
          errLower.includes('not found') ||
          errLower.includes('not supported for generatecontent'));

      lastError = errText
        ? `Gemini request failed (${response.status}) for model ${model}: ${errText.slice(0, 220)}`
        : `Gemini request failed (${response.status}) for model ${model}`;

      if (modelUnavailable) {
        continue;
      }
      throw new Error(lastError);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const combined = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('')
      .trim();

    if (!combined) {
      lastError = `Gemini returned an empty reply for model ${model}`;
      continue;
    }

    return normalizeHtmlFragment(combined);
  }

  throw new Error(lastError || 'Gemini request failed: no available model succeeded');
};
