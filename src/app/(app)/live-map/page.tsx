
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
 * @description Página que muestra un mapa interactivo para el seguimiento de un despacho.
 * Al seleccionar un despacho, visualiza la ruta planificada (clientes), el recorrido real
 * del motorista (grabado específicamente para ese despacho) y su última ubicación conocida.
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

  // Obtiene datos estáticos como despachos, usuarios y rutas al cargar.
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

  // Se activa al seleccionar un despacho y carga todos los datos geográficos asociados.
  useEffect(() => {
    const fetchShipmentData = async () => {
      // Limpia el mapa si no hay un despacho seleccionado.
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
        .select('id_factura, state, comprobante, orden_visita') // Incluimos orden_visita
        .eq('id_despacho', selectedDespachoId);

      if (facDespachoError) {
        toast({ title: "Error", description: "No se pudieron obtener las facturas del despacho.", variant: "destructive" });
      } else {
        const invoiceIds = facDespacho.map(item => item.id_factura);
        if (invoiceIds.length > 0) {
          const invoiceDetailsMap = new Map(facDespacho.map(item => [item.id_factura, { state: item.state, comprobante: item.comprobante, orden_visita: item.orden_visita }]));

          const { data: facturacionData, error: facturacionError } = await supabase.from('facturacion').select('id_factura, code_customer').in('id_factura', invoiceIds);
          
          if (facturacionData) {
            const customerCodes = [...new Set(facturacionData.map(item => item.code_customer))];

            const { data: customersData, error: customersError } = await supabase.from('customer').select('code_customer, customer_name, geocerca').in('code_customer', customerCodes).not('geocerca', 'is', null);
            
            if (customersData) {
              const enrichedCustomers = customersData.map(customer => {
                  const invoiceId = facturacionData.find(f => f.code_customer === customer.code_customer)?.id_factura;
                  const details = invoiceId ? invoiceDetailsMap.get(invoiceId) : { state: false, comprobante: null, orden_visita: null };
                  return { ...customer, ...details };
              });
              
              // Ordenar clientes por `orden_visita` si existe, sino, mantener el orden de la BD.
              enrichedCustomers.sort((a,b) => {
                const orderA = a.orden_visita === null ? Infinity : a.orden_visita;
                const orderB = b.orden_visita === null ? Infinity : b.orden_visita;
                return orderA - orderB;
              });

              setCustomerGeofences(enrichedCustomers as Customer[]);
            }
          }
        } else {
            setCustomerGeofences([]);
        }
      }

      // --- 2. Obtener el historial de ubicación del despacho (recorrido real) ---
      // Esta es la consulta clave: filtra el historial por el `id_despacho` seleccionado.
      const { data: historyData, error: historyError } = await supabase
        .from('location_history')
        .select('location')
        .eq('id_despacho', selectedDespachoId)
        .order('timestamp', { ascending: true });
        
      if (historyError) {
          console.warn("No se pudo obtener el historial de ruta del despacho:", historyError.message);
          setMotoristaPath([]);
      } else if (historyData) {
          const path = historyData
            .map(p => {
              // Parsea la ubicación, que puede venir en formato WKT o GeoJSON.
              if (typeof p.location === 'string') {
                const match = p.location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
                if (match) return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) };
              }
              if (typeof p.location === 'object' && p.location.coordinates) {
                const [lng, lat] = p.location.coordinates;
                return { lat, lng };
              }
              return null;
            })
            .filter((p): p is LocationPoint => p !== null);
          setMotoristaPath(path);
      } else {
          setMotoristaPath([]);
      }


      // --- 3. Obtener la última ubicación conocida del motorista asociado a este despacho ---
      const motoristaIdAsInt = parseInt(despacho.id_motorista, 10);
      if(!isNaN(motoristaIdAsInt)) {
        const { data: lastLocationData, error: lastLocationError } = await supabase
          .from('locations_motoristas')
          .select('location')
          .eq('id_motorista', motoristaIdAsInt)
          .single();
        
        if (lastLocationData && lastLocationData.location) {
            // Parsea la ubicación.
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
      }
      
      setLoading(false);
    };

    fetchShipmentData();
  }, [selectedDespachoId, toast, allDespachos]);
  
  // --- FUNCIONES AUXILIARES DE LA UI ---

  // Maneja el cambio de fecha y limpia la selección de despacho.
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
  
  // Filtra los despachos disponibles para la fecha seleccionada.
  const despachosDelDia = useMemo(() => {
    if (!selectedDate) return [];
    return allDespachos.filter(d => d.fecha_despacho === selectedDate);
  }, [allDespachos, selectedDate]);

  // Funciones para obtener descripciones legibles a partir de IDs.
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
