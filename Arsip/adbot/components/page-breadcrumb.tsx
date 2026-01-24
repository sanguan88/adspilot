"use client"

import React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home } from "lucide-react"

const routeMap: Record<string, { label: string; href: string }> = {
  "/general": { label: "Overview", href: "/general" },
  "/": { label: "Overview", href: "/general" },
  "/campaigns": { label: "Campaigns", href: "/campaigns" },
  "/automations": { label: "Automations", href: "/automations" },
  "/accounts": { label: "Store", href: "/accounts" },
  "/logs": { label: "Logs", href: "/logs" },
}

export function PageBreadcrumb() {
  const pathname = usePathname()

  // Build breadcrumb items
  const items: Array<{ label: string; href: string; icon?: typeof Home }> = [
    { label: "Home", href: "/general", icon: Home },
    ...(pathname !== "/general" && pathname !== "/"
      ? [
          {
            label: routeMap[pathname]?.label || pathname.split("/").pop() || "",
            href: routeMap[pathname]?.href || pathname,
          },
        ]
      : []),
  ]

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const Icon = item.icon

          return (
            <React.Fragment key={item.href}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-medium">
                    {Icon && <Icon className="w-4 h-4 inline mr-1" />}
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href} className="hover:text-foreground">
                      {Icon && <Icon className="w-4 h-4 inline mr-1" />}
                      {item.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

