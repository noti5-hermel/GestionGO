-- Caché persistente de la ruta calculada con Google Routes API, por despacho.
-- Objetivo: calcular cada ruta una sola vez y reutilizarla en las siguientes
-- aperturas (otro usuario, otro día, otro dispositivo) sin volver a facturarla.
--
-- `ruta_hash` incluye el orden exacto de las paradas, por lo que agregar,
-- quitar o reordenar clientes invalida la caché de forma automática.

create table if not exists public.despacho_ruta (
  id_despacho integer primary key references public.despacho(id_despacho) on delete cascade,
  polyline text not null,
  ruta_hash text not null,
  actualizado_en timestamptz not null default now()
);
