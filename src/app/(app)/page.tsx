
'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Users, Truck, FileText, ClipboardList, ScanEye, Settings, Package, DollarSign, ListChecks } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * @file page.tsx
 * @description Página principal del dashboard. Muestra accesos directos a las
 * funcionalidades más importantes y KPIs (Indicadores Clave de Rendimiento) en tiempo real
 * sobre las operaciones del día.
 */

// Define los elementos que se mostrarán en los accesos directos.
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
  const [shipmentsToday, setShipmentsToday] = useState(0);
  const [totalToCollectToday, setTotalToCollectToday] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('despacho')
        .select('total_general')
        .eq('fecha_despacho', today);

      if (error) {
        console.error("Error fetching dashboard data:", error);
      } else if (data) {
        const totalAmount = data.reduce((sum, shipment) => sum + shipment.total_general, 0);
        setShipmentsToday(data.length);
        setTotalToCollectToday(totalAmount);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen de las operaciones del día y accesos rápidos.</p>
      </div>
      
      {/* Sección de KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despachos para Hoy</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-1/2 bg-muted-foreground/20 animate-pulse rounded-md" />
            ) : (
              <div className="text-3xl font-bold">{shipmentsToday}</div>
            )}
            <p className="text-xs text-muted-foreground">Total de viajes programados para la fecha actual.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Cobrar Hoy</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 w-1/2 bg-muted-foreground/20 animate-pulse rounded-md" />
            ) : (
              <div className="text-3xl font-bold">${totalToCollectToday.toFixed(2)}</div>
            )}
            <p className="text-xs text-muted-foreground">Suma de los montos de todos los despachos del día.</p>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Accesos Directos */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Accesos Rápidos</h2>
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
    </div>
  )
}
