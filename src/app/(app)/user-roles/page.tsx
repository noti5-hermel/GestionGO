

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
import { PlusCircle, Trash2, Pencil } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const roleSchema = z.object({
  id_rol: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "El ID es requerido." })
  ),
  rol_desc: z.string().min(1, { message: "El nombre del rol es requerido." }),
})

type Role = z.infer<typeof roleSchema> & { id_rol: string | number }

export default function UserRolesPage() {
  const [roles, setRoles] = useState<Role[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const { toast } = useToast()

  const form = useForm<Role>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      id_rol: "",
      rol_desc: "",
    },
  })

  useEffect(() => {
    fetchRoles()
  }, [])

  useEffect(() => {
    if (editingRole) {
      form.reset({
        ...editingRole,
        id_rol: String(editingRole.id_rol),
      });
    } else {
      form.reset({ id_rol: "", rol_desc: "" });
    }
  }, [editingRole, form]);


  const fetchRoles = async () => {
    const { data, error } = await supabase.from('rol').select('id_rol, rol_desc')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los roles.",
        variant: "destructive",
      })
    } else {
      setRoles(data as Role[])
    }
  }

  const onSubmit = async (values: Role) => {
    let error;
    const roleData = {
      ...values,
      id_rol: parseInt(String(values.id_rol), 10)
    };
    
    if (editingRole) {
      const { error: updateError } = await supabase
        .from('rol')
        .update({ rol_desc: roleData.rol_desc })
        .eq('id_rol', editingRole.id_rol)
        .select()
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('rol')
        .insert([roleData])
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
        description: `Rol ${editingRole ? 'actualizado' : 'guardado'} correctamente.`,
      })
      fetchRoles()
      handleCloseDialog();
    }
  }

  const handleDelete = async (roleId: string | number) => {
    const { error } = await supabase
      .from('rol')
      .delete()
      .eq('id_rol', roleId)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el rol porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el rol.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Rol eliminado correctamente.",
      })
      fetchRoles()
    }
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingRole(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingRole(null);
    form.reset({ id_rol: "", rol_desc: "" });
    setIsDialogOpen(false);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Roles de Usuario</CardTitle>
            <CardDescription>Gestione los roles y permisos de los usuarios.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingRole(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Rol
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRole ? 'Editar Rol' : 'Añadir Nuevo Rol'}</DialogTitle>
                <DialogDescription>
                  {editingRole ? 'Modifique los detalles del rol.' : 'Complete los detalles para crear un nuevo rol de usuario.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id_rol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID del Rol</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: 4" {...field} type="number" disabled={!!editingRole} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rol_desc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre del Rol</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Visitante" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingRole ? 'Guardar Cambios' : 'Guardar Rol'}</Button>
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
                <TableHead>ID</TableHead>
                <TableHead>Nombre del Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={String(role.id_rol)}>
                  <TableCell className="font-medium">{String(role.id_rol)}</TableCell>
                  <TableCell>{role.rol_desc}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
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
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el rol.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(role.id_rol)}>
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
          Mostrando <strong>1-{roles.length}</strong> de <strong>{roles.length}</strong> roles.
        </div>
      </CardFooter>
    </Card>
  )
}
