
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Construction } from 'lucide-react';


/**
 * @file live-map/page.tsx
 * @description Página que muestra un mapa con dos modos:
 * 1. Vista Global: Muestra la ubicación en tiempo real de todos los motoristas activos.
 * 2. Vista por Despacho: Al seleccionar un despacho, calcula una ruta óptima y visualiza el recorrido, los clientes y la ubicación en vivo del motorista.
 */

// Tipos de datos para esta página.
type MotoristaLocation = {
  id_motorista: number;
  last_update: string;
  location: string;
  name?: string;
};

type CustomerLocation = {
  code_customer: string;
  customer_name: string;
  geocerca: any;
};

type Despacho = {
  id_despacho: number;
  fecha_despacho: string;
  id_motorista: string;
  id_ruta: string;
};

type User = {
  id_user: string;
  name: string;
};

type Route = {
  id_ruta: string;
  ruta_desc: string;
};

// Carga dinámica del componente de mapa para evitar problemas con SSR.
/*
const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <p className="text-center">Cargando mapa...</p>,
});
*/

// Punto de partida fijo (Bodega/Oficina)
const STARTING_POINT = { lat: 13.725410116705362, lng: -89.21911777270175, name: 'Bodega' };

/**
 * Componente principal de la página del Mapa en Vivo.
 */
export default function LiveMapPage() {
  // --- ESTADOS ---
  const [allMotoristaLocations, setAllMotoristaLocations] = useState<MotoristaLocation[]>([]);
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [allDespachos, setAllDespachos] = useState<Despacho[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [selectedDespachoId, setSelectedDespachoId] = useState<string>('global');
  const [routeWaypoints, setRouteWaypoints] = useState<google.maps.DirectionsWaypoint[]>([]);
  const [motoristaForRoute, setMotoristaForRoute] = useState<MotoristaLocation | null>(null);
  const { toast } = useToast();

  const getRouteDescription = useCallback((routeId: string) => {
    return allRoutes.find(r => r.id_ruta === routeId)?.ruta_desc || routeId;
  }, [allRoutes]);
  
  const getUserName = useCallback((userId: string) => {
    return allUsers.find(u => u.id_user === userId)?.name || userId;
  }, [allUsers]);

  // Carga inicial de datos estáticos (despachos, usuarios, rutas).
  const fetchStaticData = useCallback(async () => {
    const [despachosRes, usersRes, routesRes] = await Promise.all([
      supabase.from('despacho').select('*').order('fecha_despacho', { ascending: false }),
      supabase.from('usuario').select('id_user, name'),
      supabase.from('rutas').select('id_ruta, ruta_desc')
    ]);

    if (despachosRes.error) toast({ title: "Error", description: "No se pudieron cargar los despachos.", variant: "destructive" });
    else setAllDespachos(despachosRes.data as Despacho[]);

    if (usersRes.error) toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
    else setAllUsers(usersRes.data as User[]);

    if (routesRes.error) toast({ title: "Error", description: "No se pudieron cargar las rutas.", variant: "destructive" });
    else setAllRoutes(routesRes.data as Route[]);
  }, [toast]);
  
  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);
  
  // Efecto que gestiona las suscripciones en tiempo real.
  useEffect(() => {
    // La lógica de suscripción se mantiene pero no se usará para renderizar el mapa por ahora.
  }, [selectedDespachoId, allDespachos, toast, getUserName]);
  
  const handleViewChange = (value: string) => {
    setSelectedDespachoId(value);
  };


  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Mapa de Seguimiento</CardTitle>
              <CardDescription>
                Vista global de motoristas. Seleccione un despacho para ver su ruta específica.
              </CardDescription>
            </div>
             <Select value={selectedDespachoId} onValueChange={handleViewChange}>
                <SelectTrigger className="w-full md:w-[400px] z-[1000]">
                    <SelectValue placeholder="Vista Global (todos los motoristas)" />
                </SelectTrigger>
                <SelectContent className="z-[1000]">
                     <SelectItem value="global">Vista Global (todos los motoristas)</SelectItem>
                    {allDespachos.map(d => (
                        <SelectItem key={d.id_despacho} value={String(d.id_despacho)}>
                           ID: {d.id_despacho} | {getRouteDescription(d.id_ruta)} | {getUserName(d.id_motorista)} | {new Date(d.fecha_despacho + 'T00:00:00Z').toLocaleDateString()}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center">
        <Alert className="max-w-md">
          <Construction className="h-4 w-4" />
          <AlertTitle>Función en Mantenimiento</AlertTitle>
          <AlertDescription>
            La funcionalidad del mapa en vivo está siendo revisada y mejorada.
            Estará disponible próximamente.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
