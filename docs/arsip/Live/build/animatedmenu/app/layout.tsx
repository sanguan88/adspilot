import "@/styles/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import type React from "react" // Added import for React
import { MenuBar } from "@/components/menu-bar"
import { ThemeToggle } from "@/components/theme-toggle"
import { Zap } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light">
          <header className="w-full flex items-center justify-center relative h-20 mb-8">
            <div className="absolute left-8 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <Zap className="h-8 w-8 text-[#166534] drop-shadow-[0_0_8px_#166534] animate-pulse" />
              <span className="text-2xl font-bold tracking-widest text-[#166534] drop-shadow-[0_0_8px_#166534] font-mono uppercase">SOROBOT</span>
            </div>
            <div className="absolute right-8 top-1/2 -translate-y-1/2">
              <ThemeToggle />
            </div>
            <div className="flex-1 flex justify-center">
              <MenuBar />
            </div>
          </header>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

export const metadata = {
      generator: 'v0.dev'
    };
