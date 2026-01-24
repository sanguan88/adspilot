"use client"

import React, { useState } from "react"
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
  TrendingDown, // Use for reports/analytics
  Monitor,
  Shield,
  Key,
  ShoppingCart,
  Ticket,
  Building2,
  ChevronDown,
  LayoutDashboard,
  Wallet
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"

interface DashboardLayoutProps {
  children: React.ReactNode
}

interface SidebarItem {
  icon: any
  label: string
  href: string
  description?: string
}

interface SidebarGroup {
  label: string | null
  id: string
  items: SidebarItem[]
  isCollapsible?: boolean
}

const sidebarGroups: SidebarGroup[] = [
  {
    label: "Main",
    id: "main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", href: "/", description: "Overview dan stats" },
      { icon: Users, label: "User Management", href: "/users", description: "Kelola user dan roles" },
    ],
  },
  {
    label: "Insights",
    id: "insights",
    isCollapsible: true, // Make this collapsible too
    items: [
      { icon: BarChart3, label: "Analytics", href: "/analytics", description: "Real-time performance metrics" },
      { icon: FileText, label: "Reports", href: "/reports", description: "Historical automated reporting" },
    ],
  },
  {
    label: "Finance",
    id: "finance",
    isCollapsible: true,
    items: [
      { icon: ShoppingCart, label: "Orders", href: "/orders", description: "Order tracking dan conversion" },
      { icon: Building2, label: "Bank Mutations", href: "/bank-mutations", description: "Audit money in mutations from Moota" },
      { icon: Wallet, label: "Subscription", href: "/subscriptions", description: "Plans, subscriptions, billing" },
      { icon: Ticket, label: "Vouchers", href: "/vouchers", description: "Voucher dan promo code management" },
    ],
  },
  {
    label: "Business",
    id: "business",
    items: [
      { icon: Handshake, label: "Affiliate", href: "/affiliates", description: "Affiliate management" },
    ],
  },
  {
    label: "Content",
    id: "content",
    isCollapsible: true,
    items: [
      { icon: FileText, label: "Page Builder", href: "/page-builder", description: "Landing page builder" },
      { icon: FileText, label: "Tutorials", href: "/tutorials", description: "Tutorial content management" },
    ],
  },
  {
    label: "System & Config",
    id: "system",
    isCollapsible: true,
    items: [
      { icon: Settings, label: "Settings", href: "/settings", description: "System settings & payments" },
      { icon: Shield, label: "Audit Logs", href: "/audit-logs", description: "Track all admin actions" },
      { icon: Monitor, label: "App Health", href: "/health", description: "Application health monitoring" },
      { icon: Activity, label: "Usage & Monitoring", href: "/usage", description: "Usage analytics dan monitoring" },
    ],
  },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>("insights") // Accordion: only one string or null
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const toggleGroup = (groupId: string) => {
    setOpenGroup(prev => prev === groupId ? null : groupId)
  }

  const isItemActive = (href: string) => pathname === href

  const isGroupActive = (items: SidebarItem[]) => items.some(item => pathname === item.href)

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
        <div className={cn("border-b border-border relative flex items-center shrink-0", isCollapsed ? "p-4 h-20 justify-center" : "p-6 h-20 justify-center")}>
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
        <nav className={cn("flex-1 overflow-y-auto py-4", isCollapsed ? "p-2" : "p-6")}>
          <div className="space-y-4">
            {sidebarGroups.map((group) => {
              const isActive = isGroupActive(group.items)

              if (isCollapsed) {
                return (
                  <div key={group.id} className="space-y-1">
                    {group.items.map((item) => (
                      <TooltipProvider key={item.label}>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Link href={item.href}>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full justify-center p-2 text-sm font-medium text-primary hover:bg-primary/20 rounded-none",
                                  isItemActive(item.href) && "bg-primary text-primary-foreground border-l-4 border-primary",
                                )}
                              >
                                <item.icon className="w-6 h-6" />
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="font-medium">{item.label}</p>
                            <p className="text-xs opacity-90">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )
              }

              if (group.isCollapsible) {
                const isOpen = openGroup === group.id
                return (
                  <Collapsible
                    key={group.id}
                    open={isOpen}
                    onOpenChange={() => toggleGroup(group.id)}
                    className="space-y-1"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-between h-9 px-2 text-xs font-semibold text-foreground/50 uppercase tracking-wider hover:bg-transparent",
                          isActive && "text-primary/70"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {group.label}
                        </span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOpen ? "" : "-rotate-90")} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1 mt-1 transition-all">
                      {group.items.map((item) => (
                        <Link key={item.label} href={item.href}>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full justify-start gap-3 text-sm font-medium text-primary hover:bg-primary/20 rounded-none",
                              isItemActive(item.href) && "bg-primary text-primary-foreground border-l-4 border-primary",
                            )}
                          >
                            <item.icon className="w-6 h-6" />
                            <span>{item.label}</span>
                          </Button>
                        </Link>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )
              }

              return (
                <div key={group.id} className="space-y-1">
                  {group.label && group.id !== 'main' && (
                    <div className="px-2 py-0.5">
                      <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                        {group.label}
                      </p>
                    </div>
                  )}
                  {group.items.map((item) => (
                    <Link key={item.label} href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 text-sm font-medium text-primary hover:bg-primary/20 rounded-none",
                          isItemActive(item.href) && "bg-primary text-primary-foreground border-l-4 border-primary",
                        )}
                      >
                        <item.icon className="w-6 h-6" />
                        <span>{item.label}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </nav>

        {/* User Profile */}
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

