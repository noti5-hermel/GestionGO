
'use client'

import { useState, useEffect, useMemo, useRef } from "react"
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
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Pencil, Trash2, Upload } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

const BUCKET_NAME = 'comprobante';

// Esquema de validación para el formulario de facturación por despacho.
const shipmentInvoiceSchema = z.object({
  id_factura: z.string().min(1, "El ID de factura es requerido."),
  id_despacho: z.preprocess(
    (val) => String(val),
    z.string().min(1, "El ID de despacho es requerido.")
  ),
  comprobante: z.string().optional(), // La URL de la imagen se manejará por separado.
  forma_pago: z.enum(["Efectivo", "Tarjeta", "Transferencia"]),
  monto: z.coerce.number().min(0, "El monto debe ser un número positivo."),
  state: z.boolean(),
})

// Tipos de datos para la gestión de facturación por despacho.
type ShipmentInvoice = z.infer<typeof shipmentInvoiceSchema> & { id_fac_desp: number, comprobante: string }
type Invoice = { id_factura: string, invoice_number: string | number, fecha: string }
type Shipment = { id_despacho: number, fecha_despacho: string }

// Opciones estáticas para menús desplegables.
const paymentMethods: ShipmentInvoice['forma_pago'][] = ["Efectivo", "Tarjeta", "Transferencia"];
const statusOptions: { label: string; value: boolean }[] = [
  { label: "Pagado", value: true },
  { label: "Pendiente", value: false },
]

export default function ShipmentInvoicingPage() {
  // Estados para gestionar los datos de la página.
  const [shipmentInvoices, setShipmentInvoices] = useState<ShipmentInvoice[]>([])
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [allShipments, setAllShipments] = useState<Shipment[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShipmentInvoice, setEditingShipmentInvoice] = useState<ShipmentInvoice | null>(null)
  const { toast } = useToast()

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');


  // Configuración del formulario con react-hook-form y Zod.
  const form = useForm<z.infer<typeof shipmentInvoiceSchema>>({
    resolver: zodResolver(shipmentInvoiceSchema),
    defaultValues: {
      id_factura: "",
      id_despacho: "",
      comprobante: "",
      forma_pago: "Efectivo",
      monto: 0,
      state: false,
    },
  })
  
  // Observa el valor del campo 'id_despacho' para actualizar dinámicamente las opciones de factura.
  const selectedShipmentId = form.watch("id_despacho");

  // `useMemo` se usa para calcular las facturas disponibles de forma eficiente.
  const availableInvoices = useMemo(() => {
    if (!selectedShipmentId) return [];
    const selectedShipment = allShipments.find(s => String(s.id_despacho) === selectedShipmentId);
    if (!selectedShipment) return [];
    const selectedDate = new Date(selectedShipment.fecha_despacho).toISOString().split('T')[0];
    const usedInvoiceIds = new Set(shipmentInvoices.map(si => si.id_factura));

    return allInvoices.filter(inv => {
        const invoiceDate = new Date(inv.fecha).toISOString().split('T')[0];
        const isDateMatch = invoiceDate === selectedDate;
        const isNotUsed = !usedInvoiceIds.has(inv.id_factura);
        const isCurrentlyEditing = editingShipmentInvoice?.id_factura === inv.id_factura;
        return isDateMatch && (isNotUsed || isCurrentlyEditing);
    });
  }, [selectedShipmentId, allInvoices, allShipments, shipmentInvoices, editingShipmentInvoice]);

  useEffect(() => {
    fetchShipmentInvoices()
    fetchInvoices()
    fetchShipments()
  }, [])

  useEffect(() => {
    if (editingShipmentInvoice) {
      form.reset({
        ...editingShipmentInvoice,
        id_despacho: String(editingShipmentInvoice.id_despacho),
      })
    } else {
      form.reset({
        id_factura: "",
        id_despacho: "",
        comprobante: "",
        forma_pago: "Efectivo",
        monto: 0,
        state: false,
      })
    }
    setSelectedFile(null); // Resetea el archivo al abrir el diálogo.
  }, [editingShipmentInvoice, form])
  
  useEffect(() => {
    if (!editingShipmentInvoice) {
      form.setValue("id_factura", "");
    }
  }, [selectedShipmentId, editingShipmentInvoice, form]);

  const fetchShipmentInvoices = async () => {
    const { data, error } = await supabase.from('facturacion_x_despacho').select('*')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los registros.", variant: "destructive" })
    } else {
      setShipmentInvoices(data as ShipmentInvoice[])
    }
  }
  
  const fetchInvoices = async () => {
    const { data, error } = await supabase.from('facturacion').select('id_factura, invoice_number, fecha')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas.", variant: "destructive" })
    } else {
      setAllInvoices(data as Invoice[])
    }
  }
  
  const fetchShipments = async () => {
    const { data, error } = await supabase.from('despacho').select('id_despacho, fecha_despacho')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los despachos.", variant: "destructive" })
    } else {
      setAllShipments(data as Shipment[])
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const uploadComprobante = async (): Promise<string | undefined> => {
    if (!selectedFile) {
        // Si se está editando y no se selecciona un nuevo archivo, se mantiene la URL existente.
        return editingShipmentInvoice?.comprobante;
    }
    setLoading(true);
    const fileName = `${Date.now()}-${selectedFile.name}`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, selectedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    setLoading(false);
    if (error) {
      toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
      return undefined;
    }
    
    // Obtiene la URL pública del archivo subido.
    const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
    return publicUrl;
  };

  const onSubmit = async (values: z.infer<typeof shipmentInvoiceSchema>) => {
    const imageUrl = await uploadComprobante();
    if (!imageUrl && selectedFile) {
        return;
    }

    const dataToSubmit = {
      ...values,
      id_despacho: parseInt(String(values.id_despacho), 10),
      comprobante: imageUrl,
    };
    
    let error;
    if (editingShipmentInvoice) {
      const { error: updateError } = await supabase
        .from('facturacion_x_despacho')
        .update(dataToSubmit)
        .eq('id_fac_desp', editingShipmentInvoice.id_fac_desp)
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('facturacion_x_despacho')
        .insert([dataToSubmit])
      error = insertError;
    }

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Éxito", description: `Registro ${editingShipmentInvoice ? 'actualizado' : 'creado'} correctamente.` })
      fetchShipmentInvoices()
      handleCloseDialog()
    }
  }

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from('facturacion_x_despacho')
      .delete()
      .eq('id_fac_desp', id)

    if (error) {
      // Manejo de errores
    } else {
      toast({ title: "Éxito", description: "Registro eliminado correctamente." })
      fetchShipmentInvoices()
    }
  }

  const handleEdit = (shipmentInvoice: ShipmentInvoice) => {
    setEditingShipmentInvoice(shipmentInvoice);
    setIsDialogOpen(true);
  }
  
  const handleOpenImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  }


  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingShipmentInvoice(null);
    }
  };

  const handleCloseDialog = () => {
    setEditingShipmentInvoice(null);
    form.reset()
    setIsDialogOpen(false)
  }
  
  const getBadgeVariant = (status: boolean) => status ? "default" : "secondary"
  const getStatusLabel = (status: boolean) => status ? "Pagado" : "Pendiente"
  const getInvoiceNumber = (invoiceId: string) => allInvoices.find(inv => inv.id_factura === invoiceId)?.invoice_number || invoiceId;
  const getShipmentDate = (shipmentId: string | number) => {
      const id = typeof shipmentId === 'string' ? parseInt(shipmentId, 10) : shipmentId;
      const shipment = allShipments.find(ship => ship.id_despacho === id);
      return shipment ? new Date(shipment.fecha_despacho).toLocaleDateString() : shipmentId;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Facturación por Despacho</CardTitle>
            <CardDescription>Gestione las facturas asociadas a cada despacho.</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
            <DialogTrigger asChild>
               <Button onClick={() => { setEditingShipmentInvoice(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nueva Facturación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingShipmentInvoice ? 'Editar' : 'Añadir'} Facturación por Despacho</DialogTitle>
                <DialogDescription>
                  Complete los campos para registrar una nueva facturación.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="id_despacho"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Despacho</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un despacho" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {allShipments.map((shipment) => (
                                    <SelectItem key={shipment.id_despacho} value={String(shipment.id_despacho)}>
                                        ID: {shipment.id_despacho} - Fecha: {new Date(shipment.fecha_despacho).toLocaleDateString()}
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
                    name="id_factura"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Factura</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger disabled={!selectedShipmentId}>
                                    <SelectValue placeholder="Seleccione una factura disponible" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {availableInvoices.map((invoice) => (
                                    <SelectItem key={invoice.id_factura} value={invoice.id_factura}>
                                        {String(invoice.invoice_number)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormItem>
                    <FormLabel>Comprobante</FormLabel>
                    <FormControl>
                      <Input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                      />
                    </FormControl>
                    <FormMessage />
                    {selectedFile && <p className="text-sm text-muted-foreground mt-2">Archivo seleccionado: {selectedFile.name}</p>}
                    {editingShipmentInvoice?.comprobante && !selectedFile && (
                        <div className="mt-2">
                            <p className="text-sm text-muted-foreground">Comprobante actual:</p>
                             <Image 
                                src={editingShipmentInvoice.comprobante} 
                                alt="Comprobante actual" 
                                width={80} 
                                height={80} 
                                className="rounded-md object-cover mt-1 cursor-pointer"
                                onClick={() => handleOpenImageModal(editingShipmentInvoice.comprobante)}
                              />
                        </div>
                    )}
                  </FormItem>
                  <FormField
                    control={form.control}
                    name="forma_pago"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Forma de Pago</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una forma de pago" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethods.map((method) => (
                              <SelectItem key={method} value={method}>
                                {method}
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
                    name="monto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value === 'true')}
                          value={String(field.value)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione un estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.label} value={String(option.value)}>
                                {option.label}
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
                    <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : (editingShipmentInvoice ? 'Guardar Cambios' : 'Guardar')}</Button>
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
                <TableHead>No. Factura</TableHead>
                <TableHead>Fecha Despacho</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipmentInvoices.map((shipmentInvoice) => (
                <TableRow key={shipmentInvoice.id_fac_desp}>
                  <TableCell className="font-medium">{getInvoiceNumber(shipmentInvoice.id_factura)}</TableCell>
                  <TableCell>{getShipmentDate(shipmentInvoice.id_despacho)}</TableCell>
                  <TableCell>
                    {shipmentInvoice.comprobante ? (
                       <Image
                          src={shipmentInvoice.comprobante}
                          alt={`Comprobante de ${shipmentInvoice.id_factura}`}
                          width={60}
                          height={60}
                          className="h-16 w-16 rounded-md object-cover cursor-pointer"
                          onClick={() => handleOpenImageModal(shipmentInvoice.comprobante)}
                      />
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>{shipmentInvoice.forma_pago}</TableCell>
                  <TableCell>${shipmentInvoice.monto.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={getBadgeVariant(shipmentInvoice.state)}>{getStatusLabel(shipmentInvoice.state)}</Badge></TableCell>
                   <TableCell>
                    <div className="flex justify-end items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(shipmentInvoice)}>
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
                              Esta acción no se puede deshacer. Esto eliminará permanentemente el registro.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(shipmentInvoice.id_fac_desp)}>
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
          Mostrando <strong>1-{shipmentInvoices.length}</strong> de <strong>{shipmentInvoices.length}</strong> registros.
        </div>
      </CardFooter>
      
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-3xl">
            <Image
                src={selectedImage}
                alt="Comprobante"
                width={800}
                height={600}
                className="w-full h-auto rounded-md object-contain"
            />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

    