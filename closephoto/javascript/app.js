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
	var location = 'cambridge,ma';	// TODO fetch based on location
	var url = 'http://picasaweb.google.com/data/feed/api/all?l=' + location + '&max-results=20&alt=json&fields=entry(media:group(media:thumbnail))';
	app.spinner.show();

	bc.device.fetchContentsOfURL(url, 
		function(xml) {
			callback(xml);
			app.spinner.hide();
		},
		function(data) { bc.utils.warn( data.errorCode ); }
	);	
}

