
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Truck } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

// Tipos de datos
type MotoristaLocation = {
  id_motorista: number;
  last_update: string;
  location: any; // Se cambia a 'any' para manejar string u objeto
  name?: string;
};

interface LiveMapProps {
  locations: MotoristaLocation[];
}

/**
 * Parsea el valor de ubicación de la base de datos.
 * Puede manejar formato de string WKT "POINT(lon lat)" o formato de objeto GeoJSON.
 * @param locationData - El dato de ubicación, puede ser string u objeto.
 * @returns Un array [lat, lon] o null si el formato es inválido.
 */
const parseLocation = (locationData: any): [number, number] | null => {
  // Caso 1: El dato es un objeto (formato GeoJSON)
  if (typeof locationData === 'object' && locationData !== null && locationData.type === 'Point' && Array.isArray(locationData.coordinates)) {
    const [lon, lat] = locationData.coordinates;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return [lat, lon]; // Leaflet espera [lat, lon]
    }
  }

  // Caso 2: El dato es un string (formato WKT)
  if (typeof locationData === 'string') {
    const match = locationData.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      return [parseFloat(match[2]), parseFloat(match[1])]; // Devuelve [lat, lon]
    }
  }

  // Si no se puede parsear, devuelve null
  return null;
};


// Crear un icono personalizado usando un icono de Lucide
const customIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(ReactDOMServer.renderToString(
    <Truck className="text-primary" fill="#fff" size={32} />
  ))}`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const LiveMap = ({ locations }: LiveMapProps) => {
  const defaultPosition: LatLngExpression = [13.7942, -88.8965]; // Centro de El Salvador

  return (
    <MapContainer center={defaultPosition} zoom={9} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {locations.map(loc => {
        const position = parseLocation(loc.location);
        if (!position) return null;

        return (
          <Marker key={loc.id_motorista} position={position} icon={customIcon}>
            <Popup>
              <strong>{loc.name}</strong><br />
              Última actualización: {new Date(loc.last_update).toLocaleString()}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};

export default LiveMap;
