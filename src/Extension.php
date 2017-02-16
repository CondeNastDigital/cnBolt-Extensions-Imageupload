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
    
        $config = $this->getConfig();
        $config = json_encode($config);
    
        $resources    = $this->container['resources'];
        $extensionUrl = $resources->getUrl('bolt');
        $extensionWebPath = $resources->getUrl('root');
        
        return [
            (new JavaScript('js/extension-for/sir-trevor.js'))->setZone(Zone::BACKEND)
                ->setAttributes([
                    "data-extension-imageupload-config=".$config,
                    "data-root-url=".$extensionWebPath,
                    "data-extension-url=".$extensionUrl,
                ])
                ->setLate(true)
                ->setPriority(1),
        //    (new JavaScript('css/extension.css'))->setZone(Zone::BACKEND),
        ];
        
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






