import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
  const slugs = ['ali-baba-doener', 'bella-napoli', 'burger-brothers']
  
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, slug')
    .in('slug', slugs)
    
  if (error || !projects) {
    throw new Error('Failed to fetch projects')
  }

  for (const project of projects) {
    console.log(`Seeding menu for ${project.slug} (${project.id})...`)
    
    // Cleanup old items/categories for idempotency
    const { data: oldCats } = await supabase.from('menu_categories').select('id').eq('project_id', project.id)
    if (oldCats && oldCats.length > 0) {
        console.log(`Found old menu data for ${project.slug}, deleting...`)
        await supabase.from('menu_categories').delete().eq('project_id', project.id)
    }

    let categories: any[] = []
    let items: any[] = []
    
    if (project.slug === 'ali-baba-doener') {
       categories = [
         { name: 'Döner & Co', sort_order: 1 },
         { name: 'Getränke', sort_order: 2 }
       ]
       
       items = [
         { category: 'Döner & Co', name: 'Döner Kebab', description: 'Im Fladenbrot mit frischem Salat, Zwiebeln und hausgemachter Knoblauchsoße', price: 650, is_active: true },
         { category: 'Döner & Co', name: 'Dürüm Kebab', description: 'Gerollt im hausgemachten Yufka mit Fleisch, Salat und scharfer Soße', price: 750, is_active: true },
         { category: 'Döner & Co', name: 'Döner Teller', description: 'Mit Pommes oder Reis, Fleisch, Salat und Tsatsiki', price: 1100, is_active: true },
         { category: 'Getränke', name: 'Ayran', description: 'Hausgemacht 0,3l', price: 200, is_active: true },
         { category: 'Getränke', name: 'Uludag Gazoz', description: '0,33l Dose', price: 250, is_active: true }
       ]
    } else if (project.slug === 'bella-napoli') {
       categories = [
         { name: 'Pizza (aus dem Steinofen)', sort_order: 1 },
         { name: 'Pasta', sort_order: 2 }
       ]
       
       items = [
         { category: 'Pizza (aus dem Steinofen)', name: 'Pizza Margherita', description: 'San Marzano Tomaten, Fior di Latte, frisches Basilikum, Olivenöl', price: 900, is_active: true },
         { category: 'Pizza (aus dem Steinofen)', name: 'Pizza Diavola', description: 'San Marzano Tomaten, Fior di Latte, scharfe Napoli Salami, Chili', price: 1150, is_active: true },
         { category: 'Pizza (aus dem Steinofen)', name: 'Pizza Tartufo', description: 'Trüffelcreme, Fior di Latte, frischer Trüffel, Rucola, Parmesan', price: 1450, is_active: true },
         { category: 'Pasta', name: 'Spaghetti Carbonara', description: 'Original. Nur mit Guanciale, Ei, Pecorino Romano und Schwarzem Pfeffer', price: 1250, is_active: true },
         { category: 'Pasta', name: 'Penne all\'Arrabbiata', description: 'Pikante Tomatensoße, Knoblauch, Chili, Petersilie', price: 1100, is_active: true }
       ]
    } else if (project.slug === 'burger-brothers') {
       categories = [
         { name: 'Smash Burgers', sort_order: 1 },
         { name: 'Sides', sort_order: 2 }
       ]
       
       items = [
         { category: 'Smash Burgers', name: 'Classic Smash', description: '2x 100g Beef Patty, Cheddar, Pickles, Ketchup, Mustard, Secret Sauce', price: 1050, is_active: true },
         { category: 'Smash Burgers', name: 'Bacon BBQ Crunch', description: '2x 100g Beef Patty, Crispy Bacon, Cheddar, Onion Rings, BBQ Sauce', price: 1250, is_active: true },
         { category: 'Smash Burgers', name: 'Truffle Mushroom', description: '2x 100g Beef Patty, Swiss Cheese, Karamellisierte Zwiebeln, Pilze, Trüffel-Mayo', price: 1350, is_active: true },
         { category: 'Sides', name: 'Sweet Potato Fries', description: 'Mit hausgemachter Trüffel-Mayo (vegan)', price: 550, is_active: true },
         { category: 'Sides', name: 'Chili Cheese Fries', description: 'Pommes überbacken mit Cheddar, Jalapeños und Rinder-Chili', price: 750, is_active: true }
       ]
    }
    
    for (const cat of categories) {
      const { data: newCat, error: catError } = await supabase
        .from('menu_categories')
        .insert({
          project_id: project.id,
          name: cat.name,
          sort_order: cat.sort_order
        })
        .select()
        .single()
        
      if (catError) {
        console.error(`Cat error:`, catError)
        continue
      }
      
      const catItems = items.filter(i => i.category === cat.name)
      for (const item of catItems) {
         const { error: itemError } = await supabase
           .from('menu_items')
           .insert({
             category_id: newCat.id,
             name: item.name,
             description: item.description,
             price: item.price,
             is_active: item.is_active
           })
           
         if (itemError) {
           console.error(`Item error:`, itemError)
         }
      }
    }
  }
  
  console.log('✅ Menu seeding complete!')
}

main().catch(console.error)
