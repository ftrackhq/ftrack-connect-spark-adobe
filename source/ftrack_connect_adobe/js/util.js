window.FT = window.FT || {};

/** Util */
FT.util = (function(){
    var logger = window.console;
    var path = require('path'),
        os = require('os'),
        fs = require('fs');

    /** Return data dir on OSX. */
    function darwinUserDataDir (appname) {
        var dir = path.join(
            process.env.HOME, 'Library/Application Support', appname
        );

        return dir;
    }

    /** Return data dir on windows. */
    function windowsUserDataDir (appname, appauthor) {
        var dir = process.env.LOCALAPPDATA;

        if (appauthor) {
            dir = path.join(dir, appauthor, appname);
        } else {
            dir = path.join(dir, appname)
        }

        return dir;
    }

    /** Return user data folder based on current platform. */
    function getUserDataDir(appname, appauthor) {
        logger.debug('Getting user data dir for platform', os.platform());
        switch (os.platform()) {
            case 'win32':
                return windowsUserDataDir(appname, appauthor);
            case 'darwin':
                return darwinUserDataDir(appname);
            default:
                return null;
        }
    }

    /**
     * Return API credentials using *callback*.
     */
    function getCredentials(callback) {
        var config,
            dataDir = getUserDataDir('ftrack-connect', 'ftrack'),
            file = path.join(dataDir, 'credentials.json'),
            data = require(file);

        logger.debug('Reading credentials from file', file);
        logger.debug('Read file data', data);

        if (!data || !data.account || !data.account.credentials || !data.account.credentials.length > 0) {
            callback(new Error('No credentials were found in: ' + file), null);
        } else {
            callback(null, data.account.credentials[0]);
        }

    }

    return {
        getCredentials: getCredentials
    };
}());