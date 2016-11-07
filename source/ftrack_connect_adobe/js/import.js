// :copyright: Copyright (c) 2015 ftrack
window.FT = window.FT || {};

/** Exporter */
FT.import = (function(){
    var logger = require('./js/lib/logger');
    var sanitizeFilename = require('./js/lib/sanitize_filename');
    var csInterface = window.top.csInterface;

    function openDocument(path, metadata, next) {
        logger.info('Opening document', path);
        var encodedMetadata = JSON.stringify(metadata);
        var sanitizedPath = sanitizeFilename(path)

        // Verify active document
        var extendscript = 'FTX.import.openDocument(\'' + sanitizedPath + '\', \'' + encodedMetadata + '\')';
        logger.info('Executing extendscript:', extendscript);
        csInterface.evalScript(extendscript, function (result) {
            logger.info('Opened document with result', result);
            if (result !== 'true') {
                return next(new Error(
                    'Unable to open document at path: ' + path
                ));
            } else {
                next(null, result);
            }
        });
    }

    return {
        openDocument: openDocument,
    };
}());