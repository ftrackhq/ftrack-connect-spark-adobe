// :copyright: Copyright (c) 2015 ftrack
'use strict';

var fs = require('fs');
var path = require('path');
var winston = require('winston');
var appdirs = require('ftrack-connect-spark-adobe/appdirs');



/**
 * Return logger
 *
 * Logs using `winston` to file, and also forwards all logs to browser
 * console.
 */
var Logger = function () {
    var csInterface = window.csInterface;
    var hostEnvironment = csInterface && csInterface.getHostEnvironment() || {};
    var appId = hostEnvironment.appId || 'unknown';

    var userDataDir = appdirs.getUserDataDir('ftrack-connect', 'ftrack');
    var logDirectory = path.join(userDataDir, 'log');
    appdirs.mkdirsSync(logDirectory);

    var filename = path.join(
        logDirectory,
        'ftrack_connect_spark_adobe_' + appId.toLowerCase() + '.log'
    );

    var logger = new (winston.Logger)({
        level: 'debug',
        transports: [
            new (winston.transports.File)({
                filename: filename,
                json: false
            })
        ],
        handleExceptions: true,
        humanReadableUnhandledException: true
    });

    // Send all logs to browser console as well.
    logger.on('logging', function (transport, level, msg, meta) {
        if (window && window.console && window.console[level]) {
            window.console[level](msg, JSON.stringify(meta))
        }
    });

    return logger;
}

module.exports = Logger();
