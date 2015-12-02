$(document).ready(function () {

    var index;
    var nodeFileupload = $('#fileupload');
    var storeUrl = pathsroot + 'imageupload/store/'+parentContenttype+'/'+parentField;
    var listUrl = pathsroot + 'imageupload/list/'+parentContenttype+'/'+parentField;
    var deleteUrl = pathsroot + 'imageupload/delete/'+parentContenttype+'/'+parentField;

    var inputImageIds = $('input#imageupload', parent.document);

    initialize();



    // Click AddFiles Button
    nodeFileupload.find('#btnAddFiles')
        .on('change', function() {
            var files = $(this).get(0).files;

            $.each(files, function(i, data) {

              var imageType = /image.*/;
              var name = data.name;

                if (!data.type.match(imageType))
                    return;

                var context = createNode(data, name, "", index);
                context.addClass('newFile');

                //specific upload button
                context.find('.btnContainer')
                    .append('<button title="Upload File" type="button" class="btn btn-small btn-primary btnUploadFile"><i class="glyphicon glyphicon-upload"></i></button>');

                //specific progress bar
                context.find('.progressContainer')
                    .append('<progress value="0" max="100" id="node'+index+'_progress"></progress>');

                context.prependTo('#files');

                context.find($('#node'+index+' .imagecontainer'))
                    .append($('<canvas/>').attr('class','canvasthumb'));

                var reader = new FileReader();
                reader.onload = createCanvas(index);
                reader.readAsDataURL(data);

                index++;

            });

        });

    // Click UploadAllFiles Button
    nodeFileupload.find('#btnUploadAllFiles')
        .on('click', function(){

            var node = $('#metaFields').find('#files').find('div.node');
            output = [];

            if(node.length > 0) {

                var data = new FormData();

                $.each(node, function() {

                    var id = $(this).attr('id').replace('node','');

                    file = $(this).data('file');
                    metaFields = $('#metaFields').find('#node'+id).find('input');

                    if (file instanceof File) {
                        data.append('file_'+id, file);
                    }

                    $.each(metaFields, function(){
                        key = ($(this).attr('name'));
                        value = ($(this).val());

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

                        var content = [];

                        $.each(res, function(){
                            content.push($(this)[0].id_slug);
                        });

                        var jsonString = JSON.stringify(content);

                        inputImageIds.val('{"content": '+jsonString+'}');

                        //location.reload();
                        $('#files').empty();
                        initialize();

                        nodeFileupload.find('.infotext').addClass('bg-success').text('All Files have been saved successfully!');

                    },
                    error: function(err) {
                        console.log(err);
                        nodeFileupload.find('.infotext').addClass('bg-danger').text('An error has occurred! Please try again later');
                    }
                })
            }

        });

    // Click SpecificDeleteFile Button
    $(document).on('click', '.btnDeleteFile', function(){
        var parent = $(this).closest('div[id]');
        var newFile = parent.hasClass('newFile');
        var node = parent.attr('id');

        if(newFile){
            parent.remove();

        } else {

            var imageId = $('#'+node).find('.hiddenIdField').val();
            var jsonObj = $.parseJSON(inputImageIds.val());
            var arr = jsonObj.content;

            $.each(arr, function(key,value){
                if (value.split('/')[1] == imageId){
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

                    var content = [];

                    $.each(res, function(){
                        content.push($(this)[0].id_slug);
                    });

                    var jsonString = JSON.stringify(content);

                    console.log(jsonString);

                    inputImageIds.val('{"content": '+jsonString+'}');

                    $('#files').empty();
                    initialize();
                }

            });
        }
    });

    // Click SpecificUploadFile Button
    $(document).on('click', '.btnUploadFile', function(){
        var button = $(this);
        var parent = $(this).closest('div[id]');
        var data = new FormData();

        var node = parent.attr('id');
        var id = node.replace('node','');
        var file = parent.data('file');

        var metaFields = $('#metaFields').find('#node'+id).find('input');

        if (file instanceof File) {
            data.append('file_'+id, file);
        }

        $.each(metaFields, function(){
            key = ($(this).attr('name'));
            value = ($(this).val());

            data.append(key, value);
        });

        $.ajax({
            url: storeUrl,
            type: 'POST',
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if(myXhr.upload){
                    myXhr.upload.addEventListener('progress',progressHandlingFunction(node), false);
                }
                return myXhr;
            },
            data: data,
            processData: false,
            contentType: false,
            success: function (res) {

                var jsonObj = $.parseJSON(inputImageIds.val());
                var arr = jsonObj.content;

                $.each(res, function(){
                    arr.push($(this)[0].id_slug);
                });

                var jsonString = JSON.stringify(arr);
                inputImageIds.val('{"content": '+jsonString+'}');

                button.addClass('btn-success').removeClass('btn-primary btn-danger btnUploadFile');
                button.find('.glyphicon-upload').addClass('glyphicon-ok').removeClass('glyphicon-upload glyphicon-remove');
                nodeFileupload.find('.infotext').removeClass('bg-success bg-danger').text('');

                $('#'+node).addClass('success').removeClass('error');

            },
            error: function(err) {
                console.log(err.responseText);
                button.addClass('btn-danger').removeClass('btn-primary');
                button.find('.glyphicon-upload').addClass('glyphicon-remove');
                $('#'+node).addClass('error');
            }
        })



    });




    //first initial loading of linked imageObjects while loading a new or present page
    function initialize() {

        index = 0;

        $.ajax({
            url: listUrl,
            type: 'POST',
            data: inputImageIds.val(),
            success: function(res){

                var blacklist = ['datechanged','datecreated','datedepublish','datepublish','ownerid','slug','status','templatefields'];
                var whitelist = imagefields;

                $.each(res, function(){

                    var entries = $(this)[0].values;

                    var data = removeEntriesFromObject(entries, blacklist, whitelist);
                    var name = data.image.file;
                    var id = data.id;
                    var context = createNode(data, name, id, index);

                    context.appendTo('#files');
                    context.find($('#node'+index+' .imagecontainer'))
                        .append($('<div style="background-image: url('+pathsroot +'files'+ name+')"/>').attr('class','imagethumb'));
                        //.append($('<img src="'+pathsroot +'files'+ name+'"/>').attr('class','imagethumb'));


                    index++;
                });
            },
            error: function(res){
                console.log(res);
            }
        });
    }


    function createNode(data, name ,id, index){
        var context = $('<div/>')
                .attr('class', 'node')
                .attr('id', 'node' + index)
                .append($('<div/>').attr('class','imagecontainer'));

        context.append($('<div/>').attr('class','metacontainer'))
            .append('<input value="'+id+'" class="hiddenIdField" name="id['+index+']">');

        $.each(imagefields, function(title, fieldObj){
            context.find('.metacontainer').append(getMetaFields(title, fieldObj, data));
        });

        //specific progress bar
            context.find('.metacontainer').append('<div class="progressContainer"></div>');
        //specific button container
            context.find('.metacontainer').append('<div class="btnContainer"></div>');
        //specific delete button
            context.find('.btnContainer').append('<button title="Delete File" type="button" class="btn btn-small btn-danger btnDeleteFile"><i class="glyphicon glyphicon-trash"></i></button>');

        context.append($('<div/>').css('clear','both'));
        context.data('file',data);
        return context;
    }


    function getMetaFields(title, fieldObj, data){
        if (title != 'image') {
            var label = fieldObj.label != "" ? fieldObj.label : title;
            var value = (typeof data[title] !== 'undefined' ? data[title] : "");
            return '<p><label class="' + title + '" style="text-transform:capitalize; width:75px;float:left;">' + label + ':</label> <input value="' + value + '" name="value[' + index + '][' + title + ']" type="text"/></p>';
        }
    }


    function createCanvas($index) {
        return function(e) {
            var $img = $('<img>', {src: e.target.result});
            var canvas = $('#node' + $index).find('.canvasthumb')[0];
            var context = canvas.getContext('2d');

            $img.load(function () {
                context.drawImage(this,0,0,120,100);
            });
        }
    }


    function progressHandlingFunction($node){
        return function(e) {
            if (e.lengthComputable) {
                $('#'+$node+'_progress').attr({value: e.loaded, max: e.total});
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