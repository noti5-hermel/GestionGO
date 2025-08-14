
'use client'

import { useState, useEffect } from "react"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

const userSchema = z.object({
  name: z.string().min(1, { message: "El nombre es requerido." }),
  correo: z.string().email({ message: "Debe ser un correo electrónico válido." }),
  contraseña: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  id_rol: z.string().min(1, { message: "El rol es requerido." }),
})

type User = {
  id_usuario: string;
  name: string;
  correo: string;
  id_rol: string;
  avatar: string;
}

type Role = {
  id_rol: string
  rol_desc: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast()

  useEffect(() => {
    fetchRoles()
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('usuario').select('*')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios.",
        variant: "destructive",
      })
    } else {
      const usersWithAvatars = data.map(u => ({...u, avatar: "https://placehold.co/40x40.png"}))
      setUsers(usersWithAvatars as User[])
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

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      correo: "",
      contraseña: "",
      id_rol: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof userSchema>) => {
    const { error } = await supabase
      .from('usuario')
      .insert([
        { 
          name: values.name, 
          correo: values.correo, 
          contraseña: values.contraseña, 
          id_rol: values.id_rol 
        },
      ])
      .select()

    if (error) {
      toast({
        title: "Error al crear usuario",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Usuario creado correctamente.",
      })
      fetchUsers()
      form.reset()
      setIsDialogOpen(false)
    }
  }

  const getRoleName = (roleId: string) => {
    return roles.find(role => role.id_rol === roleId)?.rol_desc || "N/A"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Gestione los usuarios de la aplicación.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Complete los detalles para crear un nuevo usuario.
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
                          <Input type="password" placeholder="********" {...field} />
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un rol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id_rol} value={role.id_rol}>
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
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Usuario</Button>
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
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id_usuario}>
                <TableCell>{user.id_usuario}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="profile picture" />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </TableCell>
                <TableCell>{user.correo}</TableCell>
                <TableCell>{getRoleName(user.id_rol)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{users.length}</strong> de <strong>{users.length}</strong> usuarios.
        </div>
      </CardFooter>
    </Card>
  )
}
