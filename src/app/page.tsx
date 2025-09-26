import { redirect } from 'next/navigation';

export default function RootPage() {
  // Ya no se redirige a /shipments, permitiendo que la ruta '/'
  // sea manejada por src/app/(app)/page.tsx, que es el dashboard.
  // Esta redirección a '/' asegura que se use el layout principal.
  redirect('/');
}
