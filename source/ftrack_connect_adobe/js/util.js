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
        var dataDir = getUserDataDir('ftrack-connect', 'ftrack');
        var file = path.join(dataDir, 'credentials.json');
        var data = null;
        var credentials = null;

        logger.debug('Reading credentials from file', file);
        try {
            data = require(file);
            logger.debug('Read file data', data);
        } catch (err) {
            logger.error('Failed to read data', err);
        }

        if (!data || !data.account || !data.account.credentials || !data.account.credentials.length > 0) {
            error = new Error('No credentials were found in: ' + file);
        } else {
            credentials = data.account.credentials[0];
        }
        callback(error, credentials);
    }

    return {
        getCredentials: getCredentials
    };
}());