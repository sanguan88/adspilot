"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { BarChart3, Zap, RotateCcw, ChevronLeft, ChevronRight, User, Target, Store, LogOut, Activity, Settings, CreditCard, AlertTriangle, X, ArrowRight, BookOpen, Crown, Share2 } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { TopLoadingBar } from "@/components/top-loading-bar"
import { useAuth } from "@/contexts/AuthContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { getPhotoProfileUrl } from "@/lib/photo-helper"
import { authenticatedFetch } from "@/lib/api-client"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const sidebarItems = [
  { icon: BarChart3, label: "Overview", href: "/general", description: "View overall performance metrics" },
  { icon: Zap, label: "Automations", href: "/automations", description: "Manage automation rules" },
  { icon: Target, label: "Iklan", href: "/campaigns", description: "Kelola iklan Shopee Anda" },
  { icon: Store, label: "Store", href: "/accounts", description: "Kelola toko Shopee Anda", hasAlert: true },
  { icon: Activity, label: "Rekam Medic", href: "/rekam-medic", description: "Analisis funneling dan BCG Matrix iklan" },
  { icon: RotateCcw, label: "Logs", href: "/logs", description: "View system logs and activities" },
  { icon: CreditCard, label: "Subscription", href: "/subscription", description: "Kelola langganan dan invoice" },
  { icon: Share2, label: "Affiliate", href: "/affiliate", description: "Program Partner AdsPilot" },
  { icon: BookOpen, label: "Tutorial", href: "/tutorial", description: "Panduan dan tutorial penggunaan aplikasi" },
  { icon: Settings, label: "Settings", href: "/settings", description: "Pengaturan akun dan preferensi" },
]

import { useCookiesHealth } from "@/contexts/CookiesHealthContext"
import { useSubscription } from "@/contexts/SubscriptionContext"
import { Progress } from "@/components/ui/progress"

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { expiredCount } = useCookiesHealth()
  const { subscription, remainingDays, totalDays, progressPercentage, isLoading: subLoading } = useSubscription()

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const isDanger = (remainingDays || 0) <= 3
  const isWarning = (remainingDays || 0) <= 7

  return (
    <div className="flex h-screen bg-gray-50 uppercase-nav">
      {/* Top Loading Bar */}
      <TopLoadingBar />
      {/* Sidebar */}
      <div
        className={cn(
          "bg-white border-r border-border transition-all duration-300 flex flex-col relative",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        {/* Floating Toggle Button - Adjusted position to align with centered logo */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute p-2 text-primary/60 hover:bg-primary/10 hover:text-primary rounded z-20",
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
                alt="AdsPilot"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/logo.png"
                }}
              />
            </div>
          ) : (
            <div className="w-10 h-10 relative flex items-center justify-center mt-6">
              <img
                src="/logo.png"
                alt="AdsPilot Logo"
                className="w-10 h-10 rounded object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-logo.png"
                }}
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto no-scrollbar", isCollapsed ? "p-2" : "p-4")}>
          <ul className="space-y-1">
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
                              "w-full justify-center p-3 text-sm font-medium text-primary hover:bg-primary/10 rounded relative",
                              (pathname === item.href || (pathname === "/" && item.href === "/general")) && "bg-primary/10 text-primary shadow-sm",
                            )}
                          >
                            <item.icon className="w-5 h-5" />
                            {item.hasAlert && expiredCount > 0 && (
                              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-white" />
                            )}
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
                        "w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded transition-all duration-200",
                        (pathname === item.href || (pathname === "/" && item.href === "/general")) && "bg-primary/10 text-primary shadow-sm",
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.hasAlert && expiredCount > 0 && (
                        <Badge variant="destructive" className="h-5 px-1.5 min-w-[20px] justify-center text-[10px] rounded-full">
                          {expiredCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Subscription Indicator Indicator */}
        {!subLoading && subscription && (
          <div className={cn("px-4 pb-4 mt-auto", isCollapsed ? "hidden" : "block")}>
            <div className="bg-slate-50 border border-slate-100 rounded p-4 space-y-3 shadow-sm overflow-hidden relative group">
              {/* Subtle background glow */}
              <div className="absolute -right-4 -top-4 w-12 h-12 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/20 transition-all" />

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subscription</span>
                <Link href="/subscription" className="text-[10px] font-bold text-teal-600 hover:underline uppercase transition-all">
                  Upgrade
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <Crown className={cn("w-4 h-4", isDanger ? "text-red-500" : isWarning ? "text-amber-500" : "text-teal-600")} />
                <span className="text-sm font-bold text-slate-700">{subscription.planName}</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className={cn(isDanger ? "text-red-600" : "text-slate-500")}>
                    {remainingDays} Hari Tersisa
                  </span>
                  <span className="text-slate-400">Total {totalDays} Hari</span>
                </div>
                <Progress
                  value={progressPercentage}
                  className="h-1.5 bg-slate-200"
                  indicatorClassName={cn(
                    "transition-all duration-500",
                    isDanger ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-teal-600"
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {/* User Profile & Logout Area (Refined) */}
        <div className={cn("mt-auto border-t border-border", isCollapsed ? "p-3" : "p-4")}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 transition-all duration-300 group">
              <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                {user?.photo_profile ? (
                  <AvatarImage
                    src={getPhotoProfileUrl(user.photo_profile) || ''}
                    alt={user?.nama_lengkap || 'User'}
                  />
                ) : null}
                <AvatarFallback className="bg-slate-100">
                  <User className="w-5 h-5 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate leading-tight">{user?.nama_lengkap || 'User'}</p>
                <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 truncate mt-0.5">{user?.role || ''}</p>
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
                          src={getPhotoProfileUrl(user.photo_profile) || ''}
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
                    <p className="text-xs capitalize text-slate-400">{user?.role || ''}</p>
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

      <div className="flex-1 flex flex-col overflow-auto">
        {children}
      </div>
    </div>
  )
}
