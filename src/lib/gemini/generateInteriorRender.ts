const DEFAULT_MODEL = 'gemini-2.5-flash-image';
const DEFAULT_PROMPT = 'generate an interior design rendering';

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  error?: { message?: string };
};

function dataUrlToInlineData(dataUrl: string): { mimeType: string; data: string } {
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid screenshot format.');
  }
  return { mimeType: match[1], data: match[2] };
}

function getGeminiApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'Add VITE_GEMINI_API_KEY to your .env file (API key from Google AI Studio).',
    );
  }
  return key;
}

function getGeminiImageModel(): string {
  return import.meta.env.VITE_GEMINI_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

/** Call Gemini Nano Banana (image model) with a 3D screenshot + prompt. */
export async function generateInteriorDesignRender(
  screenshotDataUrl: string,
  prompt = DEFAULT_PROMPT,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const model = getGeminiImageModel();
  const inlineData = dataUrlToInlineData(screenshotDataUrl);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inlineData }],
          },
        ],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    },
  );

  const json = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    const msg = json.error?.message ?? response.statusText;
    throw new Error(`Gemini API error (${response.status}): ${msg}`);
  }

  for (const part of json.candidates?.[0]?.content?.parts ?? []) {
    if (part.inlineData?.data) {
      const mime = part.inlineData.mimeType ?? 'image/png';
      return `data:${mime};base64,${part.inlineData.data}`;
    }
  }

  throw new Error('Gemini did not return an image. Try again or check your API quota.');
}

export { DEFAULT_PROMPT as INTERIOR_RENDER_PROMPT };
