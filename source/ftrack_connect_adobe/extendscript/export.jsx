// :copyright: Copyright (c) 2015 ftrack

function composeClass(base, derived) {
    /** Make object with inheritance behavior and super(). */
    var result = {};
    for (var k in base) {
        result[k] = base[k];
    }
    for (var k in derived) {
        result[k] = derived[k];
    }
    /** Call super method of current caller. */
    result.super = function () {
        var name = $.stack.match(/[^\n]+\n[^\n]+\n$/m)[0].replace(/\((.+\n)+/, '');
        return base[name].apply(result, arguments);
    }
    return result;
}

FTX.baseExport = (function () {

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
        return app.documents.length && app.activeDocument.name || null;
    }

    /** Save document in *directory* */
    function saveDocumentAsFileIn(directory) {
        return saveAsFileIn(directory, new PhotoshopSaveOptions(), '.psd');
    }

    /** file options */
    // function getPdfExportOptions(options) {
    //     options = options || {};
    //     var exportOptions = new PDFSaveOptions();
    //     // exportOptions.PDFCompatibility = PDFCompatibility.PDF15;
    //     return exportOptions;
    // }

    function getPngExportOptions(options){
        options = options || {};
        var exportOptions = new PNGSaveOptions();
        return exportOptions;
    }

    function getTiffExportOptions(options){
        options = options || {};
        var exportOptions = new TiffSaveOptions();
        exportOptions.transparency = options.transparency || true
        exportOptions.embedColorProfile = options.embedColorProfile || true;
        return exportOptions;
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


    /** Save resized jpeg image in *directory* */
    function saveJpegAsFileIn(directory, options) {
        // Save state
        var originalHistoryState = app.activeDocument.activeHistoryState;
        // Resize image to max 4k x 4k.
        resizeImageFit(4096, 4096);
        var filePath = saveAsFileIn(directory, getJpegExportOptions(options), '.jpg');
        // Restore state
        app.activeDocument.activeHistoryState = originalHistoryState;
        return filePath;
    }

    /** Save jpeg image in *directory* */
    function saveRawJpegAsFileIn(directory, options) {
        return saveAsFileIn(directory, getJpegExportOptions(options), '.jpg');
    }

    /** Save tiff image in *directory* */
    function saveTiffAsFileIn(directory, options) {
        return saveAsFileIn(directory, getTiffExportOptions(options), '.tif');
    }

    function savePngAsFileIn(directory, options) {
        return saveAsFileIn(directory, getPngExportOptions(options), '.png');
    }

    // function savePdfAsFileIn(directory) {
    //     return saveAsFileIn(directory, getPdfExportOptions(options), '.pdf')
    // }

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

    function getExportSettingOptions() {
        var ext;
        var name = this.getDocumentName() || this.defaultComponentName;
        if (name && name.indexOf('.') >= 0) {
            const split = name.split('.');
            ext = split[1];
            name = split[0];
        }

        var formats = (this.exportFormats || []).concat([]);  // copy
        /** if an extension is present, and available, set it as first and default option */
        for(var i = 0; i < formats.length; i++) {
            if (ext == formats[i].value) {
                var item = formats.splice(i, 1)
                formats.splice(0, 0, item[0])
                break;
            }
        }

        var data = {
            component_name: name,
            formats: formats,
        };
        return data;
    }

    return {
        sanitizeFileName: sanitizeFileName,
        replaceExtension: replaceExtension,
        hasActiveDocument: hasActiveDocument,
        saveAsFileIn: saveAsFileIn,
        getDocumentName: getDocumentName,
        getDocumentMetadata: getDocumentMetadata,
        saveDocumentAsFileIn: saveDocumentAsFileIn,

        /** export options */
        getJpegExportOptions: getJpegExportOptions,
        getTiffExportOptions: getTiffExportOptions,
        getPngExportOptions: getPngExportOptions,
        // getPdfExportOptions: getPdfExportOptions,

        /** save functions */
        saveJpegAsFileIn: saveJpegAsFileIn,
        saveRawJpegAsFileIn: saveRawJpegAsFileIn,
        saveTiffAsFileIn: saveTiffAsFileIn,
        savePngAsFileIn: savePngAsFileIn,
        // savePdfAsFileIn: savePdfAsFileIn,
        resizeImageFit: resizeImageFit,
        getExportSettingOptions: getExportSettingOptions,
    };
}());

FTX.photoshopExport = (function(){
    return composeClass(FTX.baseExport, {
        defaultComponentName: 'photoshop-document',
        exportFormats: [
            { label: 'Photoshop (psd)', value: 'psd' },
            { label: 'JPEG', value: 'jpg' },
            { label: 'PNG', value: 'png' },
            { label: 'TIFF', value: 'tif' },
        ],
    });
}());

FTX.illustratorExport = (function(){
    /** Return File in *directory* with *fileExtension*. */
    function getExportFile(directory, fileExtension) {
        var fileName = FTX.export.sanitizeFileName(app.activeDocument.name) || 'unknown';
        fileName = FTX.export.replaceExtension(fileName, fileExtension);
        return new File(directory + fileName);
    }

    /** Save document in *directory* */
    function saveDocumentAsFileIn(directory) {
        var file = getExportFile(directory, '.ai');
        var options = new IllustratorSaveOptions();
        app.activeDocument.saveAs(file, options);
        return file.fsName;
    }

    function savePdfAsFileIn(directory) {
        var file = getExportFile(directory, '.pdf');
        var options = new PDFSaveOptions();
        options.compatibility = PDFCompatibility.ACROBAT6;
        options.generateThumbnails = true;
        options.preseveEditability = true;
        app.activeDocument.saveAs(file, options);
        return file.fsName;
    }

    function saveSvgAsFileIn(directory) {
        var file = getExportFile(directory, '.svg');
        var options = new ExportOptionsSVG();
        app.activeDocument.exportFile(file, ExportType.SVG, options);
        return file.fsName;
    }

    function saveEpsAsFileIn(directory) {
        var file = getExportFile(directory, '.eps');
        var options = new EPSSaveOptions();
        options.embedAllFonts = true;
        app.activeDocument.saveAs(file, options);
        return file.fsName;
    }

    /** Export document in *directory* */
    function saveJpegAsFileIn(directory) {
        var file = getExportFile(directory, '.jpg');
        var exportOptions = new ExportOptionsJPEG();
        exportOptions.artBoardClipping = true;
        exportOptions.qualitySetting = 70;
        app.activeDocument.exportFile(file, ExportType.JPEG, exportOptions);
        return file.fsName;
    }

    return composeClass(FTX.baseExport, {
        saveDocumentAsFileIn: saveDocumentAsFileIn,
        saveJpegAsFileIn: saveJpegAsFileIn,
        savePdfAsFileIn: savePdfAsFileIn,
        saveSvgAsFileIn: saveSvgAsFileIn,
        saveEpsAsFileIn: saveEpsAsFileIn,
        defaultComponentName: 'illustrator-document',
        exportFormats: [
            { label: 'Adobe Illustrator (ai)', value: 'ai' },
            { label: 'Illustrator EPS (eps)', value: 'eps' },
            { label: 'Adobe PDF (pdf)', value: 'pdf' },
            { label: 'SVG (svg)', value: 'svg' },
        ],
    });
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
    function onEncoderJobError(jobId, message) {
        sendEvent('encoderJobError', {
            jobId: jobId,
            message: message,
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

    /** Return true if an active sequence exists. */
    function hasActiveSequence() {
        app.enableQE();
        var sequence = qe.project.getActiveSequence();

        return sequence !== null;
    }

    return composeClass(FTX.baseExport, {
        getDocumentName: getProjectName,
        getProjectName: getProjectName,
        renderActiveSequence: renderActiveSequence,
        getSequenceMetadata: getSequenceMetadata,
        saveActiveFrame: saveActiveFrame,
        saveProject: saveProject,
        hasActiveSequence: hasActiveSequence
    });
}());


FTX.afterEffectsExport = (function() {

    /** Return project name */
    function getProjectName() {
        if (app && app.project && app.project.file) {
            // handle non latin characters
            return decodeURIComponent(app.project.file.name);
        }
        return 'Untitled Project';
    }

    /** Return if has an active and saved project. */
    function hasActiveProject() {
        return !!(
            app && app.project && app.project.file && app.project.file.fsName
        );
    }

    /**
     * Save project as a file in *directory*.
     *
     * *directory* should end with a separator.
     */
    function saveProject(directory) {
        var originalPath = app.project.file.fsName;

        var projectName = FTX.export.sanitizeFileName(app.project.file.name || 'project.aeproj');
        var filePath = directory + projectName;
        app.project.save(new File(filePath));

        // Save in original path to reset working project.
        app.project.save(new File(originalPath));

        return filePath;
    }

    /**
     * Return all composition names in current project.
     */
    function getCompositionNames() {
        var compositionNames = [];
        if (!app.project) {
            return compositionNames;
        }

        for(var i = 1; i <= app.project.numItems; i += 1) {
            var item = app.project.item(i);
            if (item instanceof CompItem) {
                 compositionNames.push(item.name);
            }
        }

        return compositionNames;
    }

    /**
     * Return first composition in project named *compositionName*
     *
     * If *compositionName* is not specified, return first composition.
     * Returns null if no matching composition is found.
     */
    function getFirstComposition(compositionName) {
        for(var i = 1; i <= app.project.numItems; i += 1) {
            var item = app.project.item(i);
            if (item instanceof CompItem) {
                if (!compositionName) {
                    return item;
                }
                else if (item.name === compositionName) {
                    return item;
                }
            }
        }

        return null;
    }

    /**
     * Save the currently active frame as an PNG in *directory*.
     */
    function saveActiveFrame(directory, compositionName) {
        var composition = getFirstComposition(compositionName);
        if (!composition) {
            throw new Error('Unable to retrieve composition.');
        }
        compositionName = FTX.export.sanitizeFileName(composition.name) || 'composition';
        var filePath = directory + compositionName + '.png';

        // NOTE: This call is likely async.
        composition.saveFrameToPng(composition.time, new File(filePath));

        return filePath;
    }

    /**
     * Render composition, and return the resulting path.
     */
    function renderComposition(directory, compositionName, outputModule, renderSettings) {
        var composition = getFirstComposition(compositionName);
        if (!composition) {
            throw new Error('Unable to retrieve composition.');
        }
        compositionName = FTX.export.sanitizeFileName(composition.name) || 'composition';
        var filePath = directory + compositionName + '_[#####]';

        var renderQueue = app.project.renderQueue;
        var item = renderQueue.items.add(composition);
        item.outputModule(1).applyTemplate(outputModule);
        item.outputModule(1).file = new File(filePath);
        item.applyTemplate(renderSettings);

        // Render queue, blocks until completed.
        renderQueue.render();

        return directory;
    }

    /**
     * Return JSON-encoded object with export settings.
     *
     * Fetches output modules and render settings by creating a temporary
     * composition and render queue item, reading the template names and then
     * removing the temporary items.
     */
    function getExportSettingOptions() {
        var data = this.super();
        if (app.project) {
            data.compositionNames = getCompositionNames();
            var composition = app.project.items.addComp('ftrack-connect-temporary-comp', 100, 100, 1, 1, 25);
            var renderQueue = app.project.renderQueue;
            var renderQueueItem = renderQueue.items.add(composition);
            data.renderSettings = renderQueueItem.templates;
            data.outputModules = renderQueueItem.outputModules[1].templates;

            renderQueueItem.remove();
            composition.remove();
        }

        return data;
    }

    return composeClass(FTX.baseExport, {
        getDocumentName: getProjectName,
        getExportSettingOptions: getExportSettingOptions,
        renderComposition: renderComposition,
        saveActiveFrame: saveActiveFrame,
        saveProject: saveProject,
        hasActiveProject: hasActiveProject,
        getProjectName: getProjectName
    });
}());

FTX.export = {
    'AEFT': FTX.afterEffectsExport,
    'ILST': FTX.illustratorExport,
    'PHSP': FTX.photoshopExport,
    'PHXS': FTX.photoshopExport,
    'PPRO': FTX.premiereExport,
}[FTX.getAppId()];

