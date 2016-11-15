$(document).ready(function () {

    var index;
    var nodeFileupload = $('#fileupload');
    var storeUrl = pathsbolt + 'imageupload/store/' + parentContenttype + '/' + parentField;
    var listUrl = pathsbolt + 'imageupload/list/' + parentContenttype + '/' + parentField;
    var deleteUrl = pathsbolt + 'imageupload/delete/' + parentContenttype + '/' + parentField;
    var inputImageIds = $('input#'+parentField, parent.document);

    initialize();

    /**
     * Sort Handler
     * resets the indizes of all fields accordingly after sorting (drag drop) has ended
     */
    $('#files').sortable({
        stop: function(){
            var nodes = $('#metaFields').find('#files').find('div.node');
            if (nodes.length > 0) {
                $.each(nodes, function (i) {
                    // Correct index of hidden id fields
                    $(this).attr('id','node'+i);
                    $(this).find("input[name^=id]").attr('name','id['+i+']');
                    // Correct indext of editable fields
                    var pNodes = $(this).find('.metacontainer').children('p');
                    var metafield;
                    $.each(pNodes, function(){
                        var label = ($(this).find('label'));
                        metafield = label.attr('class');
                        $(this).find("[name^=value]").attr('name','value['+i+']['+metafield+']');
                    });

                });
            }
        }
    });

    /**
     * Click AddFiles Button
     * Prepare FileReader for newly added file and set canvas
     */
    nodeFileupload.find('#btnAddFiles')
        .on('change', function () {
            var files = $(this).get(0).files;

            $.each(files, function (i, data) {

                //var imageType = /image.*/;
                var name = data.name;

                //if (!data.type.match(imageType))
                //    return;

                var context = createNode(data, name, "", index);
                context.addClass('newFile');
                context.prependTo('#files');

                context.find($('#node' + index + ' .imagecontainer'))
                    .append($('<canvas/>').attr('class', 'canvasthumb'));

                var reader = new FileReader();
                reader.onload = createCanvas(index);
                reader.readAsDataURL(data);

                index++;
            });
        });


    /**
     * Click UploadAllFiles Button
     * iterate through all items, collect their data and post to ajax service
     */
    nodeFileupload.find('#btnUploadAllFiles')
        .on('click', function () {

            var nodes = $('#metaFields').find('#files').find('div.node');

            if (nodes.length > 0) {

                var data = new FormData();

                $.each(nodes, function () {

                    var id = $(this).attr('id').replace('node', '');
                    var file = $(this).data('file');
                    var metaFields = $('#metaFields').find('#node' + id).find('input,textarea');

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
                    error: function(xhr) {
                        try {
                            var json = $.parseJSON(xhr.responseText);
                            alert('[Extension::Multimageupload] ' + json.status +' : '+ json.message);
                        } catch(e) {
                            alert('something bad happened');
                        }
                    }
                })
            }

        });


    /**
     * Click SpecificDeleteFile Button
     * get id of specified file and call ajax delete service
     */
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
                },
                error: function(xhr) {
                    try {
                        var json = $.parseJSON(xhr.responseText);
                        alert('[Extension::Multimageupload] ' + json.status +' : '+ json.message);
                    } catch(e) {
                        alert('something bad happened');
                    }
                }
            });
        }
    });

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
                        .append($('<div style="background-image: url(' + pathsroot + 'files/' + name + ')"/>').attr('class', 'imagethumb'));

                    index++;
                });
            },
            error: function(xhr) {
                try {
                    var json = $.parseJSON(xhr.responseText);
                    alert('[Extension::Multimageupload] ' + json.status +' : '+ json.message);
                } catch(e) {
                    alert('something bad happened');
                }
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
            var output = '<p><label class="' + title + '" style="text-transform:capitalize;float:left;">' + label + ':</label>';

            if(fieldObj.type == "textarea")
                output += '<textarea name="value[' + index + '][' + title + ']" class="type-'+fieldObj.type+'">'+value.replace(/"/g,"&quot;")+'</textarea>';
            else
                output += '<input value="' + value.replace(/"/g,"&quot;") + '" name="value[' + index + '][' + title + ']" type="text" class="type-'+fieldObj.type+'"/>';

            output += '</p>';
            return output;
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
