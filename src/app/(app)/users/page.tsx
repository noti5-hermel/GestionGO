'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import crypto from "crypto"
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

/**
 * @file users/page.tsx
 * @description Página para la gestión completa (CRUD) de usuarios.
 * Permite crear, editar y eliminar usuarios, así como asignarles roles.
 * Incluye hasheo de contraseñas para seguridad.
 */

// Esquema de validación para el formulario de usuario.
const userSchema = z.object({
  id_user: z.string().optional(),
  name: z.string().min(1, { message: "El nombre es requerido." }),
  correo: z.string().email({ message: "Debe ser un correo electrónico válido." }),
  // La contraseña es opcional durante la actualización para no forzar su cambio.
  contraseña: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }).optional().or(z.literal('')),
  id_rol: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "El rol es requerido." })
  ),
})

// Tipos de datos para la gestión de usuarios.
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

// Se lee la clave secreta desde las variables de entorno para el hash de contraseñas.
const HMAC_SECRET_KEY = process.env.NEXT_PUBLIC_HMAC_SECRET_KEY;

/**
 * Aplica un hash a la contraseña usando HMAC-SHA256 para mayor seguridad.
 * Nunca se debe guardar la contraseña en texto plano.
 * @param password La contraseña en texto plano.
 * @returns La contraseña hasheada en formato hexadecimal.
 */
function hashPassword(password: string): string {
  if (!HMAC_SECRET_KEY) {
    throw new Error("La clave secreta HMAC no está configurada en las variables de entorno.");
  }
  return crypto.createHmac('sha256', HMAC_SECRET_KEY).update(password).digest('hex');
}

/**
 * Componente principal de la página de Usuarios.
 * Gestiona el estado, la lógica y la interfaz para administrar usuarios.
 */
export default function UsersPage() {
  // --- ESTADOS ---
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast()

  // --- FORMULARIO ---
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      correo: "",
      contraseña: "",
      id_rol: "",
    },
  })

  // --- LÓGICA DE DATOS Y EFECTOS ---

  // Carga los datos iniciales (roles y usuarios) al montar el componente.
  useEffect(() => {
    fetchRoles()
    fetchUsers()
  }, [])
  
  // Rellena el formulario cuando se selecciona un usuario para editar.
  useEffect(() => {
    if (editingUser) {
      form.reset({
        id_user: String(editingUser.id_user),
        name: editingUser.name,
        correo: editingUser.correo,
        id_rol: String(editingUser.id_rol),
        contraseña: "", // La contraseña nunca se precarga por seguridad.
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

  /** Obtiene la lista de usuarios desde la base de datos. */
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

  /** Obtiene los roles desde la base de datos para el menú desplegable. */
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

  /**
   * Lógica para crear un nuevo usuario.
   * @param values Los datos del formulario validados por Zod.
   */
  const handleCreateUser = async (values: z.infer<typeof userSchema>) => {
    if (!values.contraseña) {
      toast({
        title: "Error de validación",
        description: "La contraseña es requerida para nuevos usuarios.",
        variant: "destructive",
      });
      return;
    }

    const userData = {
      name: values.name,
      correo: values.correo,
      id_rol: parseInt(String(values.id_rol), 10),
      contraseña: hashPassword(values.contraseña), // Hashear la contraseña antes de guardarla.
    };

    const { error } = await supabase.from('usuario').insert([userData]).select();

    if (error) {
      toast({
        title: "Error al crear usuario",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Usuario creado correctamente.",
      });
      fetchUsers();
      handleCloseDialog();
    }
  };

  /**
   * Lógica para actualizar un usuario existente.
   * @param values Los datos del formulario validados por Zod.
   */
  const handleUpdateUser = async (values: z.infer<typeof userSchema>) => {
    if (!editingUser) return;

    const userData: any = {
      name: values.name,
      correo: values.correo,
      id_rol: parseInt(String(values.id_rol), 10),
    };

    // Solo actualiza la contraseña si se ha proporcionado una nueva.
    if (values.contraseña) {
      userData.contraseña = hashPassword(values.contraseña);
    }

    const { error } = await supabase
      .from('usuario')
      .update(userData)
      .eq('id_user', parseInt(editingUser.id_user, 10));

    if (error) {
      toast({
        title: "Error al actualizar usuario",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Éxito",
        description: "Usuario actualizado correctamente.",
      });
      fetchUsers();
      handleCloseDialog();
    }
  };

  /** Determina si se debe crear o actualizar un usuario al enviar el formulario. */
  const onSubmit = (values: z.infer<typeof userSchema>) => {
    if (editingUser) {
      handleUpdateUser(values);
    } else {
      handleCreateUser(values);
    }
  };

  /**
   * Elimina un usuario de la base de datos.
   * @param userId El ID del usuario a eliminar.
   */
  const handleDelete = async (userId: string) => {
    const { error } = await supabase
        .from('usuario')
        .delete()
        .eq('id_user', userId)

    if (error) {
        if (error.code === '23503') {
            toast({
                title: "Error al eliminar",
                description: "No se puede eliminar el usuario porque está asociado a otros registros.",
                variant: "destructive",
            })
        } else {
            toast({
                title: "Error al eliminar",
                description: "Ocurrió un error inesperado al eliminar el usuario.",
                variant: "destructive",
            })
        }
    } else {
        toast({
            title: "Éxito",
            description: "Usuario eliminado correctamente.",
        })
        fetchUsers()
    }
  }
  
  // --- FUNCIONES AUXILIARES DE LA UI ---
  
  /** Prepara el formulario para editar un usuario. */
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsDialogOpen(true);
  }

  /** Controla la apertura y cierre del diálogo, reseteando el estado de edición. */
  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingUser(null);
    }
  };

  /** Cierra el diálogo y resetea el formulario. */
  const handleCloseDialog = () => {
    setEditingUser(null);
    form.reset({ name: "", correo: "", contraseña: "", id_rol: "" });
    setIsDialogOpen(false);
  }

  /** Obtiene el nombre del rol a partir de su ID para mostrarlo en la tabla. */
  const getRoleName = (roleId: string | number) => {
    return roles.find(role => String(role.id_rol) === String(roleId))?.rol_desc || "N/A"
  }

  // --- RENDERIZADO DEL COMPONENTE ---
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
                  {editingUser && (
                    <FormField
                      control={form.control}
                      name="id_user"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Usuario</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
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
                    <Button 
                        type="button" 
                        onClick={form.handleSubmit(onSubmit)}
                    >
                        {editingUser ? 'Guardar Cambios' : 'Guardar Usuario'}
                    </Button>
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
                <TableHead>ID Usuario</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, index) => (
                <TableRow key={user.id_user || index}>
                  <TableCell>{user.id_user}</TableCell>
                  <TableCell>
                    <span className="font-medium">{user.name}</span>
                  </TableCell>
                  <TableCell>{user.correo}</TableCell>
                  <TableCell>{getRoleName(user.id_rol)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end items-center gap-2">
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
          Mostrando <strong>1-{users.length}</strong> de <strong>{users.length}</strong> usuarios.
        </div>
      </CardFooter>
    </Card>
  )
}
