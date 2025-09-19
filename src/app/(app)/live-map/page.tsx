
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import 'leaflet/dist/leaflet.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * @file live-map/page.tsx
 * @description Página que muestra un mapa con dos modos:
 * 1. Vista Global: Muestra la ubicación en tiempo real de todos los motoristas activos.
 * 2. Vista por Despacho: Al seleccionar un despacho, visualiza la ruta, los clientes y la ubicación en vivo del motorista específico de esa ruta.
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
const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <p className="text-center">Cargando mapa...</p>,
});

// Punto de partida fijo (Bodega/Oficina)
const STARTING_POINT = { lat: 13.725410116705362, lon: -89.21911777270175, name: 'Bodega' };

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
  const { toast } = useToast();

  const getRouteDescription = (routeId: string) => allRoutes.find(r => r.id_ruta === routeId)?.ruta_desc || routeId;
  const getUserName = (userId: string) => allUsers.find(u => u.id_user === userId)?.name || userId;

  // Carga inicial de datos estáticos (despachos, usuarios, rutas).
  const fetchStaticData = async () => {
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
  };
  
  useEffect(() => {
    fetchStaticData();
  }, [toast]);
  

  // Efecto que gestiona las suscripciones en tiempo real.
  useEffect(() => {
    // Si NO hay un despacho seleccionado (vista global), se suscribe a TODOS los motoristas.
    if (selectedDespachoId === 'global') {
      // 1. Carga inicial de todas las ubicaciones de motoristas.
      const fetchAllMotoristas = async () => {
        const { data, error } = await supabase.from('locations_motoristas').select('*');
        if (error) {
          toast({ title: "Error", description: "No se pudieron cargar las ubicaciones de los motoristas.", variant: "destructive" });
        } else {
          const locationsWithName = data.map(loc => ({ ...loc, name: getUserName(String(loc.id_motorista)) }));
          setAllMotoristaLocations(locationsWithName as MotoristaLocation[]);
        }
      };
      fetchAllMotoristas();

      // 2. Suscripción a cambios en tiempo real para TODOS los motoristas.
      const channel = supabase
        .channel('realtime-all-motoristas')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'locations_motoristas' },
          (payload) => {
            const newLocation = { ...payload.new, name: getUserName(String(payload.new.id_motorista)) } as MotoristaLocation;
            setAllMotoristaLocations(prevLocations => {
              const existingIndex = prevLocations.findIndex(l => l.id_motorista === newLocation.id_motorista);
              if (existingIndex !== -1) {
                const updatedLocations = [...prevLocations];
                updatedLocations[existingIndex] = newLocation;
                return updatedLocations;
              } else {
                return [...prevLocations, newLocation];
              }
            });
          }
        )
        .subscribe();
      
      // Limpia la suscripción al desmontar o cambiar de modo.
      return () => {
        supabase.removeChannel(channel);
      };

    } else {
      // Si HAY un despacho seleccionado, se suscribe solo al motorista de ESE despacho.
      const selectedDespacho = allDespachos.find(d => String(d.id_despacho) === selectedDespachoId);
      if (!selectedDespacho) return;

      const motoristaId = selectedDespacho.id_motorista;

      // 1. Obtiene los datos específicos de la ruta del despacho.
      const fetchDataForDespacho = async () => {
        const { data: facturasDespacho, error: facturasError } = await supabase
          .from('facturacion_x_despacho')
          .select('facturacion!inner(customer!inner(code_customer, customer_name, geocerca))')
          .eq('id_despacho', selectedDespachoId);

        if (facturasError) {
          toast({ title: "Error", description: "No se pudieron obtener las facturas del despacho.", variant: "destructive" });
          return;
        }
        
        const customerMap = new Map<string, CustomerLocation>();
        (facturasDespacho as any).forEach((factura: any) => {
          const customer = factura.facturacion.customer;
          if (customer && customer.geocerca) {
            customerMap.set(customer.code_customer, {
              code_customer: customer.code_customer,
              customer_name: customer.customer_name,
              geocerca: customer.geocerca
            });
          }
        });
        setCustomerLocations(Array.from(customerMap.values()));

        const { data: initialLocation, error: initialLocationError } = await supabase
          .from('locations_motoristas')
          .select('*')
          .eq('id_motorista', motoristaId)
          .single();
        
        if (initialLocation && !initialLocationError) {
          setAllMotoristaLocations([{
            ...initialLocation,
            name: getUserName(String(initialLocation.id_motorista))
          } as MotoristaLocation]);
        }
      };

      fetchDataForDespacho();

      // 2. Suscripción en tiempo real solo para el motorista del despacho.
      const channel = supabase
        .channel(`realtime-location-${selectedDespachoId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'locations_motoristas', filter: `id_motorista=eq.${motoristaId}` },
          (payload) => {
            const newLocation = payload.new as MotoristaLocation;
            setAllMotoristaLocations([{
              ...newLocation,
              name: getUserName(String(newLocation.id_motorista))
            }]);
          }
        )
        .subscribe();
      
      // Limpia la suscripción y los datos de la ruta al cambiar de despacho.
      return () => {
        supabase.removeChannel(channel);
        setCustomerLocations([]);
        setAllMotoristaLocations([]);
      };
    }
  }, [selectedDespachoId, allDespachos, toast, getUserName]);
  
  // Combina todos los puntos a mostrar en el mapa según el modo.
  const allPoints = useMemo(() => {
    let points = allMotoristaLocations.map(m => ({ ...m, type: 'motorista' as const }));

    if (selectedDespachoId !== 'global') {
        points.push(...customerLocations.map(c => ({...c, type: 'customer' as const})));
        points.push({ location: `POINT(${STARTING_POINT.lon} ${STARTING_POINT.lat})`, name: STARTING_POINT.name, type: 'start' as const });
    }
    
    return points;
  }, [allMotoristaLocations, customerLocations, selectedDespachoId]);
  
  const handleViewChange = (value: string) => {
    setSelectedDespachoId(value);
    // Limpia los datos de la ruta anterior para evitar un flash de datos incorrectos
    if (value !== 'global') {
      setCustomerLocations([]);
      setAllMotoristaLocations([]);
    }
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
                <SelectTrigger className="w-full md:w-[400px]">
                    <SelectValue placeholder="Vista Global (todos los motoristas)" />
                </SelectTrigger>
                <SelectContent>
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
      <CardContent className="flex-1">
        <div className="h-full w-full rounded-lg overflow-hidden border">
          <LiveMap points={allPoints} />
        </div>
      </CardContent>
    </Card>
  );
}
