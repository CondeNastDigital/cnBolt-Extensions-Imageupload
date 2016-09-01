<?php

namespace Bolt\Extension\CND\ImageUpload\Field;

use Bolt\Storage\Field\FieldInterface;

class ImageUploadField implements FieldInterface
{

    public function getName()
    {
        return 'imageupload';
    }

    public function getTemplate()
    {
        return '_imageupload.twig';
    }

    public function getStorageType()
    {
        return 'text';
    }

    public function getStorageOptions()
    {
        return array('default'=>'');
    }

}
