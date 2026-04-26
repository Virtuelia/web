/// <reference types="astro/client" />

import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';

declare namespace App {
  interface Locals {
    supabase: SupabaseClient<Database>;
    user: User | null;
  }
}
