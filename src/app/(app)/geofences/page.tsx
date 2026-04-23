
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Pencil, Search, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, RefreshCw, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"

/**
 * @file geofences/page.tsx
 * @description Página para la gestión de geocercas asociadas a clientes.
 * Permite crear y actualizar los datos de geometría de las geocercas, ya sea
 * manualmente con formato WKT o automáticamente a partir de coordenadas.
 */

// Esquema de validación para el formulario de geocerca.
const geofenceSchema = z.object({
  code_customer: z.string().min(1, { message: "Debe seleccionar un cliente." }),
  geocerca: z.string().optional(), // Para entrada manual de WKT
  coordinates: z.string().optional(), // Para entrada de "lat, lon"
})

// Tipos de datos para esta página.
type Customer = {
  code_customer: string;
  customer_name: string;
  geocerca: string | null;
}

const ITEMS_PER_PAGE = 10;

/**
 * Componente principal de la página de Geocercas.
 */
export default function GeofencesPage() {
  // --- ESTADOS ---
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [paginatedCustomers, setPaginatedCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast()
  
  // --- ESTADOS DE PAGINACIÓN Y BÚSQUEDA ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // --- FORMULARIO ---
  const form = useForm<z.infer<typeof geofenceSchema>>({
    resolver: zodResolver(geofenceSchema),
    defaultValues: {
      code_customer: "",
      geocerca: "",
      coordinates: "",
    },
  })

  // --- LÓGICA DE DATOS Y EFECTOS ---

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
  
  const fetchAllCustomersForSelect = useCallback(async () => {
    const { data, error } = await supabase.from('customer').select('code_customer, customer_name, geocerca').order('customer_name');
    if (!error && data) {
      setAllCustomers(data as Customer[]);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);
  
  useEffect(() => {
    fetchAllCustomersForSelect();
  }, [fetchAllCustomersForSelect]);
  
  useEffect(() => {
    if (editingCustomer) {
      form.reset({
          code_customer: editingCustomer.code_customer,
          geocerca: editingCustomer.geocerca ?? '',
          coordinates: "", // Siempre limpiar este campo al abrir
      });
    } else {
      form.reset({ code_customer: "", geocerca: "", coordinates: "" });
    }
  }, [editingCustomer, form]);

  /**
   * Gestiona el envío del formulario para guardar o actualizar la geocerca de un cliente.
   * Prioriza la entrada por coordenadas si se proporciona.
   * @param values Los datos del formulario validados por Zod.
   */
  const onSubmit = async (values: z.infer<typeof geofenceSchema>) => {
    // Opción 1: Regenerar a partir de coordenadas.
    if (values.coordinates && values.coordinates.trim() !== '') {
        const coords = values.coordinates.split(',').map(c => c.trim());
        if (coords.length !== 2 || isNaN(parseFloat(coords[0])) || isNaN(parseFloat(coords[1]))) {
            toast({
                title: "Formato de coordenadas inválido",
                description: "Use el formato 'latitud, longitud'. Ej: 13.711, -89.223",
                variant: "destructive",
            });
            return;
        }
        const [lat, lon] = coords.map(parseFloat);
        const last_known_location = `POINT(${lon} ${lat})`;

        // Paso 1: Actualizar last_known_location y poner geocerca a null para forzar la regeneración.
        const { error: updateError } = await supabase
            .from('customer')
            .update({ last_known_location, geocerca: null })
            .eq('code_customer', values.code_customer);

        if (updateError) {
            toast({
                title: "Error al actualizar ubicación",
                description: `No se pudo guardar la nueva ubicación. Error: ${updateError.message}`,
                variant: "destructive",
            });
            return;
        }

        toast({
            title: "Ubicación actualizada",
            description: "La ubicación se guardó. Ahora se generará la nueva geocerca...",
        });

        // Paso 2: Llamar a la función que genera la geocerca para los clientes que la necesiten.
        await handleUpdateMissingGeofences(); 
        
        fetchCustomers();
        fetchAllCustomersForSelect();
        handleCloseDialog();
        
    } else { // Opción 2: Guardar manualmente el WKT de la geocerca.
        const geocercaWKT = values.geocerca ? values.geocerca.trim() : null;
        const { error } = await supabase
            .from('customer')
            .update({ geocerca: geocercaWKT })
            .eq('code_customer', values.code_customer);
        
        if (error) {
            toast({
                title: "Error al guardar la geocerca",
                description: `El formato de la geocerca podría ser inválido. Error: ${error.message}`,
                variant: "destructive",
                duration: 9000,
            })
        } else {
            toast({
                title: "Éxito",
                description: "Geocerca guardada manualmente.",
            })
            fetchCustomers();
            fetchAllCustomersForSelect();
            handleCloseDialog();
        }
    }
  }
  
  /**
   * Llama a una función RPC de Supabase para generar geocercas
   * para todos los clientes que tienen una `last_known_location` pero no una `geocerca`.
   */
  const handleUpdateMissingGeofences = async () => {
    setIsUpdating(true);
    const { data, error } = await supabase.rpc('generate_geofences_from_last_location');

    setIsUpdating(false);

    if (error) {
        toast({
            title: "Error al actualizar",
            description: `No se pudieron generar las geocercas faltantes. Error: ${error.message}`,
            variant: "destructive",
            duration: 9000
        });
    } else {
        if (data > 0) {
            toast({
                title: "Éxito",
                description: `${data} geocercas fueron generadas a partir de la última ubicación conocida.`,
            });
            fetchCustomers(); // Refresca la tabla
            fetchAllCustomersForSelect(); // Refresca la lista del dropdown
        } else {
            toast({
                title: "Nada que actualizar",
                description: "No se encontraron clientes con ubicaciones pendientes para generar geocercas.",
            });
        }
    }
  };

  // --- FUNCIONES AUXILIARES DE LA UI ---

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  }
  
  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingCustomer(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingCustomer(null);
    form.reset({ code_customer: "", geocerca: "", coordinates: "" });
    setIsDialogOpen(false);
  }
  
  const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);

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
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleUpdateMissingGeofences} variant="outline" disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualizar Faltantes
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingCustomer(null); form.reset(); setIsDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Añadir/Editar Geocerca
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                        name="coordinates"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Actualizar desde Coordenadas (lat, lon)</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="Ej: 13.7115, -89.2238"
                                className="resize-y"
                                rows={2}
                                {...field}
                                />
                            </FormControl>
                            <FormDescription>
                                Pegue las coordenadas para generar una geocerca circular de 100m. Esto tendrá prioridad.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                O
                                </span>
                            </div>
                        </div>

                    <FormField
                      control={form.control}
                      name="geocerca"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Datos de Geocerca Manual (Formato WKT)</FormLabel>
                          <FormControl>
                             <Textarea
                              placeholder="Ej: POLYGON((long1 lat1, long2 lat2, ...))"
                              className="resize-y"
                              rows={5}
                              {...field}
                              value={field.value ?? ''}
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

    