#!/usr/bin/env node
/**
 * Run migration 034: Add manual tier assignment fields
 */

const fs = require('fs');
const path = require('path');

// Read env vars from .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const serviceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Read the migration SQL
const sqlPath = path.join(__dirname, 'db', '034_add_manual_tier_assignment.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function runMigration() {
  console.log('🚀 Running migration 034: Add manual tier assignment fields...');
  console.log(`   Target: ${supabaseUrl}`);

  // Use Supabase's PostgreSQL HTTP API to execute raw SQL
  const response = await fetch(`${supabaseUrl}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Migration failed:', errorText);
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ Migration completed successfully!');
  console.log('Result:', result);
}

runMigration().catch(console.error);