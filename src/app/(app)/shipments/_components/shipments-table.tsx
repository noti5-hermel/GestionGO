
'use client'

import Link from "next/link"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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
import { Pencil, Trash2, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Shipment } from "@/hooks/use-shipments"

// Componente para mostrar un badge de estado de forma consistente.
const StatusBadge = ({ checked }: { checked: boolean }) => {
  return <Badge variant={checked ? "default" : "outline"}>{checked ? "OK" : "Pend."}</Badge>
}

type ReviewRole = keyof Pick<Shipment, 'facturacion' | 'bodega' | 'reparto' | 'asist_admon' | 'gerente_admon' | 'cobros'>;

interface ShipmentsTableProps {
  shipments: Shipment[];
  handleEdit: (shipment: Shipment) => void;
  handleDelete: (shipmentId: string) => void;
  getRouteDescription: (routeId: string) => string;
  getUserName: (userId: string) => string;
  isMotoristaOrAuxiliar?: boolean;
  reviewRole: ReviewRole | null;
}

export function ShipmentsTable({
  shipments,
  handleEdit,
  handleDelete,
  getRouteDescription,
  getUserName,
  isMotoristaOrAuxiliar,
  reviewRole,
}: ShipmentsTableProps) {
  
  const canEdit = reviewRole || !isMotoristaOrAuxiliar;

  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-max">
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
            <TableHead>Facturación</TableHead>
            <TableHead>Bodega</TableHead>
            <TableHead>Reparto</TableHead>
            <TableHead>Asist. Admon.</TableHead>
            <TableHead>Gerente Admon.</TableHead>
            <TableHead>Cobros</TableHead>
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
              <TableCell>{new Date(shipment.fecha_despacho).toLocaleDateString()}</TableCell>
              <TableCell>${shipment.total_contado.toFixed(2)}</TableCell>
              <TableCell>${shipment.total_credito.toFixed(2)}</TableCell>
              <TableCell>${shipment.total_general.toFixed(2)}</TableCell>
              <TableCell><StatusBadge checked={shipment.facturacion} /></TableCell>
              <TableCell><StatusBadge checked={shipment.bodega} /></TableCell>
              <TableCell><StatusBadge checked={shipment.reparto} /></TableCell>
              <TableCell><StatusBadge checked={shipment.asist_admon} /></TableCell>
              <TableCell><StatusBadge checked={shipment.gerente_admon} /></TableCell>
              <TableCell><StatusBadge checked={shipment.cobros} /></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/shipments/${shipment.id_despacho}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(shipment)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {!isMotoristaOrAuxiliar && !reviewRole && (
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
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
