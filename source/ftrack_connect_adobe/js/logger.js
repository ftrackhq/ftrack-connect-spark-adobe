// :copyright: Copyright (c) 2015 ftrack
'use strict';

/**
 * Return window.console wrapper.
 */
var Logger = function () {

    var logger = {};

    // Prefer browser console and fall back to node console.
    var console = (
        (typeof window !== 'undefined') ? window.console : console || {}
    );

    for (var method in console) {
        if (typeof console[method] == 'function') {
            logger[method] = console[method].bind(console)
        }
    }

    return logger;
}

module.exports = Logger();
