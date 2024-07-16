import { useCallback } from "react"
import { FileUploader, Pane, toaster } from "evergreen-ui"
import { imagesFiles, translations } from './stores';

export function ImageFileUploader() {
    const handleChange = useCallback((files) => {
        const currentTranslations = translations.get();
        files.forEach((file) => {
            delete currentTranslations[file.name];
        });
        translations.set(currentTranslations);
        imagesFiles.set({
            ...imagesFiles.get(),
            ...files.reduce((acc, file) => {
                acc[file.name] = {
                    name: file.name,
                    file: file,
                };
                return acc;
            }, {})
        });
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
                label="Subir imagen"
                description="Puedes subir 1 imagen con un tamaño máximo de 8MB en formato de jpg, jpeg, png o webp."
                acceptedMimeTypes={["image/jpeg", "image/jpg", "image/png", "image/webp"]}
                browseOrDragText={
                    () => <p>
                        <span className="text-blue-500">Selecciona</span>
                        <span>&nbsp;o Arrastra y suelta una imagen</span>
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
