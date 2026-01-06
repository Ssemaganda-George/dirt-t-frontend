import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

async function runMigration() {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running migration to update Guides to Activities...');

    // Update the service_categories table
    const { error: updateError } = await supabase
      .from('service_categories')
      .update({
        id: 'cat_activities',
        name: 'Activities',
        description: 'Events and activities happening'
      })
      .eq('id', 'cat_guide');

    if (updateError) {
      console.error('Error updating category:', updateError);
      throw updateError;
    }

    // Update any services that reference the old category
    const { error: servicesError } = await supabase
      .from('services')
      .update({ category_id: 'cat_activities' })
      .eq('category_id', 'cat_guide');

    if (servicesError) {
      console.error('Error updating services:', servicesError);
      throw servicesError;
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();