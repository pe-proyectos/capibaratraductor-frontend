import { useCallback } from "react"
import { FileUploader, Pane, toaster } from "evergreen-ui"
import { imagesFiles, translations } from './stores';

export function ImageFileUploader() {
    function naturalSort(a, b) {
        const regex = /(\d+)|(\D+)/g;
    
        const aParts = String(a).toLowerCase().match(regex);
        const bParts = String(b).toLowerCase().match(regex);
    
        while (aParts.length && bParts.length) {
            const aPart = aParts.shift();
            const bPart = bParts.shift();
    
            const aNum = parseInt(aPart, 10);
            const bNum = parseInt(bPart, 10);
    
            if (isNaN(aNum) || isNaN(bNum)) {
                if (aPart > bPart) return 1;
                if (aPart < bPart) return -1;
            } else {
                if (aNum > bNum) return 1;
                if (aNum < bNum) return -1;
            }
        }
    
        return aParts.length - bParts.length;
    }
    const handleChange = useCallback((files) => {
        const currentTranslations = translations.get();
        files.forEach((file) => {
            delete currentTranslations[file.name];
        });
        translations.set(currentTranslations);
        const newFilesObject = {
            ...imagesFiles.get(),
            ...files.reduce((acc, file) => {
                acc[file.name] = {
                    name: file.name,
                    file: file,
                    order: 0,
                };
                return acc;
            }, {})
        };
        const sortedFiles = Object.keys(newFilesObject).sort(naturalSort);
        sortedFiles.forEach((fileName, index) => {
            newFilesObject[fileName].order = index;
        });
        imagesFiles.set(newFilesObject);
    }, [])
    const handleRejected = useCallback((fileRejections) => {
        console.log(fileRejections);
        fileRejections.forEach((fileRejection) => {
            console.log();
            toaster.danger('Error al subir el archivo', {
                description: `No se puede agregar el archivo ${fileRejection.file.name}`
            });
        })
    }, [])
    return (
        <Pane maxWidth={654}>
            <FileUploader
                label="Subir imagenes"
                description="Puedes subir 1 imagen con un tamaño máximo de 8MB en formato de jpg, jpeg, png o webp."
                acceptedMimeTypes={["image/jpeg", "image/jpg", "image/png", "image/webp"]}
                browseOrDragText={
                    () => <p>
                        <span className="text-blue-500">Selecciona</span>
                        <span>&nbsp;o Arrastra una o más imágenes para iniciar</span>
                    </p>
                }
                maxSizeInBytes={8 * 1024 ** 2}
                maxFiles={100}
                onChange={handleChange}
                onRejected={handleRejected}
            />
        </Pane>
    )
}
