// :copyright: Copyright (c) 2015 ftrack
'use strict';

var fs = require('fs');
var path = require('path');
var winston = require('winston');
var appdirs = require('./appdirs');



/**
 * Return window.console wrapper.
 */
var Logger = function () {
    var userDataDir = appdirs.getUserDataDir('ftrack-connect', 'ftrack');
    var logDirectory = path.join(userDataDir, 'log');
    appdirs.mkdirsSync(logDirectory);

    var filename = path.join(logDirectory, 'ftrack_connect_spark_adobe.log');

    var logger = new (winston.Logger)({
        level: 'debug',
        transports: [
            new (winston.transports.File)({ filename: filename, json: false })
        ],
        handleExceptions: true,
        humanReadableUnhandledException: true
    });

    // Send all logs to console as well.
    logger.on('logging', function (transport, level, msg, meta) {
        if (console[level]) {
            console[level](msg, JSON.stringify(meta))
        }
    });

    return logger;
}

module.exports = Logger();
