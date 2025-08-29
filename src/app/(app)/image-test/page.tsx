
'use client'

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, Trash2 } from "lucide-react"
import Image from "next/image"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


// Define el tipo para un archivo de imagen en Supabase Storage
interface ImageFile {
  name: string;
  url: string;
}

export default function ImageTestPage() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const BUCKET_NAME = 'comprobante' // Define el nombre de tu bucket

  // Función para obtener las imágenes del bucket de Supabase
  const fetchImages = async () => {
    setLoading(true);
    const { data: fileList, error } = await supabase.storage.from(BUCKET_NAME).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    });

    if (error) {
      toast({
        title: "Error al cargar imágenes",
        description: `Asegúrate de que el bucket '${BUCKET_NAME}' exista y tenga las políticas correctas.`,
        variant: "destructive",
      });
      console.error("Error fetching images:", error.message);
    } else if (fileList) {
      const imageUrls = fileList.map(file => {
        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(file.name);
        return { name: file.name, url: data.publicUrl };
      });
      setImages(imageUrls);
    }
    setLoading(false);
  };
  
  // Carga las imágenes al montar el componente
  useEffect(() => {
    fetchImages();
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Sin archivo", description: "Por favor, selecciona un archivo para subir.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const fileName = `${Date.now()}-${selectedFile.name}`;
    
    // Sube el archivo al bucket de Supabase
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, selectedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    setLoading(false);
    
    if (error) {
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
      console.error("Error uploading file:", error.message);
    } else {
      toast({ title: "Éxito", description: "Imagen subida correctamente." });
      setSelectedFile(null); // Limpia la selección
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Resetea el input de archivo
      }
      fetchImages(); // Recarga la lista de imágenes
    }
  };

  const handleDelete = async (fileName: string) => {
    setLoading(true);
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName]);
    setLoading(false);

    if (error) {
        toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    } else {
        toast({ title: "Éxito", description: "Imagen eliminada correctamente." });
        fetchImages(); // Recarga la lista de imágenes
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Prueba de Carga de Imágenes</CardTitle>
        <CardDescription>
          Sube imágenes a Supabase Storage y visualízalas. 
          Asegúrate de que el bucket `comprobante` exista y que sus políticas de seguridad (RLS) permitan las operaciones de `select`, `insert`, y `delete` para los usuarios autenticados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg">
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="flex-1"
          />
          <Button onClick={handleUpload} disabled={loading || !selectedFile}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? 'Subiendo...' : 'Subir Imagen'}
          </Button>
        </div>

        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vista Previa</TableHead>
                <TableHead>Nombre del Archivo</TableHead>
                <TableHead>URL Pública</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && images.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">Cargando imágenes...</TableCell>
                </TableRow>
              ) : images.length > 0 ? (
                images.map((image) => (
                  <TableRow key={image.name}>
                    <TableCell>
                      <Image
                        src={image.url}
                        alt={`Vista previa de ${image.name}`}
                        width={80}
                        height={80}
                        className="h-20 w-20 rounded-md object-cover"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{image.name}</TableCell>
                    <TableCell>
                        <a href={image.url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                            Ver imagen
                        </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. Esto eliminará permanentemente la imagen.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(image.name)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No hay imágenes en el bucket.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Mostrando <strong>{images.length}</strong> imágenes.
        </div>
      </CardFooter>
    </Card>
  )
}
