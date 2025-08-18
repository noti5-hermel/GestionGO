
'use client'

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
            <Image
                src="/gestion-go.120Z.png"
                alt="GestiónGo Logo"
                width={80}
                height={80}
                className="h-20 w-20 mx-auto"
            />
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico y contraseña para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="nombre@ejemplo.com"
              required
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="#"
                className="ml-auto inline-block text-sm underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <Input id="password" type="password" required />
          </div>
          <Button type="submit" className="w-full">
            Iniciar Sesión
          </Button>
        </CardContent>
        <CardFooter className="text-center text-sm">
          <div className="w-full">
            ¿No tienes una cuenta?{" "}
            <Link href="#" className="underline">
              Regístrate
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
