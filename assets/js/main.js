$(document).ready(function () {

    var index;
    var nodeFileupload = $('#fileupload');
    var storeUrl = pathsroot + 'bolt/imageupload/store/' + parentContenttype + '/' + parentField;
    var listUrl = pathsroot + 'bolt/imageupload/list/' + parentContenttype + '/' + parentField;
    var deleteUrl = pathsroot + 'bolt/imageupload/delete/' + parentContenttype + '/' + parentField;
    var inputImageIds = $('input#imageupload', parent.document);

    initialize();


    // Selectable
    $('#files').sortable({
        stop: function(){
            var nodes = $('#metaFields').find('#files').find('div.node');
            if (nodes.length > 0) {
                $.each(nodes, function (i) {
                    $(this).attr('id','node'+i);
                    $(this).find("input[name^=id]").attr('name','id['+i+']');

                    var pNodes = $(this).find('.metacontainer').children('p');
                    var metafield;
                    $.each(pNodes, function(){
                        var label = ($(this).find('label'));
                        metafield = label.attr('class');
                        $(this).find("input[name^=value]").attr('name','value['+i+']['+metafield+']');
                    });

                });
            }
        }
    }).disableSelection();


    // Click AddFiles Button
    nodeFileupload.find('#btnAddFiles')
        .on('change', function () {
            var files = $(this).get(0).files;

            $.each(files, function (i, data) {

                var imageType = /image.*/;
                var name = data.name;

                if (!data.type.match(imageType))
                    return;

                var context = createNode(data, name, "", index);
                context.addClass('newFile');

/* disabled because of a bug

                //specific upload button
                context.find('.btnContainer')
                    .append('<button title="Upload File" type="button" class="btn btn-small btn-primary btnUploadFile"><i class="glyphicon glyphicon-upload"></i></button>');

                //specific progress bar
                context.find('.progressContainer')
                    .append('<progress value="0" max="100" id="node' + index + '_progress"></progress>');

*/

                context.prependTo('#files');

                context.find($('#node' + index + ' .imagecontainer'))
                    .append($('<canvas/>').attr('class', 'canvasthumb'));

                var reader = new FileReader();
                reader.onload = createCanvas(index);
                reader.readAsDataURL(data);

                index++;

            });

        });


    // Click UploadAllFiles Button
    nodeFileupload.find('#btnUploadAllFiles')
        .on('click', function () {

            var nodes = $('#metaFields').find('#files').find('div.node');

            if (nodes.length > 0) {

                var data = new FormData();

                $.each(nodes, function () {

                    var id = $(this).attr('id').replace('node', '');
                    var file = $(this).data('file');
                    var metaFields = $('#metaFields').find('#node' + id).find('input');

                    if (file instanceof File) {
                        data.append('file_' + id, file);
                    }

                    $.each(metaFields, function () {
                        var key = ($(this).attr('name'));
                        var value = ($(this).val());

                        data.append(key, value);
                    });

                });

                $.ajax({
                    url: storeUrl,
                    type: 'POST',
                    data: data,
                    processData: false,
                    contentType: false,
                    success: function (res) {
                        images2inputImageIds(res);
                        nodeFileupload.find('.infotext').addClass('bg-success').text('All Files have been saved successfully!');

                    },
                    error: function (err) {
                        console.log(err);
                        nodeFileupload.find('.infotext').addClass('bg-danger').text('An error has occurred! Please try again later');
                    }
                })
            }

        });


    // Click SpecificDeleteFile Button
    $(document).on('click', '.btnDeleteFile', function () {
        var parent = $(this).closest('div[id]');
        var newFile = parent.hasClass('newFile');
        var node = parent.attr('id');

        if (newFile) {
            parent.remove();

        } else {

            var imageId = $('#' + node).find('.hiddenIdField').val();
            var jsonObj = $.parseJSON(inputImageIds.val());
            var arr = jsonObj.content;

            $.each(arr, function (key, value) {
                if (value.split('/')[1] == imageId) {
                    tid = value.split('/')[1];
                    type = value.split('/')[0];
                }
            });

            jsonObj.delete = [type + '/' + tid];

            $.ajax({
                url: deleteUrl,
                data: JSON.stringify(jsonObj),
                type: "POST",
                success: function (res) {

                    images2inputImageIds(res);
                }

            });
        }
    });

/* disabled because of a bug
* if you upload a file using the single upload button and you click then on the upload all / save button, the file will be uploaded twice
*
     // Click SpecificUploadFile Button
    $(document).on('click', '.btnUploadFile', function () {
        var button = $(this);
        var parent = $(this).closest('div[id]');
        var data = new FormData();

        var node = parent.attr('id');
        var id = node.replace('node', '');
        var file = parent.data('file');

        var metaFields = $('#metaFields').find('#node' + id).find('input');

        if (file instanceof File) {
            data.append('file_' + id, file);
        }

        $.each(metaFields, function () {
            var key = ($(this).attr('name'));
            var value = ($(this).val());

            data.append(key, value);
        });

        $.ajax({
            url: storeUrl,
            type: 'POST',
            xhr: function () {
                var myXhr = $.ajaxSettings.xhr();
                if (myXhr.upload) {
                    myXhr.upload.addEventListener('progress', progressHandlingFunction(node), false);
                }
                return myXhr;
            },
            data: data,
            processData: false,
            contentType: false,
            success: function (res) {

                var jsonObj = $.parseJSON(inputImageIds.val());
                var contentObject = jsonObj.content;

                $.each(res, function () {
                    contentObject.push($(this)[0].id_slug);
                });

                var jsonString = JSON.stringify(contentObject);

                inputImageIds.val('{"content": ' + jsonString + '}');

                button.addClass('btn-success').removeClass('btn-primary btn-danger btnUploadFile');
                button.find('.glyphicon-upload').addClass('glyphicon-ok').removeClass('glyphicon-upload glyphicon-remove');
                $('#' + node).addClass('success').removeClass('error newFile').find('button.btnDeleteFile').remove();

                nodeFileupload.find('.infotext').removeClass('bg-success bg-danger').text('');

            },
            error: function (err) {
                console.log(err.responseText);
                button.addClass('btn-danger').removeClass('btn-primary');
                button.find('.glyphicon-upload').addClass('glyphicon-remove');
                $('#' + node).addClass('error');
            }
        })
    });
*/

    //first initial loading of linked imageObjects while loading a new or present page
    function initialize() {

        index = 0;

        $.ajax({
            url: listUrl,
            type: 'POST',
            data: inputImageIds.val(),
            success: function (res) {

                blacklist = ['datechanged', 'datecreated', 'datedepublish', 'datepublish', 'ownerid', 'slug', 'status', 'templatefields'];
                whitelist = imagefields;

                $.each(res, function () {

                    var entries = $(this)[0].values;

                    var data = removeEntriesFromObject(entries, blacklist, whitelist);
                    var name = data.image.file;
                    var id = data.id;
                    var context = createNode(data, name, id, index);

                    context.appendTo('#files');
                    context.find($('#node' + index + ' .imagecontainer'))
                        .append($('<div style="background-image: url(' + pathsroot + 'files' + name + ')"/>').attr('class', 'imagethumb'));

                    index++;
                });
            },
            error: function (res) {
                console.log(res);
            }
        });
    }


    //inserts a contentobject with image-ids to a hidden input field (to save it in the database)
    function images2inputImageIds(res) {
        var content = [];

        $.each(res, function () {
            content.push($(this)[0].id_slug);
        });

        var jsonString = JSON.stringify(content);

        inputImageIds.val('{"content": ' + jsonString + '}');

        $('#files').empty();
        initialize();
    }

    //creates a imageobject node-container
    //adds a node on top of the imagelist with a new consecutive id
    function createNode(data, name, id, index) {
        var context = $('<div/>')
            .attr('class', 'node')
            .attr('id', 'node' + index)
            .append($('<div/>').attr('class', 'imagecontainer'));

        context.append($('<div/>').attr('class', 'metacontainer'))
            .append('<input value="' + id + '" class="hiddenIdField" name="id[' + index + ']">');

        $.each(imagefields, function (title, fieldObj) {
            context.find('.metacontainer').append(getMetaFields(title, fieldObj, data));
        });


/* disabled because of the single upload button bug

        //specific progress bar
        context.find('.metacontainer').append('<div class="progressContainer"></div>');
*/

        //specific button container
        context.find('.metacontainer').append('<div class="btnContainer"></div>');
        //specific delete button
        context.find('.btnContainer').append('<button title="Delete File" type="button" class="btn btn-small btn-danger btnDeleteFile"><i class="glyphicon glyphicon-trash"></i></button>');

        context.append($('<div/>').css('clear', 'both'));
        context.data('file', data);
        return context;
    }

    function getMetaFields(title, fieldObj, data) {
        if (title != 'image') {
            var label = fieldObj.label != "" ? fieldObj.label : title;
            var value = (typeof data[title] !== 'undefined' ? data[title] : "");
            return '<p><label class="' + title + '" style="text-transform:capitalize; width:75px;float:left;">' + label + ':</label> <input value="' + value.replace(/"/,"&quot;") + '" name="value[' + index + '][' + title + ']" type="text"/></p>';
        }
    }


    function createCanvas($index) {
        return function (e) {
            var $img = $('<img>', {src: e.target.result});
            var canvas = $('#node' + $index).find('.canvasthumb')[0];
            var context = canvas.getContext('2d');

            $img.load(function () {
                context.drawImage(this, 0, 0, 120, 100);
            });
        }
    }


    function progressHandlingFunction($node) {
        return function (e) {
            if (e.lengthComputable) {
                $('#' + $node + '_progress').attr({value: e.loaded, max: e.total});
            }
        }
    }


    function removeEntriesFromObject(entries, blacklist, whitelist) {
        var data = entries;
        $.each(blacklist, function (key, val) {
            delete data[val];
        });
        return data;
    }

});
