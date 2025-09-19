
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, Polyline } from '@react-google-maps/api';
import { decode } from '@googlemaps/polyline-codec';

// --- TIPOS DE DATOS ---
interface LiveMapProps {
  customers: {
    code_customer: string;
    customer_name: string;
    geocerca: any;
  }[];
  bodegaLocation: { lat: number; lng: number };
  loading: boolean;
  viewMode: 'global' | 'route';
  motoristas?: { id_motorista: string; name: string; location: any }[];
}

// --- CONFIGURACIÓN DEL MAPA ---
const mapContainerStyle = {
  height: '100%',
  width: '100%',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: 13.7942,
  lng: -88.8965, // Centro de El Salvador
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
};

// --- FUNCIONES AUXILIARES ---

/**
 * Parsea una geocerca (WKT o GeoJSON) y calcula su centroide.
 * @param geofenceData - El dato de la geocerca.
 * @returns Un objeto con lat y lng del centroide, o null si es inválido.
 */
const parseGeofenceToCentroid = (geofenceData: any): google.maps.LatLngLiteral | null => {
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

  if (typeof geofenceData === 'string') {
    const wktString = geofenceData.toUpperCase();
    if (wktString.startsWith('GEOMETRYCOLLECTION')) {
      const polygonStrings = geofenceData.match(/POLYGON\s*\(\(.*?\)\)/gi) || [];
      polygonStrings.forEach(polyStr => {
        allPoints.push(...getPointsFromPolygonString(polyStr));
      });
    } else if (wktString.startsWith('POLYGON')) {
      allPoints = getPointsFromPolygonString(geofenceData);
    }
  } else if (typeof geofenceData === 'object' && geofenceData.type) {
    if (geofenceData.type === 'Polygon') {
      allPoints = geofenceData.coordinates[0].map((p: number[]) => ({ lng: p[0], lat: p[1] }));
    } else if (geofenceData.type === 'GeometryCollection') {
      geofenceData.geometries.forEach((geom: any) => {
        if (geom.type === 'Polygon') {
          allPoints.push(...geom.coordinates[0].map((p: number[]) => ({ lng: p[0], lat: p[1] })));
        }
      });
    }
  }

  if (allPoints.length === 0) return null;

  const centroid = allPoints.reduce((acc, point) => ({
    lng: acc.lng + point.lng,
    lat: acc.lat + point.lat
  }), { lng: 0, lat: 0 });

  return {
    lng: centroid.lng / allPoints.length,
    lat: centroid.lat / allPoints.length,
  };
};

const LiveMap = ({ customers, bodegaLocation, loading, viewMode }: LiveMapProps) => {
  const [routePolyline, setRoutePolyline] = useState<google.maps.LatLngLiteral[]>([]);
  const [orderedWaypoints, setOrderedWaypoints] = useState<any[]>([]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['marker'],
  });

  // Mapea clientes a waypoints con sus centroides calculados
  const waypoints = useMemo(() =>
    customers
      .map(customer => {
        const centroid = parseGeofenceToCentroid(customer.geocerca);
        if (!centroid) return null;
        return {
          customer,
          centroid
        };
      })
      .filter((c): c is { customer: any; centroid: google.maps.LatLngLiteral } => c !== null),
    [customers]
  );

  useEffect(() => {
    if (!isLoaded || waypoints.length === 0 || viewMode !== 'route') {
      setRoutePolyline([]);
      setOrderedWaypoints([]);
      return;
    }

    const fetchRoute = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.error("Google Maps API key is not set.");
        return;
      }
      
      const toApiLatLng = (latLng: google.maps.LatLngLiteral) => ({
        location: { latLng: { latitude: latLng.lat, longitude: latLng.lng } }
      });
      
      const requestBody: any = {
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      };

      let fieldMask = "routes.polyline.encodedPolyline";

      if (waypoints.length === 1) {
        requestBody.origin = toApiLatLng(bodegaLocation);
        requestBody.destination = toApiLatLng(waypoints[0].centroid);
      } else {
        const intermediates = waypoints.map(w => toApiLatLng(w.centroid));
        if (intermediates.length > 0) {
            requestBody.intermediates = intermediates;
            requestBody.optimizeWaypointOrder = true;
            fieldMask += ",routes.optimizedIntermediateWaypointIndex";
        }
        requestBody.origin = toApiLatLng(bodegaLocation);
        requestBody.destination = toApiLatLng(bodegaLocation);
      }
      
      console.log('JSON formato enviado:', JSON.stringify(requestBody, null, 2));

      const headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fieldMask,
      };

      try {
        const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error fetching route from Routes API:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const polyline = data.routes[0].polyline.encodedPolyline;
          const decodedPath = decode(polyline);
          setRoutePolyline(decodedPath.map(([lat, lng]) => ({ lat, lng })));
          
          if (data.routes[0].optimizedIntermediateWaypointIndex) {
            const waypointOrder: number[] = data.routes[0].optimizedIntermediateWaypointIndex;
            const sortedWaypoints = waypointOrder.map(index => waypoints[index]);
            setOrderedWaypoints(sortedWaypoints);
          } else {
            setOrderedWaypoints(waypoints);
          }
        }
      } catch (error) {
        console.error("Failed to fetch Google route:", error);
      }
    };

    fetchRoute();
  }, [isLoaded, waypoints, bodegaLocation, viewMode]);

  if (loadError) return <div className="p-4 text-center text-red-500">Error al cargar el mapa. Verifica tu API Key.</div>;
  if (!isLoaded) return <div className="p-4 text-center">Cargando API de Google Maps...</div>;
  if (viewMode === 'route' && !customers.length && !loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground p-4 text-center rounded-lg">
        <p>Por favor, seleccione un despacho para ver la ruta.</p>
      </div>
    );
  }
   if (loading) {
    return <div className="flex items-center justify-center h-full w-full bg-muted text-muted-foreground p-4 text-center rounded-lg"><p>Cargando datos del despacho...</p></div>;
  }

  const homeIcon: google.maps.Icon = {
      path: 'm12 5.69 5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3 2 12h3v8h6v-6h2v6h6v-8h3L12 3z',
      fillColor: '#34A853',
      fillOpacity: 1,
      strokeWeight: 0,
      scale: 1.2,
      anchor: new google.maps.Point(12, 12),
  };

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={defaultCenter}
      zoom={9}
      options={mapOptions}
    >
      <MarkerF position={bodegaLocation} title="Bodega" icon={homeIcon} />

      {routePolyline.length > 0 && <Polyline path={routePolyline} options={{ strokeColor: '#4285F4', strokeWeight: 5 }} />}

      {orderedWaypoints.filter(Boolean).map((waypointData, index) => {
          return (
            <MarkerF
              key={waypointData.customer.code_customer}
              position={waypointData.centroid}
              label={{
                text: `${index + 1}`,
                color: 'white',
                fontWeight: 'bold',
              }}
              title={waypointData.customer.customer_name}
            />
          )
      })}
    </GoogleMap>
  );
};

export default React.memo(LiveMap);
