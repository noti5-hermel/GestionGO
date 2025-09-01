
'use client'

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import * as xlsx from "xlsx"
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
import { PlusCircle, Trash2, Pencil, Upload } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Esquema de validación para el formulario de cliente.
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

// Tipos de datos para la gestión de clientes.
type Customer = z.infer<typeof customerSchema> & { id_term: string | number, id_impuesto: string | number, ruta: string | number }
type PaymentTerm = { id_term: string | number; term_desc: string }
type Tax = { id_impuesto: string | number; impt_desc: string }

const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  // Estados para gestionar los datos de la página.
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Configuración del formulario con react-hook-form y Zod.
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

  // Carga los datos iniciales al montar el componente.
  useEffect(() => {
    fetchCustomers()
    fetchPaymentTerms()
    fetchTaxes()
  }, [])
  
  // Rellena el formulario cuando se selecciona un cliente para editar.
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

  // Obtiene los clientes desde la base de datos.
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

  // Obtiene los términos de pago desde la base de datos.
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

  // Obtiene los tipos de impuesto desde la base de datos.
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

  // Gestiona el envío del formulario para crear o actualizar un cliente.
  const onSubmit = async (values: z.infer<typeof customerSchema>) => {
    let error;

    if (editingCustomer) {
      // Actualiza un cliente existente.
      const { error: updateError } = await supabase
        .from('customer')
        .update(values)
        .eq('code_customer', editingCustomer.code_customer)
        .select()
      error = updateError;
    } else {
      // Inserta un nuevo cliente.
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
      fetchCustomers() // Recarga la lista de clientes.
      form.reset()
      setEditingCustomer(null)
      setIsDialogOpen(false)
    }
  }

  // Elimina un cliente de la base de datos.
  const handleDelete = async (customerId: string) => {
    const { error } = await supabase
      .from('customer')
      .delete()
      .eq('code_customer', customerId)

    if (error) {
      // Manejo de errores específicos, como la violación de claves foráneas.
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el cliente porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el cliente.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Cliente eliminado correctamente.",
      })
      fetchCustomers() // Recarga la lista de clientes.
    }
  }
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = xlsx.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = xlsx.utils.sheet_to_json(worksheet);

            const mappedData = json.map(row => ({
                code_customer: String(row.code_customer || ''),
                customer_name: String(row.customer_name || ''),
                id_impuesto: String(row.id_impuesto || ''),
                id_term: String(row.id_term || ''),
                ruta: String(row.ruta || ''),
            }));

            const validatedCustomers = z.array(customerSchema).safeParse(mappedData);

            if (!validatedCustomers.success) {
                const errorIssues = validatedCustomers.error.issues;
                const errorMessage = errorIssues
                    .map(issue => `Fila ${Number(issue.path[0]) + 2}: En columna '${issue.path[1]}', ${issue.message}`)
                    .join(' | ');

                console.error("Error de validación Zod:", validatedCustomers.error.flatten());
                toast({
                    title: "Error de validación",
                    description: errorMessage || "Algunos datos del archivo Excel no son correctos o están incompletos.",
                    variant: "destructive",
                    duration: 9000,
                });
                return;
            }
            
            const { error: insertError } = await supabase.from('customer').upsert(validatedCustomers.data);

            if (insertError) {
                toast({ title: "Error al importar", description: insertError.message, variant: "destructive" });
            } else {
                toast({ title: "Éxito", description: `${validatedCustomers.data.length} clientes importados/actualizados correctamente.` });
                fetchCustomers();
            }

        } catch (error) {
            console.error("Error al procesar el archivo:", error);
            toast({ title: "Error", description: "No se pudo procesar el archivo Excel.", variant: "destructive" });
        }
    };
    reader.readAsArrayBuffer(file);
    if(event.target) event.target.value = '';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Prepara el formulario para editar un cliente.
  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  }

  // Controla la apertura y cierre del diálogo, reseteando el estado de edición.
  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingCustomer(null);
    }
  };

  // Funciones para obtener descripciones legibles a partir de IDs.
  const getTaxDescription = (taxId: string | number) => {
    return taxes.find(tax => String(tax.id_impuesto) === String(taxId))?.impt_desc || taxId;
  }
  
  const getTermDescription = (termId: string | number) => {
      return paymentTerms.find(term => String(term.id_term) === String(termId))?.term_desc || termId;
  }

  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = customers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Gestione su base de clientes.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleImportClick} variant="outline">
                <Upload className="mr-2 h-4 w-4" /> Importar desde Excel
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".xlsx, .xls"
            />
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
                    <DialogFooter className="gap-2 pt-4">
                      <DialogClose asChild>
                        <Button type="button" variant="secondary" className="w-full sm:w-auto">Cancelar</Button>
                      </DialogClose>
                      <Button type="submit" className="w-full sm:w-auto">{editingCustomer ? 'Guardar Cambios' : 'Guardar Cliente'}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
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
              {paginatedCustomers.map((customer) => (
                <TableRow key={customer.code_customer}>
                  <TableCell className="font-medium">{customer.code_customer}</TableCell>
                  <TableCell>{customer.customer_name}</TableCell>
                  <TableCell>{customer.ruta}</TableCell>
                  <TableCell>{getTaxDescription(customer.id_impuesto)}</TableCell>
                  <TableCell>{getTermDescription(customer.id_term)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-2">
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
          Mostrando <strong>{paginatedCustomers.length}</strong> de <strong>{customers.length}</strong> clientes.
        </div>
      </CardFooter>
    </Card>
  )
}

    