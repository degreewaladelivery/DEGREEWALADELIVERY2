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
