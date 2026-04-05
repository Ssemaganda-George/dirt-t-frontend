# End-to-End Encryption (E2E) Implementation

## Overview

The messaging system now supports end-to-end encryption using industry-standard cryptographic algorithms.

## Technical Details

### Encryption Scheme
- **Hybrid Encryption**: RSA-OAEP for key exchange + AES-GCM for message content
- **Key Length**: RSA 2048-bit keys, AES 256-bit symmetric keys
- **Message Format**: `E2E:` prefix + base64 encoded encrypted data

### Key Management
- **Public Key**: Stored in the `profiles` table (`public_key` column)
- **Private Key**: Stored locally in IndexedDB (never leaves the device)
- **Key Generation**: Automatic on first login after email verification

## Database Migration

Run the SQL migration in Supabase SQL Editor:
```sql
-- See file: add_e2e_encryption.sql
```

This adds:
- `public_key` column to `profiles` table
- `encrypted_content` and `is_encrypted` columns to `messages` table

## How It Works

### Sending a Message
1. Sender fetches recipient's public key from database
2. A random AES key is generated for this message
3. Message content is encrypted with AES-GCM
4. AES key is encrypted with recipient's RSA public key
5. Both encrypted key and encrypted message are stored together

### Receiving a Message
1. Message is fetched from database
2. If message has `is_encrypted=true`, decryption is attempted
3. Private key from IndexedDB decrypts the AES key
4. AES key decrypts the message content
5. Decrypted message is displayed

### Backward Compatibility
- Messages without `E2E:` prefix are displayed as-is (unencrypted)
- Users without encryption keys can still receive unencrypted messages
- Encryption fails gracefully - falls back to unencrypted if recipient has no public key

## Security Notes

### What's Protected
- Message content is encrypted in transit and at rest
- Only the intended recipient can decrypt messages
- Admins cannot read encrypted vendor/customer messages (this is by design)

### Limitations
- Subject lines are NOT encrypted (for searchability)
- If a user clears browser data, they lose their private key and cannot decrypt old messages
- Message metadata (sender, recipient, timestamps) is not encrypted

## Files Modified

### New Files
- [src/lib/encryption.ts](src/lib/encryption.ts) - Core encryption utilities

### Modified Files
- [src/lib/database.ts](src/lib/database.ts) - Added encryption to `sendMessage`, `decryptMessages` helper
- [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) - Auto key generation on login
- [src/pages/Messages.tsx](src/pages/Messages.tsx) - Tourist message decryption
- [src/pages/vendor/Messages.tsx](src/pages/vendor/Messages.tsx) - Vendor message decryption
- [src/pages/admin/Messages.tsx](src/pages/admin/Messages.tsx) - Admin message decryption

## Testing

1. Run the database migration
2. Sign in as a user (keys will be auto-generated)
3. Send a message to another user who has logged in (has encryption keys)
4. The message will be encrypted in the database
5. The recipient will see the decrypted message

## Future Enhancements

- Add visual indicator (lock icon) for encrypted messages
- Key backup/recovery mechanism
- Group message encryption
- Encrypt message subjects
