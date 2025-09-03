
'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PlusCircle, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react"
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
    isMotoristaOrAuxiliar,
    reviewRole,
    reviewFilter,
    setReviewFilter,
  } = useShipments({ itemsPerPage: ITEMS_PER_PAGE });

  const showReviewFilters = reviewRole && !isMotoristaOrAuxiliar;

  const getPaginationNumbers = () => {
    const pages = [];
    const totalVisiblePages = 5;
    if (totalPages <= totalVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle>Despachos</CardTitle>
            <CardDescription>Gestione la información de sus envíos y estados.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showReviewFilters ? (
              <div className="flex items-center gap-2">
                <Label>Filtrar:</Label>
                <Button variant={reviewFilter === 'pending' ? 'default' : 'outline'} onClick={() => setReviewFilter('pending')}>Pendientes</Button>
                <Button variant={reviewFilter === 'reviewed' ? 'default' : 'outline'} onClick={() => setReviewFilter('reviewed')}>Revisados</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Label>Filtrar por fecha:</Label>
                <Button variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>Todos</Button>
                <Button variant={filterType === 'today' ? 'default' : 'outline'} onClick={() => setFilterType('today')}>Hoy</Button>
                <Input
                  type="date"
                  value={customDate}
                  onChange={handleCustomDateChange}
                  className="w-auto"
                />
              </div>
            )}
            {!isMotoristaOrAuxiliar && !reviewRole && (
              <Button onClick={() => { setEditingShipment(null); form.reset(); setIsDialogOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Despacho
              </Button>
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
          reviewRole={reviewRole}
          routes={routes}
          users={users}
        />
      </CardContent>
      <CardFooter className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{paginatedShipments.length}</strong> de <strong>{filteredShipments.length}</strong> despachos.
        </div>
        <div className="flex items-center space-x-2">
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
            >
                <span className="sr-only">Primera página</span>
                <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
            >
                <span className="sr-only">Página anterior</span>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
                {getPaginationNumbers().map((page, index) =>
                    typeof page === 'number' ? (
                        <Button
                            key={index}
                            variant={currentPage === page ? 'default' : 'outline'}
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </Button>
                    ) : (
                        <span key={index} className="px-1.5">...</span>
                    )
                )}
            </div>
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
            >
                <span className="sr-only">Siguiente página</span>
                <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
            >
                <span className="sr-only">Última página</span>
                <ChevronsRight className="h-4 w-4" />
            </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
        </div>
      </CardFooter>

      {isDialogOpen && (
          <ShipmentForm
            form={form}
            isOpen={isDialogOpen}
            setIsOpen={setIsDialogOpen}
            editingShipment={editingShipment}
            onSubmit={onSubmit}
            handleCloseDialog={handleCloseDialog}
            routes={routes}
            motoristas={motoristas}
            auxiliares={auxiliares}
            reviewRole={reviewRole}
          />
      )}
    </Card>
  )
}

    