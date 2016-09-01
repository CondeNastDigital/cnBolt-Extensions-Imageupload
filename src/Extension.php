<?php

namespace Bolt\Extension\CND\ImageUpload;

use Bolt\Application;
use Bolt\Asset\File\JavaScript;
use Bolt\Controller\Zone;
use Bolt\Extension\SimpleExtension;
use Bolt\Extension\CND\ImageUpload\Controller\FileController;

class Extension extends SimpleExtension
{
    /**
     * {@inheritdoc}
     */
    public function registerFields(){
        return [
            new Field\ImageUploadField(),
        ];
    }

    /**
     * {@inheritdoc}
     */
    protected function registerAssets(){
        /*
        return [
            (new JavaScript('js/main.js'))->setZone(Zone::BACKEND),
            (new JavaScript('css/extension.css'))->setZone(Zone::BACKEND),
        ];
        */
    }

    /**
     * {@inheritdoc}
     */
    protected function registerTwigPaths(){
        return ['templates'];
    }

    /**
     * {@inheritdoc}
     */
    protected function registerBackendControllers()
    {
        /* @var \Bolt\Application $app */
        $app = $this->getContainer();
        $config = $this->getConfig();

        return [
            '/imageupload' => new FileController($app, $config),
        ];
    }
}






