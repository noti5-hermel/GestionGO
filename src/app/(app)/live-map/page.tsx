
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
 * @description Página que muestra un mapa con las geocercas de los clientes de un despacho específico
 * y traza una ruta entre ellas. Permite filtrar por fecha y luego por despacho.
 */

// --- TIPOS DE DATOS ---

type Customer = {
  code_customer: string;
  customer_name: string;
  geocerca: any; 
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
  const [allDespachos, setAllDespachos] = useState<Despacho[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDespachoId, setSelectedDespachoId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // --- OBTENCIÓN DE DATOS ---

  // Obtiene datos estáticos que no cambian frecuentemente (todos los despachos, usuarios, rutas).
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

  // Se ejecuta una vez al montar el componente.
  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  // Efecto que se dispara al cambiar el despacho seleccionado.
  // Obtiene las geocercas de los clientes para ese despacho.
  useEffect(() => {
    const fetchCustomerGeofences = async () => {
      if (!selectedDespachoId) {
        setCustomerGeofences([]);
        return;
      }
      setLoading(true);

      // 1. Obtener los `id_factura` de 'facturacion_x_despacho'.
      const { data: facDespacho, error: facDespachoError } = await supabase
        .from('facturacion_x_despacho')
        .select('id_factura')
        .eq('id_despacho', selectedDespachoId);

      if (facDespachoError) {
        toast({ title: "Error", description: "No se pudieron obtener las facturas del despacho.", variant: "destructive" });
        setLoading(false);
        return;
      }
      
      const invoiceIds = facDespacho.map(item => item.id_factura);
      if (invoiceIds.length === 0) {
        setCustomerGeofences([]);
        setLoading(false);
        return;
      }

      // 2. Obtener los `code_customer` de 'facturacion'.
      const { data: facturacionData, error: facturacionError } = await supabase
        .from('facturacion')
        .select('code_customer')
        .in('id_factura', invoiceIds);
        
      if (facturacionError) {
        toast({ title: "Error", description: "No se pudieron obtener los clientes de las facturas.", variant: "destructive" });
        setLoading(false);
        return;
      }
        
      const customerCodes = [...new Set(facturacionData.map(item => item.code_customer))];

      // 3. Obtener los clientes con sus geocercas.
      const { data: customersData, error: customersError } = await supabase
        .from('customer')
        .select('code_customer, customer_name, geocerca')
        .in('code_customer', customerCodes)
        .not('geocerca', 'is', null);
      
      if (customersError) {
        toast({ title: "Error", description: "No se pudieron cargar las geocercas de los clientes.", variant: "destructive" });
      } else {
        setCustomerGeofences(customersData as Customer[]);
      }
      setLoading(false);
    };

    fetchCustomerGeofences();
  }, [selectedDespachoId, toast]);
  
  // --- FUNCIONES AUXILIARES ---

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
    setSelectedDespachoId(''); // Resetea el despacho al cambiar la fecha.
    setCustomerGeofences([]); // Limpia las geocercas del mapa.
  };

  const handleShipmentChange = (despachoId: string) => {
    setSelectedDespachoId(despachoId);
  };
  
  // Filtra los despachos que coinciden con la fecha seleccionada.
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
                Seleccione una fecha y un despacho para visualizar la ruta y las geocercas de los clientes.
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
          loading={loading}
          viewMode="route"
        />
      </CardContent>
    </Card>
  );
}
