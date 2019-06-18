// :copyright: Copyright (c) 2015 ftrack

/** Metadata */
FTX.metadata = (function(){

    /** Adapt metadata API for photoshop */
    var photoshopAdapter = {
        hasActiveDocument: function () {
            return app.activeDocument;
        },
        getXmpMetadata: function () {
            return app.activeDocument.xmpMetadata.rawData;
        },
        setXmpMetadata: function (xmpMetadata) {
            app.activeDocument.xmpMetadata.rawData = xmpMetadata.serialize();
        }
    }

    /** Adapt metadata API for AE */
    var afterEffectsAdapter = {
        hasActiveDocument: function () {
            return !!app.project;
        },
        getXmpMetadata: function () {
            return app.project.xmpPacket;
        },
        setXmpMetadata: function (xmpMetadata) {
            app.project.xmpPacket = xmpMetadata.serialize();
        }
    }
    var applicationAdapter = null;

    var isApplicationAfterEffects = typeof aftereffects === 'object';
    if (isApplicationAfterEffects) {
        applicationAdapter = afterEffectsAdapter;
    } else {
        applicationAdapter = photoshopAdapter;
    }

    /** Load XMP library */
    function ensureXmp() {
        if (ExternalObject.AdobeXMPScript == undefined) {
            ExternalObject.AdobeXMPScript = new ExternalObject("lib:AdobeXMPScript");
        }
    }

    /** Save *xmpMetadata* on target. */
    function setXmpMetadata(target, xmpMetadata) {
        target = xmpMetadata.serialize();
    }

    /** Register and return XMP Namespace. */
    function getXmpNamespace() {
        var ftrackNamespace = "com.ftrack";
        var myPrefix = "ftrack:";

        var namespace = XMPMeta.getNamespaceURI(ftrackNamespace)
        if (!namespace) {
            namespace = XMPMeta.registerNamespace(ftrackNamespace, myPrefix);
        }
        return ftrackNamespace;
    }

    /** Set *metadata* using XMP on the active document. */
    function setMetadata(metadata) {
        if (!applicationAdapter.hasActiveDocument()) {
            return;
        }
        ensureXmp();
        xmpMetadata = new XMPMeta(applicationAdapter.getXmpMetadata());
        if (!xmpMetadata) {
            return;
        }
        var namespace = getXmpNamespace();
        for (key in metadata) {
            xmpMetadata.setProperty(namespace, key, metadata[key]);
        }
        applicationAdapter.setXmpMetadata(xmpMetadata);
        return true;
    }

    /** Return XMP metdata as keys. */
    function getMetadata(keys) {
        var result = {};
        if (!applicationAdapter.hasActiveDocument()) {
            return result;
        }
        ensureXmp();
        xmpMetadata = new XMPMeta(applicationAdapter.getXmpMetadata());
        var namespace = getXmpNamespace();

        for(var i = 0; i < keys.length; i++) {
            key = keys[i];
            result[key] = xmpMetadata.getProperty(namespace, key);

            if (typeof result[key] === 'object') {
                result[key] = result[key].toString();
            }
        }
        return result;
    }

    return {
        setMetadata: setMetadata,
        getMetadata: getMetadata
    };
}());
