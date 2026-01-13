import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import { Toaster } from '@/components/ui/toaster'
import { ConditionalAnalytics } from '@/components/conditional-analytics'
import './globals.css'

export const metadata: Metadata = {
  title: 'ADSPILOT - Shopee Ads Automation',
  description: 'ADSPILOT Shopee Ads Automation Dashboard',
  generator: 'v0.app',
}

export const dynamic = 'force-dynamic';

import { CookiesHealthProvider } from '@/contexts/CookiesHealthContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'

import { getDatabaseConnection } from '@/lib/db'
import { MaintenanceScreen } from '@/components/maintenance-screen'

async function getMaintenanceStatus() {
  let connection;
  try {
    connection = await getDatabaseConnection()
    // Check if table exists first to avoid crashes on fresh install
    const tableCheck = await connection.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_settings')"
    )
    if (!tableCheck.rows[0].exists) return false;

    const result = await connection.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'system.maintenanceMode'"
    )
    if (result.rows.length > 0) {
      return result.rows[0].setting_value === 'true'
    }
    return false
  } catch (e) {
    console.error("Failed to check maintenance mode:", e)
    return false
  } finally {
    if (connection) {
      try { connection.release() } catch (e) { }
    }
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check maintenance mode
  const isMaintenance = await getMaintenanceStatus();

  if (isMaintenance) {
    return (
      <html lang="id">
        <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
          <MaintenanceScreen />
        </body>
      </html>
    )
  }

  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
        <AuthProvider>
          <SubscriptionProvider>
            <CookiesHealthProvider>
              {children}
            </CookiesHealthProvider>
          </SubscriptionProvider>
        </AuthProvider>
        <SonnerToaster />
        <Toaster />
        <ConditionalAnalytics />
      </body>
    </html>
  )
}
