/**
 * Copyright 2015 ftrack
 * All rights reserved.
 */

'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        cep: {
            options: require('./bundle/cep-config.js'),

            build: {
                options: {
                    profile: 'debug'
                }
            },

            install: {
                options: {
                    profile: 'launch',
                    launch: {
                        product: 'photoshop',
                        kill: false,
                        setDebugMode: true,
                        install: true,
                        launch: false,
                        family: grunt.option('family') || 'CC2015'
                    },
                }
            },

            launch: {
                options: {
                    profile: 'launch',
                    launch: {
                        product: 'photoshop',
                        family: grunt.option('family') || 'CC2015'
                    },
                }
            },

            release: {
                options: { profile: 'package' }
            },
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: ['Gruntfile.js', 'source/ftrack_connect_adobe/js/*.js']
        },
        watch: {
            source: {
                files: ['source/ftrack_connect_adobe/**/*'],
                tasks: ['debug']
            },
        },
        clean: [
            'build/staging/'
        ],
        copy: {
          ftrack_connect_adobe: {
            expand: true,
            cwd: 'source/',
            src: '**',
            dest: 'build/staging/',
          },
          ftrack_connect_spark: {
            expand: true,
            cwd: 'node_modules/ftrack-connect-spark/dist/',
            src: '**',
            dest: 'build/staging/ftrack_connect_spark/',
          }
        },
    });

    // Load grunt-cep tasks
    grunt.loadNpmTasks("grunt-cep");
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.registerTask('copy-all',
        ['copy:ftrack_connect_spark', 'copy:ftrack_connect_adobe']
    );
    grunt.registerTask('copyfiles', ['clean', 'copy-all']);
    grunt.registerTask('build', ['copyfiles', 'cep:build']);
    grunt.registerTask('debug', ['copyfiles', 'cep:install']);
    grunt.registerTask('launch', ['copyfiles', 'cep:launch']);
    grunt.registerTask('release', ['copyfiles', 'cep:release']);
    grunt.registerTask('develop', ['debug', 'watch']);
};
