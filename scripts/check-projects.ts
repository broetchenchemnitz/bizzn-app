import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const { data, error } = await supabase
    .from('projects')
    .select('name, slug, is_public, city, postal_code')

  if (error) throw error
  console.log(JSON.stringify(data, null, 2))
}

main().catch(console.error)
