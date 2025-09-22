
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
    // Comprueba si la app ya se está ejecutando en modo standalone (instalada).
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Esta función se ejecuta cuando el navegador determina que la PWA es instalable.
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevenimos el comportamiento por defecto del mini-infobar en algunos navegadores.
      event.preventDefault();
      // Guardamos el evento para poder usarlo más tarde al hacer clic en el botón.
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    // Añadimos el listener para el evento.
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listener para cuando la app ya se ha instalado.
    const handleAppInstalled = () => {
      // Ocultamos nuestro botón de instalación, ya que la app está instalada.
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Función de limpieza para eliminar los listeners cuando el componente se desmonte.
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Función que se llama al hacer clic en el botón de instalar.
  const handleInstallClick = async () => {
    // Si no tenemos un evento de instalación, no hacemos nada.
    if (!installPrompt) {
      return;
    }

    // Mostramos el diálogo de instalación nativo del navegador.
    await installPrompt.prompt();

    // Esperamos la elección del usuario.
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('El usuario aceptó la instalación.');
    } else {
      console.log('El usuario canceló la instalación.');
    }

    // El evento de instalación solo se puede usar una vez, así que lo limpiamos.
    setInstallPrompt(null);
  };

  if (isInstalled) {
    return (
       <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 cursor-not-allowed"
          disabled
       >
          <Check className="h-4 w-4" />
          <span>Instalada</span>
       </Button>
    )
  }

  // Renderizamos el botón, deshabilitado si la instalación no es posible todavía.
  return (
    <Button
      onClick={handleInstallClick}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
      disabled={!installPrompt}
    >
      <Download className="h-4 w-4" />
      <span>Instalar App</span>
    </Button>
  );
}
