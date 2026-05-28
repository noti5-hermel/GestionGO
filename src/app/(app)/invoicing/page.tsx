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
import { AsyncCombobox } from "@/components/ui/async-combobox"

/**
 * @file invoicing/page.tsx
 * @description Página para la gestión completa de facturas.
 * Permite la creación manual o la importación masiva desde Excel.
 * El sistema soporta archivos con múltiples hojas, donde cada hoja representa un despacho,
 * creando automáticamente los clientes que no existen y asignando facturas.
 */

// Esquema de validación para la factura usando Zod.
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
      (val) => (String(val).toLowerCase() === 'completado' || val === true),
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
type Tax = { id_impuesto: number, impt_desc: string }

// Opciones estáticas para la interfaz de usuario.
const statusOptions = ["Completado", "Pendiente"]
const ITEMS_PER_PAGE = 10;

export default function InvoicingPage() {
  // --- ESTADOS ---
  const [invoices, setInvoices] = useState<Invoice[]>([])
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
      fecha: new Date().toISOString().split('T')[0],
      fecha_import: new Date().toISOString().split('T')[0],
      state: false,
      ruta: "",
    },
  })

  // --- LÓGICA DE DATOS ---

  const fetchInvoices = useCallback(async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('facturacion')
      .select('*', { count: 'exact' });

    if (searchQuery) {
      query = query.or(`id_factura::text.ilike.%${searchQuery}%,reference_number::text.ilike.%${searchQuery}%,code_customer.ilike.%${searchQuery}%`);
    }

    if (filterDate) {
      query = query.eq('fecha', filterDate);
    }
    
    if (filterImportDate) {
      query = query.eq('fecha_import', filterImportDate);
    }
    
    query = query.range(from, to).order('fecha', { ascending: false });

    const { data, error, count } = await query;
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas.", variant: "destructive" });
    } else {
      setInvoices(data as Invoice[]);
      setTotalInvoices(count ?? 0);
    }
  }, [currentPage, searchQuery, filterDate, filterImportDate, toast]);
  
  useEffect(() => {
    fetchPaymentTerms()
  }, [])
  
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);
  
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
  
  const fetchPaymentTerms = async () => {
    const { data, error } = await supabase.from('terminos_pago').select('id_term, term_desc')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los términos de pago.", variant: "destructive" })
    } else {
      setPaymentTerms(data as PaymentTerm[])
    }
  }

  const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
    let error;
    const dataToSubmit: Omit<typeof values, 'fecha_import'> & { fecha_import?: any } = { ...values };
    if (!editingInvoice) {
      dataToSubmit.fecha_import = 'now()';
    } else {
      delete dataToSubmit.fecha_import;
    }

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

  /**
   * Procesa un archivo Excel para importar facturas masivamente.
   * Crea automáticamente los clientes que no existen antes de procesar las facturas.
   */
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = xlsx.read(data, { type: 'array', cellDates: true });

            // 1. Carga datos maestros para validación y mapeo
            const [
              { data: routesData }, 
              { data: ptData }, 
              { data: taxesData }
            ] = await Promise.all([
              supabase.from('rutas').select('id_ruta, ruta_desc'),
              supabase.from('terminos_pago').select('id_term, term_desc'),
              supabase.from('tipo_impuesto').select('id_impuesto, impt_desc')
            ]);

            if (!routesData || !ptData || !taxesData) {
                toast({ title: "Error", description: "No se pudieron cargar los datos maestros para la validación.", variant: "destructive" });
                return;
            }

            const routesMap = new Map(routesData.map(r => [r.ruta_desc.toLowerCase(), r.id_ruta]));
            const paymentTermMap = new Map(ptData.map(pt => [pt.term_desc.toLowerCase(), pt.id_term]));
            
            // Lógica para determinar tipos de impuestos por descripción
            const cfTax = taxesData.find(t => t.impt_desc.toLowerCase().includes('crédito') || t.impt_desc.toLowerCase().includes('credito'));
            const cfinalTax = taxesData.find(t => t.impt_desc.toLowerCase().includes('consumidor'));
            const defaultTaxId = cfinalTax?.id_impuesto || taxesData[0]?.id_impuesto || 1;
            const creditoTaxId = cfTax?.id_impuesto || defaultTaxId;

            let totalInvoicesCreated = 0;
            let totalDespachosCreated = 0;
            let totalCustomersUpserted = 0;
            let hasErrors = false;

            // Almacén temporal para clientes que necesitan ser creados/actualizados
            const customersToUpsert = new Map<string, any>();

            // --- FASE 1: Recolectar datos de todas las hojas ---
            const sheetsData: any[] = [];

            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                const json: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (json.length < 4) continue;

                const routeName = String(json[0][1] || '').trim();
                const dispatchDateValue = json[0][3];
                const id_ruta = routesMap.get(routeName.toLowerCase());

                if (!id_ruta || !dispatchDateValue) {
                    console.warn(`Hoja "${sheetName}" ignorada por falta de ruta o fecha.`);
                    continue;
                }

                const headerRow: string[] = (json[2] as string[]).map(h => String(h || '').toLowerCase().trim());
                const dataRows = json.slice(3);

                const colIndices = {
                    id_factura: headerRow.indexOf('invoice number'),
                    fecha: headerRow.indexOf('transaction id'),
                    customer_name_excel: headerRow.indexOf('customer name'),
                    tax_id_number: headerRow.indexOf('tax id number'),
                    subtotal: headerRow.indexOf('subtotal'),
                    total_sale: headerRow.indexOf('total sales tax'),
                    grand_total: headerRow.indexOf('grand total'),
                    payment: headerRow.indexOf('payment total'),
                    net_to_pay: headerRow.indexOf('net to pay'),
                    term_description_excel: headerRow.indexOf('terms description'),
                    reference_number: headerRow.indexOf('your reference'),
                    code_customer: headerRow.indexOf('code')
                };

                const validRows = dataRows.filter(row => row && row[colIndices.id_factura] && String(row[colIndices.id_factura]).trim() !== '' && String(row[colIndices.code_customer] || '').trim() !== '');
                
                if (validRows.length === 0) continue;

                sheetsData.push({
                  sheetName,
                  id_ruta,
                  routeName,
                  dispatchDateValue,
                  colIndices,
                  validRows
                });

                // Recolectar info de clientes para el upsert masivo
                validRows.forEach(row => {
                  const code = String(row[colIndices.code_customer]).trim();
                  const name = String(row[colIndices.customer_name_excel]).trim();
                  const termDesc = String(row[colIndices.term_description_excel] || '').toLowerCase().trim();
                  const taxIdVal = String(row[colIndices.tax_id_number] || '').trim();

                  if (!customersToUpsert.has(code)) {
                    // Determinar ID de término de pago
                    const id_term = paymentTermMap.get(termDesc) || ptData[0].id_term;
                    
                    // Determinar ID de impuesto (Heurística: si tiene NIF es Crédito Fiscal)
                    const id_impuesto = (taxIdVal && taxIdVal !== '0' && taxIdVal.toUpperCase() !== 'N/A') ? creditoTaxId : defaultTaxId;
                    
                    // Extraer número de ruta del ID o nombre (ej: "R-15" -> 15)
                    const rutaNum = parseInt(String(id_ruta).replace(/\D/g, ''), 10) || 0;

                    customersToUpsert.set(code, {
                      code_customer: code,
                      customer_name: name,
                      id_term: id_term,
                      id_impuesto: id_impuesto,
                      ruta: rutaNum
                    });
                  }
                });
            }

            // --- FASE 2: Upsert de Clientes ---
            if (customersToUpsert.size > 0) {
              const { error: customerUpsertError } = await supabase
                .from('customer')
                .upsert(Array.from(customersToUpsert.values()), { onConflict: 'code_customer' });
              
              if (customerUpsertError) {
                toast({ title: "Error crítico", description: "No se pudieron crear/actualizar los clientes: " + customerUpsertError.message, variant: "destructive" });
                return;
              }
              totalCustomersUpserted = customersToUpsert.size;
            }

            // --- FASE 3: Procesar Facturas y Despachos ---
            for (const sheet of sheetsData) {
                const { id_ruta, dispatchDateValue, colIndices, validRows, sheetName } = sheet;
                
                const dispatchDate = new Date(dispatchDateValue);
                if (isNaN(dispatchDate.getTime())) continue;
                const fecha_despacho = new Date(dispatchDate.getTime() - (dispatchDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

                const { data: newDespacho, error: despachoError } = await supabase
                    .from('despacho')
                    .insert({ id_ruta, fecha_despacho, facturacion: true })
                    .select('id_despacho')
                    .single();

                if (despachoError) {
                    hasErrors = true;
                    continue;
                }
                totalDespachosCreated++;
                const newDespachoId = newDespacho.id_despacho;

                const invoicesToCreate: any[] = [];
                validRows.forEach(row => {
                    const code_customer = String(row[colIndices.code_customer]).trim();
                    const taxIdValue = String(row[colIndices.tax_id_number] || '').trim();
                    const termDescExcel = String(row[colIndices.term_description_excel] || '').trim();

                    const getNumericValue = (value: any): number => {
                        const strValue = String(value).toUpperCase();
                        if (strValue === 'N/A' || strValue.trim() === '' || strValue === 'DELETED') return 0;
                        const num = parseFloat(String(value));
                        return isNaN(num) ? 0 : num;
                    };

                    const getDate = (dateValue: any) => {
                      if (!dateValue) return new Date().toISOString().split('T')[0];
                      const date = new Date(dateValue);
                      return isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                    };

                    invoicesToCreate.push({
                        id_factura: String(row[colIndices.id_factura]),
                        reference_number: String(row[colIndices.reference_number]),
                        fecha: getDate(row[colIndices.fecha]),
                        fecha_import: 'now()',
                        customer_name: String(row[colIndices.customer_name_excel]),
                        tax_id_number: (taxIdValue.toUpperCase() === 'N/A' || taxIdValue === '') ? '0' : taxIdValue,
                        subtotal: getNumericValue(row[colIndices.subtotal]),
                        total_sale: getNumericValue(row[colIndices.total_sale]),
                        grand_total: getNumericValue(row[colIndices.grand_total]),
                        payment: getNumericValue(row[colIndices.payment]),
                        net_to_pay: getNumericValue(row[colIndices.net_to_pay]),
                        ruta: String(id_ruta),
                        term_description: termDescExcel,
                        code_customer: code_customer,
                        state: false,
                    });
                });

                if (invoicesToCreate.length === 0) continue;
                
                const validatedInvoices = z.array(invoiceSchema).safeParse(invoicesToCreate);
                if (!validatedInvoices.success) {
                    hasErrors = true;
                    continue;
                }

                const uniqueInvoicesMap = new Map<string, any>();
                for (const invoice of validatedInvoices.data) {
                    uniqueInvoicesMap.set(String(invoice.id_factura), invoice);
                }
                const uniqueInvoicesToUpsert = Array.from(uniqueInvoicesMap.values());

                const { data: createdInvoices, error: insertInvoicesError } = await supabase.from('facturacion').upsert(uniqueInvoicesToUpsert, { onConflict: 'id_factura' }).select('id_factura, net_to_pay');
                
                if (insertInvoicesError) {
                    hasErrors = true;
                    continue;
                }
                
                totalInvoicesCreated += createdInvoices.length;

                const associationsToInsert = createdInvoices.map(inv => ({ id_despacho: newDespachoId, id_factura: inv.id_factura, monto: 0, state: false, forma_pago: 'Efectivo' as const }));
                await supabase.from('facturacion_x_despacho').insert(associationsToInsert);

                const total_general = createdInvoices.reduce((sum, inv) => sum + (inv.net_to_pay || 0), 0);
                await supabase.from('despacho').update({ total_general }).eq('id_despacho', newDespachoId);
            }

            toast({ 
              title: hasErrors ? "Importación Parcial" : "Éxito", 
              description: `Proceso finalizado: ${totalCustomersUpserted} clientes gestionados, ${totalDespachosCreated} despachos creados y ${totalInvoicesCreated} facturas procesadas.`,
              variant: hasErrors ? "destructive" : "default"
            });
            fetchInvoices();
        } catch (error) {
            console.error("Error al procesar el archivo:", error);
            toast({ title: "Error Crítico", description: "No se pudo procesar el archivo Excel. Verifique el formato.", variant: "destructive" });
        }
        if(event.target) event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };
  
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

  const searchCustomers = useCallback(async (query: string) => {
    if (!query) return [];
    const { data, error } = await supabase
      .from('customer')
      .select('code_customer, customer_name, ruta, id_term')
      .or(`code_customer.ilike.%${query}%,customer_name.ilike.%${query}%`)
      .limit(10);
    
    if (error) return [];
    return (data || []).map(c => ({ value: c.code_customer, label: `${c.code_customer} - ${c.customer_name}` }));
  }, []);

  const handleCustomerChange = async (code: string) => {
    if (!code) {
      form.setValue('customer_name', '');
      form.setValue('ruta', '');
      form.setValue('term_description', '');
      return;
    }
    const { data: customer } = await supabase
        .from('customer')
        .select('customer_name, ruta, id_term')
        .eq('code_customer', code)
        .single();
    
    if (customer) {
      form.setValue('code_customer', code);
      form.setValue('customer_name', customer.customer_name);
      form.setValue('ruta', String(customer.ruta || ''));
      const term = paymentTerms.find(t => t.id_term === customer.id_term);
      if (term) form.setValue('term_description', term.term_desc);
    }
  }

  const getStatusLabel = (status: boolean) => status ? "Completado" : "Pendiente";

  const getBadgeVariant = (status: string) => status === "Completado" ? "default" : "secondary";
  
  const handleImportClick = () => fileInputRef.current?.click();
  
  const clearFilters = () => {
    setSearchQuery('');
    setFilterDate('');
    setFilterImportDate('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalInvoices / ITEMS_PER_PAGE);
  
  const getPaginationNumbers = () => {
    const pages = [];
    const totalVisiblePages = 5;
    if (totalPages <= totalVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4, '...', totalPages);
      else if (currentPage >= totalPages - 2) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
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
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleImportClick} variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Importar desde Excel
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
            <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingInvoice(null); form.reset(); setIsDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Nueva Factura
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingInvoice ? 'Editar Factura' : 'Crear Nueva Factura'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="id_factura" render={({ field }) => (
                        <FormItem><FormLabel>No. Factura</FormLabel><FormControl><Input {...field} disabled={!!editingInvoice} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="reference_number" render={({ field }) => (
                        <FormItem><FormLabel>No. Referencia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="code_customer" render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Código Cliente</FormLabel><AsyncCombobox value={field.value} onValueChange={handleCustomerChange} loadOptions={searchCustomers} placeholder="Buscar cliente..." /><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="customer_name" render={({ field }) => (
                        <FormItem><FormLabel>Nombre Cliente</FormLabel><FormControl><Input {...field} readOnly /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="tax_id_number" render={({ field }) => (
                        <FormItem><FormLabel>NIF</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="ruta" render={({ field }) => (
                        <FormItem><FormLabel>Ruta</FormLabel><FormControl><Input {...field} readOnly /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="subtotal" render={({ field }) => (
                        <FormItem><FormLabel>Subtotal</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="total_sale" render={({ field }) => (
                        <FormItem><FormLabel>Venta Total</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="grand_total" render={({ field }) => (
                        <FormItem><FormLabel>Total General</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="payment" render={({ field }) => (
                        <FormItem><FormLabel>Pago</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="net_to_pay" render={({ field }) => (
                        <FormItem><FormLabel>Neto a Pagar</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="term_description" render={({ field }) => (
                        <FormItem><FormLabel>Descripción Término</FormLabel><FormControl><Input {...field} readOnly/></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="fecha" render={({ field }) => (
                        <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="state" render={({ field }) => (
                        <FormItem><FormLabel>Estado</FormLabel><Select onValueChange={(value) => field.onChange(value === 'Completado')} value={getStatusLabel(field.value)}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{statusOptions.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                    </div>
                    <DialogFooter><DialogClose asChild><Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button></DialogClose><Button type="submit">{editingInvoice ? 'Guardar Cambios' : 'Guardar Factura'}</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mt-4">
            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Buscar por factura, ref. o cliente..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 w-full sm:w-[300px]" />
            </div>
             <div className="flex items-center gap-2"><Label htmlFor="deliveryDate">Entrega</Label><Input id="deliveryDate" type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full sm:w-auto" /></div>
             <div className="flex items-center gap-2"><Label htmlFor="importDate">Importación</Label><Input id="importDate" type="date" value={filterImportDate} onChange={(e) => setFilterImportDate(e.target.value)} className="w-full sm:w-auto" /></div>
            <Button variant="ghost" onClick={clearFilters} className="text-sm"><FilterX className="mr-2 h-4 w-4"/>Limpiar</Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader><TableRow><TableHead>No. Factura</TableHead><TableHead>Referencia</TableHead><TableHead>NIF</TableHead><TableHead>Ruta</TableHead><TableHead>Neto a Pagar</TableHead><TableHead>Término</TableHead><TableHead>Fecha</TableHead><TableHead>Fecha Import.</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const statusLabel = getStatusLabel(invoice.state);
                return (
                  <TableRow key={String(invoice.id_factura)}>
                    <TableCell className="font-medium">{invoice.id_factura}</TableCell>
                    <TableCell>{invoice.reference_number}</TableCell>
                    <TableCell>{invoice.tax_id_number}</TableCell>
                    <TableCell>{invoice.ruta}</TableCell>
                    <TableCell>${invoice.net_to_pay.toFixed(2)}</TableCell>
                    <TableCell>{invoice.term_description}</TableCell>
                    <TableCell>{new Date(invoice.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.fecha_import ? new Date(invoice.fecha_import).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell><Badge variant={getBadgeVariant(statusLabel)}>{statusLabel}</Badge></TableCell>
                    <TableCell>
                      <div className="flex justify-end items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(invoice)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Está seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(String(invoice.id_factura))}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
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
        <div className="text-xs text-muted-foreground">Mostrando <strong>{invoices.length}</strong> de <strong>{totalInvoices}</strong> facturas.</div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="flex items-center gap-2">{getPaginationNumbers().map((page, index) => typeof page === 'number' ? (<Button key={index} variant={currentPage === page ? 'default' : 'outline'} className="h-8 w-8 p-0" onClick={() => setCurrentPage(page)}>{page}</Button>) : (<span key={index} className="px-1.5">...</span>))}</div>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" className="h-8 w-8 p-0" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
        </div>
        <div className="text-xs text-muted-foreground">Página <strong>{currentPage}</strong> de <strong>{totalPages || 1}</strong></div>
      </CardFooter>
    </Card>
  )
}
