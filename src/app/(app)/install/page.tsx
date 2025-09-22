
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Share, PlusSquare, ArrowDown } from 'lucide-react';
import Image from 'next/image';

// Define el tipo del evento beforeinstallprompt para mayor seguridad de tipos.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPage() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      alert("La opción de instalación automática no está disponible en este momento. Por favor, sigue las instrucciones manuales.");
      return;
    }
    await installPrompt.prompt();
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card>
        <CardHeader className="text-center">
           <Image
                src="/gestion-go.120Z.png"
                alt="GestiónGo Logo"
                width={80}
                height={80}
                className="h-20 w-20 mx-auto mb-4"
                data-ai-hint="logo"
            />
          <CardTitle className="text-3xl font-bold">Instalar GestiónGo</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Accede a la aplicación directamente desde tu pantalla de inicio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <Button
              onClick={handleInstallClick}
              size="lg"
              disabled={!installPrompt}
            >
              <Download className="mr-2 h-5 w-5" />
              Instalar Aplicación
            </Button>
            {!installPrompt && (
                <p className="text-sm text-muted-foreground mt-2">Si el botón está deshabilitado, sigue las instrucciones manuales.</p>
            )}
          </div>

          <Tabs defaultValue="android" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="android">Android (Chrome)</TabsTrigger>
              <TabsTrigger value="ios">iPhone (Safari)</TabsTrigger>
            </TabsList>
            <TabsContent value="android" className="mt-4">
                <div className="space-y-4 text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-xl">Instrucciones para Android</h3>
                    <p>1. Abre el menú de Chrome (los tres puntos verticales <span className="font-bold mx-1">⋮</span>).</p>
                    <p>2. Selecciona la opción <span className="font-bold">"Instalar aplicación"</span> o <span className="font-bold">"Añadir a pantalla de inicio"</span>.</p>
                    <p>3. Sigue las instrucciones para confirmar.</p>
                    <ArrowDown className="h-8 w-8 mx-auto text-primary animate-bounce mt-4"/>
                </div>
            </TabsContent>
            <TabsContent value="ios" className="mt-4">
                 <div className="space-y-4 text-center p-4 border rounded-lg">
                    <h3 className="font-semibold text-xl">Instrucciones para iPhone/iPad</h3>
                    <p>1. Toca el botón de Compartir (<Share className="inline-block h-5 w-5 align-text-bottom"/>) en la barra de navegación de Safari.</p>
                    <p>2. Desliza hacia arriba y busca la opción <span className="font-bold">"Añadir a pantalla de inicio"</span> (<PlusSquare className="inline-block h-5 w-5 align-text-bottom"/>).</p>
                    <p>3. Confirma el nombre de la aplicación y toca "Añadir".</p>
                    <ArrowDown className="h-8 w-8 mx-auto text-primary animate-bounce mt-4"/>
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
