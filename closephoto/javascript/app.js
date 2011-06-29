var app = {};

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
        html = html.replace(m, data[m.substr(2, m.length-4)] || "???");
    }

    return html;
}

// displays a spinner/progress indicator with a message
app.showProgress = function(status) {
	app.spinner.show();	
	// does nothing at the moment
}

app.hideProgress = function() {
	app.spinner.hide();
}

app.getPhotos = function(callback) {
	var fetchPhotos = function(location) {
		var url = 'http://picasaweb.google.com/data/feed/api/all?l=' + location + '&max-results=100&alt=json&fields=entry(media:group)';
        
		app.showProgress('Finding images...');
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
		        if (geo_data.address.properties.city) {
		          location +=  geo_data.address.properties.city;
					bc.core.cache('location', location);
		        }

				fetchPhotos(location);
		      }
		    });
		}, 
		function( data ) { bc.utils.warn( data.errorCode ); });
	}
}

$(bc).bind("init", function () {
	// Allow auto-rotation of this page
	bc.device.setAutoRotateDirections(["all"]);

	app.spinner = $(bc.ui.spinner()).hide().appendTo($("body"));
});

