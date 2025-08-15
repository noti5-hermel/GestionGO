
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
import { PlusCircle, Pencil, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const userSchema = z.object({
  id_user: z.string().optional(),
  name: z.string().min(1, { message: "El nombre es requerido." }),
  correo: z.string().email({ message: "Debe ser un correo electrónico válido." }),
  contraseña: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }).optional().or(z.literal('')),
  id_rol: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "El rol es requerido." })
  ),
})

type User = {
  id_user: string;
  name: string;
  correo: string;
  id_rol: string | number;
}

type Role = {
  id_rol: string | number
  rol_desc: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast()

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      correo: "",
      contraseña: "",
      id_rol: "",
    },
  })

  useEffect(() => {
    fetchRoles()
    fetchUsers()
  }, [])
  
  useEffect(() => {
    if (editingUser) {
      form.reset({
        id_user: editingUser.id_user,
        name: editingUser.name,
        correo: editingUser.correo,
        id_rol: String(editingUser.id_rol),
        contraseña: "", // No pre-cargamos la contraseña por seguridad
      });
    } else {
      form.reset({
        name: "",
        correo: "",
        contraseña: "",
        id_rol: "",
      });
    }
  }, [editingUser, form]);

  const fetchUsers = async () => {
    let { data: usuario, error } = await supabase
      .from('usuario')
      .select('*')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
        variant: "destructive",
      })
    } else {
      setUsers((usuario || []) as User[])
    }
  }

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

  const onSubmit = async (values: z.infer<typeof userSchema>) => {
    let error;
    const userData: any = { 
        name: values.name, 
        correo: values.correo, 
        id_rol: parseInt(String(values.id_rol), 10) 
    };
    
    if (values.id_user) {
      userData.id_user = values.id_user;
    }

    if (values.contraseña) {
        userData.contraseña = values.contraseña;
    }

    if (editingUser) {
        const { error: updateError } = await supabase
            .from('usuario')
            .update(userData)
            .eq('id_user', editingUser.id_user)
            .select()
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from('usuario')
            .insert([userData])
            .select()
        error = insertError;
    }

    if (error) {
      toast({
        title: "Error al guardar usuario",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: `Usuario ${editingUser ? 'actualizado' : 'creado'} correctamente.`,
      })
      fetchUsers()
      handleCloseDialog();
    }
  }

  const handleDelete = async (userId: string) => {
    const { error } = await supabase
        .from('usuario')
        .delete()
        .eq('id_user', userId)

    if (error) {
        toast({
            title: "Error al eliminar",
            description: error.message,
            variant: "destructive",
        })
    } else {
        toast({
            title: "Éxito",
            description: "Usuario eliminado correctamente.",
        })
        fetchUsers()
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingUser(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingUser(null);
    form.reset({ name: "", correo: "", contraseña: "", id_rol: "" });
    setIsDialogOpen(false);
  }

  const getRoleName = (roleId: string | number) => {
    return roles.find(role => String(role.id_rol) === String(roleId))?.rol_desc || "N/A"
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Gestione los usuarios de la aplicación.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingUser(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}</DialogTitle>
                <DialogDescription>
                  {editingUser ? 'Modifique los detalles del usuario.' : 'Complete los detalles para crear un nuevo usuario.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Juan Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="correo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo Electrónico</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Ej: juan.perez@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contraseña"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder={editingUser ? "Dejar en blanco para no cambiar" : "********"} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="id_rol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol de Usuario</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={String(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={String(role.id_rol)} value={String(role.id_rol)}>
                                {role.rol_desc}
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
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingUser ? 'Guardar Cambios' : 'Guardar Usuario'}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="relative w-full overflow-auto h-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={user.id_user || index}>
                  <TableCell>
                    <span className="font-medium">{user.name}</span>
                  </TableCell>
                  <TableCell>{user.correo}</TableCell>
                  <TableCell>{getRoleName(user.id_rol)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
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
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el usuario.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(user.id_user)}>
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
          Mostrando <strong>1-{users.length}</strong> de <strong>{users.length}</strong> usuarios.
        </div>
      </CardFooter>
    </Card>
  )
}
