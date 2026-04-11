import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const { error } = await supabase
    .from('projects')
    .update({ cuisine_type: 'Sushi / Japanisch' })
    .eq('slug', 'sushi')

  if (error) throw error
  console.log('✅ Updated Sushi Taxi cuisine_type to Sushi / Japanisch')
}

main().catch(console.error)
