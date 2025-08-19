

'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const shipmentInvoiceSchema = z.object({
  id_factura: z.string().min(1, "El ID de factura es requerido."),
  id_despacho: z.preprocess(
    (val) => String(val),
    z.string().min(1, "El ID de despacho es requerido.")
  ),
  comprobante: z.string().min(1, "El comprobante es requerido."),
  forma_pago: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
  monto: z.coerce.number().min(0, "El monto debe ser un número positivo."),
  state: z.boolean(),
})

type ShipmentInvoice = z.infer<typeof shipmentInvoiceSchema> & { id_fac_desp: number }
type Invoice = { id_factura: string, invoice_number: string | number }
type Shipment = { id_despacho: number, fecha_despacho: string }

const paymentMethods: ShipmentInvoice['forma_pago'][] = ["Efectivo", "Tarjeta", "Transferencia"];

const statusOptions: { label: string; value: boolean }[] = [
  { label: "Pagado", value: true },
  { label: "Pendiente", value: false },
]

export default function ShipmentInvoicingPage() {
  const [shipmentInvoices, setShipmentInvoices] = useState<ShipmentInvoice[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShipmentInvoice, setEditingShipmentInvoice] = useState<ShipmentInvoice | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof shipmentInvoiceSchema>>({
    resolver: zodResolver(shipmentInvoiceSchema),
    defaultValues: {
      id_factura: "",
      id_despacho: "",
      comprobante: "",
      forma_pago: "Efectivo",
      monto: 0,
      state: false,
    },
  })
  
  useEffect(() => {
    fetchShipmentInvoices()
    fetchInvoices()
    fetchShipments()
  }, [])

  useEffect(() => {
    if (editingShipmentInvoice) {
      form.reset({
        ...editingShipmentInvoice,
        id_despacho: String(editingShipmentInvoice.id_despacho),
      })
    } else {
      form.reset({
        id_factura: "",
        id_despacho: "",
        comprobante: "",
        forma_pago: "Efectivo",
        monto: 0,
        state: false,
      })
    }
  }, [editingShipmentInvoice, form])

  const fetchShipmentInvoices = async () => {
    const { data, error } = await supabase.from('facturacion_x_despacho').select('*')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los registros.", variant: "destructive" })
    } else {
      setShipmentInvoices(data as ShipmentInvoice[])
    }
  }
  
  const fetchInvoices = async () => {
    const { data, error } = await supabase.from('facturacion').select('id_factura, invoice_number')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas.", variant: "destructive" })
    } else {
      setInvoices(data as Invoice[])
    }
  }
  
  const fetchShipments = async () => {
    const { data, error } = await supabase.from('despacho').select('id_despacho, fecha_despacho')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los despachos.", variant: "destructive" })
    } else {
      setShipments(data as Shipment[])
    }
  }

  const onSubmit = async (values: z.infer<typeof shipmentInvoiceSchema>) => {
    let error;

    const dataToSubmit = {
      ...values,
      id_despacho: parseInt(String(values.id_despacho), 10)
    };

    if (editingShipmentInvoice) {
      const { error: updateError } = await supabase
        .from('facturacion_x_despacho')
        .update(dataToSubmit)
        .eq('id_fac_desp', editingShipmentInvoice.id_fac_desp)
        .select()
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('facturacion_x_despacho')
        .insert([dataToSubmit])
        .select()
      error = insertError;
    }

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Éxito", description: `Registro ${editingShipmentInvoice ? 'actualizado' : 'creado'} correctamente.` })
      fetchShipmentInvoices()
      handleCloseDialog()
    }
  }

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from('facturacion_x_despacho')
      .delete()
      .eq('id_fac_desp', id)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el registro porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el registro.",
          variant: "destructive",
        })
      }
    } else {
      toast({ title: "Éxito", description: "Registro eliminado correctamente." })
      fetchShipmentInvoices()
    }
  }

  const handleEdit = (shipmentInvoice: ShipmentInvoice) => {
    setEditingShipmentInvoice(shipmentInvoice);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingShipmentInvoice(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingShipmentInvoice(null);
    form.reset()
    setIsDialogOpen(false)
  }
  
  const getBadgeVariant = (status: boolean) => {
    return status ? "default" : "secondary"
  }

  const getStatusLabel = (status: boolean) => {
    return status ? "Pagado" : "Pendiente"
  }
  
  const getInvoiceNumber = (invoiceId: string) => {
    return invoices.find(inv => inv.id_factura === invoiceId)?.invoice_number || invoiceId;
  }

  const getShipmentDate = (shipmentId: string | number) => {
      const id = typeof shipmentId === 'string' ? parseInt(shipmentId, 10) : shipmentId;
      const shipment = shipments.find(ship => ship.id_despacho === id);
      return shipment ? new Date(shipment.fecha_despacho).toLocaleDateString() : shipmentId;
  }


  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Facturación por Despacho</CardTitle>
            <CardDescription>Gestione las facturas asociadas a cada despacho.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
               <Button onClick={() => { setEditingShipmentInvoice(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Facturación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingShipmentInvoice ? 'Editar' : 'Añadir'} Facturación por Despacho</DialogTitle>
                <DialogDescription>
                  Complete los campos para registrar una nueva facturación.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id_factura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Factura</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione una factura" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {invoices.map((invoice) => (
                                    <SelectItem key={invoice.id_factura} value={invoice.id_factura}>
                                        {invoice.invoice_number}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="id_despacho"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Despacho</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un despacho" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {shipments.map((shipment) => (
                                    <SelectItem key={shipment.id_despacho} value={String(shipment.id_despacho)}>
                                        ID: {shipment.id_despacho} - Fecha: {new Date(shipment.fecha_despacho).toLocaleDateString()}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="comprobante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comprobante</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: C-789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="forma_pago"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una forma de pago" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="monto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === 'true')}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.label} value={String(option.value)}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingShipmentInvoice ? 'Guardar Cambios' : 'Guardar'}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Factura</TableHead>
                <TableHead>Fecha Despacho</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipmentInvoices.map((shipmentInvoice) => (
                <TableRow key={shipmentInvoice.id_fac_desp}>
                  <TableCell className="font-medium">{getInvoiceNumber(shipmentInvoice.id_factura)}</TableCell>
                  <TableCell>{getShipmentDate(shipmentInvoice.id_despacho)}</TableCell>
                  <TableCell>{shipmentInvoice.comprobante}</TableCell>
                  <TableCell>{shipmentInvoice.forma_pago}</TableCell>
                  <TableCell>${shipmentInvoice.monto.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={getBadgeVariant(shipmentInvoice.state)}>{getStatusLabel(shipmentInvoice.state)}</Badge></TableCell>
                   <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(shipmentInvoice)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el registro.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(shipmentInvoice.id_fac_desp)}>
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="pt-6">
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{shipmentInvoices.length}</strong> de <strong>{shipmentInvoices.length}</strong> registros.
        </div>
      </CardFooter>
    </Card>
  )
}
