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
    Overlay,
    Spinner
} from "evergreen-ui";
import { ImageFileUploader } from "./ImageFileUploader";
import { ImageCanvas } from "./ImageCanvas";
import { imagesFiles, translations } from './stores';

export function MainPage() {
    const $translations = useStore(translations);
    const $imagesFiles = useStore(imagesFiles);
    const [selectedImageName, setSelectedImageName] = useState(null);

    const [zoomScale, setZoomScale] = useState(0.8);
    const [zoomScaleSelect, setZoomScaleSelect] = useState("50%");

    const [fromLanguage, setFromLanguage] = useState('ja');
    const [toLanguage, setToLanguage] = useState('es');

    const [horizontalReadingDirection, setHorizontalReadingDirection] = useState('RL');
    const [verticalReadingDirection, setVerticalReadingDirection] = useState('TB');

    const [separateDialogs, setSeparateDialogs] = useState(true);
    const [keepContext, setKeepContext] = useState(true);
    const [titleFormat, setTitleFormat] = useState(`Imagen {orderNumber}: {fileName}`);
    const [lineFormat, setLineFormat] = useState(`- {translatedText}`);
    const [exportFormat, setExportFormat] = useState('txt');
    const [userFileName, setUserFileName] = useState('');

    const [editingZone, setEditingZone] = useState(null);

    const [loadingOverlayIsShown, setLoadingOverlayIsShown] = useState(false);
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

    useEffect(() => {
        setZoomScale(parseFloat(zoomScaleSelect.replace("%", "")) / 100);
    }, [zoomScaleSelect]);

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
        setManualCorrectionDialogIsShown(false);Español
    }

    const translateZone = async (imageName, base64String) => {
        try {
            setLoadingOverlayIsShown(true);
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
                    separateDialogs,
                }),
            });
            const { data: translations } = await response.json();
            if (translations.length === 0) {
                toaster.warning("No text found in the selected area");
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
        } finally {
            setLoadingOverlayIsShown(false);
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

    const translateAllTexts = () => {
        if (!$imagesFiles?.[selectedImageName]?.file) {
            toaster.warning("No image has been selected");
            return;
        }
        const file = $imagesFiles[selectedImageName].file;
        var reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            translateZone(selectedImageName, reader.result);
        };
        reader.onerror = function (error) {
            console.log('Error: ', error);
        };
    }

    const removeAllTranslations = () => {
        translations.set({});
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
        return `${userFileName || "translation"} - ${currentDate}/${currentMonth}/${currentYear} ${hour}:${minute}.capibaratraductor.txt`;
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
                            <p className="my-auto">Image translator</p>
                        </div>
                        <img
                            className="object-cover"
                            src="/capibara.png"
                            alt="Capibara"
                            width="128px"
                        />
                    </div>
                    <ImageFileUploader />
                    <p className={"text-2xl my-4" + (Object.values($imagesFiles).length > 0 ? "" : " hidden")}>Files</p>
                    <ul>
                        {Object.values($imagesFiles).sort((a, b) => a.order - b.order).map((image) => (
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
                                            <path fill="currentColor" d="M16 18H8l2.5-6 2 4 1.5-2 2 4Zm-1-8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 3v4a1 1 0 0 1-1 1H5m14-4v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.914a1 1 0 0 1 .293-.707l3.914-3.914A1 1 0 0 1 9.914 3H18a1 1 0 0 1 1 1ZM8 18h8l-2-4-1.5 2-2-4L8 18Zm7-8.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Z" />
                                        </svg>
                                        <span className="inline text-sm mx-1">
                                            {image.name}
                                        </span>
                                    </div>
                                    <span className="cursor-pointer hover:text-gray-800 hover:bg-red-400 rounded-md" onClick={() => removeImage(image.name)}>
                                        <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z" />
                                        </svg>
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="w-full h-full col-span-3 bg-gradient-to-r from-rose-700 to-indigo-700 p-4">
                    <div className="relative w-[calc(75svw-2rem)] h-[calc(100svh-40svh-2rem)] max-h-[calc(100svh-2rem)] overflow-hidden">
                        <div className={"flex w-full h-full items-center justify-center" + (selectedImageName !== null && Object.values($imagesFiles).length !== 0 ? " hidden" : "")}>
                            <p className="text-white text-2xl font-light">
                                Upload/Select an image to start translation.
                            </p>
                        </div>
                        <ImageCanvas
                            image={$imagesFiles?.[selectedImageName]}
                            handleZoneSelected={handleZoneSelected}
                            zoomScale={zoomScale}
                        />
                    </div>
                    <div className="flex gap-2 w-full h-[calc(40svh-2rem)] mt-[2rem] bg-white bg-opacity-95 shadow-sm rounded-md px-4 py-2">
                        <div className="w-[calc(50%-1rem)] overflow-y-auto">
                            <p className="text-lg font-light my-2">Translations</p>
                            <div className="flex flex-wrap w-full gap-2 my-2 items-center justify-evenly">
                                <Button appearance="minimal" onClick={() => removeAllTranslations()}>
                                    Delete all texts in image
                                </Button>
                            </div>
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
                                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m14.304 4.844 2.852 2.852M7 7H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4.5m2.409-9.91a2.017 2.017 0 0 1 0 2.853l-6.844 6.844L8 14l.713-3.565 6.844-6.844a2.015 2.015 0 0 1 2.852 0Z" />
                                                        </svg>
                                                    </span>
                                                    <span className="cursor-pointer hover:text-red-600 rounded-md" onClick={() => removeSelectedZone(index)}>
                                                        <svg className="w-6 h-6" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 7h14m-9 3v8m4-8v8M10 3h4a1 1 0 0 1 1 1v3H9V4a1 1 0 0 1 1-1ZM6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7Z" />
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
                            <p className="text-lg font-light my-2">Settings</p>
                            <div className="flex gap-2 my-2 items-center">
                                <span className="text-sm">Image zoom</span>
                                <Select value={zoomScaleSelect} onChange={event => setZoomScaleSelect(event.target.value)}>
                                    <option value="25%">25%</option>
                                    <option value="50%">50%</option>
                                    <option value="75%">75%</option>
                                    <option value="100%">100%</option>
                                </Select>
                            </div>
                            <div className="flex gap-2 my-2 items-center">
                                <span className="text-sm">Translate from</span>
                                <Select value={fromLanguage} onChange={event => setFromLanguage(event.target.value)}>
                                    <option value="ja">Japanese</option>
                                    <option value="en">English</option>
                                    <option value="ko">Korean</option>
                                    <option value="pt">Portuguese</option>
                                    <option value="es">Spanish</option>
                                    <option value="ko">Chinese</option>
                                    <option value="pt">French</option>
                                    <option value="es">Arabic</option>
                                </Select>
                                <span className="text-sm">to</span>
                                <Select value={toLanguage} onChange={event => setToLanguage(event.target.value)}>
                                    <option value="ja">Japanese</option>
                                    <option value="en">English</option>
                                    <option value="ko">Korean</option>
                                    <option value="pt">Portuguese</option>
                                    <option value="es">Spanish</option>
                                    <option value="ko">Chinese</option>
                                    <option value="pt">French</option>
                                    <option value="es">Arabic</option>
                                </Select>
                            </div>
                            <div className="flex gap-2 my-2 items-center">
                                <span className="text-sm">Reading order</span>
                                <Select value={horizontalReadingDirection} onChange={event => setHorizontalReadingDirection(event.target.value)}>
                                    <option value="LR">Left to right</option>
                                    <option value="RL">Right to left</option>
                                </Select>
                                <Select value={verticalReadingDirection} onChange={event => setVerticalReadingDirection(event.target.value)}>
                                    <option value="TB">Top to bottom</option>
                                    <option value="BT">Bottom to top</option>
                                </Select>
                            </div>
                            <div className="my-2">
                                <div className="flex gap-2 items-center">
                                    <Switch checked={separateDialogs} onChange={(e) => setSeparateDialogs(e.target.checked)} />
                                    <span className="text-sm">Separate dialogs</span>
                                </div>
                                <span className="text-xs  text-gray-600">Dialogs will be separated into different translations when a selection is made.</span>
                            </div>
                            <div className="my-2">
                                <div className="flex gap-2 items-center">
                                    <Switch checked={keepContext} onChange={(e) => setKeepContext(e.target.checked)} />
                                    <span className="text-sm">Maintain context</span>
                                </div>
                                <span className="text-xs  text-gray-600">Previous translations will be used to maintain context.</span>
                            </div>
                            <Button className="my-2" appearance="primary" onClick={() => setExportDialogIsShown(true)}>Export</Button>
                        </div>
                    </div>
                </div>
            </div>
            <Pane>
                <Dialog
                    isShown={exportDialogIsShown}
                    title="Export translations"
                    onCloseComplete={() => setExportDialogIsShown(false)}
                    hasFooter={false}
                >
                    <Pane width="100%">
                        <p className="text-lg font-light mb-2">Export settings</p>
                        <div className="my-2">
                            <p className="text-sm">File name</p>
                            <TextInput
                                width={"100%"}
                                placeholder="File name"
                                value={userFileName}
                                onChange={(e) => setUserFileName(e.target.value)}
                            />
                            <p className="text-xs text-gray-600">This will be the name of the exported file:</p>
                            <p className="text-xs text-gray-600">{generateFileName()}</p>
                        </div>
                        <div className="my-2">
                            <span className="text-sm">Separator by image</span>
                            <Textarea
                                placeholder="Title format"
                                value={titleFormat}
                                onChange={(e) => setTitleFormat(e.target.value)}
                            />
                            <p className="text-xs text-gray-600">This is the text that separates the translations for each image</p>
                            <p className="text-xs text-gray-600">The following variants can be used</p>
                            <p className="text-xs text-gray-600">{`{fileName}: File name (E.g.: "image.png")`}</p>
                            <p className="text-xs text-gray-600">{`{imageName}: Image name without extension (E.g.: "image")`}</p>
                            <p className="text-xs text-gray-600">{`{aliasName}: Image alias`}</p>
                            <p className="text-xs text-gray-600">{`{orderNumber}: Image order number`}</p>
                        </div>
                        <div className="my-2">
                            <span className="text-sm">Format by line</span>
                            <Textarea
                                placeholder="Line format"
                                value={lineFormat}
                                onChange={(e) => setLineFormat(e.target.value)}
                            />
                            <p className="text-xs text-gray-600">This is the text that is exported by line</p>
                            <p className="text-xs text-gray-600">The following variants can be used</p>
                            <p className="text-xs text-gray-600">{`{originalText}: Original text`}</p>
                            <p className="text-xs text-gray-600">{`{translatedText}: Translated text`}</p>
                            <p className="text-xs text-gray-600">{`{orderNumber}: Image order number`}</p>
                        </div>
                        <div className="flex gap-2 my-2 items-center">
                            <span className="text-sm">Export as a file</span>
                            <Select value={exportFormat} onChange={event => setExportFormat(event.target.value)}>
                                <option value="txt">TXT (Plain text file)</option>
                                <option value="csv" disabled>CSV (Comma-separated values file)</option>
                                <option value="docx" disabled>DOCX (Microsoft Word file)</option>
                                <option value="json" disabled>JSON</option>
                                <option value="pdf" disabled>PDF</option>
                            </Select>
                        </div>
                        <div className="flex justify-end mt-6 mb-2 gap-2">
                            <Button onClick={() => downloadPageExport()}>Export this image only</Button>
                            <Button onClick={() => downloadFullExport()} appearance="primary">Export all</Button>
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
                            <span className="text-sm">Original text</span>
                            <Textarea
                                placeholder="Texto original..."
                                value={editingZone?.originalText || ""}
                                onChange={(e) => setEditingZone({ ...editingZone, originalText: e.target.value })}
                                disabled
                            />
                            <p className="text-xs text-gray-600">It is currently not possible to modify the original text.</p>
                        </div>
                        <div className="my-2">
                            <span className="text-sm">Translated text</span>
                            <Textarea
                                placeholder="Texto traducido con IA..."
                                value={editingZone?.translatedText || ""}
                                onChange={(e) => setEditingZone({ ...editingZone, translatedText: e.target.value })}
                            />
                            <p className="text-xs text-gray-600">You can modify the translated text</p>
                        </div>
                        <div className="flex justify-end mt-6 mb-2 gap-2">
                            <Button
                                appearance="primary"
                                onClick={() => saveEditingZone()}
                            >
                                Save
                            </Button>
                        </div>
                    </Pane>
                </Dialog>
            </Pane>
            <Overlay
                isShown={loadingOverlayIsShown}
                shouldAutoFocus={true}
                shouldCloseOnClick={false}
                shouldCloseOnEscapePress={false}
                preventBodyScrolling={true}
            >
                <div className="absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center">
                    <div className="flex items-center justify-center w-[28rem] bg-black bg-opacity-50 backdrop-blur-sm rounded-md py-6 px-4">
                        <img
                            className="object-cover"
                            src="/capibara.png"
                            alt="Capibara"
                            width="128px"
                        />
                        <div>
                            <p className="text-4xl text-white font-light">Translating...</p>
                            <p className="ml-1 mt-2 text-gray-300 font-light">We're translating your image<br />this may take a few seconds...</p>
                        </div>
                    </div>
                </div>
            </Overlay>
        </main>
    );
}
