<?php

namespace Bolt\Extension\CND\ImageUpload;

include_once "Controller/FileController.php";
include_once "ImageUploadField.php";

use Bolt\Application;
use Bolt\BaseExtension;
use Bolt\Extension\CND\ImageUpload\Controller\FileController;
use Bolt\Extensions\ImageUpload\ImageUploadField;

class Extension extends BaseExtension
{

    public function __construct(Application $app)
    {
        parent::__construct($app);
        $this->app['config']->getFields()->addField(new ImageUploadField());
        if ($this->app['config']->getWhichEnd()=='backend') {
            $this->app['htmlsnippets'] = true;
        }
    }

    public function initialize() {

        $this->config = $this->getConfig();
        $this->app->before(array($this, 'before'));
        $this->app->mount('/imageupload', new FileController($this->app, $this->config));
    }

    public function before()
    {

    }

    public function getName()
    {
        return "Multimageupload";
    }

}






