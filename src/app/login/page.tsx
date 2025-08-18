
'use client'

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import crypto from "crypto"
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
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Leemos la clave secreta desde las variables de entorno
const HMAC_SECRET_KEY = process.env.NEXT_PUBLIC_HMAC_SECRET_KEY;

function hashPassword(password: string): string {
  if (!HMAC_SECRET_KEY) {
    throw new Error("La clave secreta HMAC no está configurada en las variables de entorno.");
  }
  return crypto.createHmac('sha256', HMAC_SECRET_KEY).update(password).digest('hex');
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const hashedPassword = hashPassword(password);

    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('correo', email)
      .eq('contraseña', hashedPassword)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows returned
      toast({
        title: "Error",
        description: "Ocurrió un error al intentar iniciar sesión.",
        variant: "destructive",
      })
      console.error("Error de Supabase:", error)
      return;
    }

    if (data) {
      toast({
        title: "¡Éxito!",
        description: "Coincidencia encontrada. ¡Bienvenido!",
      })
      // Opcional: Redirigir al usuario después de un inicio de sesión exitoso
      // router.push("/") 
    } else {
      toast({
        title: "Error de autenticación",
        description: "Correo o contraseña incorrectos.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <Image
                src="/gestion-go.120Z.png"
                alt="GestiónGo Logo"
                width={80}
                height={80}
                className="h-20 w-20 mx-auto mb-4"
            />
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu correo electrónico y contraseña para acceder a tu cuenta.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <Input 
                id="password" 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Iniciar Sesión
            </Button>
          </CardContent>
        </form>
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
