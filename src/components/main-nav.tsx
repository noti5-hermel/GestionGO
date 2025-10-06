
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
  Download,
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

const utilityMenuItems = [
    { href: '/install', label: 'Instalar App', icon: Download },
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
  const isFacturacionRole = userRole.includes('facturacion');
  const isAdmin = userRole.includes('admin');

  // Lógica de menú mejorada.
  let menuItemsToRender = allMenuItems;

  if (isRestrictedRole) {
    // Roles operativos solo ven despachos.
    menuItemsToRender = allMenuItems.filter(item => item.href === '/shipments');
  } else if (isFacturacionRole) {
    // Rol de facturación no ve el dashboard.
    menuItemsToRender = allMenuItems.filter(item => item.href !== '/');
  } else if (!isAdmin) {
    // Otros roles no-admin tampoco ven el dashboard.
     menuItemsToRender = allMenuItems.filter(item => item.href !== '/');
  }
  
  // Solo los admins ven ciertos items de administración.
  const adminItemsToRender = isAdmin 
    ? adminMenuItems 
    : [];


  return (
    <SidebarMenu className="p-2">
      {/* El dashboard solo lo ven los admins */}
      {isAdmin && (
         <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            isActive={pathname === '/'}
            tooltip={{children: 'Dashboard', side: "right", align: "center" }}
          >
            <Link href='/'>
              <LayoutDashboard className="size-4 shrink-0" />
              <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}

      {menuItemsToRender.map((item) => {
        // Evita renderizar el dashboard dos veces si ya fue incluido para el admin
        if(item.href === '/' && isAdmin) return null;
        return (
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
        )
      })}
      
      {(adminItemsToRender.length > 0 || utilityMenuItems.length > 0) && (
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

      {utilityMenuItems.map((item) => (
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
