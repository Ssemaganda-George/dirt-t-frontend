#!/usr/bin/env node

// Script to create test delete requests
// Usage: node create_test_delete_requests.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Supabase environment variables not found in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTestRequests() {
  try {
    console.log('🔍 Creating test delete requests...');

    // First, get some approved services and vendors
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, vendor_id')
      .eq('status', 'approved')
      .limit(3);

    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError);
      return;
    }

    if (!services || services.length === 0) {
      console.log('❌ No approved services found. Please create some approved services first.');
      return;
    }

    console.log('📋 Found approved services:', services.length);

    // Create test delete requests
    for (const service of services) {
      const testRequest = {
        service_id: service.id,
        vendor_id: service.vendor_id,
        reason: `Test delete request for service: ${service.title}`,
        status: 'pending',
        requested_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('service_delete_requests')
        .insert(testRequest)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating delete request:', error);
      } else {
        console.log('✅ Created delete request:', data.id);
      }
    }

    console.log('🎉 Test delete requests created successfully!');
    console.log('💡 Now check the admin Services page to see if they appear.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestRequests();