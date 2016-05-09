// :copyright: Copyright (c) 2015 ftrack

FTX.import = (function(){

    /** Open document in *path* and store *encodedMetadata* in it. */
    function openDocumentPhotoshop(path, encodedMetadata) {
        var importedDocument = app.open(new File(path));
        importedDocument.duplicate();
        importedDocument.close();

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

    /** Open *path* in after effects. */
    function openDocumentAE(path) {
        if (app.project) {
            app.project.importFile(new ImportOptions(new File(path)));
            return true;
        }
        return false;
    }

    var methods = {
        openDocument: null
    };

    var appId = FTX.getAppId();

    if (appId === 'PPRO') {
        methods.openDocument = openDocumentPremiere;
    } else if (appId === 'AEFT') {
        methods.openDocument = openDocumentAE;
    } else if (appId === 'PHSP' || appId === 'PHXS') {
        methods.openDocument = openDocumentPhotoshop;
    }

    return methods;
}());