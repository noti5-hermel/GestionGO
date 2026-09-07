'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decode } from '@googlemaps/polyline-codec';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MapCustomer = {
  code_customer: string;
  customer_name: string;
  geocerca: any;
  state?: boolean;
  reference_number?: string | number;
  orden_visita?: number | null;
};

interface RouteMapViewProps {
  customers: MapCustomer[];
  bodegaLocation: { lat: number; lng: number };
  despachoLabel?: string;
  showBodega?: boolean;
  showGeofences?: boolean;
}

interface BoundsFitterProps {
  points: [number, number][];
}

interface ResizeHandlerProps {
  trigger: boolean;
}

const ResizeHandler: React.FC<ResizeHandlerProps> = ({ trigger }) => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
};

const parseGeofenceRings = (geofenceData: any): [number, number][][] | null => {
  if (!geofenceData) return null;
  const rings: [number, number][][] = [];

  const getPairsFromWKT = (polygonString: string): { lat: number; lon: number }[] => {
    const coordsMatch = polygonString.match(/\(\((.*)\)\)/);
    if (!coordsMatch || !coordsMatch[1]) return [];
    return coordsMatch[1].split(',').map(pair => {
      const [lon, lat] = pair.trim().split(/\s+/).map(Number);
      return { lon, lat };
    }).filter(p => !isNaN(p.lon) && !isNaN(p.lat));
  };

  if (typeof geofenceData === 'object' && geofenceData.type) {
    if (geofenceData.type === 'Polygon') {
      geofenceData.coordinates.forEach((ring: number[][]) => {
        const r: [number, number][] = ring.filter(p => !isNaN(p[0]) && !isNaN(p[1])).map(p => [p[1], p[0]]);
        if (r.length > 0) rings.push(r);
      });
    } else if (geofenceData.type === 'GeometryCollection') {
      geofenceData.geometries.forEach((geom: any) => {
        if (geom.type === 'Polygon') {
          geom.coordinates.forEach((ring: number[][]) => {
            const r: [number, number][] = ring.filter(p => !isNaN(p[0]) && !isNaN(p[1])).map(p => [p[1], p[0]]);
            if (r.length > 0) rings.push(r);
          });
        }
      });
    }
  } else if (typeof geofenceData === 'string') {
    const wktString = geofenceData.toUpperCase();
    const polygons: string[] = [];
    if (wktString.startsWith('GEOMETRYCOLLECTION')) {
      polygons.push(...(geofenceData.match(/POLYGON\s*\(\(.*?\)\)/gi) || []));
    } else if (wktString.startsWith('POLYGON')) {
      polygons.push(geofenceData);
    }
    polygons.forEach(polyStr => {
      const pairs = getPairsFromWKT(polyStr);
      if (pairs.length > 0) rings.push(pairs.map(p => [p.lat, p.lon] as [number, number]));
    });
  }
  return rings.length > 0 ? rings : null;
};

const parseGeofenceCentroid = (geofenceData: any): [number, number] | null => {
  const rings = parseGeofenceRings(geofenceData);
  if (!rings) return null;
  const flat = rings.flat();
  if (flat.length === 0) return null;
  const lat = flat.reduce((sum, p) => sum + p[0], 0) / flat.length;
  const lon = flat.reduce((sum, p) => sum + p[1], 0) / flat.length;
  return [lat, lon];
};

const BoundsFitter: React.FC<BoundsFitterProps> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
};

const buildNumberIcon = (number: number, color: string): L.DivIcon =>
  L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:${color};color:#fff;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${number}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const RouteMapView: React.FC<RouteMapViewProps> = ({ customers, bodegaLocation, despachoLabel, showBodega = true, showGeofences = true }) => {
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const orderedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
  }, [customers]);

  const waypoints = useMemo(() => {
    return orderedCustomers
      .map(c => ({ customer: c, centroid: parseGeofenceCentroid(c.geocerca), rings: parseGeofenceRings(c.geocerca) }))
      .filter((w): w is { customer: MapCustomer; centroid: [number, number]; rings: [number, number][][] } => w.centroid !== null && w.rings !== null);
  }, [orderedCustomers]);

  useEffect(() => {
    setRoutePath([]);
    if (waypoints.length === 0) return;
    let cancelled = false;

    const fetchRoute = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;
      const toApiLatLng = (latLng: [number, number]) => ({
        location: { latLng: { latitude: latLng[0], longitude: latLng[1] } },
      });
      const originPoint = showBodega
        ? ([bodegaLocation.lat, bodegaLocation.lng] as [number, number])
        : waypoints[0].centroid;
      const destinationPoint = showBodega
        ? originPoint
        : waypoints[waypoints.length - 1].centroid;
      const requestBody: any = {
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        origin: toApiLatLng(originPoint),
        destination: toApiLatLng(destinationPoint),
      };
      const intermediates = showBodega ? waypoints : waypoints.slice(1, -1);
      if (intermediates.length > 0) {
        requestBody.intermediates = intermediates.map(w => toApiLatLng(w.centroid));
      }
      const fieldMask = 'routes.polyline.encodedPolyline';
      try {
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          body: JSON.stringify(requestBody),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data.routes?.length > 0) {
          const decoded = decode(data.routes[0].polyline.encodedPolyline);
          setRoutePath(decoded.map(([lat, lng]) => [lat, lng] as [number, number]));
        }
      } catch {
        // Silencioso: se usa la línea recta como respaldo.
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [waypoints, bodegaLocation, showBodega]);

  const routePoints = useMemo((): { centroid: [number, number]; customer: MapCustomer }[] => {
    const base: { centroid: [number, number]; customer: MapCustomer }[] = waypoints.map(w => ({ centroid: w.centroid, customer: w.customer }));
    if (!showBodega) return base;
    return [
      { centroid: [bodegaLocation.lat, bodegaLocation.lng], customer: { code_customer: 'BODEGA', customer_name: despachoLabel || 'Bodega', state: false, geocerca: null } as MapCustomer },
      ...base,
    ];
  }, [waypoints, bodegaLocation, despachoLabel, showBodega]);

  const allPoints = useMemo(() => {
    const pts: [number, number][] = [[bodegaLocation.lat, bodegaLocation.lng]];
    waypoints.forEach(w => pts.push(w.centroid));
    return pts;
  }, [waypoints, bodegaLocation]);

  const routePositions: [number, number][] = routePath.length > 0 ? routePath : routePoints.map(p => p.centroid);

  return (
    <div className={cn('relative h-full w-full', isFullscreen && 'fixed inset-0 z-[1000] bg-white p-4')}>
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-3 right-3 z-[500] shadow-md"
        onClick={() => setIsFullscreen(prev => !prev)}
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
      <MapContainer center={[bodegaLocation.lat, bodegaLocation.lng]} zoom={12} className="h-full w-full rounded-lg z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ResizeHandler trigger={isFullscreen} />
        <BoundsFitter points={allPoints} />

      {routePositions.length > 1 && (
        <>
          <Polyline
            positions={routePositions}
            pathOptions={{ color: '#ffffff', weight: 7, opacity: 1 }}
          />
          <Polyline
            positions={routePositions}
            pathOptions={{ color: '#7c3aed', weight: 4, opacity: 0.95 }}
          />
        </>
      )}

      {waypoints.map((w, idx) => {
        const { customer, centroid, rings } = w;
        const isCompleted = !!customer.state;
        const color = isCompleted ? '#15803d' : '#dc2626';
        return (
          <React.Fragment key={`${customer.code_customer}-${idx}`}>
            {showGeofences && rings.map((ring, ringIdx) => (
              <Polygon
                key={`${customer.code_customer}-ring-${ringIdx}`}
                positions={ring}
                pathOptions={{ color, weight: 2, fillColor: color, fillOpacity: 0.15 }}
              />
            ))}
            <Marker
              position={centroid}
              icon={buildNumberIcon(idx + 1, color)}
              zIndexOffset={Math.max(0, 1000 - idx)}
            >
              <Tooltip permanent direction="top" offset={[0, -14]}>
                <div className="text-xs leading-snug">
                  <strong>{customer.customer_name}</strong><br />
                  <span>Cód.: {customer.code_customer}{customer.reference_number ? ` — Fact.: ${String(customer.reference_number)}` : ''}</span>
                </div>
              </Tooltip>
              <Popup>
                <div className="text-sm">
                  <strong>{customer.customer_name}</strong><br />
                  <span>Código cliente: {customer.code_customer}</span><br />
                  <span>Factura: {String(customer.reference_number || customer.code_customer)}</span><br />
                  <span>Visita #{idx + 1}</span><br />
                  <span style={{ color: isCompleted ? '#15803d' : '#dc2626', fontWeight: 600 }}>
                    {isCompleted ? '● Pagado' : '○ Pendiente'}
                  </span>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        );
      })}

      {showBodega && (
        <CircleMarker
          center={[bodegaLocation.lat, bodegaLocation.lng]}
          radius={10}
          pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#4285F4', fillOpacity: 1 }}
        >
          <Popup><strong>{despachoLabel || 'Bodega'}</strong></Popup>
        </CircleMarker>
      )}
    </MapContainer>
    </div>
  );
};

export default React.memo(RouteMapView);