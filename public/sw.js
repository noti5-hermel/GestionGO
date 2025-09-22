// Este es un service worker básico.
// Por ahora, su propósito principal es existir para que la PWA sea instalable.

self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
});

self.addEventListener('fetch', (event) => {
  // Por ahora, solo pasamos las peticiones a la red.
  // Más adelante se podría añadir lógica de caché aquí.
  event.respondWith(fetch(event.request));
});
