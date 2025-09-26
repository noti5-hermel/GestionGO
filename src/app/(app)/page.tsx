
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Truck, FileText, ClipboardList, ScanEye, Settings } from 'lucide-react';

const dashboardItems = [
  {
    href: '/customers',
    title: 'Clientes',
    description: 'Gestiona tu base de clientes.',
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    href: '/shipments',
    title: 'Despachos',
    description: 'Organiza y sigue tus rutas de entrega.',
    icon: <Truck className="h-8 w-8 text-primary" />,
  },
  {
    href: '/invoicing',
    title: 'Facturación',
    description: 'Crea, importa y gestiona facturas.',
    icon: <FileText className="h-8 w-8 text-primary" />,
  },
  {
    href: '/shipment-invoicing',
    title: 'Asignar Facturas',
    description: 'Asocia facturas a despachos existentes.',
    icon: <ClipboardList className="h-8 w-8 text-primary" />,
  },
  {
    href: '/live-map',
    title: 'Mapa en Vivo',
    description: 'Monitorea tus despachos en tiempo real.',
    icon: <ScanEye className="h-8 w-8 text-primary" />,
  },
  {
    href: '/settings',
    title: 'Configuración',
    description: 'Administra los parámetros del sistema.',
    icon: <Settings className="h-8 w-8 text-primary" />,
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
       <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Accesos rápidos a las funciones principales.</p>
       </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardItems.map((item) => (
          <Link href={item.href} key={item.href}>
            <Card className="group hover:bg-accent/50 transition-colors hover:border-primary/50 cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                {item.icon}
                <div className="flex-1">
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
