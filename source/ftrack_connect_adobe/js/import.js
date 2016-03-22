// :copyright: Copyright (c) 2015 ftrack
window.FT = window.FT || {};

/** Exporter */
FT.import = (function(){
    var logger = window.console;
    var csInterface = window.top.csInterface;

    function openDocument(path, metadata, next) {
        var encodedMetadata = JSON.stringify(metadata);

        // Verify active document
        csInterface.evalScript('FTX.import.openDocument(\'' + path + '\', \'' + encodedMetadata + '\')', function (result) {
            if (result !== 'true') {
                return next(new Error(
                    'Unable to open document at path: ' + path
                ));
            } else {
                next(result);
            }
        });
    }

    return {
        openDocument: openDocument,
    };
}());