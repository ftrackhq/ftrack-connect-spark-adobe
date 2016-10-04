window.FT = window.FT || {};

/** Uploader */
FT.uploader = (function(){
    var fs = require('fs');
    var http = require('http');
    var https = require('https');
    var url = require('url');
    var logger = require('./js/lib/logger');

    /** 
     * Upload filePath to *uploadUrl* using *headers*.
     *
     * Call *callback* with error and response text.
     */
    function uploadFile(filePath, uploadUrl, headers, callback) {
        logger.log(
            'Uploading file to URL using headers', filePath, uploadUrl, headers
        );
        var urlParts = url.parse(uploadUrl);
        var httpModule = urlParts.protocol === 'http:' ? http : https;
        var stream = fs.createReadStream(filePath);
        var bytes = fs.statSync(filePath).size;
        headers['Content-Length'] = bytes;

        var requestOptions = {
            method: 'PUT',
            hostname: urlParts.hostname,
            port: urlParts.port,
            path: urlParts.path,
            headers: headers
        }

        var responseText = '';
        var req = httpModule.request(requestOptions, function (res) {
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
                responseText += chunk;
            });

            res.on('end', function () {
                callback(null, responseText);
            })
        });

        req.on('error', function (error) {
            callback(error);
        });

        stream.pipe(req, function () {
            req.end();
        });
    }

    return {
        uploadFile: uploadFile
    };
}());

