
'use client'

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as xlsx from "xlsx"
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
import { PlusCircle, Pencil, Trash2, Upload, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Esquema de validación para la factura usando Zod
const invoiceSchema = z.object({
  id_factura: z.string().min(1, "ID de factura es requerido."),
  code_customer: z.string().min(1, "El código de cliente es requerido."),
  customer_name: z.string().min(1, "El nombre del cliente es requerido."),
  invoice_number: z.preprocess(
    (val) => String(val),
    z.string().min(1, "El número de factura es requerido.")
  ),
  tax_id_number: z.preprocess(
    (val) => String(val),
    z.string().min(1, "El NIF es requerido.")
  ),
  subtotal: z.coerce.number(),
  total_sale: z.coerce.number(),
  grand_total: z.coerce.number(),
  payment: z.coerce.number(),
  net_to_pay: z.coerce.number(),
  term_description: z.string().min(1, "La descripción del término es requerida."),
  fecha: z.string().min(1, "La fecha es requerida."),
  state: z.preprocess(
      (val) => (String(val).toLowerCase() === 'pagada' || val === true),
      z.boolean()
  ),
  ruta: z.preprocess(
    (val) => String(val),
    z.string().min(1, "La ruta es requerida.")
  ),
})

// Tipo inferido del esquema de Zod. 'state' en la BD es booleano.
type Invoice = Omit<z.infer<typeof invoiceSchema>, 'state' | 'invoice_number' | 'tax_id_number' | 'ruta'> & { 
  state: boolean,
  invoice_number: string | number,
  tax_id_number: string | number,
  ruta: string | number,
}
type Customer = { code_customer: string, customer_name: string, ruta: string | number, id_term: number }
type PaymentTerm = { id_term: number, term_desc: string }

// Opciones disponibles para el estado de la factura en el UI
const statusOptions = ["Pagada", "Pendiente"]
const ITEMS_PER_PAGE = 10;

export default function InvoicingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Configuración del formulario con react-hook-form y Zod
  const form = useForm<z.infer<typeof invoiceSchema>>({
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
      fecha: new Date().toISOString().split('T')[0], // Establece la fecha actual por defecto
      state: false,
      ruta: "",
    },
  })
  
  useEffect(() => {
    fetchInvoices()
    fetchCustomers()
    fetchPaymentTerms()
  }, [])
  
  useEffect(() => {
    if (editingInvoice) {
      form.reset({
          ...editingInvoice,
          invoice_number: String(editingInvoice.invoice_number),
          tax_id_number: String(editingInvoice.tax_id_number),
          ruta: String(editingInvoice.ruta),
          fecha: editingInvoice.fecha ? new Date(editingInvoice.fecha).toISOString().split('T')[0] : '',
          state: editingInvoice.state
      });
    } else {
      form.reset({
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
        fecha: new Date().toISOString().split('T')[0],
        state: false,
        ruta: "",
      });
    }
  }, [editingInvoice, form]);

  const fetchInvoices = async () => {
    const { data, error } = await supabase.from('facturacion').select('*')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas.", variant: "destructive" })
    } else {
      setInvoices(data as Invoice[])
    }
  }

  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customer').select('code_customer, customer_name, ruta, id_term')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los clientes.", variant: "destructive" })
    } else {
      setCustomers(data as Customer[])
    }
  }
  
  const fetchPaymentTerms = async () => {
    const { data, error } = await supabase.from('terminos_pago').select('id_term, term_desc')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los términos de pago.", variant: "destructive" })
    } else {
      setPaymentTerms(data as PaymentTerm[])
    }
  }

  // Función para manejar el envío del formulario
  const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
    let error;

    const dataToSubmit = {
        ...values
    };

    if (editingInvoice) {
      const { error: updateError } = await supabase
        .from('facturacion')
        .update(dataToSubmit)
        .eq('id_factura', editingInvoice.id_factura)
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('facturacion')
        .insert([dataToSubmit])
      error = insertError;
    }

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Éxito", description: `Factura ${editingInvoice ? 'actualizada' : 'creada'} correctamente.` })
      fetchInvoices()
      handleCloseDialog()
    }
  }
  
  const handleDelete = async (invoiceId: string) => {
    const { error } = await supabase
      .from('facturacion')
      .delete()
      .eq('id_factura', invoiceId)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar la factura porque está asociada a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar la factura.",
          variant: "destructive",
        })
      }
    } else {
      toast({ title: "Éxito", description: "Factura eliminada correctamente." })
      fetchInvoices()
    }
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingInvoice(null);
    }
  };
  
  const handleCloseDialog = () => {
    setEditingInvoice(null);
    form.reset();
    setIsDialogOpen(false);
  }

  const handleCustomerChange = (code: string) => {
    const customer = customers.find(c => c.code_customer === code);
    if (customer) {
      form.setValue('customer_name', customer.customer_name);
      form.setValue('ruta', String(customer.ruta || ''));
      const term = paymentTerms.find(t => t.id_term === customer.id_term);
      if (term) {
        form.setValue('term_description', term.term_desc);
      }
    }
  }

  const getStatusLabel = (status: boolean): "Pagada" | "Pendiente" => {
    return status ? "Pagada" : "Pendiente";
  };

  // Función para obtener la variante del Badge según el estado
  const getBadgeVariant = (status: "Pagada" | "Pendiente") => {
    switch (status) {
      case "Pagada":
        return "default"
      case "Pendiente":
        return "secondary"
      default:
        return "outline"
    }
  }
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = xlsx.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            if (json.length < 2) {
                toast({ title: "Error", description: "El archivo Excel está vacío o no tiene datos.", variant: "destructive" });
                return;
            }

            const header = (json[0] as string[]).map(h => h.toLowerCase().trim());
            const dataRows = json.slice(1);
            
            const colIndices = {
              invoice_number: header.indexOf('invoice number'),
              transaction_date: header.indexOf('transaction date'),
              tax_id_number: header.indexOf('tax id number'),
              subtotal: header.indexOf('subtotal'),
              total_sale: header.indexOf('total sales tax'),
              grand_total: header.indexOf('grand total'),
              payment: header.indexOf('payment total'),
              net_to_pay: header.indexOf('net to pay'),
              id_factura: header.indexOf('your reference'),
              code_customer: header.indexOf('code')
            };

            const customerMap = new Map(customers.map(c => [String(c.code_customer).trim(), c]));
            const paymentTermMap = new Map(paymentTerms.map(pt => [pt.id_term, pt.term_desc]));

            const mappedDataPromises = dataRows.map(async (row) => {
                const getDate = (dateValue: any) => {
                  if (!dateValue) return new Date().toISOString().split('T')[0];
                  const date = new Date(dateValue);
                  return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
                };

                const getNumericValue = (value: any): number => {
                    if (typeof value === 'string' && value.toUpperCase() === 'N/A') {
                        return 0;
                    }
                    const num = parseFloat(String(value));
                    return isNaN(num) ? 0 : num;
                };

                const code_customer = String(row[colIndices.code_customer]).trim();
                if (!code_customer) return null;

                const customer = customerMap.get(code_customer);

                if (!customer) {
                  console.warn(`Cliente con código ${code_customer} no encontrado. Se omitirá esta fila.`);
                  return null;
                }

                const term_description = paymentTermMap.get(customer.id_term) || "";
                
                const taxIdValue = String(row[colIndices.tax_id_number]).trim();


                return {
                    invoice_number: String(row[colIndices.invoice_number]),
                    fecha: getDate(row[colIndices.transaction_date]),
                    customer_name: customer.customer_name,
                    tax_id_number: (taxIdValue.toUpperCase() === 'N/A' || taxIdValue === '') ? '0' : taxIdValue,
                    subtotal: getNumericValue(row[colIndices.subtotal]),
                    total_sale: getNumericValue(row[colIndices.total_sale]),
                    grand_total: getNumericValue(row[colIndices.grand_total]),
                    payment: getNumericValue(row[colIndices.payment]),
                    net_to_pay: getNumericValue(row[colIndices.net_to_pay]),
                    ruta: String(customer.ruta),
                    term_description: term_description,
                    id_factura: String(row[colIndices.id_factura]),
                    code_customer: code_customer,
                    state: false, 
                };
            });

            const mappedData = (await Promise.all(mappedDataPromises)).filter(d => d && d.id_factura);
            
            // Filtra los duplicados basándose en id_factura.
            const uniqueMappedData = Array.from(new Map(mappedData.map(item => [item.id_factura, item])).values());

            if(uniqueMappedData.length === 0) {
              toast({ title: "Advertencia", description: "No se encontraron filas válidas o únicas para importar. Verifica los códigos de cliente y los ID de factura.", variant: "destructive" });
              if(event.target) event.target.value = '';
              return;
            }

            const validatedInvoices = z.array(invoiceSchema).safeParse(uniqueMappedData);
            
            if (!validatedInvoices.success) {
                console.error("Error de validación Zod:", validatedInvoices.error.flatten());
                const errorMessage = validatedInvoices.error.issues
                    .map(issue => `Fila ${Number(issue.path[0]) + 2}: En columna '${issue.path[1]}', ${issue.message}`)
                    .join(' | ');

                toast({
                    title: "Error de validación",
                    description: errorMessage || "Algunos datos del archivo Excel no son correctos o están incompletos.",
                    variant: "destructive",
                    duration: 9000,
                });
                if(event.target) event.target.value = '';
                return;
            }

            const { error: insertError } = await supabase.from('facturacion').upsert(validatedInvoices.data, {
              onConflict: 'id_factura'
            });

            if (insertError) {
                toast({ title: "Error al importar", description: insertError.message, variant: "destructive" });
            } else {
                toast({ title: "Éxito", description: `${validatedInvoices.data.length} facturas importadas/actualizadas correctamente.` });
                fetchInvoices();
            }
        } catch (error) {
            console.error("Error al procesar el archivo:", error);
            toast({ title: "Error", description: "No se pudo procesar el archivo Excel.", variant: "destructive" });
        }
        if(event.target) event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };
  
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const getPaginationNumbers = () => {
    const pages = [];
    const totalVisiblePages = 5;
    if (totalPages <= totalVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Facturación</CardTitle>
            <CardDescription>Cree y visualice facturas.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleImportClick} variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Importar desde Excel
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls"
            />
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingInvoice(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Factura
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingInvoice ? 'Editar Factura' : 'Crear Nueva Factura'}</DialogTitle>
                <DialogDescription>
                  {editingInvoice ? 'Modifique los detalles de la factura.' : 'Complete todos los campos para generar una nueva factura.'}
                </DialogDescription>
              </DialogHeader>
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
                            <Input placeholder="Ej: FACT-003" {...field} disabled={!!editingInvoice} />
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
                          <FormLabel>Código Cliente</FormLabel>
                          <Select onValueChange={(value) => { field.onChange(value); handleCustomerChange(value); }} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer) => (
                                <SelectItem key={customer.code_customer} value={customer.code_customer}>
                                  {customer.code_customer} - {customer.customer_name}
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
                          <FormLabel>Nombre Cliente</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Juan Pérez" {...field} readOnly />
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
                          <FormLabel>Número Factura</FormLabel>
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
                          <FormLabel>NIF</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: 12345678A" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="ruta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ruta</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Ruta 5" {...field} readOnly />
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
                          <FormLabel>Venta Total</FormLabel>
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
                          <FormLabel>Total General</FormLabel>
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
                          <FormLabel>Pago</FormLabel>
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
                          <FormLabel>Neto a Pagar</FormLabel>
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
                          <FormLabel>Descripción Término</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Pago a 30 días" {...field} readOnly/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fecha"
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
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estado</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === 'Pagada')} value={getStatusLabel(field.value)}>
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
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingInvoice ? 'Guardar Cambios' : 'Guardar Factura'}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Factura</TableHead>
                <TableHead>No. Factura</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Venta Total</TableHead>
                <TableHead>Total General</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Neto a Pagar</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.map((invoice) => {
                const statusLabel = getStatusLabel(invoice.state);
                return (
                  <TableRow key={invoice.id_factura}>
                    <TableCell className="font-medium">{invoice.id_factura}</TableCell>
                    <TableCell>{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.tax_id_number}</TableCell>
                    <TableCell>{invoice.ruta}</TableCell>
                    <TableCell>${invoice.subtotal.toFixed(2)}</TableCell>
                    <TableCell>${invoice.total_sale.toFixed(2)}</TableCell>
                    <TableCell>${invoice.grand_total.toFixed(2)}</TableCell>
                    <TableCell>${invoice.payment.toFixed(2)}</TableCell>
                    <TableCell>${invoice.net_to_pay.toFixed(2)}</TableCell>
                    <TableCell>{invoice.term_description}</TableCell>
                    <TableCell>{new Date(invoice.fecha).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant={getBadgeVariant(statusLabel)}>{statusLabel}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(invoice)}>
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
                                Esta acción no se puede deshacer. Esto eliminará permanentemente la factura.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(invoice.id_factura)}>
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{paginatedInvoices.length}</strong> de <strong>{invoices.length}</strong> facturas.
        </div>
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
            >
                <span className="sr-only">Primera página</span>
                <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                <span className="sr-only">Página anterior</span>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
                {getPaginationNumbers().map((page, index) =>
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={currentPage === page ? 'default' : 'outline'}
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={index} className="px-1.5">...</span>
                    )
                )}
            </div>
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
            >
                <span className="sr-only">Siguiente página</span>
                <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
            >
                <span className="sr-only">Última página</span>
                <ChevronsRight className="h-4 w-4" />
            </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Página <strong>{currentPage}</strong> de <strong>{totalPages || 1}</strong>
        </div>
      </CardFooter>
    </Card>
  )
}
