/**
 * Copyright 2015 ftrack
 * All rights reserved.
 */

// Get project details from package.json
var grunt = require('grunt');
var project = grunt.file.readJSON('package.json');
var dependencies = project.cepDependencies.map(
    function (dependency) {
        return 'node_modules/' + dependency;
    }
);

var config =
{
    bundle: {
        version: project.version,
        id: 'com.ftrack.connect.adobe',
        name: 'ftrack connect adobe',
        author_name: project.author,
        description: 'ftrack connect extension for Adobe Creative Cloud.',
        ui_access: 'You can run this extension by choosing<br><b>Window &gt; Extensions &gt; ftrack.</b>',
        mxi_icon: 'build/staging/ftrack_connect_adobe/image/icon/icon_dark.png'
    },

    extensions: [{
        version: project.version,
        id: 'com.ftrack.connect.adobe.panel',
        type: 'Panel',
        name: 'ftrack [spark]',
        main_path: 'ftrack_connect_adobe/index.html',
        script_path: 'ftrack_connect_adobe/index.jsx',
        size: {
            normal: {
                width: 320,
                height: 480
            },
            min: {
                width: 200,
                height: 200
            },
            max: {
                width: 800,
                height: 1200
            }
        },
        icons: {
            light: {
                normal: 'build/staging/ftrack_connect_adobe/image/icon/icon_light.png',
                hover: 'build/staging/ftrack_connect_adobe/image/icon/icon_light_hover.png',
                disabled: 'build/staging/ftrack_connect_adobe/image/icon/icon_light_disabled.png'
            },
            dark: {
                normal: 'build/staging/ftrack_connect_adobe/image/icon/icon_dark.png',
                hover: 'build/staging/ftrack_connect_adobe/image/icon/icon_dark_hover.png',
                disabled: 'build/staging/ftrack_connect_adobe/image/icon/icon_dark_disabled.png'
            },
        },
        manifest: 'config/manifest.extension.xml',
    }],

    builds: [
        {
            bundle: { manifest: 'config/manifest.bundle.cc2014.xml' },
            extensions: [{ manifest: 'config/manifest.extension.xml' }],
            products: ['aftereffects', 'premiere', 'photoshop'],
            source: 'build/staging',
            families: ['CC2014', 'CC2015'],
            dependencies: dependencies
        }
    ],

    staging: 'build'
};


module.exports = config;
