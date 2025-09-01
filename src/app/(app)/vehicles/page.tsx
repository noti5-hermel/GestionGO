
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

const vehicleSchema = z.object({
  placa_vehiculo: z.string().min(1, { message: "La placa del vehículo es requerida." }),
  vehiculo_desc: z.string().min(1, { message: "La descripción es requerida." }),
})

type Vehicle = z.infer<typeof vehicleSchema>

const ITEMS_PER_PAGE = 10;

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const { toast } = useToast()
  const [currentPage, setCurrentPage] = useState(1);

  const form = useForm<Vehicle>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      placa_vehiculo: "",
      vehiculo_desc: "",
    },
  })

  useEffect(() => {
    fetchVehicles()
  }, [])

  useEffect(() => {
    if (editingVehicle) {
      form.reset(editingVehicle);
    } else {
      form.reset({ placa_vehiculo: "", vehiculo_desc: "" });
    }
  }, [editingVehicle, form]);

  const fetchVehicles = async () => {
    const { data, error } = await supabase.from('vehiculos').select('placa_vehiculo, vehiculo_desc')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos.",
        variant: "destructive",
      })
    } else {
      setVehicles(data as Vehicle[])
    }
  }

  const onSubmit = async (values: Vehicle) => {
    let error;
    if (editingVehicle) {
      const { error: updateError } = await supabase
        .from('vehiculos')
        .update(values)
        .eq('placa_vehiculo', editingVehicle.placa_vehiculo)
        .select()
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('vehiculos')
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
        description: `Vehículo ${editingVehicle ? 'actualizado' : 'guardado'} correctamente.`,
      })
      fetchVehicles()
      handleCloseDialog();
    }
  }

  const handleDelete = async (plate: string) => {
    const { error } = await supabase
      .from('vehiculos')
      .delete()
      .eq('placa_vehiculo', plate)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el vehículo porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el vehículo.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Vehículo eliminado correctamente.",
      })
      fetchVehicles()
    }
  }

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingVehicle(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingVehicle(null);
    form.reset({ placa_vehiculo: "", vehiculo_desc: "" });
    setIsDialogOpen(false);
  }

  const totalPages = Math.ceil(vehicles.length / ITEMS_PER_PAGE);
  const paginatedVehicles = vehicles.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Vehículos</CardTitle>
            <CardDescription>Gestione la flota de vehículos.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingVehicle(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Vehículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingVehicle ? 'Editar Vehículo' : 'Añadir Nuevo Vehículo'}</DialogTitle>
                <DialogDescription>
                  {editingVehicle ? 'Modifique los detalles del vehículo.' : 'Complete los detalles para registrar un nuevo vehículo.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="placa_vehiculo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa Vehículo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: JKL-012" {...field} disabled={!!editingVehicle} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vehiculo_desc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Camioneta para despachos urgentes." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingVehicle ? 'Guardar Cambios' : 'Guardar Vehículo'}</Button>
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
                <TableHead>Placa Vehículo</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVehicles.map((vehicle) => (
                <TableRow key={vehicle.placa_vehiculo}>
                  <TableCell className="font-medium">{vehicle.placa_vehiculo}</TableCell>
                  <TableCell>{vehicle.vehiculo_desc}</TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(vehicle)}>
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
                              Esta acción no se puede deshacer. Esto eliminará permanentemente el vehículo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(vehicle.placa_vehiculo)}>
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
      <CardFooter className="pt-6 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
        </div>
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                Anterior
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
            >
                Siguiente
            </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{paginatedVehicles.length}</strong> de <strong>{vehicles.length}</strong> vehículos.
        </div>
      </CardFooter>
    </Card>
  )
}
