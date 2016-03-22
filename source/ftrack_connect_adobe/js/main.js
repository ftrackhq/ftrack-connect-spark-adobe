
window.FT = window.FT || {};

/** Exporter */
FT.main = (function(){
    var logger = window.console;
    var initialized = false;

    /**
     * Load JSX file into the scripting context of the product. All the jsx files in 
     * folder [ExtensionRoot]/jsx will be loaded. 
     */
    function loadExtendscript() {
        var csInterface = new CSInterface();
        var extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION) + "/ftrack_connect_adobe/extendscript/";
        csInterface.evalScript('$._ext.evalFiles("' + extensionRoot + '")', function (result) {
            logger.info('Loaded extendscript files:', result);
            initialized = true;
        });
    }

    return {
        loadExtendscript: loadExtendscript,
        initialized: initialized
    };
}());

FT.main.loadExtendscript();
