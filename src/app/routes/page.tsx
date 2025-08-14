import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default function RoutesPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Rutas</CardTitle>
            <CardDescription>Gestione las rutas de despacho.</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ruta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre de Ruta</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Distancia (km)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Ruta Norte</TableCell>
              <TableCell>Ciudad A</TableCell>
              <TableCell>Ciudad B</TableCell>
              <TableCell>150</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Ruta Sur</TableCell>
              <TableCell>Ciudad A</TableCell>
              <TableCell>Ciudad C</TableCell>
              <TableCell>220</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Ruta Local</TableCell>
              <TableCell>Almacén Central</TableCell>
              <TableCell>Zona Industrial</TableCell>
              <TableCell>25</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> rutas.
        </div>
      </CardFooter>
    </Card>
  )
}
