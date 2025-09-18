
'use client'

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import 'leaflet/dist/leaflet.css';

/**
 * @file live-map/page.tsx
 * @description Página que muestra un mapa con la ubicación en tiempo real de los motoristas.
 * Utiliza Supabase Realtime para recibir actualizaciones de ubicación y las muestra en un mapa de Leaflet.
 */

// Tipos de datos para esta página.
type MotoristaLocation = {
  id_motorista: number;
  last_update: string;
  location: string; // Formato "POINT(long lat)" o GeoJSON.
  name?: string; // El nombre del motorista se añade después.
};

type User = {
  id_user: string;
  name: string;
};

// Carga dinámica del componente de mapa para evitar problemas con SSR (Server-Side Rendering).
// Leaflet depende del objeto `window`, que no está disponible en el servidor.
// Al definirlo fuera del componente, nos aseguramos de que solo se cree una vez por carga de módulo.
const LiveMap = dynamic(() => import('@/components/live-map'), {
  ssr: false, // Desactiva el renderizado en el servidor para este componente.
  loading: () => <p className="text-center">Cargando mapa...</p>, // Muestra un mensaje mientras carga.
});

/**
 * Componente principal de la página del Mapa en Vivo.
 */
export default function LiveMapPage() {
  // --- ESTADOS ---
  // Almacena las ubicaciones de los motoristas recibidas de Supabase.
  const [locations, setLocations] = useState<MotoristaLocation[]>([]);
  // Almacena la lista de todos los usuarios para poder asociar un nombre a cada ubicación.
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Función para obtener la lista de todos los usuarios (motoristas).
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('usuario').select('id_user, name');
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
      } else {
        setUsers(data as User[]);
      }
    };

    // Función para obtener las ubicaciones iniciales al cargar la página.
    const fetchInitialLocations = async () => {
      const { data, error } = await supabase.from('locations_motoristas').select('*');
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar las ubicaciones iniciales.", variant: "destructive" });
      } else {
        setLocations(data as MotoristaLocation[]);
      }
    };

    // Carga los datos iniciales.
    fetchUsers();
    fetchInitialLocations();

    // Suscripción a los cambios en tiempo real en la tabla `locations_motoristas`.
    const channel = supabase
      .channel('realtime-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations_motoristas' },
        (payload) => {
          // Cuando llega una nueva ubicación...
          const newLocation = payload.new as MotoristaLocation;
          // ...actualiza el estado.
          setLocations((prevLocations) => {
            const existingIndex = prevLocations.findIndex(loc => loc.id_motorista === newLocation.id_motorista);
            if (existingIndex !== -1) {
              // Si el motorista ya está en el mapa, actualiza su ubicación.
              const updatedLocations = [...prevLocations];
              updatedLocations[existingIndex] = newLocation;
              return updatedLocations;
            } else {
              // Si es un motorista nuevo, lo añade al mapa.
              return [...prevLocations, newLocation];
            }
          });
        }
      )
      .subscribe();

    // Cleanup: se desuscribe del canal cuando el componente se desmonta para evitar fugas de memoria.
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Combina las ubicaciones con los nombres de los usuarios usando `useMemo` para optimizar.
  // Este cálculo solo se re-ejecuta si `locations` o `users` cambian.
  const locationsWithNames = useMemo(() => {
    return locations.map(loc => {
      const user = users.find(u => Number(u.id_user) === loc.id_motorista);
      return { ...loc, name: user?.name || `Motorista #${loc.id_motorista}` };
    });
  }, [locations, users]);

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Mapa de Seguimiento en Tiempo Real</CardTitle>
        <CardDescription>
          Vea la ubicación de los motoristas activos. Las posiciones se actualizan automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-full w-full rounded-lg overflow-hidden border">
          <LiveMap locations={locationsWithNames} />
        </div>
      </CardContent>
    </Card>
  );
}
