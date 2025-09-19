
'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Truck, Home, User } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

/**
 * @file live-map.tsx
 * @description Componente que renderiza el mapa de Leaflet y los marcadores para un despacho.
 * Muestra el punto de partida, los clientes y la ubicación en vivo del motorista.
 */

// Tipos de datos para este componente.
type Point = {
  location: any;
  name?: string;
  type: 'motorista' | 'customer' | 'start';
  last_update?: string;
};

interface LiveMapProps {
  points: Point[];
  routePath?: [number, number][];
}

/**
 * Parsea una geocerca para obtener su centroide.
 * Admite formatos WKT (string) para POLYGON y GEOMETRYCOLLECTION, y objetos GeoJSON.
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

    if (typeof geofenceData === 'object' && geofenceData.type) {
        if (geofenceData.type === 'Polygon' && Array.isArray(geofenceData.coordinates)) {
            const coordinateRing = geofenceData.coordinates[0];
            if (Array.isArray(coordinateRing)) {
                allPoints = coordinateRing.map((p: number[]) => ({ lon: p[0], lat: p[1] }))
                    .filter(p => !isNaN(p.lon) && !isNaN(p.lat));
            }
        }
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

    if (allPoints.length === 0) return null;

    const centroid = allPoints.reduce((acc, point) => ({ lon: acc.lon + point.lon, lat: acc.lat + point.lat }), { lon: 0, lat: 0 });
    return {
        lon: String(centroid.lon / allPoints.length),
        lat: String(centroid.lat / allPoints.length)
    };
};

/**
 * Parsea el valor de ubicación de la base de datos para obtener coordenadas [lat, lon].
 * Puede manejar formato de string WKT "POINT(lon lat)" o formato de objeto GeoJSON.
 */
const parseLocation = (point: Point): [number, number] | null => {
  const locationData = point.location;
  if (point.type === 'customer') {
    const centroid = parseGeofenceCentroid(point.location);
    if(centroid) return [parseFloat(centroid.lat), parseFloat(centroid.lon)];
  }
  
  if (typeof locationData === 'object' && locationData !== null && locationData.type === 'Point' && Array.isArray(locationData.coordinates)) {
    const [lon, lat] = locationData.coordinates;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return [lat, lon];
    }
  }

  if (typeof locationData === 'string') {
    const match = locationData.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      return [parseFloat(match[2]), parseFloat(match[1])];
    }
  }

  return null;
};

// Generador de íconos personalizados
const createIcon = (icon: React.ReactElement) => new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(ReactDOMServer.renderToString(icon))}`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const icons = {
  motorista: createIcon(<Truck className="text-primary" fill="#fff" size={32} />),
  customer: createIcon(<User className="text-green-600" fill="#fff" size={32} />),
  start: createIcon(<Home className="text-red-600" fill="#fff" size={32} />),
};

const getIconForPoint = (point: Point) => {
  return icons[point.type] || icons.customer;
};

/**
 * Componente funcional que renderiza el mapa y los marcadores.
 */
const LiveMap = ({ points, routePath }: LiveMapProps) => {
  const defaultPosition: LatLngExpression = [13.7942, -88.8965];

  // Filtra los puntos que tienen coordenadas válidas.
  const validPoints = points.map((p, index) => ({ ...p, position: parseLocation(p), id: index })).filter(p => p.position);
  
  // Centra el mapa en el motorista si está disponible, si no, usa la posición por defecto.
  const mapCenter = validPoints.find(p => p.type === 'motorista')?.position || defaultPosition;

  return (
    <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {validPoints.map(point => (
        <Marker key={`${point.type}-${point.id}`} position={point.position!} icon={getIconForPoint(point)}>
          <Popup>
            <strong>{point.name}</strong>
            {point.last_update && <><br />Última actualización: {new Date(point.last_update).toLocaleString()}</>}
          </Popup>
        </Marker>
      ))}

      {routePath && routePath.length > 1 && (
        <Polyline pathOptions={{ color: 'blue' }} positions={routePath} />
      )}
    </MapContainer>
  );
};

export default LiveMap;
