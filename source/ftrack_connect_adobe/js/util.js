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
            data,
            jsonData;

        logger.debug('Reading credentials from file', file);

        fs.readFile(file, 'utf8', function (error, data) {
            if (error) {
                logger.error('Error reading file.', error);
                callback(error, null);
                return;
            }

            logger.debug('Read file data', data);

            // Try to parse the data as json.
            try {
                jsonData = JSON.parse(data);
                logger.debug('Parsed json data', jsonData);
            } catch (error) {
                logger.error('Failed to parse json.', error);
                callback(error, null);
                return;
            }

            // Try to find the credentials.
            if (
                jsonData || jsonData.account ||
                jsonData.account.credentials ||
                jsonData.account.credentials.length > 0
            ) {
                logger.debug('Credentials found.');
                callback(null, jsonData.account.credentials[0]);
            } else {
                logger.debug('Credentials not found.');
                callback(
                    new Error('No credentials were found in: ' + file),
                    null
                );
            }
        });
    }

    return {
        getCredentials: getCredentials
    };
}());