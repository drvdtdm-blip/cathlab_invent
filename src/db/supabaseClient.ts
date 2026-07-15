import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy_key';

// Warning for user if they haven't configured their environment variables yet
if (supabaseUrl.includes('your-project-id') || supabaseAnonKey === 'dummy_key') {
  console.warn(
    'Supabase environment variables are not configured. Please edit the .env file with your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
