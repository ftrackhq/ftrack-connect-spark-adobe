// :copyright: Copyright (c) 2016 ftrack
'use strict';

var path = require('path');
var os = require('os');
var fs = require('fs');

/** Return data dir on OSX. */
function darwinUserDataDir(appname) {
    var dir = path.join(
        process.env.HOME, 'Library/Application Support', appname
    );

    return dir;
}

/** Return data dir on windows. */
function windowsUserDataDir(appname, appauthor) {
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
    switch (os.platform()) {
        case 'win32':
            return windowsUserDataDir(appname, appauthor);
        case 'darwin':
            return darwinUserDataDir(appname);
        default:
            return null;
    }
}

/** Recursively ensure directories exists, similar to `mkdir -p` */
function mkdirsSync(dirPath) {
    try {
        fs.mkdirSync(dirPath);
    } catch(e) {
        if (e.code !== 'ENOENT') {
            // Recursively create parents, before creating self.
            mkdirsSync(path.dirname(dirPath));
            mkdirsSync(dirPath);
        } else if (e.code !== 'EEXIST') {
            throw e;
        }
    }
};

module.exports = {
    mkdirsSync: mkdirsSync,
    getUserDataDir: getUserDataDir
};
