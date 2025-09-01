create or replace function public.update_shipment_totals(p_id_despacho integer)
returns void
language plpgsql
as $$
declare
    v_total_contado decimal;
    v_total_credito decimal;
    v_total_general decimal;
begin
    -- Calcular el total de contado sumando los grand_total de las facturas de Consumidor Final
    select coalesce(sum(f.grand_total), 0)
    into v_total_contado
    from facturacion_x_despacho fxd
    join facturacion f on fxd.id_factura = f.id_factura
    join customer c on f.code_customer = c.code_customer
    join tipo_impuesto ti on c.id_impuesto = ti.id_impuesto
    where fxd.id_despacho = p_id_despacho
      and ti.impt_desc = 'Consumidor Final';

    -- Calcular el total de crédito sumando los grand_total de las facturas de Crédito Fiscal
    select coalesce(sum(f.grand_total), 0)
    into v_total_credito
    from facturacion_x_despacho fxd
    join facturacion f on fxd.id_factura = f.id_factura
    join customer c on f.code_customer = c.code_customer
    join tipo_impuesto ti on c.id_impuesto = ti.id_impuesto
    where fxd.id_despacho = p_id_despacho
      and ti.impt_desc = 'Crédito Fiscal';

    -- Calcular el total general
    v_total_general := v_total_contado + v_total_credito;

    -- Actualizar la tabla de despacho
    update despacho
    set
        total_contado = v_total_contado,
        total_credito = v_total_credito,
        total_general = v_total_general
    where id_despacho = p_id_despacho;
end;
$$;
