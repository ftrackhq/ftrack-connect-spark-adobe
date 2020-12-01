..
    :copyright: Copyright (c) 2016 ftrack

.. _release/release_notes:

*************
Release Notes
*************

.. release:: 1.0.2
    :date: 2020-12-01

    .. change:: fixed

        Fixed extension install error message for CC 2020+ versions.

.. release:: 1.0.1
    :date: 2019-09-20

    .. change:: fixed
        :tags: Dreamwaver, Animate

        Error messages in applications without full functionality.

.. release:: 1.0.0
    :date: 2019-09-20

    .. change:: changed

        Bumped version number, but otherwise unchanged.

.. release:: 0.3.0
    :date: 2019-09-12

    .. change:: new
        :tags: Illustrator, Publish

        Publish assets from Adobe Illustrator to ftrack.

        The active illustrator document in one of the following formats:

            * Adobe Illustrator (ai) (component named illustrator-document)
            * Illustrator EPS (eps) (component named eps-document)
            * Adobe PDF (pdf) (component named pdf-document)
            * SVG (svg) (component named svg-document)

        An exported JPEG image will be used for thumbnails and preview.
        Optionally, the active document can also be exported as a PDF for
        client reviews.
 
    .. change:: new
        :tags: Illustrator, Import

        Import published assets into Adobe Illustrator.

        When importing a version, you get the option to import or open the file.

            * Importing the file creates a new layer in the active document
              with the asset name and places a linked item to the original file.
            * Opening the file opens the file as a new document. A caveat with
              opening the file is that it is possible to overwrite the
              previously published file.

.. release:: 0.2.0
    :date: 2019-06-18

    .. change:: new
        :tags: Publish

        Remember the last asset type used.

    .. change:: new
        :tags: Publish

        Automatically version up imported documents in Adobe Photoshop.

    .. change:: new
        :tags: Publish

        Suggest existing assets that can be versioned up when publishing.

    .. change:: changed
        :tags: Publish

        Update primary color and icon to match brand.

.. release:: 0.1.8
    :date: 2017-05-03

    .. change:: fixed
        :tags: My tasks, browse

        Task lists limited to 25 items in Adobe CC 2017.

.. release:: 0.1.7
    :date: 2017-10-18

    .. change:: changed
        :tags: CC 2018

        Added support for Creative Cloud CC 2018.

    .. change:: fixed
        :tags: Publish

        Only the default "Upload" asset type can be selected before erasing the text.

.. release:: 0.1.6
    :date: 2016-11-17

    .. change:: fixed
        :tags: CC 2017

        Installation required CC 2015 to be installed.

.. release:: 0.1.5
    :date: 2016-10-04

    .. change:: fixed
        :tags: Windows, Photoshop, Premiere Pro, After Effects

        Importing components with Windows paths not working correctly.

.. release:: 0.1.4
    :date: 2016-06-22

    .. change:: changed
        :tags: Photoshop, Premiere Pro

        Added support for Photoshop CC 2015.5 and Premiere Pro CC 2015.3.

.. release:: 0.1.3
    :date: 2016-06-08

    .. change:: new
        :tags: After Effects

        Added support for publishing from After Effects.

    .. change:: changed

        Improved permission handling.

    .. change:: fixed

        Poor feedback when authentication fails or Connect is missing.

    .. change:: fixed

        Duplicate scrollbars sometime appears.

.. release:: 0.1.2
    :date: 2016-05-16

    .. change:: fixed

        Scrolling in views not working properly.

.. release:: 0.1.1
    :date: 2016-05-09
   
    .. change:: fixed
        :tags: Premiere Pro, Windows

        Unable to encode media when using Windows.

.. release:: 0.1.0
    :date: 2016-05-09
   
    .. change:: new
        :tags: Photoshop, Premiere Pro

        Initial release of plugins for Adobe Photoshop and Adobe Premiere Pro
