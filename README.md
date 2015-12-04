# cnBolt-Extensions-Imageupload

Bolt Extension to upload multiple Files (Images) with metainformations


## Installation

1.) Edit your extensions/composer.json file and add the **cnd-imageupload** repository:
```
    "repositories": {
        "packagist": false,
        "bolt": {
            "type": "composer",
            "url": "https://extensions.bolt.cm/satis/"
        },
        "cnd-imageupload": {
            "type": "git",
            "url": "https://github.com/CondeNastDigital/cnBolt-Extensions-Imageupload.git"
        }
    },
```
2.) Change to the extensions folder and install via composer.
```
composer require cnd/imageupload
```
Installing or updating via the Bolt admin interface is also possible but would require the web-server's user to have proper access to the GitHup repository. This is usually not the case.

## Configuration
Add the following field for your content type (within `contenttype.yml`). Those fields are mandatory.
```
mycontenttype:  #all lowercase!!
    name: Images   #Change here the displayname (plural)
    singular_name: Image   #Change here the displayname (singular)
    fields:   #add the fields you need in your content type (metainformations)
        title:  #mandatory
            label: Name
            type: text
        copyright:
            type: text
        author:
            label: Autor
            type: text
        image:   #mandatory
            type: image
```

Add the following field to your content type, where you what to add the extension. E.g. in pages:

```
pages:
    name: Pages
    singular_name: Page
    fields:
        imageupload:
            type: imageupload
            contenttype: mycontenttype   #must be the same name as the new defined contenttype above
```

## Usage
Within your twig template, you may access the content type field which comes in form of an JSON string.
There is a custom twig filter, which converts the JSON string into an array. Here is an example, how to fetch the content elements within a twig template:
```
{% set images = record.imageupload|json_decode %}

{% for image in images.content %}
    {% setcontent currentElement = image %}
    {{ dump(currentElement) }}
{% endfor %}
```
