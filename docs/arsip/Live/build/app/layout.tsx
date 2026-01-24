import React from 'react'
import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'SOROBOT',
  description: 'Created with Sorobot',
  generator: 'sorobot.id',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className="font-sans bg-[#0A0A0A] text-[#E5E5E5]" suppressHydrationWarning>
        <AuthProvider>
        {children}
        </AuthProvider>
      </body>
    </html>
  )
}
