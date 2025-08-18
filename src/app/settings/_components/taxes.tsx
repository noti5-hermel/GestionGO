
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

const taxSchema = z.object({
  id_impuesto: z.string().min(1, { message: "El ID del impuesto es requerido." }),
  impt_desc: z.string().min(1, { message: "La descripción es requerida." }),
})

type Tax = z.infer<typeof taxSchema>

export default function Taxes() {
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const { toast } = useToast()

  const form = useForm<Tax>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      id_impuesto: "",
      impt_desc: "",
    },
  })

  useEffect(() => {
    fetchTaxes()
  }, [])

  useEffect(() => {
    if (editingTax) {
      form.reset(editingTax);
    } else {
      form.reset({ id_impuesto: "", impt_desc: "" });
    }
  }, [editingTax, form]);

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

  const onSubmit = async (values: Tax) => {
    let error;
    if (editingTax) {
      const { error: updateError } = await supabase
        .from('tipo_impuesto')
        .update(values)
        .eq('id_impuesto', editingTax.id_impuesto)
        .select()
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('tipo_impuesto')
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
        description: `Impuesto ${editingTax ? 'actualizado' : 'guardado'} correctamente.`,
      })
      fetchTaxes()
      handleCloseDialog();
    }
  }

  const handleDelete = async (taxId: string) => {
    const { error } = await supabase
      .from('tipo_impuesto')
      .delete()
      .eq('id_impuesto', taxId)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el impuesto porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el impuesto.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Impuesto eliminado correctamente.",
      })
      fetchTaxes()
    }
  }
  
  const handleEdit = (tax: Tax) => {
    setEditingTax(tax);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingTax(null);
    }
  };
  
  const handleCloseDialog = () => {
    setEditingTax(null);
    form.reset({ id_impuesto: "", impt_desc: "" });
    setIsDialogOpen(false);
  }

  return (
    <Card className="h-full flex flex-col p-0 border-0 shadow-none">
      <CardContent className="space-y-2 p-0 flex-1 overflow-hidden">
        <div className="flex justify-end items-center mb-4">
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingTax(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Impuesto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTax ? 'Editar Impuesto' : 'Añadir Nuevo Impuesto'}</DialogTitle>
                <DialogDescription>
                  {editingTax ? 'Modifique los detalles del impuesto.' : 'Complete los detalles para crear un nuevo impuesto.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id_impuesto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Impuesto</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: IVA-15" {...field} disabled={!!editingTax} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="impt_desc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Impuesto al Valor Agregado 15%" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingTax ? 'Guardar Cambios' : 'Guardar Impuesto'}</Button>
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
                <TableHead>ID Impuesto</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxes.map((tax) => (
                <TableRow key={tax.id_impuesto}>
                  <TableCell className="font-medium">{tax.id_impuesto}</TableCell>
                  <TableCell>{tax.impt_desc}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(tax)}>
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
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el impuesto.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(tax.id_impuesto)}>
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
          Mostrando <strong>1-{taxes.length}</strong> de <strong>{taxes.length}</strong> impuestos.
        </div>
      </CardFooter>
    </Card>
  )
}
