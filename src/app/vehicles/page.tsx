
'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PlusCircle } from "lucide-react"

const vehicleSchema = z.object({
  plate: z.string().min(1, { message: "La placa del vehículo es requerida." }),
  description: z.string().min(1, { message: "La descripción es requerida." }),
})

type Vehicle = z.infer<typeof vehicleSchema>

const initialVehicles: Vehicle[] = [
  { plate: "ABC-123", description: "Camión de carga principal." },
  { plate: "DEF-456", description: "Furgoneta para entregas locales." },
  { plate: "GHI-789", description: "Camión refrigerado." },
]

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<Vehicle>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: "",
      description: "",
    },
  })

  const onSubmit = (values: Vehicle) => {
    setVehicles([...vehicles, values])
    form.reset()
    setIsDialogOpen(false)
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
                    name="plate"
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
                    name="description"
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.plate}>
                <TableCell className="font-medium">{vehicle.plate}</TableCell>
                <TableCell>{vehicle.description}</TableCell>
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
