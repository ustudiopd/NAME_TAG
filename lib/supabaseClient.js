import { createClient } from '@supabase/supabase-js'

// Supabase 프로젝트 (uslab 통합 프로젝트)
// 프로젝트 ID: xiygbsaewuqocaxoxeqn
// 프로젝트 이름: uslab
// 스키마: nametag
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xiygbsaewuqocaxoxeqn.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpeWdic2Fld3Vxb2NheG94ZXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTE5NzYsImV4cCI6MjA3ODY4Nzk3Nn0.QE1F-Gfb5Fh4nQWVA_BQeqNWWNWxJoFvpw8S96xgpLk'

// public 스키마의 뷰를 통해 nametag 스키마의 테이블에 접근
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
