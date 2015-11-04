/*
  app.js by Christopher John
*/
var ModelItem = Backbone.Model.extend({
    defaults: {
		cameraViewReference: null,
		supportsWebRTC: false,
		supportsMediaRecorderAPI: false,
		localStream: null,
		appHeight: 800,
		cameraMaxWidth: 1280,
		cameraMaxHeight: 720,
        cameraMinWidth: 640,
		cameraMinHeight: 480,
		includeAudio: false,
		cameraScaleComplete: false,
		prepRecording: false,
		publishRecording: false,
		errorMsgArray: ['<h1>WebRTC required - Sorry, unable to connect to camera</h1><p>Please ensure no other devices are using the camera and refresh the browser.</p><p><a href="https://developer.mozilla.org/en-US/docs/Web/Guide/API/WebRTC">More information about WebRTC</a></p>', '<h2><a href="https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder_API">Media Recorder API</a> unsupported, try Firefox</h2>','Sorry, the recorder has stopped unexpectedly'],
		mime: 'video/webm',
		fileAddress: null,
		fileLoad: false,
		scaleAssets: false,
		useMandatoryOptionalSyntax: true
    },
	initialize: function(){
		_.bindAll(this, 'featureSupport');
		this.featureSupport();
	},
	featureSupport: function(){
		if (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia) {
			this.set ('supportsWebRTC', true);
		}
		if (window.MediaRecorder && window.Blob && window.FileReader) {
			this.set ('supportsMediaRecorderAPI',  true);
		}
	}
});
var PlaybackView = Backbone.View.extend({    
	el: null,
	model: null,
   	initialize: function(){
  		_.bindAll(this, 'loadFile', 'validateDOM', 'prepRecording');
		this.model.bind('change:fileLoad', this.loadFile, this);
		this.model.bind('change:prepRecording', this.prepRecording, this);
   	},
	loadFile: function(){
		if (this.model.get('fileAddress')!=null && this.validateDOM()==true) {
			$(this.el).empty();
			var viewReference = this;
			var reader = new FileReader();
			reader.onloadend = (function(event) {
				if (event.target.readyState == FileReader.DONE) {
					$(viewReference.el).attr('src', event.target.result);
					$(viewReference.el).attr('width', viewReference.model.get ('cameraMaxWidth'));
					$(viewReference.el).attr('width', viewReference.model.get ('cameraMaxHeight'));
					$(viewReference.el).css ('display', 'block');
					viewReference.model.set ('scaleAssets', !viewReference.model.get ('scaleAssets'));
				}
				reader = null;
			});//onloadend
			reader.readAsDataURL(this.model.get('fileAddress'));			
		}
	},
	validateDOM: function () {
		if ($(this.el).length > 0) {
			return true;
		} else {
			return false;
		}
	},
	prepRecording: function() {
		$(this.el).css('display', 'none');
	}
});
var MediaRecorderView = Backbone.View.extend({    
	el: null,
	model: null,
	recorder: null,
   	initialize: function(){
  		_.bindAll(this, 'render', 'publishRecording', 'recordStart', 'recordStop', 'readBlob');
		this.model.bind('change:cameraScaleComplete', this.render, this);
   	},
	render: function() {
		this.model.bind('change:publishRecording',this.publishRecording,this);
	},
	publishRecording: function(){
		if (this.model.get ('publishRecording')==true) {
			this.recordStart();
		} else {
			this.recordStop();
		}
	},
	recordStart: function(){
		if (this.model.get('localStream')!=null) {
			this.recorder = new window.MediaRecorder(this.model.get('localStream'));
			var viewReference = this;
		  	this.recorder.ondataavailable = function(event) {
				if (viewReference.recorder.state=="inactive") {
					var blob = new window.Blob([event.data], {
					  type: viewReference.model.get('mime')
				  	});
					viewReference.readBlob(blob);				
				}
    		};
			this.recorder.onstop = function() {
        		viewReference.recorder = null;
				if (viewReference.model.get('publishRecording')==true) {
					alert (viewReference.model.get('errorMsgArray')[2]);
				}
    		};
    		this.recorder.start();
		} else {
			//Add error handling
		}
	},
	recordStop: function(){
		this.recorder.stop();
	},
	readBlob: function(blob) {
		this.model.set('fileAddress', blob);
		this.model.set('fileLoad', !this.model.get('fileLoad'));			
	}
});
var CameraView = Backbone.View.extend({    
	el: null,
   	initialize: function(){
		_.bindAll(this, 'render', 'validateDOM', 'supportsWebRTC', 'adjustForBrowser', 'readyFunction', 'handleCameraPublishing', 'handleCameraPrep');
  	},
	render: function(){
		if (this.validateDOM()==true && this.supportsWebRTC()==true) {
			this.adjustForBrowser();
			var viewReference = this;
			$(this.el).on('canplay', this.readyFunction);
			if (this.model.get('useMandatoryOptionalSyntax')==true) {
				var video_constraints = {
					mandatory: {
						minHeight:  this.model.get ('cameraMinHeight'),
						minWidth: this.model.get ('cameraMinWidth'),
						maxHeight:  this.model.get ('cameraMaxHeight'),
						maxWidth: this.model.get ('cameraMaxWidth')
					}
				};
			} else {
				var video_constraints = {
					width: { min: this.model.get ('cameraMinWidth'), ideal: this.model.get ('cameraMaxWidth'), max: this.model.get ('cameraMaxWidth') },
        			height: { min: this.model.get ('cameraMinHeight'), ideal: this.model.get ('cameraMaxHeight'), max: this.model.get ('cameraMaxHeight') }
				};
			}
			navigator.getMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
			navigator.getMedia (
				// constraints
				{
					video: video_constraints,
					audio: this.model.get('includeAudio')
				},
				// successCallback
				function(localMediaStream) {
					$(viewReference.el).attr('src', window.URL.createObjectURL(localMediaStream));
					viewReference.model.set({localStream: localMediaStream });
				},
				// errorCallback
				function(err) {
					alert (err);
					//Add error handling
				}
			);
		} else {
			$(this.el).parent().html(this.model.get('errorMsgArray')[0]);
		}
	},
	validateDOM: function () {
		if ($(this.el).length > 0) {
			return true;
		} else {
			return false;
		}
	},
	supportsWebRTC: function () {
		if (this.model.get('supportsWebRTC')) {
			return true;
		} else {
			return false;
		}
	},
	adjustForBrowser: function () {
		if (navigator.userAgent.indexOf("Firefox")!=-1) {
			console.log ('Firefox');
			this.model.set('useMandatoryOptionalSyntax', false)
		}
	},
	readyFunction: function(event){
		if (this.model.get ('cameraScaleComplete')==false) {
			$(this.el).attr('width', this.model.get ('cameraMaxWidth'));
			$(this.el).attr('height', this.model.get ('cameraMaxHeight'));
			this.model.bind('change:publishRecording', this.handleCameraPublishing, this);
			this.model.bind('change:prepRecording', this.handleCameraPrep, this);
			this.model.set ('cameraScaleComplete', true);
			this.model.set ('scaleAssets', !this.model.get ('scaleAssets'));
		}
	},
	handleCameraPublishing: function(){
		if (this.model.get ('publishRecording')==false) {
			$(this.el).css('display', 'none');
		} else {
			$(this.el).css('display', 'block');
		}
	},
	handleCameraPrep: function() {
		$(this.el).css('display', 'block');
	}
});
var MenuView = Backbone.View.extend({    
	el: null,
   	initialize: function(){
		_.bindAll(this, 'render', 'validateDOM', 'handleCameraPublishing', 'prepRecording', 'prepPlayback', 'applyStyles');
		this.model.bind('change:cameraScaleComplete', this.render, this);
  	},
	render: function(){
		if (this.validateDOM()==true) {
			this.model.bind('change:publishRecording', this.handleCameraPublishing, this);
			this.model.bind('change:prepRecording', this.prepRecording, this);
			$(this.$('button')[0]).css('display', 'inline-block');
		}
	},
	validateDOM: function () {
		if ($(this.el).length > 0 && this.model.get('supportsMediaRecorderAPI')==true && this.model.get('supportsWebRTC')==true) {
			return true;
		} else {
			$(this.el).html(this.model.get('errorMsgArray')[1]);
			return false;
		}
	},
	handleCameraPublishing: function(){
		if (this.model.get ('publishRecording')==false) {			
			this.prepPlayback();
			this.removeStyles();
		} else {
			this.prepRecording();
			this.applyStyles();
		}
	},
	prepPlayback: function() {
		$(this.$('button')[0]).css('display', 'none');
		$(this.$('button')[1]).css('display', 'inline-block');
		$(this.$('button')[2]).css('display', 'inline-block');
	},
	prepRecording: function() {
		$(this.$('button')[0]).css('display', 'inline-block');
		$(this.$('button')[1]).css('display', 'none');
		$(this.$('button')[2]).css('display', 'none');
	},
	applyStyles: function() {
		$(this.$('button')[0]).addClass('cam-pulse');
	},
	removeStyles: function() {
		$(this.$('button')[0]).removeClass('cam-pulse');
	}
});
var ScaleManager = Backbone.View.extend({    
	el: null,
   	initialize: function(){
		_.bindAll(this, 'render', 'validateDOM', 'transformObject');
		this.model.bind('change:scaleAssets', this.render, this);
  	},
	render: function(){
		if (this.validateDOM()==true && this.model.get('supportsWebRTC')==true) {
			var scaleAmount = 1;
			if ($(window).width()<this.model.get('cameraMaxWidth')) {
				scaleAmount = ((($(window).width()*100)/this.model.get('cameraMaxWidth'))/100);
				if ((scaleAmount*this.model.get('appHeight'))>$(window).height()) {
					scaleAmount = ((($(window).height()*100)/this.model.get('appHeight'))/100);
				}
				this.transformObject($(this.el), scaleAmount);
			} else if ($(window).height()<this.model.get('appHeight')) {
				scaleAmount = ((($(window).height()*100)/this.model.get('appHeight'))/100);
				if ((scaleAmount*this.model.get('cameraMaxWidth'))>$(window).width()) {
					scaleAmount = ((($(window).width()*100)/this.model.get('cameraMaxWidth'))/100);
				}
				this.transformObject($(this.el), scaleAmount);
			} else {
				scaleAmount = 1;
				this.transformObject($(this.el), scaleAmount);
			}
		}
	},
	validateDOM: function () {
		if ($(this.el).length > 0) {
			return true;
		} else {
			return false;
		}
	},
	transformObject: function(target, scaleAmount) {
		$(target).css('transform', 'scale('+scaleAmount+','+scaleAmount+')');
		$(target).css('-webkit-transform', 'scale('+scaleAmount+','+scaleAmount+')');
		$(target).css('-ms-transform', 'scale('+scaleAmount+','+scaleAmount+')');
	}
});
var ControllerItem = Backbone.View.extend({   
	el: null,
	events: function() {
		return _.extend({'click #btn-record': 'toggleRecord'},{'click #btn-cancel': 'clearRecording'},{'click #btn-rewind': 'reloadRecording'});
	},	
    initialize: function(){
    	_.bindAll(this, 'render', 'resizeWindow', 'toggleRecord', 'clearRecording', 'reloadRecording');
		this.render();
    },
	render: function(){
		var cameraViewReference = this.model.get('cameraViewReference');
		cameraViewReference.render();
		$(window).bind("resize", this.resizeWindow)
    },
	resizeWindow: function(){
		this.model.set ('scaleAssets', !this.model.get ('scaleAssets'));
	},
	toggleRecord: function(event) {
		this.model.set ('publishRecording', !this.model.get('publishRecording'));
	},
	clearRecording: function(event) {
		this.model.set ('prepRecording', !this.model.get('prepRecording'));
	},
	reloadRecording: function(event) {
		this.model.set('fileLoad', !this.model.get('fileLoad'));	
	}
});
$(document).ready(function() {
	(function($){
		var modelItem = new ModelItem();
		var playbackView = new PlaybackView({
	  		model: modelItem,
	  		el: $('#playback')
  		});
		var mediaRecorderView = new MediaRecorderView({
			model: modelItem
		});
		var menuView = new MenuView({
	  		model: modelItem,
	  		el: $('.menu')
  		});
		var scaleManager = new ScaleManager({
			model: modelItem,
			el: $('.container')
		});
		var cameraView = new CameraView({
			model: modelItem,
			el: $('#camera')
		});
		modelItem.set ('cameraViewReference', cameraView);
		var controllerItem = new ControllerItem({
	  		model: modelItem,
	  		el: $('body')
  		});
	})(jQuery);
});