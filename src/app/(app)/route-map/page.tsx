'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { MapCustomer } from '@/components/route-map-view';

/**
 * @file route-map/page.tsx
 * @description Mapa con Leaflet que muestra las geocercas y rutas de los despachos del día.
 * Permite filtrar por fecha y despacho, y visualiza los polígonos de geocercas coloreados
 * por estado de pago, conectados según el orden de visita.
 */

const RouteMap = dynamic(() => import('@/components/route-map-view'), {
  ssr: false,
  loading: () => <p className="text-center p-10 text-muted-foreground">Cargando mapa...</p>,
});

const BODEGA_LOCATION = { lat: 13.725410116705362, lng: -89.21911777270175 };

type Despacho = {
  id_despacho: number;
  fecha_despacho: string;
  id_ruta: string;
};

type Route = { id_ruta: string; ruta_desc: string };

export default function RouteMapPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedDespachoId, setSelectedDespachoId] = useState<string>('');
  const [customers, setCustomers] = useState<MapCustomer[]>([]);
  const [despachoLabel, setDespachoLabel] = useState('Bodega');
  const [loading, setLoading] = useState(false);

  const fetchDespachos = useCallback(async () => {
    setLoading(true);
    setSelectedDespachoId('');
    setCustomers([]);

    const [despachosRes, routesRes] = await Promise.all([
      supabase.from('despacho').select('id_despacho, fecha_despacho, id_ruta').eq('fecha_despacho', selectedDate),
      supabase.from('rutas').select('id_ruta, ruta_desc'),
    ]);

    if (despachosRes.error) {
      toast({ title: 'Error', description: 'No se pudieron cargar los despachos.', variant: 'destructive' });
      setDespachos([]);
    } else {
      setDespachos(despachosRes.data as Despacho[]);
    }

    if (!routesRes.error) setRoutes(routesRes.data as Route[]);
    setLoading(false);
  }, [selectedDate, toast]);

  useEffect(() => { fetchDespachos(); }, [fetchDespachos]);

  const loadDespachoData = useCallback(async (despachoId: string) => {
    if (!despachoId) { setCustomers([]); return; }
    setLoading(true);

    const despacho = despachos.find(d => String(d.id_despacho) === despachoId);
    if (despacho) {
      const route = routes.find(r => r.id_ruta === despacho.id_ruta);
      setDespachoLabel(route ? `Despacho #${despacho.id_despacho} - ${route.ruta_desc}` : `Despacho #${despacho.id_despacho}`);
    }

    const { data: facDespacho, error: facError } = await supabase
      .from('facturacion_x_despacho')
      .select('id_factura, state, orden_visita')
      .eq('id_despacho', despachoId);

    if (facError) {
      toast({ title: 'Error', description: 'No se pudieron obtener las facturas del despacho.', variant: 'destructive' });
      setCustomers([]);
      setLoading(false);
      return;
    }

    const invoiceIds = (facDespacho || []).map(f => f.id_factura);
    if (invoiceIds.length === 0) { setCustomers([]); setLoading(false); return; }

    const invoiceStateMap = new Map((facDespacho || []).map(f => [f.id_factura, { state: f.state, orden_visita: f.orden_visita }]));

    const { data: facturacionData, error: factError } = await supabase
      .from('facturacion')
      .select('id_factura, reference_number, code_customer, customer_name')
      .in('id_factura', invoiceIds);

    if (factError) { setCustomers([]); setLoading(false); return; }

    const customerCodes = [...new Set((facturacionData || []).map(f => f.code_customer))] as string[];

    const { data: customersData, error: custError } = await supabase
      .from('customer')
      .select('code_customer, customer_name, geocerca, foto_ubicacion')
      .in('code_customer', customerCodes);

    if (custError) { setCustomers([]); setLoading(false); return; }

    const customerMap = new Map((customersData || []).map(c => [c.code_customer, { geocerca: c.geocerca, foto_ubicacion: c.foto_ubicacion }]));

    const enriched = (facturacionData || []).map(f => {
      const details = invoiceStateMap.get(f.id_factura) || { state: false, orden_visita: null };
      const customer = customerMap.get(f.code_customer);
      return {
        code_customer: f.code_customer,
        customer_name: f.customer_name,
        reference_number: f.reference_number,
        geocerca: customer?.geocerca ?? null,
        foto_ubicacion: customer?.foto_ubicacion ?? null,
        state: details.state === true,
        orden_visita: details.orden_visita,
      } as MapCustomer;
    });

    setCustomers(enriched);
    setLoading(false);
  }, [despachos, routes, toast]);

  useEffect(() => { loadDespachoData(selectedDespachoId); }, [selectedDespachoId, loadDespachoData]);

  const dailyDespachos = despachos;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Rutas</CardTitle>
          <CardDescription>Visualiza las geocercas y rutas de los despachos del día.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Despacho</Label>
            <Select value={selectedDespachoId} onValueChange={setSelectedDespachoId} disabled={dailyDespachos.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={dailyDespachos.length === 0 ? 'No hay despachos en esta fecha' : 'Seleccione un despacho'} />
              </SelectTrigger>
              <SelectContent>
                {dailyDespachos.map(d => {
                  const route = routes.find(r => r.id_ruta === d.id_ruta);
                  return (
                    <SelectItem key={d.id_despacho} value={String(d.id_despacho)}>
                      Despacho #{d.id_despacho} {route ? `- ${route.ruta_desc}` : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="h-[350px] md:h-[600px] w-full">
            {loading ? (
              <div className="flex items-center justify-center h-full bg-muted rounded-lg">
                <p className="text-muted-foreground">Cargando datos del despacho...</p>
              </div>
            ) : customers.length === 0 ? (
              <div className="flex items-center justify-center h-full bg-muted rounded-lg">
                <p className="text-muted-foreground">
                  {dailyDespachos.length === 0
                    ? 'No hay despachos para esta fecha.'
                    : 'Seleccione un despacho para ver el mapa.'}
                </p>
              </div>
            ) : (
              <RouteMap customers={customers} bodegaLocation={BODEGA_LOCATION} despachoLabel={despachoLabel} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}