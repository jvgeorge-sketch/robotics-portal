import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Exported so App.tsx can render a setup screen instead of crashing
export const isMissingConfig = !supabaseUrl || !supabaseAnonKey

// Use placeholder values when config is missing so the module still loads.
// Every actual network call will fail, but the app won't throw on import.
export const supabase = createClient<Database>(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder'
)
