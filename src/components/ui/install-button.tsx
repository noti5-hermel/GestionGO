
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function InstallButton() {
  const [isInstalled, setIsInstalled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Comprobar si la app ya se está ejecutando en modo standalone (instalada).
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstallClick = () => {
    router.push('/install');
  };

  // Si la app ya está instalada, no mostramos nada.
  if (isInstalled) {
    return null;
  }

  // Si no está instalada, muestra un botón que lleva a la página de instalación.
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
