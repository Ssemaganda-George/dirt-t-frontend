/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_VENDOR_EMAIL_ENDPOINT?: string
  // add more VITE_ vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
