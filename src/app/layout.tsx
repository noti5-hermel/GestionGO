
'use client'
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('Service Worker registrado con éxito:', registration))
        .catch((error) => console.error('Error al registrar el Service Worker:', error));
    }
  }, []);

  return (
    <html lang="es">
      <head>
        <title>GestiónGo</title>
        <meta name="description" content="Aplicación de gestión integral" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#03A6A6" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
