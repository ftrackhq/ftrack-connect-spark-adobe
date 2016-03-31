window.FT = window.FT || {};

/** Util */
FT.util = (function(){
    var path = require('path'),
        os = require('os'),
        fs = require('fs');

    /** Return data dir on windows. */
    function darwinUserDataDir (appname) {
        var dir = path.join(
            process.env.HOME, 'Library/Application Support', appname
        );

        return dir;
    }

    /** Return data dir on OSX. */
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
        console.debug(os.platform())
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

        if (!data || !data.account || !data.account.credentials || !data.account.credentials.length > 0) {
            callback('No credentials were found in: ' + file, null);
        } else {
            callback(null, data.account.credentials[0]);
        }

    }

    return {
        getCredentials: getCredentials
    };
}());