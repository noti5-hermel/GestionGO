
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
import { PlusCircle, Trash2, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const routeSchema = z.object({
  id_ruta: z.string().min(1, { message: "El ID de la ruta es requerido." }),
  ruta_desc: z.string().min(1, { message: "La descripción es requerida." }),
})

type Route = z.infer<typeof routeSchema>

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const { toast } = useToast()

  const form = useForm<Route>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      id_ruta: "",
      ruta_desc: "",
    },
  })
  
  useEffect(() => {
    fetchRoutes()
  }, [])

  useEffect(() => {
    if (editingRoute) {
      form.reset(editingRoute);
    } else {
      form.reset({ id_ruta: "", ruta_desc: "" });
    }
  }, [editingRoute, form]);

  const fetchRoutes = async () => {
    const { data, error } = await supabase.from('rutas').select('id_ruta, ruta_desc')
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

  const onSubmit = async (values: Route) => {
    let error;
    if (editingRoute) {
      const { error: updateError } = await supabase
        .from('rutas')
        .update(values)
        .eq('id_ruta', editingRoute.id_ruta)
        .select()
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('rutas')
        .insert([values])
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

  const handleDelete = async (routeId: string) => {
    const { error } = await supabase
      .from('rutas')
      .delete()
      .eq('id_ruta', routeId)

    if (error) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      })
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
    form.reset({ id_ruta: "", ruta_desc: "" });
    setIsDialogOpen(false);
  }

  return (
    <Card>
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
            <DialogContent>
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
                          <Input placeholder="Ej: Ruta-Este" {...field} disabled={!!editingRoute} />
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
                  <DialogFooter>
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
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Ruta</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route) => (
                <TableRow key={route.id_ruta}>
                  <TableCell className="font-medium">{route.id_ruta}</TableCell>
                  <TableCell>{route.ruta_desc}</TableCell>
                  <TableCell className="text-right">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="pt-6">
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{routes.length}</strong> de <strong>{routes.length}</strong> rutas.
        </div>
      </CardFooter>
    </Card>
  )
}
