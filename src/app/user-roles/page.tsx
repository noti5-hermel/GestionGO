
'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PlusCircle } from "lucide-react"

const roleSchema = z.object({
  id: z.string().min(1, { message: "El ID es requerido." }),
  name: z.string().min(1, { message: "El nombre del rol es requerido." }),
})

type Role = z.infer<typeof roleSchema>

const initialRoles: Role[] = [
  { id: "1", name: "Administrador" },
  { id: "2", name: "Gerente" },
  { id: "3", name: "Operador" },
]

export default function UserRolesPage() {
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<Role>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      id: "",
      name: "",
    },
  })

  const onSubmit = (values: Role) => {
    setRoles([...roles, values])
    form.reset()
    setIsDialogOpen(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Roles de Usuario</CardTitle>
            <CardDescription>Gestione los roles y permisos de los usuarios.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Rol
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Añadir Nuevo Rol</DialogTitle>
                <DialogDescription>
                  Complete los detalles para crear un nuevo rol de usuario.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID del Rol</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: 4" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="name"
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
                      <Button type="button" variant="secondary">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">Guardar Rol</Button>
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
              <TableHead>Nombre del Rol</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium">{role.id}</TableCell>
                <TableCell>{role.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-{roles.length}</strong> de <strong>{roles.length}</strong> roles.
        </div>
      </CardFooter>
    </Card>
  )
}
