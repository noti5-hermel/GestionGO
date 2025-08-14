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
  CalendarDays,
  FileCog,
  LayoutDashboard
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
  { href: '/routes', label: 'Rutas', icon: MapIcon },
  { href: '/payment-terms', label: 'Términos de Pago', icon: CalendarDays },
  { href: '/vehicle-billing', label: 'Facturación Vehicular', icon: FileCog },
  { href: '/users', label: 'Usuarios', icon: User },
  { href: '/user-roles', label: 'Roles de Usuario', icon: Shield },
]

export function MainNav() {
  const pathname = usePathname()

  return (
    <SidebarMenu className="p-2">
      {menuItems.map((item) => (
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
    </SidebarMenu>
  )
}
