"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { BarChart3, Zap, RotateCcw, ChevronLeft, ChevronRight, User, Target, Store, LogOut, Activity, Settings, CreditCard } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { TopLoadingBar } from "@/components/top-loading-bar"
import { useAuth } from "@/contexts/AuthContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getPhotoProfileUrl } from "@/lib/photo-helper"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const sidebarItems = [
  { icon: BarChart3, label: "Overview", href: "/general", description: "View overall performance metrics" },
  { icon: Zap, label: "Automations", href: "/automations", description: "Manage automation rules" },
  { icon: Target, label: "Iklan", href: "/campaigns", description: "Kelola iklan Shopee Anda" },
  { icon: Store, label: "Store", href: "/accounts", description: "Kelola toko Shopee Anda" },
  { icon: Activity, label: "Rekam Medic", href: "/rekam-medic", description: "Analisis funneling dan BCG Matrix iklan" },
  { icon: RotateCcw, label: "Logs", href: "/logs", description: "View system logs and activities" },
  { icon: CreditCard, label: "Subscription", href: "/subscription", description: "Kelola langganan dan invoice" },
  { icon: Settings, label: "Settings", href: "/settings", description: "Pengaturan akun dan preferensi" },
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
            "bg-white border-r border-border transition-all duration-300 flex flex-col relative",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Floating Toggle Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className={cn(
            "absolute p-2 text-foreground/60 hover:bg-muted hover:text-foreground rounded-lg z-10",
            isCollapsed ? "top-4 left-1/2 -translate-x-1/2" : "top-4 right-4"
          )}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>

        {/* Header */}
          <div className={cn("border-b border-border", isCollapsed ? "p-4" : "p-6")}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 relative flex items-center justify-center flex-shrink-0">
                <img 
                  src="/logo.jpg" 
                  alt="SAE Logo" 
                  className="w-10 h-10 rounded-lg object-contain"
                  onError={(e) => {
                    // Fallback ke placeholder jika logo.jpg tidak ada
                    e.currentTarget.src = "/placeholder-logo.png"
                  }}
                />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-semibold text-foreground/90 text-xl leading-tight">SAE</span>
                <span className="text-xs text-foreground/60 leading-tight whitespace-nowrap">Shopee Ads Expert</span>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 relative mx-auto flex items-center justify-center mt-6">
              <img 
                src="/logo.jpg" 
                alt="SAE Logo" 
                className="w-10 h-10 rounded-lg object-contain"
                onError={(e) => {
                  // Fallback ke placeholder jika logo.jpg tidak ada
                  e.currentTarget.src = "/placeholder-logo.png"
                }}
              />
            </div>
          )}
          </div>

        {/* Navigation */}
        <nav className={cn("flex-1", isCollapsed ? "p-2" : "p-6")}>
          <ul className="space-y-2">
            {sidebarItems.map((item) => (
              <li key={item.label}>
                {isCollapsed ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={item.href}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-center p-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-none",
                              (pathname === item.href || (pathname === "/" && item.href === "/general")) && "bg-primary/10 border-l-4 border-primary",
                            )}
                          >
                            <item.icon className="w-6 h-6" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs opacity-90">{item.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 text-sm font-medium text-primary hover:bg-primary/10 rounded-none",
                        (pathname === item.href || (pathname === "/" && item.href === "/general")) && "bg-primary/10 border-l-4 border-primary",
                      )}
                    >
                      <item.icon className="w-6 h-6" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile */}
          <div className={cn("border-t border-border", isCollapsed ? "p-2 space-y-2" : "p-6 space-y-3")}>
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  {user?.photo_profile ? (
                    <AvatarImage 
                      src={getPhotoProfileUrl(user.photo_profile) || ''}
                      alt={user?.nama_lengkap || 'User'}
                    />
                  ) : null}
                  <AvatarFallback>
                    <User className="w-5 h-5 text-foreground/60" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-foreground/80 truncate">{user?.nama_lengkap || 'User'}</p>
                  <p className="text-xs text-foreground/60 truncate">{user?.role || ''}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm font-medium text-foreground/70 hover:bg-destructive/10 hover:text-destructive rounded-none"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Avatar className="w-10 h-10 mx-auto">
                {user?.photo_profile ? (
                  <AvatarImage 
                    src={getPhotoProfileUrl(user.photo_profile) || ''}
                    alt={user?.nama_lengkap || 'User'}
                  />
                ) : null}
                <AvatarFallback>
                  <User className="w-5 h-5 text-foreground/60" />
                </AvatarFallback>
              </Avatar>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-center p-2 text-foreground/70 hover:bg-destructive/10 hover:text-destructive rounded-none"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">{children}</div>
    </div>
  )
}
