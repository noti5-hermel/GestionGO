
'use client'

import { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, Trash2, Pencil, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const routeSchema = z.object({
  id_ruta: z.string().min(1, { message: "El ID de la ruta es requerido." }),
  ruta_desc: z.string().min(1, { message: "La descripción es requerida." }),
  geocerca: z.string().optional().nullable(),
})

type Route = {
  id_ruta: string | number; // Permite ambos tipos para los datos de la BD
  ruta_desc: string;
  geocerca: string | null;
}

const ITEMS_PER_PAGE = 10;

/**
 * Normaliza una cadena de texto WKT de geocerca para asegurar una sintaxis válida.
 * Puede manejar un solo POLYGON o una GEOMETRYCOLLECTION con múltiples polígonos.
 * @param wktString - La cadena de texto de la geocerca.
 * @returns Una cadena WKT formateada correctamente o null si la entrada es inválida o vacía.
 */
const normalizeGeometryCollectionWKT = (wktString: string | null | undefined): string | null => {
    if (!wktString || wktString.trim() === '') {
        return null;
    }
    const trimmedWkt = wktString.trim();

    // Expresión regular para encontrar todos los polígonos, insensible a mayúsculas y espacios.
    const polygons = trimmedWkt.match(/POLYGON\s*\(\(.*?\)\)/gi);

    if (!polygons || polygons.length === 0) {
        // Si no se encuentran polígonos, podría ser una entrada inválida, devolver original para que la BD lo valide.
        return trimmedWkt;
    }

    if (polygons.length === 1) {
        // Si solo hay un polígono, lo devolvemos tal cual.
        return polygons[0];
    }

    // Si hay múltiples polígonos, los unimos en una GEOMETRYCOLLECTION.
    return `GEOMETRYCOLLECTION(${polygons.join(',')})`;
};


export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1);

  const form = useForm<z.infer<typeof routeSchema>>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      id_ruta: "",
      ruta_desc: "",
      geocerca: ""
    },
  })
  
  useEffect(() => {
    fetchRoutes()
  }, [])

  useEffect(() => {
    if (editingRoute) {
      form.reset({
        ...editingRoute,
        id_ruta: String(editingRoute.id_ruta), // Convierte a string para el formulario
        geocerca: editingRoute.geocerca ?? "",
      });
    } else {
      form.reset({ id_ruta: "", ruta_desc: "", geocerca: "" });
    }
  }, [editingRoute, form]);

  const fetchRoutes = async () => {
    const { data, error } = await supabase.from('rutas').select('id_ruta, ruta_desc, geocerca')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las rutas.",
        variant: "destructive",
      })
    } else {
      setRoutes(data as Route[])
    }
  }

  const onSubmit = async (values: z.infer<typeof routeSchema>) => {
    let error;
    
    // Normaliza la geocerca antes de guardarla.
    const normalizedGeocerca = normalizeGeometryCollectionWKT(values.geocerca);

    const dataToSubmit = {
      ...values,
      geocerca: normalizedGeocerca,
    };

    if (editingRoute) {
      const { error: updateError } = await supabase
        .from('rutas')
        .update(dataToSubmit)
        .eq('id_ruta', editingRoute.id_ruta)
        .select()
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('rutas')
        .insert([dataToSubmit])
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
        description: `Ruta ${editingRoute ? 'actualizada' : 'guardada'} correctamente.`,
      })
      fetchRoutes()
      handleCloseDialog();
    }
  }

  const handleDelete = async (routeId: string | number) => {
    const { error } = await supabase
      .from('rutas')
      .delete()
      .eq('id_ruta', routeId)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar la ruta porque está asociada a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar la ruta.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Ruta eliminada correctamente.",
      })
      fetchRoutes()
    }
  }

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingRoute(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingRoute(null);
    form.reset({ id_ruta: "", ruta_desc: "", geocerca: "" });
    setIsDialogOpen(false);
  }

  const totalPages = Math.ceil(routes.length / ITEMS_PER_PAGE);
  const paginatedRoutes = routes.slice(
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
            <CardTitle>Rutas</CardTitle>
            <CardDescription>Gestione las rutas de despacho.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingRoute(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ruta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRoute ? 'Editar Ruta' : 'Añadir Nueva Ruta'}</DialogTitle>
                <DialogDescription>
                  {editingRoute ? 'Modifique los detalles de la ruta.' : 'Complete los detalles para crear una nueva ruta.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id_ruta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Ruta</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: R-01" {...field} disabled={!!editingRoute} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ruta_desc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ruta hacia las ciudades del este." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="geocerca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geocerca (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ej: POLYGON((long1 lat1, ...)) o GEOMETRYCOLLECTION(POLYGON(...))"
                            className="resize-y"
                            rows={4}
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter className="gap-2 pt-4">
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingRoute ? 'Guardar Cambios' : 'Guardar Ruta'}</Button>
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
                <TableHead>ID Ruta</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Geocerca Asignada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRoutes.map((route) => (
                <TableRow key={String(route.id_ruta)}>
                  <TableCell className="font-medium">{String(route.id_ruta)}</TableCell>
                  <TableCell>{route.ruta_desc}</TableCell>
                  <TableCell>
                    {route.geocerca 
                        ? <span className="font-mono text-xs p-1 bg-muted rounded">Sí</span> 
                        : <span className="text-muted-foreground">No</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(route)}>
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
                              Esta acción no se puede deshacer. Esto eliminará permanentemente la ruta.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(route.id_ruta)}>
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
          Mostrando <strong>{paginatedRoutes.length}</strong> de <strong>{routes.length}</strong> rutas.
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
