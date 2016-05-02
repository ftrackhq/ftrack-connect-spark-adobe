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


FTX.premiereExport = (function() {
    /** 
     * Send CSXS Event of *type* with a JSON-encoded payload of *data*.
     * 
     * Used for communication with CEF/JavaScript using CSInterface.
     */
    function sendEvent(type, data) {
        var eventObject = new CSXSEvent();
        eventObject.type = type;
        eventObject.data = JSON.stringify(data);
        eventObject.dispatch();
    }

    /** On encoder job completition, forward the event to CEF. */
    function onEncoderJobComplete(jobId, filePath) {
        sendEvent('encoderJobComplete', {
            jobId: jobId,
            filePath: filePath
        });
    }

    /** On encoder job error, forward the event to CEF. */
    function onEncoderJobError(jobId) {
        sendEvent('encoderJobError', {
            jobId: jobId
        });
    }

    /** On encoder job progress, forward the event to CEF. */
    function onEncoderJobProgress(jobId, progress) {
        sendEvent('encoderJobProgress', {
            jobId: jobId,
            progress: progress
        });
    }


    /** Return project name */
    function getProjectName() {
        return app.project && app.project.name || null;
    }

    /** 
     * Render the currently active sequence using Adobe Media Encoder.
     *
     * Save the encoded sequence under *directoryPath*
     * *presetPath* should be a file path to an export preset.
     * *sequenceRangeName* controls which part of the sequence to encode and can 
     * be one of:
     * 
     *     - entire
     *     - inout
     *     - workarea
     */
    function renderActiveSequence(directoryPath, presetPath, sequenceRangeName, autoStart) {
        app.enableQE();
        app.encoder.bind('onEncoderJobComplete', onEncoderJobComplete);
        app.encoder.bind('onEncoderJobError', onEncoderJobError);
        app.encoder.bind('onEncoderJobProgress', onEncoderJobProgress);

        var sequence = qe.project.getActiveSequence();

        var filePath = directoryPath + FTX.export.sanitizeFileName(sequence.name);

        var sequenceRangeMap = {
            entire: app.encoder.ENCODE_ENTIRE,
            inout: app.encoder.ENCODE_IN_TO_OUT,
            workarea: app.encoder.ENCODE_WORKAREA
        };

        var sequenceRange = sequenceRangeMap[sequenceRangeName];

        var jobId = app.encoder.encodeSequence(
            app.project.activeSequence,
            filePath,
            (new File(presetPath)).fsName,
            sequenceRange
        );

        if (autoStart) {
            app.encoder.startBatch();
        }

        return jobId;
    }

    /** Return metadata for the current sequence work area. */
    function getSequenceMetadata(){
        app.enableQE();
        var sequence = qe.project.getActiveSequence();
        var frames = sequence.workOutPoint.frames - sequence.workInPoint.frames;
        var secs = sequence.workOutPoint.secs - sequence.workInPoint.secs;
        var fps = frames / secs;

        return JSON.stringify({
            fps: fps,
            frames: frames
        });
    }

    /** 
     * Save the currently active frame as an JPEG in *directory*.
     */
    function saveActiveFrame(directory) {
        app.enableQE();
        var sequence = qe.project.getActiveSequence();
        var time = sequence.CTI.timecode;
        var filePath = directory + FTX.export.sanitizeFileName(sequence.name) + '.jpg';
        sequence.exportFrameJPEG(time, filePath);
        return filePath;
    }

    /** 
     * Save as project as a file in *directory*. 
     *
     * *directory* should end with a separator.
     */
    function saveProject(directory) {
        var originalPath = document.getFilePath();

        var projectName = FTX.export.sanitizeFileName(
            getProjectName() || 'project.pproj'
        );
        var filePath = directory + projectName;
        app.project.saveAs(filePath, 0, true);

        // Save in original path to reset working project.
        app.project.saveAs(originalPath);

        return filePath;
    }

    return {
        getProjectName: getProjectName,
        renderActiveSequence: renderActiveSequence,
        getSequenceMetadata: getSequenceMetadata,
        saveActiveFrame: saveActiveFrame,
        saveProject: saveProject
    };
}());