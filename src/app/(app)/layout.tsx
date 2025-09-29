
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarInset,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { MainNav } from '@/components/main-nav';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { InstallButton } from '@/components/ui/install-button';

// Definir un tipo para la sesión del usuario
interface UserSession {
  id: string;
  name: string;
  role: string;
}

const LocationTracker = () => {
  const { toast } = useToast();
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    try {
      const userSession = localStorage.getItem('user-session');
      if (userSession) {
        setSession(JSON.parse(userSession));
      }
    } catch (error) {
      console.error("Failed to parse user session for location tracker", error);
    }
  }, []);

  useEffect(() => {
    if (!session || session.role.toLowerCase() !== 'motorista') {
      return;
    }

    let watchId: number | null = null;

    const handleSuccess = async (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      
      // Obtiene el ID del despacho activo desde localStorage.
      const activeShipmentId = localStorage.getItem('active_shipment_id');
      
      // Si no hay un recorrido activo, no hace nada.
      if (!activeShipmentId) {
        return;
      }
      
      const locationPoint = `POINT(${longitude} ${latitude})`;
      const timestamp = new Date().toISOString();
      const motoristaIdAsInt = parseInt(session.id, 10);

      if (isNaN(motoristaIdAsInt)) {
        console.error("Invalid motorista ID for location tracking");
        return;
      }

      // 1. Insertar en el historial de ubicaciones, ahora con el id_despacho.
      const { error: historyError } = await supabase
        .from('location_history')
        .insert({
          id_motorista: motoristaIdAsInt,
          location: locationPoint,
          timestamp: timestamp,
          id_despacho: parseInt(activeShipmentId, 10) // Asocia la ubicación al despacho.
        });

      if (historyError) {
        console.error("Error inserting into location_history:", historyError);
      }

      // 2. Actualizar la última ubicación conocida (upsert).
      const { error: upsertError } = await supabase
        .from('locations_motoristas')
        .upsert({
          id_motorista: motoristaIdAsInt,
          location: locationPoint,
          last_update: timestamp,
        }, { onConflict: 'id_motorista' });

      if (upsertError) {
        console.error("Error updating location:", upsertError);
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      toast({
        variant: 'destructive',
        title: 'Error de ubicación',
        description: `No se pudo obtener la ubicación: ${error.message}`,
      });
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [session, toast]);

  return null;
};


export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const userSessionString = localStorage.getItem('user-session');
      if (userSessionString) {
        const userSession = JSON.parse(userSessionString);
        setSession(userSession);
      } else {
        // Si no hay sesión, redirigir al login
        router.push('/login');
      }
    } catch (error) {
      console.error("Failed to parse user session from localStorage", error);
      router.push('/login');
    }
    setIsLoading(false);
  }, [router]);


  /**
   * Cierra la sesión del usuario eliminando la cookie de sesión
   * y redirigiendo a la página de inicio de sesión.
   * La función está diseñada para funcionar en iframes (como en Firebase Studio)
   * estableciendo SameSite=None y Secure.
   */
  const handleLogout = () => {
    // Limpia la sesión del localStorage
    localStorage.removeItem('user-session');
    // Limpia cualquier recorrido activo que pudiera haber quedado.
    localStorage.removeItem('active_shipment_id');
    // Establece la fecha de expiración de la cookie a una fecha pasada para que el navegador la elimine.
    document.cookie = 'auth-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=None; Secure';
    // Redirige al usuario a la página de login.
    window.location.href = '/login';
  };
  
  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Verificando sesión...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <LocationTracker />
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 group-data-[state=collapsed]:-ml-1">
              <h1 className="text-2xl font-bold text-primary group-data-[state=collapsed]:hidden">GestiónGo</h1>
              <h1 className="text-2xl font-bold text-primary group-data-[state=expanded]:hidden">GG</h1>
            </div>
          </div>
        </SidebarHeader>
        <div className="px-4 mb-2">
            {/* Botón para colapsar/expandir el menú en escritorio. Se mantiene visible. */}
            <SidebarTrigger className="hidden md:flex w-full justify-start" />
        </div>
        <SidebarSeparator />
        <SidebarContent>
          <MainNav session={session} />
        </SidebarContent>
        <SidebarFooter className="p-2">
          {session && (
            <div className="flex items-center gap-3 p-2 rounded-md transition-colors hover:bg-sidebar-accent">
              <Avatar className="size-8">
                <AvatarImage src="https://placehold.co/40x40.png" alt="@user" data-ai-hint="profile picture" />
                <AvatarFallback>{session.name ? session.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col group-data-[state=collapsed]:hidden">
                <span className="font-semibold text-sm">{session.name}</span>
                <span className="text-xs text-muted-foreground">{session.role}</span>
              </div>
              <Button variant="ghost" size="icon" className="ml-auto group-data-[state=collapsed]:hidden" onClick={handleLogout}>
                <LogOut className="size-4" />
              </Button>
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-6 sticky top-0 z-10 shrink-0">
          {/* Botón para desplegar el menú en vista móvil. Siempre visible. */}
          <SidebarTrigger className="flex md:hidden" />
          <div className="flex-1 text-right">
             <InstallButton />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
