window.FT = window.FT || {};

FT.uploader = (function(){
    var fs = require('fs');
    var http = require('http');
    var https = require('https');
    var url = require('url');

    function uploadFile(filePath, uploadUrl, headers, callback) {
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
        var req = httpModule.request(requestOptions, function (res) {
            console.log('STATUS: ', res.statusCode);
            console.log('HEADERS: ', JSON.stringify(res.headers));
            res.setEncoding('utf8');

            res.on('data', function (chunk) {
              console.log('BODY: ', chunk);
            });

            res.on('end', function () {
              console.log('No more data in response.')
              callback()
            })

        });
        req.on('error', function (error) {
          console.log('problem with request:', error);
        });

        stream.pipe(req, function () {
            req.end();
        });
    }

    return {
        uploadFile: uploadFile
    };
}());

