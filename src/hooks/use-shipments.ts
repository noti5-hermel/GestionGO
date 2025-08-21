
'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

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

// Tipos de datos para la gestión de despachos.
export type Shipment = z.infer<typeof shipmentSchema> & { id_despacho: string }
export type Route = { id_ruta: string; ruta_desc: string }
export type User = { id_user: string; name: string }

interface UseShipmentsProps {
  itemsPerPage: number;
}

export const useShipments = ({ itemsPerPage }: UseShipmentsProps) => {
  // Estados para gestionar los datos y la UI de la página.
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [motoristas, setMotoristas] = useState<User[]>([])
  const [auxiliares, setAuxiliares] = useState<User[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'today' | 'date'>('all');
  const [customDate, setCustomDate] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast()

  // Configuración del formulario con react-hook-form y Zod.
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
  
  // Función para aplicar los filtros de fecha a la lista de despachos.
  const applyFilters = () => {
    let newFilteredShipments = [...shipments];
    if (filterType === 'today') {
        const today = new Date().toISOString().split('T')[0];
        newFilteredShipments = shipments.filter(s => s.fecha_despacho === today);
    } else if (filterType === 'date' && customDate) {
        newFilteredShipments = shipments.filter(s => s.fecha_despacho === customDate);
    }
    setFilteredShipments(newFilteredShipments);
    setCurrentPage(1); // Resetea a la primera página cada vez que cambia el filtro.
  };

  // Carga los datos iniciales al montar el componente.
  useEffect(() => {
    fetchShipments()
    fetchRoutes()
    fetchUsersByRole()
    fetchAllUsers()
  }, [])
  
  // Vuelve a aplicar los filtros cada vez que los despachos o las opciones de filtro cambian.
  useEffect(() => {
    applyFilters();
  }, [shipments, filterType, customDate]);

  // Rellena el formulario cuando se selecciona un despacho para editar.
  useEffect(() => {
    if (editingShipment) {
      form.reset({
        ...editingShipment,
        id_ruta: String(editingShipment.id_ruta),
        id_motorista: String(editingShipment.id_motorista),
        id_auxiliar: String(editingShipment.id_auxiliar),
        fecha_despacho: editingShipment.fecha_despacho ? new Date(editingShipment.fecha_despacho).toISOString().split('T')[0] : '',
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

  // Obtiene todos los usuarios para poder mostrar sus nombres.
  const fetchAllUsers = async () => {
    const { data, error } = await supabase.from('usuario').select('id_user, name');
    if (error) {
      toast({ title: "Error", description: `No se pudieron cargar los usuarios: ${error.message}`, variant: "destructive" });
    } else {
      setUsers(data || []);
    }
  }

  // Obtiene la lista completa de despachos.
  const fetchShipments = async () => {
    const { data, error } = await supabase.from('despacho').select('*').order('fecha_despacho', { ascending: false });

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

  // Obtiene las rutas disponibles.
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

  // Obtiene los usuarios filtrados por rol para los selects de motorista y auxiliar.
  const fetchUsersByRole = async () => {
    // Busca el rol de motorista (podría tener variaciones en la descripción).
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

    // Busca auxiliares (asumiendo que tienen un id_rol fijo de 3).
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

  // Gestiona el envío del formulario para crear o actualizar un despacho.
  const onSubmit = async (values: z.infer<typeof shipmentSchema>) => {
    let error;

    if (editingShipment) {
      // Actualiza un despacho existente.
      const { error: updateError } = await supabase
        .from('despacho')
        .update(values)
        .eq('id_despacho', editingShipment.id_despacho)
        .select()
      error = updateError;
    } else {
      // Inserta un nuevo despacho.
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

  // Elimina un despacho.
  const handleDelete = async (shipmentId: string) => {
    const { error } = await supabase
      .from('despacho')
      .delete()
      .eq('id_despacho', shipmentId)

    if (error) {
      if (error.code === '23503') {
        toast({
          title: "Error al eliminar",
          description: "No se puede eliminar el despacho porque está asociado a otros registros.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error al eliminar",
          description: "Ocurrió un error inesperado al eliminar el despacho.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Éxito",
        description: "Despacho eliminado correctamente.",
      })
      fetchShipments()
    }
  }
  
  // Prepara el formulario para editar un despacho.
  const handleEdit = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setIsDialogOpen(true);
  }

  // Controla la apertura y cierre del diálogo, reseteando el estado de edición.
  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingShipment(null);
    }
  };

  // Cierra el diálogo y resetea el formulario.
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

  // Funciones para obtener descripciones legibles a partir de IDs.
  const getRouteDescription = (routeId: string) => {
    if (!routes || routes.length === 0) return routeId;
    return routes.find(route => String(route.id_ruta) === String(routeId))?.ruta_desc || routeId;
  }
  
  const getUserName = (userId: string) => {
    return users.find(user => String(user.id_user) === String(userId))?.name || userId;
  }
  
  // Lógica de paginación.
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
  const paginatedShipments = filteredShipments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Maneja el cambio en el input de fecha personalizada.
  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterType('date');
    setCustomDate(e.target.value);
  }

  return {
    shipments,
    filteredShipments,
    paginatedShipments,
    routes,
    motoristas,
    auxiliares,
    users,
    isDialogOpen,
    setIsDialogOpen,
    editingShipment,
    setEditingShipment,
    filterType,
    setFilterType,
    customDate,
    setCustomDate,
    currentPage,
    setCurrentPage,
    totalPages,
    form,
    applyFilters,
    handleCustomDateChange,
    handleEdit,
    handleDelete,
    onSubmit,
    handleOpenDialog,
    handleCloseDialog,
    getRouteDescription,
    getUserName
  }
}
