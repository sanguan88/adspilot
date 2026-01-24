"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BarChart3, Zap, RotateCcw, ChevronLeft, ChevronRight, User, Target, Users, LogOut } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { TopLoadingBar } from "@/components/top-loading-bar"
import { useAuth } from "@/contexts/AuthContext"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const sidebarItems = [
  { icon: BarChart3, label: "Overview", href: "/general" },
  { icon: Zap, label: "Automations", href: "/automations" },
  { icon: Target, label: "Campaigns", href: "/campaigns" },
  { icon: Users, label: "Accounts", href: "/accounts" },
  { icon: RotateCcw, label: "Logs", href: "/logs" },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
        {/* Top Loading Bar */}
        <TopLoadingBar />
      {/* Sidebar */}
      <div
        className={cn(
            "bg-white border-r border-border transition-all duration-300 flex flex-col",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <Zap className="w-6 h-6 text-white" />
              </div>
                <span className="font-semibold text-foreground/90 text-xl">Shopee Ads</span>
            </div>
          )}
            <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 text-foreground/60 hover:bg-muted hover:text-foreground rounded-lg">
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6">
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                <Link href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start gap-3 text-sm font-medium text-primary hover:bg-primary/10 rounded-sm",
                      isCollapsed && "justify-center px-3",
                        (pathname === item.href || (pathname === "/" && item.href === "/general")) && "bg-primary text-white hover:bg-primary hover:text-white",
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile */}
          <div className="p-6 border-t border-border space-y-3">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-foreground/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-foreground/80 truncate">{user?.nama_lengkap || 'User'}</p>
                  <p className="text-xs text-foreground/60 truncate">{user?.role || ''}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm font-medium text-foreground/70 hover:bg-destructive/10 hover:text-destructive rounded-sm"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center mx-auto">
                <User className="w-5 h-5 text-foreground/60" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center p-2 text-foreground/70 hover:bg-destructive/10 hover:text-destructive rounded-sm"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">{children}</div>
    </div>
  )
}
