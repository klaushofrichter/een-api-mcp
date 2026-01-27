/**
 * API Utilities
 */

/**
 * Convert ISO 8601 timestamp from Z format to +00:00 format.
 * The EEN API requires timestamps in +00:00 format, not Z format.
 */
export function formatTimestamp(timestamp: string): string {
  // If already in +00:00 format, return as-is
  if (timestamp.endsWith('+00:00')) {
    return timestamp
  }
  // Convert Z to +00:00
  if (timestamp.endsWith('Z')) {
    return timestamp.replace('Z', '+00:00')
  }
  // Return original if format is not recognized
  return timestamp
}
