window.FT = window.FT || {};

/** Exporter */
FT.exporter = (function(){
    var path = require('path');
    var fs = require('fs');
    var tmp = require('tmp');
    var async = require('async');
    var logger = window.console;
    var csInterface = window.top.csInterface;

    /** Verify export */
    function verifyExport(next) {
        // Verify active document
        csInterface.evalScript('hasActiveDocument()', function (result) {
            if (result !== 'true') {
                return next(new Error(
                    'Unable to export without an active document.'
                ));
            } else {
                next();
            }
        });
    }


    /** Verify that returned value is not an extendscript error. */
    function verifyReturnedValue(value, next) {
        if (value === 'EvalScript error.') {
            next(new Error(
                'Failed to export, received bad result from application.'
            ));
        } else {
            next(null, value);
        }
    }


    /** Create a temporary directory and call *next* with the result. */
    function getTemporaryDirectory(next) {
        tmp.dir(function (err, directoryPath, cleanupCallback) {
            if (err) {
                next(err);
            }
            directoryPath += path.sep;
            directoryPath = directoryPath.replace(new RegExp('\\\\', 'g'), '\\\\');
            next(null, directoryPath);
        });
    }

    /** Save document as JPEG in *directoryPath* and call *next* with resulting path. */
    function saveJpeg(directoryPath, next) {
        logger.log(
            'Saving jpeg in temporary directory', directoryPath
        );
        var extendScript = 'saveJpegAsFileIn(\'' + directoryPath + '\')';
        csInterface.evalScript(extendScript, function (filePath) {
            verifyReturnedValue(filePath, next);
        });
    }

    /** Save original document in *directoryPath* and call *next* with resulting path. */
    function saveDocument(directoryPath, next) {
        logger.log(
            'Saving document in temporary directory', directoryPath
        );
        var extendScript = 'saveDocumentAsFileIn(\'' + directoryPath + '\')';
        csInterface.evalScript(extendScript, function (filePath) {
            verifyReturnedValue(filePath, next);
        });
    }

    /** Return function to process exported media and call *callback*. */
    function formatExportResponse(media, callback) {
        var err = null;
        var result = [];
        try {
            media.forEach(function (file) {
                var fileParts = path.parse(file.path);
                var fileSize = fs.statSync(file.path).size;
                result.push({
                    use: file.use,
                    path: file.path,
                    name: fileParts.name,
                    extension: fileParts.ext,
                    size: fileSize
                });
            })

        } catch (error) {
            err = error;
        }
        callback(err, result);
    }

    /**
     * Export media and call callback with error and array of formatted files.
     *
     * Options:
     *     delivery
     *         include delivery media in export
     *     review
     *         include reviewable media in export
     *  
     */
    function exportMedia(options, callback) {
        logger.info('Exporting media', options);
        var steps = [];
        var temporaryDirectory;
        var exportedFiles = [];

        steps.push(verifyExport);
        steps.push(getTemporaryDirectory);
        steps.push(function (temporaryDirectory, next) {
            directoryPath = temporaryDirectory;
            next(null, directoryPath);
        });

        if (options.review) {
            logger.debug('Including reviewable media');
            steps.push(saveJpeg, verifyReturnedValue);
            steps.push(function (filePath, next) {
                exportedFiles.push({ path: filePath, use: 'review' });
                next(null, directoryPath);
            });
        }

        if (options.delivery) {
            logger.debug('Including deliverable media');
            steps.push(saveDocument, verifyReturnedValue);
            steps.push(function (filePath, next) {
                exportedFiles.push({ path: filePath, use: 'delivery' });
                next(null, directoryPath);
            });
        }

        async.waterfall(
            steps, function (err, result) {
                if (err) {
                    logger.error('Export error', err);
                    callback(err, result);
                } else {
                    logger.info('Export steps complete', result);
                    logger.info('Exported files', exportedFiles);
                    formatExportResponse(exportedFiles, callback);
                }
            }
        );
    }

    /**
     * Return document name
     */
    function getDocumentName(next) {
        var extendScript = 'getDocumentName()';
        csInterface.evalScript(extendScript, function (documentName) {
            verifyReturnedValue(documentName, next);
        });
    }

    /**
     * Return publish options
     */
    function getPublishOptions(options, callback) {
        getDocumentName(function (err, documentName) {
            callback(err, {name: documentName})
        });
    }

    return {
        getPublishOptions: getPublishOptions,
        exportMedia: exportMedia
    };
}());