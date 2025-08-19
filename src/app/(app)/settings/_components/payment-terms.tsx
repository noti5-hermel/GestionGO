

'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { Card, CardFooter, CardContent } from "@/components/ui/card"

const paymentTermSchema = z.object({
  id_term: z.string().min(1, { message: "El ID del término es requerido." }),
  term_desc: z.string().min(1, { message: "La descripción es requerida." }),
})

type PaymentTerm = z.infer<typeof paymentTermSchema>

export default function PaymentTerms() {
  const [terms, setTerms] = useState<PaymentTerm[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<PaymentTerm | null>(null);
  const { toast } = useToast()

  const form = useForm<PaymentTerm>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      id_term: "",
      term_desc: "",
    },
  })

  useEffect(() => {
    fetchTerms()
  }, [])

  useEffect(() => {
    if (editingTerm) {
      form.reset(editingTerm);
    } else {
      form.reset({ id_term: "", term_desc: "" });
    }
  }, [editingTerm, form]);

  const fetchTerms = async () => {
    const { data, error } = await supabase.from('terminos_pago').select('id_term, term_desc')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los términos de pago.",
        variant: "destructive",
      })
    } else {
      setTerms(data as PaymentTerm[])
    }
  }

  const onSubmit = async (values: PaymentTerm) => {
    let error;
    if (editingTerm) {
      const { error: updateError } = await supabase
        .from('terminos_pago')
        .update(values)
        .eq('id_term', editingTerm.id_term)
        .select()
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('terminos_pago')
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
        description: `Término de pago ${editingTerm ? 'actualizado' : 'guardado'} correctamente.`,
      })
      fetchTerms()
      handleCloseDialog();
    }
  }

  const handleDelete = async (termId: string) => {
    const { error } = await supabase
      .from('terminos_pago')
      .delete()
      .eq('id_term', termId)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el término de pago porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el término.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Término de pago eliminado correctamente.",
      })
      fetchTerms()
    }
  }
  
  const handleEdit = (term: PaymentTerm) => {
    setEditingTerm(term);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingTerm(null);
    }
  };
  
  const handleCloseDialog = () => {
    setEditingTerm(null);
    form.reset({ id_term: "", term_desc: "" });
    setIsDialogOpen(false);
  }

  return (
    <Card className="h-full flex flex-col p-0 border-0 shadow-none">
      <CardContent className="space-y-2 p-0 flex-1 overflow-hidden">
        <div className="flex justify-end items-center mb-4">
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingTerm(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Término
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTerm ? 'Editar Término de Pago' : 'Añadir Nuevo Término de Pago'}</DialogTitle>
                <DialogDescription>
                  {editingTerm ? 'Modifique los detalles del término.' : 'Complete los detalles para crear un nuevo término de pago.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id_term"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Término</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Neto-15" {...field} disabled={!!editingTerm} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="term_desc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Pago requerido en 15 días." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingTerm ? 'Guardar Cambios' : 'Guardar Término'}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="relative w-full overflow-auto h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Término</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {terms.map((term) => (
                <TableRow key={term.id_term}>
                  <TableCell className="font-medium">{term.id_term}</TableCell>
                  <TableCell>{term.term_desc}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(term)}>
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
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el término de pago.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(term.id_term)}>
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
          Mostrando <strong>1-{terms.length}</strong> de <strong>{terms.length}</strong> términos.
        </div>
      </CardFooter>
    </Card>
  )
}
