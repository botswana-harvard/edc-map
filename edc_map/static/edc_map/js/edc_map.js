/*
 edc_map.js
*/

var map, marker, locationByID = {}, currentObject, geocoder;
var landpoints = new Array();
var x = 0;

var pointArray = [
{% for lat, lon, label, icon in locations %}
  ["{{ label }}", {{ lat }}, {{ lon }}, "{{ icon }}", x+1],
{% endfor %}
];

{% for place, lat, lon in landmarks %}
  landpoints.push(["{{ place }}", {{ lat }}, {{ lon }}, x+1]);
{% endfor %}


//adding information to markers when clicked
function bindInfoWindow(marker, map, infoWindow, ItemInfor) {
        google.maps.event.addListener(marker, 'click', function() {
        infoWindow.setContent(ItemInfor);
        infoWindow.open(map, marker);
    });
}


//function called Initialize the map when loading the browser
function initialize() {
    
    //create map object
    map = new google.maps.Map(document.getElementById('googleMap'), {
        zoom: 14,
        center: new google.maps.LatLng({{ mapper.center_lat }}, {{ mapper.center_lon }}),
        mapTypeId: google.maps.MapTypeId.SATELLITE
    });
    geocoder = new google.maps.Geocoder();
    
    var infowindow = new google.maps.InfoWindow();

    var marker, i;

    for (i = 0; i < pointArray.length; i++) {  
      marker = new google.maps.Marker({
        position: new google.maps.LatLng(pointArray[i][1], pointArray[i][2]),
        map: map,
        icon: '{{ STATIC_URL }}/img/blu-circle.png',
      });

      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infowindow.setContent(pointArray[i][0]);
          infowindow.open(map, marker);
        }
      })(marker, i));
    }
    
    setLandMarks(map, landpoints);
    
   /*Create polygon by clicking on the map or drawing by hand on the map
    *
    */
   //Initialise a line with its properties
   var line = new google.maps.Polyline({
                strokeColor: '#0000FF',
                strokeOpacity: 0.5,
                strokeWeight: 5,
                });
                line.setMap(map);

    //create a polygon object
    var polygon = new google.maps.Polygon({
        strokeColor: '#0000FF',
        strokeOpacity: 0.5,
        strokeWeight: 5,
        fillColor: '#FF0000',
        fillOpacity: 0.2
    });
        polygon.setMap(map);

    var handlers = [],
        markers = [];

    var bind_handler = function(target, event, handler) {
        var id = google.maps.event.addListener(target, event, handler);
        handlers.push(id);
        return id;
    }

    var unbind_all = function() {
        while (handlers.length > 0) {
            google.maps.event.removeListener(handlers.pop());
        }
    }
    
    //Clear the polygon on the map
    var clear = function() {

        $('#save_map_selection').attr('disabled', true);

        unbind_all();

        var path = line.getPath();
        while (path.length > 0) {
            path.pop();
        }
        var poly_path = polygon.getPath();
        while (poly_path.length > 0) {
            poly_path.pop();
        }
        while (markers.length > 0) {
            marker = markers.pop();
            marker.setMap(null);
            marker = null;
        }

    };

    //add a marker to the polygon line
    var load = function() {

        var path = polygon.getPath()
        for (i in mapdata) {
            coords = mapdata[i];
            point = new google.maps.LatLng(coords.lat, coords.lng);
            path.push(point);
            marker = new google.maps.Marker({
                position: point,
                draggable: true,
                map: map
            });
            markers.push(marker);
        }

    };

    //draw a polygon function
    var draw_mode = function() {

        var path = line.getPath(),
            firstmarker = null,
            newpoint = null;

        //have a marker (and the path) follow the mouse
        bind_handler(map, 'mousemove', function(event) {
            if (newpoint) path.pop();
            newpoint = event.latLng;
            path.push(newpoint);
        });

        //right click to add a point. add this handler to the line as well
        var add_point = function(event) {
            if (newpoint) path.pop();
            path.push(event.latLng);
            newpoint = null;

            var marker = new google.maps.Marker({
                position: event.latLng,
                map: map
            });
            markers.push(marker);

            if (!firstmarker) {
                firstmarker = marker;
    
                //right click on the first marker to close the loop
                bind_handler(firstmarker, 'rightclick', function(event) {
                    if (newpoint) path.pop();
                    if (path.length < 3) return;
        
                    var poly_path = polygon.getPath(),
                        markers_r = [];
        
                    while (path.length > 0) {
                        poly_path.push(path.pop());
                        markers_r.push(markers.pop());
                    }
                    markers = markers_r;
        
                    edit_mode();
                });
    
                //snap the line to the first marker if you hover over it
                bind_handler(firstmarker, 'mouseover', function(event) {
                    if (newpoint) path.pop();
                    if (path.length < 3) return;
        
                    newpoint = firstmarker.getPosition();
                    path.push(newpoint);
                });
    
            }
        };
        bind_handler(map, 'rightclick', add_point);
        bind_handler(line, 'rightclick', add_point);
        
        
        /*
        Check if the exist a point in a polygon
        *
        */

        // Poygon getBounds extension - google-maps-extensions
        if (!google.maps.Polygon.prototype.getBounds) { 
          google.maps.Polygon.prototype.getBounds = function(latLng) {
            var bounds = new google.maps.LatLngBounds();
            var poly_path = polygon.getPaths();
            var path;

            for (var p = 0; p < poly_path.getLength(); p++) {
              path = poly_path.getAt(p);
              for (var i = 0; i < path.getLength(); i++) {
                bounds.extend(path.getAt(i));
              }
            }
            
            return bounds;
          }
        }

        // Polygon containsLatLng - method to determine if a latLng is within a polygon
        google.maps.Polygon.prototype.containsLatLng = function(latLng) {
          // Exclude points outside of bounds as there is no way they are in the poly
          var bounds = this.getBounds();

          if(bounds != null && !bounds.contains(latLng)) {
            return false;
          }

          /* Raycast point in polygon method
           *  test how many times a ray, starting from the point and going ANY fixed direction, intersects the edges of the polygon. 
           *  If the point in question is not on the boundary of the polygon, 
           *  the number of intersections is an even number if the point is outside, and it is odd if inside.
           */
          var inPoly = false;
          

          var numPaths = polygon.getPaths().getLength();
          for(var p = 0; p < numPaths; p++) {
            var path = this.getPaths().getAt(p);
            var numPoints = path.getLength();
            var j = numPoints-1;

            for(var i=0; i < numPoints; i++) {
              var vertex1 = path.getAt(i);
              var vertex2 = path.getAt(j);

              if (vertex1.lng() < latLng.lng() && vertex2.lng() >= latLng.lng() || vertex2.lng() < latLng.lng() && vertex1.lng() >= latLng.lng()) {
                if (vertex1.lat() + (latLng.lng() - vertex1.lng()) / (vertex2.lng() - vertex1.lng()) * (vertex2.lat() - vertex1.lat()) < latLng.lat()) {
                  inPoly = !inPoly;
                }
              }

              j = i;
            }
          }

          return inPoly;
        }

    };
    
    /*
     * Edit the polygon bonds, drags a line, moves a marker and removes a marker on the polygon line
     */
    var edit_mode = function() {

        unbind_all();

        var path = polygon.getPath();

        $.each(markers, function(i, marker) {
            marker.setDraggable(true);

            //drag
            bind_handler(marker, 'drag', function() {
                path.setAt(i, marker.getPosition());
            });
    
            //right click on a point to remove
            bind_handler(marker, 'rightclick', function() {
                if(path.length <= 3) return;
    
                path.removeAt(i);
                markers.splice(i, 0);
                marker.setMap(null);
    
                edit_mode();
            });
        });

        //right click between two points to add another point
        var add_point_between = function(event) {
            var newpoint = event.latLng;

            var is_between = function (newpoint, point_a, point_b) {
                //default sort() doesn't work on negative numbers, I guess
                var lat = newpoint.lat(),
                    lng = newpoint.lng(),
                    lats = [point_a.lat(), point_b.lat()].sort(function(a, b) { return a - b; });
                    lngs = [point_a.lng(), point_b.lng()].sort(function(a, b) { return a - b; });
        
                if(lat < lats[0] || lat > lats[1] || lng < lngs[0] || lng > lngs[1]) return false;
    
                //TODO check slope
    
                return true;
            }

            var point_a = path.getAt(path.length-1),
                point_b,
                index = null;
    
            path.forEach(function(point, i) {
                if(index !== null) return;
                point_b = point;
                if(is_between(newpoint, point_a, point_b)) index = i;
                point_a = point;
            });

            if(index === null) return;

            //insert the point between the two points
            path.insertAt(index, event.latLng);
            new_marker = new google.maps.Marker({
                position: newpoint,
                draggable: true,
                map: map
            });
            markers.splice(index, 0, new_marker)

            edit_mode();
        };
        bind_handler(map, 'rightclick', add_point_between);
        bind_handler(polygon, 'rightclick', add_point_between);

        $('#save_map_selection').removeAttr('disabled');

    }

    var mapdata = null; //TODO
    if (!mapdata) {
        draw_mode();
    } else {
        load();
        edit_mode();
        $('#revert_map').removeAttr('disabled');
    }

    /*
     * Save polygon, call the 'polygon.containsLatLon' function then send identifiers within the polygon
     *  to a 'save_map_selection' view in views.py
     */
    $('#save_map_selection').click(function() {
        var path = polygon.getPath(),
            new_mapdata = [];

        path.forEach(function(point, i) {
            new_mapdata.push({lat: point.lat(), lng: point.lng()});
        });
        mapdata = new_mapdata;
        //TODO save mapdata permanently

        var arr = new Array();
        var arrr = new Array();
        
        //var poly_points = polygon.getPath().getArray();
        for (i = 0; i < pointArray.length; i++) {
        	var point = new google.maps.LatLng(pointArray[i][1], pointArray[i][2]);
            if (polygon.containsLatLng(point)) {
            	arr.push(pointArray[i][0]);
            	}
            };
        var selectedSection = document.getElementById( "section-id" ).value;
        var selectedSubSection = document.getElementById( "sub-section-id" ).value;
        window.location.href = "{% url 'sectioning_view_url' %}?identifiers=" + arr + "&section=" + selectedSection + "&sub_section=" + selectedSubSection;
        
    });
    

	$('#revert_map').removeAttr('disabled');
	//go back to the saved polygon
	$('#revert_map').click(function() {
		clear();
		load();
		edit_mode();
	});

	//clear the polygon
	$('#clear_map').click(function() {
		clear();
		draw_mode();
	});    
        
} //initialze

function setLandMarks(map, locations) {
	 // Add markers to the map
	 
	 // Marker sizes are expressed as a Size of X,Y
	 // where the origin of the image (0,0) is located
	 // in the top left of the image.
	 
	 // Origins, anchor positions and coordinates of the marker
	 // increase in the X direction to the right and in
	 // the Y direction down.
	 var image = new google.maps.MarkerImage('http://maps.google.com/mapfiles/arrow.png', // This marker is 20 pixels wide by 32 pixels tall.
	 new google.maps.Size(35, 40), // The origin for this image is 0,0.
	 new google.maps.Point(0, 0), // The anchor for this image is the base of the flagpole at 0,32.
	 new google.maps.Point(0, 32));
	 var shadow = new google.maps.MarkerImage('http://goo.gl/g1PTn', // The shadow image is larger in the horizontal dimension
	 // while the position and offset are the same as for the main image.
	 new google.maps.Size(37, 32), new google.maps.Point(0, 0), new google.maps.Point(0, 32));
	 // Shapes define the clickable region of the icon.
	 // The type defines an HTML &lt;area&gt; element 'poly' which
	 // traces out a polygon as a series of X,Y points. The final
	 // coordinate closes the poly by connecting to the first
	 // coordinate.
	 var shape = {
	   coord: [1, 1, 1, 20, 18, 20, 18, 1],
	   type: 'poly'
	 };
	 for (var i = 0; i < locations.length; i++) {
	   var beach = locations[i];
	   var myLatLng = new google.maps.LatLng(beach[1], beach[2]);
	   var marker = new google.maps.Marker({
	     position: myLatLng,
	     map: map,
	     shadow: shadow,
	     icon: image,
	     shape: shape,
	     title: beach[0],
	     zIndex: beach[3]
	   });
	   
	   var boxText = document.createElement("div");
	       boxText.style.cssText = "border: 0px solid black; margin-top: 8px; background: white; padding: 3px;";
	       boxText.innerHTML = beach[0];
	               
	   var myOptions = {
	            content: boxText
	           ,disableAutoPan: false
	           ,maxWidth: 0
	           ,pixelOffset: new google.maps.Size(-140, 0)
	           ,zIndex: null
	           ,boxStyle: { 
	             background: "url('tipbox.gif') no-repeat"
	             ,opacity: 0.75
	             ,width: "280px"
	            }
	           ,closeBoxMargin: "10px 2px 2px 2px"
	           ,closeBoxURL: "http://www.google.com/intl/en_us/mapfiles/close.gif"
	           ,infoBoxClearance: new google.maps.Size(1, 1)
	           ,isHidden: false
	           ,pane: "floatPane"
	           ,enableEventPropagation: false
	   };
	   var ib = new InfoBox(myOptions);
	   ib.open(map, marker);
	}
}

function test(){
	alert('testing');
}

function setLandMarks(map, locations) {
	 // Add markers to the map
	 
	 // Marker sizes are expressed as a Size of X,Y
	 // where the origin of the image (0,0) is located
	 // in the top left of the image.
	 
	 // Origins, anchor positions and coordinates of the marker
	 // increase in the X direction to the right and in
	 // the Y direction down.
	 var image = new google.maps.MarkerImage('http://maps.google.com/mapfiles/arrow.png', // This marker is 20 pixels wide by 32 pixels tall.
	 new google.maps.Size(35, 40), // The origin for this image is 0,0.
	 new google.maps.Point(0, 0), // The anchor for this image is the base of the flagpole at 0,32.
	 new google.maps.Point(0, 32));
	 var shadow = new google.maps.MarkerImage('http://goo.gl/g1PTn', // The shadow image is larger in the horizontal dimension
	 // while the position and offset are the same as for the main image.
	 new google.maps.Size(37, 32), new google.maps.Point(0, 0), new google.maps.Point(0, 32));
	 // Shapes define the clickable region of the icon.
	 // The type defines an HTML &lt;area&gt; element 'poly' which
	 // traces out a polygon as a series of X,Y points. The final
	 // coordinate closes the poly by connecting to the first
	 // coordinate.
	 var shape = {
	   coord: [1, 1, 1, 20, 18, 20, 18, 1],
	   type: 'poly'
	 };
	 for (var i = 0; i < locations.length; i++) {
	   var beach = locations[i];
	   var myLatLng = new google.maps.LatLng(beach[1], beach[2]);
	   var marker = new google.maps.Marker({
	     position: myLatLng,
	     map: map,
	     shadow: shadow,
	     icon: image,
	     shape: shape,
	     title: beach[0],
	     zIndex: beach[3]
	   });
	   
	   var boxText = document.createElement("div");
	       boxText.style.cssText = "border: 0px solid black; margin-top: 8px; background: white; padding: 3px;";
	       boxText.innerHTML = beach[0];
	               
	   var myOptions = {
	            content: boxText
	           ,disableAutoPan: false
	           ,maxWidth: 0
	           ,pixelOffset: new google.maps.Size(-140, 0)
	           ,zIndex: null
	           ,boxStyle: { 
	             background: "url('tipbox.gif') no-repeat"
	             ,opacity: 0.75
	             ,width: "280px"
	            }
	           ,closeBoxMargin: "10px 2px 2px 2px"
	           ,closeBoxURL: "http://www.google.com/intl/en_us/mapfiles/close.gif"
	           ,infoBoxClearance: new google.maps.Size(1, 1)
	           ,isHidden: false
	           ,pane: "floatPane"
	           ,enableEventPropagation: false
	   };
	   var ib = new InfoBox(myOptions);
	   ib.open(map, marker);
	}
}
