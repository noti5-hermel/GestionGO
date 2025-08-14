
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
import { PlusCircle, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const vehicleSchema = z.object({
  placa_vehiculo: z.string().min(1, { message: "La placa del vehículo es requerida." }),
  vehiculo_desc: z.string().min(1, { message: "La descripción es requerida." }),
})

type Vehicle = z.infer<typeof vehicleSchema>

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast()

  useEffect(() => {
    fetchVehicles()
  }, [])

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

  const form = useForm<Vehicle>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      placa_vehiculo: "",
      vehiculo_desc: "",
    },
  })

  const onSubmit = async (values: Vehicle) => {
    const { error } = await supabase
      .from('vehiculos')
      .insert([values])
      .select()

    if (error) {
      toast({
        title: "Error al guardar",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Vehículo guardado correctamente.",
      })
      fetchVehicles()
      form.reset()
      setIsDialogOpen(false)
    }
  }

  const handleDelete = async (plate: string) => {
    const { error } = await supabase
      .from('vehiculos')
      .delete()
      .eq('placa_vehiculo', plate)

    if (error) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Vehículo eliminado correctamente.",
      })
      fetchVehicles()
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Vehículos</CardTitle>
            <CardDescription>Gestione la flota de vehículos.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Vehículo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Vehículo</DialogTitle>
                <DialogDescription>
                  Complete los detalles para registrar un nuevo vehículo.
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
                          <Input placeholder="Ej: JKL-012" {...field} />
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
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Vehículo</Button>
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
              <TableHead>Placa Vehículo</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.placa_vehiculo}>
                <TableCell className="font-medium">{vehicle.placa_vehiculo}</TableCell>
                <TableCell>{vehicle.vehiculo_desc}</TableCell>
                <TableCell className="text-right">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{vehicles.length}</strong> de <strong>{vehicles.length}</strong> vehículos.
        </div>
      </CardFooter>
    </Card>
  )
}
