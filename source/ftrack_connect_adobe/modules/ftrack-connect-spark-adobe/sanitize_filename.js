// :copyright: Copyright (c) 2016 ftrack
'use strict';

/** Sanitize filename for use in eval script, escaping backslashes in windows paths.  */
function sanitizeFilename(filePath) {
    return filePath.replace(new RegExp('\\\\', 'g'), '\\\\');
}

module.exports = sanitizeFilename;
