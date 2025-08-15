
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
import { Checkbox } from "@/components/ui/checkbox"
import { PlusCircle, Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const shipmentSchema = z.object({
  id_ruta: z.string().min(1, "ID de ruta es requerido."),
  id_motorista: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "ID de motorista es requerido." })
  ),
  id_auxiliar: z.preprocess(
    (val) => String(val),
    z.string().min(1, { message: "ID de auxiliar es requerido." })
  ),
  total_contado: z.coerce.number().min(0),
  total_credito: z.coerce.number().min(0),
  total_general: z.coerce.number().min(0),
  fecha_despacho: z.string().min(1, "La fecha es requerida."),
  bodega: z.boolean().default(false),
  reparto: z.boolean().default(false),
  facturacion: z.boolean().default(false),
  asist_admon: z.boolean().default(false),
  cobros: z.boolean().default(false),
  gerente_admon: z.boolean().default(false),
})

type Shipment = z.infer<typeof shipmentSchema> & { id_despacho: string }
type Route = { id_ruta: string; ruta_desc: string }
type User = { id_user: string; name: string }

const StatusBadge = ({ checked }: { checked: boolean }) => {
  return <Badge variant={checked ? "default" : "outline"}>{checked ? "OK" : "Pend."}</Badge>
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [motoristas, setMotoristas] = useState<User[]>([])
  const [auxiliares, setAuxiliares] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof shipmentSchema>>({
    resolver: zodResolver(shipmentSchema),
    defaultValues: {
      id_ruta: "",
      id_motorista: "",
      id_auxiliar: "",
      total_contado: 0,
      total_credito: 0,
      total_general: 0,
      fecha_despacho: new Date().toISOString().split('T')[0],
      bodega: false,
      reparto: false,
      facturacion: false,
      asist_admon: false,
      cobros: false,
      gerente_admon: false,
    },
  })

  useEffect(() => {
    fetchShipments()
    fetchRoutes()
    fetchUsersByRole()
    fetchAllUsers()
  }, [])

  useEffect(() => {
    if (editingShipment) {
      form.reset({
        ...editingShipment,
        id_motorista: String(editingShipment.id_motorista),
        id_auxiliar: String(editingShipment.id_auxiliar),
      })
    } else {
      form.reset({
        id_ruta: "",
        id_motorista: "",
        id_auxiliar: "",
        total_contado: 0,
        total_credito: 0,
        total_general: 0,
        fecha_despacho: new Date().toISOString().split('T')[0],
        bodega: false,
        reparto: false,
        facturacion: false,
        asist_admon: false,
        cobros: false,
        gerente_admon: false,
      })
    }
  }, [editingShipment, form])

  const fetchAllUsers = async () => {
    const { data, error } = await supabase.from('usuario').select('id_user, name');
    if (error) {
      toast({ title: "Error", description: `No se pudieron cargar los usuarios: ${error.message}`, variant: "destructive" });
    } else {
      setUsers(data || []);
    }
  }

  const fetchShipments = async () => {
    const { data, error } = await supabase.from('despacho').select('*')
    if (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los despachos.",
        variant: "destructive",
      })
    } else {
      setShipments(data as Shipment[])
    }
  }

  const fetchRoutes = async () => {
    const { data, error } = await supabase.from('rutas').select('id_ruta, ruta_desc');
    if (error) {
        toast({
            title: "Error",
            description: "No se pudieron cargar las rutas.",
            variant: "destructive",
        });
    } else if (data) {
        setRoutes(data);
    }
  };

  const fetchUsersByRole = async () => {
    // Fetch Motoristas
    const { data: motoristaRoles, error: motoristaRolesError } = await supabase
      .from('rol')
      .select('id_rol')
      .ilike('rol_desc', '%motorista%');

    if (motoristaRolesError) {
      toast({ title: "Error al buscar rol motorista", description: motoristaRolesError.message, variant: "destructive" });
    } else if (motoristaRoles && motoristaRoles.length > 0) {
      const motoristaRoleIds = motoristaRoles.map(r => r.id_rol);
      const { data: motoristasData, error: motoristasError } = await supabase
        .from('usuario')
        .select('id_user, name')
        .in('id_rol', motoristaRoleIds);

      if (motoristasError) {
        toast({ title: "Error al cargar motoristas", description: motoristasError.message, variant: "destructive" });
      } else {
        setMotoristas(motoristasData || []);
      }
    }

    // Fetch Auxiliares
    const { data: auxiliaresData, error: auxiliaresError } = await supabase
        .from('usuario')
        .select('id_user, name')
        .eq('id_rol', 3);

    if (auxiliaresError) {
        toast({ title: "Error al cargar auxiliares", description: `No se pudieron cargar los auxiliares: ${auxiliaresError.message}`, variant: "destructive" });
    } else {
        setAuxiliares(auxiliaresData || []);
    }
  }

  const onSubmit = async (values: z.infer<typeof shipmentSchema>) => {
    let error;

    if (editingShipment) {
      const { error: updateError } = await supabase
        .from('despacho')
        .update(values)
        .eq('id_despacho', editingShipment.id_despacho)
        .select()
      error = updateError;
    } else {
       const { error: insertError } = await supabase
        .from('despacho')
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
        description: `Despacho ${editingShipment ? 'actualizado' : 'guardado'} correctamente.`,
      })
      fetchShipments()
      handleCloseDialog()
    }
  }

  const handleDelete = async (shipmentId: string) => {
    const { error } = await supabase
      .from('despacho')
      .delete()
      .eq('id_despacho', shipmentId)

    if (error) {
      toast({
        title: "Error al eliminar",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Éxito",
        description: "Despacho eliminado correctamente.",
      })
      fetchShipments()
    }
  }
  
  const handleEdit = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setIsDialogOpen(true);
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingShipment(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingShipment(null);
    form.reset({
        id_ruta: "",
        id_motorista: "",
        id_auxiliar: "",
        total_contado: 0,
        total_credito: 0,
        total_general: 0,
        fecha_despacho: new Date().toISOString().split('T')[0],
        bodega: false,
        reparto: false,
        facturacion: false,
        asist_admon: false,
        cobros: false,
        gerente_admon: false,
    });
    setIsDialogOpen(false);
  }

  const getRouteDescription = (routeId: string) => {
    if (!routes || routes.length === 0) return routeId;
    return routes.find(route => route.id_ruta === routeId)?.ruta_desc || routeId;
  }
  
  const getUserName = (userId: string) => {
    return users.find(user => user.id_user === userId)?.name || userId;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Despachos</CardTitle>
            <CardDescription>Gestione la información de sus envíos y estados.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingShipment(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Despacho
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingShipment ? 'Editar Despacho' : 'Crear Nuevo Despacho'}</DialogTitle>
                <DialogDescription>
                  {editingShipment ? 'Modifique los detalles del despacho.' : 'Complete todos los campos para registrar un nuevo despacho.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="id_ruta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ruta</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione una ruta">
                                          {getRouteDescription(field.value)}
                                        </SelectValue>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {routes.map((route) => (
                                        <SelectItem key={route.id_ruta} value={route.id_ruta}>
                                            {route.ruta_desc}
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
                      name="id_motorista"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Motorista</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un motorista">
                                          {getUserName(field.value)}
                                        </SelectValue>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {motoristas.map((motorista) => (
                                        <SelectItem key={motorista.id_user} value={motorista.id_user}>
                                            {motorista.name}
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
                      name="id_auxiliar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Auxiliar</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccione un auxiliar">
                                          {getUserName(field.value)}
                                        </SelectValue>
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {auxiliares.map((auxiliar) => (
                                        <SelectItem key={auxiliar.id_user} value={auxiliar.id_user}>
                                            {auxiliar.name}
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
                      name="total_contado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Contado</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_credito"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Crédito</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="total_general"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total General</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="fecha_despacho"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha Despacho</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Card>
                    <CardHeader><CardTitle>Estados</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="bodega"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Bodega</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="reparto"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Reparto</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="facturacion"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Facturación</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="asist_admon"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Asist. Admon.</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="cobros"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Cobros</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="gerente_admon"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Gerente Admon.</FormLabel>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary" onClick={handleCloseDialog}>Cancelar</Button>
                    </DialogClose>
                    <Button type="submit">{editingShipment ? 'Guardar Cambios' : 'Guardar Despacho'}</Button>
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
                <TableHead>ID Despacho</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Auxiliar</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>T. Contado</TableHead>
                <TableHead>T. Crédito</TableHead>
                <TableHead>T. General</TableHead>
                <TableHead>Bodega</TableHead>
                <TableHead>Reparto</TableHead>
                <TableHead>Facturación</TableHead>
                <TableHead>Asist. Admon.</TableHead>
                <TableHead>Cobros</TableHead>
                <TableHead>Gerente Admon.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.map((shipment) => (
                <TableRow key={shipment.id_despacho}>
                  <TableCell className="font-medium">{shipment.id_despacho}</TableCell>
                  <TableCell>{getRouteDescription(shipment.id_ruta)}</TableCell>
                  <TableCell>{getUserName(shipment.id_motorista)}</TableCell>
                  <TableCell>{getUserName(shipment.id_auxiliar)}</TableCell>
                  <TableCell>{shipment.fecha_despacho}</TableCell>
                  <TableCell>${shipment.total_contado.toFixed(2)}</TableCell>
                  <TableCell>${shipment.total_credito.toFixed(2)}</TableCell>
                  <TableCell>${shipment.total_general.toFixed(2)}</TableCell>
                  <TableCell><StatusBadge checked={shipment.bodega} /></TableCell>
                  <TableCell><StatusBadge checked={shipment.reparto} /></TableCell>
                  <TableCell><StatusBadge checked={shipment.facturacion} /></TableCell>
                  <TableCell><StatusBadge checked={shipment.asist_admon} /></TableCell>
                  <TableCell><StatusBadge checked={shipment.cobros} /></TableCell>
                  <TableCell><StatusBadge checked={shipment.gerente_admon} /></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(shipment)}>
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
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el despacho.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(shipment.id_despacho)}>
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
            Mostrando <strong>1-{shipments.length}</strong> de <strong>{shipments.length}</strong> despachos.
          </div>
        </CardFooter>
      </CardContent>
    </Card>
  )
}
