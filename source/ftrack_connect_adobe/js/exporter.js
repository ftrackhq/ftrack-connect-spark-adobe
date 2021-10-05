window.FT = window.FT || {};

/** Exporter */
FT.exporter = (function(){
    var path = require('path');
    var util = require('util');
    var fs = require('fs');
    var tmp = require('tmp');
    var async = require('async');
    var logger = require('ftrack-connect-spark-adobe/logger');
    var sanitizeFilename = require('ftrack-connect-spark-adobe/sanitize_filename');
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
    function getTemporaryDirectory() {
        var args = Array.prototype.slice.call(arguments);
        var next = args.pop();
        tmp.dir(function (err, directoryPath, cleanupCallback) {
            if (err) {
                next(err);
            }
            directoryPath += path.sep;
            directoryPath = sanitizeFilename(directoryPath);
            next(null, directoryPath);
        });
    }

    /** Save document as JPEG in *directoryPath* and call *next* with resulting path. */
    function saveJpeg(directoryPath, next) {
        logger.log(
            'Saving jpeg in temporary directory', directoryPath
        );
        var extendScript = 'FTX.export.saveJpegAsFileIn(\'' + directoryPath + '\')';
        if (APP_ID === 'ILST') {
            extendScript = 'FTX.illustratorExport.saveJpegAsFileIn(\'' + directoryPath + '\')';
        }
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

    /** Save document as PDF in *directoryPath* and call *next* with resulting path. */
    function saveIllustratorPdf(directoryPath, next) {
        logger.log('Saving PDF in temporary directory', directoryPath);
        var extendScript = 'FTX.illustratorExport.savePdfAsFileIn(\'' + directoryPath + '\')';
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
                var fileName = file.name || path.basename(file.path, fileExtension);
                var fileSize = null;
                try {
                    fileSize = fs.statSync(file.path).size;
                } catch (error) {
                    logger.debug(
                        'File stat failed, the path is probably an image sequence.',
                        error
                    );
                }

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
            'Rendering sequence using options', {
                directoryPath: directoryPath,
                sourceRange: sourceRange,
                autoStart: autoStart,
            }
        );

        var preset = path.join(
            csInterface.getSystemPath(SystemPath.EXTENSION),
            'ftrack_connect_adobe',
            'resource',
            'ftrack.epr'
        );
        preset = sanitizeFilename(preset);
        logger.debug('Using preset', preset);

        var extendScript = [
            'FTX.premiereExport.renderActiveSequence(',
            '\'' + directoryPath + '\',',
            '\'' + preset + '\',',
            '\'' + sourceRange + '\',',
            autoStart,
            ')'
        ].join('');
        logger.debug('Evaluating extendscript', extendScript);

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
                logger.error('Encoder job failed', event.data);
                if (event.data.jobId === options.jobId) {
                    var errorMessage = 'Encoding job failed';
                    if (event.data.message) {
                        errorMessage += ' (' + event.data.message + ')';
                    }
                    next(new Error(errorMessage));
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

    function getAfterEffectsThumbnail(directoryPath, composition, next) {
        logger.log('Getting thumbnail');
        var extendScript = "FTX.afterEffectsExport.saveActiveFrame('" + directoryPath + "','" + composition + "')";
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

    function saveAfterEffectsProject(directoryPath, next) {
        logger.log('Saving after effects project');
        var extendScript = "FTX.afterEffectsExport.saveProject('" + directoryPath + "')";
        csInterface.evalScript(extendScript, function (projectFilePath) {
            logger.debug('Saved after effects project:', projectFilePath);
            next(null, projectFilePath);
        });
    }

    function renderAfterEffectsComposition(options, next) {
        logger.log('Rendering composition:', options);
        var extendScript = "FTX.afterEffectsExport.renderComposition('" + options.directoryPath + "', '" + options.compositionName + "', '" + options.outputModule + "', '" + options.renderSetting + "')";
        csInterface.evalScript(extendScript, function (projectFilePath) {
            logger.debug('Rendered composition:', projectFilePath);
            next(null, projectFilePath);
        });
    }

    function logStep(stepName) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            var next = args.pop();
            args.unshift(null);
            next.apply(null, args);
        }
    }

    /** Detect and return a file name from a *directory*. */
    function _detectSequence(directory) {
        if (!fs.statSync(directory).isDirectory()) {
            throw new Error('Failed to obtain path to rendered composition.');
        }
        var files = fs.readdirSync(directory);
        if (files.length === 0) {
            throw Error('Failed to detect output from composition render.');
        }
        var filePath = path.join(directory, files[0]);

        // Only one file, remove frame number placeholder.
        if (files.length === 1) {
            var newFilePath = filePath.replace(/_\[[#]+\]/, '');
            fs.renameSync(filePath, newFilePath);
            filePath = newFilePath;
        }
        // More than one file, assume sequence
        else {
            // Assume first frame is 0
            var lastFrame = files.length - 1;

            var extension = path.extname(filePath);
            var basename = path.basename(filePath, extension);

            // Assume frame numbers are at end of basename,
            // e.g. comp_00000.tif
            var fileNumberMatches = basename.match(/\d+$/) || [''];
            var firstFrame = fileNumberMatches[0];
            var padding = firstFrame.length;

            // Remove frame number from basename
            basename = basename.replace(firstFrame, '');

            // Format path in a clique-compatible format, e.g.
            // basename%05d.ext [0, 100]
            var pattern = util.format(
                '%s%%0%dd%s [0-%d]',
                basename,
                padding,
                extension,
                lastFrame
            );
            filePath = path.join(directory, pattern);
        }

        return filePath;
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
        steps.push(logStep('Verify export'));
        steps.push(getTemporaryDirectory);
        steps.push(logStep('Generated temporary directory'));
        steps.push(function (directoryPath, next) {
            temporaryDirectory = directoryPath;
            next(null, temporaryDirectory);
        });

        // Validate that an active sequence exists or the rest of the export
        // will fail.
        if (APP_ID === 'PPRO') {
            steps.push(logStep('Checking for active sequence'));
            steps.push(function (directoryPath, next) {
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

        // Validate that an active sequence exists or the rest of the export
        // will fail.
        if (APP_ID === 'AEFT') {
            steps.push(logStep('Checking for active project'));
            steps.push(function (directoryPath, next) {
                var extendScript = "FTX.afterEffectsExport.hasActiveProject()";
                csInterface.evalScript(extendScript, function (active) {
                    if (active === 'true') {
                        next(null, directoryPath);
                    } else {
                        next(
                            new Error(
                                'No active project found. Please save your project file.'
                            )
                        );
                    }
                });
            });
        }

        if (options.thumbnail && APP_ID === 'PPRO') {
            steps.push(logStep('Getting thumbnail'));
            steps.push(getThumbnail);
            steps.push(function (thumbnailPath, next) {
                logger.debug('Exported thumbnail', thumbnailPath);
                exportedFiles.push({
                    path: thumbnailPath,
                    name: 'thumbnail',
                    use: 'thumbnail'
                });
                next(null, temporaryDirectory);
            });
        }

        if (options.thumbnail && APP_ID === 'AEFT') {
            steps.push(logStep('Getting thumbnail'));
            if (options.showProgress) {
                options.showProgress({
                    header: 'Generating thumbnail',
                    message: 'Generating thumbnail.'
                });
            }
            steps.push(function (result, next) {
                getAfterEffectsThumbnail(temporaryDirectory, options.composition, next);
            });
            steps.push(function (thumbnailPath, next) {
                logger.debug('Exported thumbnail', thumbnailPath);
                exportedFiles.push({
                    path: thumbnailPath,
                    name: 'thumbnail',
                    use: 'thumbnail'
                });

                // Wait for thumbnail to be written since it is async.
                // TODO: Change this to checking if the file is closed.
                setTimeout(function(){
                    next(null, temporaryDirectory);
                }, 2000);
            });
        }

        if (options.project_file && APP_ID === 'PPRO') {
            logger.debug('Including project file in export.');
            steps.push(savePremiereProject);
            steps.push(function (projectPath, next) {
                logger.debug('Exported project file', projectPath);
                exportedFiles.push({
                    path: projectPath,
                    name: 'premiere-project',
                    use: 'project_file'
                });
                next(null, temporaryDirectory);
            });
        }

        if (options.project_file && APP_ID === 'AEFT') {
            logger.debug('Including project file in export.');
            steps.push(saveAfterEffectsProject);
            steps.push(function (projectPath, next) {
                logger.debug('Exported project file', projectPath);
                exportedFiles.push({
                    path: projectPath,
                    name: 'after-effects-project',
                    use: 'project_file'
                });
                next(null, temporaryDirectory);
            });
        }

        if (options.render_composition && APP_ID === 'AEFT') {
            logger.info('Rendering composition to include in export.');
            if (options.showProgress) {
                options.showProgress({
                    header: 'Rendering composition',
                    message: 'Once rendering has completed the process will continue.'
                });
            }
            steps.push(
                getTemporaryDirectory,
                function (temporaryDirectory, next) {
                    renderAfterEffectsComposition({
                        directoryPath: temporaryDirectory,
                        renderSetting: options.render_setting,
                        compositionName: options.composition,
                        outputModule: options.output_module
                    }, next);
                },
                logStep('Rendered composition.'),
                verifyReturnedValue,
                function (renderedCompositionPath, next) {
                    logger.info('Rendered composition.', renderedCompositionPath);
                    exportedFiles.push({
                        path: _detectSequence(renderedCompositionPath),
                        name: 'main',
                        use: 'rendered_sequence'
                    });
                    next(null, temporaryDirectory);
                }
            );
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
                    'options and start encoding from there ("Start queue"). ',
                    'Once completed, publishing will continue.'
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
                logStep('Render active sequence'),
                verifyReturnedValue,
                function (jobId, next) {
                    setupEncodingListeners(
                        {jobId: jobId, showProgress: options.showProgress},
                        next
                    );
                },
                logStep('Setup encoding listeners'),
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
                            name: 'main',
                            use: 'rendered_sequence'
                        });
                    }

                    next(null, temporaryDirectory);
                }
            );
        }

        if (options.review && (APP_ID === 'PHSP' || APP_ID === 'PHXS' || APP_ID === 'ILST')) {
            logger.debug('Including reviewable media');
            steps.push(saveJpeg, verifyReturnedValue);
            steps.push(logStep('Saved JPEG'));
            steps.push(function (filePath, next) {
                exportedFiles.push({ path: filePath, use: 'image-review' });
                next(null, temporaryDirectory);
            });
        }

        if (options.delivery && (APP_ID === 'PHSP' || APP_ID === 'PHXS')) {
            logger.debug('Including deliverable media');
            steps.push((directoryPath, next) => {

                    var saveFormat = options.save_as_format || 'psd';
                    logger.debug('Saving document in format', format);
                    var formatMap = {
                        psd: {
                            method: 'saveDocumentAsFileIn',
                        },
                        jpg: {
                            method: 'saveRawJpegAsFileIn',
                        },
                        jpeg: {
                            method: 'saveRawJpegAsFileIn',
                        },
                        tif: {
                            method: 'saveTiffAsFileIn',
                        },
                        tiff: {
                            method: 'saveTiffAsFileIn',
                        },
                        png: {
                            method: 'savePngAsFileIn',
                        },
                        // pdf: {
                        //     method: 'savePdfAsFileIn',
                        // },
                    }

                    var format = formatMap[saveFormat] || formatMap.psd;
                    var extendScript = 'FTX.export.' + format.method + '(\'' + directoryPath + '\')';

                    logger.info('Running deliverable script: ', extendScript);

                    csInterface.evalScript(extendScript, function (filePath) {
                        logger.info('Ready to deliver: ', filePath);
                        verifyReturnedValue(filePath, function (error, filePath) {
                            exportedFiles.push(
                                {
                                    path: filePath,
                                    use: 'delivery',
                                    name: options.component_name,
                                }
                            );
                            next(error, temporaryDirectory);
                        });
                    });
                }
            );
        }

        if (options.delivery && APP_ID === 'ILST') {
            steps.push(function saveIllustratorDocument(directoryPath, next) {
                var saveFormat = options.save_as_format || 'ai';
                logger.debug('Saving document in format', format);
                var formatMap = {
                    ai: {
                        method: 'saveDocumentAsFileIn',
                        componentName: 'illustrator-document',
                    },
                    pdf: {
                        method: 'savePdfAsFileIn',
                        componentName: 'pdf-document',
                    },
                    svg: {
                        method: 'saveSvgAsFileIn',
                        componentName: 'svg-document',
                    },
                    eps: {
                        method: 'saveEpsAsFileIn',
                        componentName: 'eps-document',
                    },
                }
                var format = formatMap[saveFormat] || formatMap.ai;
                var extendScript = 'FTX.illustratorExport.' + format.method + '(\'' + directoryPath + '\')';

                csInterface.evalScript(extendScript, function (filePath) {
                    verifyReturnedValue(filePath, function(error, filePath) {
                        exportedFiles.push(
                            { path: filePath, use: 'delivery', name: format.componentName }
                        );
                        next(error, temporaryDirectory);
                    });
                });

            });
        }

        if (options.include_pdf && APP_ID === 'ILST') {
            logger.debug('Including PDF');
            steps.push(saveIllustratorPdf);
            steps.push(function (filePath, next) {
                exportedFiles.push(
                    { path: filePath, use: 'pdf-review' }
                );
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
            try {
                result = JSON.parse(encodedResult);
            } catch (err) {
                logger.info('Failed to parse metadata');
            }
            next(null, result);
        });
    }

    /**
     * Return document metadata
     */
    function getDocumentName(next) {
        var extendScript = 'FTX.export.getDocumentName()';
        if (APP_ID === 'PPRO') {
            extendScript = 'FTX.premiereExport.getProjectName()';
        } else if (APP_ID === 'AEFT') {
            extendScript = 'FTX.afterEffectsExport.getProjectName()';
        }
        csInterface.evalScript(extendScript, function (documentName) {
            verifyReturnedValue(documentName, next);
        });
    }

    function getExportSettingOptions(value, next) {
        logger.info('Collecting export options.');
        var extendScript = 'FTX.export.getExportSettingOptions()';
        csInterface.evalScript(extendScript, function (options) {
            logger.info(options);
            verifyReturnedValue(options, next);
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
            var fileExtension = path.extname(documentName);
            var fileName = path.basename(documentName, fileExtension);

            result.name = fileName;
            next(null, result);
        });

        if (APP_ID === 'AEFT' || APP_ID === 'PHSP' || APP_ID === 'PHXS') {
            steps.push(getExportSettingOptions);
            steps.push(function (exportOptions, next) {
                result.exportOptions = JSON.parse(exportOptions);
                logger.info('---> ExportOption ', result.exportOptions)
                next(null, result);
            });
        }

        if (APP_ID === 'ILST') {
            result.exportOptions = {
                formats: [
                    { label: 'Adobe Illustrator (ai)', value: 'ai' },
                    { label: 'Illustrator EPS (eps)', value: 'eps' },
                    { label: 'Adobe PDF (pdf)', value: 'pdf' },
                    { label: 'SVG (svg)', value: 'svg' },
                ]
            }
        }


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
