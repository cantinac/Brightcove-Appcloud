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

app.getPhotos = function(callback) {
	// TODO drastically limit the data that is returned for the photos
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
        }
        
		url = 'http://picasaweb.google.com/data/feed/api/all?l=' + location + '&max-results=100&alt=json&fields=entry(media:group)';
        
        bc.device.fetchContentsOfURL(url, 
      		function(xml) {
      			callback(xml);
      			app.spinner.hide();
      		},
      		function(data) { bc.utils.warn( data.errorCode ); }
      	);
      }
    });
	}, function( data ) {
    bc.utils.warn( data.errorCode );
  })
	
	app.spinner.show();	
}

$(bc).bind("init", function () {
	// Allow auto-rotation of this page
	bc.device.setAutoRotateDirections(["all"]);

	app.spinner = $(bc.ui.spinner()).hide().appendTo($("body"));
});

