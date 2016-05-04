..
    :copyright: Copyright (c) 2016 ftrack

.. _installing:

********************
Building from source
********************

.. note::

  Unless you are doing any modifications, there should be no need to build the 
  extension yourself.

You can also build manually from the source for more control. First obtain a
copy of the source by either downloading the
`zipball <https://bitbucket.org/ftrack/ftrack-connect-spark-adobe/get/master.zip>`_ or
cloning the repository::

    git clone git@bitbucket.org:ftrack/ftrack-connect-spark-adobe.git

Setting up node environment
---------------------------

You will need a recent version of node (5+) with npm installed. It is highly
recommended that you also install a version manager for node, such as
`n (Mac OS) <https://github.com/tj/n>`_ or
`nodist (windows) <https://github.com/marcelklehr/nodist>`_. It enables you
can use different node versions in different projects.

Mac OS
^^^^^^

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
^^^^^^^

TODO

Setting up development environment
----------------------------------

1. Checkout this repository
2. Install *ftrack-connect-spark*::

    # In the `ftrack-connect-spark` repository, create a link.
    npm link

    # In this repository, add the linked package
    npm link ftrack-connect-spark

3. Install dependencies available on NPM's Package Registry.::

    npm install

4. To build and install the extension in debug mode, run (replace family with
   CC2014 if you want to run CC2014):

.. code-block:: console

    grunt debug --family=CC2015

5. To build and sign a release package, run:


.. code-block:: console

    grunt release

6. The extension is opened from :menuselection:`Windows --> Extensions`.
7. Remote debugging is possible by opening ``localhost:<port>`` a web browser.

.. note::
  
  The port number to use for remote debugging can be found in
  `build/debug/.debug` after `grunt debug` has been executed.

.. note::

  When installing dependencies, you might get a compilation error when building
  ``ws``. You can safely disregard from this error.

.. note::

  Under windows, *grunt-cep* will assume that you are running *Node* and
  *Adobe After Effects* with the same bitness (e.g. both in 64-bit versions) and 
  will fail to install the extension otherwise. You can install the dependency
  manually by first running ``grunt build`` and then copying the ``build/debug``
  directory to ``C:\Users\<username>\AppData\Roaming\Adobe\CEP\extensions\``.
  Enable debug mode in the windows registry by adding a string value with
  the key ``PlayerDebugMode`` and value ``1`` in 
  ``HKEY_CURRENT_USER\Software\Adobe\CSXS.5``.

