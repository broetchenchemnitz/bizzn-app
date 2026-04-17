import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://nhzemmfijrzbulywrnkw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oemVtbWZpanJ6YnVseXdybmt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI3Nzg0MSwiZXhwIjoyMDg5ODUzODQxfQ.PDK7N1uT59jgNrHw76QjMP2A4dMUaRbuktcrRMf0aWI'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// 1. Find user by email
const { data: { users } } = await admin.auth.admin.listUsers()
const user = users.find(u => u.email === 'didszuhn7@web.de')

if (!user) {
  console.log('❌ User didszuhn7@web.de NOT FOUND')
  process.exit(1)
}

console.log('=== User Info ===')
console.log('ID:', user.id)
console.log('Email:', user.email)
console.log('banned_until:', user.banned_until)
console.log('last_sign_in_at:', user.last_sign_in_at)
console.log('created_at:', user.created_at)

// 2. Check restaurant_customers ban status
const { data: bans } = await admin
  .from('restaurant_customers')
  .select('project_id, is_banned, ban_reason, banned_at')
  .eq('user_id', user.id)

console.log('\n=== Restaurant Bans ===')
console.log(JSON.stringify(bans, null, 2))

// 3. Try to set auth ban
console.log('\n=== Setting Auth-Level Ban ===')
const { data: updated, error } = await admin.auth.admin.updateUserById(user.id, { 
  ban_duration: '876000h' 
})
if (error) {
  console.log('❌ Ban FAILED:', error.message)
} else {
  console.log('✅ Ban SUCCESS')
  console.log('banned_until after:', updated?.user?.banned_until)
}

// 4. Try to login as banned user
console.log('\n=== Login Test ===')
const loginClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oemVtbWZpanJ6YnVseXdybmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzc4NDEsImV4cCI6MjA4OTg1Mzg0MX0.uYUkLEQ3yN2dz3FAinYAuAFx-F4f6aL3TeU3ZL94BbY')
const { data: loginData, error: loginError } = await loginClient.auth.signInWithPassword({
  email: 'didszuhn7@web.de',
  password: 'test1234'
})
if (loginError) {
  console.log('✅ Login BLOCKED:', loginError.message)
} else {
  console.log('❌ Login SUCCEEDED (ban not working):', loginData?.user?.id)
}
