import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../syncConfig'

// En tests se fuerza null: la app queda 100% local y sin pantalla de login.
export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY && import.meta.env.MODE !== 'test'
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null
