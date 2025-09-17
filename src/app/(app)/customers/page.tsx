

'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
import { PlusCircle, Trash2, Pencil, Upload, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, FilterX, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"

/**
 * @file customers/page.tsx
 * @description Página para la gestión completa (CRUD) de clientes.
 * Incluye funcionalidades de creación, edición, eliminación, búsqueda, filtrado,
 * paginación del lado del servidor e importación masiva desde archivos Excel.
 */

// Esquema de validación para el formulario de cliente.
const customerSchema = z.object({
  code_customer: z.string().min(1, { message: "El código es requerido." }),
  customer_name: z.string().min(1, { message: "El nombre es requerido." }),
  id_impuesto: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: "El ID de impuesto es requerido.", invalid_type_error: "El ID de impuesto debe ser un número." }).optional().nullable()
  ),
  id_term: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: "El término de pago es requerido.", invalid_type_error: "El término de pago debe ser un número." }).optional().nullable()
  ),
  ruta: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number({ required_error: "La ruta es requerida.", invalid_type_error: "La ruta debe ser un número." }).optional().nullable()
  ),
  geocerca: z.string().optional().nullable(),
})

// Tipos de datos para la gestión de clientes.
type Customer = {
  code_customer: string;
  customer_name: string;
  id_impuesto: number | null;
  id_term: number | null;
  ruta: number | null;
  geocerca?: string | null;
}
type PaymentTerm = { id_term: string | number; term_desc: string }
type Tax = { id_impuesto: string | number; impt_desc: string }
type RouteNumber = { ruta: number };

const ITEMS_PER_PAGE = 10;

/**
 * Componente principal de la página de clientes.
 * Gestiona el estado, la lógica de negocio y la renderización de la interfaz.
 */
export default function CustomersPage() {
  // --- ESTADOS ---
  // Almacena la lista de clientes de la página actual.
  const [customers, setCustomers] = useState<Customer[]>([])
  // Almacena los términos de pago para los filtros.
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  // Almacena los tipos de impuesto para los filtros.
  const [taxes, setTaxes] = useState<Tax[]>([])
  // Almacena las rutas disponibles para los filtros.
  const [uniqueRoutes, setUniqueRoutes] = useState<RouteNumber[]>([]);
  // Controla la visibilidad del diálogo de creación/edición.
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Almacena el cliente que se está editando, o null si se está creando uno nuevo.
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  // Hook para mostrar notificaciones (toasts).
  const { toast } = useToast()
  // Referencia al input de archivo para la importación desde Excel.
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- ESTADOS DE FILTRADO Y PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRuta, setFilterRuta] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterTax, setFilterTax] = useState('');

  // --- FORMULARIO ---
  // Configuración del formulario con react-hook-form y Zod para validación.
  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code_customer: "",
      customer_name: "",
      id_impuesto: undefined,
      id_term: undefined,
      ruta: undefined,
      geocerca: "",
    },
  })

  // --- LÓGICA DE DATOS (Callbacks y Efectos) ---

  /**
   * Obtiene la lista de clientes desde Supabase, aplicando paginación y filtros del lado del servidor.
   * Se ejecuta cada vez que cambia la página, la búsqueda o algún filtro.
   */
  const fetchCustomers = useCallback(async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Construye la consulta a Supabase de forma dinámica.
    let query = supabase
      .from('customer')
      .select('code_customer,customer_name,id_impuesto,id_term,ruta,geocerca', { count: 'exact' });

    // Aplica el filtro de búsqueda si existe.
    if (searchQuery) {
      query = query.or(`customer_name.ilike.%${searchQuery}%,code_customer.ilike.%${searchQuery}%`);
    }
    // Aplica los filtros de selección si existen.
    if (filterRuta) {
      query = query.eq('ruta', filterRuta);
    }
    if (filterTerm) {
      query = query.eq('id_term', filterTerm);
    }
    if (filterTax) {
      query = query.eq('id_impuesto', filterTax);
    }

    // Aplica el rango de paginación.
    query = query.range(from, to);

    // Ejecuta la consulta.
    const { data, error, count } = await query;
    
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes.",
        variant: "destructive",
      })
    } else {
      setCustomers(data as Customer[]);
      setTotalCustomers(count ?? 0); // Actualiza el conteo total para la paginación.
    }
  }, [currentPage, searchQuery, filterRuta, filterTerm, filterTax, toast]);

  /**
   * Obtiene datos estáticos necesarios para los filtros (términos de pago, impuestos, rutas).
   * Se ejecuta solo una vez al cargar el componente.
   */
  const fetchStaticData = useCallback(async () => {
    // Obtiene los valores únicos de ruta directamente de la tabla de clientes.
    const [termsRes, taxesRes, routesRes] = await Promise.all([
      supabase.from('terminos_pago').select('id_term, term_desc'),
      supabase.from('tipo_impuesto').select('id_impuesto, impt_desc'),
      supabase.from('customer').select('ruta').not('ruta', 'is', null) // Obtiene solo rutas existentes
    ]);
    
    if (termsRes.error) {
      toast({ title: "Error", description: "No se pudieron cargar los términos de pago.", variant: "destructive" });
    } else {
      setPaymentTerms(termsRes.data as PaymentTerm[]);
    }

    if (taxesRes.error) {
      toast({ title: "Error", description: "No se pudieron cargar los impuestos.", variant: "destructive" });
    } else {
      setTaxes(taxesRes.data as Tax[]);
    }
    
    if (routesRes.error) {
      toast({ title: "Error", description: "No se pudieron cargar las rutas.", variant: "destructive" });
    } else {
      // Procesa para obtener valores únicos y ordenados
      const uniqueRouteNumbers = Array.from(new Set(routesRes.data.map(item => item.ruta)))
                                      .sort((a, b) => a - b)
                                      .map(ruta => ({ ruta }));
      setUniqueRoutes(uniqueRouteNumbers);
    }
  }, [toast]);
  
  // Efecto para cargar los datos estáticos al montar el componente.
  useEffect(() => {
    fetchStaticData();
  }, [fetchStaticData]);

  // Efecto para cargar los clientes cada vez que los filtros o la página cambian.
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  /**
   * Rellena el formulario con los datos de un cliente cuando se selecciona para editar.
   * Resetea el formulario si se está creando un nuevo cliente.
   */
  useEffect(() => {
    if (editingCustomer) {
      form.reset({
        ...editingCustomer,
        id_impuesto: editingCustomer.id_impuesto !== null ? Number(editingCustomer.id_impuesto) : undefined,
        id_term: editingCustomer.id_term !== null ? Number(editingCustomer.id_term) : undefined,
        ruta: editingCustomer.ruta !== null ? Number(editingCustomer.ruta) : undefined,
        geocerca: editingCustomer.geocerca ?? "",
      });
    } else {
      form.reset({
        code_customer: "",
        customer_name: "",
        id_impuesto: undefined,
        id_term: undefined,
        ruta: undefined,
        geocerca: "",
      });
    }
  }, [editingCustomer, form]);

  /**
   * Gestiona el envío del formulario para crear o actualizar un cliente.
   * @param values Los datos del formulario validados por Zod.
   */
  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    let error;

    // Solo se envían los campos que no son de la geocerca
    const { geocerca, ...customerData } = values;

    if (editingCustomer) {
      // Actualiza un cliente existente.
      const { error: updateError } = await supabase
        .from('customer')
        .update(customerData)
        .eq('code_customer', editingCustomer.code_customer)
        .select()
      error = updateError;
    } else {
      // Inserta un nuevo cliente.
      const { error: insertError } = await supabase
        .from('customer')
        .insert([customerData])
        .select()
      error = insertError;
    }

    if (error) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: `Cliente ${editingCustomer ? 'actualizado' : 'guardado'} correctamente.`,
      })
      fetchCustomers() // Recarga la lista de clientes.
      setIsDialogOpen(false) // Cierra el diálogo.
    }
  }

  /**
   * Elimina un cliente de la base de datos.
   * @param customerId El ID del cliente a eliminar.
   */
  const handleDelete = async (customerId: string) => {
    const { error } = await supabase
      .from('customer')
      .delete()
      .eq('code_customer', customerId)

    if (error) {
      // Manejo de errores específicos, como la violación de claves foráneas.
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el cliente porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el cliente.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Cliente eliminado correctamente.",
      })
      fetchCustomers() // Recarga la lista de clientes.
    }
  }
  
  /**
   * Procesa el archivo Excel seleccionado para importar clientes masivamente.
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
            const workbook = xlsx.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Mapea y limpia los datos de cada fila.
            const dataToValidate = rows
              .slice(1) // Omitir la fila de encabezados
              .map(row => {
                  const parseNumberOrNull = (val: any): number | null => {
                    const valueStr = String(val).trim().toUpperCase();
                    if (val === null || val === undefined || valueStr === '' || valueStr === 'N/A' || isNaN(Number(val))) {
                        return null;
                    }
                    return Number(val);
                  };

                  return {
                    code_customer: String(row[0] || '').trim(), // Limpia espacios en blanco.
                    customer_name: String(row[1] || '').trim(), // Limpia espacios en blanco.
                    ruta: parseNumberOrNull(row[2]),
                    id_impuesto: parseNumberOrNull(row[3]),
                    id_term: parseNumberOrNull(row[4]),
                  }
              });
            
            // Filtra filas vacías.
            const nonEmptyData = dataToValidate.filter(
              row => row.code_customer && row.customer_name
            );

            if (nonEmptyData.length === 0) {
              toast({
                title: "Archivo vacío o inválido",
                description: "No se encontraron datos válidos para importar en el archivo. Verifique el formato.",
                variant: "destructive",
              });
              return;
            }

            // Valida los datos contra el esquema Zod.
            const validatedCustomers = z.array(customerSchema).safeParse(nonEmptyData);

            if (!validatedCustomers.success) {
                // Muestra un mensaje de error detallado si la validación falla.
                const errorIssues = validatedCustomers.error.issues;
                const errorMessage = errorIssues
                    .map(issue => `Fila ${Number(issue.path[0]) + 2}: En columna '${issue.path[1]}', ${issue.message}`)
                    .join(' | ');

                toast({
                    title: "Error de validación",
                    description: errorMessage || "Algunos datos del archivo Excel no son correctos o están incompletos.",
                    variant: "destructive",
                    duration: 9000,
                });
                return;
            }
            
            if (validatedCustomers.data.length === 0) {
              toast({
                title: "Archivo vacío",
                description: "No se encontraron datos válidos para importar en el archivo.",
                variant: "destructive",
              });
              return;
            }
            
            // Sube los datos a Supabase usando 'upsert' para actualizar o insertar.
            const { error: upsertError } = await supabase.from('customer').upsert(validatedCustomers.data, {
              onConflict: 'code_customer' 
            });

            if (upsertError) {
                toast({ title: "Error al importar", description: upsertError.message, variant: "destructive" });
            } else {
                toast({ title: "Éxito", description: `${validatedCustomers.data.length} clientes importados/actualizados correctamente.` });
                fetchCustomers();
            }

        } catch (error) {
            console.error("Error al procesar el archivo:", error);
            toast({ title: "Error", description: "No se pudo procesar el archivo Excel.", variant: "destructive" });
        }
    };
    reader.readAsArrayBuffer(file);
    if(event.target) event.target.value = ''; // Resetea el input para poder re-subir el mismo archivo.
  };

  // --- FUNCIONES AUXILIARES DE LA UI ---

  /** Simula un clic en el input de archivo (que está oculto). */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /** Prepara el formulario para editar un cliente. */
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  }

  /** Controla la apertura y cierre del diálogo, reseteando el estado de edición. */
  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingCustomer(null);
    }
  };
  
  /** Resetea todos los filtros a sus valores por defecto y vuelve a la primera página. */
  const clearFilters = () => {
    setSearchQuery('');
    setFilterRuta('');
    setFilterTerm('');
    setFilterTax('');
    setCurrentPage(1);
  };

  /** Obtiene la descripción legible de un impuesto a partir de su ID. */
  const getTaxDescription = (taxId: string | number | null) => {
    if (taxId === null) return 'N/A';
    return taxes.find(tax => String(tax.id_impuesto) === String(taxId))?.impt_desc || taxId;
  }
  
  /** Obtiene la descripción legible de un término de pago a partir de su ID. */
  const getTermDescription = (termId: string | number | null) => {
    if (termId === null) return 'N/A';
      return paymentTerms.find(term => String(term.id_term) === String(termId))?.term_desc || termId;
  }

  const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);
  
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
  
  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gestione su base de clientes.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleImportClick} variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Importar
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
                <Button onClick={() => { setEditingCustomer(null); form.reset(); setIsDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</DialogTitle>
                  <DialogDescription>
                    {editingCustomer ? 'Modifique los detalles del cliente.' : 'Complete los detalles para crear un nuevo cliente.'}
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="code_customer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código Cliente</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: C003" {...field} disabled={!!editingCustomer} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customer_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Carlos Rodriguez" {...field} />
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
                            <Input type="number" placeholder="Ej: 15" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="id_impuesto"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Impuesto</FormLabel>
                          <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value ?? '')} defaultValue={String(field.value ?? '')}>
                              <FormControl>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Seleccione un impuesto">
                                          {getTaxDescription(field.value ?? '')}
                                      </SelectValue>
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {taxes.map((tax) => (
                                      <SelectItem key={String(tax.id_impuesto)} value={String(tax.id_impuesto)}>
                                          {tax.impt_desc}
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
                      name="id_term"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Término de Pago</FormLabel>
                          <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value ?? '')} defaultValue={String(field.value ?? '')}>
                            <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Seleccione un término de pago">
                                      {getTermDescription(field.value ?? '')}
                                  </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {paymentTerms.map((term) => (
                                <SelectItem key={String(term.id_term)} value={String(term.id_term)}>
                                  {term.term_desc}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     {editingCustomer && (
                       <FormField
                        control={form.control}
                        name="geocerca"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Geocerca</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Datos de la geocerca (solo lectura)"
                                {...field}
                                value={field.value || ""}
                                readOnly
                                className="resize-none"
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                     )}
                    <DialogFooter className="gap-2 pt-4">
                      <DialogClose asChild>
                        <Button type="button" variant="secondary" className="w-full sm:w-auto">Cancelar</Button>
                      </DialogClose>
                      <Button type="submit" className="w-full sm:w-auto">{editingCustomer ? 'Guardar Cambios' : 'Guardar Cliente'}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 mt-4">
            <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Buscar por código o nombre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 w-full sm:w-[250px]"
                />
            </div>
            <Select value={filterRuta} onValueChange={setFilterRuta}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                    <SelectValue placeholder="Filtrar por Ruta" />
                </SelectTrigger>
                <SelectContent>
                    {uniqueRoutes.map(ruta => (
                        <SelectItem key={ruta.ruta} value={String(ruta.ruta)}>Ruta {ruta.ruta}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filterTerm} onValueChange={setFilterTerm}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                    <SelectValue placeholder="Filtrar por Término" />
                </SelectTrigger>
                <SelectContent>
                    {paymentTerms.map(term => (
                        <SelectItem key={String(term.id_term)} value={String(term.id_term)}>{term.term_desc}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filterTax} onValueChange={setFilterTax}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                    <SelectValue placeholder="Filtrar por Impuesto" />
                </SelectTrigger>
                <SelectContent>
                    {taxes.map(tax => (
                        <SelectItem key={String(tax.id_impuesto)} value={String(tax.id_impuesto)}>{tax.impt_desc}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
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
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Impuesto</TableHead>
                <TableHead>Térm. Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.code_customer}>
                  <TableCell className="font-medium">{customer.code_customer}</TableCell>
                  <TableCell>{customer.customer_name}</TableCell>
                  <TableCell>{customer.ruta ?? 'N/A'}</TableCell>
                  <TableCell>{getTaxDescription(customer.id_impuesto)}</TableCell>
                  <TableCell>{getTermDescription(customer.id_term)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
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
                              Esta acción no se puede deshacer. Esto eliminará permanentemente el cliente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(customer.code_customer)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{customers.length}</strong> de <strong>{totalCustomers}</strong> clientes.
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


    