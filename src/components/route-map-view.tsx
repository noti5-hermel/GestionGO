'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decode, encode } from '@googlemaps/polyline-codec';
import {
  MAX_INTERMEDIATES_PER_REQUEST,
  buildRouteChunks,
  joinDecodedPolylines,
  optimizeOrderLocally,
  type LatLng,
} from '@/lib/route-chunks';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MapCustomer = {
  code_customer: string;
  customer_name: string;
  geocerca: any;
  state?: boolean;
  reference_number?: string | number | null;
  orden_visita?: number | null;
  foto_ubicacion?: string | null;
  id_fac_desp?: number;
};

export type RouteResolvedPayload = {
  /** Polilínea codificada devuelta por Google. */
  polyline: string;
  /** Hash del recorrido definitivo (con el orden optimizado). */
  hash: string;
  /** Orden optimizado de las facturas del despacho, si Google lo devolvió. */
  optimizedInvoiceIds: number[] | null;
};

interface RouteMapViewProps {
  customers: MapCustomer[];
  bodegaLocation: { lat: number; lng: number };
  despachoLabel?: string;
  showBodega?: boolean;
  showGeofences?: boolean;
  motoristaPath?: { lat: number; lng: number }[];
  motoristaLocation?: { lat: number; lng: number } | null;
  /** Polilínea ya guardada en base de datos para este despacho. */
  storedPolyline?: string | null;
  /** Hash con el que se guardó `storedPolyline`. */
  storedHash?: string | null;
  /** Se invoca cuando se calculó una ruta nueva, para que el padre la persista. */
  onRouteResolved?: (payload: RouteResolvedPayload) => void;
}

interface BoundsFitterProps {
  points: [number, number][];
}

interface ResizeHandlerProps {
  trigger: boolean;
}

type RouteWaypoint = { customer: MapCustomer; centroid: [number, number]; rings: [number, number][][] };

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

const ROUTE_CACHE_LIMIT = 60;

/**
 * Caché en memoria (por sesión del navegador) de polilíneas ya calculadas.
 * Evita repetir la llamada a Google cuando el componente se vuelve a montar
 * dentro de la misma sesión, incluso si el padre no persiste el resultado.
 */
const routeCache = new Map<string, string>();

const decodePolyline = (encoded: string): [number, number][] =>
  decode(encoded).map(([lat, lng]) => [lat, lng] as [number, number]);

const rememberRoute = (key: string, encoded: string) => {
  if (routeCache.has(key)) routeCache.delete(key);
  routeCache.set(key, encoded);
  if (routeCache.size > ROUTE_CACHE_LIMIT) {
    const oldestKey = routeCache.keys().next().value;
    if (oldestKey !== undefined) routeCache.delete(oldestKey);
  }
};

/**
 * Hash del recorrido. Es sensible al orden: si se agrega, quita o reordena una
 * parada, cambia y la ruta guardada deja de reutilizarse.
 */
const buildRouteHash = (
  centroids: [number, number][],
  bodegaLocation: { lat: number; lng: number },
  showBodega: boolean,
) =>
  `${showBodega ? 'B' : 'C'}|${bodegaLocation.lat.toFixed(6)},${bodegaLocation.lng.toFixed(6)}|` +
  centroids.map(([lat, lng]) => `${lat.toFixed(6)},${lng.toFixed(6)}`).join(';');

const RouteMapView: React.FC<RouteMapViewProps> = ({
  customers,
  bodegaLocation,
  despachoLabel,
  showBodega = true,
  showGeofences = true,
  motoristaPath = [],
  motoristaLocation = null,
  storedPolyline = null,
  storedHash = null,
  onRouteResolved,
}) => {
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  // Orden óptimo devuelto por Google, ligado al hash del pedido que lo originó.
  // Se usa solo para que los marcadores coincidan con la polilínea en esta sesión.
  const [optimized, setOptimized] = useState<{ hash: string; order: number[] } | null>(null);

  const orderedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => (a.orden_visita ?? Infinity) - (b.orden_visita ?? Infinity));
  }, [customers]);

  const waypoints = useMemo(() => {
    return orderedCustomers
      .map(c => ({ customer: c, centroid: parseGeofenceCentroid(c.geocerca), rings: parseGeofenceRings(c.geocerca) }))
      .filter((w): w is RouteWaypoint => w.centroid !== null && w.rings !== null);
  }, [orderedCustomers]);

  // Referencia al último valor para leerlo dentro del efecto sin volver a
  // dispararlo cuando el padre recrea los arrays en cada render.
  const waypointsRef = useRef(waypoints);
  waypointsRef.current = waypoints;

  const onRouteResolvedRef = useRef(onRouteResolved);
  onRouteResolvedRef.current = onRouteResolved;

  const requestHash = useMemo(
    () => buildRouteHash(waypoints.map(w => w.centroid), bodegaLocation, showBodega),
    [waypoints, bodegaLocation, showBodega],
  );

  useEffect(() => {
    setRoutePath([]);
    setRouteError(null);

    // 1. Ruta ya guardada en base de datos para este mismo recorrido.
    if (storedPolyline && storedHash === requestHash) {
      setRoutePath(decodePolyline(storedPolyline));
      return;
    }

    // 2. Ruta ya calculada en esta sesión.
    const cached = routeCache.get(requestHash);
    if (cached) {
      setRoutePath(decodePolyline(cached));
      return;
    }

    const currentWaypoints = waypointsRef.current;
    if (currentWaypoints.length === 0) return;

    let cancelled = false;

    const toApiLatLng = (latLng: LatLng) => ({
      location: { latLng: { latitude: latLng[0], longitude: latLng[1] } },
    });
    const endpoint = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const bodegaPoint: LatLng = [bodegaLocation.lat, bodegaLocation.lng];

    const fetchRoute = async () => {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;

      // ==================================================================
      // Más de 25 paradas: Google no puede optimizar ni trazar en una sola
      // solicitud. Se ordena localmente (gratis) y se pide por tramos.
      // ==================================================================
      if (currentWaypoints.length > MAX_INTERMEDIATES_PER_REQUEST) {
        const needsLocalOrder =
          showBodega && currentWaypoints.some(w => typeof w.customer.orden_visita !== 'number');

        const order = needsLocalOrder
          ? optimizeOrderLocally(currentWaypoints.map(w => w.centroid), bodegaPoint)
          : null;

        const finalWaypoints = order ? order.map(i => currentWaypoints[i]) : currentWaypoints;
        const effectiveHash = buildRouteHash(finalWaypoints.map(w => w.centroid), bodegaLocation, showBodega);

        // Puede estar cacheada con el orden local aunque `orden_visita` todavía
        // no se haya persistido en la base.
        if (storedPolyline && storedHash === effectiveHash) {
          if (cancelled) return;
          setRoutePath(decodePolyline(storedPolyline));
          if (order) setOptimized({ hash: requestHash, order });
          return;
        }
        const cachedLarge = routeCache.get(effectiveHash);
        if (cachedLarge) {
          if (cancelled) return;
          setRoutePath(decodePolyline(cachedLarge));
          if (order) setOptimized({ hash: requestHash, order });
          return;
        }

        const path: LatLng[] = showBodega
          ? [bodegaPoint, ...finalWaypoints.map(w => w.centroid), bodegaPoint]
          : finalWaypoints.map(w => w.centroid);

        try {
          const segments: LatLng[][] = [];

          for (const chunk of buildRouteChunks(path)) {
            const body: Record<string, unknown> = {
              travelMode: 'DRIVE',
              routingPreference: 'TRAFFIC_AWARE',
              origin: toApiLatLng(chunk.origin),
              destination: toApiLatLng(chunk.destination),
            };
            if (chunk.intermediates.length > 0) {
              body.intermediates = chunk.intermediates.map(toApiLatLng);
            }

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'routes.polyline.encodedPolyline',
              },
              body: JSON.stringify(body),
            });

            if (!response.ok) {
              console.warn('[route-map] No se pudo calcular un tramo:', response.status, await response.text().catch(() => ''));
              if (!cancelled) setRouteError('No se pudo calcular la ruta. Intentá de nuevo en unos segundos.');
              return; // no se cachea una ruta incompleta
            }

            const data = await response.json();
            const encodedChunk: string | undefined = data.routes?.[0]?.polyline?.encodedPolyline;
            if (!encodedChunk) {
              if (!cancelled) setRouteError('No se pudo calcular la ruta. Intentá de nuevo en unos segundos.');
              return;
            }
            segments.push(decodePolyline(encodedChunk));
          }

          const joined = joinDecodedPolylines(segments);
          if (joined.length === 0) return;
          const encoded = encode(joined);

          rememberRoute(effectiveHash, encoded);
          rememberRoute(requestHash, encoded);

          const ids = finalWaypoints.map(w => w.customer.id_fac_desp);
          const allIdsKnown = ids.every((v): v is number => typeof v === 'number');

          if (cancelled) return;
          setRoutePath(joined);
          if (order) setOptimized({ hash: requestHash, order });
          onRouteResolvedRef.current?.({
            polyline: encoded,
            hash: effectiveHash,
            // Solo se persiste el orden si lo calculamos nosotros; si ya venía
            // ordenado no hace falta reescribir `orden_visita`.
            optimizedInvoiceIds: order && allIdsKnown ? ids : null,
          });
        } catch (error) {
          console.warn('[route-map] Error al calcular la ruta por tramos:', error);
          if (!cancelled) setRouteError('No se pudo calcular la ruta. Intentá de nuevo en unos segundos.');
        }
        return;
      }

      // ==================================================================
      // 25 paradas o menos: una sola llamada, con optimización de Google.
      // ==================================================================
      const requestBody: any = {
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      };
      let fieldMask = 'routes.polyline.encodedPolyline';
      const shouldOptimize = showBodega && currentWaypoints.length > 1;

      if (shouldOptimize) {
        // Ruta más óptima: origen y destino la bodega, clientes como paradas intermedias.
        requestBody.origin = toApiLatLng(bodegaPoint);
        requestBody.destination = toApiLatLng(bodegaPoint);
        requestBody.intermediates = currentWaypoints.map(w => toApiLatLng(w.centroid));
        requestBody.optimizeWaypointOrder = true;
        fieldMask += ',routes.optimizedIntermediateWaypointIndex';
      } else {
        const originPoint = showBodega ? bodegaPoint : currentWaypoints[0].centroid;
        const destinationPoint = showBodega
          ? originPoint
          : currentWaypoints[currentWaypoints.length - 1].centroid;
        requestBody.origin = toApiLatLng(originPoint);
        requestBody.destination = toApiLatLng(destinationPoint);
        const intermediates = showBodega ? currentWaypoints : currentWaypoints.slice(1, -1);
        if (intermediates.length > 0) {
          requestBody.intermediates = intermediates.map(w => toApiLatLng(w.centroid));
        }
      }
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': fieldMask,
          },
          body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
          console.warn('[route-map] No se pudo calcular la ruta:', response.status, await response.text().catch(() => ''));
          if (!cancelled) setRouteError('No se pudo calcular la ruta. Intentá de nuevo en unos segundos.');
          return;
        }
        const data = await response.json();
        const route = data.routes?.[0];
        const encoded: string | undefined = route?.polyline?.encodedPolyline;
        if (!encoded) return;

        const order: number[] | null =
          Array.isArray(route.optimizedIntermediateWaypointIndex) && route.optimizedIntermediateWaypointIndex.length > 0
            ? route.optimizedIntermediateWaypointIndex
            : null;

        const orderedWaypoints: RouteWaypoint[] | null = order
          ? order.map(i => currentWaypoints[i]).filter((w): w is RouteWaypoint => Boolean(w))
          : null;
        // Google devuelve una permutación completa; si faltara alguna parada se
        // usa el orden original para que el hash siga siendo reproducible.
        const hasFullOrder = !!orderedWaypoints && orderedWaypoints.length === currentWaypoints.length;
        const finalWaypoints = hasFullOrder ? orderedWaypoints! : currentWaypoints;

        // El hash se calcula con el orden definitivo: así, cuando el padre
        // persista `orden_visita`, la siguiente carga coincide y no se recobra.
        const effectiveHash = buildRouteHash(finalWaypoints.map(w => w.centroid), bodegaLocation, showBodega);
        rememberRoute(effectiveHash, encoded);
        rememberRoute(requestHash, encoded);

        const optimizedInvoiceIds = hasFullOrder
          ? finalWaypoints.map(w => w.customer.id_fac_desp)
          : null;
        const allIdsKnown =
          !!optimizedInvoiceIds && optimizedInvoiceIds.every((v): v is number => typeof v === 'number');

        if (cancelled) return;
        setRoutePath(decodePolyline(encoded));
        if (hasFullOrder && order) setOptimized({ hash: requestHash, order });
        onRouteResolvedRef.current?.({
          polyline: encoded,
          hash: effectiveHash,
          optimizedInvoiceIds: allIdsKnown ? optimizedInvoiceIds : null,
        });
      } catch (error) {
        console.warn('[route-map] Error al calcular la ruta:', error);
      }
    };

    fetchRoute();
    return () => { cancelled = true; };
  }, [requestHash, storedPolyline, storedHash, bodegaLocation, showBodega]);

  // Marcadores en el mismo orden que sigue la polilínea.
  const displayWaypoints = useMemo(() => {
    if (!optimized || optimized.hash !== requestHash) return waypoints;
    const reordered = optimized.order.map(i => waypoints[i]).filter((w): w is RouteWaypoint => Boolean(w));
    return reordered.length === waypoints.length ? reordered : waypoints;
  }, [optimized, requestHash, waypoints]);

  const routePoints = useMemo((): { centroid: [number, number]; customer: MapCustomer }[] => {
    const base: { centroid: [number, number]; customer: MapCustomer }[] = displayWaypoints.map(w => ({ centroid: w.centroid, customer: w.customer }));
    if (!showBodega) return base;
    return [
      { centroid: [bodegaLocation.lat, bodegaLocation.lng], customer: { code_customer: 'BODEGA', customer_name: despachoLabel || 'Bodega', state: false, geocerca: null } as MapCustomer },
      ...base,
    ];
  }, [displayWaypoints, bodegaLocation, despachoLabel, showBodega]);

  const allPoints = useMemo(() => {
    const pts: [number, number][] = [[bodegaLocation.lat, bodegaLocation.lng]];
    displayWaypoints.forEach(w => pts.push(w.centroid));
    return pts;
  }, [displayWaypoints, bodegaLocation]);

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
      {routeError && (
        <div className="absolute bottom-3 left-3 z-[500] max-w-[80%] rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground shadow-md">
          {routeError}
        </div>
      )}
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

      {motoristaPath.length > 1 && (
        <Polyline
          positions={motoristaPath.map(p => [p.lat, p.lng])}
          pathOptions={{ color: '#FF6F00', weight: 3, opacity: 0.9 }}
        />
      )}

      {motoristaLocation && (
        <Marker
          position={[motoristaLocation.lat, motoristaLocation.lng]}
          icon={buildNumberIcon(0, '#FF6F00')}
          zIndexOffset={1000}
        >
          <Tooltip permanent direction="top" offset={[0, -14]}>
            <span className="text-xs font-semibold">Motorista</span>
          </Tooltip>
        </Marker>
      )}

      {displayWaypoints.map((w, idx) => {
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
                  {customer.foto_ubicacion && (
                    <button
                      type="button"
                      className="block mb-2 cursor-zoom-in p-0 border-0 bg-transparent"
                      onClick={() => setSelectedImage(customer.foto_ubicacion!)}
                    >
                      <img
                        src={customer.foto_ubicacion}
                        alt={`Foto sucursal ${customer.customer_name}`}
                        width={160}
                        height={120}
                        className="rounded border object-cover w-[160px] h-[120px]"
                      />
                    </button>
                  )}
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

    {selectedImage && (
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-4 cursor-zoom-out"
        onClick={() => setSelectedImage(null)}
      >
        <img
          src={selectedImage}
          alt="Foto de sucursal"
          className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        />
      </div>
    )}
    </div>
  );
};

export default React.memo(RouteMapView);