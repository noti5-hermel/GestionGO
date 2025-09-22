
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Check } from 'lucide-react';

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
    // 1. Comprobar si la app ya se está ejecutando en modo standalone (instalada).
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // 2. Escuchar el evento 'beforeinstallprompt'.
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Escuchar cuando la app ya se ha instalado.
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 4. Limpieza de los listeners.
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Función que se llama al hacer clic en el botón de instalar.
  const handleInstallClick = async () => {
    if (!installPrompt) {
      // Si el navegador aún no ha emitido el evento, no hacemos nada.
      console.log("El aviso de instalación no está disponible todavía.");
      return;
    }
    await installPrompt.prompt();
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
