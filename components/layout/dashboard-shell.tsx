"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"

import { BrandMark } from "@/components/layout/brand-mark"
import { BrandStripe } from "@/components/layout/brand-stripe"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export type DashboardNavItem = { href: string; label: string; icon: React.ReactNode }

export function DashboardShell({
  nav,
  homeHref,
  portalLabel,
  userName,
  roleLabel,
  children,
}: {
  nav: DashboardNavItem[]
  homeHref: string
  portalLabel: string
  userName: string
  roleLabel: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <div className="flex items-center justify-center py-1 group-data-[collapsible=icon]:hidden">
              <BrandMark href={homeHref} height={30} />
            </div>
            <Link
              href={homeHref}
              className="hidden items-center justify-center py-1.5 group-data-[collapsible=icon]:flex"
            >
              <span className="bg-brand-blue text-primary-foreground flex size-7 items-center justify-center rounded-md text-xs font-bold">
                ASM
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {nav.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={item.label}
                          className="transition-colors duration-150"
                          render={<Link href={item.href} />}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t">
            <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-muted-foreground truncate text-xs">{roleLabel}</p>
              </div>
            </div>
            <form action="/logout" method="POST">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0"
              >
                <LogOut className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">Log out</span>
              </Button>
            </form>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <BrandStripe />
          <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            <SidebarTrigger />
            <span className="text-muted-foreground text-sm font-medium">{portalLabel}</span>
          </header>
          <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
