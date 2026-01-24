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
import { motion, AnimatePresence } from "framer-motion"

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
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  const isItemActive = (href: string) => pathname === href
  const isGroupActive = (items: SidebarItem[]) => items.some(item => pathname === item.href)

  // Auto-expand group based on current path
  React.useEffect(() => {
    const activeGroup = sidebarGroups.find(group =>
      group.isCollapsible && group.items.some(item => item.href === pathname)
    )
    if (activeGroup) {
      setOpenGroup(activeGroup.id)
    }
  }, [pathname])

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const toggleGroup = (groupId: string) => {
    setOpenGroup(prev => prev === groupId ? null : groupId)
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "bg-primary/10 border-r border-border flex flex-col relative h-full shrink-0 overflow-hidden",
        )}
      >
        {/* Floating Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute p-2 text-foreground/60 hover:bg-muted hover:text-foreground rounded-lg z-20 transition-all",
            isCollapsed ? "top-4 left-1/2 -translate-x-1/2" : "top-7 right-3 h-8 w-8"
          )}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </Button>

        {/* Header */}
        <div className={cn("border-b border-border relative flex items-center shrink-0 overflow-hidden", isCollapsed ? "p-4 h-20 justify-center" : "p-6 h-20 justify-center")}>
          <AnimatePresence mode="wait">
            {!isCollapsed ? (
              <motion.div
                key="large-logo"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center justify-center w-full"
              >
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
              </motion.div>
            ) : (
              <motion.div
                key="small-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-10 h-10 relative flex items-center justify-center mt-6"
              >
                <img
                  src="/logo.jpg"
                  alt="AdsBot Admin Logo"
                  className="w-10 h-10 rounded-none object-contain"
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto no-scrollbar py-4", isCollapsed ? "px-2" : "px-4")}>
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
                                  isItemActive(item.href) && "bg-primary text-primary-foreground shadow-none",
                                )}
                              >
                                <item.icon className="w-6 h-6 shrink-0" />
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
                  <div key={group.id} className="space-y-1">
                    <Button
                      variant="ghost"
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        "w-full justify-between h-10 px-3 text-xs font-bold text-foreground/60 uppercase tracking-wider hover:bg-primary/5 rounded-none transition-colors",
                        isActive && "text-primary/70"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {group.label}
                      </span>
                      <motion.div
                        animate={{ rotate: isOpen ? 0 : -90 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </motion.div>
                    </Button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden space-y-1"
                        >
                          {group.items.map((item) => (
                            <Link key={item.label} href={item.href}>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full justify-start gap-4 px-6 h-11 text-sm font-medium text-primary hover:bg-primary/20 rounded-none transition-all",
                                  isItemActive(item.href) && "bg-primary text-primary-foreground border-l-4 border-primary shadow-none",
                                )}
                              >
                                <item.icon className="w-5 h-5 shrink-0" />
                                <motion.span
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="truncate"
                                >
                                  {item.label}
                                </motion.span>
                              </Button>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
                          "w-full justify-start gap-4 px-4 h-11 text-sm font-medium text-primary hover:bg-primary/20 rounded-none transition-all",
                          isItemActive(item.href) && "bg-primary text-primary-foreground border-l-4 border-primary shadow-none",
                        )}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="truncate"
                        >
                          {item.label}
                        </motion.span>
                      </Button>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </nav>

        {/* User Profile */}
        <div className={cn("mt-auto border-t border-border bg-black/5", isCollapsed ? "p-3" : "p-4")}>
          {!isCollapsed ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-2 rounded-none hover:bg-white/50 transition-all duration-300 group"
            >
              <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-slate-100 rounded-none">
                {user?.photo_profile ? (
                  <AvatarImage
                    src={user.photo_profile?.startsWith('uploads/')
                      ? `https://app.adspilot.id/${user.photo_profile}`
                      : `https://app.adspilot.id/uploads/profiles/${user.photo_profile}`}
                    alt={user?.nama_lengkap || 'User'}
                    className="rounded-none object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-slate-100 rounded-none">
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
                      className="w-8 h-8 rounded-none text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
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
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-slate-100 cursor-pointer hover:scale-105 transition-transform rounded-none">
                      {user?.photo_profile ? (
                        <AvatarImage
                          src={user.photo_profile?.startsWith('uploads/')
                            ? `https://app.adspilot.id/${user.photo_profile}`
                            : `https://app.adspilot.id/uploads/profiles/${user.photo_profile}`}
                          alt={user?.nama_lengkap || 'User'}
                          className="rounded-none object-cover"
                        />
                      ) : null}
                      <AvatarFallback className="bg-slate-100 rounded-none">
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
                      className="w-10 h-10 rounded-none text-slate-400 hover:text-red-500 hover:bg-red-50"
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
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto relative bg-[#f1f5f9]">
        <main className="flex-1 h-full">{children}</main>
      </div>
    </div>
  )
}

