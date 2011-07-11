var app = {};

/* extensions to the bc api */
// TODO add to bc.ui?
app.registerTouchState = function (elems, delayMillis, className) {
    var timeout;

    className = className || "touched";

    $("body").bind("touchmove touchcancel", function (evt) {
        clearTimeout(timeout);
        elems.removeClass(className);
    });

    elems.bind("touchstart", function (evt) {
        var elem = $(this);
        timeout = setTimeout(function () {
            elem.addClass(className);
        }, delayMillis || 10);
    });

    elems.bind("touchend", function (evt) {
        clearTimeout(timeout);
        elems.removeClass(className);
    });
}

// TODO add to bc.utils?
app.markup = function (html, data) {
    var m, match = html.match(data instanceof Array ? /{{\d+}}/g : /{{\w+}}/g);

    for (var i in match) {
        m = match[i];
        var value = data[m.substr(2, m.length-4)];
        html = html.replace(m, (typeof value == 'undefined') ? "???" : value);
    }

    return html;
}

$(bc).bind("init", function () {
	var wrappedFetch = bc.device.fetchContentsOfURL;

	// native call does not support query parameters
	bc.device.fetchContentsOfURL = function(url, success, error) {
		// note: start chrome with --disable-web-security to disable cross-domain
		$.get(url, function(json) {
			// for compatibility with the api we'll convert to a string
			success(JSON.stringify(json));
		}).error(function() { error(); });
	};

	// non-native improvements
	if (bc.device.isNative()) {
		// workaround for the workbench not supporting '&'' in the URL
		// bc.device.fetchContentsOfURL = function(url, success, error) {
		// 	url = url.replace('&', escape('&'));
		// 	wrappedFetch(url, success, error);
		// };
	} else {

		bc.device.getLocation = function(success, error) {
			success({"latitude":'42.330454', "longitude":'-71.193073'});
		};

		bc.device.alert = function(message, success, error) { alert(message); };

		bc.device.setAutoRotateDirections = function( directions, successCallback, errorCallback ) {};
	}
});



/* custom app stuff */

// displays a spinner/progress indicator with a message
app.showProgress = function(status) {
	$('#status').html(status);
	app.spinner.show();
	// does nothing at the moment
}

app.hideProgress = function() {
	app.spinner.hide();
}

/** Loads photos and calles the given callback with the json data. */
app.getPhotos = function(callback) {
	var fetchPhotos = function(location) {
		// location can be empty 
		if (!bc.device.isNative() && location == '') location = '11 Cypress St Newton, MA';

		var url = 'http://picasaweb.google.com/data/feed/api/all?max-results=100&alt=json&l=' + escape(location);
		// url += '&fields=entry(media:group)';
        
        // bc.device.alert(location);
		app.showProgress('Finding images near you...');
        bc.device.fetchContentsOfURL(url, 
      		function(data) {
      			// bc.device.alert(data);
				app.hideProgress();
      			callback(data);
      		},
      		function(data) { bc.utils.warn( data.errorCode ); }
      	);
	};
	
	// get the location only if it's not already cached
	var location = bc.core.cache('location');
	if (location) {
		fetchPhotos(location);
	} else {
		app.showProgress('Finding your location...');
		
		var url,
	      client = new simplegeo.ContextClient('pAD76PYvLJajPvDfWKyHR8QRYBXUWZan');

		bc.device.getLocation(function (data) {
		  var lat = data.latitude,
		      lon = data.longitude,
		      location = '',
		      address, city, state;

		    // Load geo data
		    client.getContext(lat, lon, function(err, geo_data) {
		      if (err) {
		        bc.device.alert("Oops! " + err);
		      } else {
		      	// for(var prop in geo_data.address.properties)
		      	// 	bc.device.alert(prop + ' ' + geo_data.address.properties[prop]);
		        if (geo_data.address) {
		        	address = geo_data.address.properties.address;
		        	city = geo_data.address.properties.city;
		        	state = geo_data.address.properties.province;
		        	// note: 'distance' provides floating point distance
		        	location = (address ? address + ' ' : ' ') + 
		        		(city ? city : '') +
		        		(state ? ', ' + state : '');
		        }

				bc.core.cache('location', location);
				fetchPhotos(location);
		      }
		    });
		}, 
		function( data ) { bc.utils.warn( data.errorCode ); });
	}
}

/** Recenters the detail image. */
app.recenterImage = function() {
	var w = bc.ui.width(), h = bc.ui.height();
	var image = $(app.getCurrentThumb());

	// TODO if the lower-size is big enough for display on the detail use that instead as it's probably a smaller filesize by a big margin

	var imageHeight = image.data('largeHeight'),
		imageWidth = image.data('largeWidth');

	var ratio = imageHeight / imageWidth;
	// console.log([w, h, imageWidth, imageHeight, ratio]);

	if (ratio >= 1 && h / ratio <= w) {
		imageHeight = h;
		imageWidth = imageHeight / ratio;
	} else {
		imageWidth = w;
		imageHeight = imageWidth * ratio;
	}

	$('#largeImageWrapper').css('width', w).css('height', h);

	$('#largeImage')
		.css('width', imageWidth)
		.css('height', imageHeight)
		.css('margin-left', (w - imageWidth) / 2)
		.css('margin-top', (h - imageHeight) / 2);
};

app.recenterGallery = function() {
	// in the gallery adjust the margin so that the images are centered
	var w = bc.ui.width();
	var margin = (w - parseInt(w / app.thumbSize) * app.thumbSize) / 2;
	$('#photos').css('margin-left', margin);
};

/** Handles when an image is tapped to display the details. */
app.displayDetail = function(image) {
	var title, subTitle, thirdTitle, thumbnail, date, preload;

	image = $(image);
	app.current = parseInt(image.attr('data-index'));

	// note: image is a div, not an img

	// TODO when loading an image, precache both the previous and next image AFTER the current image
	// TODO get the target and set the source
	app.showProgress('Loading image');
	$('#largeImage').hide().attr('src', image.attr('data-full'));

	app.recenterImage();

	// set up the image info
	title = image.data('title');
	subTitle = 'by ' + image.data('author');
	
	sizeType = image.data('fullWidth') + 'x' + image.data('fullHeight') + ' (' + image.data('imageType') + ')';
	date = new Date(parseInt(image.data('timestamp')));
	thirdTitle = date.toString();

	thumbnail = image.data('authorThumbnail');

	$('#imageInfo h1').html(title);
	$('#imageInfo h2').html(subTitle);
	$('#imageInfo h3').html(thirdTitle);

	if (thumbnail)
		$('#imageInfo .thumbnail').html(app.markup('<img src="{{0}}" />', [thumbnail])).show();
	else
		$('#imageInfo .thumbnail').hide();

	$('#imageInfo .minimap').html('');
	if (image.data('location')) {
		$('#imageInfo .minimap').html(app.markup(
			'<img src="http://maps.google.com/maps/api/staticmap?size=100x100&center={{0}}&maptype=roadmap&sensor=true&markers={{1}}" />', [
				escape(bc.core.cache('location')),
				escape('size:small|label:A|' + image.data('location').replace(' ', ','))
			]));
	}

	// BCFIXME current page should not be an array
	if (bc.ui.currentPage[0].id != 'detail')
		bc.ui.forwardPage('#detail');

	// preload the 2 neighboring images
	preload = function(i) {
		var thumb = app.getThumb(i);
		if (!thumb) return;
		$('<img style="display: none;" />').attr('src', $(thumb).attr('data-full'));
	};

	preload(app.current - 1);
	preload(app.current + 1);
}

app.getThumb = function(i) {
	if (i < 0 || i >= app.imageCount) return null;
	return $('#photos .thumb:eq(' + i + ')').get(0);
};

app.getCurrentThumb = function() {
	return app.getThumb(app.current);
};

app.displayImage = function(delta, direction) {
	var i = app.current + delta;
	if (i < 0 || i >= app.imageCount) return;
	app.current = i;

	var copy, left;

	// make a copy that we can animate
	if (app.current) {
		copy = $('#largeImageWrapper').clone();
		copy.attr('id', 'largeImageWrapperClone');
		$('#largeImage', copy).attr('id', 'largeImageClone');
		copy.insertAfter('#largeImageWrapper');
	}

	app.displayDetail( app.getCurrentThumb() );

	// slide the other one out if there is one
	if (copy) {
		// left = $('#largeImageWrapperClone').css('width') * -1;
		left = bc.ui.width() * 1.5 * delta;
		// alert($('#largeImageWrapperClone').css('width'));
		copy.animate(
			{'left':left}, 
			800, 
			'swing',
			function() { copy.remove(); }
		);
	}
}
 
app.nextImage = function() { app.displayImage(1); }

app.prevImage = function() { app.displayImage(-1); }

$(bc).bind("init", function () {
	// Allow auto-rotation of this page
	bc.device.setAutoRotateDirections(["all"]);

	app.spinner = $('<div id="spinnerContainer"><span class="flower" /></div>').hide().appendTo($("body"));
	app.spinner.append('<span id="status"></span>');

	var template = '<div class="thumb" data-large="{{3}}" data-full="{{4}}" data-index="{{5}}" style="height:{{0}}px; width:{{1}}px; background-image: url(\'{{2}}\')"></div>';
	
	app.getPhotos(function(data) {
		var json = JSON.parse(data);
		// console.log(json);
		var entries = json.feed.entry;
		// var images = [];
		var i, e, image, d;
		var entry, image, thumb;
	

		var maxWidth=0, maxHeight=0;
		var minWidth=1000, minHeight=100;

		var thumbIndex = 0;

		for(i=0; i<entries.length; i++) {
			entry = entries[i];
			image = entry['media$group'];
			thumb = image['media$thumbnail'][thumbIndex];

			maxWidth = Math.max(maxWidth, thumb.width);
			maxHeight = Math.max(maxHeight, thumb.height);
			minWidth = Math.min(minWidth, thumb.width);
			minHeight = Math.min(minHeight, thumb.height);
		}

		d = Math.min(minWidth, minHeight);
		app.thumbSize = d;
		app.imageCount = entries.length;

		app.recenterGallery();

		for(i=0; i<entries.length; i++) {
			entry = entries[i];
			image = entry['media$group'];

			// REFACTOR use $.data rather than data attributes for all of them
			$('#photos').append(app.markup(template, [
				d, d, 
				image.media$thumbnail[thumbIndex].url, 
				image.media$thumbnail[2].url, 
				image.media$content[thumbIndex].url, 
				i]));

			$('#photos .thumb:last')
				.data('largeWidth', image.media$content[thumbIndex].width)
				.data('largeHeight', image.media$content[thumbIndex].height)
				.data('fullWidth', image.media$content[0].width)
				.data('fullHeight', image.media$content[0].height)
				.data('imageType', image.media$content[0].type)
				.data('fullUrl', image.media$content[0].url)
				.data('author', image.media$credit[0].$t)
				.data('title', image.media$title.$t)
				.data('authorThumbnail', entry.author[0].gphoto$thumbnail.$t)
				.data('authorUrl', entry.author[0].uri.$t)
				.data('timestamp', entry.gphoto$timestamp.$t)
				.data('location', entry.georss$where ? entry.georss$where.gml$Point.gml$pos.$t : null);
		}

		$('#photos .thumb').bind('tap', function(evt) {
			app.displayDetail(evt.target);
		});
	});

	$('#largeImage').load(function(evt) {
		app.hideProgress();
		$('#largeImage').show();
	});

	$('#largeImage').bind('tap', function(evt) {
		$('#imageInfo').slideToggle();
	});
	
	$('#detail').bind('swipe', function(evt, direction) {
		if (direction == 'swipeRight')
			app.nextImage();
		else if (direction == 'swipeLeft')
			app.prevImage();
	});

	$(bc).bind("vieworientationchange", function (evt, data) {
		app.recenterImage();
		app.recenterGallery();
	});

});

