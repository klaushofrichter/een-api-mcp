/**
 * Simple encryption utilities for password storage.
 * Uses AES-256-GCM with a machine-specific key derived from hostname and username.
 */

import * as crypto from 'crypto'
import * as os from 'os'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Derive an encryption key from machine-specific information.
 * This ensures credentials can only be decrypted on the same machine.
 */
function deriveKey(): Buffer {
  const machineId = `${os.hostname()}:${os.userInfo().username}:een-mcp-server`
  return crypto.scryptSync(machineId, 'een-mcp-salt', KEY_LENGTH)
}

/**
 * Encrypt a password for storage.
 * Returns a base64-encoded string containing IV + encrypted data + auth tag.
 */
export function encryptPassword(password: string): string {
  const key = deriveKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([
    cipher.update(password, 'utf8'),
    cipher.final()
  ])

  const authTag = cipher.getAuthTag()

  // Combine IV + encrypted data + auth tag
  const combined = Buffer.concat([iv, encrypted, authTag])
  return combined.toString('base64')
}

/**
 * Decrypt a stored password.
 * Takes a base64-encoded string containing IV + encrypted data + auth tag.
 */
export function decryptPassword(encryptedData: string): string {
  const key = deriveKey()
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ])

  return decrypted.toString('utf8')
}
