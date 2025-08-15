
'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PlusCircle, Trash2, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const customerSchema = z.object({
  code_customer: z.string().min(1, { message: "El código es requerido." }),
  customer_name: z.string().min(1, { message: "El nombre es requerido." }),
  id_impuesto: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "El ID de impuesto es requerido." })
  ),
  id_term: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "El término de pago es requerido." })
  ),
  ruta: z.string().min(1, { message: "La ruta es requerida." }),
})

type Customer = z.infer<typeof customerSchema> & { id_term: string | number, id_impuesto: string | number, ruta: string | number }


type PaymentTerm = {
  id_term: string | number
  term_desc: string
}

type Tax = {
    id_impuesto: string | number
    impt_desc: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast()

  const form = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code_customer: "",
      customer_name: "",
      id_impuesto: "",
      id_term: "",
      ruta: "",
    },
  })

  useEffect(() => {
    fetchCustomers()
    fetchPaymentTerms()
    fetchTaxes()
  }, [])
  
  useEffect(() => {
    if (editingCustomer) {
      form.reset({
        ...editingCustomer,
        id_impuesto: String(editingCustomer.id_impuesto),
        id_term: String(editingCustomer.id_term),
        ruta: String(editingCustomer.ruta),
      });
    } else {
      form.reset({
        code_customer: "",
        customer_name: "",
        id_impuesto: "",
        id_term: "",
        ruta: "",
      });
    }
  }, [editingCustomer, form]);


  const fetchCustomers = async () => {
    const { data, error } = await supabase.from('customer').select('code_customer,customer_name,id_impuesto,id_term,ruta')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los clientes.",
        variant: "destructive",
      })
    } else {
      setCustomers(data as Customer[])
    }
  }

  const fetchPaymentTerms = async () => {
    const { data, error } = await supabase.from('terminos_pago').select('id_term, term_desc')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los términos de pago.",
        variant: "destructive",
      })
    } else {
      setPaymentTerms(data as PaymentTerm[])
    }
  }

  const fetchTaxes = async () => {
    const { data, error } = await supabase.from('tipo_impuesto').select('id_impuesto, impt_desc')
    if (error) {
        toast({
            title: "Error",
            description: "No se pudieron cargar los impuestos.",
            variant: "destructive",
        })
    } else {
        setTaxes(data as Tax[])
    }
  }

  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    let error;

    if (editingCustomer) {
      const { error: updateError } = await supabase
        .from('customer')
        .update(values)
        .eq('code_customer', editingCustomer.code_customer)
        .select()
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('customer')
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
        description: `Cliente ${editingCustomer ? 'actualizado' : 'guardado'} correctamente.`,
      })
      fetchCustomers()
      form.reset()
      setEditingCustomer(null)
      setIsDialogOpen(false)
    }
  }

  const handleDelete = async (customerId: string) => {
    const { error } = await supabase
      .from('customer')
      .delete()
      .eq('code_customer', customerId)

    if (error) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Cliente eliminado correctamente.",
      })
      fetchCustomers()
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

  const getTaxDescription = (taxId: string | number) => {
    return taxes.find(tax => String(tax.id_impuesto) === String(taxId))?.impt_desc || taxId;
  }
  
  const getTermDescription = (termId: string | number) => {
      return paymentTerms.find(term => String(term.id_term) === String(termId))?.term_desc || termId;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gestione su base de clientes.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCustomer(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCustomer ? 'Editar Cliente' : 'Añadir Nuevo Cliente'}</DialogTitle>
                <DialogDescription>
                  {editingCustomer ? 'Modifique los detalles del cliente.' : 'Complete los detalles para crear un nuevo cliente.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="code_customer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código Cliente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: C003" {...field} disabled={!!editingCustomer} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customer_name"
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
                    name="ruta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruta</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ruta 15" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="id_impuesto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impuesto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={String(field.value)}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un impuesto">
                                        {getTaxDescription(field.value)}
                                    </SelectValue>
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {taxes.map((tax) => (
                                    <SelectItem key={String(tax.id_impuesto)} value={String(tax.id_impuesto)}>
                                        {tax.impt_desc}
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
                    name="id_term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Término de Pago</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={String(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccione un término de pago">
                                    {getTermDescription(field.value)}
                                </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentTerms.map((term) => (
                              <SelectItem key={String(term.id_term)} value={String(term.id_term)}>
                                {term.term_desc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingCustomer ? 'Guardar Cambios' : 'Guardar Cliente'}</Button>
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
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Impuesto</TableHead>
                <TableHead>Térm. Pago</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.code_customer}>
                  <TableCell className="font-medium">{customer.code_customer}</TableCell>
                  <TableCell>{customer.customer_name}</TableCell>
                  <TableCell>{customer.ruta}</TableCell>
                  <TableCell>{getTaxDescription(customer.id_impuesto)}</TableCell>
                  <TableCell>{getTermDescription(customer.id_term)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(customer)}>
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
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el cliente.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(customer.code_customer)}>
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
        <CardFooter className="pt-6">
          <div className="text-xs text-muted-foreground">
            Mostrando <strong>1-{customers.length}</strong> de <strong>{customers.length}</strong> clientes.
          </div>
        </CardFooter>
      </CardContent>
    </Card>
  )
}

    