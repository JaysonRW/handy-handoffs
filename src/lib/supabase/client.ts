import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

let browserClient: SupabaseClient | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
export const supabaseEnvStatus = {
  hasSupabaseUrl: Boolean(supabaseUrl),
  hasSupabasePublishableKey: Boolean(supabasePublishableKey),
};

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.",
    );
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return browserClient;
}

export const SUPABASE_STORAGE_BUCKET = "task-photos";
