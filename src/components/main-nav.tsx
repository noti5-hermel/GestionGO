
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
  Image as ImageIcon,
  Globe,
  Map,
  ScanEye,
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
  { href: '/route-generation', label: 'Generación de Ruta', icon: Map },
  { href: '/invoicing', label: 'Facturación', icon: FileText },
  { href: '/shipment-invoicing', label: 'Facturación por Despacho', icon: ClipboardList },
  { href: '/routes', label: 'Rutas', icon: MapIcon },
  { href: '/vehicles', label: 'Vehículos', icon: Car },
  { href: '/geofences', label: 'Geocercas', icon: Globe },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

const adminMenuItems = [
    { href: '/live-map', label: 'Mapa en Vivo', icon: ScanEye },
    { href: '/users', label: 'Usuarios', icon: User },
    { href: '/user-roles', label: 'Roles de Usuario', icon: Shield },
    { href: '/image-test', label: 'Test de Imágenes', icon: ImageIcon },
]

export function MainNav({ session }: MainNavProps) {
  const pathname = usePathname()

  const userRole = session?.role?.toLowerCase() || ''
  
  const restrictedRoles = [
    'motorista', 
    'auxiliar', 
    'bodega',
    'reparto',
    'asist.admon',
    'gerente.admon',
    'cobros'
  ];

  const isRestrictedRole = restrictedRoles.some(role => userRole.includes(role));
  const isAdmin = userRole.includes('admin');

  const menuItemsToRender = isRestrictedRole
    ? allMenuItems.filter(item => item.href === '/shipments')
    : allMenuItems;
  
  const adminItemsToRender = isRestrictedRole ? [] : (isAdmin ? adminMenuItems : adminMenuItems.filter(item => item.href !== '/image-test'));


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
