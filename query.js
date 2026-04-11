const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('orders').select('id, status, order_type, customer_name, created_at, table_number').order('created_at', { ascending: false }).limit(5)
  console.log(JSON.stringify(data, null, 2))
}
run()
