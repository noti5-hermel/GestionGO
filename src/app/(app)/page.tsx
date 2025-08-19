
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
      <div className="flex items-center space-x-8">
        <Image
          src="/gestion-go.120Z.png"
          alt="GestiónGo Logo"
          width={128}
          height={128}
          className="h-32 w-32"
          data-ai-hint="logo"
        />
        <h1 className="text-6xl font-bold">GestiónGo</h1>
      </div>
      <p className="mt-4 text-lg text-muted-foreground">
        Tu solución integral para la gestión.
      </p>
    </div>
  )
}
