import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

export const metadata: Metadata = {
  title: 'ADSPILOT - Shopee Ads Automation',
  description: 'ADSPILOT Shopee Ads Automation Dashboard',
  generator: 'v0.app',
}

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
        <SonnerToaster />
        <Toaster />
      </body>
    </html>
  )
}

