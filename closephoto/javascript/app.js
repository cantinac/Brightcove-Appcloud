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

	// non-native improvements
	if (bc.device.isNative()) return;


	bc.device.fetchContentsOfURL = function(url, success, error) {
		// note: start chrome with --disable-web-security to disable cross-domain
		$.get(url, function(json) {
			// for compatibility with the api we'll convert to a string
			success(JSON.stringify(json));
		});
	};

	bc.device.getLocation = function(success, error) {
		success({"latitude":'70.35', "longitude":'40.34'});
	};

	bc.device.alert = alert;

	bc.device.setAutoRotateDirections = function( directions, successCallback, errorCallback ) {};


});



/* custom app stuff */

// displays a spinner/progress indicator with a message
app.showProgress = function(status) {
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
		if (!bc.device.isNative() && location == '') location = 'boston,ma';

		var url = 'http://picasaweb.google.com/data/feed/api/all?l=' + location + '&max-results=100&alt=json&fields=entry(media:group)';
        
		app.showProgress('Finding images near you...');
        bc.device.fetchContentsOfURL(url, 
      		function(xml) {
      			callback(xml);
				app.hideProgress();
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
		      location = '';

		    // Load geo data
		    client.getContext(lat, lon, function(err, geo_data) {
		      if (err) {
		        bc.device.alert("Oops! " + err);
		      } else {
		        if (geo_data.address && geo_data.address.properties.city) {
		          location +=  geo_data.address.properties.city;
		        }

				bc.core.cache('location', location);
				fetchPhotos(location);
		      }
		    });
		}, 
		function( data ) { bc.utils.warn( data.errorCode ); });
	}
}

/** Handles when an image is tapped to display the details. */
app.displayDetail = function(image) {
	// note: image is a div, not an img

	// TODO when loading an image, precache both the previous and next image AFTER the current image
	// TODO get the target and set the source
	var w = bc.ui.width(), h = bc.ui.height();
	app.showProgress('Loading image');
	$('#largeImage').hide().css('max-width', w).css('max-height', h).attr('src', $(image).attr('data-full'));
	$('#largeImage').load(function(evt) {
		app.hideProgress();
		$('#largeImage').show();
	});

	// BCFIXME current page should not be an array
	if (bc.ui.currentPage[0].id != 'detail')
		bc.ui.forwardPage('#detail');
	
	app.current = parseInt($(image).attr('data-index'));
}

app.displayImage = function(delta) {
	var i = app.current + delta;
	if (i < 0 || i >= app.imageCount) return;
	app.displayDetail( $('#photos .thumb:eq(' + i + ')').get(0) );
	app.current = i;
}
 
app.nextImage = function() { app.displayImage(1); }
app.prevImage = function() { app.displayImage(-1); }

$(bc).bind("init", function () {
	// Allow auto-rotation of this page
	bc.device.setAutoRotateDirections(["all"]);

	app.spinner = $(bc.ui.spinner()).hide().appendTo($("body"));

	var template = '<div class="thumb" data-large="{{3}}" data-full="{{4}}" data-index="{{5}}" style="height:{{0}}px; width:{{1}}px; background-image: url(\'{{2}}\')"></div>';
	
	app.getPhotos(function(data) {
		var json = JSON.parse(data);
		var entries = json.feed.entry;
		var images = [];
		var i;

		var maxWidth=0, maxHeight=0;
		var minWidth=1000, minHeight=100;

		for(i=0; i<entries.length; i++) {
			var entry = entries[i];
			var image = entry['media$group'];
			var thumb = image['media$thumbnail'][0];

			maxWidth = Math.max(maxWidth, thumb.width);
			maxHeight = Math.max(maxHeight, thumb.height);
			minWidth = Math.min(minWidth, thumb.width);
			minHeight = Math.min(minHeight, thumb.height);
			images[images.length] = image;
		}

		var d = Math.min(minWidth, minHeight);

		for(i=0; i<images.length; i++) {
			var image = images[i];
			$('#photos').append(app.markup(template, [d, d, image['media$thumbnail'][0].url, image['media$thumbnail'][2].url, image['media$content'][0].url, i ]));
		}

		$('#photos .thumb').bind('tap', function(evt) {
			app.displayDetail(evt.target);
		});

		app.imageCount = images.length;
	});
	
	$('#detail').bind('swipe', function(evt, direction) {
		if (direction == 'swipeRight')
			app.nextImage();
		else if (direction == 'swipeLeft')
			app.prevImage();
	});
});

