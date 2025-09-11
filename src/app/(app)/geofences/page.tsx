
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
import { PlusCircle, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

/**
 * @file geofences/page.tsx
 * @description Página para la gestión de geocercas asociadas a clientes.
 * Permite crear y actualizar los datos de geometría de las geocercas.
 */

// Esquema de validación para el formulario de geocerca.
const geofenceSchema = z.object({
  code_customer: z.string().min(1, { message: "Debe seleccionar un cliente." }),
  geocerca: z.string().min(10, { message: "El campo de geocerca no puede estar vacío." })
    .refine(value => {
        try {
            const trimmedValue = value.trim();
            // Intenta validar si el string tiene un formato parecido a un polígono
            // Esta es una validación muy básica. PostGIS hará la validación real.
            return trimmedValue.toUpperCase().startsWith('POLYGON((') && trimmedValue.endsWith('))')
        } catch {
            return false
        }
    }, { message: "Formato de geocerca inválido. Debe ser un polígono, ej: POLYGON((...))" })
})

// Tipos de datos
type Customer = {
  code_customer: string;
  customer_name: string;
  geocerca: string | null;
}

/**
 * Componente principal de la página de Geocercas.
 */
export default function GeofencesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast()

  const form = useForm<z.infer<typeof geofenceSchema>>({
    resolver: zodResolver(geofenceSchema),
    defaultValues: {
      code_customer: "",
      geocerca: "",
    },
  })

  const fetchCustomers = useCallback(async () => {
    const { data, error } = await supabase.from('customer').select('code_customer, customer_name, geocerca')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes.",
        variant: "destructive",
      })
    } else {
      setCustomers(data as Customer[])
    }
  }, [toast])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])
  
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

  const onSubmit = async (values: z.infer<typeof geofenceSchema>) => {
    const { error } = await supabase
        .from('customer')
        .update({ geocerca: values.geocerca.trim() }) // Se guarda el valor sin espacios
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
      fetchCustomers()
      handleCloseDialog();
    }
  }

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
    form.reset({ code_customer: "", geocerca: "" });
    setIsDialogOpen(false);
  }

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
                              {customers.map((customer) => (
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
                            placeholder="Ej: POLYGON((long1 lat1, long2 lat2, ...))"
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
              {customers.map((customer) => (
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
      <CardFooter className="pt-6">
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{customers.length}</strong> de <strong>{customers.length}</strong> clientes.
        </div>
      </CardFooter>
    </Card>
  )
}
