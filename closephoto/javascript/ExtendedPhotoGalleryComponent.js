/**
 * In this tutorial we will be extending the PhotoGalleryComponent in order to add a title below the
 * thumbnail image.  In order to do so we need to extend the PhotoGalleryComponent and then override the 
 * thumbnailGridHTML function to return the new HTML snippet.
 */
var ExtendedPhotoGalleryComponent = ( function( $, undefined ) {
  
  function ExtendedPhotoGalleryComponent( element ) {
    ExtendedPhotoGalleryComponent.superclass.constructor.call(this, element, "ExtendedPhotoGalleryComponent");
  }
  
  bc.core.extendClass( ExtendedPhotoGalleryComponent, PhotoGalleryComponent );
  
  /**
   * Override the thumbnailGridHTML method that exists on the PhotoGalleryComponent 
   * so that we can upate the HTML string to have titles underneath the thumbnail.
   */
  ExtendedPhotoGalleryComponent.prototype.thumbnailGridHTML = function() {
    var html = "",
        thumbnailsPerRow = this.settings.thumbnailsPerRow,
        imageWidth = this.calculateWidthOfThumbnail();
    
    html = "<section class='scroller gridBackgroundColor" + this.id +"'>" +
             "<div class='thumbnail-container'>";
        
    for( var i = 0, len = this.data.length; i < len; i++ ) {
      html += "<div class='thumbnail' data-bc-index='" + i + "'>" +
                "<img src='" + this.data[i].media_thumbnail_url + "' alt='thumb'  style='width: " + imageWidth + "px' />" +
                /* acex9b Here we are entering a new <p> to hold the title of the image */
                
              "</div>";
    }
    
    html +=   "<div class='clear'></div>" +
              "</div>" +
            "</section>";
            
    return html;
  };
  
  return ExtendedPhotoGalleryComponent; 

})( bc.lib.jQuery );