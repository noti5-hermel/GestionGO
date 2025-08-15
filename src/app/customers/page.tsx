
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
import { PlusCircle, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const customerSchema = z.object({
  code_customer: z.string().min(1, { message: "El código es requerido." }),
  customer_name: z.string().min(1, { message: "El nombre es requerido." }),
  id_impuesto: z.string().min(1, { message: "El ID de impuesto es requerido." }),
  id_term: z.string().min(1, { message: "El término de pago es requerido." }),
  ruta: z.string().min(1, { message: "El número de ruta es requerido." }),
})

type Customer = z.infer<typeof customerSchema>

type PaymentTerm = {
  id_term: string
  term_desc: string
}

type Tax = {
    id_impuesto: string
    impt_desc: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast()

  useEffect(() => {
    fetchCustomers()
    fetchPaymentTerms()
    fetchTaxes()
  }, [])

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

  const form = useForm<Customer>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      code_customer: "",
      customer_name: "",
      id_impuesto: "",
      id_term: "",
      ruta: "",
    },
  })

  const onSubmit = async (values: Customer) => {
    const { error } = await supabase
      .from('customer')
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
        description: "Cliente guardado correctamente.",
      })
      fetchCustomers()
      form.reset()
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

  const getTaxDescription = (taxId: string) => {
    return taxes.find(tax => tax.id_impuesto === taxId)?.impt_desc || taxId;
  }
  
  const getTermDescription = (termId: string) => {
      return paymentTerms.find(term => term.id_term === termId)?.term_desc || termId;
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
                    name="code_customer"
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
                    name="id_impuesto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Impuesto</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un impuesto" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {taxes.map((tax) => (
                                    <SelectItem key={tax.id_impuesto} value={tax.id_impuesto}>
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
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un término de pago" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentTerms.map((term) => (
                              <SelectItem key={term.id_term} value={term.id_term}>
                                {term.term_desc}
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
                    name="ruta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ruta</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ruta-Local" {...field} />
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
              <TableHead>Impuesto</TableHead>
              <TableHead>Térm. Pago</TableHead>
              <TableHead>Ruta</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.code_customer}>
                <TableCell className="font-medium">{customer.code_customer}</TableCell>
                <TableCell>{customer.customer_name}</TableCell>
                <TableCell>{getTaxDescription(customer.id_impuesto)}</TableCell>
                <TableCell>{getTermDescription(customer.id_term)}</TableCell>
                <TableCell>{customer.ruta}</TableCell>
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
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{customers.length}</strong> de <strong>{customers.length}</strong> clientes.
        </div>
      </CardFooter>
    </Card>
  )
}

    

    