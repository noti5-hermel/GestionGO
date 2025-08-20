

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
}

type User = { id_user: string; name: string }
type Route = { id_ruta: string; ruta_desc: string }
type Invoice = { id_factura: string, invoice_number: string | number }

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
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true)
      
      // Parallel data fetching
      const [
        shipmentRes,
        invoicesRes,
        usersRes,
        routesRes,
        allInvoicesRes
      ] = await Promise.all([
        supabase.from('despacho').select('*').eq('id_despacho', id).single(),
        supabase.from('facturacion_x_despacho').select('*').eq('id_despacho', id),
        supabase.from('usuario').select('id_user, name'),
        supabase.from('rutas').select('id_ruta, ruta_desc'),
        supabase.from('facturacion').select('id_factura, invoice_number')
      ]);

      if (shipmentRes.error) {
        toast({ title: "Error", description: "No se pudo cargar el despacho.", variant: "destructive" })
      } else {
        setShipment(shipmentRes.data as Shipment)
      }

      if (invoicesRes.error) {
        toast({ title: "Error", description: "No se pudieron cargar las facturas asociadas.", variant: "destructive" })
      } else {
        setInvoices(invoicesRes.data as ShipmentInvoice[])
      }

      if (usersRes.error) {
        toast({ title: "Error", description: "No se pudieron cargar los usuarios.", variant: "destructive" })
      } else {
        setUsers(usersRes.data as User[])
      }

      if (routesRes.error) {
        toast({ title: "Error", description: "No se pudieron cargar las rutas.", variant: "destructive" })
      } else {
        setRoutes(routesRes.data as Route[])
      }

      if (allInvoicesRes.error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos de facturas.", variant: "destructive" })
      } else {
        setAllInvoices(allInvoicesRes.data as Invoice[])
      }

      setLoading(false)
    }

    fetchData()
  }, [id, toast])

  const getRouteDescription = (routeId: string) => routes.find(route => String(route.id_ruta) === String(routeId))?.ruta_desc || routeId
  const getUserName = (userId: string) => users.find(user => String(user.id_user) === String(userId))?.name || userId
  const getInvoiceNumber = (invoiceId: string) => allInvoices.find(inv => inv.id_factura === invoiceId)?.invoice_number || invoiceId
  const getStatusLabel = (status: boolean) => status ? "Pagado" : "Pendiente"
  const getBadgeVariant = (status: boolean) => status ? "default" : "secondary"

  if (loading) {
    return <p>Cargando detalles del despacho...</p>
  }

  if (!shipment) {
    return <p>Despacho no encontrado.</p>
  }

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
          <Card className="mt-6">
             <CardHeader><CardTitle>Estado del Proceso</CardTitle></CardHeader>
             <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatusBadge checked={shipment.bodega} text="Bodega"/>
                <StatusBadge checked={shipment.reparto} text="Reparto"/>
                <StatusBadge checked={shipment.facturacion} text="Facturación"/>
                <StatusBadge checked={shipment.asist_admon} text="Asist. Admon."/>
                <StatusBadge checked={shipment.cobros} text="Cobros"/>
                <StatusBadge checked={shipment.gerente_admon} text="Gerente Admon."/>
             </CardContent>
          </Card>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturación Asociada</CardTitle>
          <CardDescription>
            Facturas que han sido procesadas en este despacho.
          </CardDescription>
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
              {invoices.length > 0 ? invoices.map((invoice) => (
                <TableRow key={invoice.id_fac_desp}>
                  <TableCell className="font-medium">{getInvoiceNumber(invoice.id_factura)}</TableCell>
                  <TableCell>{invoice.comprobante}</TableCell>
                  <TableCell>{invoice.forma_pago}</TableCell>
                  <TableCell>${invoice.monto.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={getBadgeVariant(invoice.state)}>{getStatusLabel(invoice.state)}</Badge></TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center">No hay facturas asociadas a este despacho.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
            <div className="text-xs text-muted-foreground">
                Mostrando <strong>{invoices.length}</strong> de <strong>{invoices.length}</strong> facturas.
            </div>
        </CardFooter>
      </Card>
    </div>
  )
}
