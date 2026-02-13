#!/usr/bin/env node
/**
 * Run migration 035: Flexible pricing system
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
const sqlPath = path.join(__dirname, 'db', '035_flexible_pricing_system.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function runMigration() {
  console.log('🚀 Running migration 035: Flexible pricing system...');
  console.log(`   Target: ${supabaseUrl}`);

  // Split SQL into individual statements and execute them
  // Filter out comments and empty lines
  const statements = sql.split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;

    console.log(`   Executing statement ${i + 1}/${statements.length}...`);

    const response = await fetch(`${supabaseUrl}/pg/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
      },
      body: JSON.stringify({ query: statement + ';' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Statement ${i + 1} failed:`, errorText);
      console.error('Statement was:', statement.substring(0, 200) + '...');
      process.exit(1);
    }

    const result = await response.json();
    if (result.error) {
      console.error(`❌ Statement ${i + 1} error:`, result.error);
      console.error('Statement was:', statement.substring(0, 200) + '...');
      process.exit(1);
    }
  }

  console.log('✅ Migration 035 completed successfully!');
}

runMigration().catch(error => {
  console.error('❌ Migration failed with error:', error);
  process.exit(1);
});