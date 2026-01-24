// Conditional Analytics component
// Untuk menghindari error 404 pada non-Vercel deployments
// Analytics hanya akan berfungsi jika di-deploy di Vercel dengan environment variable yang sesuai
export function ConditionalAnalytics() {
  // Return null untuk menghindari error script loading
  // Analytics Vercel hanya bekerja di Vercel deployment
  return null
}

