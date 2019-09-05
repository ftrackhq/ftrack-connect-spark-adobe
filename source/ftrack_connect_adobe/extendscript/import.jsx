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

    function getAssetName(encodedMetadata) {
        var assetName = 'ftrack Asset';
        try {
            var metadata = JSON.parse(encodedMetadata);
            if (metadata.asset_name) {
                assetName = metadata.asset_name;
            }
        } catch (error) {
            // pass
        }
        return assetName;
    }

    function getBrandColor() {
        ftrackPurple = new RGBColor();
        ftrackPurple.red = 147;
        ftrackPurple.green = 91;
        ftrackPurple.blue = 162;
        return ftrackPurple;
    }

    /** Open original file */
    function openFileIllustrator(aiPath, encodedMetadata) {
        var importedDocument = app.open(new File(aiPath));
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

    /**
     * Place the file as an item in a new layer.
     *
     * Update information about the imported asset in the document under
     * importedAssets as a JSON-encoded object with component ids as keys.
     */
    function importFileIllustrator(filePath, encodedMetadata) {
        if (!app.activeDocument) {
            return false;
        }
        var layer = app.activeDocument.layers.add();
        layer.name = getAssetName(encodedMetadata);
        layer.color = getBrandColor();
        var placedItem = app.activeDocument.placedItems.add();
        placedItem.file = new File(filePath);
        placedItem.name = filePath;
        layer.locked = true;

        try {
            var importedAssets = (
                FTX.metadata.getMetadata(['importedAssets']).importedAssets || '{}'
            );
            importedAssets = JSON.parse(importedAssets);
            var metadata = JSON.parse(encodedMetadata);
            metadata.file_path = filePath;
            importedAssets[metadata.component_id] = metadata;
            FTX.metadata.setMetadata({
                importedAssets: JSON.stringify(importedAssets),
            });
        } catch (error) {
            // pass
        }
        return true;
    }

    function openOrImportDocument(filePath, encodedMetadata) {
        var isImport = confirm(
            'Do you want to import the file? Select yes to place the file into the active document and no to open the published file.',
            false,
            'Import or open file?'
        )
        var method = isImport ? methods.importFile : methods.openFile;
        return method(filePath, encodedMetadata);
    }

    var methods = {
        openDocument: null,
        importFile: null,
        openFile: null,
    };

    var appId = FTX.getAppId();

    if (appId === 'PPRO') {
        methods.openDocument = openDocumentPremiere;
    } else if (appId === 'AEFT') {
        methods.openDocument = openDocumentAE;
    } else if (appId === 'PHSP' || appId === 'PHXS') {
        methods.openDocument = openDocumentPhotoshop;
    } else if (appId === 'ILST') {
        methods.openDocument = openOrImportDocument;
        methods.importFile = importFileIllustrator;
        methods.openFile = openFileIllustrator;
    }

    return methods;
}());
