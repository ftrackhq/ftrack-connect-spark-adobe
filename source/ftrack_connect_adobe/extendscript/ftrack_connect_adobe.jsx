// :copyright: Copyright (c) 2015 ftrack

/** Initialize module, loading external interface. */
function init() {

    try {
        var xLib = new ExternalObject('lib:PlugPlugExternalObject');
    }
    catch(e) {
        alert(e);
    }
}

init();

/** Return a sanitized version of *value* for use as a file name. */
function sanitizeFileName(value) {
    return (value || 'unknown').replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
}

/** 
 * Return file name with *fileExtension*. 
 * 
 * If *fileName* already has an extension replace it, otherwise add it.
 */
function replaceExtension(fileName, fileExtension) {
    var lastDotPosition = fileName.lastIndexOf(".");
    if (lastDotPosition !== -1) {
        fileName = fileName.substr(0, lastDotPosition);
    }

    return fileName + fileExtension;
}

/** Return if currently has an active document. */
function hasActiveDocument(directory) {
    try {
        var activeDocument = app.activeDocument;
        return true;
    } catch (e) {
        return false;
    }
}

/** 
 * Save document as a file in *directory* using *options*.
 *
 * *directory* should end with a separator.
 */
function saveAsFileIn(directory, options, fileExtension) {
    var fileName = sanitizeFileName(app.activeDocument.name) || 'unknown';
    fileName = replaceExtension(fileName, fileExtension);

    var filePath = new File(directory + fileName);
    var saveAsCopy = true;
    app.activeDocument.saveAs(filePath, options, saveAsCopy, Extension.LOWERCASE);

    return filePath.fsName;
}

/** Save document in *directory* */
function saveDocumentAsFileIn(directory) {
    return saveAsFileIn(directory, new PhotoshopSaveOptions(), '.psd');
}

/** Save jpeg image in *directory* */
function saveJpegAsFileIn(directory) {
    return saveAsFileIn(directory, new JPEGSaveOptions(), '.jpg');
}

/** Resize image to be contained within *maxWidth* and *maxHeight*. */
function resizeImageFit(maxWidth, maxHeight) {
    var width = null,
        height = null;

    if (app.activeDocument.height > app.activeDocument.width) {
        height = UnitValue(maxHeight, 'px');
    } else {
        width = UnitValue(maxWidth, 'px');
    }

    app.activeDocument.resizeImage(
        width, height, null, ResampleMethod.BICUBICSHARPER
    );
}

/** Export active document as a JPEG in *filePath*. */
function exportJpeg(filePath, options) {
    options = options || {};
    var exportOptionsSaveForWeb = new ExportOptionsSaveForWeb();
    exportOptionsSaveForWeb.format = options.format || SaveDocumentType.JPEG;
    exportOptionsSaveForWeb.includeProfile = options.includeProfile || false;
    exportOptionsSaveForWeb.interlaced = options.interlaced || true;
    exportOptionsSaveForWeb.optimized = options.optimized || true;
    exportOptionsSaveForWeb.quality = options.quality || 70;

    app.activeDocument.exportDocument(
        filePath, ExportType.SAVEFORWEB, exportOptionsSaveForWeb
    );
}

/** Save the active document as a thumbnail in *directory*. */
function saveThumbnailIn(directory) {
    var filePath = new File(directory + 'thumbnail.jpg');
    var originalHistoryState = app.activeDocument.activeHistoryState;

    resizeImageFit(300, 300);
    exportJpeg(filePath);

    // Restore state
    app.activeDocument.activeHistoryState = originalHistoryState;

    return filePath.fsName;
}