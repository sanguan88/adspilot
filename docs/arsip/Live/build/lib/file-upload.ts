/**
 * File Upload Utility
 * Helper functions for handling file URLs
 */

/**
 * Get file URL from path
 */
export function getFileUrl(path: string | null | undefined | number | object): string {
  if (!path) return '/icon.png' // Default fallback
  
  // Handle object types (shouldn't happen, but handle gracefully)
  if (typeof path === 'object' && path !== null) {
    // If it's a Buffer or similar, try to extract string representation
    if ('toString' in path && typeof path.toString === 'function') {
      const str = path.toString()
      // If toString returns something meaningful (not [object Object]), use it
      if (str && !str.startsWith('[object')) {
        path = str
      } else {
        console.warn('getFileUrl received an object that cannot be converted to string:', path)
        return '/icon.png'
      }
    } else {
      console.warn('getFileUrl received an object:', path)
      return '/icon.png'
    }
  }
  
  // Convert to string if it's not already
  let pathStr = String(path).trim()
  
  // Check if it's still [object Object] after conversion
  if (pathStr === '[object Object]') {
    console.warn('getFileUrl: path converted to [object Object], returning default icon')
    return '/icon.png'
  }
  
  // Handle empty string
  if (!pathStr || pathStr === 'null' || pathStr === 'undefined') {
    return '/icon.png'
  }
  
  // If it's already a full URL, return as is
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) {
    return pathStr
  }
  
  // If it's a data URL (base64), return as is
  if (pathStr.startsWith('data:')) {
    return pathStr
  }
  
  // If path already starts with /, use it as is (but ensure it's correct)
  if (pathStr.startsWith('/')) {
    // Remove leading slash temporarily to normalize
    pathStr = pathStr.substring(1)
  }
  
  // Handle paths that contain 'uploads' - these are stored in public/uploads/
  if (pathStr.includes('uploads')) {
    // Remove any incorrect prefixes like 'images/users/' if present
    // Example: 'images/users/uploads/profiles/...' -> 'uploads/profiles/...'
    if (pathStr.includes('images/users/')) {
      // Extract the part starting from 'uploads'
      const uploadsIndex = pathStr.indexOf('uploads')
      pathStr = pathStr.substring(uploadsIndex)
    }
    // Ensure it starts with / for public directory access
    return `/${pathStr}`
  }
  
  // For legacy paths that might be in images/users/, handle them
  if (pathStr.startsWith('images/users/')) {
    return `/${pathStr}`
  }
  
  // Otherwise, assume it's a relative path from public root
  // Try to use the path directly first, if it fails, we'll handle it in the component
  return `/${pathStr}`
}

/**
 * Get file URL with API route fallback
 * This ensures files can be served even if not in public folder
 */
export function getFileUrlWithFallback(path: string | null | undefined | number | object): string {
  const url = getFileUrl(path)
  
  // If it's already a data URL or full URL, return as is
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // If it's a path to uploads, use API route (will check public folder first, then database)
  if (url.includes('/uploads/')) {
    // Remove leading slash for API route
    const apiPath = url.replace(/^\/+/, '')
    return `/api/files/${apiPath}`
  }
  
  // For other paths, try direct access first
  return url
}

