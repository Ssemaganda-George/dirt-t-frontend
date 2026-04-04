#!/usr/bin/env node
import('source-map-support/register')
import { createClient } from '@supabase/supabase-js'

// Usage:
// VITE_SUPABASE_URL=https://xyz.supabase.co VITE_SUPABASE_ANON_KEY=anonkey node scripts/test-send-message.mjs <sender_id> <sender_role> <recipient_id> <recipient_role> "Message body"

const [,, sender_id, sender_role, recipient_id, recipient_role, ...messageParts] = process.argv
const message = messageParts.join(' ')

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars. Provide VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

if (!sender_id || !sender_role || !recipient_id || !recipient_role || !message) {
  console.error('Usage: node scripts/test-send-message.mjs <sender_id> <sender_role> <recipient_id> <recipient_role> "Message body"')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function run() {
  try {
    console.log('Inserting test message...')
    const now = new Date().toISOString()
    const { data: insertData, error: insertError } = await supabase
      .from('messages')
      .insert([{ sender_id, sender_role, recipient_id, recipient_role, subject: '', message, status: 'unread', created_at: now, updated_at: now }])
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      process.exit(1)
    }

    console.log('Inserted message id:', insertData.id)

    console.log('\nFetching vendor messages for recipient...')
    const { data: messages, error: fetchError } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, email), recipient:profiles!messages_recipient_id_fkey(id, full_name, email)')
      .or(`recipient_id.eq.${recipient_id},sender_id.eq.${recipient_id}`)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      process.exit(1)
    }

    console.log(`Found ${messages.length} messages (showing latest 10):`)
    console.log(messages.slice(0, 10))
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

run()
