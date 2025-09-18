
'use client'

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import 'leaflet/dist/leaflet.css';

// Tipos de datos
type MotoristaLocation = {
  id_motorista: number;
  last_update: string;
  location: string; // Formato "POINT(long lat)"
  name?: string;
};

type User = {
  id_user: string;
  name: string;
};

export default function LiveMapPage() {
  const [locations, setLocations] = useState<MotoristaLocation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();

  // Carga dinámica del mapa para evitar problemas con SSR.
  // Se usa useMemo para prevenir que el componente se re-inicialice en el modo estricto de React,
  // lo que causa el error "Map container is already initialized".
  const LiveMap = useMemo(() => dynamic(() => import('@/components/live-map'), {
    ssr: false,
    loading: () => <p className="text-center">Cargando mapa...</p>,
  }), []);


  useEffect(() => {
    // Función para obtener los usuarios (motoristas)
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('usuario').select('id_user, name');
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" });
      } else {
        setUsers(data as User[]);
      }
    };

    // Función para obtener las ubicaciones iniciales
    const fetchInitialLocations = async () => {
      const { data, error } = await supabase.from('locations_motoristas').select('*');
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar las ubicaciones iniciales.", variant: "destructive" });
      } else {
        setLocations(data as MotoristaLocation[]);
      }
    };

    fetchUsers();
    fetchInitialLocations();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('realtime-locations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations_motoristas' },
        (payload) => {
          const newLocation = payload.new as MotoristaLocation;
          setLocations((prevLocations) => {
            const existingIndex = prevLocations.findIndex(loc => loc.id_motorista === newLocation.id_motorista);
            if (existingIndex !== -1) {
              // Actualizar ubicación existente
              const updatedLocations = [...prevLocations];
              updatedLocations[existingIndex] = newLocation;
              return updatedLocations;
            } else {
              // Añadir nueva ubicación
              return [...prevLocations, newLocation];
            }
          });
        }
      )
      .subscribe();

    // Cleanup: desuscribirse del canal al desmontar el componente
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  // Combina las ubicaciones con los nombres de los usuarios
  const locationsWithNames = useMemo(() => {
    return locations.map(loc => {
      const user = users.find(u => Number(u.id_user) === loc.id_motorista);
      return { ...loc, name: user?.name || `Motorista #${loc.id_motorista}` };
    });
  }, [locations, users]);

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
