
window.FT = window.FT || {};

FT.SUPPORTED_APPS = [
    'PHSP',
    'PHXS',
    'ILST',
    'AEFT',
    'PPRO',
];

/** Exporter */
FT.main = (function(){
    var logger = require('ftrack-connect-spark-adobe/logger');
    var initialized = false;
    var csInterface = window.csInterface;
    var env = {};

    /**
     * Load JSX file into the scripting context of the product. All the jsx files in 
     * folder [ExtensionRoot]/jsx will be loaded. 
     */
    function loadExtendscript() {
        if (!isApplicationSupported()) {
            logger.info('Extendscript not supported in application.');
            return;
        }

        // Load dependencies first.
        var dependenciesRoot = csInterface.getSystemPath(SystemPath.EXTENSION) + "/ftrack_connect_adobe/dependencies/";
        csInterface.evalScript('$._ext.evalFiles("' + dependenciesRoot + '")', function (result) {
            logger.info('Loaded dependencies:', result);

            // Load application host environment.
            var hostEnvironment = JSON.stringify(getHostEnvironment());
            csInterface.evalScript("$._ext.updateHostEnvironment('" + hostEnvironment + "')", function (result) {
                logger.info('Loaded host environment.', result);

                // Load plugin.
                var extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION) + "/ftrack_connect_adobe/extendscript/";
                csInterface.evalScript('$._ext.evalFiles("' + extensionRoot + '")', function (result) {
                    logger.info('Loaded extendscript files:', result);
                    csInterface.evalScript('$.getenv("FTRACK_CONNECT_EVENT")', function (result) {
                        if (result != 'null') {
                            env['FTRACK_CONNECT_EVENT'] = result;
                        }
                        initialized = true;
                    });
                });
            });
        });
    }

    function isApplicationSupported() {
        var APP_ID = getHostEnvironment().appId;
        return FT.SUPPORTED_APPS.indexOf(APP_ID) !== -1;
    }

    /** Return host environment */
    function getHostEnvironment() {
        return csInterface.getHostEnvironment();
    }

    return {
        getHostEnvironment: getHostEnvironment,
        loadExtendscript: loadExtendscript,
        initialized: initialized,
        env: env,
    };
}());

FT.main.loadExtendscript();
