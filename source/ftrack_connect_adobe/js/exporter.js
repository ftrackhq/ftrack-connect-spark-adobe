window.FT = window.FT || {};

/** Exporter */
FT.exporter = (function(){
    var path = require('path');
    var fs = require('fs');
    var tmp = require('tmp');
    var async = require('async');
    var logger = window.console;
    var csInterface = window.top.csInterface;
    var APP_ID = csInterface.getHostEnvironment().appId;

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
    function renderActiveSequence(options, next) {
        options = options || {};
        var directoryPath = options.directoryPath;
        var sourceRange = options.sourceRange || 'workarea';
        var autoStart = options.autoStart || false;

        logger.debug(
            'Rendering sequence using options', directoryPath, sourceRange,
            autoStart
        );

        var preset = path.join(
            csInterface.getSystemPath(SystemPath.EXTENSION),
            'ftrack_connect_adobe',
            'resource',
            'ftrack.epr'
        );
        logger.log('Using preset', preset);

        var extendScript = [
            'FTX.premiereExport.renderActiveSequence(',
            '\'' + directoryPath + '\',',
            '\'' + preset + '\',',
            '\'' + sourceRange + '\',',
            autoStart,
            ')'
        ].join('');
        csInterface.evalScript(extendScript, function (jobId) {
            next(null, jobId);
        });
    }

    /** Setup listeners for encoding job completion, error and progress. */
    function setupEncodingListeners(options, next) {
        csInterface.addEventListener(
            'encoderJobComplete', function (event) {
                logger.info('Encoder job completed', event.data.jobId);
                if (event.data.jobId === options.jobId) {
                    next(null, event.data.filePath);
                }
            }.bind(this)
        );

        csInterface.addEventListener(
            'encoderJobError', function (event) {
                logger.error('Encoder job failed', event.data.jobId);
                if (event.data.jobId === options.jobId) {
                    next(new Error('Encoding job failed'));
                }
            }.bind(this)
        );

        csInterface.addEventListener(
            'encoderJobProgress', function (event) {
                if (options.showProgress && event.data.jobId === options.jobId) {
                    var progress = Math.round(event.data.progress * 100);
                    var header = 'Encoding sequence (' + progress + '%)';
                    var message = 'Please wait while the sequence is being encoded. The export will continue automatically once encoding is complete.';
                    options.showProgress({
                        header: header,
                        message: message,
                        loader: true,
                        progress: progress
                    })
                }
            }.bind(this)
        );
    }

    function getSequenceMetadata(renderData, next) {
        logger.log('Getting sequence metadata');
        var extendScript = 'FTX.premiereExport.getSequenceMetadata()';
        csInterface.evalScript(extendScript, function (metadata) {
            reviewMetadata = JSON.parse(metadata);
            logger.debug('Recieved sequence metadata:', reviewMetadata);
            next(null, reviewMetadata);
        });
    }

    function getThumbnail(directoryPath, next) {
        logger.log('Getting thumbnail');
        var extendScript = "FTX.premiereExport.saveActiveFrame('" + directoryPath + "')";
        csInterface.evalScript(extendScript, function (thumbnailPath) {
            logger.debug('Received thumbnail:', thumbnailPath);
            next(null, thumbnailPath);
        });
    }

    function savePremiereProject(directoryPath, next) {
        logger.log('Saving premiere project');
        var extendScript = "FTX.premiereExport.saveProject('" + directoryPath + "')";
        csInterface.evalScript(extendScript, function (projectFilePath) {
            logger.debug('Saved premiere project:', projectFilePath);
            next(null, projectFilePath);
        });
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
            logger.debug('Generated temporary directory.');
            temporaryDirectory = directoryPath;
            next(null, temporaryDirectory);
        });

        // Validate that an active sequence exists or the rest of the export
        // will fail.
        if (APP_ID === 'PPRO') {
            steps.push(function (directoryPath, next) {
                logger.debug('Checking for active sequence.');
                var extendScript = "FTX.premiereExport.hasActiveSequence()";
                csInterface.evalScript(extendScript, function (active) {
                    if (active === 'true') {
                        next(null, directoryPath);
                    } else {
                        next(new Error('No active sequence found.'));
                    }
                });
            });
        }

        if (options.thumbnail && APP_ID === 'PPRO') {
            logger.debug('Including thumbnail in export.');
            steps.push(getThumbnail);
            steps.push(function (thumbnailPath, next) {
                logger.debug('Exported thumbnail', thumbnailPath);
                exportedFiles.push({
                    path: thumbnailPath,
                    use: 'thumbnail'
                });
                next(null, temporaryDirectory);
            });
        }

        if (options.project_file && APP_ID === 'PPRO') {
            logger.debug('Including project file in export.');
            steps.push(savePremiereProject);
            steps.push(function (projectPath, next) {
                logger.debug('Exported project file', projectPath);
                exportedFiles.push({
                    path: projectPath,
                    use: 'project_file'
                });
                next(null, temporaryDirectory);
            });
        }

        if ((options.review || options.rendered_sequence) && APP_ID === 'PPRO') {
            logger.debug('Including rendered sequence in export.');

            var autoStartEncoding = !!options.review;
            var message = '';
            var reviewMetadata;
            if (autoStartEncoding) {
                message = [
                    'Starting Adobe Media Encoder. Once encoding has ',
                    'completed, the process will resume.'
                ].join('');
            } else {
                message = [
                    'Starting Adobe Media Encoder. Configure any additional ',
                    'options and start encoding from there. Once completed, ',
                    'publishing will continue.'
                ].join('');
            }

            if (options.review) {
                steps.push(getSequenceMetadata);
                steps.push(function (metadata, next) {
                    logger.debug('Obtained sequence metadata', metadata);
                    reviewMetadata = metadata;
                    next(null, temporaryDirectory);
                });
            }

            steps.push(
                function (temporaryDirectory, next) {
                    if (options.showProgress) {
                        options.showProgress({
                            header: 'Encoding sequence',
                            message: message
                        });
                    }

                    renderActiveSequence({
                        directoryPath: temporaryDirectory,
                        sourceRange: options.source_range,
                        autoStart: autoStartEncoding
                    }, next);
                },
                verifyReturnedValue,
                function (jobId, next) {
                    setupEncodingListeners(
                        {jobId: jobId, showProgress: options.showProgress},
                        next
                    );
                },
                function (encodedMediaPath, next) {
                    logger.debug('Exported rendered sequence', encodedMediaPath);

                    if (options.review) {
                        exportedFiles.push({
                            path: encodedMediaPath,
                            use: 'video-review',
                            metadata: {
                                fps: reviewMetadata.fps,
                                frames: reviewMetadata.frames
                            }
                        });

                    } else {
                        exportedFiles.push({
                            path: encodedMediaPath,
                            use: 'rendered_sequence'
                        });
                    }

                    next(null, temporaryDirectory);
                }
            );
        }

        if (options.review && (APP_ID === 'PHSP' || APP_ID === 'PHXS')) {
            logger.debug('Including reviewable media');
            steps.push(saveJpeg, verifyReturnedValue);
            steps.push(function (filePath, next) {
                exportedFiles.push({ path: filePath, use: 'image-review' });
                next(null, temporaryDirectory);
            });
        }

        if (options.delivery && (APP_ID === 'PHSP' || APP_ID === 'PHXS')) {
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
        if (APP_ID === 'PPRO') {
            extendScript = 'FTX.premiereExport.getProjectName()';
        }
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