import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { ConfirmationProvider } from '@/components/providers/confirmation-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'AdsBot Admin - SaaS Management',
  description: 'Admin dashboard untuk mengelola aplikasi AdsBot',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <AuthProvider>
          <ConfirmationProvider>
            {children}
          </ConfirmationProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}

