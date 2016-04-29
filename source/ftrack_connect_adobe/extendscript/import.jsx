// :copyright: Copyright (c) 2015 ftrack

FTX.import = (function(){

    /** Open document in *path* and store *encodedMetadata* in it. */
    function openDocument(path, encodedMetadata) {
        var appId = FTX.getAppId();

        var importedDocument = app.open(new File(path));

        // Open files in photoshop as a copy to ensure they are not overwritten
        // by misstake if the users starts to edit them.
        if (['PHSP', 'PHXS']) {
            importedDocument.duplicate();
            importedDocument.close();
        }

        if (encodedMetadata) {
            try {
                var metadata = JSON.parse(encodedMetadata);
                FTX.metadata.setMetadata(metadata);
            } catch (error) {
                alert(error);
                return false;
            }
        }
        return true;
    }

    /** Open document in *path*. */
    function openDocumentPremiere(path) {
        if (app.project) {
            app.project.importFiles([path]);
            return true;
        }
        return false;
    }

    var methods = {
        openDocument: openDocument
    };

    var appId = FTX.getAppId();

    if (appId === 'PPRO') {
        methods.openDocument = openDocumentPremiere
    }

    return methods;
}());
