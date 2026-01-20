
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ihknaaoelhwckuecatmz.supabase.co';
const supabaseKey = 'sb_publishable__GNv7NbP2p-6TVpKqBe2-g_t6wbv6l3';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface GameRecord {
  id?: string;
  name: string;
  attempts: number;
  seconds: number;
  created_at?: string;
}
