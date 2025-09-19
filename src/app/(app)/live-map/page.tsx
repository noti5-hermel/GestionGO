
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * @file live-map/page.tsx
 * @description Página que muestra un mapa con la ruta planificada (geocercas),
 * el recorrido real del motorista y su posición actual.
 */

// --- TIPOS DE DATOS ---

type Customer = {
  code_customer: string;
  customer_name: string;
  geocerca: any;
  state: boolean;
  comprobante: string | null;
};

type Despacho = {
  id_despacho: number;
  fecha_despacho: string;
  id_ruta: string;
  id_motorista: string;
};

type User = {
  id_user: string;
  name: string;
};

type Route = {
  id_ruta: string;
  ruta_desc: string;
};

// Tipo para un punto del historial de ubicación.
type LocationPoint = { lat: number; lng: number };

// Carga dinámica del componente de mapa para evitar problemas con SSR.
const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false,
  loading: () => <p className="text-center p-10">Cargando mapa...</p>,
});

const BODEGA_LOCATION = { lat: 13.725410116705362, lng: -89.21911777270175 };

/**
 * Componente principal de la página del Mapa en Vivo.
 */
export default function LiveMapPage() {
  // --- ESTADOS ---
  const [customerGeofences, setCustomerGeofences] = useState<Customer[]>([]);
  const [motoristaPath, setMotoristaPath] = useState<LocationPoint[]>([]);
  const [motoristaLocation, setMotoristaLocation] = useState<LocationPoint | null>(null);

  const [allDespachos, setAllDespachos] = useState<Despacho[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDespachoId, setSelectedDespachoId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // --- OBTENCIÓN DE DATOS ---

  const fetchStaticData = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  useEffect(() => {
    const fetchShipmentData = async () => {
      if (!selectedDespachoId) {
        setCustomerGeofences([]);
        setMotoristaPath([]);
        setMotoristaLocation(null);
        return;
      }
      setLoading(true);
      
      const despacho = allDespachos.find(d => String(d.id_despacho) === selectedDespachoId);
      if (!despacho) {
        setLoading(false);
        return;
      }

      // --- 1. Obtener datos de las facturas y clientes (ruta planificada) ---
      const { data: facDespacho, error: facDespachoError } = await supabase
        .from('facturacion_x_despacho')
        .select('id_factura, state, comprobante')
        .eq('id_despacho', selectedDespachoId);

      if (facDespachoError) {
        toast({ title: "Error", description: "No se pudieron obtener las facturas del despacho.", variant: "destructive" });
      } else {
        const invoiceIds = facDespacho.map(item => item.id_factura);
        if (invoiceIds.length > 0) {
          const invoiceStatusMap = new Map(facDespacho.map(item => [item.id_factura, { state: item.state, comprobante: item.comprobante }]));

          const { data: facturacionData, error: facturacionError } = await supabase.from('facturacion').select('id_factura, code_customer').in('id_factura', invoiceIds);
          
          if (facturacionData) {
            const invoiceCustomerMap = new Map(facturacionData.map(item => [item.id_factura, item.code_customer]));
            const customerCodes = [...new Set(facturacionData.map(item => item.code_customer))];

            const { data: customersData, error: customersError } = await supabase.from('customer').select('code_customer, customer_name, geocerca').in('code_customer', customerCodes).not('geocerca', 'is', null);
            
            if (customersData) {
              const enrichedCustomers = customersData.map(customer => {
                  const invoiceId = [...invoiceCustomerMap.entries()].find(([_, cCode]) => cCode === customer.code_customer)?.[0];
                  const status = invoiceId ? invoiceStatusMap.get(invoiceId) : { state: false, comprobante: null };
                  return { ...customer, state: status?.state || false, comprobante: status?.comprobante || null };
              });
              setCustomerGeofences(enrichedCustomers as Customer[]);
            }
          }
        } else {
            setCustomerGeofences([]);
        }
      }

      // --- 2. Obtener el historial de ubicación del motorista (recorrido real) ---
      const motoristaIdAsInt = parseInt(despacho.id_motorista, 10);
      if (isNaN(motoristaIdAsInt)) {
        console.warn("ID de motorista inválido:", despacho.id_motorista);
        setMotoristaPath([]);
      } else {
        const { data: historyData, error: historyError } = await supabase.rpc('get_location_history_by_day', {
            p_id_motorista: motoristaIdAsInt,
            p_date: despacho.fecha_despacho
        });

        if (historyError) {
          console.warn("No se pudo obtener el historial de ruta del motorista (puede que no haya iniciado):", historyError.message);
          setMotoristaPath([]);
        } else if (historyData) {
          const path = (historyData as any[]).map((p: any) => ({ lat: p.lat, lng: p.lng }));
          setMotoristaPath(path);
        } else {
          setMotoristaPath([]);
        }
      }


      // --- 3. Obtener la última ubicación conocida del motorista ---
      const { data: lastLocationData, error: lastLocationError } = await supabase
        .from('locations_motoristas')
        .select('location')
        .eq('id_motorista', motoristaIdAsInt)
        .single();
      
      if (lastLocationData && lastLocationData.location) {
          // PostGIS puede devolver GeoJSON, que es un objeto, no un string.
          if (typeof lastLocationData.location === 'object' && lastLocationData.location.coordinates) {
              const [lng, lat] = lastLocationData.location.coordinates;
              setMotoristaLocation({ lat, lng });
          } else if (typeof lastLocationData.location === 'string') {
              const match = lastLocationData.location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
              if(match) {
                setMotoristaLocation({ lat: parseFloat(match[2]), lng: parseFloat(match[1]) });
              }
          }
      } else {
        setMotoristaLocation(null);
      }
      
      setLoading(false);
    };

    fetchShipmentData();
  }, [selectedDespachoId, toast, allDespachos]);
  
  // --- FUNCIONES AUXILIARES ---

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
    setSelectedDespachoId('');
    setCustomerGeofences([]);
    setMotoristaPath([]);
    setMotoristaLocation(null);
  };

  const handleShipmentChange = (despachoId: string) => {
    setSelectedDespachoId(despachoId);
  };
  
  const despachosDelDia = useMemo(() => {
    if (!selectedDate) return [];
    return allDespachos.filter(d => d.fecha_despacho === selectedDate);
  }, [allDespachos, selectedDate]);

  const getRouteDescription = useCallback((routeId: string) => {
    return allRoutes.find(r => r.id_ruta === routeId)?.ruta_desc || routeId;
  }, [allRoutes]);
  
  const getUserName = useCallback((userId: string) => {
    return allUsers.find(u => u.id_user === userId)?.name || userId;
  }, [allUsers]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Mapa de Rutas por Despacho</CardTitle>
              <CardDescription>
                Visualice la ruta planificada (azul) y el recorrido real del motorista (naranja).
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="grid w-full sm:w-auto items-center gap-1.5">
                  <Label htmlFor="fecha-despacho">Fecha del Despacho</Label>
                  <Input type="date" id="fecha-despacho" value={selectedDate} onChange={handleDateChange} />
              </div>
              <div className="grid w-full sm:w-[350px] items-center gap-1.5">
                  <Label htmlFor="despacho-select">Despacho</Label>
                  <Select value={selectedDespachoId} onValueChange={handleShipmentChange} disabled={despachosDelDia.length === 0}>
                      <SelectTrigger id="despacho-select">
                          <SelectValue placeholder="Seleccione un despacho..." />
                      </SelectTrigger>
                      <SelectContent>
                          {despachosDelDia.length > 0 ? despachosDelDia.map(d => (
                              <SelectItem key={d.id_despacho} value={String(d.id_despacho)}>
                                 ID: {d.id_despacho} | {getRouteDescription(d.id_ruta)} | {getUserName(d.id_motorista)}
                              </SelectItem>
                          )) : <SelectItem value="none" disabled>No hay despachos para esta fecha</SelectItem>}
                      </SelectContent>
                  </Select>
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex items-center justify-center p-0 md:p-6">
        <LiveMap
          customers={customerGeofences}
          bodegaLocation={BODEGA_LOCATION}
          motoristaPath={motoristaPath}
          motoristaLocation={motoristaLocation}
          loading={loading}
          viewMode="route"
        />
      </CardContent>
    </Card>
  );
}
