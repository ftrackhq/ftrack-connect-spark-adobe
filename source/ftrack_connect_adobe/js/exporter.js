window.FT = window.FT || {};

/** Exporter */
FT.exporter = (function(){
    var path = require('path');
    var fs = require('fs');
    var tmp = require('tmp');
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

    /** Return function to process exported media and call *callback*. */
    function onMediaExportedCallback(callback) {
        return function (err, filePath) {
            if (err) { return callback(err, null); }

            try {
                var fileParts = path.parse(filePath);
                var fileSize = fs.statSync(filePath).size;
                var result = {
                    path: filePath,
                    name: fileParts.name,
                    extension: fileParts.ext,
                    size: fileSize
                };
            } catch (error) {
                err = error;
            }
            callback(err, [result]);
        }
    }

    /** Export reviewable media and call callback with array of results. */
    function exportReviewableMedia(options, callback) {
        verifyExport(function (err, value) {
            if (err) { return callback(err, null); }

            getTemporaryDirectory(function (err, directoryPath) {
                if (err) { return callback(err, null); }

                // TODO: Resize image when exporting
                saveJpeg(directoryPath, onMediaExportedCallback(callback));
            });
        });
    }

    return {
        exportReviewableMedia: exportReviewableMedia
    };
}());