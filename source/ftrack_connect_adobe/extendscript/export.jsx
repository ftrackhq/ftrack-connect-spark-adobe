// :copyright: Copyright (c) 2015 ftrack

FTX.export = (function(){

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

    function getDocumentName() {
        return app.activeDocument && app.activeDocument.name || null;
    }

    /** Save document in *directory* */
    function saveDocumentAsFileIn(directory) {
        return saveAsFileIn(directory, new PhotoshopSaveOptions(), '.psd');
    }

    function getJpegExportOptions(options) {
        options = options || {};
        var exportOptions = new JPEGSaveOptions();
        exportOptions.embedColorProfile = options.embedColorProfile || true;
        exportOptions.formatOptions = options.formatOptions || FormatOptions.OPTIMIZEDBASELINE;
        exportOptions.matte = options.matte || MatteType.NONE;
        exportOptions.quality = options.quality || 12;
        return exportOptions;
    }

    /** Save jpeg image in *directory* */
    function saveJpegAsFileIn(directory, options) {
        var originalHistoryState = app.activeDocument.activeHistoryState;

        // Resize image to max 4k x 4k.
        resizeImageFit(4096, 4096);
        var filePath = saveAsFileIn(directory, getJpegExportOptions(options), '.jpg');

        // Restore state
        app.activeDocument.activeHistoryState = originalHistoryState;

        return filePath;
    }

    /** Resize image to be contained within *maxWidth* and *maxHeight*. */
    function resizeImageFit(maxWidth, maxHeight) {
        var originalRulerUnitsState = app.preferences.rulerUnits;
        app.preferences.rulerUnits = Units.PIXELS;

        // Do not scale up images, exit early if smaller resolution.
        if (app.activeDocument.height <= maxHeight && app.activeDocument.width <= maxWidth) {
            return;
        }

        var width = null;
        var height = null;
        if (app.activeDocument.height > app.activeDocument.width) {
            height = UnitValue(maxHeight, 'px');
        } else {
            width = UnitValue(maxWidth, 'px');
        }

        app.activeDocument.resizeImage(
            width, height, null, ResampleMethod.BICUBICSHARPER
        );

       app.preferences.rulerUnits = originalRulerUnitsState;
    }

    /** Retrieve metadata from active document. */
    function getDocumentMetadata(encodedKeys) {
        var keys = JSON.parse(encodedKeys);
        var result = FTX.metadata.getMetadata(keys);
        var encodedResult = JSON.stringify(result);
        return encodedResult;
    }

    return {
        sanitizeFileName: sanitizeFileName,
        replaceExtension: replaceExtension,
        hasActiveDocument: hasActiveDocument,
        saveAsFileIn: saveAsFileIn,
        getDocumentName: getDocumentName,
        getDocumentMetadata: getDocumentMetadata,
        saveDocumentAsFileIn: saveDocumentAsFileIn,
        getJpegExportOptions: getJpegExportOptions,
        saveJpegAsFileIn: saveJpegAsFileIn,
        resizeImageFit: resizeImageFit
    };
}());
