
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from 'next/link'
import { ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bienvenido a GestiónGo</CardTitle>
          <CardDescription>Su panel de control central para gestionar todas sus operaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Utilice el menú de la izquierda para navegar por las diferentes secciones de la aplicación.</p>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Clientes</CardTitle>
            <CardDescription>Añada, edite y vea su base de clientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/customers" passHref>
              <Button>
                Ir a Clientes <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Despachos</CardTitle>
            <CardDescription>Gestione toda la información de sus envíos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/shipments" passHref>
              <Button>
                Ir a Despachos <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Facturación</CardTitle>
            <CardDescription>Cree y visualice facturas para sus clientes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/invoicing" passHref>
              <Button>
                Ir a Facturación <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
         <Card>
          <CardHeader>
            <CardTitle>Gestión de Vehículos</CardTitle>
            <CardDescription>Añada y mantenga su flota de vehículos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/vehicles" passHref>
              <Button>
                Ir a Vehículos <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Facturación por Despacho</CardTitle>
            <CardDescription>Gestione las facturas asociadas a cada despacho.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/shipment-invoicing" passHref>
              <Button>
                Ir a Facturación Despacho <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
