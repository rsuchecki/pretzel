import Ember from 'ember';
import numeral from 'numeral';

function QueuedFile(File, valid, error) {
  this.File = File;
  this.valid = !!valid;
  this.error = typeof error === "string" ? error : null;
  return Ember.Object.create(this);
}

function FileUploader(options) {
  const _defaultOptions = {
    validate: function (file) {
      return true;
    },
    url: null,
    fieldName: 'Files[]',
    headers: {},
    data: {},
    method: 'POST'
  };

  const _files = [];
  const _eventHandlers = {};

  //Options to process file
  this.options = Ember.$.extend({}, _defaultOptions, options);

 
  const trigger = function (event) {
    if (_eventHandlers[event] !== undefined) {
      for (var i = 0; i < _eventHandlers[event].length; i++) {
        _eventHandlers[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
      }
    }
  };

  //Add file to the list
  //Currently only focus on one file at a time. but might extend to multiple file uploading
  this.addFiles = function (files) {
    let errorMessage;
    let qf;
    let filesAdded = 0;

    if ((errorMessage = this.options.validate(files[0])) === true) {
      qf = new QueuedFile(files[0], true);
    } else if (errorMessage === false) {
      //continue;
    } else {
      qf = new QueuedFile(files[0], false, errorMessage);
    }

    _files[0] = qf;
    filesAdded++;
    trigger('fileadded',qf);


    if (filesAdded > 0) {
      console.log(_files);
      //Read the file content 
      let reader = new FileReader();
      console.log(reader);
      reader.onload = function (e) {
        let content = e.target.result;
        console.log("nONONO? " + content);
        //The json format: genetic map?
        //let json = processData(content);
      };
      reader.readAsText(files[0]);
      trigger('filechanged',_files.slice());
      return true;
    }
    return false;
  };

  // this.readContents = function(qf){
  //   let reader = new FileReader();
  //     console.log(reader);
  //     reader.onload = function (e) {
  //       let content = e.target.result;
  //       console.log("nONONO? " + content);
  //       //The json format: genetic map?
  //       //let json = processData(content);
  //     };
  //   reader.readAsText(qf);
  // };
  //Return the file
  this.getAllFiles = function(){
    return _files.slice();
  };

  //Check function
  this.getValidFiles = function(){
    const files = [];
    if(_files[0].valid){
      files[0] = _files[0];
    }
    return files;
  };

  //Remove function
  this.removeFile = function(qf){
    let pos;
    if((pos = _files.indexOf(qf)) > -1){
      _files.splice(pos,1);
      trigger('fileremoved',qf);
      trigger('filechanged',_file,slice());
      return true;
    }
    return false;
  };

  //Upload funciton
  this.upload = function(options) {
    const formData = new FormData();
    const opt = Ember.$.extend({},this.options,options);

    for (var k in opts.data){
      if(opts.data.hasOwnProperty(k)){
        formData.append(k, opts.data[k]);
      }
    }

    const files = this.getValidFiles();

    for (var i = 0; i< files.length; i++){
      formData.append(opts.fieldName, files[i].file);
    }

    return new Ember.RSVP.Promise(function (resolve,reject){
      Ember.$.ajax({
        type: opts.method,
        url: opts.url,
        headers: opts.headers,
        data: formData,
        contentType: false,
        processDate: false,
        error: function (jqXHR){
          var error = jqXHR.responseText;
          try {
            error = JSON.parse(error);
          } catch (e) {
            error = new Ember.Error(error);
          }
          reject(error);
        },
        success: function(data){
          console.log(data);
          resolve(data);
        }
      });
    });
  };

  this.on = function (event, handler) {
    if (_eventHandlers[event] === undefined) {
      _eventHandlers[event] = [];
    }
    _eventHandlers[event].push(handler);
  };

  this.off = function (event, handler) {
    if (_eventHandlers[event] !== undefined) {
      for (var i = 0; i < _eventHandlers[event].length; i++) {
        if (_eventHandlers[event][i] === handler) {
          _eventHandlers[event].splice(i, 1);
          break;
        }
      }
    }
  };

}

export default Ember.Component.extend({
  classNames: ['upload-map'],
  name: "Files[]",
  acceptedTypes: '*/*,*',
  maxFileSize: '50MB',
  msgWrongFileType: 'Wrong file type',
  msgMaxFileSize: 'File is too big ({fileSize}). Max file size is {maxFileSize}.',
  
  queue: null,
  onInit: null,
  _input: null,
  
  init() {
    this._super.apply(this, arguments);
    this.set('queue', Ember.ArrayProxy.create({content: []}));
  },
  didInsertElement() {
    let that = this;

    this._uploader = new FileUploader({
      fieldName: this.get('name'),
      validate: function (file) {

        /**
         * This will check file type
         */
        const acceptedTypes = that.get('acceptedTypes').split(',');
        const escapeRegExp = /[|\\{}()[\]^$+?.]/g;
        let passTypeTest = false;
        for (var i = 0; i < acceptedTypes.length; i++) {
          let test = new RegExp(acceptedTypes[i].replace(escapeRegExp, '\\$&').replace(/\*/g, '.*'), 'g');
          if (test.test(file.type)) {
            passTypeTest = true;
            break;
          }
        }
        if (!passTypeTest) {
          return that.get('msgWrongFileType').toString();
        }
        /**
         * This will check file size
         */
        const maxFileSize = that.get('maxFileSize');
        if (typeof maxFileSize === "string") {
          let bytes = numeral().unformat(maxFileSize);
          if (bytes < file.size) {
            return that.get('msgMaxFileSize')
              .toString()
              .replace('{fileSize}', numeral(file.size).format('0.0b'))
              .replace('{maxFileSize}', maxFileSize);
          }
        }
        return true;
      }
    });

    this._uploader.on('fileadded', function (qf) {
      console.log("File upload"); 
      that.get('queue').addObject(qf);
      //  Ember.run.once(reader, 'readAsDataURL', qf.file);
    });

    this._uploader.on('fileremoved', function (qf) {
      that.get('queue').removeObject(qf);
    });
    this._generateInput();

    this.sendAction('onInit', this._uploader);
  },

  _generateInput() {
    const that = this;
    /**
     * If we already have an input, remove it
     */
    if (this._input && this._input.remove) {
      this._input.remove();
    }
    /**
     * Create new input
     */
    this._input = Ember.$('<input type="file" name="' + this.get('name') + '" accept="' + this.get('acceptedTypes') + '" multiple="multiple" />');
    /**
     * On change (user selected files) add files to upload and regenerate input to clear it
     */
    this._input.on('change', function () {
      that._uploader.addFiles(this.files);
      that._generateInput();
    });
    /**
     * Append input to component
     */
    this._input.appendTo(this.element);
  },
  actions: {
    remove(qf) {
      this._uploader.removeFile(qf);
    },
    upload() {
      this._input.click();
    }
  }
});



// import EmberUploader from 'ember-uploader';

// export default EmberUploader.FileField.extend({
//    filesDidChange: function(files) {
//      const uploader = EmberUploader.Uploader.create({
//        url: this.get('url')
//      });

// //     if (!Ember.isEmpty(files)) {
// //       // this second argument is optional and can to be sent as extra data with the upload
// //       uploader.upload(files[0]);
// //     }
// //   }
// });