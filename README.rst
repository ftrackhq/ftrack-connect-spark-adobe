###############################
ftrack connect adobe
###############################

ftrack connect integration for Adobe Creative Cloud applications.

*************
Documentation
*************

Full documentation, including installation and setup guides, can be found at
http://ftrack-connect-spark-adobe.rtd.ftrack.com/en/stable/

Setting up node environment
===========================

You will need a recent version of node with npm installed. It is highly
recommended that you also install a version manager for node, such as
`n (Mac OS) <https://github.com/tj/n>`_ or
`nodist (windows) <https://github.com/marcelklehr/nodist>`_. It enables you
can use different node versions in different projects.

Mac OS
------

1. Install `homebrew <http://brew.sh/>`_, unless already installed.
2. Ensure homebrew is installed correctly::

    brew doctor

3. Install latest node and npm versions::

    brew install node

4. Install n globally::

    npm install -g n

5. Install latest stable version::

    n stable

Windows
-------

1. Install `Node.js 9.11.2 <https://nodejs.org/dist/latest-v9.x/>`_
2. Download `ZXPSignCMD.exe <https://github.com/Adobe-CEP/CEP-Resources/blob/master/ZXPSignCMD/4.1.103/win64/ZXPSignCmd.exe>`_ and make it available in your system $PATH environment variable.

Setting up development environment
==================================

TBC

Building (MacOS)
================

Preparations
------------

1. Prepare ftrack-connect-spark by checking it out.
2. Install yarn (MacOS: brew install yarn && npm install webpack) and run::

    npm install
    yarn dist
    yarn link

3. Go back to this repository and run::

    yarn link ftrack-connect-spark

4. Get access to the Adobe Vault, store the certificate password in an environment variable::

    export FTRACK_ADOBE_CERTIFICATE_PASSWORD=xxxxxxx

5. Update extension version string in package.json.
6. Download and install ZXPSignCMD (https://github.com/Adobe-CEP/CEP-Resources/tree/master/ZXPSignCMD).
7. Link executable to make it available to build::

    ln -s /path/to/ZXPSignCmd-64bit /usr/local/bin/ZXPSignCmd

Building
--------

Run::

    python setup.py build_extension

The built extension will be available in build folder.

Testing
-------

1. Download and unzip ExManCmd (https://partners.adobe.com/exchangeprogram/creativecloud/support/exman-com-line-tool.html).
2. Install an Adobe DCC app, for example Photoshop.
3. Uninstall any previous ftrack extension::

    ExManCmd /list all
    ExManCmd /remove com.ftrack.connect.adobe
4. Install extension::

    ExManCmd /install ftrack_connect_adobe_1.0.3.zxp

5. Launch a task from ftrack connect, choose Adobe DCC app (Photoshop).
6. In Windows menu, open ftrack from "Extensions" submenu.
7. Test publish an image to ftrack, it should succeed and turn up as a version.


*********************
Copyright and license
*********************

Copyright (c) 2016 ftrack

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this work except in compliance with the License. You may obtain a copy of the
License in the LICENSE.txt file, or at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.

