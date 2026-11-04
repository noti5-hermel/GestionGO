/**
 * @file route-chunks.ts
 * @description Utilidades para despachos que superan el límite de 25 paradas
 * intermedias de Google Routes API.
 *
 *  - `optimizeOrderLocally`: ordena las paradas en el navegador (vecino más
 *    cercano + 2-opt). No cuesta nada y no tiene límite de paradas.
 *  - `buildRouteChunks`: parte el recorrido en solicitudes que respetan el
 *    límite de 25 intermedias, compartiendo el punto de unión entre tramos.
 */

export type LatLng = [number, number];

/** Máximo de paradas intermedias que acepta `computeRoutes` en una solicitud. */
export const MAX_INTERMEDIATES_PER_REQUEST = 25;

const EARTH_RADIUS_M = 6371000;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** Distancia en metros entre dos coordenadas [lat, lng]. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b[0] - a[0]);
  const dLng = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Ordena las paradas con una heurística de vecino más cercano y la mejora con
 * 2-opt. El recorrido se considera cerrado: sale de `start` y vuelve a `start`.
 *
 * @returns Índices de `points` en el orden de visita.
 */
export function optimizeOrderLocally(points: LatLng[], start: LatLng): number[] {
  const total = points.length;
  if (total <= 1) return points.map((_, index) => index);

  // --- 1. Vecino más cercano desde la bodega ---
  const visited = new Array<boolean>(total).fill(false);
  const order: number[] = [];
  let current = start;

  for (let step = 0; step < total; step++) {
    let best = -1;
    let bestDistance = Infinity;
    for (let i = 0; i < total; i++) {
      if (visited[i]) continue;
      const distance = haversine(current, points[i]);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    visited[best] = true;
    order.push(best);
    current = points[best];
  }

  // --- 2. Mejora con 2-opt sobre la ruta cerrada ---
  // `-1` representa la bodega (inicio y fin del recorrido).
  const route: number[] = [-1, ...order];
  const pointAt = (index: number): LatLng => (index < 0 ? start : points[index]);
  const distance = (a: number, b: number) => haversine(pointAt(a), pointAt(b));

  let improved = true;
  let passes = 0;
  while (improved && passes < 40) {
    improved = false;
    passes++;

    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const a = route[i];
        const b = route[i + 1];
        const c = route[j];
        const next = j + 1 < route.length ? route[j + 1] : -1;

        const currentCost = distance(a, b) + distance(c, next);
        const swappedCost = distance(a, c) + distance(b, next);

        if (swappedCost + 1e-9 < currentCost) {
          let left = i + 1;
          let right = j;
          while (left < right) {
            const temp = route[left];
            route[left] = route[right];
            route[right] = temp;
            left++;
            right--;
          }
          improved = true;
        }
      }
    }
  }

  // Quitar la bodega del inicio; el resto ya es el orden optimizado.
  return route.slice(1);
}

export type RouteChunk = {
  origin: LatLng;
  intermediates: LatLng[];
  destination: LatLng;
};

/**
 * Divide un camino en tramos que respetan el límite de la API.
 * Cada tramo usa como máximo `maxIntermediates` paradas intermedias
 * (origen + intermedias + destino). El punto de unión se comparte.
 */
export function buildRouteChunks(
  path: LatLng[],
  maxIntermediates: number = MAX_INTERMEDIATES_PER_REQUEST,
): RouteChunk[] {
  if (path.length < 2) return [];

  const maxLegsPerChunk = maxIntermediates + 1;
  const chunks: RouteChunk[] = [];
  let start = 0;

  while (start < path.length - 1) {
    const end = Math.min(start + maxLegsPerChunk, path.length - 1);
    chunks.push({
      origin: path[start],
      intermediates: path.slice(start + 1, end),
      destination: path[end],
    });
    start = end;
  }

  return chunks;
}

/**
 * Une varias polilíneas decodificadas en una sola, descartando el primer punto
 * de cada tramo porque coincide con el último del tramo anterior.
 */
export function joinDecodedPolylines(segments: LatLng[][]): LatLng[] {
  const joined: LatLng[] = [];
  for (const segment of segments) {
    if (segment.length === 0) continue;
    const points = joined.length > 0 ? segment.slice(1) : segment;
    joined.push(...points);
  }
  return joined;
}
