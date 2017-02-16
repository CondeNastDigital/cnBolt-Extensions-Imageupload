<?php

namespace Bolt\Extension\CND\ImageUpload\Controller;

use Bolt\Application;
use Bolt\Legacy\Content;
use Doctrine\DBAL\Query\QueryBuilder;
use Silex\ControllerProviderInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Filesystem\Filesystem;

class FileController implements ControllerProviderInterface
{
    private $app;
    private $config;
    private $contenttype;

    private static $allowedExt = array("jpeg", "jpg", "png", "svg");
    const filesPath = "imageupload";
    
    /**
     * Some content types allow the integration of the relationlist. The config of the field therefore can lay at
     * different places. This config is the needed mapping for the know integrations.
     * @var array
     */
    private $contentTypeConfigs = [
        'default' => '',
        'structuredcontentfield' => 'extend'
    ];
    
    public function __construct (Application $app, array $config)
    {
        $this->app = $app;
        $this->config = $config;
        $this->app['twig.loader.filesystem']->prependPath(__DIR__."/../../templates");
    }

    public function connect(\Silex\Application $app)
    {
        $ctr = $app['controllers_factory'];
        $ctr->get('/iframe/{contenttype}/{field}', array($this, 'iframe'));
        $ctr->get('/iframe/{contenttype}/{field}/{subfield}', array($this, 'iframe'));
        $ctr->post('/list/{contenttype}/{field}', array($this, 'listContent'));
        $ctr->post('/list/{contenttype}/{field}/{subfield}', array($this, 'listContent'));
        $ctr->post('/store/{contenttype}/{field}', array($this, 'storeContent'));
        $ctr->post('/store/{contenttype}/{field}/{subfield}', array($this, 'storeContent'));
        $ctr->post('/delete/{contenttype}/{field}', array($this, 'deleteContent'));
        $ctr->post('/delete/{contenttype}/{field}/{subfield}', array($this, 'deleteContent'));

        return $ctr;
    }

    /**
     * List content as specified
     *
     * request body has to contain a JSON string in this format:
     * {content: [ <type>/<id>, <type>/<id>, <type>/<id>, ... ] }
     *
     * @param $contenttype
     * @param $field
     * @param Request $request
     * @return JsonResponse
     * @throws \Exception
     */
    public function listContent($contenttype, $field, $subfield=null, Request $request)
    {
        try{
            // Load field config of containing page
            $contenttype = preg_replace("/[^a-z0-9\\-_]+/i", "", $contenttype);
            $field       = preg_replace("/[^a-z0-9\\-_]+/i", "", $field);
            $data        = json_decode($request->getContent(), true);

            if(!$this->app["users"]->isAllowed("contenttype:$contenttype:edit"))
                throw new \Exception ("Insufficient access rights");

            $fieldConfig = $this->getFieldConfig($contenttype, $field, $subfield);
            $imageType = $fieldConfig["contenttype"];

            // parse id slugs into id only array (Bolt has no "fetch multiple slugs" method, only a "fetch multiple ids" method)
            $ids = array();
            if(isset($data["content"]) && is_array($data["content"]))
                foreach($data["content"] as $slug){
                    list($type, $id) = explode("/", $slug);
                    if($type == $imageType && is_numeric($id))
                        $ids[] = $id;
                }

            $contentList = array();
            $sortedList = array();

            // Load all linked images and make them suitable for output
            if($ids) {
                $result = $this->app['storage']->getContent($imageType, array("id" => implode(" || ", $ids)));

                if ($result) {
                    $result = $result instanceof Content ? array($result) : $result; // Bolt returns either array of Content or one single Content depending on number of results -.-

                    foreach ($result as $content)
                        $contentList[$content->id] = $this->filterContent($content);
                }

                // Sort by $ids
                foreach($ids as $order){
                    if( isset($contentList[$order]) ) {
                        $sortedList[] = $contentList[$order];
                        #unset($contentList[$id]);
                    }
                }
            }
            return new JsonResponse($sortedList);

        } catch(\Exception $ex) {
            return $this->makeErrorResponse($ex->getMessage());
        }
    }

    /**
     * Store content as specified in form
     * form must be in following format:
     * id[0..n] - hidden fields with id's of all n posted elements
     * values[0..n][someField] array of all fields to be updated
     * files[0..n] array with all posted files
     *
     * @param $contenttype
     * @param $field
     * @param Request $request
     * @return JsonResponse
     * @throws \Exception
     */
    public function storeContent($contenttype, $field, $subfield=null, Request $request)
    {
        try {
            // Load field config of containing page
            $contenttype = preg_replace("/[^a-z0-9\\-_]+/i", "", $contenttype);
            $field = preg_replace("/[^a-z0-9\\-_]+/i", "", $field);
            
            if (!$this->app["users"]->isAllowed("contenttype:$contenttype:edit"))
                throw new \Exception ("Insufficient access rights");

            $fieldConfig = $this->getFieldConfig($contenttype, $field, $subfield);
            $imageType = $fieldConfig["contenttype"];

            // process all elements from form
            $values = $request->get("value", array());
            $ids = $request->get("id", array());

            foreach ($ids as $idx => &$id) {
                $id = (int)$id;
                $idx = (int)$idx;

                // Get element from DB if present or create a new one
                /* @var Content $element */
                if ($id) {
                    $element = $this->app["storage"]->getContent($imageType, array("id" => $id, "return_single" => true));
                    if (!$element)
                        throw new \Exception("Failed to get contenttype '$contenttype' and id '$id''");
                } else {
                    $element = $this->app["storage"]->getContentObject($imageType);
                    if (!$element)
                        throw new \Exception("Failed to create contenttype '$contenttype''");

                    $element->setValue("datepublish", date("Y-m-d H:i:s"));
                    $element->setValue("status", "published");
                }

                // update values
                $elementValues = isset($values[$idx]) ? $values[$idx] : array();
                foreach ($elementValues as $key => $value) {
                    $element->setValue($key, $value);
                }

                // set file
                $fileField = "file_" . $idx;

                if ($request->files->has($fileField)) {

                    // Delete old file if neccessary
                    $current = $element->get("image");
                    if (isset($current["file"])) {
                        $this->removeFile($current["file"]);
                    }
                    // Store new file

                    $file = $this->storeFile($request->files->get($fileField));
                    $element->setValue("image", array("file" => $file));
                }
                
                // Store content
                $id = $this->app["storage"]->saveContent($element);
                
            }

            // Return current items
            $contentList = array();
            $sortedList = array();

            if ($ids) {
                $result = $this->app['storage']->getContent($imageType, array("id" => implode(" || ", $ids)));

                if ($result) {
                    $result = $result instanceof Content ? array($result) : $result; // Bolt returns either array of Content or one single Content depending on number of results -.-

                    /* @var Content $content */
                    foreach ($result as $content)
                        $contentList[$content->id] = $this->filterContent($content);
                }

                // Sort by $ids
                foreach ($ids as $order) {
                    if (isset($contentList[$order])) {
                        $sortedList[] = $contentList[$order];
                        #unset($contentList[$id]);
                    }
                }
            }
            return new JsonResponse($sortedList);

        } catch(\Exception $ex){
            return $this->makeErrorResponse($ex->getMessage());
        }
    }

    /**
     * Remove content as specified
     *
     * request body has to contain a JSON string in this format:
     * {content: [ <type>/<id>, <type>/<id>, <type>/<id>, ... ], delete: [ <type>/<id>, <type>/<id>, <type>/<id>, ... ] }
     *
     * @param $contenttype
     * @param $field
     * @param Request $request
     * @return JsonResponse
     * @throws \Exception
     */
    public function deleteContent($contenttype, $field, $subfield=null,  Request $request)
    {
        try {
            // Load field config of containing page
            $contenttype = preg_replace("/[^a-z0-9\\-_]+/i", "", $contenttype);
            $field = preg_replace("/[^a-z0-9\\-_]+/i", "", $field);
            $data = json_decode($request->getContent(), true);

            if (!$this->app["users"]->isAllowed("contenttype:$contenttype:edit"))
                throw new \Exception ("Insufficient access rights");

            $fieldConfig = $this->getFieldConfig($contenttype, $field, $subfield);
            $imageType = $fieldConfig["contenttype"];
            
            // parse id slugs into id only array (Bolt has no "fetch multiple slugs" method, only a "fetch multiple ids" method)
            $ids = array();
            if (isset($data["delete"]) && is_array($data["delete"])) {
                foreach ($data["delete"] as $slug) {
                    list($type, $id) = explode("/", $slug);
                    if ($type == $imageType && is_numeric($id))
                        $ids[] = $id;
                }
            }

            // Load all linked objects to see if they have a file
            if ($ids) {
                $result = $this->app['storage']->getContent($imageType, array("id" => implode(" || ", $ids)));
                if ($result) {
                    $result = $result instanceof Content ? array($result) : $result; // Bolt returns either array of Content or one single Content depending on number of results -.-
                    /* @var Content $content */
                    foreach ($result as $content) {
                        // Check and delete file if needed
                        $file = $content->get("image.file");
                        if ($file)
                            $this->removeFile($file);
                        // Delete content object
                        $this->app["storage"]->deleteContent($content->contenttype["singular_slug"], $content->get('id'));
                    }
                }
            }

            return $this->listContent($contenttype, $field, $subfield, $request);
        } catch(\Exception $ex){
            return $this->makeErrorResponse($ex->getMessage());
        }
    }

    /**
     * Return the contents of the internal iframe form
     * @param $contenttype
     * @param $field
     * @param Request $request
     * @return mixed
     */
    public function iframe($contenttype, $field, $subfield=null, Request $request)
    {
        try{
            $parentFieldConfig = $this->getFieldConfig($contenttype, $field, $subfield);
            $imageType = $parentFieldConfig["contenttype"];

            if(!$this->app["users"]->isAllowed("contenttype:$contenttype:edit"))
                throw new \Exception ("Insufficient access rights");

            $imageConfig = $this->app['storage']->getContentType($imageType);

            $rendered = $this->app['render']->render('iframeUpload.twig',array(
                    'config' => $this->config,
                    'contenttype' => $contenttype,
                    'field' => $field,
                    'subField' => $subfield,
                    'imagefields' => $imageConfig['fields'],
                )
            );

            return $rendered;
        } catch(\Exception $ex){
            return $this->makeErrorResponse($ex->getMessage());
        }
    }

    /**
     * Determine the field config from the contenttypes.yml
     * @param string $contenttype
     * @param string $field
     * @return mixed
     * @throws \Exception
     */
    /*protected function getFieldConfig($contenttype, $field, $subfield=null)
    {

        $contenttype = $this->app['storage']->getContentType($contenttype);

        if(!$this->app["users"]->isAllowed("contenttype:$contenttype:edit"))
            return $this->makeErrorResponse("Insufficient access rights!");

        if(!$contenttype)
            return false;

        if(isset($contenttype["fields"][$field]))
            return $contenttype["fields"][$field];

        // Validation of minimal config
        if(!isset($fieldConfig["contenttype"]))
            throw new \Exception("contenttype for images not defined in parent contenttype's field");

        return false;
    } */
    
    protected function getFieldConfig($contenttype, $field, $subfield=null){
        
        $contenttype = $this->app['storage']->getContentType($contenttype);

        if(!$contenttype)
            return false;
        
        $fieldDefinition = $contenttype['fields'][$field];
        
        if(isset($this->contentTypeConfigs[$fieldDefinition['type']]))
            $configPath = $this->contentTypeConfigs[$fieldDefinition['type']];
        else
            $configPath = $this->contentTypeConfigs['default'];
        
        
        if($subfield)
            $configPath .= '.'.$subfield;
        
        $configPath = explode('.', $configPath);
        $config     = $fieldDefinition;

        foreach ($configPath as $path)
            if($path == '')
                continue;
            elseif(isset($config[$path]))
                $config = $config[$path];
            else
                $config = false;
        
        return $config;
    }
    
    /**
     * Filter a contentobject to be suitable for json output
     * @param $content
     * @return array
     */
    protected function filterContent(Content $content)
    {

        $out = array();
        $out["id"] = $content->id;
        $out["id_slug"] = $content->contenttype["slug"]."/".$content->id;
        $out["contenttype"] = $content->contenttype["singular_slug"];
        $out["user"] = array();
        $out["user"]["id"] = $content->user["id"];
        $out["user"]["username"] = $content->user["username"];
        $out["user"]["displayName"] = $content->user["displayname"];
        $out["values"] = $content->getValues();

        return $out;
    }

    /**
     * Stores the file in the filesystem
     *
     * @param $file
     * @return mixed
     * @throws \Exception
     */
    protected function storeFile(UploadedFile $file)
    {

        $basePath = $this->app["resources"]->getPath("filespath");

        $extension = $file->getClientOriginalExtension();
        $filename = basename($file->getClientOriginalName(), ".".$extension);

        if(!in_array($extension, self::$allowedExt))
            throw new \Exception("File '$filename'' has invalid extension '$extension'");

        // Try filename and add counter if already present
        $filename = $this->app['slugify']->slugify($filename);
        $counter = 0;
        $realFilename = $filename.".".$extension;

        while(file_exists($basePath."/".self::filesPath."/".$realFilename)){
            $counter++;
            $realFilename = $filename."-".$counter.".".$extension;
        }

        $fs = new Filesystem();
        $fs->mkdir($basePath."/".self::filesPath, 0755);

        $file->move($basePath."/".self::filesPath, $realFilename);

        return "/".self::filesPath."/".$realFilename;
    }

    /**
     * removes the file from the filesystem
     *
     * @param $path
     * @return mixed
     * @throws \Exception
     */
    protected function removeFile($path)
    {
        $basePath = $this->app["resources"]->getPath("filespath");
        unlink($basePath.$path);
    }

    private function makeErrorResponse( $message ) {
        return new JsonResponse(array(
            "status" => "error",
            "message" => $message
        ),500);
    }

}