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

var certificatePassword = process.env.FTRACK_ADOBE_CERTIFICATE_PASSWORD;
if (!certificatePassword || !certificatePassword.length) {
    throw new Error(
        'Certificate password not specified. ' +
        'Please set the environment variable: ' +
        'FTRACK_ADOBE_CERTIFICATE_PASSWORD'
    );
}

var config =
{
    bundle: {
        version: project.version,
        id: 'com.ftrack.connect.adobe',
        name: 'ftrack connect adobe',
        author_name: project.author,
        description: 'ftrack connect extension for Adobe Creative Cloud.',
        ui_access: 'You can run this extension by choosing<br><b>Window &gt; Extensions &gt; ftrack.</b>',
        mxi_icon: 'source/ftrack_connect_adobe/image/icon/icon_dark.png'
    },

    extensions: [{
        version: project.version,
        id: 'com.ftrack.connect.adobe.panel',
        type: 'Panel',
        name: 'ftrack',
        main_path: 'ftrack_connect_adobe/index.html',
        script_path: 'ftrack_connect_adobe/index.jsx',
        size: {
            normal: {
                width: 480,
                height: 640
            },
            min: {
                width: 375,
                height: 375
            },
            max: {
                width: 960,
                height: 1280
            }
        },
        icons: {
            light: {
                normal: 'ftrack_connect_adobe/image/icon/icon_light.png',
                hover: 'ftrack_connect_adobe/image/icon/icon_light_hover.png',
                disabled: 'ftrack_connect_adobe/image/icon/icon_light_disabled.png'
            },
            dark: {
                normal: 'ftrack_connect_adobe/image/icon/icon_dark.png',
                hover: 'ftrack_connect_adobe/image/icon/icon_dark_hover.png',
                disabled: 'ftrack_connect_adobe/image/icon/icon_dark_disabled.png'
            },
        },
        manifest: 'bundle/manifest.extension.xml',
    }],

    builds: [
        {
            bundle: { manifest: 'bundle/manifest.bundle.cc2015.xml' },
            extensions: [{ manifest: 'bundle/manifest.extension.xml' }],
            products: [
                'photoshop',
                'illustrator',
                'indesign',
                'flash',
                'premiere',
                'prelude',
                'aftereffects',
                'dreamweaver',
                'incopy'
            ],
            source: 'build/staging',
            families: ['CC2015', 'CC2017', 'CC2018'],
            dependencies: dependencies
        }
    ],

    staging: 'build',

    package: {
        certificate: {
            password: certificatePassword
        }
    }
};


module.exports = config;
