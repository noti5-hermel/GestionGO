
'use client'

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { List, MapPin } from "lucide-react"

/**
 * @file route-generation/page.tsx
 * @description Página para generar una ruta de Google Maps basada en la selección de clientes con geocercas.
 */

// Tipo de dato para un cliente con geocerca.
type CustomerWithGeofence = {
  code_customer: string;
  customer_name: string;
  geocerca: string;
}

/**
 * Parsea una cadena de geocerca en formato WKT POLYGON para obtener su centroide.
 * @param geofenceString - La cadena WKT, ej: "POLYGON((lon1 lat1, lon2 lat2, ...))"
 * @returns Un objeto con lat y lon del centroide, o null si el formato es inválido.
 */
const parseGeofenceCentroid = (geofenceString: string): { lat: string; lon: string } | null => {
    if (!geofenceString || !geofenceString.toUpperCase().startsWith('POLYGON')) {
        return null;
    }
    
    // Extrae las coordenadas del string. Ej: "-90.51 14.63, -90.50 14.63, ..."
    const coordsMatch = geofenceString.match(/\(\((.*)\)\)/);
    if (!coordsMatch || !coordsMatch[1]) {
        return null;
    }

    // Convierte el string de coordenadas en un array de puntos [lon, lat]
    const points = coordsMatch[1].split(',').map(pair => {
        const [lon, lat] = pair.trim().split(' ').map(Number);
        return { lon, lat };
    }).filter(p => !isNaN(p.lon) && !isNaN(p.lat));

    if (points.length === 0) {
        return null;
    }

    // Calcula el centroide (el promedio de todos los puntos del polígono)
    const centroid = points.reduce(
        (acc, point) => {
            acc.lon += point.lon;
            acc.lat += point.lat;
            return acc;
        },
        { lon: 0, lat: 0 }
    );

    const numPoints = points.length;
    return {
        lon: String(centroid.lon / numPoints),
        lat: String(centroid.lat / numPoints)
    };
};


/**
 * Componente principal de la página de Generación de Ruta.
 */
export default function RouteGenerationPage() {
  const [customers, setCustomers] = useState<CustomerWithGeofence[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, boolean>>({});
  const [generatedRoute, setGeneratedRoute] = useState<CustomerWithGeofence[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  /**
   * Obtiene la lista de clientes que tienen una geocerca definida.
   */
  const fetchCustomersWithGeofence = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('customer')
      .select('code_customer, customer_name, geocerca')
      .not('geocerca', 'is', null)
      .like('geocerca', 'POLYGON%'); // Filtra solo los que son polígonos

    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes con geocercas.",
        variant: "destructive",
      });
    } else {
      setCustomers(data as CustomerWithGeofence[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCustomersWithGeofence();
  }, [fetchCustomersWithGeofence]);

  /**
   * Maneja el cambio de estado de un checkbox de cliente.
   */
  const handleCustomerSelect = (customerId: string, checked: boolean) => {
    setSelectedCustomers(prev => ({
      ...prev,
      [customerId]: checked,
    }));
  };

  /**
   * Construye y abre una URL de Google Maps con los clientes seleccionados.
   */
  const handleGenerateRoute = () => {
    const selected = customers.filter(customer => selectedCustomers[customer.code_customer]);
    if (selected.length === 0) {
        toast({
            title: "Sin selección",
            description: "Por favor, seleccione al menos un cliente para generar la ruta.",
            variant: "destructive"
        });
        return;
    }

    const waypoints = selected.map(customer => {
        const coords = parseGeofenceCentroid(customer.geocerca);
        return coords ? `${coords.lat},${coords.lon}` : null;
    }).filter((c): c is string => c !== null);

    if (waypoints.length === 0) {
        toast({
            title: "Error de Coordenadas",
            description: "Ninguno de los clientes seleccionados tiene coordenadas válidas.",
            variant: "destructive"
        });
        return;
    }

    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    // Se usa el primer punto como origen y destino para crear un bucle,
    // y todos los puntos (incluido el primero) como waypoints.
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const waypointsString = waypoints.join('|');

    const googleMapsUrl = `${baseUrl}&origin=${origin}&destination=${destination}&waypoints=${waypointsString}`;

    window.open(googleMapsUrl, '_blank');
    setGeneratedRoute(selected);
  };
  
  const handleSelectAll = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    if (checked) {
        customers.forEach(customer => newSelection[customer.code_customer] = true);
    }
    setSelectedCustomers(newSelection);
  }

  const allSelected = customers.length > 0 && customers.every(c => selectedCustomers[c.code_customer]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Columna de Selección de Clientes */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader>
          <CardTitle>Selección de Clientes</CardTitle>
          <CardDescription>Marque los clientes con geocerca para incluirlos en la ruta.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
           <div className="flex items-center space-x-2 border p-2 rounded-md">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={(checked) => handleSelectAll(!!checked)}
            />
            <Label htmlFor="select-all" className="font-bold">
              Seleccionar Todos
            </Label>
          </div>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {loading ? (
                <p>Cargando clientes...</p>
              ) : customers.length > 0 ? (
                customers.map(customer => (
                  <div key={customer.code_customer} className="flex items-center space-x-2">
                    <Checkbox
                      id={customer.code_customer}
                      checked={selectedCustomers[customer.code_customer] || false}
                      onCheckedChange={(checked) => handleCustomerSelect(customer.code_customer, !!checked)}
                    />
                    <Label htmlFor={customer.code_customer} className="w-full">
                      {customer.customer_name} ({customer.code_customer})
                    </Label>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No hay clientes con geocercas (de tipo POLYGON) definidas.</p>
              )}
            </div>
          </ScrollArea>
           <Button onClick={handleGenerateRoute} className="mt-4">
            <MapPin className="mr-2 h-4 w-4" />
            Generar Ruta en Google Maps
          </Button>
        </CardContent>
      </Card>

      {/* Columna de la Ruta Generada */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle>Ruta Generada</CardTitle>
          <CardDescription>Lista de los puntos de entrega incluidos en la ruta.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center gap-4">
          {generatedRoute.length > 0 ? (
            <div className="w-full h-full bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center"><List className="mr-2 h-5 w-5"/> Puntos de Entrega</h3>
                <ScrollArea className="h-[calc(100%-40px)]">
                    <ol className="list-decimal list-inside space-y-2">
                    {generatedRoute.map(customer => (
                        <li key={customer.code_customer}>{customer.customer_name}</li>
                    ))}
                    </ol>
                </ScrollArea>
              </div>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Seleccione clientes y presione "Generar Ruta" para abrir Google Maps.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
