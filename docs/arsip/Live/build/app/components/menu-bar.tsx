"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Home, Settings, Monitor, Users, Bot } from "lucide-react"
import { useTheme } from "next-themes"
import { clsx } from "clsx"

interface MenuItem {
  icon: React.ReactNode
  label: string
  href: string
  gradient: string
  iconColor: string
}

const menuItems: MenuItem[] = [
  {
    icon: <Home className="h-5 w-5" />,
    label: "Home",
    href: "#home",
    gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-blue-500",
  },
  {
    icon: <Monitor className="h-5 w-5" />,
    label: "Live Dashboard",
    href: "#live",
    gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-blue-500",
  },
  {
    icon: <Users className="h-5 w-5" />,
    label: "Account & Team",
    href: "#account",
    gradient: "radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.06) 50%, rgba(21,128,61,0) 100%)",
    iconColor: "text-green-500",
  },
  {
    icon: <Bot className="h-5 w-5" />,
    label: "Bot Control",
    href: "#bot",
    gradient: "radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(220,38,38,0.06) 50%, rgba(185,28,28,0) 100%)",
    iconColor: "text-red-500",
  },
  {
    icon: <Settings className="h-5 w-5" />,
    label: "Setting",
    href: "#setting",
    gradient: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(139,92,246,0.06) 50%, rgba(124,58,237,0) 100%)",
    iconColor: "text-purple-500",
  },
]

const itemVariants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
}

const backVariants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
}

const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5 },
      scale: { duration: 0.5, stiffness: 300, damping: 25 },
    },
  },
}

const navGlowVariants = {
  initial: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
}

const sharedTransition = {
  stiffness: 100,
  damping: 20,
  duration: 0.5,
}

interface MenuBarProps {
  onNavigate?: (page: string) => void;
  activePage?: string;
}

export function MenuBar({ onNavigate, activePage }: MenuBarProps) {
  const { theme } = useTheme()

  const isDarkTheme = theme === "dark"

  return (
    <div className="flex justify-center w-full">
      <motion.nav
        className="p-2 backdrop-blur-lg shadow-lg relative overflow-hidden mx-auto"
        initial="initial"
        whileHover="hover"
      >
        <motion.div
          className={`absolute -inset-2 bg-gradient-radial from-transparent ${
            isDarkTheme
              ? "via-blue-400/30 via-30% via-purple-400/30 via-60% via-red-400/30 via-90%"
              : "via-blue-400/20 via-30% via-purple-400/20 via-60% via-red-400/20 via-90%"
          } to-transparent rounded-3xl z-0 pointer-events-none`}
          variants={navGlowVariants}
        />
        <ul className="flex items-center gap-2 relative z-10">
          {menuItems.map((item, index) => {
            const isActive = activePage === item.href.replace('#','')
            const activeColor = isActive ? 'text-cyan-600' : 'text-gray-900'
            const borderColor = isActive ? 'border-b-4 border-cyan-400/70' : ''
            return (
              <motion.li key={item.label} className="relative">
                <motion.div
                  className="block rounded-xl overflow-visible group relative"
                  style={{ perspective: "600px" }}
                  whileHover="hover"
                  initial="initial"
                >
                  <motion.div
                    className="absolute inset-0 z-0 pointer-events-none"
                    variants={glowVariants}
                    style={{
                      background: item.gradient,
                      opacity: 0,
                      borderRadius: "16px",
                    }}
                  />
                  <motion.button
                    type="button"
                    onClick={() => onNavigate && onNavigate(item.href.replace('#',''))}
                    className={`flex items-center gap-2 px-4 py-2 relative z-10 bg-transparent group-hover:text-foreground transition-colors focus:outline-none ${activeColor} ${borderColor}`}
                    variants={itemVariants}
                    transition={sharedTransition}
                    style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
                  >
                    <span className="flex items-center justify-center bg-gray-100 rounded-full p-3">
                      {item.icon}
                    </span>
                    <span className={clsx(
                      "ml-2 transition-colors duration-200 text-base",
                      isActive ? "text-cyan-600" : "text-gray-900"
                    )}>
                      {item.label}
                    </span>
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => onNavigate && onNavigate(item.href.replace('#',''))}
                    className={`flex items-center gap-2 px-4 py-2 absolute inset-0 z-10 bg-transparent group-hover:text-foreground transition-colors rounded-xl focus:outline-none ${activeColor}`}
                    variants={backVariants}
                    transition={sharedTransition}
                    style={{ transformStyle: "preserve-3d", transformOrigin: "center top", rotateX: 90 }}
                  >
                    <span className="flex items-center justify-center bg-gray-100 rounded-full p-3">
                      {item.icon}
                    </span>
                    <span className={clsx(
                      "ml-2 transition-colors duration-200 text-base",
                      isActive ? "text-cyan-600" : "text-gray-900"
                    )}>
                      {item.label}
                    </span>
                  </motion.button>
                </motion.div>
              </motion.li>
            )
          })}
        </ul>
      </motion.nav>
    </div>
  )
}
