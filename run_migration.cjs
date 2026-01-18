#!/usr/bin/env node

/**
 * Dirt Trails Database Migration Helper
 * Outputs the SQL for manual execution in Supabase dashboard
 */

const fs = require('fs')
const path = require('path')

function showMigrationInstructions() {
  console.log('🚀 Dirt Trails Complete Database Migration Helper')
  console.log('================================================')
  console.log('')
  console.log('The wallet system requires several database tables that may not exist yet.')
  console.log('')
  console.log('📋 To fix this issue, follow these steps:')
  console.log('')
  console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard')
  console.log('2. Select your project (ywxvgfhwmnwzsafwmpil)')
  console.log('3. Go to the SQL Editor')
  console.log('4. Copy and paste the following SQL:')
  console.log('')

  // Read and display the complete SQL file
  const migrationSqlPath = path.join(__dirname, 'complete_migration.sql')
  if (fs.existsSync(migrationSqlPath)) {
    const sql = fs.readFileSync(migrationSqlPath, 'utf8')
    console.log('```sql')
    console.log(sql)
    console.log('```')
  } else {
    console.error('❌ Error: complete_migration.sql not found')
    process.exit(1)
  }

  console.log('')
  console.log('5. Click "Run" to execute the SQL')
  console.log('')
  console.log('✅ After running the migration:')
  console.log('- All necessary tables will be created (vendors, services, bookings, transactions)')
  console.log('- Row Level Security policies will be configured')
  console.log('- Indexes will be created for performance')
  console.log('- The wallet system will work properly')
  console.log('- Vendors can view their transaction history')
  console.log('- Admins can approve/reject withdrawal requests')
  console.log('')
  console.log('📞 Need help? Contact your database administrator.')
}

showMigrationInstructions()