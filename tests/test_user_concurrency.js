import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

// Load environment variables from .env file manually
function loadEnv() {
  try {
    const envContent = readFileSync('.env', 'utf8')
    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      }
    })
    return envVars
  } catch (error) {
    console.error('Failed to load .env file:', error.message)
    return {}
  }
}

const env = loadEnv()

// Test script for user management concurrency controls
const supabaseUrl = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase environment variables')
  console.error('VITE_SUPABASE_URL:', !!supabaseUrl)
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY:', !!serviceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function testUserRegistrationConcurrency() {
  console.log('Testing user registration concurrency...')

  const testUsers = [
    { email: `test-concurrent-1-${Date.now()}@example.com`, fullName: 'Test User 1', role: 'tourist' },
    { email: `test-concurrent-2-${Date.now()}@example.com`, fullName: 'Test User 2', role: 'vendor' },
    { email: `test-concurrent-3-${Date.now()}@example.com`, fullName: 'Test User 3', role: 'tourist' },
  ]

  // Test concurrent registration
  const registrationPromises = testUsers.map(async (userData) => {
    try {
      // Simulate concurrent registration by calling the atomic function directly
      const result = await supabase.rpc('create_user_profile_atomic', {
        p_user_id: randomUUID(),
        p_email: userData.email,
        p_full_name: userData.fullName,
        p_role: userData.role
      })

      if (result.error) {
        console.error(`Registration failed for ${userData.email}:`, result.error)
        return false
      }

      if (!result.data?.success) {
        console.error(`Registration failed for ${userData.email}:`, result.data?.error)
        return false
      }

      console.log(`✓ Successfully registered ${userData.email}`)
      return true
    } catch (error) {
      console.error(`Exception during registration for ${userData.email}:`, error)
      return false
    }
  })

  const results = await Promise.all(registrationPromises)
  const successCount = results.filter(Boolean).length

  console.log(`Registration test: ${successCount}/${testUsers.length} successful`)
  return successCount === testUsers.length
}

async function testUserPreferencesConcurrency() {
  console.log('Testing user preferences concurrency...')

  const testUserId = randomUUID()

  // Create a test user first
  await supabase.rpc('create_user_profile_atomic', {
    p_user_id: testUserId,
    p_email: `prefs-test-${Date.now()}@example.com`,
    p_full_name: 'Prefs Test User',
    p_role: 'tourist'
  })

  const preferencesUpdates = [
    { region: 'UG', currency: 'UGX', language: 'en' },
    { region: 'KE', currency: 'KES', language: 'sw' },
    { region: 'TZ', currency: 'TZS', language: 'en' },
  ]

  // Test concurrent preferences updates
  const preferencesPromises = preferencesUpdates.map(async (prefs, index) => {
    try {
      const result = await supabase.rpc('save_user_preferences_atomic', {
        p_user_id: testUserId,
        p_region: prefs.region,
        p_currency: prefs.currency,
        p_language: prefs.language
      })

      if (result.error) {
        console.error(`Preferences update ${index + 1} failed:`, result.error)
        return false
      }

      if (!result.data?.success) {
        console.error(`Preferences update ${index + 1} failed:`, result.data?.error)
        return false
      }

      console.log(`✓ Preferences update ${index + 1} successful`)
      return true
    } catch (error) {
      console.error(`Exception during preferences update ${index + 1}:`, error)
      return false
    }
  })

  const results = await Promise.all(preferencesPromises)
  const successCount = results.filter(Boolean).length

  console.log(`Preferences test: ${successCount}/${preferencesUpdates.length} successful`)
  return successCount === preferencesUpdates.length
}

async function testVendorStatusConcurrency() {
  console.log('Testing vendor status concurrency...')

  const testUserId = randomUUID()
  const testEmail = `vendor-status-test-${Date.now()}@example.com`

  // Create test user and vendor
  await supabase.rpc('create_user_profile_atomic', {
    p_user_id: testUserId,
    p_email: testEmail,
    p_full_name: 'Vendor Status Test',
    p_role: 'vendor'
  })

  const vendorResult = await supabase.rpc('create_vendor_profile_atomic', {
    p_user_id: testUserId,
    p_business_name: 'Test Business',
    p_status: 'pending'
  })

  if (!vendorResult.data?.success) {
    console.error('Failed to create test vendor')
    return false
  }

  const vendorId = vendorResult.data.vendor_id

  const statusUpdates = ['approved', 'rejected', 'approved']

  // Test concurrent status updates
  const statusPromises = statusUpdates.map(async (status, index) => {
    try {
      const result = await supabase.rpc('update_vendor_status_atomic', {
        p_vendor_id: vendorId,
        p_status: status,
        p_approved_by: testUserId
      })

      if (result.error) {
        console.error(`Status update ${index + 1} (${status}) failed:`, result.error)
        return false
      }

      if (!result.data?.success) {
        console.error(`Status update ${index + 1} (${status}) failed:`, result.data?.error)
        return false
      }

      console.log(`✓ Status update ${index + 1} (${status}) successful`)
      return true
    } catch (error) {
      console.error(`Exception during status update ${index + 1}:`, error)
      return false
    }
  })

  const results = await Promise.all(statusPromises)
  const successCount = results.filter(Boolean).length

  console.log(`Vendor status test: ${successCount}/${statusUpdates.length} successful`)
  return successCount === statusUpdates.length
}

async function runConcurrencyTests() {
  console.log('Starting user management concurrency tests...\n')

  try {
    const registrationTest = await testUserRegistrationConcurrency()
    console.log('')

    const preferencesTest = await testUserPreferencesConcurrency()
    console.log('')

    const vendorStatusTest = await testVendorStatusConcurrency()
    console.log('')

    const allPassed = registrationTest && preferencesTest && vendorStatusTest

    console.log('=== Test Results ===')
    console.log(`User Registration: ${registrationTest ? 'PASS' : 'FAIL'}`)
    console.log(`User Preferences: ${preferencesTest ? 'PASS' : 'FAIL'}`)
    console.log(`Vendor Status: ${vendorStatusTest ? 'PASS' : 'FAIL'}`)
    console.log(`Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`)

    process.exit(allPassed ? 0 : 1)

  } catch (error) {
    console.error('Test execution failed:', error)
    process.exit(1)
  }
}

runConcurrencyTests()