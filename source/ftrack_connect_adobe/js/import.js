// :copyright: Copyright (c) 2015 ftrack
window.FT = window.FT || {};

/** Exporter */
FT.import = (function(){
    var logger = require('./js/lib/logger');
    var csInterface = window.top.csInterface;

    function openDocument(path, metadata, next) {
        var encodedMetadata = JSON.stringify(metadata);

        // Verify active document
        var extendscript = 'FTX.import.openDocument(\'' + path + '\', \'' + encodedMetadata + '\')';
        logger.info('Executing extendscript:', extendscript);
        csInterface.evalScript(extendscript, function (result) {
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