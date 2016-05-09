window.FT = window.FT || {};

/** Util */
FT.util = (function(){
    var logger = require('./js/lib/logger');
    var appdirs = require('./js/lib/appdirs');
    var path = require('path');
    var fs = require('fs');

    /**
     * Return API credentials using *callback*.
     */
    function getCredentials(callback) {
        var config,
            dataDir = appdirs.getUserDataDir('ftrack-connect', 'ftrack'),
            file = path.join(dataDir, 'config.json'),
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
                jsonData || jsonData.accounts ||
                jsonData.accounts.length > 0
            ) {
                logger.debug('Credentials found.');
                callback(
                    null,
                    {
                        serverUrl: jsonData.accounts[0].server_url,
                        apiUser: jsonData.accounts[0].api_user,
                        apiKey: jsonData.accounts[0].api_key
                    }
                );
            } else {
                logger.debug('Credentials not found.');
                callback(
                    new Error('No credentials were found in: ' + file),
                    null
                );
            }
        });
    }

    function getResolverPlatfom() {
        return (process.platform === 'win32') ? 'Windows' : 'Linux';
    }

    /** Write *filename* to ftrack-connect/data with *data*. */
    function writeSecurePublishFile(filename, data, callback) {
        var folder = appdirs.getUserDataDir('ftrack-connect/data', 'ftrack'),
            result = path.join(folder, filename);

        try {
            appdirs.mkdirsSync(folder);
        } catch (error) {
            callback(error, null);
            return;
        }

        fs.writeFile(result, JSON.stringify(data), function (error) {
            if (error) {
                callback(error, null);
            }
            callback(null, result);
        });
    }

    return {
        logger: logger,
        getResolverPlatfom: getResolverPlatfom,
        getCredentials: getCredentials,
        writeSecurePublishFile: writeSecurePublishFile
    };
}());