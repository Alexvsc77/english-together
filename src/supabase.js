import { createClient } from '@supabase/supabase-js';

// Публичный ключ предназначен для браузера. Доступ к строкам ограничивают RLS-политики.
export const supabase = createClient(
  'https://sknwfnucvwneirhcoxhq.supabase.co',
  'sb_publishable_4Q0G2gsWEpPnfJXh-EcHWA_m1XZFqSk',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
