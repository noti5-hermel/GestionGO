'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, MarkerF } from '@react-google-maps/api';
import { decode } from '@googlemaps/polyline-codec';

/**
 * @file live-map.tsx
 * @description Componente de mapa basado en Google Maps.
 * Carga la API de Google Maps, calcula una ruta óptima usando la Routes API,
 * y muestra marcadores en tiempo real.
 */

// --- CONFIGURACIÓN DEL MAPA ---
const containerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: 13.7942, lng: -88.8965 }; // Centro de El Salvador

// --- TIPOS DE DATOS ---
interface LiveMapProps {
  origin: { lat: number; lng: number, name: string };
  waypoints: google.maps.DirectionsWaypoint[];
  motoristaLocation: { location: string | { type: string, coordinates: number[] }; name?: string } | null;
  allMotoristas: { location: string | { type: string, coordinates: number[] }; name?: string; last_update?: string }[];
  viewMode: 'global' | 'route';
}

/**
 * Parsea una ubicación en formato WKT "POINT(lng lat)" o un objeto GeoJSON a un objeto LatLng de Google Maps.
 * @param locationData - La ubicación en formato WKT (string) o como objeto GeoJSON.
 * @returns Un objeto LatLng o null si el formato es inválido.
 */
const parseWktToLatLng = (locationData: any): google.maps.LatLngLiteral | null => {
    if (!locationData) return null;
    if (typeof locationData === 'object' && locationData.type === 'Point' && Array.isArray(locationData.coordinates)) {
        return { lng: locationData.coordinates[0], lat: locationData.coordinates[1] };
    }
    if (typeof locationData === 'string') {
        const match = locationData.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
        if (match) {
            return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) };
        }
    }
    return null;
};


/**
 * Componente principal del mapa.
 */
const LiveMap = ({ origin, waypoints, motoristaLocation, allMotoristas, viewMode }: LiveMapProps) => {
  // --- ESTADOS ---
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // --- CARGA DE API ---
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['routes'],
  });

  // --- LÓGICA DE CÁLCULO DE RUTA ---
  useEffect(() => {
    if (!isLoaded || viewMode !== 'route' || waypoints.length === 0) {
      setRoutePath([]);
      return;
    }

    const fetchRoute = async () => {
      const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
      const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
      
      const intermediates = waypoints.map(wp => ({ location: { latLng: wp.location as google.maps.LatLngLiteral } }));
      
      const requestBody: any = {
        origin: { location: { latLng: origin } },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        routeModifiers: {
          vehicleInfo: {
            vehicleType: 'TWO_WHEELER',
          },
          avoidTolls: false,
          avoidHighways: false,
          avoidFerries: false,
        },
        languageCode: 'es-419',
        units: 'METRIC',
      };
      
      const fieldMask = 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs';

      if (intermediates.length > 1) {
        requestBody.destination = { location: { latLng: origin } }; // Viaje de ida y vuelta
        requestBody.intermediates = intermediates;
        requestBody.optimizeWaypointOrder = true;
      } else if (intermediates.length === 1) {
        requestBody.destination = { location: { latLng: intermediates[0].location.latLng } };
      } else {
        return; // No hay puntos para trazar
      }


      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': API_KEY,
            'X-Goog-FieldMask': fieldMask,
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error fetching route from Routes API:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const encodedPolyline = route.polyline.encodedPolyline;
          const decodedPath = decode(encodedPolyline, 5).map(([lat, lng]) => ({ lat, lng }));
          setRoutePath(decodedPath);
        }
      } catch (error) {
        console.error('Failed to fetch and decode route:', error);
      }
    };

    fetchRoute();
  }, [isLoaded, origin, waypoints, viewMode]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);
  
  if (loadError) {
    return (
        <div className="flex items-center justify-center h-full bg-red-100 text-red-700 p-4 text-center">
            <p>
                <b>Error al cargar el mapa.</b><br/>
                Asegúrate de que la variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` esté configurada correctamente en tu archivo `.env.local` y que la clave de API sea válida y tenga la "Routes API" y "Maps JavaScript API" habilitadas.
            </p>
        </div>
    );
  }

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-full">Cargando mapa...</div>;
  }
  
  const truckIcon = {
    path: 'M21 9V6a1 1 0 0 0-1-1h-2.1a3.98 3.98 0 0 0-7.8 0H4a1 1 0 0 0-1 1v3M2 19V9h19v10H2Zm0 0H1m1 0H3m17 0h1m-1 0h-1m-6-6a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
    fillColor: '#03A6A6',
    fillOpacity: 1,
    strokeWeight: 1,
    scale: 1.2,
    anchor: new window.google.maps.Point(12, 12),
  };

  const homeIcon = {
    path: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
    fillColor: '#c7342a',
    fillOpacity: 1,
    strokeWeight: 1,
    scale: 1.2,
    anchor: new window.google.maps.Point(12, 24),
  };

  const userIcon = {
    path: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    fillColor: '#2a9d8f',
    fillOpacity: 1,
    strokeWeight: 1,
    scale: 1,
    anchor: new window.google.maps.Point(12, 24),
  };

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
      {viewMode === 'route' && routePath.length > 0 && (
        <>
          <Polyline
            path={routePath}
            options={{
              strokeColor: '#03A6A6',
              strokeOpacity: 0.8,
              strokeWeight: 6,
            }}
          />

          {motoristaLocation && parseWktToLatLng(motoristaLocation.location) && (
            <MarkerF
              position={parseWktToLatLng(motoristaLocation.location)!}
              title={motoristaLocation.name}
              icon={truckIcon}
            />
          )}

          <MarkerF position={origin} title={origin.name} icon={homeIcon} />

          {waypoints.map((waypoint, index) => (
            <MarkerF
              key={`waypoint-${index}`}
              position={waypoint.location as google.maps.LatLngLiteral}
              icon={userIcon}
            />
          ))}
        </>
      )}

      {viewMode === 'global' && allMotoristas.map((motorista, index) => {
        const position = parseWktToLatLng(motorista.location);
        if (!position) return null;
        const globalTruckIcon = {...truckIcon, fillColor: '#04BFAD' };
        return (
          <MarkerF
            key={`motorista-${index}`}
            position={position}
            title={motorista.name}
            icon={globalTruckIcon}
          />
        );
      })}
    </GoogleMap>
  );
};

export default React.memo(LiveMap);