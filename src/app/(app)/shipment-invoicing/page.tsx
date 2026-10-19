'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
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
import { PlusCircle, Pencil, Trash2, FilterX, Search, ArrowUp, ArrowDown, GripVertical } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core"
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

/**
 * @file shipment-invoicing/page.tsx
 * @description Página para asociar facturas a un despacho específico, registrar pagos
 * y subir comprobantes. Incluye asignación masiva de facturas.
 */

const BUCKET_NAME = 'comprobante';

// Esquema de validación para el formulario de edición de una facturación por despacho.
const shipmentInvoiceSchema = z.object({
  id_factura: z.string().min(1, "El ID de factura es requerido."),
  id_despacho: z.preprocess(
    (val) => String(val),
    z.string().min(1, "El ID de despacho es requerido.")
  ),
  comprobante: z.string().optional(), // La URL de la imagen se maneja por separado.
  forma_pago: z.enum(["Efectivo", "Tarjeta", "Transferencia", "Cheque", "Quedan", "Firma", "Credito", "Devolucion"]),
  monto: z.coerce.number().min(0, "El monto debe ser un número positivo."),
  state: z.boolean(),
})


// Tipos de datos para la gestión de facturación por despacho.
type ShipmentInvoice = Omit<z.infer<typeof shipmentInvoiceSchema>, 'state'> & { id_fac_desp: number, comprobante: string, fecha_entrega: string | null, tax_type?: string, state: boolean, orden_visita: number | null, net_to_pay?: number }
type Invoice = { id_factura: string, reference_number: string | number, fecha: string, net_to_pay: number, customer_name: string, code_customer: string, geocerca: any | null, fecha_import: string | null }
type Shipment = { id_despacho: number, fecha_despacho: string, id_ruta: string, estado_recorrido: 'pendiente' | 'en_curso' | 'finalizado' }
type Route = { id_ruta: string; ruta_desc: string };
// Tipo de los registros mostrados en el diálogo de ordenamiento manual.
type OrderInvoice = { id_fac_desp: number, id_factura: string, customer_name: string, monto: number, orden_visita: number | null }


// Opciones estáticas para menús desplegables.
const paymentMethods: ShipmentInvoice['forma_pago'][] = ["Efectivo", "Tarjeta", "Transferencia", "Cheque", "Quedan", "Firma", "Credito", "Devolucion"];
const statusOptions: {label: string, value: string}[] = [{label: "Completado", value: "true"}, {label: "Pendiente", value: "false"}];

const ITEMS_PER_PAGE = 10;

/**
 * Componente principal de la página de Facturación por Despacho.
 */
export default function ShipmentInvoicingPage() {
  // --- ESTADOS ---
  const [shipmentInvoices, setShipmentInvoices] = useState<ShipmentInvoice[]>([])
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [allShipments, setAllShipments] = useState<Shipment[]>([])
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShipmentInvoice, setEditingShipmentInvoice] = useState<ShipmentInvoice | null>(null)
  const { toast } = useToast()

  // Rol del usuario actual: ADMIN, Gerente Admon y Facturación pueden reordenar manualmente las facturas.
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  useEffect(() => {
    try {
      const userSessionString = localStorage.getItem('user-session');
      if (userSessionString) {
        const userSession = JSON.parse(userSessionString);
        setCurrentUserRole(String(userSession.role || '').toLowerCase());
      }
    } catch (error) {
      console.error("No se pudo leer la sesión del usuario", error);
    }
  }, []);
  const canReorder = useMemo(
    () =>
      currentUserRole.includes('admin') ||
      currentUserRole.includes('gerente.admon') ||
      currentUserRole.includes('facturacion'),
    [currentUserRole]
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  
  // Estados para el nuevo diálogo de asignación masiva
  const [isMassAssignDialogOpen, setIsMassAssignDialogOpen] = useState(false);
  const [selectedShipmentForMassAssign, setSelectedShipmentForMassAssign] = useState<string>('');
  const [selectedInvoicesForMassAssign, setSelectedInvoicesForMassAssign] = useState<Record<string, boolean>>({});
  const [massAssignSearchQuery, setMassAssignSearchQuery] = useState('');
  const [massAssignImportDate, setMassAssignImportDate] = useState('');
  
  const [availableInvoices, setAvailableInvoices] = useState<Invoice[]>([]);
  
  // Estados del diálogo de ordenamiento manual (drag & drop)
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [orderDialogShipmentId, setOrderDialogShipmentId] = useState<string>('');
  const [orderDialogInvoices, setOrderDialogInvoices] = useState<OrderInvoice[]>([]);
  const [loadingOrderList, setLoadingOrderList] = useState(false);
  
  // Estados de filtrado y paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterShipmentId, setFilterShipmentId] = useState('');
  const [filterAmount, setFilterAmount] = useState('');
  const [filterDeliveryDate, setFilterDeliveryDate] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterState, setFilterState] = useState<string>('');


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

  // Carga los datos iniciales al montar el componente.
  useEffect(() => {
    fetchInvoices()
    fetchShipments()
    fetchRoutes();
  }, [])
  
  // Carga los datos de facturación por despacho con filtros
  useEffect(() => {
    fetchShipmentInvoices()
  }, [currentPage, filterShipmentId, filterAmount, filterDeliveryDate, filterPaymentMethod, filterState])


  // Rellena el formulario cuando se selecciona un registro para editar.
  useEffect(() => {
    if (editingShipmentInvoice) {
      // Si aún no se ha registrado un monto, se precarga el precio esperado de la factura (net_to_pay).
      const montoPredeterminado = (editingShipmentInvoice.monto ?? 0) > 0
        ? editingShipmentInvoice.monto
        : (editingShipmentInvoice.net_to_pay ?? 0);

      form.reset({
        ...editingShipmentInvoice,
        id_despacho: String(editingShipmentInvoice.id_despacho),
        forma_pago: editingShipmentInvoice.forma_pago,
        state: editingShipmentInvoice.state,
        monto: montoPredeterminado,
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
  
  /**
   * Obtiene las facturas disponibles para un despacho específico.
   * Filtra por facturas no asignadas y geocerca (cliente dentro de la geocerca de la ruta),
   * y ordena por fecha de importación descendente.
   */
    const getAvailableInvoices = useCallback(async (shipmentId: string) => {
    if (!shipmentId) {
      setAvailableInvoices([]);
      return;
    }
    setLoading(true);
    
    const selectedShipment = allShipments.find(s => String(s.id_despacho) === shipmentId);
    if (!selectedShipment) {
      setLoading(false);
      return;
    }

    // 1. Obtener la lista de IDs de facturas que ya están asignadas a CUALQUIER despacho
    const { data: usedInvoices, error: usedInvoicesError } = await supabase.from('facturacion_x_despacho').select('id_factura');
    if (usedInvoicesError) {
      toast({ title: "Error", description: "No se pudo obtener la lista de facturas ya asignadas.", variant: "destructive" });
      setLoading(false);
      return;
    }
    const usedInvoiceIds = new Set(usedInvoices.map(si => si.id_factura));

    // 2. Obtener los clientes que están dentro de la geocerca de la ruta del despacho
    const { data: customersInRoute, error: rpcError } = await supabase.rpc('get_customers_in_route_geofence_v2', {
        p_id_ruta: selectedShipment.id_ruta
    });

    let customerCodesInRoute: Set<string> | null = null;
    if (rpcError) {
      console.error(rpcError)
      toast({ title: "Error de Geocerca", description: "No se pudo consultar qué clientes están en la ruta.", variant: "destructive" });
    } else {
      customerCodesInRoute = new Set(customersInRoute.map((c: any) => c.code_customer));
    }


    // 3. Filtrar todas las facturas basándose en las condiciones
    const filteredInvoices = allInvoices.filter(inv => {
        const isNotUsed = !usedInvoiceIds.has(inv.id_factura);
        
        // Si la geocerca de la ruta no pudo cargarse, no se aplica el filtro geográfico
        if (customerCodesInRoute === null) {
            return isNotUsed;
        }

        const hasNoGeofence = inv.geocerca === null;
        const isInRoute = customerCodesInRoute.has(inv.code_customer);

        // La factura se incluye si no está usada Y (está en la ruta O no tiene geocerca)
        return isNotUsed && (isInRoute || hasNoGeofence);
    });
    
    // 4. Ordenar las facturas filtradas por fecha de importación descendente
    filteredInvoices.sort((a, b) => {
        const dateA = a.fecha_import ? new Date(a.fecha_import).getTime() : 0;
        const dateB = b.fecha_import ? new Date(b.fecha_import).getTime() : 0;
        return dateB - dateA;
    });

    setAvailableInvoices(filteredInvoices);
    setLoading(false);

  }, [allInvoices, allShipments, toast]);


  // Efecto que se dispara cuando el usuario selecciona un despacho en el diálogo de asignación masiva.
  useEffect(() => {
    getAvailableInvoices(selectedShipmentForMassAssign);
    setSelectedInvoicesForMassAssign({}); // Resetea la selección de facturas
  }, [selectedShipmentForMassAssign, getAvailableInvoices]);

  // Carga las facturas del despacho seleccionado en el diálogo de ordenamiento manual.
  useEffect(() => {
    if (!isOrderDialogOpen || !orderDialogShipmentId) {
      setOrderDialogInvoices([]);
      return;
    }
    fetchOrderDialogInvoices(orderDialogShipmentId);
  }, [isOrderDialogOpen, orderDialogShipmentId]);

  /** Obtiene los registros de facturación por despacho desde Supabase. */
    const fetchShipmentInvoices = useCallback(async () => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Constructor de la consulta con todos los filtros activos.
    const buildQuery = () => {
      let query = supabase.from('facturacion_x_despacho').select('*, facturacion(code_customer, net_to_pay, customer(id_impuesto, tipo_impuesto(impt_desc)))', { count: 'exact' });

      if (filterShipmentId) {
          query = query.eq('id_despacho', filterShipmentId);
      }
      if (filterAmount) {
          query = query.gte('monto', filterAmount);
      }
      if (filterDeliveryDate) {
          // Filtra por el día completo, ignorando la hora
          const startDate = `${filterDeliveryDate}T00:00:00.000Z`;
          const endDate = `${filterDeliveryDate}T23:59:59.999Z`;
          query = query.gte('fecha_entrega', startDate).lte('fecha_entrega', endDate);
      }
      if (filterPaymentMethod) {
          query = query.eq('forma_pago', filterPaymentMethod);
      }
      if (filterState) {
          query = query.eq('state', filterState === 'true');
      }

      return query.range(from, to);
    };

    // Orden manual persistido en la columna 'orden_visita' (mismo orden usado en el detalle del despacho).
    const { data, error, count } = await buildQuery()
      .order('orden_visita', { ascending: true })
      .order('id_fac_desp', { ascending: false });
    if (error) {
        toast({ title: "Error", description: "No se pudieron cargar los registros.", variant: "destructive" })
    } else {
        const enrichedData = (data ?? []).map((d: any) => ({
          ...d,
          tax_type: d.facturacion?.customer?.tipo_impuesto?.impt_desc,
          net_to_pay: Number(d.facturacion?.net_to_pay ?? 0),
        }));
        setShipmentInvoices(enrichedData as ShipmentInvoice[]);
        setTotalRecords(count ?? 0);
    }
  }, [currentPage, filterShipmentId, filterAmount, filterDeliveryDate, filterPaymentMethod, filterState, toast]);
  
  /** Obtiene todas las facturas para los selectores y la asignación. */
  const fetchInvoices = async () => {
    // Añadimos el join con 'customer' para obtener la geocerca
    const { data, error } = await supabase
        .from('facturacion')
        .select(`
            id_factura, 
            reference_number, 
            fecha, 
            fecha_import,
            net_to_pay, 
            customer_name, 
            code_customer,
            customer ( geocerca )
        `);
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas.", variant: "destructive" });
    } else {
      // Mapeamos los datos para aplanar la estructura y que 'geocerca' sea una propiedad directa
      const formattedInvoices = data.map(inv => ({
          ...inv,
          geocerca: inv.customer ? (inv.customer as any).geocerca : null,
          customer: undefined // eliminamos el objeto anidado
      }));
      setAllInvoices(formattedInvoices as Invoice[]);
    }
  }
  
  /** Obtiene todos los despachos para el selector. */
  const fetchShipments = async () => {
    const { data, error } = await supabase.from('despacho').select('id_despacho, fecha_despacho, id_ruta, estado_recorrido')
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar los despachos.", variant: "destructive" })
    } else {
      setAllShipments(data as Shipment[])
    }
  }
  
  const fetchRoutes = async () => {
    const { data, error } = await supabase.from('rutas').select('id_ruta, ruta_desc');
    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las rutas.", variant: "destructive" });
    } else {
      setAllRoutes(data as Route[]);
    }
  };

  /**
   * Sube un archivo de imagen (comprobante) a Supabase Storage.
   * @returns La URL pública de la imagen subida, o la URL existente si no se sube un nuevo archivo.
   */
  const uploadComprobante = async (): Promise<string | undefined> => {
    // Si se está editando y hay un archivo nuevo, elimina el antiguo primero.
    if (selectedFile && editingShipmentInvoice?.comprobante) {
        const oldFileName = editingShipmentInvoice.comprobante.split('/').pop();
        if (oldFileName) {
            await supabase.storage.from(BUCKET_NAME).remove([oldFileName]);
        }
    }

    if (!selectedFile) {
        // Si no se selecciona un nuevo archivo, se mantiene la URL existente.
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
  
  /**
 * Recalcula y actualiza los totales (contado, crédito, general) en la tabla `despacho`
 * basándose en la suma del campo `monto` de las facturas asociadas.
 * @param shipmentId El ID del despacho a actualizar.
 */
const recalculateAndSaveShipmentTotals = async (shipmentId: number) => {
    // 1. Obtener todas las facturas asociadas a este despacho, incluyendo su monto y el cliente.
    const { data: shipmentInvoicesData, error: shipmentInvoicesError } = await supabase
      .from('facturacion_x_despacho')
      .select('monto, facturacion(code_customer, customer(id_impuesto, tipo_impuesto(impt_desc)))')
      .eq('id_despacho', shipmentId);
  
    if (shipmentInvoicesError) {
      toast({ title: "Error", description: "Paso 1: No se pudieron obtener las facturas del despacho para el cálculo.", variant: "destructive" });
      return;
    }
    
    // 2. Calcular totales basados en el tipo de impuesto del cliente.
    let totalContado = 0;
    let totalCredito = 0;
  
    shipmentInvoicesData.forEach(inv => {
      // La consulta devuelve un objeto anidado, por eso el casting a 'any'.
      // @ts-ignore
      const taxDesc = inv.facturacion?.customer?.tipo_impuesto?.impt_desc;
      
      if (taxDesc === 'Consumidor Final') {
        totalContado += inv.monto || 0;
      } else if (taxDesc === 'Crédito Fiscal') {
        totalCredito += inv.monto || 0;
      }
    });
  
    const totalGeneral = totalContado + totalCredito;
  
    // 3. Actualizar el registro del despacho con los nuevos totales.
    const { error: updateError } = await supabase
      .from('despacho')
      .update({
        total_contado: totalContado,
        total_credito: totalCredito,
        total_general: totalGeneral
      })
      .eq('id_despacho', shipmentId);
  
    if (updateError) {
      toast({ title: "Error", description: "Paso 3: No se pudo actualizar el despacho con los nuevos totales.", variant: "destructive" });
    } else {
      toast({ title: "Sincronizado", description: "Los totales del despacho han sido actualizados." });
    }
  };


  /**
   * Gestiona el envío del formulario para actualizar una asociación factura-despacho.
   * @param values Los datos del formulario de edición.
   */
  const onEditSubmit = async (values: z.infer<typeof shipmentInvoiceSchema>) => {
    const imageUrl = await uploadComprobante();
    if (!imageUrl && selectedFile) {
        return; // Detiene la ejecución si la carga de una nueva imagen falla.
    }

    // Lógica de auto-completado: si hay imagen y monto > 0, es completado.
    const isCompleted = values.state || (!!imageUrl && values.monto > 0);

    const dataToSubmit: any = {
      ...values,
      id_despacho: parseInt(String(values.id_despacho), 10),
      comprobante: imageUrl,
      state: isCompleted
    };

    // Si se subió un nuevo archivo, se establece la fecha de entrega.
    if (selectedFile) {
        dataToSubmit.fecha_entrega = new Date().toISOString();
    }
    
    if (!editingShipmentInvoice) return;

    const { error } = await supabase
      .from('facturacion_x_despacho')
      .update(dataToSubmit)
      .eq('id_fac_desp', editingShipmentInvoice.id_fac_desp)

    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Éxito", description: `Registro actualizado correctamente.` })
      // Después de guardar, recalcula y guarda los nuevos totales.
      await recalculateAndSaveShipmentTotals(dataToSubmit.id_despacho);
      fetchShipmentInvoices()
      handleCloseDialog()
    }
  }

  /**
   * Elimina una asociación factura-despacho.
   * @param shipmentInvoice El objeto de la asociación a eliminar.
   */
  const handleDelete = async (shipmentInvoice: ShipmentInvoice) => {
    const { error } = await supabase
      .from('facturacion_x_despacho')
      .delete()
      .eq('id_fac_desp', shipmentInvoice.id_fac_desp)

    if (error) {
       toast({
        title: "Error al eliminar",
        description: "Ocurrió un error inesperado al eliminar el registro.",
        variant: "destructive",
      })
    } else {
      toast({ title: "Éxito", description: "Registro eliminado correctamente." })
      // Después de eliminar, recalcula y guarda los nuevos totales.
      await recalculateAndSaveShipmentTotals(Number(shipmentInvoice.id_despacho));
      fetchShipmentInvoices()
    }
  }

  /**
   * Mueve una factura hacia arriba o hacia abajo dentro de su despacho y persiste el nuevo orden.
   * Usa la columna 'orden_visita', compartida con el detalle del despacho.
   * Disponible para ADMIN, Gerente Admon y Facturación.
   */
  const handleMoveInvoice = async (shipmentInvoice: ShipmentInvoice, direction: 'up' | 'down') => {
    if (!canReorder) return;

    const idDespacho = Number(shipmentInvoice.id_despacho);
    const { data, error } = await supabase
      .from('facturacion_x_despacho')
      .select('id_fac_desp, orden_visita')
      .eq('id_despacho', idDespacho)
      .order('orden_visita', { ascending: true })
      .order('id_fac_desp', { ascending: false });

    if (error) {
      toast({
        title: "Error al reordenar",
        description: "No se pudo obtener el orden actual del despacho.",
        variant: "destructive",
      });
      return;
    }
    if (!data || data.length < 2) return;

    // Normaliza el orden: los registros nuevos sin orden (null) quedan al final.
    const ordered = data.map((row: any, index: number) => ({
      id_fac_desp: row.id_fac_desp as number,
      orden_visita: (row.orden_visita as number | null) ?? index + 1,
      previous: row.orden_visita as number | null,
    }));
    ordered.forEach((row, index) => { row.orden_visita = index + 1; });

    const currentIndex = ordered.findIndex(row => row.id_fac_desp === shipmentInvoice.id_fac_desp);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex === -1 || targetIndex < 0 || targetIndex >= ordered.length) return;

    // Intercambia la posición con el registro vecino.
    const currentOrden = ordered[currentIndex].orden_visita;
    ordered[currentIndex].orden_visita = ordered[targetIndex].orden_visita;
    ordered[targetIndex].orden_visita = currentOrden;

    const changes = ordered
      .filter(row => row.orden_visita !== row.previous)
      .map(({ id_fac_desp, orden_visita }) => ({ id_fac_desp, orden_visita }));

    if (changes.length === 0) return;

    const results = await Promise.all(
      changes.map(row =>
        supabase.from('facturacion_x_despacho').update({ orden_visita: row.orden_visita }).eq('id_fac_desp', row.id_fac_desp)
      )
    );
    const updateError = results.find(result => result.error)?.error;

    if (updateError) {
      toast({ title: "Error al reordenar", description: updateError.message, variant: "destructive" });
      return;
    }

    fetchShipmentInvoices();
  };

  /**
   * Carga todas las facturas de un despacho para el diálogo de ordenamiento manual,
   * ordenadas por el orden guardado (o por antigüedad si aún no tienen orden).
   */
  const fetchOrderDialogInvoices = async (shipmentId: string) => {
    setLoadingOrderList(true);
    const { data, error } = await supabase
      .from('facturacion_x_despacho')
      .select('id_fac_desp, orden_visita, monto, facturacion(id_factura, customer_name)')
      .eq('id_despacho', shipmentId)
      .order('orden_visita', { ascending: true })
      .order('id_fac_desp', { ascending: false });

    if (error) {
      toast({ title: "Error", description: "No se pudieron cargar las facturas del despacho.", variant: "destructive" });
    } else {
      const list = (data ?? []).map((row: any, index: number) => ({
        id_fac_desp: row.id_fac_desp as number,
        id_factura: String(row.facturacion?.id_factura ?? ''),
        customer_name: String(row.facturacion?.customer_name ?? ''),
        monto: Number(row.monto ?? 0),
        orden_visita: (row.orden_visita as number | null) ?? index + 1,
      }));
      setOrderDialogInvoices(list);
    }
    setLoadingOrderList(false);
  };

  // Sensores de arrastre: mouse con distancia mínima (para no interferir con clics),
  // táctil con retardo para permitir el scroll, y teclado para accesibilidad.
  const orderDialogSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor)
  );

  /**
   * Reordena las facturas al soltar una fila y persiste el nuevo orden en 'orden_visita'.
   * La actualización es optimista: si falla en la base de datos, se revierte.
   */
  const handleOrderDialogDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const previous = orderDialogInvoices;
    const oldIndex = previous.findIndex(inv => inv.id_fac_desp === active.id);
    const newIndex = previous.findIndex(inv => inv.id_fac_desp === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(previous, oldIndex, newIndex).map((inv, index) => ({ ...inv, orden_visita: index + 1 }));
    setOrderDialogInvoices(reordered);

    // Compara el nuevo orden de cada factura contra su valor anterior (por id, no por posición).
    const previousOrderById = new Map(previous.map(inv => [inv.id_fac_desp, inv.orden_visita]));
    const changes = reordered.filter(inv => inv.orden_visita !== previousOrderById.get(inv.id_fac_desp));
    const results = await Promise.all(
      changes.map(inv =>
        supabase.from('facturacion_x_despacho').update({ orden_visita: inv.orden_visita }).eq('id_fac_desp', inv.id_fac_desp)
      )
    );
    const updateError = results.find(result => result.error)?.error;

    if (updateError) {
      setOrderDialogInvoices(previous);
      toast({ title: "Error al reordenar", description: updateError.message, variant: "destructive" });
      return;
    }

    fetchShipmentInvoices();
  };

  /**
   * Gestiona la asignación masiva de facturas a un despacho.
   */
  const handleMassAssign = async () => {
    const invoiceIdsToAssign = Object.keys(selectedInvoicesForMassAssign).filter(
      id => selectedInvoicesForMassAssign[id]
    );

    if (invoiceIdsToAssign.length === 0) {
      toast({ title: "Sin selección", description: "Por favor, seleccione al menos una factura para asignar.", variant: "destructive" });
      return;
    }
    
    setLoading(true);

    const recordsToInsert = invoiceIdsToAssign.map(invoiceId => {
        return {
            id_despacho: parseInt(selectedShipmentForMassAssign, 10),
            id_factura: invoiceId,
            monto: 0, // Se establece en 0 por defecto al asignar masivamente.
            state: false, // Estado pendiente por defecto
            forma_pago: 'Efectivo' as const, // Forma de pago por defecto
        };
    });

    const { error } = await supabase.from('facturacion_x_despacho').insert(recordsToInsert);
    
    setLoading(false);
    if (error) {
        toast({ title: "Error en asignación masiva", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Éxito", description: `${invoiceIdsToAssign.length} facturas asignadas correctamente.` });
        await recalculateAndSaveShipmentTotals(parseInt(selectedShipmentForMassAssign, 10));
        fetchShipmentInvoices(); // Recarga la lista principal
        handleCloseMassAssignDialog();
    }
  };
  
  // --- FUNCIONES AUXILIARES DE LA UI ---

  /** Maneja el cambio de archivo seleccionado. */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  /** Prepara el formulario para editar un registro. */
  const handleEdit = (shipmentInvoice: ShipmentInvoice) => {
    setEditingShipmentInvoice(shipmentInvoice);
    setIsDialogOpen(true);
  }
  
  /** Abre el modal para visualizar una imagen de comprobante. */
  const handleOpenImageModal = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  }

  /** Controla la apertura y cierre del diálogo principal. */
  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingShipmentInvoice(null);
    }
  };

  /** Cierra el diálogo y resetea el formulario. */
  const handleCloseDialog = () => {
    setEditingShipmentInvoice(null);
    form.reset()
    setIsDialogOpen(false)
  }
  
  const handleCloseMassAssignDialog = () => {
    setIsMassAssignDialogOpen(false);
    setSelectedShipmentForMassAssign('');
    setSelectedInvoicesForMassAssign({});
    setAvailableInvoices([]); // Limpia las facturas disponibles
    setMassAssignSearchQuery(''); // Limpia la búsqueda
    setMassAssignImportDate(''); // Limpia el filtro de fecha
  };
  
  const clearFilters = () => {
    setFilterShipmentId('');
    setFilterAmount('');
    setFilterDeliveryDate('');
    setFilterPaymentMethod('');
    setFilterState('');
    setCurrentPage(1);
  };
  
  const getBadgeVariant = (status: boolean) => {
    return status ? "default" : "secondary";
  }

  const getInvoiceNumber = (invoiceId: string) => allInvoices.find(inv => inv.id_factura === invoiceId)?.reference_number || invoiceId;
  const getShipmentDate = (shipmentId: string | number) => {
      const id = typeof shipmentId === 'string' ? parseInt(shipmentId, 10) : shipmentId;
      const shipment = allShipments.find(ship => ship.id_despacho === id);
      if (!shipment) return shipmentId;
      // Trata la fecha como UTC para evitar problemas de zona horaria al mostrar.
      const date = new Date(shipment.fecha_despacho + 'T00:00:00Z');
      return date.toLocaleDateString('es-ES', { timeZone: 'UTC' });
  }
  
  const getRouteDescription = (routeId: string) => {
    return allRoutes.find(r => r.id_ruta === routeId)?.ruta_desc || 'Ruta Desconocida';
  }
  
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  };
  
  // Filtra las facturas disponibles basadas en la consulta de búsqueda y fecha.
  const searchedAvailableInvoices = useMemo(() => {
    return availableInvoices.filter(inv => {
        const searchMatch = massAssignSearchQuery 
            ? String(inv.id_factura).toLowerCase().includes(massAssignSearchQuery.toLowerCase()) ||
              String(inv.reference_number).toLowerCase().includes(massAssignSearchQuery.toLowerCase()) ||
              inv.customer_name.toLowerCase().includes(massAssignSearchQuery.toLowerCase())
            : true;
        
        const dateMatch = massAssignImportDate
            ? inv.fecha_import?.startsWith(massAssignImportDate)
            : true;

        return searchMatch && dateMatch;
    });
  }, [availableInvoices, massAssignSearchQuery, massAssignImportDate]);

    // Filtra los despachos para mostrar solo los que están 'pendientes'.
  const availableShipments = useMemo(() => {
    return allShipments.filter(s => s.estado_recorrido === 'pendiente');
  }, [allShipments]);

  const paymentOptions = useMemo(() => {
    return paymentMethods;
  }, []);

  /**
   * Posición de cada registro dentro de su despacho, según el orden manual guardado.
   * La lista ya llega ordenada por 'orden_visita' ascendente desde la consulta.
   */
  const shipmentOrderInfo = useMemo(() => {
    const position = new Map<number, number>();
    const total = new Map<number, number>();
    const groups = new Map<number, ShipmentInvoice[]>();

    shipmentInvoices.forEach(si => {
      const idDespacho = Number(si.id_despacho);
      if (!groups.has(idDespacho)) groups.set(idDespacho, []);
      groups.get(idDespacho)!.push(si);
    });

    groups.forEach((list, idDespacho) => {
      total.set(idDespacho, list.length);
      list.forEach((si, index) => position.set(si.id_fac_desp, index + 1));
    });

    return { position, total };
  }, [shipmentInvoices]);


  // --- RENDERIZADO DEL COMPONENTE ---
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Facturación por Despacho</CardTitle>
            <CardDescription>Asigne masivamente facturas a un despacho o edite una asignación individual. Con el filtro de despacho puede usar las flechas para definir el orden de entrega.</CardDescription>
          </div>
          {canReorder && (
            <Button
              variant="outline"
              onClick={() => { setOrderDialogShipmentId(filterShipmentId || ''); setIsOrderDialogOpen(true); }}
            >
              <GripVertical className="mr-2 h-4 w-4" /> Ordenar facturas
            </Button>
          )}
          <Dialog open={isMassAssignDialogOpen} onOpenChange={setIsMassAssignDialogOpen}>
            <DialogTrigger asChild>
               <Button onClick={() => setIsMassAssignDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Asignar Facturas
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Asignación Masiva de Facturas</DialogTitle>
                <DialogDescription>
                  Seleccione un despacho para ver las facturas disponibles y asígnelas.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 py-4 flex-1 overflow-y-hidden">
                <Select value={selectedShipmentForMassAssign} onValueChange={setSelectedShipmentForMassAssign}>
                  <SelectTrigger>
                    <SelectValue placeholder="1. Seleccione un despacho..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableShipments.map((shipment) => (
                      <SelectItem key={shipment.id_despacho} value={String(shipment.id_despacho)}>
                        ID: {shipment.id_despacho} - Ruta: {getRouteDescription(shipment.id_ruta)} - Fecha: {getShipmentDate(shipment.id_despacho)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por factura, ref. o cliente..."
                            value={massAssignSearchQuery}
                            onChange={(e) => setMassAssignSearchQuery(e.target.value)}
                            className="pl-8 w-full"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="mass-import-date" className="shrink-0">Fecha Importación</Label>
                        <Input
                            id="mass-import-date"
                            type="date"
                            value={massAssignImportDate}
                            onChange={(e) => setMassAssignImportDate(e.target.value)}
                            className="w-full sm:w-auto"
                        />
                    </div>
                </div>

                <div className="border rounded-md flex-1 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[50px]">
                           <Checkbox
                                checked={
                                    searchedAvailableInvoices.length > 0 &&
                                    searchedAvailableInvoices.every(inv => selectedInvoicesForMassAssign[inv.id_factura])
                                }
                                onCheckedChange={(checked) => {
                                    const newSelection = { ...selectedInvoicesForMassAssign };
                                    if (checked) {
                                        searchedAvailableInvoices.forEach(inv => newSelection[inv.id_factura] = true);
                                    } else {
                                        searchedAvailableInvoices.forEach(inv => delete newSelection[inv.id_factura]);
                                    }
                                    setSelectedInvoicesForMassAssign(newSelection);
                                }}
                                aria-label="Seleccionar todo"
                            />
                        </TableHead>
                        <TableHead>ID Factura</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Neto a Pagar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={5} className="text-center h-24">Buscando facturas disponibles...</TableCell></TableRow>
                      ) : selectedShipmentForMassAssign ? (
                         searchedAvailableInvoices.length > 0 ? (
                           searchedAvailableInvoices.map(invoice => (
                              <TableRow key={invoice.id_factura}
                                onClick={() => {
                                    setSelectedInvoicesForMassAssign(prev => ({
                                        ...prev,
                                        [invoice.id_factura]: !prev[invoice.id_factura]
                                    }))
                                }}
                                className="cursor-pointer"
                              >
                                <TableCell>
                                  <Checkbox
                                    checked={selectedInvoicesForMassAssign[invoice.id_factura] || false}
                                    onCheckedChange={checked => {
                                      setSelectedInvoicesForMassAssign(prev => ({
                                        ...prev,
                                        [invoice.id_factura]: !!checked
                                      }))
                                    }}
                                  />
                                </TableCell>
                                <TableCell>{invoice.id_factura}</TableCell>
                                <TableCell>{String(invoice.reference_number)}</TableCell>
                                <TableCell>
                                  {invoice.customer_name}
                                  {invoice.geocerca === null && <span className="text-muted-foreground text-xs ml-2">(Sin geocerca)</span>}
                                </TableCell>
                                <TableCell>${invoice.net_to_pay.toFixed(2)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center h-24">No hay facturas disponibles que cumplan los criterios.</TableCell>
                            </TableRow>
                          )
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-24">Seleccione un despacho para continuar.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="secondary" onClick={handleCloseMassAssignDialog}>Cancelar</Button>
                <Button onClick={handleMassAssign} disabled={loading || Object.values(selectedInvoicesForMassAssign).every(v => !v)}>
                    {loading ? 'Asignando...' : `Asignar ${Object.values(selectedInvoicesForMassAssign).filter(v => v).length} Factura(s)`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Diálogo de ordenamiento manual con arrastrar y soltar */}
          <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Ordenar facturas del despacho</DialogTitle>
                <DialogDescription>
                  Arrastre las facturas desde el asa para definir su orden de entrega. El orden se guarda automáticamente.
                </DialogDescription>
              </DialogHeader>
              <Select value={orderDialogShipmentId} onValueChange={setOrderDialogShipmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un despacho..." />
                </SelectTrigger>
                <SelectContent>
                  {allShipments.map((shipment) => (
                    <SelectItem key={shipment.id_despacho} value={String(shipment.id_despacho)}>
                      ID: {shipment.id_despacho} - Ruta: {getRouteDescription(shipment.id_ruta)} - Fecha: {getShipmentDate(shipment.id_despacho)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="border rounded-md flex-1 overflow-y-auto">
                {loadingOrderList ? (
                  <p className="text-center text-muted-foreground py-12">Cargando facturas...</p>
                ) : !orderDialogShipmentId ? (
                  <p className="text-center text-muted-foreground py-12">Seleccione un despacho para ver y ordenar sus facturas.</p>
                ) : orderDialogInvoices.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">Este despacho no tiene facturas asignadas.</p>
                ) : (
                  <DndContext sensors={orderDialogSensors} collisionDetection={closestCenter} onDragEnd={handleOrderDialogDragEnd}>
                    <SortableContext items={orderDialogInvoices.map(inv => inv.id_fac_desp)} strategy={verticalListSortingStrategy}>
                      {orderDialogInvoices.map((invoice, index) => (
                        <OrderSortableRow key={invoice.id_fac_desp} invoice={invoice} index={index} />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => setIsOrderDialogOpen(false)}>Listo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 mt-4">
            <Select value={filterShipmentId} onValueChange={setFilterShipmentId}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                    <SelectValue placeholder="Filtrar por Despacho" />
                </SelectTrigger>
                <SelectContent>
                    {allShipments.map((shipment) => (
                      <SelectItem key={shipment.id_despacho} value={String(shipment.id_despacho)}>
                        ID: {shipment.id_despacho} - Ruta: {getRouteDescription(shipment.id_ruta)} - Fecha: {getShipmentDate(shipment.id_despacho)}
                      </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Input
                type="number"
                placeholder="Filtrar por monto >="
                value={filterAmount}
                onChange={(e) => setFilterAmount(e.target.value)}
                className="w-full sm:w-auto"
            />
            <div className="flex items-center gap-2">
                <Label htmlFor="deliveryDate">Fecha de Entrega</Label>
                <Input
                    id="deliveryDate"
                    type="date"
                    value={filterDeliveryDate}
                    onChange={(e) => setFilterDeliveryDate(e.target.value)}
                    className="w-full sm:w-auto"
                />
            </div>
            <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                    <SelectValue placeholder="Filtrar por Pago" />
                </SelectTrigger>
                <SelectContent>
                    {paymentMethods.map(method => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={filterState} onValueChange={(value) => setFilterState(value as string)}>
                <SelectTrigger className="w-full sm:w-auto min-w-[160px]">
                    <SelectValue placeholder="Filtrar por Estado" />
                </SelectTrigger>
                <SelectContent>
                    {statusOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Button variant="ghost" onClick={clearFilters} className="text-sm">
                <FilterX className="mr-2 h-4 w-4"/>
                Limpiar Filtros
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Factura</TableHead>
                <TableHead>ID Despacho</TableHead>
                <TableHead className="text-center">Orden</TableHead>
                <TableHead>Comprobante</TableHead>
                <TableHead>Fecha Entrega</TableHead>
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
                  <TableCell>{shipmentInvoice.id_despacho}</TableCell>
                  <TableCell className="text-center">
                    {shipmentOrderInfo.position.get(shipmentInvoice.id_fac_desp) ?? '—'}
                  </TableCell>
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
                  <TableCell>{formatDateTime(shipmentInvoice.fecha_entrega)}</TableCell>
                  <TableCell>{shipmentInvoice.forma_pago}</TableCell>
                  <TableCell>${shipmentInvoice.monto.toFixed(2)}</TableCell>
                  <TableCell><Badge variant={getBadgeVariant(shipmentInvoice.state)}>{shipmentInvoice.state ? "Completado" : "Pendiente"}</Badge></TableCell>
                   <TableCell>
                    <div className="flex justify-end items-center gap-2">
                      {canReorder && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mover arriba en el despacho"
                            onClick={() => handleMoveInvoice(shipmentInvoice, 'up')}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mover abajo en el despacho"
                            onClick={() => handleMoveInvoice(shipmentInvoice, 'down')}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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
                            <AlertDialogAction onClick={() => handleDelete(shipmentInvoice)}>
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
          Mostrando <strong>{shipmentInvoices.length}</strong> de <strong>{totalRecords}</strong> registros.
        </div>
      </CardFooter>
      
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-3xl">
           <DialogHeader>
                <DialogTitle>Vista Previa del Comprobante</DialogTitle>
                <DialogDescription>
                  Esta es una vista previa de la imagen del comprobante de pago.
                </DialogDescription>
            </DialogHeader>
          <Image
              src={selectedImage}
              alt="Comprobante"
              width={800}
              height={600}
              className="w-full h-auto rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>

      {/* Dialogo para edición individual */}
      <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Facturación por Despacho</DialogTitle>
            <DialogDescription>
              Complete los campos para registrar una nueva facturación.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
               <FormItem>
                  <FormLabel>Despacho ID</FormLabel>
                  <Input value={editingShipmentInvoice?.id_despacho} disabled />
              </FormItem>
              <FormItem>
                  <FormLabel>Factura</FormLabel>
                  <Input value={`${getInvoiceNumber(editingShipmentInvoice?.id_factura || '')} (ID: ${editingShipmentInvoice?.id_factura})`} disabled />
              </FormItem>
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una forma de pago" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentOptions.map((method) => (
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
                         <SelectItem value="true">Completado</SelectItem>
                         <SelectItem value="false">Pendiente</SelectItem>
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
                <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/**
 * Fila arrastrable dentro del diálogo de ordenamiento manual.
 * Muestra el asa de arrastre, la posición actual, la factura y el cliente.
 */
function OrderSortableRow({ invoice, index }: { invoice: OrderInvoice, index: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: invoice.id_fac_desp });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 border-b last:border-b-0 px-3 py-2.5 bg-background">
      <button
        type="button"
        aria-label="Arrastrar para reordenar"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{invoice.id_factura || '—'}</p>
        <p className="text-xs text-muted-foreground truncate">{invoice.customer_name}</p>
      </div>
      <span className="text-sm shrink-0">${invoice.monto.toFixed(2)}</span>
    </div>
  )
}
