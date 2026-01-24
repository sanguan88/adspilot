"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Settings, Monitor, Users, Menu, X, Bug, ChevronLeft, ChevronRight, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/contexts/AuthContext"
import { getFileUrl, getFileUrlWithFallback } from "@/lib/file-upload"

interface MenuItem {
  icon: React.ReactNode
  label: string
  page: string
  iconColor: string
}

const menuItems: MenuItem[] = [
  {
    icon: <Monitor className="h-5 w-5" />,
    label: "Live Dashboard",
    page: "live",
    iconColor: "text-blue-500",
  },
  {
    icon: <Users className="h-5 w-5" />,
    label: "Account & Team",
    page: "account",
    iconColor: "text-green-500",
  },
  {
    icon: <Settings className="h-5 w-5" />,
    label: "Setting",
    page: "setting",
    iconColor: "text-purple-500",
  },
  {
    icon: <Bug className="h-5 w-5" />,
    label: "Debug",
    page: "debug",
    iconColor: "text-amber-500",
  },
]

interface AppSidebarProps {
  onNavigate?: (page: string) => void
  activePage?: string
  onCollapseChange?: (isCollapsed: boolean) => void
}

export function AppSidebar({ onNavigate, activePage, onCollapseChange }: AppSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const [isCollapsed, setIsCollapsed] = React.useState(true) // Default collapsed
  const router = useRouter()
  const { user, logout } = useAuth()

  // Notify parent when collapse state changes
  React.useEffect(() => {
    onCollapseChange?.(isCollapsed)
  }, [isCollapsed, onCollapseChange])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 glass-card rounded-lg border border-white/10 hover:bg-white/10 transition-all shadow-lg"
      >
        {isMobileOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Menu className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Container untuk Sidebar dan Toggle Button */}
      <div className="fixed md:fixed top-4 md:top-4 left-0 md:left-4 bottom-4 md:bottom-auto md:my-0">
        {/* Toggle Button - Floating di pojok kanan atas sidebar */}
        <button
          onClick={() => {
            setIsCollapsed(!isCollapsed)
          }}
          className="hidden md:flex absolute -top-2 -right-2 z-50 w-6 h-6 glass-card rounded-full border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all hover:scale-110 items-center justify-center shadow-lg"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-white" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-white" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={cn(
            "z-40 h-[calc(100vh-2rem)] md:h-[calc(100vh-2rem)] glass-sidebar flex flex-col transition-all duration-300 ease-in-out custom-scrollbar rounded-2xl shadow-2xl overflow-hidden",
            isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0",
            // Desktop width based on collapsed state
            isCollapsed ? "md:w-16 md:min-w-[64px]" : "md:w-64"
        )}
      >
        {/* Header */}
          <div className={cn(
            "border-b border-white/10 transition-all duration-300",
            isCollapsed ? "p-3 md:p-3" : "p-6"
          )}>
            <div className={cn(
              "flex transition-all duration-300",
              isCollapsed ? "flex-col items-center gap-2" : "items-center space-x-3"
            )}>
              <div className={cn(
                "rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 glow-cyan overflow-hidden transition-all duration-300",
                isCollapsed ? "h-10 w-10" : "h-10 w-10"
              )}>
                <Image 
                  src="/Logo.png" 
                  alt="SOROBOT Logo" 
                  width={40} 
                  height={40} 
                  className="object-contain"
                />
            </div>
              <div className={cn(
                "flex flex-col transition-all duration-300 overflow-hidden text-center",
                isCollapsed ? "w-full opacity-100" : "w-auto opacity-100"
              )}>
                <span className={cn(
                  "font-bold text-white leading-tight whitespace-nowrap transition-all duration-300",
                  isCollapsed ? "text-[7px] leading-none" : "text-xl"
                )}>
                SOROBOT
              </span>
                <span className={cn(
                  "text-gray-400 leading-tight whitespace-nowrap transition-all duration-300",
                  isCollapsed ? "hidden md:hidden" : "text-sm opacity-100"
                )}>
                Live Monitoring
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className={cn(
          "flex-1 overflow-y-auto custom-scrollbar transition-all duration-300",
          isCollapsed ? "py-2 md:py-2 space-y-2" : "py-4 space-y-2"
        )}>
          {menuItems.map((item) => {
            const isActive = activePage === item.page
            return (
              <button
                key={item.page}
                onClick={() => {
                  onNavigate && onNavigate(item.page)
                  setIsMobileOpen(false) // Close mobile menu on navigation
                }}
                className={cn(
                  "w-full flex items-center rounded-none transition-all duration-200 relative group",
                  isCollapsed 
                    ? "justify-center px-2 py-3 md:px-2 md:py-3" 
                    : "gap-3 px-4 py-3 text-left",
                  isActive
                    ? "bg-gradient-to-r from-white/10 to-white/5 text-white shadow-lg"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                {/* Active indicator - Full height */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white" />
                )}
                <span
                  className={cn(
                    "flex items-center justify-center relative z-10 flex-shrink-0 text-white",
                    !isActive && "group-hover:scale-110 transition-transform"
                  )}
                >
                  {item.icon}
                </span>
                 <span className={cn(
                   "font-normal text-base relative z-10 whitespace-nowrap transition-all duration-300 overflow-hidden text-white",
                   isCollapsed ? "w-0 opacity-0 md:hidden" : "w-auto opacity-100"
                 )}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

          {/* Footer - User Avatar & Logout */}
          <div className={cn(
            "border-t border-white/10 transition-all duration-300",
            isCollapsed ? "px-2 pt-2 pb-4 md:px-2 md:pt-2 md:pb-4" : "px-3 pt-3 pb-6 md:px-3 md:pt-3 md:pb-6"
          )}>
            <div className="flex flex-col transition-all duration-300 gap-2">
              {/* User Avatar */}
              <div className={cn(
                "flex items-center transition-all duration-300 gap-2",
                isCollapsed ? "flex-col justify-center" : "justify-start"
              )}>
                <Avatar className={cn(
                  "border border-white/20 transition-all duration-300",
                  isCollapsed ? "h-8 w-8" : "h-9 w-9"
                )}>
                  <AvatarImage 
                    src={getFileUrlWithFallback(user?.photo_profile || user?.photo)} 
                    alt={user?.name || "User"} 
                  />
                  <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className={cn(
                  "flex flex-col transition-all duration-300 overflow-hidden",
                  isCollapsed ? "w-0 opacity-0 md:hidden" : "w-auto opacity-100"
                )}>
                  <span className="text-xs font-medium text-white leading-tight">
                    {user?.name || "User Name"}
                  </span>
                  <span className="text-[10px] text-white/60 leading-tight">
                    {user?.email || "user@sorobot.id"}
                  </span>
                  {/* Team Logo - Show below email when expanded */}
                  {!isCollapsed && user?.logo_tim && (
                    <div className="mt-1 flex items-center gap-1">
                      {user?.nama_tim && (
                        <span className="text-[9px] text-white/50 truncate max-w-[100px]">
                          {user.nama_tim}
                        </span>
                      )}
                      <div className="h-3 w-3 rounded overflow-hidden flex-shrink-0 border border-white/20">
                        <img 
                          src={user.logo_tim} 
                          alt={user.nama_tim || "Team"} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide image on error
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center justify-center glass-card border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20 transition-all rounded-lg w-full",
                  isCollapsed ? "h-8" : "px-3 py-2 h-9"
                )}
                title={isCollapsed ? "Logout" : undefined}
              >
                <LogOut className={cn(
                  "transition-transform hover:scale-110",
                  isCollapsed ? "h-4 w-4" : "h-4 w-4 mr-2"
                )} />
                {!isCollapsed && (
                  <span className="text-xs font-medium whitespace-nowrap">
                    Logout
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

