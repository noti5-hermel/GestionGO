
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

// Esquema de validación para la factura usando Zod
const invoiceSchema = z.object({
  id_factura: z.string().min(1, "ID de factura es requerido."),
  code_customer: z.string().min(1, "El código de cliente es requerido."),
  customer_name: z.string().min(1, "El nombre del cliente es requerido."),
  invoice_number: z.string().min(1, "El número de factura es requerido."),
  tax_id_number: z.string().min(1, "El NIF es requerido."),
  subtotal: z.coerce.number().min(0, "Subtotal debe ser positivo."),
  total_sale: z.coerce.number().min(0, "Venta total debe ser positivo."),
  grand_total: z.coerce.number().min(0, "Total general debe ser positivo."),
  payment: z.coerce.number().min(0, "El pago debe ser positivo."),
  net_to_pay: z.coerce.number().min(0, "Neto a pagar debe ser positivo."),
  term_description: z.string().min(1, "La descripción del término es requerida."),
  date: z.string().min(1, "La fecha es requerida."),
  estado: z.enum(["Pagada", "Pendiente", "Vencida"]),
})

// Tipo inferido del esquema de Zod
type Invoice = z.infer<typeof invoiceSchema>

// Datos de facturas iniciales
const initialInvoices: Invoice[] = [
  {
    id_factura: "FACT-001",
    code_customer: "C001",
    customer_name: "Juan Pérez",
    invoice_number: "INV-2024-001",
    tax_id_number: "JP123",
    subtotal: 1000,
    total_sale: 1210,
    grand_total: 1210,
    payment: 1210,
    net_to_pay: 0,
    term_description: "Pago requerido en 30 días.",
    date: "2024-07-28",
    estado: "Pagada",
  },
  {
    id_factura: "FACT-002",
    code_customer: "C002",
    customer_name: "Maria García",
    invoice_number: "INV-2024-002",
    tax_id_number: "MG456",
    subtotal: 800,
    total_sale: 968,
    grand_total: 968,
    payment: 0,
    net_to_pay: 968,
    term_description: "Pago requerido al momento de la entrega.",
    date: "2024-07-27",
    estado: "Pendiente",
  },
]

// Opciones disponibles para el estado de la factura
const statusOptions: Invoice['estado'][] = ["Pagada", "Pendiente", "Vencida"]

const customers = [
    { code: "C001", name: "Juan Pérez" },
    { code: "C002", name: "Maria García" },
]

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Configuración del formulario con react-hook-form y Zod
  const form = useForm<Invoice>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      id_factura: "",
      code_customer: "",
      customer_name: "",
      invoice_number: "",
      tax_id_number: "",
      subtotal: 0,
      total_sale: 0,
      grand_total: 0,
      payment: 0,
      net_to_pay: 0,
      term_description: "",
      date: new Date().toISOString().split('T')[0], // Establece la fecha actual por defecto
      estado: "Pendiente",
    },
  })

  // Función para manejar el envío del formulario
  const onSubmit = (values: Invoice) => {
    setInvoices([...invoices, values]) // Agrega la nueva factura al estado
    form.reset() // Resetea el formulario
    setIsDialogOpen(false) // Cierra el diálogo
  }

  // Función para obtener la variante del Badge según el estado
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
          {/* Diálogo para crear una nueva factura */}
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
              {/* Formulario de creación de factura */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="id_factura"
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
                      name="code_customer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code Customer</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.code} value={customer.code}>
                                  {customer.code} - {customer.name}
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
                      name="customer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Juan Pérez" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="invoice_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invoice Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: INV-2024-003" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="tax_id_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: 12345678A" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subtotal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subtotal</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_sale"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Sale</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="grand_total"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grand Total</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="payment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="net_to_pay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Net to Pay</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="term_description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Term Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Pago a 30 días" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un estado" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statusOptions.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
              <TableHead>Invoice Number</TableHead>
              <TableHead>Tax Number</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>Total Sale</TableHead>
              <TableHead>Grand Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Net to Pay</TableHead>
              <TableHead>Term Description</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id_factura}>
                <TableCell className="font-medium">{invoice.id_factura}</TableCell>
                <TableCell>{invoice.invoice_number}</TableCell>
                <TableCell>{invoice.tax_id_number}</TableCell>
                <TableCell>${invoice.subtotal.toFixed(2)}</TableCell>
                <TableCell>${invoice.total_sale.toFixed(2)}</TableCell>
                <TableCell>${invoice.grand_total.toFixed(2)}</TableCell>
                <TableCell>${invoice.payment.toFixed(2)}</TableCell>
                <TableCell>${invoice.net_to_pay.toFixed(2)}</TableCell>
                <TableCell>{invoice.term_description}</TableCell>
                <TableCell>{invoice.date}</TableCell>
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
