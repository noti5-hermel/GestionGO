
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

// Define el tipo del evento beforeinstallprompt para mayor seguridad de tipos.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallButton() {
  // Estado para guardar el evento que nos permite mostrar el diálogo de instalación.
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Estado para saber si la app ya está instalada o corriendo en modo standalone.
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Registrar el Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('Service Worker registrado con éxito:', registration))
        .catch((error) => console.error('Error al registrar el Service Worker:', error));
    }
  
    // 2. Comprobar si la app ya se está ejecutando en modo standalone (instalada).
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // 3. Escuchar el evento 'beforeinstallprompt'.
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Escuchar cuando la app ya se ha instalado.
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Limpieza de los listeners.
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Función que se llama al hacer clic en el botón de instalar.
  const handleInstallClick = async () => {
    if (!installPrompt) {
      // Si el navegador aún no ha emitido el evento, no hacemos nada.
      // Podríamos mostrar un toast informativo si quisiéramos.
      console.log("El aviso de instalación no está disponible todavía.");
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('El usuario aceptó la instalación.');
    } else {
      console.log('El usuario canceló la instalación.');
    }
    setInstallPrompt(null);
  };

  // Si la app ya está instalada, no mostramos nada.
  if (isInstalled) {
    return null;
  }

  // Si no está instalada, mostramos el botón siempre habilitado.
  return (
    <Button
      onClick={handleInstallClick}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      <span>Instalar App</span>
    </Button>
  );
}
