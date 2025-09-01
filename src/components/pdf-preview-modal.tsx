
'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Download, X } from "lucide-react"

interface PdfPreviewModalProps {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  pdfDataUri: string
  fileName: string
}

export function PdfPreviewModal({
  isOpen,
  setIsOpen,
  pdfDataUri,
  fileName,
}: PdfPreviewModalProps) {

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfDataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Vista Previa del Informe</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={pdfDataUri}
            className="w-full h-full"
            title="Vista previa del PDF"
          />
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
          <Button onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
