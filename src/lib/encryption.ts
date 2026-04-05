/**
 * End-to-End Encryption Utility for Messages
 * 
 * Uses Web Crypto API for secure encryption:
 * - RSA-OAEP for asymmetric encryption (key exchange)
 * - AES-GCM for symmetric encryption (message content)
 * 
 * Each user has a public/private key pair:
 * - Public key: Stored in database, used by senders to encrypt
 * - Private key: Stored locally in IndexedDB, used to decrypt received messages
 */

const DB_NAME = 'DirtTrailsEncryption'
const DB_VERSION = 1
const KEYS_STORE = 'encryptionKeys'

// RSA key parameters for asymmetric encryption
const RSA_PARAMS = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256'
}

// AES parameters for symmetric encryption
const AES_PARAMS = {
  name: 'AES-GCM',
  length: 256
}

/**
 * Open IndexedDB for storing private keys
 */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        db.createObjectStore(KEYS_STORE, { keyPath: 'id' })
      }
    }
  })
}

/**
 * Generate a new RSA key pair for a user
 */
export async function generateKeyPair(): Promise<{ publicKey: string; privateKey: CryptoKey }> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      RSA_PARAMS,
      true, // extractable
      ['encrypt', 'decrypt']
    )
    
    // Export public key as base64 string for storage in database
    const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey)
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    
    return {
      publicKey: publicKeyBase64,
      privateKey: keyPair.privateKey
    }
  } catch (error) {
    console.error('Error generating key pair:', error)
    throw new Error('Failed to generate encryption keys')
  }
}

/**
 * Store private key in IndexedDB
 */
export async function storePrivateKey(userId: string, privateKey: CryptoKey): Promise<void> {
  try {
    const db = await openDatabase()
    
    // Export private key for storage
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', privateKey)
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KEYS_STORE, 'readwrite')
      const store = transaction.objectStore(KEYS_STORE)
      
      const request = store.put({
        id: userId,
        privateKey: privateKeyJwk,
        createdAt: new Date().toISOString()
      })
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
      
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Error storing private key:', error)
    throw new Error('Failed to store encryption key')
  }
}

/**
 * Retrieve private key from IndexedDB
 */
export async function getPrivateKey(userId: string): Promise<CryptoKey | null> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KEYS_STORE, 'readonly')
      const store = transaction.objectStore(KEYS_STORE)
      
      const request = store.get(userId)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = async () => {
        if (!request.result) {
          resolve(null)
          return
        }
        
        try {
          // Import the private key from JWK
          const privateKey = await crypto.subtle.importKey(
            'jwk',
            request.result.privateKey,
            RSA_PARAMS,
            false, // not extractable
            ['decrypt']
          )
          resolve(privateKey)
        } catch (err) {
          console.error('Error importing private key:', err)
          resolve(null)
        }
      }
      
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Error retrieving private key:', error)
    return null
  }
}

/**
 * Import a public key from base64 string
 */
async function importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
  const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0))
  
  return crypto.subtle.importKey(
    'spki',
    publicKeyBuffer,
    RSA_PARAMS,
    false,
    ['encrypt']
  )
}

/**
 * Generate a random AES key for encrypting a message
 */
async function generateAESKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(AES_PARAMS, true, ['encrypt', 'decrypt'])
}

/**
 * Encrypt a message using recipient's public key
 * 
 * Uses hybrid encryption:
 * 1. Generate a random AES key
 * 2. Encrypt the message with AES
 * 3. Encrypt the AES key with recipient's RSA public key
 * 4. Return both encrypted key and encrypted message
 */
export async function encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
  try {
    // Generate random AES key for this message
    const aesKey = await generateAESKey()
    
    // Generate random IV for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Encrypt the message with AES
    const encoder = new TextEncoder()
    const messageBuffer = encoder.encode(message)
    
    const encryptedMessage = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      messageBuffer
    )
    
    // Export the AES key
    const aesKeyBuffer = await crypto.subtle.exportKey('raw', aesKey)
    
    // Import recipient's public key
    const publicKey = await importPublicKey(recipientPublicKey)
    
    // Encrypt the AES key with RSA
    const encryptedAESKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      aesKeyBuffer
    )
    
    // Combine: encryptedKey (256 bytes) + iv (12 bytes) + encryptedMessage
    const combined = new Uint8Array(
      encryptedAESKey.byteLength + iv.byteLength + encryptedMessage.byteLength
    )
    combined.set(new Uint8Array(encryptedAESKey), 0)
    combined.set(iv, encryptedAESKey.byteLength)
    combined.set(new Uint8Array(encryptedMessage), encryptedAESKey.byteLength + iv.byteLength)
    
    // Encode as base64 with prefix to identify encrypted messages
    return 'E2E:' + btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error('Error encrypting message:', error)
    throw new Error('Failed to encrypt message')
  }
}

/**
 * Decrypt a message using the recipient's private key
 */
export async function decryptMessage(encryptedData: string, privateKey: CryptoKey): Promise<string> {
  try {
    // Check if message is encrypted (has E2E: prefix)
    if (!encryptedData.startsWith('E2E:')) {
      // Message is not encrypted, return as-is (for backward compatibility)
      return encryptedData
    }
    
    // Remove prefix and decode base64
    const base64Data = encryptedData.slice(4)
    const combined = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
    
    // Extract components (RSA encrypted key is 256 bytes for 2048-bit key)
    const keyLength = 256
    const ivLength = 12
    
    const encryptedAESKey = combined.slice(0, keyLength)
    const iv = combined.slice(keyLength, keyLength + ivLength)
    const encryptedMessage = combined.slice(keyLength + ivLength)
    
    // Decrypt the AES key with RSA private key
    const aesKeyBuffer = await crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedAESKey
    )
    
    // Import the AES key
    const aesKey = await crypto.subtle.importKey(
      'raw',
      aesKeyBuffer,
      AES_PARAMS,
      false,
      ['decrypt']
    )
    
    // Decrypt the message with AES
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedMessage
    )
    
    // Decode to string
    const decoder = new TextDecoder()
    return decoder.decode(decryptedBuffer)
  } catch (error) {
    console.error('Error decrypting message:', error)
    // Return placeholder for messages that can't be decrypted
    return '[Unable to decrypt message]'
  }
}

/**
 * Check if user has encryption keys set up
 */
export async function hasEncryptionKeys(userId: string): Promise<boolean> {
  const privateKey = await getPrivateKey(userId)
  return privateKey !== null
}

/**
 * Delete encryption keys (for logout/account deletion)
 */
export async function deleteEncryptionKeys(userId: string): Promise<void> {
  try {
    const db = await openDatabase()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KEYS_STORE, 'readwrite')
      const store = transaction.objectStore(KEYS_STORE)
      
      const request = store.delete(userId)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
      
      transaction.oncomplete = () => db.close()
    })
  } catch (error) {
    console.error('Error deleting encryption keys:', error)
  }
}

/**
 * Encrypt message for multiple recipients (e.g., admin + user)
 * Returns array of encrypted versions, one per recipient
 */
export async function encryptForMultipleRecipients(
  message: string,
  recipientPublicKeys: { recipientId: string; publicKey: string }[]
): Promise<{ recipientId: string; encryptedMessage: string }[]> {
  const results = []
  
  for (const recipient of recipientPublicKeys) {
    try {
      const encrypted = await encryptMessage(message, recipient.publicKey)
      results.push({
        recipientId: recipient.recipientId,
        encryptedMessage: encrypted
      })
    } catch (error) {
      console.error(`Error encrypting for recipient ${recipient.recipientId}:`, error)
    }
  }
  
  return results
}

/**
 * Utility to check if a message is encrypted
 */
export function isEncrypted(message: string): boolean {
  return message?.startsWith('E2E:') ?? false
}

/**
 * Export public key as shareable format (for QR codes, etc.)
 */
export function exportPublicKeyForSharing(publicKeyBase64: string): string {
  return `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`
}
