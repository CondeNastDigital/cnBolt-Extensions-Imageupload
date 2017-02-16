

var ImageUploadST = function(properties) {

    var that = this;

    that.blockPrototype = {

        extensionUrl: properties.extensionUrl,
        extensionWebPath: properties.extensionWebPath,
        extensionOptions: properties.extensionOptions,

        fieldId: null,

        type: '',
        title: function() {
            return this.custom.label
        },
        icon_name: 'image',
        toolbarEnabled: true,
        // Custom html that is shown when a block is being edited.
        textable: false,
        custom: {
            type: '',
            label: '',
            contenttype: '',
            field: '',
            subfield: ''
        },
        editorHTML:
        '<div>' +
        '   <div class="block-title"></div>' +
        '   <iframe src="" style="width:100%;border:1px solid #ccc; border-radius:2px;inset 0px 1px 1px rgba(0,0,0,0.075)"></iframe>' +
        '   <input class="data-target" id="" value="" type="text">' +
        '</div>'
        ,

        /**
         * Loads the json data in to the field
         * @param data
         */
        loadData: function(data){
            $(this.$('.data-target')).val(JSON.stringify(data));
        },

        /**
         * Sets the data form the ImageService into the Block store
         */
        save: function(){
            var data = $(this.$('.data-target')).val();
            if(data) {
                this.setData(JSON.parse(data));
            }
        },

        /**
         * Creates the new image service block
         */
        onBlockRender: function() {

            this.fieldId = 'imageupload-st-' + String(new Date().valueOf());

            $(this.$('.block-title')).html(this.custom.label);
            $(this.$('input.data-target')).attr('id', this.fieldId);
            $(this.$('input.data-target')).hide();

            var src = this.extensionWebPath+'imageupload/iframe/'+this.custom.contenttype+'/'+this.custom.field+'/'+this.custom.subfield;
            $(this.$('iframe')).attr('src', src);

        }

    };


    that.init = function(options) {

        if(typeof(SirTrevor)) {
            Object.keys(options).forEach(function (block) {

                if (!(options[block] instanceof Object && options[block].hasOwnProperty('type') && options[block].type == 'imageupload'))
                    return;

                var newBlock = {
                    type: block,
                    custom: options[block]
                };

                newBlock.custom.subFieldName = block;
                newBlock.custom.contenttype = $('[name="contenttype"]').val();

                if (typeof(SirTrevor.Blocks[block]) === 'undefined') {
                    newBlock = jQuery.extend({}, that.blockPrototype, newBlock);
                    SirTrevor.Blocks[block] = SirTrevor.Block.extend(newBlock);
                }
            });
        }

    };
    
    return that;
};

var imageUplaodST = new ImageUploadST({
    extensionUrl: document.currentScript.getAttribute('data-extension-url'),
    extensionWebPath: document.currentScript.getAttribute('data-root-url'),
    extensionOptions: document.currentScript.getAttribute('data-extension-imageupload-config')
});

$(document).on('SirTrevor.DynamicBlock.All', function(){
    $(document).trigger('SirTrevor.DynamicBlock.Add', [imageUplaodST] );
});
$(document).trigger('SirTrevor.DynamicBlock.Add', [imageUplaodST] );



