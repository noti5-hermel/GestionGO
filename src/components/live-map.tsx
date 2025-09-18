
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Truck } from 'lucide-react';
import ReactDOMServer from 'react-dom/server';

/**
 * @file live-map.tsx
 * @description Componente que renderiza el mapa de Leaflet y los marcadores de los motoristas.
 * Este componente es cargado dinámicamente en la página del mapa para evitar problemas de SSR.
 */

// Tipos de datos para este componente.
type MotoristaLocation = {
  id_motorista: number;
  last_update: string;
  location: any; // Se usa 'any' para manejar de forma flexible string WKT u objeto GeoJSON.
  name?: string;
};

interface LiveMapProps {
  locations: MotoristaLocation[];
}

/**
 * Parsea el valor de ubicación de la base de datos para obtener coordenadas [lat, lon].
 * Puede manejar formato de string WKT "POINT(lon lat)" o formato de objeto GeoJSON.
 * @param locationData - El dato de ubicación, puede ser un string o un objeto.
 * @returns Un array [lat, lon] o null si el formato es inválido.
 */
const parseLocation = (locationData: any): [number, number] | null => {
  // Caso 1: El dato es un objeto (probablemente formato GeoJSON).
  if (typeof locationData === 'object' && locationData !== null && locationData.type === 'Point' && Array.isArray(locationData.coordinates)) {
    const [lon, lat] = locationData.coordinates;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return [lat, lon]; // Leaflet espera las coordenadas en formato [latitud, longitud].
    }
  }

  // Caso 2: El dato es un string (probablemente formato WKT - Well-Known Text).
  if (typeof locationData === 'string') {
    const match = locationData.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (match) {
      // El formato WKT es POINT(longitud latitud). Leaflet necesita [lat, lon].
      return [parseFloat(match[2]), parseFloat(match[1])];
    }
  }

  // Si no se puede parsear ninguno de los formatos, devuelve null.
  return null;
};


// Crea un ícono de marcador personalizado usando un ícono de Lucide (Truck).
// El SVG se convierte a un string y luego a Base64 para usarlo como URL de ícono.
const customIcon = new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(ReactDOMServer.renderToString(
    <Truck className="text-primary" fill="#fff" size={32} />
  ))}`,
  iconSize: [32, 32],     // Tamaño del ícono en píxeles.
  iconAnchor: [16, 32],   // Punto del ícono que corresponderá a la ubicación del marcador.
  popupAnchor: [0, -32],  // Punto desde donde se abrirá el popup relativo al iconAnchor.
});

/**
 * Componente funcional que renderiza el mapa y los marcadores.
 * @param {LiveMapProps} props - Las propiedades del componente, incluyendo la lista de ubicaciones.
 */
const LiveMap = ({ locations }: LiveMapProps) => {
  // Posición por defecto del mapa, centrada en El Salvador.
  const defaultPosition: LatLngExpression = [13.7942, -88.8965];

  return (
    <MapContainer center={defaultPosition} zoom={9} style={{ height: '100%', width: '100%' }}>
      {/* Capa de teselas del mapa base de OpenStreetMap. */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Itera sobre las ubicaciones para crear un marcador para cada una. */}
      {locations.map(loc => {
        // Parsea la ubicación para obtener coordenadas válidas.
        const position = parseLocation(loc.location);
        // Si la posición no es válida, no renderiza nada para esa ubicación.
        if (!position) return null;

        return (
          <Marker key={loc.id_motorista} position={position} icon={customIcon}>
            {/* El Popup muestra información cuando se hace clic en el marcador. */}
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
