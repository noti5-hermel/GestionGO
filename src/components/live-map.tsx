
'use client';

import React from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Tooltip, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { LatLngExpression } from 'leaflet';

/**
 * @file live-map.tsx
 * @description Componente de mapa basado en react-leaflet para mostrar geocercas y una ruta.
 */

// --- CONFIGURACIÓN DEL MAPA ---
const defaultCenter: LatLngExpression = [13.7942, -88.8965]; // Centro de El Salvador

// Corrige el problema de los íconos de marcadores por defecto en Leaflet con Webpack.
const markerIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    shadowSize: [41, 41],
});

// --- TIPOS DE DATOS ---
interface LiveMapProps {
  customers: {
    code_customer: string;
    customer_name: string;
    geocerca: any;
  }[];
  bodegaLocation: { lat: number; lng: number };
  loading: boolean;
}

/**
 * Parsea datos de geocerca (WKT o GeoJSON) para obtener un array de coordenadas.
 * @param geofenceData - La geocerca en formato WKT (string) o como objeto GeoJSON.
 * @returns Un array de coordenadas [lat, lon], o un array vacío si el formato es inválido.
 */
const parseGeofenceToPolygon = (geofenceData: any): LatLngExpression[] => {
    if (!geofenceData) {
        return [];
    }
    
    // Caso 1: Es un string en formato WKT (Well-Known Text)
    if (typeof geofenceData === 'string') {
        const wkt = geofenceData.trim().toUpperCase();
        if (!wkt.startsWith('POLYGON')) {
            return [];
        }
        try {
            const coordPairs = wkt.match(/\(\((.*)\)\)/)?.[1].split(',') || [];
            return coordPairs.map(pair => {
                const [lon, lat] = pair.trim().split(' ').map(Number);
                return [lat, lon] as LatLngExpression;
            }).filter(p => !isNaN(p[0]) && !isNaN(p[1]));
        } catch (error) {
            console.error("Error parsing WKT polygon:", error);
            return [];
        }
    }
    
    // Caso 2: Es un objeto GeoJSON
    if (typeof geofenceData === 'object' && geofenceData.type === 'Polygon' && Array.isArray(geofenceData.coordinates)) {
        try {
            // En GeoJSON, las coordenadas son [lon, lat] y necesitamos [lat, lon] para Leaflet
            const coordinateRing = geofenceData.coordinates[0];
            if (!Array.isArray(coordinateRing)) return [];
            return coordinateRing.map(p => [p[1], p[0]] as LatLngExpression)
                .filter(p => !isNaN(p[0]) && !isNaN(p[1]));
        } catch (error) {
            console.error("Error parsing GeoJSON polygon:", error);
            return [];
        }
    }
    
    return [];
};


/**
 * Calcula el centroide de un polígono.
 * @param polygon - Un array de coordenadas que forman el polígono.
 * @returns El centroide como una coordenada [lat, lon].
 */
const getPolygonCentroid = (polygon: LatLngExpression[]): LatLngExpression | null => {
    if (polygon.length === 0) return null;
    let latSum = 0;
    let lonSum = 0;
    polygon.forEach(p => {
        if(Array.isArray(p)) {
            latSum += p[0];
            lonSum += p[1];
        }
    });
    return [latSum / polygon.length, lonSum / polygon.length];
};

/**
 * Componente principal del mapa.
 */
const LiveMap = ({ customers, bodegaLocation, loading }: LiveMapProps) => {

    // 1. Procesa los clientes para obtener geocercas y centroides.
    const customerData = React.useMemo(() => customers.map(customer => {
        const polygon = parseGeofenceToPolygon(customer.geocerca);
        const centroid = getPolygonCentroid(polygon);
        return { ...customer, polygon, centroid };
    }).filter(c => c.polygon.length > 0 && c.centroid), [customers]);

    // 2. Ordena los clientes para trazar una ruta lógica (algoritmo del vecino más cercano simplificado).
    const sortedCustomerCentroids = React.useMemo(() => {
        if (customerData.length === 0) return [];
        
        let remaining = [...customerData];
        const sorted: { centroid: LatLngExpression }[] = [];
        let currentLocation: L.LatLngExpression = [bodegaLocation.lat, bodegaLocation.lng];

        while (remaining.length > 0) {
            let nearestIndex = -1;
            let minDistance = Infinity;

            remaining.forEach((customer, index) => {
                const customerLoc = customer.centroid!;
                 // @ts-ignore
                const distance = L.latLng(currentLocation).distanceTo(customerLoc);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIndex = index;
                }
            });
            
            const nearestCustomer = remaining.splice(nearestIndex, 1)[0];
            sorted.push(nearestCustomer);
            currentLocation = nearestCustomer.centroid!;
        }
        return sorted.map(c => c.centroid!);
    }, [customerData, bodegaLocation]);

    // 3. Crea la polilínea de la ruta, desde la bodega, pasando por los clientes y volviendo.
    const routePath: LatLngExpression[] = [
        [bodegaLocation.lat, bodegaLocation.lng],
        ...sortedCustomerCentroids,
        [bodegaLocation.lat, bodegaLocation.lng]
    ];
    
    // Si no hay clientes, no muestra el mapa, solo un mensaje.
    if (customers.length === 0) {
        return (
             <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground p-4 text-center rounded-lg">
                <p>
                    {loading ? 'Cargando datos del despacho...' : 'Por favor, seleccione un despacho para ver la ruta.'}
                </p>
            </div>
        )
    }

  return (
    <MapContainer center={defaultCenter} zoom={9} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Marcador para la bodega */}
      <Marker position={[bodegaLocation.lat, bodegaLocation.lng]} icon={markerIcon}>
        <Tooltip permanent>Bodega</Tooltip>
      </Marker>

      {/* Dibuja las geocercas de los clientes */}
      {customerData.map(customer => (
        <Polygon key={customer.code_customer} positions={customer.polygon}>
          <Tooltip>{customer.customer_name}</Tooltip>
        </Polygon>
      ))}

      {/* Dibuja la ruta que conecta los centroides */}
      {routePath.length > 1 && (
        <Polyline pathOptions={{ color: 'blue' }} positions={routePath} />
      )}
    </MapContainer>
  );
};

export default React.memo(LiveMap);
