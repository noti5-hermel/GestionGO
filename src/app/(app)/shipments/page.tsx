
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { useShipments } from "@/hooks/use-shipments"
import { ShipmentsTable } from "./_components/shipments-table"
import { ShipmentForm } from "./_components/shipment-form"

// Constante para el número de ítems por página en la paginación.
const ITEMS_PER_PAGE = 10;

export default function ShipmentsPage() {
  const {
    filteredShipments,
    paginatedShipments,
    filterType,
    setFilterType,
    customDate,
    setCustomDate,
    handleCustomDateChange,
    currentPage,
    setCurrentPage,
    totalPages,
    form,
    isDialogOpen,
    setIsDialogOpen,
    editingShipment,
    setEditingShipment,
    handleEdit,
    handleDelete,
    onSubmit,
    handleCloseDialog,
    routes,
    motoristas,
    auxiliares,
    users,
    getRouteDescription,
    getUserName,
    isMotoristaOrAuxiliar
  } = useShipments({ itemsPerPage: ITEMS_PER_PAGE });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Despachos</CardTitle>
            <CardDescription>Gestione la información de sus envíos y estados.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Label>Filtrar:</Label>
              <Button variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>Todos</Button>
              <Button variant={filterType === 'today' ? 'default' : 'outline'} onClick={() => setFilterType('today')}>Hoy</Button>
              <Input
                type="date"
                value={customDate}
                onChange={handleCustomDateChange}
                className="w-auto"
              />
            </div>
            {!isMotoristaOrAuxiliar && (
              <ShipmentForm
                form={form}
                isOpen={isDialogOpen}
                setIsOpen={setIsDialogOpen}
                editingShipment={editingShipment}
                setEditingShipment={setEditingShipment}
                onSubmit={onSubmit}
                handleCloseDialog={handleCloseDialog}
                routes={routes}
                motoristas={motoristas}
                auxiliares={auxiliares}
                users={users}
                getRouteDescription={getRouteDescription}
                getUserName={getUserName}
              >
                <Button onClick={() => { setEditingShipment(null); form.reset(); setIsDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Despacho
                </Button>
              </ShipmentForm>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <ShipmentsTable 
          shipments={paginatedShipments}
          handleEdit={handleEdit}
          handleDelete={handleDelete}
          getRouteDescription={getRouteDescription}
          getUserName={getUserName}
          isMotoristaOrAuxiliar={isMotoristaOrAuxiliar}
        />
      </CardContent>
      <CardFooter className="pt-6 flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
        </div>
        <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                Anterior
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
            >
                Siguiente
            </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{paginatedShipments.length}</strong> de <strong>{filteredShipments.length}</strong> despachos.
        </div>
      </CardFooter>
    </Card>
  )
}
