

'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Shipment = {
  id_despacho: string
  id_ruta: string
  id_motorista: string
  id_auxiliar: string
  total_contado: number
  total_credito: number
  total_general: number
  fecha_despacho: string
  bodega: boolean
  reparto: boolean
  facturacion: boolean
  asist_admon: boolean
  cobros: boolean
  gerente_admon: boolean
}

type ShipmentInvoice = {
  id_fac_desp: number
  id_factura: string
  comprobante: string
  forma_pago: "Efectivo" | "Tarjeta" | "Transferencia"
  monto: number
  state: boolean
  invoice_number?: string | number
  tax_type?: string
}

type User = { id_user: string; name: string }
type Route = { id_ruta: string; ruta_desc: string }
type Invoice = { id_factura: string, invoice_number: string | number, code_customer: string }
type Customer = { code_customer: string; id_impuesto: number };
type TaxType = { id_impuesto: number; impt_desc: string };


const StatusBadge = ({ checked, text }: { checked: boolean, text: string }) => {
    return (
        <div className="flex items-center gap-2">
            <span className="font-medium">{text}:</span>
            <Badge variant={checked ? "default" : "outline"}>{checked ? "Completado" : "Pendiente"}</Badge>
        </div>
    )
}

export default function ShipmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { id } = params
  const { toast } = useToast()

  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [invoices, setInvoices] = useState<ShipmentInvoice[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    if (!id) return;
    setLoading(true)
    
    const [
      shipmentRes,
      usersRes,
      routesRes,
      shipmentInvoicesRes,
    ] = await Promise.all([
      supabase.from('despacho').select('*').eq('id_despacho', id).single(),
      supabase.from('usuario').select('id_user, name'),
      supabase.from('rutas').select('id_ruta, ruta_desc'),
      supabase.from('facturacion_x_despacho').select('*').eq('id_despacho', id),
    ]);

    if (shipmentRes.error) toast({ title: "Error", description: "No se pudo cargar el despacho.", variant: "destructive" })
    else setShipment(shipmentRes.data as Shipment)

    if (usersRes.error) toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" })
    else setUsers(usersRes.data as User[])

    if (routesRes.error) toast({ title: "Error", description: "No se pudieron cargar las rutas.", variant: "destructive" })
    else setRoutes(routesRes.data as Route[])
    
    if (shipmentInvoicesRes.error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas asociadas.", variant: "destructive" })
    } else {
      const shipmentInvoicesData = (shipmentInvoicesRes.data || []) as ShipmentInvoice[]
      const invoiceIds = shipmentInvoicesData.map(inv => inv.id_factura)

      if (invoiceIds.length > 0) {
          const { data: invoicesData, error: invoicesError } = await supabase.from('facturacion').select('id_factura, invoice_number, code_customer').in('id_factura', invoiceIds)
          if (invoicesError) {
              toast({ title: "Error", description: "No se pudieron cargar los datos de facturas.", variant: "destructive" });
          } else {
              const customerCodes = (invoicesData || []).map(inv => inv.code_customer)
              const { data: customersData, error: customersError } = await supabase.from('customer').select('code_customer, id_impuesto').in('code_customer', customerCodes)
              if (customersError) {
                  toast({ title: "Error", description: "No se pudieron cargar los datos de clientes.", variant: "destructive" });
              } else {
                  const taxIds = (customersData || []).map(c => c.id_impuesto)
                  const { data: taxesData, error: taxesError } = await supabase.from('tipo_impuesto').select('id_impuesto, impt_desc').in('id_impuesto', taxIds)
                  if (taxesError) {
                      toast({ title: "Error", description: "No se pudieron cargar los tipos de impuesto.", variant: "destructive" });
                  } else {
                      const taxMap = new Map((taxesData || []).map(t => [t.id_impuesto, t.impt_desc]))
                      const customerTaxMap = new Map((customersData || []).map(c => [c.code_customer, taxMap.get(c.id_impuesto)]))
                      const invoiceCustomerMap = new Map((invoicesData || []).map(i => [i.id_factura, i.code_customer]))
                      const invoiceNumberMap = new Map((invoicesData || []).map(i => [i.id_factura, i.invoice_number]))

                      const enrichedInvoices = shipmentInvoicesData.map(si => ({
                          ...si,
                          invoice_number: invoiceNumberMap.get(si.id_factura),
                          tax_type: customerTaxMap.get(invoiceCustomerMap.get(si.id_factura) || '')
                      }));
                      setInvoices(enrichedInvoices);
                  }
              }
          }
      } else {
        setInvoices([])
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [id, toast])

  const handleStatusChange = async (invoiceId: number, newState: boolean) => {
    const { error } = await supabase
      .from('facturacion_x_despacho')
      .update({ state: newState })
      .eq('id_fac_desp', invoiceId);
  
    if (error) {
      toast({
        title: "Error al actualizar",
        description: "No se pudo cambiar el estado de la factura.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Estado de la factura actualizado correctamente.",
      });
      fetchData(); // Recargar datos para reflejar el cambio
    }
  };

  const getRouteDescription = (routeId: string) => routes.find(route => String(route.id_ruta) === String(routeId))?.ruta_desc || routeId
  const getUserName = (userId: string) => users.find(user => String(user.id_user) === String(userId))?.name || userId
  const getStatusLabel = (status: boolean) => status ? "Pagado" : "Pendiente"

  const fiscalCreditInvoices = invoices.filter(inv => inv.tax_type === 'Crédito Fiscal');
  const finalConsumerInvoices = invoices.filter(inv => inv.tax_type === 'Consumidor Final');
  const otherInvoices = invoices.filter(inv => inv.tax_type !== 'Crédito Fiscal' && inv.tax_type !== 'Consumidor Final');


  if (loading) {
    return <p>Cargando detalles del despacho...</p>
  }

  if (!shipment) {
    return <p>Despacho no encontrado.</p>
  }

  const renderInvoicesTable = (invoiceList: ShipmentInvoice[], title: string, description: string) => (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Factura</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Forma de Pago</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiceList.length > 0 ? invoiceList.map((invoice) => (
              <TableRow key={invoice.id_fac_desp}>
                <TableCell className="font-medium">{String(invoice.invoice_number || invoice.id_factura)}</TableCell>
                <TableCell>{invoice.comprobante}</TableCell>
                <TableCell>{invoice.forma_pago}</TableCell>
                <TableCell>${invoice.monto.toFixed(2)}</TableCell>
                <TableCell>
                  <Select
                    value={String(invoice.state)}
                    onValueChange={(value) => handleStatusChange(invoice.id_fac_desp, value === 'true')}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Pagado</SelectItem>
                      <SelectItem value="false">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                  <TableCell colSpan={5} className="text-center">No hay facturas en esta categoría.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
          <div className="text-xs text-muted-foreground">
              Mostrando <strong>{invoiceList.length}</strong> de <strong>{invoiceList.length}</strong> facturas.
          </div>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Detalle del Despacho #{shipment.id_despacho}</CardTitle>
              <CardDescription>
                Información detallada del despacho y su estado actual.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Despachos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Ruta</p>
              <p>{getRouteDescription(shipment.id_ruta)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Motorista</p>
              <p>{getUserName(shipment.id_motorista)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Auxiliar</p>
              <p>{getUserName(shipment.id_auxiliar)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Fecha de Despacho</p>
              <p>{new Date(shipment.fecha_despacho).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Contado</p>
              <p>${shipment.total_contado.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total Crédito</p>
              <p>${shipment.total_credito.toFixed(2)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total General</p>
              <p className="font-bold">${shipment.total_general.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
         <CardHeader><CardTitle>Estado del Proceso</CardTitle></CardHeader>
         <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <StatusBadge checked={shipment.bodega} text="Bodega"/>
            <StatusBadge checked={shipment.reparto} text="Reparto"/>
            <StatusBadge checked={shipment.facturacion} text="Facturación"/>
            <StatusBadge checked={shipment.asist_admon} text="Asist. Admon."/>
            <StatusBadge checked={shipment.cobros} text="Cobros"/>
            <StatusBadge checked={shipment.gerente_admon} text="Gerente Admon."/>
         </CardContent>
      </Card>

      <div className="space-y-6">
        {renderInvoicesTable(fiscalCreditInvoices, "Facturación - Crédito Fiscal", "Facturas asociadas a clientes de tipo Crédito Fiscal.")}
        {renderInvoicesTable(finalConsumerInvoices, "Facturación - Consumidor Final", "Facturas asociadas a clientes de tipo Consumidor Final.")}
        {otherInvoices.length > 0 && renderInvoicesTable(otherInvoices, "Facturación - Otros", "Facturas sin un tipo de cliente especificado.")}
      </div>
    </div>
  )
}
