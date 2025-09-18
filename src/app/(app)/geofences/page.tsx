
'use client'

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Pencil, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"

/**
 * @file geofences/page.tsx
 * @description Página para la gestión de geocercas asociadas a clientes.
 * Permite crear y actualizar los datos de geometría de las geocercas.
 * Las geocercas son fundamentales para la lógica de negocio de rutas y entregas.
 */

// Esquema de validación para el formulario de geocerca.
const geofenceSchema = z.object({
  code_customer: z.string().min(1, { message: "Debe seleccionar un cliente." }),
  geocerca: z.string().min(10, { message: "El campo de geocerca no puede estar vacío." })
    .refine(value => {
        try {
            // Normaliza el string: quita espacios al inicio/final y convierte a mayúsculas
            const normalizedValue = value.trim().toUpperCase();
            // Validación flexible: debe empezar con POLYGON o GEOMETRYCOLLECTION y contener los paréntesis.
            const isPolygon = normalizedValue.startsWith('POLYGON') && normalizedValue.includes('((') && normalizedValue.includes('))');
            const isGeometryCollection = normalizedValue.startsWith('GEOMETRYCOLLECTION') && normalizedValue.includes('POLYGON');
            return isPolygon || isGeometryCollection;
        } catch {
            return false
        }
    }, { message: "Formato de geocerca inválido. Debe ser un POLYGON o GEOMETRYCOLLECTION." })
})

// Tipos de datos para esta página.
type Customer = {
  code_customer: string;
  customer_name: string;
  geocerca: string | null;
}

const ITEMS_PER_PAGE = 10;

/**
 * Normaliza una cadena de texto WKT (Well-Known Text) de geocerca para asegurar una sintaxis válida.
 * Puede manejar un solo POLYGON o una GEOMETRYCOLLECTION con múltiples polígonos.
 * @param wktString - La cadena de texto de la geocerca.
 * @returns Una cadena WKT formateada correctamente o null si la entrada es inválida o vacía.
 */
const normalizeGeometryCollectionWKT = (wktString: string | null | undefined): string | null => {
    if (!wktString || wktString.trim() === '') {
        return null;
    }
    
    let wkt = wktString.trim();

    // Regex para encontrar polígonos. Es compleja para manejar paréntesis anidados.
    const polygonRegex = /POLYGON\s*\(\s*\((?:[^()]*|\((?:[^()]*|\([^()]*\))*\))*\)\s*\)/gi;
    const polygons = wkt.match(polygonRegex);
    
    if (!polygons || polygons.length === 0) {
        // No se encontraron polígonos válidos, devolver el texto original para que falle en la BD si es inválido
        return wkt;
    }

    if (polygons.length === 1) {
        // Si solo hay un polígono, se devuelve tal cual.
        // Esto también maneja el caso de un GEOMETRYCOLLECTION con un solo polígono.
        return polygons[0];
    }

    // Si hay múltiples polígonos, se asegura de que estén envueltos en GEOMETRYCOLLECTION
    return `GEOMETRYCOLLECTION(${polygons.join(',')})`;
};

/**
 * Componente principal de la página de Geocercas.
 */
export default function GeofencesPage() {
  // --- ESTADOS ---
  // Almacena todos los clientes para el selector del formulario (no paginado).
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  // Almacena los clientes para mostrar en la tabla (paginado).
  const [paginatedCustomers, setPaginatedCustomers] = useState<Customer[]>([]);
  // Controla la visibilidad del diálogo de edición/creación.
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  // Almacena el cliente cuya geocerca se está editando.
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast()
  
  // --- ESTADOS DE PAGINACIÓN Y BÚSQUEDA ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // --- FORMULARIO ---
  const form = useForm<z.infer<typeof geofenceSchema>>({
    resolver: zodResolver(geofenceSchema),
    defaultValues: {
      code_customer: "",
      geocerca: "",
    },
  })

  // --- LÓGICA DE DATOS Y EFECTOS ---

  /**
   * Obtiene la lista de clientes paginada y filtrada para mostrar en la tabla.
   * La consulta se hace del lado del servidor para optimizar el rendimiento.
   */
  const fetchCustomers = useCallback(async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('customer')
      .select('code_customer, customer_name, geocerca', { count: 'exact' });

    if (searchQuery) {
      query = query.or(`customer_name.ilike.%${searchQuery}%,code_customer.ilike.%${searchQuery}%`);
    }
    
    query = query.order('customer_name').range(from, to);

    const { data, error, count } = await query;
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes.",
        variant: "destructive",
      })
    } else {
      setPaginatedCustomers(data as Customer[]);
      setTotalCustomers(count ?? 0);
    }
  }, [toast, currentPage, searchQuery]);
  
  /**
   * Obtiene la lista completa de todos los clientes para poblar el menú desplegable del formulario.
   * No se pagina para que el usuario pueda seleccionar cualquier cliente.
   */
  const fetchAllCustomersForSelect = useCallback(async () => {
    const { data, error } = await supabase.from('customer').select('code_customer, customer_name, geocerca').order('customer_name');
    if (!error && data) {
      setAllCustomers(data as Customer[]);
    }
  }, []);

  // Carga los clientes paginados cada vez que cambia la página o la búsqueda.
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  // Carga todos los clientes para el selector solo una vez al montar el componente.
  useEffect(() => {
    fetchAllCustomersForSelect();
  }, [fetchAllCustomersForSelect]);
  
  // Rellena el formulario con los datos del cliente a editar.
  useEffect(() => {
    if (editingCustomer) {
      form.reset({
          code_customer: editingCustomer.code_customer,
          geocerca: editingCustomer.geocerca ?? '',
      });
    } else {
      form.reset({ code_customer: "", geocerca: "" });
    }
  }, [editingCustomer, form]);

  /**
   * Gestiona el envío del formulario para guardar o actualizar la geocerca de un cliente.
   * @param values Los datos del formulario validados por Zod.
   */
  const onSubmit = async (values: z.infer<typeof geofenceSchema>) => {
    // Normaliza la geocerca antes de guardarla para asegurar un formato WKT válido.
    const normalizedGeocerca = normalizeGeometryCollectionWKT(values.geocerca);

    const { error } = await supabase
        .from('customer')
        .update({ geocerca: normalizedGeocerca })
        .eq('code_customer', values.code_customer);

    if (error) {
      toast({
        title: "Error al guardar la geocerca",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Geocerca guardada correctamente.",
      })
      fetchCustomers(); // Recarga la tabla de clientes paginados.
      fetchAllCustomersForSelect(); // Recarga la lista completa por si el estado cambió.
      handleCloseDialog();
    }
  }

  // --- FUNCIONES AUXILIARES DE LA UI ---

  /** Prepara el formulario para editar la geocerca de un cliente. */
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

  /** Cierra el diálogo y resetea el estado y el formulario. */
  const handleCloseDialog = () => {
    setEditingCustomer(null);
    form.reset({ code_customer: "", geocerca: "" });
    setIsDialogOpen(false);
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
            <CardTitle>Geocercas de Clientes</CardTitle>
            <CardDescription>Asigne o edite las geocercas de sus clientes.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCustomer(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir/Editar Geocerca
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Editar Geocerca' : 'Añadir Nueva Geocerca'}</DialogTitle>
                <DialogDescription>
                  {editingCustomer ? 'Modifique los datos de la geocerca para el cliente.' : 'Seleccione un cliente y añada los datos de su geocerca.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="code_customer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cliente</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!editingCustomer}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccione un cliente" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {allCustomers.map((customer) => (
                                <SelectItem key={customer.code_customer} value={customer.code_customer}>
                                  {customer.customer_name} ({customer.code_customer})
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
                    name="geocerca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datos de Geocerca (Formato POLYGON)</FormLabel>
                        <FormControl>
                           <Textarea
                            placeholder="Ej: POLYGON((long1 lat1, long2 lat2, ...)) o GEOMETRYCOLLECTION(POLYGON(...), ...)"
                            className="resize-y"
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Geocerca</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código Cliente</TableHead>
                <TableHead>Nombre Cliente</TableHead>
                <TableHead>Geocerca Asignada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCustomers.map((customer) => (
                <TableRow key={customer.code_customer}>
                  <TableCell className="font-medium">{customer.code_customer}</TableCell>
                  <TableCell>{customer.customer_name}</TableCell>
                  <TableCell>
                    {customer.geocerca 
                        ? <span className="font-mono text-xs p-1 bg-muted rounded">Sí</span> 
                        : <span className="text-muted-foreground">No</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
          Mostrando <strong>{paginatedCustomers.length}</strong> de <strong>{totalCustomers}</strong> clientes.
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
