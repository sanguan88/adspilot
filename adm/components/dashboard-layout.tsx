"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  BarChart3,
  Users,
  CreditCard,
  Handshake,
  Activity,
  Settings,
  FileText,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  TrendingUp,
  Monitor,
  Shield,
  Key,
  ShoppingCart,
  Ticket
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const sidebarGroups = [
  {
    label: null, // Core Management - no label
    items: [
      { icon: BarChart3, label: "Dashboard", href: "/", description: "Overview dan stats" },
      { icon: TrendingUp, label: "Analytics", href: "/analytics", description: "Advanced analytics dan growth" },
      { icon: Users, label: "User Management", href: "/users", description: "Kelola user dan roles" },
      { icon: ShoppingCart, label: "Orders", href: "/orders", description: "Order tracking dan conversion" },
      { icon: CreditCard, label: "Subscription", href: "/subscriptions", description: "Plans, subscriptions, billing" },
      { icon: Ticket, label: "Vouchers", href: "/vouchers", description: "Voucher dan promo code management" },
    ],
  },
  {
    label: "Business & Marketing",
    items: [
      { icon: Handshake, label: "Affiliate", href: "/affiliates", description: "Affiliate management" },
      { icon: FileText, label: "Reports", href: "/reports", description: "Reports dan analytics" },
    ],
  },
  {
    label: "System",
    items: [
      { icon: Shield, label: "Audit Logs", href: "/audit-logs", description: "Track all admin actions" },
      // { icon: Key, label: "Licenses", href: "/licenses", description: "License keys dan aktivasi" },
      { icon: Activity, label: "Usage & Monitoring", href: "/usage", description: "Usage analytics dan monitoring" },
      { icon: Monitor, label: "App Health", href: "/health", description: "Application health monitoring" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { icon: Settings, label: "Settings", href: "/settings", description: "System settings" },
      { icon: CreditCard, label: "Payment Settings", href: "/payment-settings", description: "Payment method configuration" },
      { icon: FileText, label: "Tutorials", href: "/tutorials", description: "Tutorial content management" },
      { icon: FileText, label: "Page Builder", href: "/page-builder", description: "Landing page builder" },
    ],
  },
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
      {/* Sidebar */}
      <div
        className={cn(
          "bg-primary/10 border-r border-border transition-all duration-300 flex flex-col relative",
          isCollapsed ? "w-16" : "w-64",
        )}
      >
        {/* Floating Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute p-2 text-foreground/60 hover:bg-muted hover:text-foreground rounded-lg z-20",
            isCollapsed ? "top-4 left-1/2 -translate-x-1/2" : "top-7 right-3 h-8 w-8"
          )}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>

        {/* Header */}
        <div className={cn("border-b border-border relative flex items-center", isCollapsed ? "p-4 justify-center" : "p-6 justify-center")}>
          {!isCollapsed ? (
            <div className="flex items-center justify-center w-full">
              <img
                src="/adspilot.png"
                alt="AdsBot Admin"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  if (!img.dataset.fallbackUsed) {
                    img.dataset.fallbackUsed = "true"
                    img.src = "/logo.jpg"
                  } else {
                    img.style.display = "none"
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 relative flex items-center justify-center mt-6">
              <img
                src="/logo.jpg"
                alt="AdsBot Admin Logo"
                className="w-10 h-10 rounded-lg object-contain"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement
                  if (!img.dataset.fallbackUsed) {
                    img.dataset.fallbackUsed = "true"
                    img.src = "/placeholder-logo.png"
                  } else {
                    img.style.display = "none"
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "p-2" : "p-6")}>
          {/* Grouped Menu Items */}
          <div className="space-y-4">
            {sidebarGroups.map((group, groupIndex) => (
              <div key={group.label || `group-${groupIndex}`} className="space-y-1">
                {/* Group Label (only when not collapsed and label exists) */}
                {!isCollapsed && group.label && (
                  <div className="px-2 py-0.5">
                    <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                      {group.label}
                    </p>
                  </div>
                )}

                {/* Group Items */}
                <ul className="space-y-1">
                  {group.items.map((item) => (
                    <li key={item.label}>
                      {isCollapsed ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={item.href}>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-center p-2 text-sm font-medium text-primary hover:bg-primary/20 rounded-none",
                                    pathname === item.href && "bg-primary text-primary-foreground border-l-4 border-primary",
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
                              "w-full justify-start gap-3 text-sm font-medium text-primary hover:bg-primary/20 rounded-none",
                              pathname === item.href && "bg-primary text-primary-foreground border-l-4 border-primary",
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
              </div>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        {/* User Profile & Logout Area (Refined) */}
        <div className={cn("mt-auto border-t border-border", isCollapsed ? "p-3" : "p-4")}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 transition-all duration-300 group">
              <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                {user?.photo_profile ? (
                  <AvatarImage
                    src={user.photo_profile?.startsWith('uploads/')
                      ? `https://app.adspilot.id/${user.photo_profile}`
                      : `https://app.adspilot.id/uploads/profiles/${user.photo_profile}`}
                    alt={user?.nama_lengkap || 'User'}
                  />
                ) : null}
                <AvatarFallback className="bg-slate-100">
                  <User className="w-5 h-5 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate leading-tight">{user?.nama_lengkap || 'Admin'}</p>
                <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 truncate mt-0.5">{user?.role || 'Admin'}</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-slate-100 cursor-pointer hover:scale-105 transition-transform">
                      {user?.photo_profile ? (
                        <AvatarImage
                          src={user.photo_profile?.startsWith('uploads/')
                            ? `https://app.adspilot.id/${user.photo_profile}`
                            : `https://app.adspilot.id/uploads/profiles/${user.photo_profile}`}
                          alt={user?.nama_lengkap || 'User'}
                        />
                      ) : null}
                      <AvatarFallback className="bg-slate-100">
                        <User className="w-5 h-5 text-slate-400" />
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-bold">{user?.nama_lengkap || 'User'}</p>
                    <p className="text-xs capitalize text-slate-400">{user?.role || 'Admin'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
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
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">{children}</div>
    </div>
  )
}

