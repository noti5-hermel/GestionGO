
'use client'

import { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <p className="text-center">Cargando mapa...</p>,
});

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
    // Si NO hay un despacho seleccionado (vista global), se suscribe a TODOS los motoristas.
    if (selectedDespachoId === 'global') {
      setRouteWaypoints([]); // Limpia la ruta
      setMotoristaForRoute(null);

      const fetchAllMotoristas = async () => {
        const { data, error } = await supabase.from('locations_motoristas').select('*');
        if (error) {
          toast({ title: "Error", description: "No se pudieron cargar las ubicaciones.", variant: "destructive" });
        } else {
          const locationsWithName = data.map(loc => ({ ...loc, name: getUserName(String(loc.id_motorista)) }));
          setAllMotoristaLocations(locationsWithName as MotoristaLocation[]);
        }
      };
      fetchAllMotoristas();

      const channel = supabase
        .channel('realtime-all-motoristas')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locations_motoristas' },
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
        ).subscribe();
      
      return () => { supabase.removeChannel(channel); };

    } else {
      // Si HAY un despacho seleccionado, se enfoca en esa ruta.
      setAllMotoristaLocations([]); // Limpia la vista global.
      const selectedDespacho = allDespachos.find(d => String(d.id_despacho) === selectedDespachoId);
      if (!selectedDespacho) return;

      const motoristaId = selectedDespacho.id_motorista;

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
            customerMap.set(customer.code_customer, { ...customer });
          }
        });
        const customers = Array.from(customerMap.values());
        setCustomerLocations(customers);

        const { data: initialLocation } = await supabase
          .from('locations_motoristas').select('*').eq('id_motorista', motoristaId).single();
        
        if (initialLocation) {
          setMotoristaForRoute({
            ...initialLocation,
            name: getUserName(String(initialLocation.id_motorista))
          } as MotoristaLocation);
        }

        // Construir los waypoints para la Directions API
        const waypoints: google.maps.DirectionsWaypoint[] = customers.map(customer => {
            const centroid = parseGeofenceCentroid(customer.geocerca);
            return centroid ? { location: { lat: centroid.lat, lng: centroid.lng }, stopover: true } : null;
        }).filter((wp): wp is google.maps.DirectionsWaypoint => wp !== null);
        
        setRouteWaypoints(waypoints);
      };

      fetchDataForDespacho();

      const channel = supabase
        .channel(`realtime-location-${selectedDespachoId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'locations_motoristas', filter: `id_motorista=eq.${motoristaId}` },
          (payload) => {
            const newLocation = payload.new as MotoristaLocation;
            setMotoristaForRoute({
              ...newLocation,
              name: getUserName(String(newLocation.id_motorista))
            });
          }
        ).subscribe();
      
      return () => {
        supabase.removeChannel(channel);
        setCustomerLocations([]);
        setMotoristaForRoute(null);
      };
    }
  }, [selectedDespachoId, allDespachos, toast, getUserName]);
  
  const handleViewChange = (value: string) => {
    setSelectedDespachoId(value);
    if (value !== 'global') {
      setCustomerLocations([]);
      setAllMotoristaLocations([]);
    }
  };

  /**
    * Parsea el centroide de una geocerca para obtener coordenadas.
    * Esto es necesario para preparar los waypoints para la API de Google.
    */
  const parseGeofenceCentroid = (geofenceData: any): { lat: number; lng: number } | null => {
      if (!geofenceData) return null;
      let allPoints: { lng: number; lat: number }[] = [];

      const getPointsFromPolygonString = (polygonString: string): { lng: number; lat: number }[] => {
          const coordsMatch = polygonString.match(/\(\((.*)\)\)/);
          if (!coordsMatch || !coordsMatch[1]) return [];
          return coordsMatch[1].split(',').map(pair => {
              const [lng, lat] = pair.trim().split(' ').map(Number);
              return { lng, lat };
          }).filter(p => !isNaN(p.lng) && !isNaN(p.lat));
      };

      if (typeof geofenceData === 'object' && geofenceData.type) {
          if (geofenceData.type === 'Polygon' && Array.isArray(geofenceData.coordinates)) {
              allPoints = geofenceData.coordinates[0].map((p: number[]) => ({ lng: p[0], lat: p[1] }));
          } else if (geofenceData.type === 'GeometryCollection' && Array.isArray(geofenceData.geometries)) {
              geofenceData.geometries.forEach((geom: any) => {
                  if (geom.type === 'Polygon') {
                      allPoints.push(...geom.coordinates[0].map((p: number[]) => ({ lng: p[0], lat: p[1] })));
                  }
              });
          }
      } else if (typeof geofenceData === 'string') {
          const wktString = geofenceData.toUpperCase();
          if (wktString.startsWith('GEOMETRYCOLLECTION')) {
              const polygonStrings = geofenceData.match(/POLYGON\s*\(\(.*?\)\)/gi) || [];
              polygonStrings.forEach(polyStr => { allPoints.push(...getPointsFromPolygonString(polyStr)); });
          } else if (wktString.startsWith('POLYGON')) {
              allPoints = getPointsFromPolygonString(geofenceData);
          }
      }

      if (allPoints.length === 0) return null;
      const centroid = allPoints.reduce((acc, point) => ({ lng: acc.lng + point.lng, lat: acc.lat + point.lat }), { lng: 0, lat: 0 });
      return { lng: centroid.lng / allPoints.length, lat: centroid.lat / allPoints.length };
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
      <CardContent className="flex-1">
        <div className="h-full w-full rounded-lg overflow-hidden border">
          <LiveMap
            origin={STARTING_POINT}
            waypoints={routeWaypoints}
            motoristaLocation={motoristaForRoute}
            allMotoristas={allMotoristaLocations}
            viewMode={selectedDespachoId === 'global' ? 'global' : 'route'}
          />
        </div>
      </CardContent>
    </Card>
  );
}
