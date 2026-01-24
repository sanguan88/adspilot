/**
 * Helper function untuk generate photo profile URL
 * 
 * @param photoPath - Path dari database (bisa "uploads/profiles/xxx.jpg" atau "xxx.jpg")
 * @returns URL lengkap untuk photo profile
 */
export function getPhotoProfileUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null
  
  // Jika path dimulai dengan "uploads/", berarti local file
  if (photoPath.startsWith('uploads/')) {
    // Return relative path untuk Next.js public folder
    return `/${photoPath}`
  }
  
  // Jika tidak, berarti dari external API (legacy format)
  return `https://api.refast.id/img/profiles/${photoPath}`
}

