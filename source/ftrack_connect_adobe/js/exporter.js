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
        csInterface.evalScript('FTX.export.hasActiveDocument()', function (result) {
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
        var extendScript = 'FTX.export.saveJpegAsFileIn(\'' + directoryPath + '\')';
        csInterface.evalScript(extendScript, function (filePath) {
            verifyReturnedValue(filePath, next);
        });
    }

    /** Save original document in *directoryPath* and call *next* with resulting path. */
    function saveDocument(directoryPath, next) {
        logger.log(
            'Saving document in temporary directory', directoryPath
        );
        var extendScript = 'FTX.export.saveDocumentAsFileIn(\'' + directoryPath + '\')';
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
                var fileExtension = path.extname(file.path);
                var fileName = path.basename(file.path, fileExtension);
                var fileSize = fs.statSync(file.path).size;
                result.push({
                    use: file.use,
                    path: file.path,
                    name: fileName,
                    extension: fileExtension,
                    size: fileSize,
                    metadata: file.metadata,
                });
            });

        } catch (error) {
            err = error;
        }
        callback(err, result);
    }

    /** Render workarea in premiere. */
    function renderPremiereWorkarea(directoryPath, next) {
        logger.log(
            'Rendering sequence to: ', directoryPath
        );

        var preset = path.join(__dirname, 'resource', 'ftrack.epr');
        var range = 'workarea';

        var extendScript = [
            'FTX.premiereExport.renderActiveSequence(',
            '\'' + directoryPath + '\',',
            '\'' + preset + '\',',
            '\'' + range + '\',',
            ')'
        ].join('');
        csInterface.evalScript(extendScript, function (jobId) {
            next(null, jobId);
        });
    }

    /** Setup listeners for encoding job completion, error and progress. */
    function setupEncodingListeners(jobId, next) {
        csInterface.addEventListener(
            'encoderJobComplete', function (event) {
                logger.info('Encoder job completed', event.data.jobId);
                if (event.data.jobId === jobId) {
                    next(null, event.data.filePath);
                }
            }.bind(this)
        );

        csInterface.addEventListener(
            'encoderJobError', function (event) {
                logger.error('Encoder job failed', event.data.jobId);
                if (event.data.jobId === jobId) {
                    next(new Error('Encoding job failed'));
                }
            }.bind(this)
        );
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
        steps.push(function (directoryPath, next) {
            temporaryDirectory = directoryPath;
            next(null, temporaryDirectory);
        });

        if (options.review) {
            if (csInterface.getHostEnvironment().appId === 'PPRO') {
                logger.debug('Including reviewable media for premiere.');
                var reviewMetadata;

                steps.push(
                    function (renderData, next) {
                        logger.log(
                            'Getting sequence metadata'
                        );
                        var extendScript = 'FTX.premiereExport.getSequenceMetadata()';
                        csInterface.evalScript(extendScript, function (metadata) {
                            reviewMetadata = JSON.parse(metadata);
                            logger.debug('Recieved sequence metadata:', reviewMetadata);
                            next(null, temporaryDirectory);
                        });
                    },
                    function (directoryPath, next) {
                        logger.log(
                            'Getting thumbnail'
                        );
                        var extendScript = "FTX.premiereExport.saveActiveFrame('" + directoryPath + "')";
                        csInterface.evalScript(extendScript, function (thumbnailPath) {
                            exportedFiles.push({
                                path: thumbnailPath,
                                use: 'thumbnail'
                            });
                            logger.debug('Recieved thumbnail:', thumbnailPath);
                            next(null, temporaryDirectory);
                        });
                    },
                    renderPremiereWorkarea,
                    verifyReturnedValue,
                    setupEncodingListeners,
                    function (filePath, next) {
                        logger.debug('Rendered file data: ', filePath);
                        exportedFiles.push({
                            path: filePath,
                            use: 'video-review',
                            metadata: {
                                fps: reviewMetadata.fps,
                                frames: reviewMetadata.frames
                            }
                        });
                        next(null, temporaryDirectory);
                    }
                );

            } else {
                logger.debug('Including reviewable media');
                steps.push(saveJpeg, verifyReturnedValue);
                steps.push(function (filePath, next) {
                    exportedFiles.push({ path: filePath, use: 'image-review' });
                    next(null, temporaryDirectory);
                });
            }
        }

        if (options.delivery) {
            logger.debug('Including deliverable media');
            steps.push(saveDocument, verifyReturnedValue);
            steps.push(function (filePath, next) {
                exportedFiles.push({ path: filePath, use: 'delivery' });
                next(null, temporaryDirectory);
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
     * Get Metadata for *keys*.
     */
    function getMetadata(keys, next) {
        logger.info('Obtaining metadata', keys);
        var encodedKeys = JSON.stringify(keys)
        var extendScript = 'FTX.export.getDocumentMetadata(\'' + encodedKeys + '\')';
        console.info('Executing ExtendScript', extendScript);
        csInterface.evalScript(extendScript, function (encodedResult) {
            logger.info('Obtained metadata', encodedResult);
            var error = null;
            var result = null;

            try {
                result = JSON.parse(encodedResult);
            } catch (err) {
                error = err;
            }
            next(error, result);
        });
    }

    /**
     * Return document metadata
     */
    function getDocumentName(next) {
        var extendScript = 'FTX.export.getDocumentName()';
        csInterface.evalScript(extendScript, function (documentName) {
            verifyReturnedValue(documentName, next);
        });
    }

    /**
     * Return publish options
     */
    function getPublishOptions(options, callback) {
        var steps = [];
        var result = {};

        steps.push(getDocumentName);
        steps.push(function (documentName, next) {
            logger.info('Document name', documentName);
            result.name = documentName;
            next(null, result);
        });

        if (options.metadata) {
            steps.push(function (result, next) {
                getMetadata(options.metadata, next);
            });
            steps.push(function (metadataValues, next) {
                result.metadata = metadataValues;
                next(null, result);
            })
        }

        async.waterfall(
            steps, function (err, result) {
                if (err) {
                    logger.error('Publish options error', err);
                } else {
                    logger.info('Publish options complete', result);
                }
                callback(err, result);
            }
        );
    }

    return {
        getPublishOptions: getPublishOptions,
        exportMedia: exportMedia
    };
}());