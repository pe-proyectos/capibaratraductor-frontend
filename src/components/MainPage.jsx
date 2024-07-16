import { useEffect, useState } from "react";
import { useStore } from '@nanostores/react';
import {
    Button,
    Switch,
    Dialog,
    Pane,
    Select,
    TextInput,
    Textarea,
    toaster,
    Spinner
} from "evergreen-ui";
import { ImageFileUploader } from "./ImageFileUploader";
import { ImageCanvas } from "./ImageCanvas";
import { imagesFiles, translations } from './stores';

export function MainPage() {
    const $translations = useStore(translations);
    const $imagesFiles = useStore(imagesFiles);
    const [selectedImageName, setSelectedImageName] = useState(null);

    const [fromLanguage, setFromLanguage] = useState('ja');
    const [toLanguage, setToLanguage] = useState('es');

    const [horizontalReadingDirection, setHorizontalReadingDirection] = useState('RL');
    const [verticalReadingDirection, setVerticalReadingDirection] = useState('TB');

    const [keepContext, setKeepContext] = useState(true);
    const [titleFormat, setTitleFormat] = useState(`Imagen {orderNumber}: {fileName}`);
    const [lineFormat, setLineFormat] = useState(`- {translatedText}`);
    const [exportFormat, setExportFormat] = useState('txt');
    const [userFileName, setUserFileName] = useState('');

    const [editingZone, setEditingZone] = useState(null);

    const [exportDialogIsShown, setExportDialogIsShown] = useState(false);
    const [manualCorrectionDialogIsShown, setManualCorrectionDialogIsShown] = useState(false);

    useEffect(() => {
        if (!$imagesFiles[selectedImageName]) {
            if (Object.keys($imagesFiles).length > 0) {
                const key = Object.keys($imagesFiles)[0];
                setSelectedImageName(key);
            } else {
                setSelectedImageName(null);
            }
        }
    }, [$imagesFiles]);

    const createImageTranslation = (imageName, zone) => {
        const prevTranslations = { ...translations.get() };
        prevTranslations[imageName] = [
            ...(prevTranslations[imageName] || []),
            {
                ...zone,
                order: (prevTranslations[imageName] || []).length + 1
            }
        ];
        translations.set(prevTranslations);
    }

    const updateImageTranslation = (imageName, order, data) => {
        const prevTranslations = { ...translations.get() };
        prevTranslations[imageName] = (prevTranslations[imageName] || []).map(z => {
            if (z.order !== order) {
                return z;
            }
            return { ...z, ...data };
        });
        translations.set(prevTranslations);
    }

    const openEditingZone = (zone) => {
        setEditingZone(zone);
        setManualCorrectionDialogIsShown(true);
    }

    const saveEditingZone = () => {
        updateImageTranslation(selectedImageName, editingZone.order, {
            originalText: editingZone.originalText,
            translatedText: editingZone.translatedText,
            translating: false,
            translated: true
        });
        setEditingZone(null);
        setManualCorrectionDialogIsShown(false);
    }

    const translateZone = async (imageName, base64String) => {
        try {
            const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/translate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    imageData: base64String,
                    fromLanguage,
                    toLanguage,
                    horizontalReadingDirection,
                    verticalReadingDirection,
                    keepContext,
                }),
            });
            const { data: translations } = await response.json();
            if (translations.length === 0) {
                toaster.warning("No se encontró texto en la zona seleccionada");
                return;
            }
            for (const { originalText, translatedText } of translations) {
                if (!originalText || !translatedText) {
                    continue;
                }
                createImageTranslation(imageName, {
                    base64String,
                    originalText,
                    translatedText,
                    translating: false,
                    translated: true
                });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleZoneSelected = (base64String) => {
        translateZone(selectedImageName, base64String);
    }

    const selectImageFile = (fileName) => {
        setSelectedImageName(fileName);
    }

    const removeImage = (fileName) => {
        delete $translations[fileName];
        translations.set($translations);
        delete $imagesFiles[fileName];
        imagesFiles.set($imagesFiles);
        setSelectedImageName(null);
    }

    const removeSelectedZone = (index) => {
        const newSelectedZones = [...$translations[selectedImageName]];
        newSelectedZones.splice(index, 1);
        translations.set({
            ...$translations,
            [selectedImageName]: newSelectedZones,
        });
    }

    const downloadTXT = (fileName, content) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const link = document.createElement('a');
        link.download = fileName;
        link.href = window.URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const generateFileName = () => {
        const now = new Date();
        const currentDate = now.getDate().toString().padStart(2, '0');
        const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentYear = now.getFullYear().toString();
        const hour = now.getHours().toString().padStart(2, '0');
        const minute = now.getMinutes().toString().padStart(2, '0');
        return `${userFileName || "traducción"} - ${currentDate}/${currentMonth}/${currentYear} ${hour}:${minute}.capibaratraductor.txt`;
    }
    const downloadPageExport = () => {
        if (!selectedImageName) return;

        let result = "";
        const title = titleFormat
            .replaceAll("{fileName}", $imagesFiles[selectedImageName]?.name || "")
            .replaceAll("{imageName}", selectedImageName)
            .replaceAll("{aliasName}", $imagesFiles[selectedImageName]?.alias || "")
            .replaceAll("{orderNumber}", 1);
        result += `${title}\n\n`;
        for (const zone of $translations[selectedImageName]) {
            const line = lineFormat
                .replaceAll("{orderNumber}", zone.order)
                .replaceAll("{originalText}", zone.originalText)
                .replaceAll("{translatedText}", zone.translatedText);
            result += `${line}\n`;
        }
        result += "\n\n";

        downloadTXT(generateFileName(), result);
    }

    const downloadFullExport = () => {
        let result = "";
        let order = 0;
        for (const imageName in $translations) {
            order++;
            const title = titleFormat
                .replaceAll("{fileName}", $imagesFiles[imageName]?.name || "")
                .replaceAll("{imageName}", imageName)
                .replaceAll("{aliasName}", $imagesFiles[imageName]?.alias || "")
                .replaceAll("{orderNumber}", order);
            result += `${title}\n\n`;
            for (const zone of $translations[imageName]) {
                const line = lineFormat
                    .replaceAll("{orderNumber}", zone.order)
                    .replaceAll("{originalText}", zone.originalText)
                    .replaceAll("{translatedText}", zone.translatedText);
                result += `${line}\n`;
            }
            result += "\n\n";
        }
        downloadTXT(generateFileName(), result);
    }

    return (
        <main className="min-h-svh w-full">
            <div className="min-h-svh w-full grid grid-cols-4">
                <div className="w-full col-span-1 p-4 h-svh overflow-y-auto">
                    <div className="flex align-middle justify-between mb-4">
                        <div className="my-auto">
                            <p className="text-2xl">Capibara Traductor</p>
                            <p className="my-auto">Tu traductor de imágenes</p>
                        </div>
                        <img
                            className="object-cover"
                            src="/capibara.png"
                            alt="Capibara"
                            width="128px"
                        />
                    </div>
                    <ImageFileUploader />
                    <p className={"text-2xl my-4" + (Object.values($imagesFiles).length > 0 ? "" : " hidden")}>Archivos</p>
                    <ul>
                        {Object.values($imagesFiles).sort((a, b) => a.name.localeCompare(b.name)).map((image) => (
                            <li key={image.name}>
                                <div
                                    className={
                                        "flex items-center text-black hover:bg-blue-400 hover:text-blue-950 cursor-pointer w-full p-1 m-1 rounded-md"
                                        + (selectedImageName === image.name ? " bg-blue-200 text-blue-900" : "")
                                    }
                                >
                                    <div
                                        className="flex-grow truncate"
                                        onClick={() => selectImageFile(image.name)}
                                    >
                                        <svg className="inline w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M16 18H8l2.5-6 2 4 1.5-2 2 4Zm-1-8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/>
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 3v4a1 1 0 0 1-1 1H5m14-4v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1ZM8 18h8l-2-4-1.5 2-2-4L8 18Zm7-8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z"/>
                                        </svg>
                                        <span className="inline text-sm mx-1">
                                            {image.name}
                                        </span>
                                    </div>
                                    <span className="cursor-pointer hover:text-gray-800 hover:bg-red-400 rounded-md" onClick={() => removeImage(image.name)}>
                                        <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                                        </svg>
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="w-full h-full col-span-3 bg-gradient-to-r from-rose-700 to-indigo-700 p-4">
                    <div className="w-[calc(75svw-2rem)] h-[calc(100svh-40svh-2rem)] max-h-[calc(100svh-2rem)] overflow-hidden">
                        <div className={"flex w-full h-full items-center justify-center" + (selectedImageName !== null && Object.values($imagesFiles).length !== 0 ? " hidden" : "")}>
                            <p className="text-white text-2xl font-light">
                                Sube/Selecciona una imagen para comenzar a traducir
                            </p>
                        </div>
                        <ImageCanvas
                            image={$imagesFiles?.[selectedImageName]}
                            handleZoneSelected={handleZoneSelected}
                        />
                    </div>
                    <div className="flex gap-2 w-full h-[calc(40svh-2rem)] mt-[2rem] bg-white shadow-sm rounded-md px-4 py-2">
                        <div className="w-[calc(50%-1rem)] overflow-y-auto">
                            <p className="text-lg font-light my-2">Traducciones</p>
                            <ul className="flex flex-wrap gap-2">
                                {$translations[selectedImageName] && $translations[selectedImageName].map((selectedZone, index) => (
                                    <li key={index} className="hover:bg-gray-100 rounded-md w-full">
                                        <div className="flex min-h-[4rem] w-full">
                                            <div className="flex items-center justify-center min-w-[2rem] rounded-md">
                                                <p className="text-gray-600 text-xl font-light">{selectedZone.order}</p>
                                            </div>
                                            <div className="flex items-center justify-center min-w-[4rem] h-fit my-auto bg-gray-200 rounded-md">
                                                <img
                                                    src={selectedZone.base64String}
                                                    alt="Selected zone"
                                                    className="h-[3rem] w-[3rem] min-h-[3rem] min-w-[3rem] max-h-[3rem] max-w-[3rem] object-scale-down"
                                                />
                                            </div>
                                            <div className="flex flex-grow items-center justify-between p-2">
                                                <div>
                                                    {selectedZone.translating && <Spinner size={24} />}
                                                    <p className="font-light text-xs text-gray-600">{selectedZone.originalText}</p>
                                                    <p>{selectedZone.translatedText}</p>
                                                </div>
                                                <div className="flex gap-2 mx-2">
                                                    <span className="cursor-pointer hover:text-blue-600 rounded-md" onClick={() => openEditingZone(selectedZone)}>
                                                        <svg className="w-6 h-6 translate-y-[1px]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z"/>
                                                        </svg>
                                                    </span>
                                                    <span className="cursor-pointer hover:text-red-600 rounded-md" onClick={() => removeSelectedZone(index)}>
                                                        <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z"/>
                                                        </svg>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-[1px] bg-gray-200 rounded-md"></div>
                        <div className="w-[calc(50%-1rem)] overflow-y-auto">
                            <p className="text-lg font-light my-2">Opciones</p>
                            <div className="flex gap-2 my-2 items-center">
                                <span className="text-sm">Traducir de</span>
                                <Select value={fromLanguage} onChange={event => setFromLanguage(event.target.value)}>
                                    <option value="ja">Japonés</option>
                                    <option value="en">Ingles</option>
                                    <option value="ko">Koreano</option>
                                    <option value="pt">Portugués</option>
                                    <option value="es">Español</option>
                                </Select>
                                <span className="text-sm">a</span>
                                <Select value={toLanguage} onChange={event => setToLanguage(event.target.value)}>
                                    <option value="ja">Japonés</option>
                                    <option value="en">Ingles</option>
                                    <option value="ko">Koreano</option>
                                    <option value="pt">Portugués</option>
                                    <option value="es">Español</option>
                                </Select>
                            </div>
                            <div className="flex gap-2 my-2 items-center">
                                <span className="text-sm">Orden de lectura</span>
                                <Select value={horizontalReadingDirection} onChange={event => setHorizontalReadingDirection(event.target.value)}>
                                    <option value="LR">Izquierda a derecha</option>
                                    <option value="RL">Derecha a izquierda</option>
                                </Select>
                                <Select value={verticalReadingDirection} onChange={event => setVerticalReadingDirection(event.target.value)}>
                                    <option value="TB">Arriba a abajo</option>
                                    <option value="BT">Abajo a arriba</option>
                                </Select>
                            </div>
                            <div className="my-2">
                                <div className="flex gap-2 items-center">
                                    <Switch checked={keepContext} onChange={(e) => setKeepContext(e.target.checked)} />
                                    <span className="text-sm">Mantener contexto</span>
                                </div>
                                <span className="text-xs  text-gray-600">Se utilizaran las traducciones anteriores para mantener el contexto</span>
                            </div>
                            <Button className="my-2" appearance="primary" onClick={() => setExportDialogIsShown(true)}>Exportar</Button>
                        </div>
                    </div>
                </div>
            </div>
            <Pane>
                <Dialog
                    isShown={exportDialogIsShown}
                    title="Exportar traducciones"
                    onCloseComplete={() => setExportDialogIsShown(false)}
                    hasFooter={false}
                >
                    <Pane width="100%">
                        <p className="text-lg font-light mb-2">Opciones de exportación</p>
                        <div className="my-2">
                            <p className="text-sm">Nombre de archivo</p>
                            <TextInput
                                width={"100%"}
                                placeholder="Nombre de archivo"
                                value={userFileName}
                                onChange={(e) => setUserFileName(e.target.value)}
                            />
                            <p className="text-xs text-gray-600">Este es el nombre que tendrá el archivo exportado:</p>
                            <p className="text-xs text-gray-600">{generateFileName()}</p>
                        </div>
                        <div className="my-2">
                            <span className="text-sm">Separador por imagen</span>
                            <Textarea
                                placeholder="Formato del titulo"
                                value={titleFormat}
                                onChange={(e) => setTitleFormat(e.target.value)}
                            />
                            <p className="text-xs text-gray-600">Este es el texto que separa las traducciones de cada imagen</p>
                            <p className="text-xs text-gray-600">Puedes usar las siguientes variables</p>
                            <p className="text-xs text-gray-600">{`{fileName}: Nombre del archivo (Ej. "image.png")`}</p>
                            <p className="text-xs text-gray-600">{`{imageName}: Nombre de la imagen sin extensión (Ej. "image")`}</p>
                            <p className="text-xs text-gray-600">{`{aliasName}: Alias de la imagen`}</p>
                            <p className="text-xs text-gray-600">{`{orderNumber}: Número de orden de la imagen`}</p>
                        </div>
                        <div className="my-2">
                            <span className="text-sm">Formato por linea</span>
                            <Textarea
                                placeholder="Formato de la linea"
                                value={lineFormat}
                                onChange={(e) => setLineFormat(e.target.value)}
                            />
                            <p className="text-xs text-gray-600">Este es el texto que se exporta por linea</p>
                            <p className="text-xs text-gray-600">Puedes usar las siguientes variables</p>
                            <p className="text-xs text-gray-600">{`{originalText}: Texto original`}</p>
                            <p className="text-xs text-gray-600">{`{translatedText}: Texto traducido`}</p>
                            <p className="text-xs text-gray-600">{`{orderNumber}: Nmero de orden de la línea`}</p>
                        </div>
                        <div className="flex gap-2 my-2 items-center">
                            <span className="text-sm">Exportar como archivo</span>
                            <Select value={exportFormat} onChange={event => setExportFormat(event.target.value)}>
                                <option value="txt">TXT (Archivo de Texto plano)</option>
                                <option value="csv" disabled>CSV (Archivo de Valores separados por comas)</option>
                                <option value="docx" disabled>DOCX (Archivo de Microsoft Word)</option>
                                <option value="json" disabled>JSON</option>
                                <option value="pdf" disabled>PDF</option>
                            </Select>
                        </div>
                        <div className="flex justify-end mt-6 mb-2 gap-2">
                            <Button onClick={() => downloadPageExport()}>Exportar solo esta imagen</Button>
                            <Button onClick={() => downloadFullExport()} appearance="primary">Exportar todo</Button>
                        </div>
                    </Pane>
                </Dialog>
            </Pane>
            <Pane>
                <Dialog
                    isShown={manualCorrectionDialogIsShown}
                    title="Corrección manual"
                    onCloseComplete={() => setManualCorrectionDialogIsShown(false)}
                    hasFooter={false}
                >
                    <Pane width="100%">
                        <div className="flex my-2 mx-auto items-center justify-center w-[8rem] bg-gray-200 rounded-md">
                            <img
                                src={editingZone?.base64String}
                                alt="Selected zone"
                                className="h-[6rem] w-[6rem] min-h-[6rem] min-w-[6rem] max-h-[6rem] max-w-[6rem] object-scale-down m-2"
                            />
                        </div>
                        <div className="my-2">
                            <span className="text-sm">Texto original</span>
                            <Textarea
                                placeholder="Texto original..."
                                value={editingZone?.originalText || ""}
                                onChange={(e) => setEditingZone({ ...editingZone, originalText: e.target.value })}
                                disabled
                            />
                            <p className="text-xs text-gray-600">Actualmente no se puede modificar el texto original</p>
                        </div>
                        <div className="my-2">
                            <span className="text-sm">Texto traducido</span>
                            <Textarea
                                placeholder="Texto traducido con IA..."
                                value={editingZone?.translatedText || ""}
                                onChange={(e) => setEditingZone({ ...editingZone, translatedText: e.target.value })}
                            />
                            <p className="text-xs text-gray-600">Puedes modificar el texto traducido</p>
                        </div>
                        <div className="flex justify-end mt-6 mb-2 gap-2">
                            <Button
                                appearance="primary"
                                onClick={() => saveEditingZone()}
                            >
                                Guardar
                            </Button>
                        </div>
                    </Pane>
                </Dialog>
            </Pane>
        </main>
    );
}
