import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Falta VITE_SUPABASE_URL en .env.local"
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Falta VITE_SUPABASE_PUBLISHABLE_KEY en .env.local"
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);

export async function ensureUser() {
  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  return data.user;
}