import { LayoutDashboard, LogOut, Mic, History, CreditCard, FolderDown, Users, Ticket, Wallet, Cookie, AlertCircle, ChevronRight, Layers, Mail, ShieldAlert, UserCircle } from "lucide-react"
import { MailcachLogo } from "@/components/logo"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { useCredit } from "@/contexts/credit-context"

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/dashboard/history", icon: History, label: "Riwayat" },
  { to: "/dashboard/topup", icon: CreditCard, label: "Top Up" },
  { to: "/dashboard/profile", icon: UserCircle, label: "Profil" },
]

const serviceItems = [
  { to: "/dashboard/envato", icon: FolderDown, label: "Envato" },
  { to: "/dashboard/turnitin", icon: ShieldAlert, label: "Turnitin" },
  { to: "/dashboard/generate", icon: Mic, label: "ElevenLabs" },
  { to: "/dashboard/inbox", icon: Mail, label: "Email Inbox" },
]

const adminItems = [
  { to: "/dashboard/admin/users", icon: Users, label: "Manajemen User" },
  { to: "/dashboard/admin/vouchers", icon: Ticket, label: "Voucher" },
  { to: "/dashboard/admin/envato-session", icon: Cookie, label: "Envato Session" },
  { to: "/dashboard/admin/turnitin", icon: ShieldAlert, label: "Turnitin Jobs" },
]

function useSessionWarnings() {
  const { isAdmin } = useAuth()
  const [envatoWarn, setEnvatoWarn] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    import("@/lib/api").then(({ api }) =>
      api.admin.envatoSession.get()
        .then((s) => setEnvatoWarn(!s.active))
        .catch(() => setEnvatoWarn(true))
    )
  }, [isAdmin])

  return { envatoWarn }
}

function AppSidebar() {
  const { pathname } = useLocation()
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { envatoWarn } = useSessionWarnings()

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <MailcachLogo className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Mailcach</span>
                  <span className="text-xs text-sidebar-foreground/60">Panel Digital</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                <Link to="/dashboard"><LayoutDashboard /><span>Dashboard</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {(() => {
              const isServiceActive = serviceItems.some(({ to }) => pathname.startsWith(to))
              return (
                <Collapsible defaultOpen={isServiceActive} asChild className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip="Layanan" isActive={isServiceActive}>
                        <Layers />
                        <span>Layanan</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {serviceItems.map(({ to, icon: Icon, label }) => (
                          <SidebarMenuSubItem key={to}>
                            <SidebarMenuSubButton asChild isActive={pathname.startsWith(to)}>
                              <Link to={to}><Icon /><span>{label}</span></Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })()}

            {navItems.slice(1).map(({ to, icon: Icon, label }) => (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton asChild isActive={pathname.startsWith(to)} tooltip={label}>
                  <Link to={to}><Icon /><span>{label}</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarMenu>
              {adminItems.map(({ to, icon: Icon, label }) => {
                const isActive = pathname.startsWith(to)
                const showWarn = to.includes("envato-session") && envatoWarn
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                      <Link to={to}>
                        <Icon />
                        <span>{label}</span>
                        {showWarn && (
                          <AlertCircle className="ml-auto size-3.5 shrink-0 text-destructive" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex flex-col gap-0.5 px-2 py-1 text-xs group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sidebar-foreground">{user?.name}</span>
                {isAdmin && <Badge className="text-[9px] px-1 py-0 h-4">ADMIN</Badge>}
              </div>
              <span className="truncate text-sidebar-foreground/60">{user?.email}</span>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Keluar"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/generate": "ElevenLabs",
  "/dashboard/envato": "Envato Elements",
  "/dashboard/history": "Riwayat",
  "/dashboard/topup": "Top Up Kredit",
  "/dashboard/admin/users": "Manajemen User",
  "/dashboard/admin/vouchers": "Voucher Redeem",
  "/dashboard/admin/envato-session": "Envato Session",
  "/dashboard/admin/turnitin": "Turnitin Jobs",
  "/dashboard/inbox": "Email Inbox",
  "/dashboard/turnitin": "Cek Plagiarisme",
  "/dashboard/profile": "Profil Saya",
  "/dashboard/profile/change-email": "Ganti Email",
  "/dashboard/profile/change-password": "Ganti Password",
}

function TopbarBalance() {
  const { credits, isLowCredit } = useCredit()
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate("/dashboard/topup")}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition-colors hover:bg-accent ${isLowCredit ? "text-amber-500" : "text-foreground"}`}
    >
      <Wallet className="size-3.5 shrink-0" />
      <span className="tabular-nums">Rp {credits.toLocaleString("id-ID")}</span>
      {isLowCredit && <span className="size-1.5 rounded-full bg-amber-500" />}
    </button>
  )
}

export default function DashboardLayout() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? "Dashboard"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-x-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="font-heading text-sm font-medium">{title}</h1>
          <div className="ml-auto flex items-center">
            <TopbarBalance />
          </div>
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
