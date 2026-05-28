/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_URL?: string;
  readonly NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Google AI Studio key for Nano Banana image generation */
  readonly VITE_GEMINI_API_KEY?: string;
  /** e.g. gemini-2.5-flash-image, gemini-3.1-flash-image-preview */
  readonly VITE_GEMINI_IMAGE_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
