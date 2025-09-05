
'use client'

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

/**
 * @file use-shipments.ts
 * @description Hook personalizado que encapsula toda la lógica de negocio para la gestión de despachos.
 * Maneja el estado, la obtención de datos, el filtrado, la paginación y las operaciones CRUD.
 */

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
  total_contado: z.coerce.number().min(0).optional(),
  total_credito: z.coerce.number().min(0).optional(),
  total_general: z.coerce.number().min(0).optional(),
  fecha_despacho: z.string().min(1, "La fecha es requerida."),
  facturacion: z.boolean().default(true),
  bodega: z.boolean().default(false),
  reparto: z.boolean().default(false),
  asist_admon: z.boolean().default(false),
  gerente_admon: z.boolean().default(false),
  cobros: z.boolean().default(false),
})

// Tipos de datos para la gestión de despachos.
export type Shipment = z.infer<typeof shipmentSchema> & { 
  id_despacho: string;
  total_contado: number;
  total_credito: number;
  total_general: number;
}
export type Route = { id_ruta: string; ruta_desc: string }
export type User = { id_user: string; name: string }
interface UserSession {
  id: string;
  name: string;
  role: string;
}

export type ShipmentInvoice = {
  id_fac_desp: number
  id_factura: string
  comprobante: string
  forma_pago: "Efectivo" | "Tarjeta" | "Transferencia"
  monto: number
  state: boolean
  reference_number?: string | number
  tax_type?: string
  grand_total?: number
}


export type ReviewRole = keyof Pick<Shipment, 'facturacion' | 'bodega' | 'reparto' | 'asist_admon' | 'gerente_admon' | 'cobros'>;

interface UseShipmentsProps {
  itemsPerPage: number;
}

/**
 * Hook principal para la lógica de la página de despachos.
 * @param {UseShipmentsProps} props - Propiedades para configurar el hook, como `itemsPerPage`.
 * @returns Un objeto con el estado y las funciones necesarias para la página de despachos.
 */
export const useShipments = ({ itemsPerPage }: UseShipmentsProps) => {
  // --- ESTADOS ---
  const [shipments, setShipments] = useState<Shipment[]>([]) // Lista completa de despachos
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([]) // Despachos filtrados
  const [routes, setRoutes] = useState<Route[]>([]) // Lista de rutas para el formulario
  const [motoristas, setMotoristas] = useState<User[]>([]) // Lista de motoristas para el formulario
  const [auxiliares, setAuxiliares] = useState<User[]>([]) // Lista de auxiliares para el formulario
  const [users, setUsers] = useState<User[]>([]) // Lista de todos los usuarios
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null)
  const { toast } = useToast()

  // --- ESTADOS DE FILTRADO Y PAGINACIÓN ---
  const [filterType, setFilterType] = useState<'all' | 'today' | 'date'>('all');
  const [customDate, setCustomDate] = useState<string>("")
  const [currentPage, setCurrentPage] = useState(1);
  const [session, setSession] = useState<UserSession | null>(null);
  const [reviewFilter, setReviewFilter] = useState<'pending' | 'reviewed'>('pending');

  // --- FORMULARIO ---
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
      facturacion: true,
      bodega: false,
      reparto: false,
      asist_admon: false,
      gerente_admon: false,
      cobros: false,
    },
  })
  
  /**
   * Determina el rol de revisión específico basado en la descripción del rol del usuario.
   * @param userRole - El rol del usuario en minúsculas.
   * @returns El campo de estado correspondiente en la tabla de despacho, o null.
   */
  const getReviewRoleFromSession = (userRole: string): ReviewRole | null => {
    if (userRole.includes('motorista')) return 'reparto';
    if (userRole.includes('auxiliar')) return 'reparto';
    if (userRole.includes('facturacion')) return 'facturacion';
    if (userRole.includes('bodega')) return 'bodega';
    if (userRole.includes('reparto')) return 'reparto';
    if (userRole.includes('asist.admon')) return 'asist_admon';
    if (userRole.includes('gerente.admon')) return 'gerente_admon';
    if (userRole.includes('cobros')) return 'cobros';
    return null;
  };

  /**
   * Aplica los filtros actuales (por rol, fecha, estado de revisión) a la lista de despachos.
   */
  const applyFilters = () => {
    let baseShipments = [...shipments];
    
    if (session) {
      const userRole = session.role.toLowerCase();
      const reviewRole = getReviewRoleFromSession(userRole);

      // Filtra para mostrar solo los despachos del motorista/auxiliar si es su rol.
      if (userRole.includes('motorista') || userRole.includes('auxiliar')) {
        baseShipments = shipments.filter(s =>
          String(s.id_motorista) === String(session.id) ||
          String(s.id_auxiliar) === String(session.id)
        );
      }
      
      // Filtra por estado de revisión (pendiente/revisado) para los roles de revisión.
      if (reviewRole && !(userRole.includes('motorista') || userRole.includes('auxiliar'))) {
        if (reviewFilter === 'pending') {
          baseShipments = shipments.filter(s => s[reviewRole] === false);
        } else {
          baseShipments = shipments.filter(s => s[reviewRole] === true);
        }
      }
    }

    // Aplica el filtro de fecha.
    let newFilteredShipments = [...baseShipments];
    if (filterType === 'today') {
        const today = new Date().toISOString().split('T')[0];
        newFilteredShipments = baseShipments.filter(s => s.fecha_despacho === today);
    } else if (filterType === 'date' && customDate) {
        newFilteredShipments = baseShipments.filter(s => s.fecha_despacho === customDate);
    }
    setFilteredShipments(newFilteredShipments);
    setCurrentPage(1); // Resetea la paginación al cambiar filtros.
  };
  
  // Obtiene la sesión del usuario del localStorage al cargar.
  useEffect(() => {
    try {
      const userSession = localStorage.getItem('user-session');
      if (userSession) {
        setSession(JSON.parse(userSession));
      }
    } catch (error) {
      console.error("Failed to parse user session from localStorage", error);
    }
  }, []);

  // Carga todos los datos necesarios al montar el componente.
  useEffect(() => {
    fetchShipments()
    fetchRoutes()
    fetchUsersByRole()
    fetchAllUsers()
  }, [])
  
  // Vuelve a aplicar los filtros cada vez que cambian los datos base o los filtros.
  useEffect(() => {
    applyFilters();
  }, [shipments, filterType, customDate, session, reviewFilter]);

  // Rellena el formulario al seleccionar un despacho para editar.
  useEffect(() => {
    if (editingShipment) {
      // Corrige el problema de la fecha "un día antes" asegurando que se interprete como UTC.
      const utcDate = new Date(editingShipment.fecha_despacho + 'T00:00:00Z');
      const localDateString = utcDate.toISOString().split('T')[0];

      form.reset({
        ...editingShipment,
        id_ruta: String(editingShipment.id_ruta),
        id_motorista: String(editingShipment.id_motorista),
        id_auxiliar: String(editingShipment.id_auxiliar),
        fecha_despacho: localDateString,
      })
    } else {
      // Resetea el formulario a los valores por defecto para un nuevo despacho.
      form.reset({
        id_ruta: "",
        id_motorista: "",
        id_auxiliar: "",
        total_contado: 0,
        total_credito: 0,
        total_general: 0,
        fecha_despacho: new Date().toISOString().split('T')[0],
        facturacion: true,
        bodega: false,
        reparto: false,
        asist_admon: false,
        gerente_admon: false,
        cobros: false,
      })
    }
  }, [editingShipment, form])

  /** Obtiene la lista completa de todos los usuarios para mostrar nombres en la tabla. */
  const fetchAllUsers = async () => {
    const { data, error } = await supabase.from('usuario').select('id_user, name');
    if (error) {
      toast({ title: "Error", description: `No se pudieron cargar los usuarios: ${error.message}`, variant: "destructive" });
    } else {
      setUsers(data || []);
    }
  }

  /** Obtiene la lista completa de despachos. */
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

  /** Obtiene la lista de rutas para el formulario. */
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

  /** Obtiene listas de usuarios filtrados por rol (motoristas, auxiliares) para el formulario. */
  const fetchUsersByRole = async () => {
    // Busca el ID del rol 'motorista'
    const { data: motoristaRoles, error: motoristaRolesError } = await supabase
      .from('rol')
      .select('id_rol')
      .ilike('rol_desc', '%motorista%');

    if (motoristaRolesError) {
      toast({ title: "Error al buscar rol motorista", description: motoristaRolesError.message, variant: "destructive" });
    } else if (motoristaRoles && motoristaRoles.length > 0) {
      const motoristaRoleIds = motoristaRoles.map(r => r.id_rol);
      // Obtiene los usuarios con ese ID de rol.
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

    // Proceso similar para el rol 'auxiliar'.
    const { data: auxiliarRoles, error: auxiliarRolesError } = await supabase
      .from('rol')
      .select('id_rol')
      .ilike('rol_desc', '%auxiliar%');

    if (auxiliarRolesError) {
      toast({ title: "Error al buscar rol auxiliar", description: auxiliarRolesError.message, variant: "destructive" });
    } else if (auxiliarRoles && auxiliarRoles.length > 0) {
      const auxiliarRoleIds = auxiliarRoles.map(r => r.id_rol);
      const { data: auxiliaresData, error: auxiliaresError } = await supabase
        .from('usuario')
        .select('id_user, name')
        .in('id_rol', auxiliarRoleIds);
      if (auxiliaresError) {
        toast({ title: "Error al cargar auxiliares", description: `No se pudieron cargar los auxiliares: ${auxiliaresError.message}`, variant: "destructive" });
      } else {
        setAuxiliares(auxiliaresData || []);
      }
    }
  }

  /**
   * Gestiona el envío del formulario para crear o actualizar un despacho.
   * @param values Los datos del formulario validados por Zod.
   */
  const onSubmit = async (values: z.infer<typeof shipmentSchema>) => {
    let error;

    const dataToSubmit = {
      id_ruta: values.id_ruta,
      id_motorista: values.id_motorista,
      id_auxiliar: values.id_auxiliar,
      fecha_despacho: values.fecha_despacho,
      facturacion: values.facturacion,
      bodega: values.bodega,
      reparto: values.reparto,
      asist_admon: values.asist_admon,
      gerente_admon: values.gerente_admon,
      cobros: values.cobros,
    };

    if (editingShipment) {
      const { error: updateError } = await supabase
        .from('despacho')
        .update(dataToSubmit)
        .eq('id_despacho', editingShipment.id_despacho)
        .select()
      error = updateError;
    } else {
       const { error: insertError } = await supabase
        .from('despacho')
        .insert([dataToSubmit])
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

  /**
   * Elimina un despacho de la base de datos.
   * @param shipmentId El ID del despacho a eliminar.
   */
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
  
  /** Prepara el formulario para editar un despacho. */
  const handleEdit = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setIsDialogOpen(true);
  }

  /** Controla la apertura del diálogo de creación/edición. */
  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingShipment(null);
    }
  };

  /** Cierra el diálogo y resetea el formulario. */
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
        facturacion: true,
        bodega: false,
        reparto: false,
        asist_admon: false,
        gerente_admon: false,
        cobros: false,
    });
    setIsDialogOpen(false);
  }

  /** Obtiene la descripción legible de una ruta a partir de su ID. */
  const getRouteDescription = (routeId: string) => {
    if (!routes || routes.length === 0) return routeId;
    return routes.find(route => String(route.id_ruta) === String(routeId))?.ruta_desc || routeId;
  }
  
  /** Obtiene el nombre de un usuario a partir de su ID. */
  const getUserName = (userId: string) => {
    return users.find(user => String(user.id_user) === String(userId))?.name || userId;
  }
  
  // --- VALORES DE RETORNO ---
  // Se exponen el estado y las funciones que el componente de la página necesita.
  
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
  const paginatedShipments = filteredShipments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterType('date');
    setCustomDate(e.target.value);
  }
  
  const isMotoristaOrAuxiliar = session?.role?.toLowerCase().includes('motorista') || session?.role?.toLowerCase().includes('auxiliar');
  const reviewRole = session?.role ? getReviewRoleFromSession(session.role.toLowerCase()) : null;

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
    getUserName,
    isMotoristaOrAuxiliar,
    reviewRole,
    reviewFilter,
    setReviewFilter
  }
}
