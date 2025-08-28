
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
  ClipboardList
} from 'lucide-react'
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar'

interface UserSession {
  id: string;
  name: string;
  role: string;
}

interface MainNavProps {
  session: UserSession | null;
}

const allMenuItems = [
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
]

export function MainNav({ session }: MainNavProps) {
  const pathname = usePathname()

  const userRole = session?.role?.toLowerCase() || ''
  
  const isRestrictedRole = userRole.includes('motorista') || userRole.includes('auxiliar') || userRole.includes('bodega');

  const menuItemsToRender = isRestrictedRole
    ? allMenuItems.filter(item => item.href === '/shipments')
    : allMenuItems;
  
  const adminItemsToRender = isRestrictedRole ? [] : adminMenuItems;


  return (
    <SidebarMenu className="p-2">
      {menuItemsToRender.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={{children: item.label, side: "right", align: "center" }}
          >
            <Link href={item.href}>
              <item.icon className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
      
      {adminItemsToRender.length > 0 && (
        <SidebarMenuItem>
          <div className="my-2 border-t border-sidebar-border" />
        </SidebarMenuItem>
      )}

      {adminItemsToRender.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            isActive={pathname.startsWith(item.href)}
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
