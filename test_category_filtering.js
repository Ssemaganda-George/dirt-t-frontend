import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

// Test filtering logic
const categoryMapping = {
  'hotels': 'cat_hotel',
  'tours': 'cat_tour',
  'restaurants': 'cat_restaurant',
  'transport': 'cat_transport',
  'activities': 'cat_activity'
}

async function testFiltering() {
  const { data: services, error } = await supabase.from('services').select('*, vendors(id, business_name, status)')
  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('All services:', services?.length || 0)

  // Test filtering for each category
  Object.entries(categoryMapping).forEach(([urlCategory, dbCategory]) => {
    const filtered = services?.filter(service => {
      // First filter by category
      if (service.category_id !== dbCategory) return false

      // Then filter by approval status
      if (!service.vendors) {
        return service.status !== 'inactive'
      }
      return service.status === 'approved'
    }) || []

    console.log(`${urlCategory} (${dbCategory}): ${filtered.length} services`)
    filtered.forEach(s => console.log(`  - ${s.title} (${s.status})`))
  })
}

testFiltering()