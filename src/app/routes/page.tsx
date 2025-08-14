
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

const routeSchema = z.object({
  id: z.string().min(1, { message: "El ID de la ruta es requerido." }),
  description: z.string().min(1, { message: "La descripción es requerida." }),
})

type Route = z.infer<typeof routeSchema>

const initialRoutes: Route[] = [
  { id: "Ruta-Norte", description: "Ruta hacia el norte del país." },
  { id: "Ruta-Sur", description: "Ruta hacia el sur del país." },
  { id: "Ruta-Local", description: "Ruta de distribución local." },
]

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes)
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<Route>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      id: "",
      description: "",
    },
  })

  const onSubmit = (values: Route) => {
    setRoutes([...routes, values])
    form.reset()
    setIsDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Rutas</CardTitle>
            <CardDescription>Gestione las rutas de despacho.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ruta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nueva Ruta</DialogTitle>
                <DialogDescription>
                  Complete los detalles para crear una nueva ruta.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Ruta</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ruta-Este" {...field} />
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
                          <Input placeholder="Ej: Ruta hacia las ciudades del este." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Ruta</Button>
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
              <TableHead>ID Ruta</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.map((route) => (
              <TableRow key={route.id}>
                <TableCell className="font-medium">{route.id}</TableCell>
                <TableCell>{route.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{routes.length}</strong> de <strong>{routes.length}</strong> rutas.
        </div>
      </CardFooter>
    </Card>
  )
}
