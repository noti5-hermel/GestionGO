import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function ShipmentsPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Despachos</CardTitle>
            <CardDescription>Gestione la información de sus envíos.</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Nuevo Despacho
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Despacho</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">DS-001</TableCell>
              <TableCell>Almacén A</TableCell>
              <TableCell>Cliente X</TableCell>
              <TableCell><Badge>En Tránsito</Badge></TableCell>
              <TableCell>2024-05-20</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">DS-002</TableCell>
              <TableCell>Almacén B</TableCell>
              <TableCell>Cliente Y</TableCell>
              <TableCell><Badge variant="destructive">Retrasado</Badge></TableCell>
              <TableCell>2024-05-18</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">DS-003</TableCell>
              <TableCell>Almacén A</TableCell>
              <TableCell>Cliente Z</TableCell>
              <TableCell><Badge variant="outline">Entregado</Badge></TableCell>
              <TableCell>2024-05-19</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
       <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> despachos.
        </div>
      </CardFooter>
    </Card>
  )
}
