import { createClient } from '@supabase/supabase-js'

// 개발용: 환경 변수 대신 직접 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ekmuddykdzebbxmgigif.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrbXVkZHlrZHplYmJ4bWdpZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Mzg0MzUsImV4cCI6MjA3MzMxNDQzNX0.cIa1NMV8OtETBphAxg2s72o7jUKCdZhUxDVpNr5XNo0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
