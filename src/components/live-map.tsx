
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Truck } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

// Tipos de datos
type MotoristaLocation = {
  id_motorista: number;
  last_update: string;
  location: string; // Formato "POINT(long lat)"
  name?: string;
};

interface LiveMapProps {
  locations: MotoristaLocation[];
}

// Función para parsear el punto de la base de datos
const parseLocation = (locationString: string): [number, number] | null => {
  if (!locationString) {
    return null; // Si el string es nulo o vacío, no se puede parsear.
  }
  const match = locationString.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
  if (match) {
    return [parseFloat(match[2]), parseFloat(match[1])]; // Devuelve [lat, lon]
  }
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
