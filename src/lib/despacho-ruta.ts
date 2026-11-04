import { supabase } from '@/lib/supabase';

/**
 * @file despacho-ruta.ts
 * @description Caché persistente de la ruta calculada por Google (Routes API).
 *
 * Cada despacho se calcula una sola vez: la polilínea devuelta por Google y el
 * hash del recorrido se guardan en la tabla `despacho_ruta`. En las siguientes
 * aperturas (otro usuario, otro día, otro dispositivo) se reutiliza el registro
 * y no se vuelve a facturar la llamada.
 *
 * El `ruta_hash` incluye el orden exacto de las paradas, por lo que cualquier
 * cambio real (agregar/quitar un cliente o reordenar manualmente) lo invalida
 * de forma automática.
 */

export type DespachoRuta = {
  polyline: string;
  ruta_hash: string;
};

/** Lee la ruta guardada de un despacho. Devuelve null si no existe o falla. */
export async function getDespachoRuta(idDespacho: number | string): Promise<DespachoRuta | null> {
  const id = Number(idDespacho);
  if (!Number.isFinite(id)) return null;

  const { data, error } = await supabase
    .from('despacho_ruta')
    .select('polyline, ruta_hash')
    .eq('id_despacho', id)
    .maybeSingle();

  if (error) {
    console.warn('[despacho-ruta] No se pudo leer la ruta guardada:', error.message);
    return null;
  }
  if (!data?.polyline) return null;

  return { polyline: data.polyline, ruta_hash: data.ruta_hash };
}

/** Guarda (o reemplaza) la ruta de un despacho. */
export async function saveDespachoRuta(
  idDespacho: number | string,
  polyline: string,
  rutaHash: string,
): Promise<void> {
  const id = Number(idDespacho);
  if (!Number.isFinite(id)) return;

  const { error } = await supabase
    .from('despacho_ruta')
    .upsert(
      {
        id_despacho: id,
        polyline,
        ruta_hash: rutaHash,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: 'id_despacho' },
    );

  if (error) {
    console.warn('[despacho-ruta] No se pudo guardar la ruta:', error.message);
  }
}

/**
 * Persiste el orden de visita optimizado por Google.
 * Se guarda junto con la polilínea para que el hash del recorrido coincida en
 * la siguiente carga y la caché siga siendo válida.
 */
export async function applyOptimizedInvoiceOrder(orderedIds: number[]): Promise<void> {
  const ids = orderedIds.filter(id => Number.isFinite(id));
  if (ids.length === 0) return;

  await Promise.all(
    ids.map((idFacDesp, index) =>
      supabase
        .from('facturacion_x_despacho')
        .update({ orden_visita: index + 1 })
        .eq('id_fac_desp', idFacDesp),
    ),
  );
}
