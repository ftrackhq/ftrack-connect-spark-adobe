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

function message(message) {
    Window.alert(message);
}
