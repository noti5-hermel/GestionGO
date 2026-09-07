'use client'

import { useState, useEffect, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { List, Loader2, MapPin, Search, Trash2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/**
 * @file route-generation/page.tsx
 * @description Página para generar una ruta de Google Maps basada en la selección de clientes con geocercas.
 */

// Carga dinámica del componente de mapa para evitar problemas con SSR.
const RouteMap = dynamic(() => import("@/components/route-map-view"), {
  ssr: false,
  loading: () => <p className="text-center p-10 text-muted-foreground">Cargando mapa...</p>,
});

const BODEGA_LOCATION = { lat: 13.725410116705362, lng: -89.21911777270175 };

// Tipo de dato para un cliente con geocerca.
type CustomerWithGeofence = {
  code_customer: string;
  customer_name: string;
  geocerca: any; // Se usa 'any' para manejar tanto strings como objetos GeoJSON.
}

// Hook para "rebotar" la entrada del usuario y no sobrecargar las consultas.
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/**
 * Parsea una geocerca para obtener su centroide.
 * Admite formatos WKT (string) para POLYGON y GEOMETRYCOLLECTION, y objetos GeoJSON.
 * @param geofenceData - La geocerca en formato WKT o como objeto GeoJSON.
 * @returns Un objeto con lat y lon del centroide, o null si el formato es inválido.
 */
const parseGeofenceCentroid = (geofenceData: any): { lat: string; lon: string } | null => {
    if (!geofenceData) return null;

    let allPoints: { lon: number; lat: number }[] = [];

    const getPointsFromPolygonString = (polygonString: string): { lon: number; lat: number }[] => {
        const coordsMatch = polygonString.match(/\(\((.*)\)\)/);
        if (!coordsMatch || !coordsMatch[1]) return [];
        
        return coordsMatch[1].split(',').map(pair => {
            const [lon, lat] = pair.trim().split(' ').map(Number);
            return { lon, lat };
        }).filter(p => !isNaN(p.lon) && !isNaN(p.lat));
    };

    // Caso 1: Es un objeto GeoJSON
    if (typeof geofenceData === 'object' && geofenceData.type) {
        if (geofenceData.type === 'Polygon' && Array.isArray(geofenceData.coordinates)) {
            const coordinateRing = geofenceData.coordinates[0];
            if (Array.isArray(coordinateRing)) {
                allPoints = coordinateRing.map((p: number[]) => ({ lon: p[0], lat: p[1] }))
                    .filter(p => !isNaN(p.lon) && !isNaN(p.lat));
            }
        }
        // Soporte para GEOMETRYCOLLECTION en GeoJSON (aunque menos común para este caso)
        else if (geofenceData.type === 'GeometryCollection' && Array.isArray(geofenceData.geometries)) {
             geofenceData.geometries.forEach((geom: any) => {
                if (geom.type === 'Polygon' && Array.isArray(geom.coordinates)) {
                    const coordinateRing = geom.coordinates[0];
                    if(Array.isArray(coordinateRing)) {
                        const points = coordinateRing.map((p: number[]) => ({ lon: p[0], lat: p[1] }))
                            .filter(p => !isNaN(p.lon) && !isNaN(p.lat));
                        allPoints.push(...points);
                    }
                }
            });
        }
    
    // Caso 2: Es un string en formato WKT (Well-Known Text)
    } else if (typeof geofenceData === 'string') {
        const wktString = geofenceData.toUpperCase();
        if (wktString.startsWith('GEOMETRYCOLLECTION')) {
            const polygonStrings = geofenceData.match(/POLYGON\s*\(\(.*?\)\)/gi) || [];
            polygonStrings.forEach(polyStr => {
                allPoints.push(...getPointsFromPolygonString(polyStr));
            });
        } else if (wktString.startsWith('POLYGON')) {
            allPoints = getPointsFromPolygonString(geofenceData);
        }
    }

    if (allPoints.length === 0) {
        return null;
    }

    // Calcula el centroide (el promedio de todos los puntos de todos los polígonos)
    const centroid = allPoints.reduce(
        (acc, point) => {
            acc.lon += point.lon;
            acc.lat += point.lat;
            return acc;
        },
        { lon: 0, lat: 0 }
    );

    const numPoints = allPoints.length;
    return {
        lon: String(centroid.lon / numPoints),
        lat: String(centroid.lat / numPoints)
    };
};


/**
 * Componente principal de la página de Generación de Ruta.
 */
export default function RouteGenerationPage() {
  const [selectedCustomers, setSelectedCustomers] = useState<CustomerWithGeofence[]>([]);
  const [generatedRoute, setGeneratedRoute] = useState<CustomerWithGeofence[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CustomerWithGeofence[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const debouncedQuery = useDebounce(searchQuery, 300);

  const selectedCodes = useMemo(() => new Set(selectedCustomers.map(c => c.code_customer)), [selectedCustomers]);

  /**
   * Busca clientes con geocerca por código o nombre mientras se escribe.
   */
  useEffect(() => {
    const query = debouncedQuery.trim();
    if (!query) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);
    const pattern = `%${query}%`;
    supabase
      .from('customer')
      .select('code_customer, customer_name, geocerca')
      .not('geocerca', 'is', null)
      .or(`code_customer.ilike.${pattern},customer_name.ilike.${pattern}`)
      .limit(10)
      .then(({ data, error }) => {
        if (cancelled) return;
        setIsSearching(false);
        if (!error) setSearchResults((data || []) as CustomerWithGeofence[]);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  /**
   * Agrega un cliente a la lista de seleccionados.
   */
  const handleAddCustomer = (customer: CustomerWithGeofence) => {
    setSelectedCustomers(prev =>
      prev.some(c => c.code_customer === customer.code_customer)
        ? prev
        : [...prev, customer]
    );
    setSearchQuery("");
    setSearchResults([]);
    setSearchOpen(false);
  };

  /**
   * Quita un cliente de la lista de seleccionados.
   */
  const handleRemoveCustomer = (customerId: string) => {
    setSelectedCustomers(prev => prev.filter(c => c.code_customer !== customerId));
  };

  /**
   * Calcula los waypoints válidos de la selección actual. Retorna null si no hay selección válida.
   */
  const getWaypointsData = () => {
    if (selectedCustomers.length === 0) {
        toast({
            title: "Sin selección",
            description: "Por favor, seleccione al menos un cliente para generar la ruta.",
            variant: "destructive"
        });
        return null;
    }

    const waypointsData = selectedCustomers.map(customer => {
        const coords = parseGeofenceCentroid(customer.geocerca);
        return coords ? { coords, customer } : null;
    }).filter((c): c is { coords: { lat: string; lon: string }; customer: CustomerWithGeofence } => c !== null);

    if (waypointsData.length === 0) {
        toast({
            title: "Error de Coordenadas",
            description: "Ninguno de los clientes seleccionados tiene coordenadas válidas.",
            variant: "destructive"
        });
        return null;
    }

    return waypointsData;
  };

  /**
   * Genera la vista previa de la ruta en el mapa dentro de la app.
   */
  const handleGenerateRoute = () => {
    const waypointsData = getWaypointsData();
    if (!waypointsData) return;
    setGeneratedRoute(waypointsData.map(wp => wp.customer));
  };

  /**
   * Abre la ruta en Google Maps en una pestaña nueva.
   */
  const handleExportToMaps = () => {
    const waypointsData = getWaypointsData();
    if (!waypointsData) return;

    // El primer cliente seleccionado es el origen, el último el destino.
    const origin = `${waypointsData[0].coords.lat},${waypointsData[0].coords.lon}`;
    const destination = `${waypointsData[waypointsData.length - 1].coords.lat},${waypointsData[waypointsData.length - 1].coords.lon}`;
    
    // El resto de los puntos (si los hay) son las paradas intermedias.
    const intermediateWaypoints = waypointsData.slice(1, -1).map(wp => `${wp.coords.lat},${wp.coords.lon}`).join('|');

    const baseUrl = 'https://www.google.com/maps/dir/?api=1';
    let googleMapsUrl = `${baseUrl}&origin=${origin}&destination=${destination}`;

    if (intermediateWaypoints) {
      googleMapsUrl += `&waypoints=${intermediateWaypoints}`;
    }

    window.open(googleMapsUrl, '_blank');
  };

  const handleRemoveFromGeneratedRoute = (customerId: string) => {
    // Remove from the visual generated list
    setGeneratedRoute(prev => prev.filter(c => c.code_customer !== customerId));
    // Remove from the selected list
    handleRemoveCustomer(customerId);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      {/* Columna de Selección de Clientes */}
      <Card className="lg:col-span-1 flex flex-col">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                  <CardTitle>Selección de Clientes</CardTitle>
                  <CardDescription>Escriba el código o nombre del cliente para buscarlo.</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={handleGenerateRoute} className="w-full sm:w-auto">
                    <MapPin className="mr-2 h-4 w-4" />
                    Generar Ruta
                </Button>
                <Button onClick={handleExportToMaps} variant="outline" className="w-full sm:w-auto">
                    <MapPin className="mr-2 h-4 w-4" />
                    Exportar a Maps
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar por código o nombre..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              className="pl-8 w-full"
            />
            {searchOpen && searchQuery.trim() !== '' && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-lg">
                <div className="max-h-60 overflow-auto p-1">
                  {isSearching ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span className="text-sm">Buscando...</span>
                    </div>
                  ) : searchResults.filter(c => !selectedCodes.has(c.code_customer)).length > 0 ? (
                    searchResults
                      .filter(c => !selectedCodes.has(c.code_customer))
                      .map(customer => (
                        <div
                          key={customer.code_customer}
                          onMouseDown={() => handleAddCustomer(customer)}
                          className="flex cursor-pointer items-center rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent"
                        >
                          {customer.customer_name} <span className="ml-auto text-xs text-muted-foreground">{customer.code_customer}</span>
                        </div>
                      ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {searchResults.length > 0 ? 'Cliente ya seleccionado.' : 'No se encontraron resultados.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <Label className="text-xs text-muted-foreground">Seleccionados ({selectedCustomers.length})</Label>
          <ScrollArea className="max-h-[50vh] lg:max-h-none lg:flex-1 pr-2">
            {selectedCustomers.length > 0 ? (
              <div className="space-y-2">
                {selectedCustomers.map(customer => (
                  <div key={customer.code_customer} className={cn("flex items-center justify-between rounded-md border p-2 bg-muted/50")}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{customer.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{customer.code_customer}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCustomer(customer.code_customer)}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-8">Sin clientes seleccionados.</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Columna de la Ruta Generada */}
      <Card className="lg:col-span-2 flex flex-col">
        <CardHeader>
          <CardTitle>Ruta Generada</CardTitle>
          <CardDescription>Lista de los puntos de entrega incluidos en la ruta.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          {generatedRoute.length > 0 ? (
            <>
              <div className="h-[300px] md:h-[500px] w-full rounded-lg overflow-hidden border">
                <RouteMap
                  customers={generatedRoute.map(c => ({
                    code_customer: c.code_customer,
                    customer_name: c.customer_name,
                    geocerca: c.geocerca,
                  }))}
                  bodegaLocation={BODEGA_LOCATION}
                  showBodega={false}
                  showGeofences={false}
                />
              </div>
              <div className="w-full bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 flex items-center"><List className="mr-2 h-5 w-5"/> Puntos de Entrega</h3>
                <ScrollArea className="max-h-[300px]">
                    <ol className="list-decimal list-inside space-y-2">
                    {generatedRoute.map(customer => (
                        <li key={customer.code_customer} className="flex items-center justify-between">
                            <span>{customer.customer_name} <span className="text-xs text-muted-foreground">({customer.code_customer})</span></span>
                             <Button variant="ghost" size="icon" onClick={() => handleRemoveFromGeneratedRoute(customer.code_customer)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </li>
                    ))}
                    </ol>
                </ScrollArea>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground min-h-[200px] flex items-center justify-center">
              <p>Seleccione clientes y presione "Generar Ruta" para ver el mapa.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}