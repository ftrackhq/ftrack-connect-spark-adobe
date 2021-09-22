# :coding: utf-8
# :copyright: Copyright (c) 2016 ftrack

import os
import re
import json

from setuptools import setup, find_packages
from setuptools.command.test import test as TestCommand
import setuptools
import shutil
import subprocess
from distutils.spawn import find_executable

ROOT_PATH = os.path.dirname(
    os.path.realpath(__file__)
)

SOURCE_PATH = os.path.join(
    ROOT_PATH, 'source'
)

SPARK_SOURCE_PATH = os.path.join(
    ROOT_PATH, 'node_modules', 'ftrack-connect-spark', 'dist'
)

ADOBE_MODULES_SOURCE_PATH = os.path.join(
    SOURCE_PATH, 'ftrack_connect_adobe', 'modules'
)
ADDITIONAL_MODULES = [
    os.path.join(ROOT_PATH, 'node_modules', m) 
    for m in [
        'async','colors','cycle','eyes','isstream',
        'pkginfo','stack-trace','tmp','winston'
    ]
]

MANIFEST_PATH = os.path.join(
    ROOT_PATH, 'bundle', 'manifest.xml'
)

UPDATE_PATH = os.path.join(
    ROOT_PATH, 'bundle', 'update.xml'
)

CERTIFICATE_PATH = os.path.join(
    ROOT_PATH, 'bundle', 'certificate.p12'
)

BUILD_PATH = os.path.join(
    ROOT_PATH, "build"
)

STAGING_PATH = os.path.join(
    BUILD_PATH, "staging"
)

README_PATH = os.path.join(ROOT_PATH, 'README.rst')

ZXPSIGN_CMD = 'ZXPSignCmd'

OUTPUT_PATH = BUILD_PATH

# Version
with open(
    os.path.join(os.path.dirname(__file__), 'package.json')
) as packageFile:
    package = json.load(packageFile)
    VERSION = package.get('version')


class BuildExtension(setuptools.Command):
    '''Build plugin.'''

    description = 'Build Adobe extension.'

    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        '''Run the build step.'''

        # Check requirements

        if len(os.environ.get('FTRACK_ADOBE_CERTIFICATE_PASSWORD') or '') == 0:
            raise Exception('Need certificate password in FTRACK_ADOBE_CERTIFICATE_PASSWORD environment variable!')


        ZXPSIGN_CMD_PATH = find_executable(ZXPSIGN_CMD)
        if not ZXPSIGN_CMD_PATH:
            raise Exception('%s is not in your ${PATH}!'%(ZXPSIGN_CMD))

        # Clean staging path
        shutil.rmtree(STAGING_PATH, ignore_errors=True)

        # Copy source
        shutil.copytree(
            SOURCE_PATH,
            STAGING_PATH
        )

        # Copy shared
        shutil.copytree(
            SPARK_SOURCE_PATH,
            os.path.join(STAGING_PATH, 'ftrack_connect_spark')
        )

        # Copy modules
        shutil.copytree(
            ADOBE_MODULES_SOURCE_PATH,
            os.path.join(STAGING_PATH, 'node_modules')
        )
        for p in ADDITIONAL_MODULES:
            shutil.copytree(
                p,
                os.path.join(STAGING_PATH, 'node_modules', os.path.basename(p))
            )

        # Transfer manifest xml, store version
        manifest_staging_path = os.path.join(STAGING_PATH, 'CSXS', 'manifest.xml')
        if not os.path.exists(os.path.dirname(manifest_staging_path)):
            os.makedirs(os.path.dirname(manifest_staging_path))
        with open(MANIFEST_PATH, 'r') as f_src:
            with open(manifest_staging_path, 'w') as f_dst:
                f_dst.write(f_src.read().replace('VERSION', VERSION))

        extension_output_path = os.path.join(BUILD_PATH, 'ftrack_connect_adobe_{}.zxp'.format(VERSION))

        # Generate auto update xml
        update_staging_path = os.path.join(STAGING_PATH, 'update.xml')
        with open(UPDATE_PATH, 'r') as f_src:
            with open(update_staging_path, 'w') as f_dst:
                f_dst.write(f_src.read().
                            replace('<%= bundle.version %>', VERSION).
                            replace('<%= download_url %>', os.path.basename(extension_output_path)).
                            replace('<%= bundle.description %>', 'ftrack connect extension for Adobe Creative Cloud.')
                            )

        # Create and sign extension
        if os.path.exists(extension_output_path):
            os.remove(extension_output_path)
        result = subprocess.Popen([
            ZXPSIGN_CMD_PATH,
            '-sign',
            STAGING_PATH,
            extension_output_path,
            CERTIFICATE_PATH,
            '{}'.format(os.environ['FTRACK_ADOBE_CERTIFICATE_PASSWORD'])])
        result.communicate()
        if result.returncode!=0:
            raise Exception('Could not sign and build extension!')

        print('Result: ' + extension_output_path)

# Configuration.
setup(
    name='ftrack-connect-spark-adobe',
    version=VERSION,
    description='ftrack connect spark extension for Adobe products',
    long_description=open(README_PATH).read(),
    keywords='',
    url='https://bitbucket.org/ftrack/ftrack-connect-spark-adobe',
    author='ftrack',
    author_email='support@ftrack.com',
    license='Apache License (2.0)',
    packages=find_packages(SOURCE_PATH),
    package_dir={
        '': 'source'
    },
    setup_requires=[
        'sphinx >= 1.2.2, < 2',
        'sphinx_rtd_theme >= 0.1.6, < 2',
        'lowdown >= 0.1.0, < 1'
    ],
    install_requires=[
    ],
    tests_require=[
    ],
    cmdclass={
        'build_extension': BuildExtension
    },
    dependency_links=[
        'https://bitbucket.org/ftrack/lowdown/get/0.1.0.zip'
        '#egg=lowdown-0.1.0'
    ],
    zip_safe=False
)
