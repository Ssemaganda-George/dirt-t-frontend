import { supabase } from '../lib/supabaseClient'
import { encryptMessage } from '../lib/encryption'

export async function getAdminMessages(filter?: 'vendor_to_admin' | 'tourist_to_admin' | 'unread') {
  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, email),
        recipient:profiles!messages_recipient_id_fkey(id, full_name, email)
      `)
      // Get all messages where admin is involved (sent or received)
      .or('recipient_role.eq.admin,sender_role.eq.admin')
      .order('created_at', { ascending: false })

    if (filter === 'vendor_to_admin') {
      // Messages from vendors to admin
      query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, email),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, email)
        `)
        .eq('sender_role', 'vendor')
        .eq('recipient_role', 'admin')
        .order('created_at', { ascending: false })
    } else if (filter === 'tourist_to_admin') {
      // Messages from tourists to admin
      query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, email),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, email)
        `)
        .eq('sender_role', 'tourist')
        .eq('recipient_role', 'admin')
        .order('created_at', { ascending: false })
    } else if (filter === 'unread') {
      query = supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey(id, full_name, email),
          recipient:profiles!messages_recipient_id_fkey(id, full_name, email)
        `)
        .eq('recipient_role', 'admin')
        .eq('status', 'unread')
        .order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching admin messages:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAdminMessages:', error)
    throw error
  }
}

// Get conversation messages between admin and a specific user
export async function getAdminConversationMessages(partnerId: string, _partnerRole: 'vendor' | 'tourist') {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(id, full_name, email),
        recipient:profiles!messages_recipient_id_fkey(id, full_name, email)
      `)
      .or(`and(sender_id.eq.${partnerId},recipient_role.eq.admin),and(recipient_id.eq.${partnerId},sender_role.eq.admin)`)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching admin conversation messages:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getAdminConversationMessages:', error)
    throw error
  }
}

export async function getVendorMessages(vendorId: string, filter?: 'unread' | 'customer' | 'admin') {
  try {
    let query = supabase
      .from('messages')
      .select(`*, sender:profiles!messages_sender_id_fkey(id, full_name, email)`)
      .order('created_at', { ascending: false })

    if (filter === 'unread') {
      // Only count messages where vendor is the RECIPIENT (inbox), not sender (outbox)
      query = query
        .eq('recipient_id', vendorId)
        .eq('status', 'unread')
    } else if (filter === 'customer') {
      // Messages between vendor and tourists/guests - both directions
      query = query.or(`and(sender_id.eq.${vendorId},recipient_role.in.(tourist,guest)),and(recipient_id.eq.${vendorId},sender_role.in.(tourist,guest))`)
    } else if (filter === 'admin') {
      // All messages between vendor and admin OR system-generated messages
      query = query.or(`and(sender_id.eq.${vendorId},recipient_role.eq.admin),and(recipient_id.eq.${vendorId},sender_role.eq.admin),and(recipient_id.eq.${vendorId},sender_role.eq.system)`)
    } else {
      // All messages where vendor is involved
      query = query.or(`recipient_id.eq.${vendorId},sender_id.eq.${vendorId}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching vendor messages:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getVendorMessages:', error)
    throw error
  }
}

export async function getTouristMessages(touristId: string, filter?: 'unread' | 'vendor' | 'admin') {
  try {
    let query = supabase
      .from('messages')
      .select(`*, sender:profiles!messages_sender_id_fkey(id, full_name, email), recipient:profiles!messages_recipient_id_fkey(id, full_name, email)`)
      .order('created_at', { ascending: false })

    if (filter === 'unread') {
      // Only count messages where tourist is the RECIPIENT (inbox), not sender (outbox)
      query = query
        .eq('recipient_id', touristId)
        .eq('status', 'unread')
    } else if (filter === 'vendor') {
      // Messages between tourist and vendors only (both directions)
      query = query.or(`and(sender_id.eq.${touristId},recipient_role.eq.vendor),and(recipient_id.eq.${touristId},sender_role.eq.vendor)`)
    } else if (filter === 'admin') {
      // Messages between tourist and admin, including system messages
      query = query.or(`and(sender_id.eq.${touristId},recipient_role.eq.admin),and(recipient_id.eq.${touristId},sender_role.eq.admin),and(recipient_id.eq.${touristId},sender_role.eq.system)`)
    } else {
      query = query.or(`recipient_id.eq.${touristId},sender_id.eq.${touristId}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching tourist messages:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error in getTouristMessages:', error)
    throw error
  }
}

export async function sendMessage(messageData: {
  sender_id: string
  sender_role: string
  recipient_id: string
  recipient_role: string
  subject: string
  message: string
}) {
  try {
    // Try to get recipient's public key for encryption
    // Encrypted copy is stored for audit/verification, but readable message is kept for display
    let encryptedContent: string | null = null
    let isMessageEncrypted = false

    const recipientPublicKey = await getUserPublicKey(messageData.recipient_id)

    if (recipientPublicKey) {
      try {
        encryptedContent = await encryptMessage(messageData.message, recipientPublicKey)
        isMessageEncrypted = true
      } catch (encryptError) {
        console.warn('Failed to encrypt message, sending unencrypted:', encryptError)
        // Fall back to unencrypted if encryption fails
      }
    }

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        sender_id: messageData.sender_id,
        sender_role: messageData.sender_role,
        recipient_id: messageData.recipient_id,
        recipient_role: messageData.recipient_role,
        subject: messageData.subject,
        message: messageData.message, // Keep readable message (transport encrypted via HTTPS)
        encrypted_content: encryptedContent, // Also store encrypted copy for verification
        is_encrypted: isMessageEncrypted,
        status: 'unread',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in sendMessage:', error)
    throw error
  }
}

// ============== E2E Encryption Helper Functions ==============

/**
 * Get a user's public key for encrypting messages to them
 */
export async function getUserPublicKey(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('public_key')
      .eq('id', userId)
      .single()

    if (error || !data) {
      return null
    }

    return data.public_key
  } catch (error) {
    console.error('Error getting user public key:', error)
    return null
  }
}

/**
 * Update user's public key in the database
 */
export async function updateUserPublicKey(userId: string, publicKey: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ public_key: publicKey })
      .eq('id', userId)

    if (error) {
      console.error('Error updating public key:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateUserPublicKey:', error)
    return false
  }
}

/**
 * Decrypt messages in a message array using user's private key
 * Note: Messages are now stored with readable content in `message` field
 * and encrypted copy in `encrypted_content` for verification purposes.
 * This function returns messages as-is since they're already readable.
 */
export async function decryptMessages(messages: any[], _userId: string): Promise<any[]> {
  // Messages are stored with readable content, no decryption needed
  // The encrypted_content field contains an encrypted copy for audit/verification
  return messages
}

/**
 * Check if encryption is available for a user (they have a public key)
 */
export async function isEncryptionAvailable(userId: string): Promise<boolean> {
  const publicKey = await getUserPublicKey(userId)
  return publicKey !== null
}

export async function markMessageAsRead(messageId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        status: 'read',
        updated_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .select()
      .single()

    if (error) {
      console.error('Error marking message as read:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in markMessageAsRead:', error)
    throw error
  }
}

/**
 * Mark all unread messages for a user as delivered (double grey ticks)
 * Called when user signs in
 */
export async function markMessagesAsDelivered(userId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        status: 'delivered',
        updated_at: new Date().toISOString()
      })
      .eq('recipient_id', userId)
      .eq('status', 'unread')
      .select()

    if (error) {
      console.error('Error marking messages as delivered:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in markMessagesAsDelivered:', error)
    throw error
  }
}

/**
 * Mark all messages in a conversation as read (double blue ticks)
 * Called when user opens a chat
 */
export async function markConversationAsRead(userId: string, partnerId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({
        status: 'read',
        updated_at: new Date().toISOString()
      })
      .eq('recipient_id', userId)
      .eq('sender_id', partnerId)
      .in('status', ['unread', 'delivered'])
      .select()

    if (error) {
      console.error('Error marking conversation as read:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in markConversationAsRead:', error)
    throw error
  }
}

export async function replyToMessage(originalMessageId: string, replyData: {
  sender_id: string
  sender_role: string
  recipient_id: string
  recipient_role: string
  subject: string
  message: string
}) {
  try {
    // First, mark the original message as replied
    await supabase
      .from('messages')
      .update({
        status: 'replied',
        updated_at: new Date().toISOString()
      })
      .eq('id', originalMessageId)

    // Then send the reply
    return await sendMessage(replyData)
  } catch (error) {
    console.error('Error in replyToMessage:', error)
    throw error
  }
}
