# :coding: utf-8
# :copyright: Copyright (c) 2016 ftrack

import os
import re
import json

from setuptools import setup, find_packages
from setuptools.command.test import test as TestCommand


ROOT_PATH = os.path.dirname(
    os.path.realpath(__file__)
)

SOURCE_PATH = os.path.join(
    ROOT_PATH, 'source'
)

README_PATH = os.path.join(ROOT_PATH, 'README.rst')

# Version
with open(
    os.path.join(os.path.dirname(__file__), 'package.json')
) as packageFile:
    package = json.load(packageFile)
    VERSION = package.get('version')


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
    dependency_links=[
        'https://bitbucket.org/ftrack/lowdown/get/0.1.0.zip'
        '#egg=lowdown-0.1.0'
    ]
)
