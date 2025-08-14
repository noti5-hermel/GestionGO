
export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
      <div className="flex items-center space-x-4">
        <svg
          className="h-16 w-16 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
        <h1 className="text-4xl font-bold">GestiónGo</h1>
      </div>
      <p className="mt-4 text-lg text-muted-foreground">
        Tu solución integral para la gestión.
      </p>
    </div>
  )
}
