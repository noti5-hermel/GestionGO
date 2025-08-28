
'use client'

import { UseFormReturn } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import type { Shipment, Route, User } from "@/hooks/use-shipments"

// Esquema de validación para el formulario de despacho.
const shipmentSchema = z.object({
  id_ruta: z.preprocess(
    (val) => String(val),
    z.string().min(1, "ID de ruta es requerido.")
  ),
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

type ShipmentFormValues = z.infer<typeof shipmentSchema>;
type ReviewRole = keyof Pick<Shipment, 'bodega' | 'reparto' | 'asist_admon' | 'gerente_admon' | 'cobros'>;

interface ShipmentFormProps {
  children: React.ReactNode;
  form: UseFormReturn<ShipmentFormValues>;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  editingShipment: Shipment | null;
  setEditingShipment: (shipment: Shipment | null) => void;
  onSubmit: (values: ShipmentFormValues) => void;
  handleCloseDialog: () => void;
  routes: Route[];
  motoristas: User[];
  auxiliares: User[];
  users: User[];
  getRouteDescription: (routeId: string) => string;
  getUserName: (userId: string) => string;
  reviewRole: ReviewRole | null;
}

export function ShipmentForm({
  children,
  form,
  isOpen,
  setIsOpen,
  editingShipment,
  onSubmit,
  handleCloseDialog,
  routes,
  motoristas,
  auxiliares,
  reviewRole,
}: ShipmentFormProps) {
  
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      handleCloseDialog();
    }
  };

  const routeOptions = routes.map(route => ({
    value: String(route.id_ruta),
    label: route.ruta_desc,
  }));

  const motoristaOptions = motoristas.map(motorista => ({
    value: String(motorista.id_user),
    label: motorista.name,
  }));

  const auxiliarOptions = auxiliares.map(auxiliar => ({
    value: String(auxiliar.id_user),
    label: auxiliar.name,
  }));

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
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
            <fieldset disabled={!!reviewRole} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="id_ruta"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Ruta</FormLabel>
                    <FormControl>
                      <Combobox
                        options={routeOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Seleccione una ruta"
                        searchPlaceholder="Buscar ruta..."
                        emptyText="No se encontró la ruta."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id_motorista"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Motorista</FormLabel>
                    <FormControl>
                      <Combobox
                        options={motoristaOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Seleccione un motorista"
                        searchPlaceholder="Buscar motorista..."
                        emptyText="No se encontró el motorista."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="id_auxiliar"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Auxiliar</FormLabel>
                    <FormControl>
                       <Combobox
                        options={auxiliarOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Seleccione un auxiliar"
                        searchPlaceholder="Buscar auxiliar..."
                        emptyText="No se encontró el auxiliar."
                      />
                    </FormControl>
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
            </fieldset>
            {editingShipment && (
              <Card>
                <CardHeader><CardTitle>Estados</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="facturacion"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!!reviewRole}
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
                    name="bodega"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!!reviewRole && reviewRole !== 'bodega'}
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
                            disabled={!!reviewRole && reviewRole !== 'reparto'}
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
                    name="asist_admon"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!!reviewRole && reviewRole !== 'asist_admon'}
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
                    name="gerente_admon"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!!reviewRole && reviewRole !== 'gerente_admon'}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Gerente Admon.</FormLabel>
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
                            disabled={!!reviewRole && reviewRole !== 'cobros'}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Cobros</FormLabel>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}
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
  )
}
