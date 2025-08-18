
'use client'

import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
       <div className="flex flex-col items-center justify-center mb-8">
        <Image
            src="/gestion-go.120Z.png"
            alt="GestiónGo Logo"
            width={80}
            height={80}
            className="h-20 w-20"
        />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingrese sus credenciales para acceder a su cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input id="email" type="email" placeholder="nombre@ejemplo.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">
            Iniciar Sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
