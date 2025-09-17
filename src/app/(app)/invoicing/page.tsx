
'use client'

import { useState, useEffect, useRef, useCallback } from "react"
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
import { PlusCircle, Pencil, Trash2, Upload, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Search, FilterX } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"

/**
 * @file invoicing/page.tsx
 * @description Página para la gestión completa (CRUD) de facturas.
 * Permite crear, editar, eliminar, buscar y filtrar facturas.
 * Incluye importación masiva desde Excel y paginación del lado del servidor para un rendimiento óptimo.
 */

// Esquema de validación para la factura usando Zod.
// Se ajusta a la nueva estructura de la base de datos.
const invoiceSchema = z.object({
  id_factura: z.preprocess(
    (val) => String(val),
    z.string().min(1, "El número de factura es requerido.")
  ),
  reference_number: z.preprocess(
    (val) => String(val),
    z.string().min(1, "La referencia es requerida.")
  ),
  code_customer: z.string().min(1, "El código de cliente es requerido."),
  customer_name: z.string().min(1, "El nombre del cliente es requerido."),
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
  fecha_import: z.string().optional(),
  state: z.preprocess(
      (val) => (String(val).toLowerCase() === 'pagada' || val === true),
      z.boolean()
  ),
  ruta: z.preprocess(
    (val) => String(val),
    z.string().min(1, "La ruta es requerida.")
  ),
})

// Tipos de datos para la gestión de facturas.
type Invoice = Omit<z.infer<typeof invoiceSchema>, 'state' | 'id_factura' | 'reference_number' | 'tax_id_number' | 'ruta'> & { 
  state: boolean,
  id_factura: string | number,
  reference_number: string | number,
  tax_id_number: string | number,
  ruta: string | number,
  fecha_import?: string,
}
type Customer = { code_customer: string, customer_name: string, ruta: string | number, id_term: number }
type PaymentTerm = { id_term: number, term_desc: string }

// Opciones estáticas para la interfaz de usuario.
const statusOptions = ["Pagada", "Pendiente"]
const ITEMS_PER_PAGE = 10;

/**
 * Componente principal de la página de facturación.
 * Gestiona el estado, la lógica de negocio y la renderización de la interfaz.
 */
export default function InvoicingPage() {
  // --- ESTADOS ---
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS DE FILTRADO Y PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvoices, setTotalInvoices] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterImportDate, setFilterImportDate] = useState('');

  // --- FORMULARIO ---
  // Configuración del formulario con react-hook-form y Zod.
  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      id_factura: "",
      reference_number: "",
      code_customer: "",
      customer_name: "",
      tax_id_number: "",
      subtotal: 0,
      total_sale: 0,
      grand_total: 0,
      payment: 0,
      net_to_pay: 0,
      term_description: "",
      fecha: new Date().toISOString().split('T')[0], // Fecha actual por defecto.
      fecha_import: new Date().toISOString().split('T')[0],
      state: false,
      ruta: "",
    },
  })

  // --- LÓGICA DE DATOS ---

  /**
   * Obtiene la lista de facturas desde Supabase aplicando paginación y filtros del lado del servidor.
   * Se ejecuta cada vez que cambia la página, la búsqueda o el filtro de fecha.
   */
  const fetchInvoices = useCallback(async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('facturacion')
      .select('*', { count: 'exact' });

    // Aplica el filtro de búsqueda. Se convierte 'id_factura' a texto para poder usar 'ilike'.
    if (searchQuery) {
      query = query.or(`id_factura::text.ilike.%${searchQuery}%,reference_number::text.ilike.%${searchQuery}%,code_customer.ilike.%${searchQuery}%`);
    }

    // Aplica el filtro de fecha de entrega.
    if (filterDate) {
      query = query.eq('fecha', filterDate);
    }
    
    // Aplica el filtro de fecha de importación.
    if (filterImportDate) {
      query = query.eq('fecha_import', filterImportDate);
    }
    
    // Aplica el rango de paginación y ordena por fecha descendente.
    query = query.range(from, to).order('fecha', { ascending: false });

    const { data, error, count } = await query;
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas.", variant: "destructive" });
    } else {
      setInvoices(data as Invoice[]);
      setTotalInvoices(count ?? 0); // Actualiza el conteo total para la paginación.
    }
  }, [currentPage, searchQuery, filterDate, filterImportDate, toast]);
  
  /**
   * Efecto para cargar los datos estáticos (clientes, términos de pago) al montar el componente.
   */
  useEffect(() => {
    fetchCustomers()
    fetchPaymentTerms()
  }, [])
  
  /**
   * Efecto para obtener las facturas cada vez que los filtros o la página cambian.
   */
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  
  /**
   * Efecto que resetea el formulario y lo rellena si se está editando una factura.
   */
  useEffect(() => {
    if (editingInvoice) {
      form.reset({
          ...editingInvoice,
          id_factura: String(editingInvoice.id_factura),
          reference_number: String(editingInvoice.reference_number),
          tax_id_number: String(editingInvoice.tax_id_number),
          ruta: String(editingInvoice.ruta),
          fecha: editingInvoice.fecha ? new Date(editingInvoice.fecha).toISOString().split('T')[0] : '',
          state: editingInvoice.state
      });
    } else {
      form.reset({
        id_factura: "",
        reference_number: "",
        code_customer: "",
        customer_name: "",
        tax_id_number: "",
        subtotal: 0,
        total_sale: 0,
        grand_total: 0,
        payment: 0,
        net_to_pay: 0,
        term_description: "",
        fecha: new Date().toISOString().split('T')[0],
        fecha_import: new Date().toISOString().split('T')[0],
        state: false,
        ruta: "",
      });
    }
  }, [editingInvoice, form]);

  /** Obtiene la lista completa de clientes para el selector del formulario. */
  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customer').select('code_customer, customer_name, ruta, id_term')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los clientes.", variant: "destructive" })
    } else {
      setCustomers(data as Customer[])
    }
  }
  
  /** Obtiene la lista de términos de pago para el formulario. */
  const fetchPaymentTerms = async () => {
    const { data, error } = await supabase.from('terminos_pago').select('id_term, term_desc')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los términos de pago.", variant: "destructive" })
    } else {
      setPaymentTerms(data as PaymentTerm[])
    }
  }

  /**
   * Gestiona el envío del formulario para crear o actualizar una factura.
   * @param values Los datos del formulario validados por Zod.
   */
  const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
    let error;
    
    // Para nuevas facturas, se establece la fecha de importación.
    // Para facturas existentes, no se modifica.
    const dataToSubmit: Omit<typeof values, 'fecha_import'> & { fecha_import?: any } = { ...values };
    if (!editingInvoice) {
      dataToSubmit.fecha_import = 'now()';
    } else {
      delete dataToSubmit.fecha_import;
    }


    if (editingInvoice) {
      // Actualiza una factura existente.
      const { error: updateError } = await supabase
        .from('facturacion')
        .update(dataToSubmit)
        .eq('id_factura', editingInvoice.id_factura)
      error = updateError;
    } else {
      // Inserta una nueva factura.
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
  
  /**
   * Elimina una factura de la base de datos.
   * @param invoiceId El ID de la factura a eliminar.
   */
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

  /**
   * Procesa un archivo Excel para importar facturas masivamente.
   * Realiza una búsqueda individual de cada cliente para ser más eficiente.
   * @param event El evento del cambio del input de archivo.
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            // Lee y parsea el archivo Excel.
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
            
            // Mapea los nombres de las columnas del Excel a los campos de la base de datos.
            const colIndices = {
              id_factura: header.indexOf('invoice number'),
              reference_number: header.indexOf('your reference'),
              transaction_date: header.indexOf('transaction date'),
              tax_id_number: header.indexOf('tax id number'),
              subtotal: header.indexOf('subtotal'),
              total_sale: header.indexOf('total sales tax'),
              grand_total: header.indexOf('grand total'),
              payment: header.indexOf('payment total'),
              net_to_pay: header.indexOf('net to pay'),
              code_customer: header.indexOf('code')
            };
              
            const paymentTermMap = new Map(paymentTerms.map(pt => [pt.id_term, pt.term_desc]));

            // Procesa cada fila del Excel de forma asíncrona.
            const mappedDataPromises = dataRows.map(async (row) => {
                const getDate = (dateValue: any) => {
                  if (!dateValue) return new Date().toISOString().split('T')[0];
                  const date = new Date(dateValue);
                  return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
                };

                const getNumericValue = (value: any): number => {
                    const strValue = String(value).toUpperCase();
                    if (strValue === 'N/A' || strValue.trim() === '') return 0;
                    const num = parseFloat(String(value));
                    return isNaN(num) ? 0 : num;
                };

                // Limpia el código de cliente de espacios en blanco.
                const code_customer = String(row[colIndices.code_customer]).trim();
                if (!code_customer) return null;

                // Realiza una consulta individual por cada cliente para ser más eficiente.
                const { data: customer, error: customerError } = await supabase
                    .from('customer')
                    .select('customer_name, ruta, id_term')
                    .eq('code_customer', code_customer)
                    .single();

                if (customerError || !customer) {
                    console.warn(`Cliente con código ${code_customer} no encontrado. Se omitirá esta fila.`);
                    return null;
                }

                const term_description = paymentTermMap.get(customer.id_term) || "";
                const taxIdValue = String(row[colIndices.tax_id_number]).trim();

                // Construye el objeto de la factura a insertar/actualizar.
                return {
                    id_factura: String(row[colIndices.id_factura]),
                    reference_number: String(row[colIndices.reference_number]),
                    fecha: getDate(row[colIndices.transaction_date]),
                    fecha_import: 'now()', // Se usará la función now() de PostgreSQL.
                    customer_name: customer.customer_name,
                    tax_id_number: (taxIdValue.toUpperCase() === 'N/A' || taxIdValue === '') ? '0' : taxIdValue,
                    subtotal: getNumericValue(row[colIndices.subtotal]),
                    total_sale: getNumericValue(row[colIndices.total_sale]),
                    grand_total: getNumericValue(row[colIndices.grand_total]),
                    payment: getNumericValue(row[colIndices.payment]),
                    net_to_pay: getNumericValue(row[colIndices.net_to_pay]),
                    ruta: String(customer.ruta),
                    term_description: term_description,
                    code_customer: code_customer,
                    state: false, 
                };
            });

            // Espera a que todas las búsquedas de clientes terminen y filtra los resultados nulos.
            const mappedData = (await Promise.all(mappedDataPromises)).filter(d => d && d.id_factura);
            // Asegura que no haya facturas duplicadas en el archivo Excel.
            const uniqueMappedData = Array.from(new Map(mappedData.map(item => [item.id_factura, item])).values());

            if(uniqueMappedData.length === 0) {
              toast({ title: "Advertencia", description: "No se encontraron filas válidas o únicas para importar. Verifica los códigos de cliente y los números de factura.", variant: "destructive" });
              if(event.target) event.target.value = '';
              return;
            }
            
            // Valida los datos finales con Zod.
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

            // Sube los datos a Supabase usando 'upsert'.
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
  
  // --- FUNCIONES AUXILIARES DE LA UI ---

  /** Prepara el formulario para editar una factura. */
  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setIsDialogOpen(true);
  }

  /** Controla la apertura y cierre del diálogo, reseteando el estado de edición. */
  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingInvoice(null);
    }
  };
  
  /** Cierra el diálogo de edición/creación y resetea el formulario. */
  const handleCloseDialog = () => {
    setEditingInvoice(null);
    form.reset();
    setIsDialogOpen(false);
  }

  /**
   * Actualiza los campos del formulario cuando se selecciona un cliente.
   * @param code El código del cliente seleccionado.
   */
  const handleCustomerChange = (code: string) => {
    const customer = customers.find(c => c.code_customer === code);
    if (customer) {
      form.setValue('code_customer', customer.code_customer);
      form.setValue('customer_name', customer.customer_name);
      form.setValue('ruta', String(customer.ruta || ''));
      const term = paymentTerms.find(t => t.id_term === customer.id_term);
      if (term) {
        form.setValue('term_description', term.term_desc);
      }
    }
  }

  /** Obtiene la etiqueta del estado ("Pagada" o "Pendiente") a partir de un booleano. */
  const getStatusLabel = (status: boolean): "Pagada" | "Pendiente" => {
    return status ? "Pagada" : "Pendiente";
  };

  /** Obtiene la variante de color del Badge según el estado. */
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
  
  /** Simula un clic en el input de archivo (que está oculto). */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };
  
  /** Resetea todos los filtros y vuelve a la primera página. */
  const clearFilters = () => {
    setSearchQuery('');
    setFilterDate('');
    setFilterImportDate('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalInvoices / ITEMS_PER_PAGE);
  
  /** Genera los números de página para mostrar en la paginación. */
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
  
  const customerOptions = customers.map(customer => ({
    value: customer.code_customer,
    label: `${customer.code_customer} - ${customer.customer_name}`
  }));

  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Facturación</CardTitle>
            <CardDescription>Cree y visualice facturas.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
                          <FormLabel>No. Factura</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: INV-2024-003" {...field} disabled={!!editingInvoice} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reference_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>No. Referencia</FormLabel>
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
                        <FormItem className="flex flex-col">
                          <FormLabel>Código Cliente</FormLabel>
                          <Combobox
                            options={customerOptions}
                            value={field.value}
                            onChange={(value) => handleCustomerChange(value)}
                            placeholder="Seleccione un cliente"
                            searchPlaceholder="Buscar cliente..."
                            emptyText="No se encontró el cliente."
                          />
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
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mt-4">
            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por factura, ref. o cliente..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-full sm:w-[300px]"
                />
            </div>
             <div className="flex items-center gap-2">
                <Label htmlFor="deliveryDate">Fecha de Entrega</Label>
                <Input
                    id="deliveryDate"
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full sm:w-auto"
                />
             </div>
             <div className="flex items-center gap-2">
                <Label htmlFor="importDate">Fecha de Importación</Label>
                <Input
                    id="importDate"
                    type="date"
                    value={filterImportDate}
                    onChange={(e) => setFilterImportDate(e.target.value)}
                    className="w-full sm:w-auto"
                />
             </div>
            <Button variant="ghost" onClick={clearFilters} className="text-sm">
                <FilterX className="mr-2 h-4 w-4"/>
                Limpiar Filtros
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Factura</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>NIF</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Venta Total</TableHead>
                <TableHead>Total General</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Neto a Pagar</TableHead>
                <TableHead>Término</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Fecha Importación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const statusLabel = getStatusLabel(invoice.state);
                return (
                  <TableRow key={String(invoice.id_factura)}>
                    <TableCell className="font-medium">{invoice.id_factura}</TableCell>
                    <TableCell>{invoice.reference_number}</TableCell>
                    <TableCell>{invoice.tax_id_number}</TableCell>
                    <TableCell>{invoice.ruta}</TableCell>
                    <TableCell>${invoice.subtotal.toFixed(2)}</TableCell>
                    <TableCell>${invoice.total_sale.toFixed(2)}</TableCell>
                    <TableCell>${invoice.grand_total.toFixed(2)}</TableCell>
                    <TableCell>${invoice.payment.toFixed(2)}</TableCell>
                    <TableCell>${invoice.net_to_pay.toFixed(2)}</TableCell>
                    <TableCell>{invoice.term_description}</TableCell>
                    <TableCell>{new Date(invoice.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.fecha_import ? new Date(invoice.fecha_import).toLocaleDateString() : 'N/A'}</TableCell>
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
                              <AlertDialogAction onClick={() => handleDelete(String(invoice.id_factura))}>
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
          Mostrando <strong>{invoices.length}</strong> de <strong>{totalInvoices}</strong> facturas.
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
