
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer, MarkerF } from '@react-google-maps/api';
import { Truck, Home, User } from 'lucide-react';

/**
 * @file live-map.tsx
 * @description Componente de mapa basado en Google Maps.
 * Carga la API de Google Maps, muestra una ruta calculada por DirectionsService,
 * y/o marcadores de motoristas en tiempo real.
 */

// --- CONFIGURACIÓN DEL MAPA ---
const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 13.7942, lng: -88.8965 }; // Centro de El Salvador

// --- TIPOS DE DATOS ---
interface LiveMapProps {
  origin: { lat: number; lng: number };
  waypoints: google.maps.DirectionsWaypoint[];
  motoristaLocation: { location: string; name?: string } | null;
  allMotoristas: { location: string; name?: string; last_update?: string }[];
  viewMode: 'global' | 'route';
}

/**
 * Parsea una ubicación en formato WKT "POINT(lng lat)" a un objeto LatLng de Google Maps.
 * @param locationString - La ubicación en formato WKT.
 * @returns Un objeto LatLng o null si el formato es inválido.
 */
const parseWktToLatLng = (locationString: string): google.maps.LatLngLiteral | null => {
  if (!locationString) return null;
  const match = locationString.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  if (match) {
    return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
  }
  return null;
};

// --- ÍCONOS PERSONALIZADOS (SVG como string) ---
const truckIcon = (color: string) => ({
  path: 'M21 9V6a1 1 0 0 0-1-1h-2.1a3.98 3.98 0 0 0-7.8 0H4a1 1 0 0 0-1 1v3M2 19V9h19v10H2Zm0 0H1m1 0H3m17 0h1m-1 0h-1m-6-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  fillColor: color,
  fillOpacity: 1,
  strokeWeight: 1,
  scale: 1.2,
  anchor: new google.maps.Point(12, 12),
});

const homeIcon = {
  path: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  fillColor: '#c7342a',
  fillOpacity: 1,
  strokeWeight: 1,
  scale: 1.2,
  anchor: new google.maps.Point(12, 24),
};

const userIcon = {
  path: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  fillColor: '#2a9d8f',
  fillOpacity: 1,
  strokeWeight: 1,
  scale: 1,
  anchor: new google.maps.Point(12, 24),
};


/**
 * Componente principal del mapa.
 */
const LiveMap = ({ origin, waypoints, motoristaLocation, allMotoristas, viewMode }: LiveMapProps) => {
  // --- ESTADOS ---
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  // --- CARGA DE API ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "", // ¡IMPORTANTE! Añade tu clave aquí.
    libraries: ['places'],
  });

  // --- LÓGICA DE CÁLCULO DE RUTA ---
  useEffect(() => {
    if (!isLoaded || viewMode !== 'route' || waypoints.length === 0) {
      setDirections(null); // Limpia la ruta si cambiamos de modo o no hay waypoints.
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: origin,
        destination: origin, // La ruta termina donde empieza.
        waypoints: waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error(`Error al obtener direcciones: ${status}`);
        }
      }
    );
  }, [isLoaded, origin, waypoints, viewMode]);
  
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // --- RENDERIZADO ---
  if (loadError) {
    return (
        <div className="flex items-center justify-center h-full bg-red-100 text-red-700 p-4 text-center">
            <p>
                <b>Error al cargar el mapa.</b><br/>
                Asegúrate de que la variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` esté configurada correctamente en tu archivo `.env.local` y que la clave de API sea válida.
            </p>
        </div>
    );
  }

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-full">Cargando mapa...</div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={10}
      onLoad={onMapLoad}
      onUnmount={onMapUnmount}
      options={{
        mapTypeControl: false,
        streetViewControl: false,
      }}
    >
      {viewMode === 'route' && directions && (
        <>
          {/* Renderiza la ruta calculada */}
          <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />

          {/* Marcador del motorista específico de la ruta */}
          {motoristaLocation && (
            <MarkerF
              position={parseWktToLatLng(motoristaLocation.location)!}
              title={motoristaLocation.name}
              icon={truckIcon('#03A6A6')}
            />
          )}

           {/* Marcador del punto de origen/destino */}
          <MarkerF position={origin} title="Bodega" icon={homeIcon} />

          {/* Marcadores de clientes (waypoints) */}
          {waypoints.map((wp, index) => (
             <MarkerF 
                key={index}
                // @ts-ignore - La API de Google permite un LatLngLiteral aquí.
                position={wp.location}
                icon={userIcon} 
             />
          ))}
        </>
      )}

      {viewMode === 'global' && allMotoristas.map((motorista, index) => {
        const position = parseWktToLatLng(motorista.location);
        if (!position) return null;
        return (
          <MarkerF
            key={`motorista-${index}`}
            position={position}
            title={motorista.name}
            icon={truckIcon('#04BFAD')}
          />
        );
      })}
    </GoogleMap>
  );
};

export default React.memo(LiveMap);
