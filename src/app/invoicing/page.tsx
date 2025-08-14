
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

const invoiceSchema = z.object({
  id_factura: z.string().min(1, "ID de factura es requerido."),
  code_customer: z.string().min(1, "El cliente es requerido."),
  nombre_customer: z.string(),
  invoice_number: z.string().min(1, "El número de factura es requerido."),
  tax_id_number: z.string().min(1, "El NIF es requerido."),
  subtotal: z.coerce.number().min(0, "Subtotal debe ser positivo."),
  total_sale: z.coerce.number().min(0, "Venta total debe ser positivo."),
  grand_total: z.coerce.number().min(0, "Total general debe ser positivo."),
  payment: z.coerce.number().min(0, "El pago debe ser positivo."),
  net_to_pay: z.coerce.number().min(0, "Neto a pagar debe ser positivo."),
  term_description: z.string().min(1, "La descripción del término es requerida."),
  your_reference: z.string().optional(),
  date: z.string().min(1, "La fecha es requerida."),
  estado: z.enum(["Pagada", "Pendiente", "Vencida"]),
})

type Invoice = z.infer<typeof invoiceSchema>

// Mock data, in a real app this would come from a database or API
const initialCustomers = [
  { code: "C001", name: "Juan Pérez", taxCode: "JP123", paymentTermId: "Neto-30", routeNumber: "Ruta-Norte", geofence: "Zona A" },
  { code: "C002", name: "Maria García", taxCode: "MG456", paymentTermId: "Pago-Inmediato", routeNumber: "Ruta-Sur", geofence: "Zona B" },
]

const initialInvoices: Invoice[] = [
  {
    id_factura: "FACT-001",
    code_customer: "C001",
    nombre_customer: "Juan Pérez",
    invoice_number: "INV-2024-001",
    tax_id_number: "JP123",
    subtotal: 1000,
    total_sale: 1210,
    grand_total: 1210,
    payment: 1210,
    net_to_pay: 0,
    term_description: "Pago requerido en 30 días.",
    your_reference: "REF-A",
    date: "2024-07-28",
    estado: "Pagada",
  },
  {
    id_factura: "FACT-002",
    code_customer: "C002",
    nombre_customer: "Maria García",
    invoice_number: "INV-2024-002",
    tax_id_number: "MG456",
    subtotal: 800,
    total_sale: 968,
    grand_total: 968,
    payment: 0,
    net_to_pay: 968,
    term_description: "Pago requerido al momento de la entrega.",
    your_reference: "REF-B",
    date: "2024-07-27",
    estado: "Pendiente",
  },
]

const statusOptions: Invoice['estado'][] = ["Pagada", "Pendiente", "Vencida"]

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      id_factura: "",
      code_customer: "",
      nombre_customer: "",
      invoice_number: "",
      tax_id_number: "",
      subtotal: 0,
      total_sale: 0,
      grand_total: 0,
      payment: 0,
      net_to_pay: 0,
      term_description: "",
      your_reference: "",
      date: new Date().toISOString().split('T')[0],
      estado: "Pendiente",
    },
  })

  const onSubmit = (values: Invoice) => {
    const selectedCustomer = initialCustomers.find(c => c.code === values.code_customer)
    const finalValues = { ...values, nombre_customer: selectedCustomer?.name || '' }
    setInvoices([...invoices, finalValues])
    form.reset()
    setIsDialogOpen(false)
  }

  const handleCustomerChange = (customerCode: string) => {
    const customer = initialCustomers.find(c => c.code === customerCode)
    if (customer) {
      form.setValue("code_customer", customer.code)
      form.setValue("nombre_customer", customer.name)
      form.setValue("tax_id_number", customer.taxCode)
    }
  }

  const getBadgeVariant = (status: Invoice['estado']) => {
    switch (status) {
      case "Pagada":
        return "default"
      case "Pendiente":
        return "secondary"
      case "Vencida":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Facturación</CardTitle>
            <CardDescription>Cree y visualice facturas.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Factura</DialogTitle>
                <DialogDescription>
                  Complete todos los campos para generar una nueva factura.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="id_factura" render={({ field }) => ( <FormItem> <FormLabel>ID Factura</FormLabel> <FormControl> <Input placeholder="Ej: FACT-003" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="invoice_number" render={({ field }) => ( <FormItem> <FormLabel>Número de Factura</FormLabel> <FormControl> <Input placeholder="Ej: INV-2024-003" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="code_customer" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); handleCustomerChange(value); }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {initialCustomers.map((customer) => ( <SelectItem key={customer.code} value={customer.code}> {customer.name} ({customer.code}) </SelectItem> ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="tax_id_number" render={({ field }) => ( <FormItem> <FormLabel>NIF</FormLabel> <FormControl> <Input {...field} readOnly /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="date" render={({ field }) => ( <FormItem> <FormLabel>Fecha</FormLabel> <FormControl> <Input type="date" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="subtotal" render={({ field }) => ( <FormItem> <FormLabel>Subtotal</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="total_sale" render={({ field }) => ( <FormItem> <FormLabel>Venta Total</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="grand_total" render={({ field }) => ( <FormItem> <FormLabel>Total General</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="payment" render={({ field }) => ( <FormItem> <FormLabel>Pago</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="net_to_pay" render={({ field }) => ( <FormItem> <FormLabel>Neto a Pagar</FormLabel> <FormControl> <Input type="number" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="term_description" render={({ field }) => ( <FormItem> <FormLabel>Descripción Término</FormLabel> <FormControl> <Input placeholder="Ej: Pago a 30 días" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                    <FormField control={form.control} name="your_reference" render={({ field }) => ( <FormItem> <FormLabel>Su Referencia</FormLabel> <FormControl> <Input placeholder="Ej: PO-123" {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                     <FormField control={form.control} name="estado" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((status) => ( <SelectItem key={status} value={status}> {status} </SelectItem> ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Factura</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id_factura}>
                <TableCell className="font-medium">{invoice.id_factura}</TableCell>
                <TableCell>{invoice.nombre_customer}</TableCell>
                <TableCell>{invoice.date}</TableCell>
                <TableCell>${invoice.grand_total.toFixed(2)}</TableCell>
                <TableCell><Badge variant={getBadgeVariant(invoice.estado)}>{invoice.estado}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{invoices.length}</strong> de <strong>{invoices.length}</strong> facturas.
        </div>
      </CardFooter>
    </Card>
  )
}

    