
'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PlusCircle } from "lucide-react"

const shipmentInvoiceSchema = z.object({
  id: z.string().min(1, "El ID es requerido."),
  invoiceId: z.string().min(1, "El ID de factura es requerido."),
  shipmentId: z.string().min(1, "El ID de despacho es requerido."),
  voucher: z.string().min(1, "El comprobante es requerido."),
  paymentMethod: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
  amount: z.coerce.number().min(0, "El monto debe ser un número positivo."),
  status: z.boolean(),
})

type ShipmentInvoice = z.infer<typeof shipmentInvoiceSchema>

const initialData: ShipmentInvoice[] = [
  { id: "SI-001", invoiceId: "FACT-001", shipmentId: "DS-001", voucher: "C-123", paymentMethod: "Efectivo", amount: 700, status: true },
  { id: "SI-002", invoiceId: "FACT-002", shipmentId: "DS-002", voucher: "C-456", paymentMethod: "Tarjeta", amount: 900, status: false },
]

const paymentMethods: ShipmentInvoice['paymentMethod'][] = ["Efectivo", "Tarjeta", "Transferencia"];

const statusOptions: { label: string; value: boolean }[] = [
  { label: "Pagado", value: true },
  { label: "Pendiente", value: false },
]

export default function ShipmentInvoicingPage() {
  const [invoices, setInvoices] = useState<ShipmentInvoice[]>(initialData)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const form = useForm<ShipmentInvoice>({
    resolver: zodResolver(shipmentInvoiceSchema),
    defaultValues: {
      id: "",
      invoiceId: "",
      shipmentId: "",
      voucher: "",
      paymentMethod: "Efectivo",
      amount: 0,
      status: false,
    },
  })

  const onSubmit = (values: ShipmentInvoice) => {
    setInvoices([...invoices, values])
    form.reset()
    setIsDialogOpen(false)
  }
  
  const getBadgeVariant = (status: boolean) => {
    return status ? "default" : "secondary"
  }

  const getStatusLabel = (status: boolean) => {
    return status ? "Pagado" : "Pendiente"
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Facturación por Despacho</CardTitle>
            <CardDescription>Gestione las facturas asociadas a cada despacho.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Facturación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nueva Facturación por Despacho</DialogTitle>
                <DialogDescription>
                  Complete los campos para registrar una nueva facturación.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Facturación x Despacho</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: SI-003" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="invoiceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Factura</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: FACT-003" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="shipmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Despacho</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: DS-003" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="voucher"
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
                    name="paymentMethod"
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
                    name="amount"
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
                    name="status"
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
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar</Button>
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
                <TableHead>ID</TableHead>
                <TableHead>ID Factura</TableHead>
                <TableHead>ID Despacho</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.invoiceId}</TableCell>
                  <TableCell>{invoice.shipmentId}</TableCell>
                  <TableCell>{invoice.voucher}</TableCell>
                  <TableCell>{invoice.paymentMethod}</TableCell>
                  <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={getBadgeVariant(invoice.status)}>{getStatusLabel(invoice.status)}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="pt-6">
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{invoices.length}</strong> de <strong>{invoices.length}</strong> registros.
        </div>
      </CardFooter>
    </Card>
  )
}
