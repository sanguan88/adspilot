/**
 * Helper function untuk membuat fetch request dengan authentication token
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth_token') 
    : null;

  // Merge headers
  const headers = new Headers(options.headers);
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Merge options
  const mergedOptions: RequestInit = {
    ...options,
    headers,
  };

  return fetch(url, mergedOptions);
}

