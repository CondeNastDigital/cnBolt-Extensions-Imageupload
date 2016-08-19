# cnBolt-Extensions-Imageupload

Bolt Extension to upload multiple Files (Images) with meta-informations. This extension uses a configured contenttype for your images
and created/updates these objects and stors a list of ids as a json string in the field.

Note: the field only stores je ids as a json string. Your template needs to parse the string and fetch the images itself. See sample below.

## Configuration
Add a contenttype for your image objects similar to the one shown here (within `contenttype.yml`).
```
image:
    name: Images
    singular_name: Image
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

Add the following field to the contenttype where you want to add the images to. E.g. in pages:

```
page:
    name: Pages
    singular_name: Page
    fields:
        imageupload:
            type: imageupload
            contenttype: images   #must be the same name as the new defined contenttype above
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
