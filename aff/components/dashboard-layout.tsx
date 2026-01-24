"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  BarChart3,
  Link2,
  Users,
  DollarSign,
  Wallet,
  Trophy,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Ticket
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DashboardLayoutProps {
  children: React.ReactNode
}

const sidebarItems = [
  { icon: BarChart3, label: "Dashboard", href: "/" },
  { icon: Link2, label: "Link & Voucher", href: "/links" },
  { icon: Users, label: "Referrals", href: "/referrals" },
  { icon: DollarSign, label: "Commissions", href: "/commissions" },
  { icon: Wallet, label: "Payouts", href: "/payouts" },
  { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
  { icon: Link2, label: "Pixel Tracking", href: "/pixels" },
  { icon: Settings, label: "Settings", href: "/settings" },
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
                  e.currentTarget.src = "/iconScreenshot_1-removebg-preview.png"
                }}
              />
            </div>
          )}
        </div>

        {/* Impersonation Banner */}
        {user?.isImpersonated && (
          <div className="bg-warning/10 border-b border-warning/20 px-4 py-2">
            <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
              <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-warning">Viewing as {user.name}</p>
                  <p className="text-[10px] text-muted-foreground">Impersonated by {user.impersonatedBy}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto", isCollapsed ? "p-2" : "p-6")}>
          <TooltipProvider>
            <ul className="space-y-2">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href

                if (isCollapsed) {
                  return (
                    <li key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-center p-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-none",
                                isActive && "bg-primary/10 border-l-4 border-primary",
                              )}
                            >
                              <item.icon className="w-6 h-6" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  )
                }

                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-3 text-sm font-medium text-primary hover:bg-primary/10 rounded-none",
                          isActive && "bg-primary/10 border-l-4 border-primary",
                        )}
                      >
                        <item.icon className="w-6 h-6 flex-shrink-0" />
                        <span>{item.label}</span>
                      </Button>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </TooltipProvider>
        </nav>

        {/* User Section */}
        <div className={cn("mt-auto border-t border-border", isCollapsed ? "p-3" : "p-4")}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 transition-all duration-300 group">
              <Avatar className="w-10 h-10 border-2 border-white shadow-sm ring-1 ring-slate-100">
                <AvatarImage src={user?.photoProfile || undefined} alt={user?.name} />
                <AvatarFallback className="bg-slate-100">
                  <User className="w-5 h-5 text-slate-400" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate leading-tight">{user?.name || 'Affiliate'}</p>
                <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400 truncate mt-0.5">
                  {user?.affiliateCode ? `CODE: ${user.affiliateCode}` : 'PARTNER'}
                </p>
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
                      <AvatarImage src={user?.photoProfile || undefined} alt={user?.name} />
                      <AvatarFallback className="bg-slate-100">
                        <User className="w-5 h-5 text-slate-400" />
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-bold">{user?.name || 'Affiliate'}</p>
                    <p className="text-xs capitalize text-slate-400">
                      {user?.affiliateCode ? `Code: ${user.affiliateCode}` : 'Partner'}
                    </p>
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
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

