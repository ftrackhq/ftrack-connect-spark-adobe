if(typeof($)=='undefined')
    $={};

$._ext = {
    //Evaluate a file and catch the exception.
    evalFile : function(path) {
        try {
            $.evalFile(path);
        } catch (e) {alert("Exception:" + e);}
    },
    // Evaluate all the files in the given folder 
    evalFiles: function(jsxFolderPath) {
        var folder = new Folder(jsxFolderPath);
        var numFiles = 0;
        if (folder.exists) {
            var jsxFiles = folder.getFiles("*.jsx");
            for (var i = 0; i < jsxFiles.length; i++) {
                numFiles += 1;
                var jsxFile = jsxFiles[i];
                $._ext.evalFile(jsxFile);
            }
        }

        return numFiles;
    },
    // Recieve application data.
    updateHostEnvironment: function (jsonData) {
        FTX._hostEnvironment = JSON.parse(jsonData);
    }
};

/** Initialize module, loading external interface. */
function init() {
    try {
        var xLib = new ExternalObject('lib:PlugPlugExternalObject');
    }
    catch(e) {
        alert(e);
    }
}
init();

if (typeof FTX !== 'object') {
    FTX = {};
}

FTX.getAppId = function () {
    return FTX._hostEnvironment.appId;
}
