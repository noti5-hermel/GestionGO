import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Usuarios</CardTitle>
            <CardDescription>Gestione los usuarios de la aplicación.</CardDescription>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Usuario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/40x40.png" alt="Admin User" data-ai-hint="male profile" />
                    <AvatarFallback>A</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">Admin</span>
                </div>
              </TableCell>
              <TableCell>admin@example.com</TableCell>
              <TableCell>Administrador</TableCell>
              <TableCell><Badge>Activo</Badge></TableCell>
            </TableRow>
            <TableRow>
               <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/40x40.png" alt="Manager User" data-ai-hint="female profile" />
                    <AvatarFallback>G</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">Gerente Logística</span>
                </div>
              </TableCell>
              <TableCell>gerente.log@example.com</TableCell>
              <TableCell>Gerente</TableCell>
              <TableCell><Badge>Activo</Badge></TableCell>
            </TableRow>
            <TableRow>
               <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://placehold.co/40x40.png" alt="Operator User" data-ai-hint="male person" />
                    <AvatarFallback>O</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">Operador</span>
                </div>
              </TableCell>
              <TableCell>operador@example.com</TableCell>
              <TableCell>Operador</TableCell>
              <TableCell><Badge variant="secondary">Inactivo</Badge></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>1-3</strong> de <strong>3</strong> usuarios.
        </div>
      </CardFooter>
    </Card>
  )
}
