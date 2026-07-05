/**
 * lib/supabase.ts
 * --------------------------------------------------------------------------
 * The mobile app's Supabase client — the same project the website and admin
 * panel use, so a save in the admin panel shows up here too.
 *
 * The anon key is safe to embed in the app: it only grants what Row Level
 * Security allows (public reads of active catalog rows; barcodes stay hidden
 * behind the *_catalog views). No session is persisted — the app reads the
 * public catalog anonymously.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wadztwgejykpnntcyhfg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZHp0d2dlanlrcG5udGN5aGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTkwMTAsImV4cCI6MjA5ODczNTAxMH0.zcNGe_pZHZ3mQpWl6PlPemeNHZfexXAOgDW_FhELYME';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
