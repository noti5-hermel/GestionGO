import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function VehicleBillingPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Facturación Vehicular</CardTitle>
            <CardDescription>Gestione la facturación por vehículo y despacho.</CardDescription>
          </div>
           <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Registro
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehículo</TableHead>
              <TableHead>ID Despacho</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Camión A-123</TableCell>
              <TableCell>DS-001</TableCell>
              <TableCell>2024-05-20</TableCell>
              <TableCell>$300.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Furgoneta B-456</TableCell>
              <TableCell>DS-002</TableCell>
              <TableCell>2024-05-18</TableCell>
              <TableCell>$150.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Camión C-789</TableCell>
              <TableCell>DS-003</TableCell>
              <TableCell>2024-05-19</TableCell>
              <TableCell>$450.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> registros.
        </div>
      </CardFooter>
    </Card>
  )
}
