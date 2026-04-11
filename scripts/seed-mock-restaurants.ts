import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const { data: users, error: userError } = await supabase.auth.admin.listUsers()
  if (userError) throw userError

  const user = users.users[0]
  if (!user) {
    console.error('No users found.')
    return
  }

  const userId = user.id
  console.log(`Using user ID: ${userId} (${user.email})`)

  const projects = [
    {
      name: 'Ali Baba Döner',
      slug: 'ali-baba-doener',
      user_id: userId,
      status: 'active',
      is_public: true,
      city: 'Chemnitz',
      postal_code: '09111',
      description: 'Der beste Döner der Stadt. (Keine Lieferung - Nur Abholung!)',
      cuisine_type: 'Döner / Türkisch',
      address: 'Straße der Nationen 1, 09111 Chemnitz'
    },
    {
      name: 'Bella Napoli Pizza',
      slug: 'bella-napoli',
      user_id: userId,
      status: 'active',
      is_public: true,
      city: 'Chemnitz',
      postal_code: '09111',
      description: 'Traditionelle neapolitanische Pizza und frische Pasta aus dem Steinofen.',
      cuisine_type: 'Italienisch',
      address: 'Brühl 15, 09111 Chemnitz'
    },
    {
      name: 'Burger Brothers',
      slug: 'burger-brothers',
      user_id: userId,
      status: 'active',
      is_public: true,
      city: 'Chemnitz',
      postal_code: '09116',
      description: 'Premium Smashed Burgers mit hausgemachten Saucen. Frisch, saftig, unvergesslich.',
      cuisine_type: 'Amerikanisch',
      address: 'Zwickauer Str. 200, 09116 Chemnitz'
    }
  ]

  for (const project of projects) {
    const { data: p, error } = await supabase.from('projects').insert(project).select().single()
    if (error) {
      if (error.code === '23505') {
        console.log(`${project.name} already exists (slug: ${project.slug}).`)
      } else {
        console.error(`Failed to insert ${project.name}:`, error)
      }
    } else {
      console.log(`Inserted ${project.name} (ID: ${p.id})`)
    }
  }

  console.log('✅ Seeding complete.')
}

main().catch(console.error)
