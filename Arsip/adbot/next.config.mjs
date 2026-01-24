/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ignore file system errors from Windows system files
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/C:/**', // Ignore C: drive root
        ],
      }
    }
    return config
  },
}

export default nextConfig
