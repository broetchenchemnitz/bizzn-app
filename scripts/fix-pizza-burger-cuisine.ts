import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  await supabase
    .from('projects')
    .update({ cuisine_type: 'Italienisch / Pizza' })
    .eq('slug', 'bella-napoli')

  await supabase
    .from('projects')
    .update({ cuisine_type: 'Amerikanisch / Burger' })
    .eq('slug', 'burger-brothers')

  console.log('✅ Updated cuisine types for better Discovery filtering')
}

main().catch(console.error)
