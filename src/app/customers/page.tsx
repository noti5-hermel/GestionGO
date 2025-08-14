
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle } from "lucide-react"

const customerSchema = z.object({
  code: z.string().min(1, { message: "El código es requerido." }),
  name: z.string().min(1, { message: "El nombre es requerido." }),
  taxCode: z.string().min(1, { message: "El código de impuesto es requerido." }),
  paymentTermId: z.string().min(1, { message: "El término de pago es requerido." }),
  routeNumber: z.string().min(1, { message: "El número de ruta es requerido." }),
  geofence: z.string().min(1, { message: "La geocerca es requerida." }),
})

type Customer = z.infer<typeof customerSchema>

const initialCustomers: Customer[] = [
  { code: "C001", name: "Juan Pérez", taxCode: "JP123", paymentTermId: "Neto-30", routeNumber: "Ruta-Norte", geofence: "Zona A" },
  { code: "C002", name: "Maria García", taxCode: "MG456", paymentTermId: "Pago-Inmediato", routeNumber: "Ruta-Sur", geofence: "Zona B" },
]

const paymentTerms = [
  { id: "Neto-30", description: "Pago requerido en 30 días." },
  { id: "Neto-60", description: "Pago requerido en 60 días." },
  { id: "Pago-Inmediato", description: "Pago requerido al momento de la entrega." },
]

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code: "",
      name: "",
      taxCode: "",
      paymentTermId: "",
      routeNumber: "",
      geofence: "",
    },
  })

  const onSubmit = (values: Customer) => {
    setCustomers([...customers, values])
    form.reset()
    setIsDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gestione su base de clientes.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Cliente</DialogTitle>
                <DialogDescription>
                  Complete los detalles para crear un nuevo cliente.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Cliente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: C003" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
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
                    name="taxCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código de Impuesto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: CR789" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="paymentTermId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Término de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un término de pago" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentTerms.map((term) => (
                              <SelectItem key={term.id} value={term.id}>
                                {term.id}
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
                    name="routeNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número de Ruta</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ruta-Local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="geofence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geocerca</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Zona C" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Cliente</Button>
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
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cód. Impuesto</TableHead>
              <TableHead>Térm. Pago</TableHead>
              <TableHead>Nro. Ruta</TableHead>
              <TableHead>Geocerca</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.code}>
                <TableCell className="font-medium">{customer.code}</TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.taxCode}</TableCell>
                <TableCell>{customer.paymentTermId}</TableCell>
                <TableCell>{customer.routeNumber}</TableCell>
                <TableCell>{customer.geofence}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{customers.length}</strong> de <strong>{customers.length}</strong> clientes.
        </div>
      </CardFooter>
    </Card>
  )
}
