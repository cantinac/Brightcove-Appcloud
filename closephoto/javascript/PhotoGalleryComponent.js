/*global bc:true atob:false*/
/*jshint indent:2, browser: true, white: false devel:true undef:false*/
/**
 * A PhotoGalleryComponent is a view that presents a collection of photos.  The component will show an initial screen of a grid thumbnails.
 * When the user taps a thumbnail they will transition to a new screen that shows the fullsize image that then allows the user to swipe through the
 * images.  Tapping this screen will hide/show the details for this image.
 *
 * @class A PhotoGalleryComponent is a view that presents a collection of photos.  The component will show an initial screen of a grid thumbnails.
 * When the user taps a thumbnail they will transition to a new screen that shows the fullsize image that then allows the user to swipe through the
 * images.  Tapping this screen will hide/show the details for this image.
 * @constructor
 * @augments Component
 * @param element The containing element on the page that the component should be displayed in.
 * @param ignore
 * { @list Styles: gridBackgroundColor, sliderBackgroundColor, descriptionTextColor }
 * @example new PhotoGalleryComponent( document.getElementById( "photoGallery" ) );
 * @return  A new PhotoGalleryComponent instance.
 *
 * @requires jquery-1.5.min.js
 * @requires iscroll-min.js 
 * @requires brightcove.mobile.core.js 
 * @requires brightcove.mobile.utils.js    
 * @requires brightcove.mobile.events.js   
 * @requires brightcove.mobile.ui.js   
 * @requires brightcove.mobile.device.js    
 */
var PhotoGalleryComponent = ( function( $, undefined ) {
  var _indexOfCurrentImage = 0,
      _albumData = [],
      _isSliding,
      _orientation,
      _overlayShowing = true,
      _width,
      _height,
      PADDING_BETWEEN_THUMBNAILS = 5,
      DEFAULT_NUMBER_OF_THUMBS_PER_ROW = 4;
      
  /**
   * @private
   */
  function PhotoGalleryComponent( element ) {
    PhotoGalleryComponent.superclass.constructor.call(this, element, "PhotoGalleryComponent");
    
    /**
     * The PhotoGalleryComponent allows publishers to set the following styles in the Brightcove App Cloud studio.<br/>
     * { @list Styles: gridBackgroundColor, sliderBackgroundColor, descriptionTextColor }
     */
    this.styleConfig =  { gridBackgroundColor: { type: "background-color", value: "" },
                          sliderBackgroundColor: { type: "background-color", value: "" },
                          descriptionTextColor: { type: "color", value: "" }
                         };
    
    /**
     * The PhotoGalleryComponent allows publishers to set the following settings in the Brightcove App Cloud studio.<br/>
     * { @list Settings: thumbnailsPerRow }
     */
    this.settingConfig = { 
      thumbnailsPerRow: { type: "String", value: "4" },
      thumbnailAspectRatio: { type: "String", value: "1" }
    };
    
    this.dataConfig = { images:
                        { name: 'images', type: 'array', items:
                          { media_thumbnail_url: { type: 'image' },
                            media_content_url: { type: 'image' },
                            media_description: { type: "String" },
                            media_name: { type: "String" }
                          }
                        }
                      };
  
    /** The current data available for this component. */
    this.data = bc.core.getData( this );
    /** The current settings available for this component. */
    this.settings = bc.core.getSettings( this );
    /** The current styles available for this component. */
    this.styles = bc.core.getStyles( this );     
    //The ID of the named feed for OOTB data.
    this.namedFeed = "4dc2fe9f3012156411000236";
    //The width of the viewport
    _width = bc.ui.width();
    //The height of the viewport
    _height = bc.ui.height();
    // The current view orientation
    _orientation = bc.context.viewOrientation;
    //register our event listeners for this component.
    this.registerEventListeners();
    //Allow this view to rotate in all directions.
    bc.device.setAutoRotateDirections( ['all'] );
    //Build out the page
    this.render();
    //Add the class to this function
    this.element.addClass( "photo-gallery-thumbnail-grid" );
    //Do not allow the page to scroll
    document.addEventListener( "touchmove", function( evt ) { evt.preventDefault(); } );
  }
  
  bc.core.extendClass( PhotoGalleryComponent, Component );
  
  /**
   * Responsible for building out the initial page the user is shown, in this example it is the grid of thumbnails.
   */
  PhotoGalleryComponent.prototype.render = function() {
    var html;
    
    //If there is no data then we should show the spinner.
    if( this.data === undefined || bc.utils.numberOfProperties( this.data ) === 0 ) {
      this.element.html( bc.ui.spinner() );
      return;
    }
    
    html = this.headerHTML( { "title": "Photos" } );
    html += this.thumbnailGridHTML();
    this.element.html( html );
    //Inject the CSS into the page
    this.applyStyles( this.styles );
    
    bc.ui.enableScrollers();
  };
  
  /**
   * Builds the new page for the slide show and transitions to it.  Note that the actual images are populated when the
   * device has gone full screen, this is for positioning purposes.
   */
  PhotoGalleryComponent.prototype.buildSlideShow = function() {
    var html = this.slideShowHTML( _indexOfCurrentImage );
    bc.ui.forwardPage( html );
  };
  
  /**
   * Registers all of the event listeners for this component.  Note that these are registered as delegates so that the DOM can change without
   * having to rebind all of our event listeners.
   */
  PhotoGalleryComponent.prototype.registerEventListeners = function() {

    //register event listener for when new data is fetched
    $( this ).bind( "newcomponentinfo", $.proxy( function( evt, info ) {
      this.setNewConfigs( info );
    }, this ) );

    //Listen for when a thumbnail is clicked
    $( "body" ).delegate( ".thumbnail", "tap", $.proxy( function( evt ) {
      this.thumbnailTap( evt );
    }, this) );
    
    //Bind to the back button.
    $( "body" ).delegate( ".back-button", "tap", $.proxy( function( evt ) {
      this.handleBackButtonTap( evt );
    }, this ) );
    
    //Register for tap events on the slideshow
    $( "body" ).delegate( ".slideshow-page", "tap", $.proxy( function( evt ) {
      this.toggleOverlay( evt );
    }, this ) );
    
    //register for swipe events on the slideshow page
    $( "body" ).delegate( ".slideshow-page", "swipe", $.proxy( function( evt, data ) {
      this.handleSwipe( evt, data );
    }, this ) );
    
    //Register event listeners for when the user rotates the device and update our scrollers when they do.
    $( bc ).bind( "vieworientationchange", $.proxy( function( evt, data ) {
      this.handleOrientationChange( data );
    }, this ) );
    
  };
  
  /**
   * The function that is called when there are new styles, settings or data available for this component.
   * @param info An object that has the current styles, settings and data for this component.  For example
   * info object.
   <pre> 
   { 
    "data": { ... },
    "styles": { ... },
    "settings": { ... }
   }
   </pre>
   */
  PhotoGalleryComponent.prototype.setNewConfigs = function( info ) {
    this.data = info.data;
    this.styles = ( bc.utils.numberOfProperties( info.styles ) > 0 ) ? info.styles : this.styles;
    this.settings = ( bc.utils.numberOfProperties( info.settings ) > 0 ) ? info.settings : this.settings;
    this.render();
  };
  
  /**
   * When a back button is clicked within this component the handleBackButtonTap function is called.
   * @param evt The event object for this tap event handler.  This is a typical event object.
   */
  PhotoGalleryComponent.prototype.handleBackButtonTap = function( evt ) {
    if( bc.ui.currentPage.hasClass( "slideshow-page" ) ) {
      bc.device.exitFullScreen();
    }
    bc.ui.backPage();
  };
  
  /**
   * Handles updating the UI when the orientation of the device changes.
   * @param direction The direction of the new orientation.
   */
  PhotoGalleryComponent.prototype.handleOrientationChange = function( data ) {
    var direction = data.orientation;
    if( direction === _orientation ) {
      return;
    }

    _orientation = direction;
    this.handleViewPortChange();
    this.updateUIOnOrientationChange();
  };
  
  /**
   * Handles a swipe event by calling the correct function depending on which direction the user
   * swiped the phone.
   * @param evt The event object for this event listener.  This is a typical event object.
   * @param data The direction that the user swiped the device.  Either 'swipeLeft' or 'swipeRight'.
   */
  PhotoGalleryComponent.prototype.handleSwipe = function( evt, data ) {
    if( data === "swipeRight" ) {
      this.handleSwipeRight();
    } else {
      this.handleSwipeLeft();
    }
  };
  
  /**
   * Handles updating the UI when the user swipes the device in the right direction.
   */
  PhotoGalleryComponent.prototype.handleSwipeRight = function() {
    var $elemToTheLeft,
        $elem;
    
    if( _isSliding || _indexOfCurrentImage === 0 ) {
      return;
    }
    
    $elemToTheLeft = $( "#" + ( _indexOfCurrentImage - 1) + "_wrapper" );
    $elem = $( ".slideshow-page .active" );
    
    _isSliding = true;  
    
    $elem.one( "webkitTransitionEnd", $.proxy( function() {
      this.swipeLeftAnimationComplete( $elem );  
    }, this ) );
    
    $elem.addClass( "slide-right-image-out" );
    $elemToTheLeft.addClass( "reveal" );
  };
  
  /**
   * Handles updating the UI when the user swipes the device in the left direction.
   */
  PhotoGalleryComponent.prototype.handleSwipeLeft = function() {
    var $elemToTheRight,
        $elem; 

    if( _isSliding || _indexOfCurrentImage === ( this.data.length - 1 ) ) {
      return;
    }
    
    $elemToTheRight = $( "#" + ( _indexOfCurrentImage + 1) + "_wrapper" );
    $elem = $( ".slideshow-page .active" );
    
    _isSliding = true;  

    $elem.one( "webkitTransitionEnd", $.proxy( function() {
      this.swipeRightAnimationComplete( $elem );  
    }, this ) );

    $elem.addClass( "slide-left-image-out" );
    $elemToTheRight.addClass( "reveal" );
  };
  
  /**
   * When the active image has finished transitioning off the page this is the function that is called.  Responsible for
   * loading up the next image off the screen, removing images from the UI and setting various states.
   * @param $elem The element that was just transitioned off the page wrapped as a jQuery object.
   */
  PhotoGalleryComponent.prototype.swipeLeftAnimationComplete = function( $elem ) {
    var html,
        $elemToTheRight = $( "#" + ( _indexOfCurrentImage + 1) + "_wrapper" ),
        $elemToTheLeft = $( "#" + ( _indexOfCurrentImage - 1) + "_wrapper" );
    
   $elem.removeClass( "active slide-right-image-out" );  
   $elemToTheLeft.addClass( "active" )
                 .removeClass( "reveal" );
               
    $elemToTheRight.remove();
    
    _indexOfCurrentImage--;
    
    if( _indexOfCurrentImage > 0 ) {
      html = this.imageWrapperHTML( { "index": (_indexOfCurrentImage - 1) } );
      $( html ).appendTo( $elem.parent() );
      this.loadImage( { "id": ( _indexOfCurrentImage - 1 ), "url": this.data[_indexOfCurrentImage - 1].media_content_url } );
   }
   this.updateOverlayMetaData();
   _isSliding = false;
  };
  
  /**
   * When the active image has finished transitioning off the page this is the function that is called.  Responsible for
   * loading up the next image off the screen, removing images from the UI and setting various states.
   * @param $elem The element that was just transitioned off the page wrapped as a jQuery object.
   */
  PhotoGalleryComponent.prototype.swipeRightAnimationComplete = function( $elem ) {
    var html,
        $elemToTheRight = $( "#" + ( _indexOfCurrentImage + 1) + "_wrapper" ),
        $elemToTheLeft = $( "#" + ( _indexOfCurrentImage - 1) + "_wrapper" );

    $elem.removeClass( "active slide-left-image-out" ); 
    $elemToTheRight.addClass( "active" )
                   .removeClass( "reveal" );
    
    $elemToTheLeft.remove();

    _indexOfCurrentImage++;

    if( _indexOfCurrentImage < ( this.data.length - 1 ) ) {
      html = this.imageWrapperHTML( { "index": (_indexOfCurrentImage + 1) } );
      $( html ).appendTo( $elem.parent() );
      this.loadImage( { "id": ( _indexOfCurrentImage + 1 ), "url": this.data[_indexOfCurrentImage + 1].media_content_url } );
    }
    this.updateOverlayMetaData();
    _isSliding = false;
  };
  
  /**
   * Updates the header and description to reflect the current image.  Occurs after the image has finished its animation.
   */
  PhotoGalleryComponent.prototype.updateOverlayMetaData = function() {
    $( ".overlay h1" ).html( ( _indexOfCurrentImage + 1) + " of " + this.data.length );
    $( ".overlay p" ).html( bc.utils.stripTags( this.data[_indexOfCurrentImage].media_description ) );
  };
  
  /**
   * Toggles the display of the overlay.
   * @param evt The event that was triggered from this event.  This is a typical event object.
   */
  PhotoGalleryComponent.prototype.toggleOverlay = function( evt ) {
    //TODO - perhaps I should put a blocker in to check if we are fading an if we are not do anything?  
    if( _overlayShowing ) {
      _overlayShowing = false;
      $( ".overlay" ).addClass( "hide" );
    } else {
      _overlayShowing = true;
      $( ".overlay" ).removeClass( "hide" );
    }
  };
  
  /**
   * When a user taps a thumbnail we insert and transition to the slide show page.  
   * @param evt The event that was triggered from this event.  This is a typical event object.
   */
  PhotoGalleryComponent.prototype.thumbnailTap = function( evt ) {
    _indexOfCurrentImage = $( evt.currentTarget ).data( "bc-index" );
    this.buildSlideShow();
    bc.device.enterFullScreen( $.proxy( function() {
      this.handleViewPortChange();
      this.loadImagesIntoSlideShow();
    }, this ), 
    $.proxy( function() {
      this.loadImagesIntoSlideShow();
    }, this ) );
  };
  
  /**
   * Updates the width and height.
   */
  PhotoGalleryComponent.prototype.handleViewPortChange = function() {
    _width = bc.ui.width();
    _height = bc.ui.height();
  };
  
  /**
   * When the orientation of the device changes we need resize the images appropriately.
   */
  PhotoGalleryComponent.prototype.updateUIOnOrientationChange = function() {
    var thumbnailWidth = this.calculateWidthOfThumbnail();
    $( ".photo-gallery-thumbnail-grid .thumbnail" ).width( thumbnailWidth );
    $( ".photo-gallery-thumbnail-grid .thumbnail" ).height( this.calculateHeightOfThumbnail( thumbnailWidth ) );
    //If we are on the 
    if( bc.ui.currentPage.hasClass( "slideshow-page" ) ) {
      $( ".image-wrapper > img" ).remove();
      this.loadImagesIntoSlideShow();
    }
    
    //TODO - remove this line once https://www.pivotaltracker.com/story/show/12947617 is fixed.
    bc.ui.refreshScrollers();
  };
  
  /**
   * Load the images into the slide show.
   */
  PhotoGalleryComponent.prototype.loadImagesIntoSlideShow = function() {
    this.loadImage( { "id": _indexOfCurrentImage, "url": this.data[_indexOfCurrentImage].media_content_url } );
    
    if( _indexOfCurrentImage !== 0 ) {
      this.loadImage( { "id": ( _indexOfCurrentImage - 1 ), "url": this.data[_indexOfCurrentImage - 1].media_content_url } );
    }
    
    if( _indexOfCurrentImage !== (this.data.length - 1)) {
      this.loadImage( { "id": ( _indexOfCurrentImage + 1 ), "url": this.data[_indexOfCurrentImage + 1].media_content_url } );
    }
  };
  
  /**
   * Loads the image off screen to get the dimensions and then inserts into the slide show.
   * @param image An object that has an ID and a URL to the image.  For example { "id": "37", "url": "http://picture.to.honeybadger" }
   */
  PhotoGalleryComponent.prototype.loadImage = function( image ) {   

    var imageElem = "<img id='#" + image.id + "_loader' data-bc-index='" + image.id + "' src='" + image.url + "' class='offscreen' />";
    $( imageElem ).appendTo('body')
                  .one('load', $.proxy( function( evt ) {
                    this.insertImageIntoSlideShow( evt.currentTarget );
                  }, this ) );
  };
  
  /**
   * Responsible for positioning and sizing the image correctly within the slide show.
   * @param elem The image that is to be inserted into the slide show.
   */
  PhotoGalleryComponent.prototype.insertImageIntoSlideShow = function( elem ) {
    var $elem = $( elem ),
        index = $elem.data( "bc-index" ),
        top,
        imageType = this.landscapeOrPortrait( $elem.height(), $elem.width() );
        
    if( $( "#" + index + "_wrapper" ).length > 0 ) { 
      if( imageType === "landscape" ) {
        top = ( _width * $elem.height() / $elem.width() );
        $elem.css( "margin-top", ( -top/2 ) + "px" );
      }
      $elem.addClass(imageType)
           .removeClass( "offscreen" )
           .appendTo( $( "#" + index + "_wrapper" ) );
    } else {
      $elem.attr( 'src', './images/empty.gif' )
           .delay(100)
           .remove();
    }
  };
  
  /**
   * Determines if the image should be displayed as portrait or landscape.
   * @param height The height of the image that we are determining should be shown as portrait or landscape.
   * @param width The width of the image that we are determining should be shown as portrait or landscape.
   */
  PhotoGalleryComponent.prototype.landscapeOrPortrait = function( height, width ) {
    return ( ( height / width ) > _height / _width ) ? "portrait" : "landscape";
  };
  
  /**
   * Generates the HTML snippet for the header. 
   * @param options An object that represents the settings that can be overridden for this HTML snippet.  Below are the default values.
   <pre>
   {
     "backButton": false, //A boolean for whether or not to show a back button.
     "shareButton": false, //A boolean for whether or not to show a share button.
     "refreshButton": false, //A boolean for whether or not to show a refreshButton.
     "title": ""
   }
   </pre>
   @return A string that is the HTML snippet for the header.
   */
  PhotoGalleryComponent.prototype.headerHTML = function( options ) {
    var html = "",
        settings = {
          "backButton": false,
          "shareButton": false,
          "refreshButton": false,
          "title": "",
          "className": "header"
        };
    
    $.extend( settings, options );
    
    html = "<header class='" + settings.className + "'>";
    
    if( settings.backButton ) {
      html += "<div class='back-button'></div>";
    }
    
    html += "<h1 class='header-a'>" + settings.title + "</h1>";
    
    if( settings.shareButton ) {
      html += "<div class='share-button'></div>";
    }
    
    if( settings.refreshButton ) {
      html += "<div class='refresh-button'></div>";
    }
    
    return ( html += "</header>" );        
  };
  
  /**
   * Build out the HTML string for the thumbnailGrid page.
   */
  PhotoGalleryComponent.prototype.thumbnailGridHTML = function() {
    var html = "",
        imageWidth = this.calculateWidthOfThumbnail(),
        imageHeight = this.calculateHeightOfThumbnail( imageWidth );
    
    html = "<section class='scroller gridBackgroundColor" + this.id +"'>" +
             "<div class='thumbnail-container'>";
        
    for( var i = 0, len = this.data.length; i < len; i++ ) {
      html += "<img src='" + this.data[i].media_thumbnail_url + "' alt='thumb' class='thumbnail' data-bc-index='" + i + "' style='width: " + imageWidth + "px; height: " + imageHeight + "px' />";
    }
    
    html +=  "</div>" +
            "</section>";
            
    return html;
  };
  
  /**
   * Generates the HTML snippet for the slide show.
   */
  PhotoGalleryComponent.prototype.slideShowHTML = function( index ) {
    var html = "",
        headerText = ( index + 1 ) + " of " + this.data.length;
    
    html = "<section class='page slideshow-page'>" +
            "<div class='slideshow-container'>" +
              this.imageWrapperHTML( { "index": (index - 1) } ) +
              this.imageWrapperHTML( { "index": index, "active": "active" } ) +
              this.imageWrapperHTML( { "index": (index + 1) } ) +
            "</div>" +
            "<div class='overlay'>" +
              this.headerHTML( { "title": headerText, "class": "", "backButton": true } ) +
              "<div class='description'>" +
                "<p class='descriptionTextColor" + this.id + "'>" + bc.utils.stripTags( this.data[index].media_description ) + "</p>" +
              "</div>" +
             "</div>" +
            "</section>";
            
    return html;
  };
  
  /**
   * Generates the HTML snippet for the image wrapper.
   */
  PhotoGalleryComponent.prototype.imageWrapperHTML = function( options ) {
    var settings = { "index": 0, "active": "" };
    $.extend( settings, options );
    return "<div id='" + ( settings.index ) + "_wrapper' data-bc-index='" + settings.index + "' class='image-wrapper sliderBackgroundColor" + this.id + " " + settings.active + "'></div>";
  };
  
  /**
   * Calculates the width of thumbnail to fit within the width of the device.
   * @param width The width of the viewport.
   */
  PhotoGalleryComponent.prototype.calculateWidthOfThumbnail = function( width ) {
    var thumbsPerRow = ( this.settings.thumbnailsPerRow !== undefined ) ? this.settings.thumbnailsPerRow.value : DEFAULT_NUMBER_OF_THUMBS_PER_ROW;
    width = width || bc.ui.width();
    
    return ( width - ( thumbsPerRow * 2 * PADDING_BETWEEN_THUMBNAILS) ) / thumbsPerRow;
  };
  
  /**
   * Calculates the height of the thumbnail.
   * @param width The width of the thumbnail.
   */
   PhotoGalleryComponent.prototype.calculateHeightOfThumbnail = function( width ) {
     //Defaulting to one for the aspect ratio.
     return ( this.settings.thumbnailAspectRatio !== undefined && this.settings.thumbnailAspectRatio.value !== undefined ) ? width * this.settings.thumbnailAspectRatio.value : 1;
   }
  
  /**
   * @private
   */
  PhotoGalleryComponent.prototype.setPrivateVariables = function( options ) {
    for( var prop in options ) {
      if( typeof options[prop] === "string" ) {
        eval( prop + " = '" + options[prop] + "'");
      } else {
        eval( prop + " = " + options[prop] );
      }
    }
  };
  
  return PhotoGalleryComponent; 

})( bc.lib.jQuery );