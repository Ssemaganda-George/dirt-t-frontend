#!/usr/bin/env node
/**
 * Run migration 009 against Supabase using the service role key.
 * Uses Supabase's built-in SQL execution via the HTTP API.
 * 
 * Usage: node run_009_migration.cjs
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
const sqlPath = path.join(__dirname, 'db', '009_fix_visitor_activity_rls.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function runMigration() {
  console.log('🚀 Running migration 009: Fix review RLS policies...');
  console.log(`   Target: ${supabaseUrl}`);
  
  // Use Supabase's PostgreSQL HTTP API (pg-meta) to execute raw SQL
  // The endpoint is /rest/v1/rpc but for raw SQL we use the pg-meta endpoint
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
    // Try the alternative SQL execution endpoint
    console.log('   Trying alternative endpoint...');
    const response2 = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({}),
    });
    
    // If that also fails, try executing each statement via psql-like approach
    // Split SQL into individual statements and run via Supabase SQL API
    console.log('');
    console.log('⚠️  Could not execute SQL via HTTP API.');
    console.log('');
    console.log('Please run the migration manually:');
    console.log('1. Go to https://supabase.com/dashboard/project/ywxvgfhwmnwzsafwmpil/sql');
    console.log('2. Click "New query"');
    console.log('3. Paste the contents of db/009_fix_visitor_activity_rls.sql');
    console.log('4. Click "Run"');
    console.log('');
    console.log('Or connect via psql:');
    console.log('  psql "postgresql://postgres.ywxvgfhwmnwzsafwmpil:<YOUR_DB_PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" -f db/009_fix_visitor_activity_rls.sql');
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ Migration applied successfully!');
  console.log('   Result:', JSON.stringify(result).substring(0, 200));
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
