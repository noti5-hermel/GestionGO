
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Truck,
  FileText,
  Shield,
  User,
  Map as MapIcon,
  Settings,
  LayoutDashboard,
  Car,
  ClipboardList,
  LogIn
} from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/shipments', label: 'Despachos', icon: Truck },
  { href: '/invoicing', label: 'Facturación', icon: FileText },
  { href: '/shipment-invoicing', label: 'Facturación por Despacho', icon: ClipboardList },
  { href: '/routes', label: 'Rutas', icon: MapIcon },
  { href: '/vehicles', label: 'Vehículos', icon: Car },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

const adminMenuItems = [
    { href: '/users', label: 'Usuarios', icon: User },
    { href: '/user-roles', label: 'Roles de Usuario', icon: Shield },
    { href: '/login', label: 'Login', icon: LogIn },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <SidebarMenu className="p-2">
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/')}
            tooltip={{children: item.label, side: "right", align: "center" }}
          >
            <Link href={item.href}>
              <item.icon className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
       <SidebarMenuItem>
        <div className="my-2 border-t border-sidebar-border" />
      </SidebarMenuItem>
      {adminMenuItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href) && (item.href !== '/' || pathname === '/')}
            tooltip={{children: item.label, side: "right", align: "center" }}
          >
            <Link href={item.href}>
              <item.icon className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
