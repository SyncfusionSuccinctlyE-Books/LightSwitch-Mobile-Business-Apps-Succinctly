/// <reference path="JQuery/jquery-1.6.1.js" /> 
/// <reference path="JQueryMobile/jquery.mobile-1.0.js" /> 
/// <reference path="../Libraries/MsLs/msls-1.0.0.js" /> 
/// <reference path="http://ecn.dev.virtualearth.net/mapcontrol/mapcontrol.ashx?v=7.0" /> 

/*
Usage example
myapp.AddEditCustomer.HowDoIGetThere_execute = function (screen) {
    $("#addressMap").lightswitchBingMapsControl("getLocationOfUser", $("#directions"));
};
myapp.AddEditCustomer.Customer_render = function (element, contentItem) {
    var mapDiv = $("#addressMap");
    var directionsDiv = $("#directions");
    if (mapDiv.length > 0) {
        $(mapDiv).remove();
        $(directionsDiv.remove());
    }
 
    mapDiv = $("<div id='addressMap' class='msls-hauto msls-vauto' ></div>");
    $(mapDiv).appendTo($(element));
    directionsDiv = $("<div id='directions' class='msls-hauto msls-vauto' ></div>");
    directionsDiv.appendTo($(element));
 
    mapDiv.lightswitchBingMapsControl({
        street: contentItem.value.Street,
        city: contentItem.value.City,
        zipcode: contentItem.value.ZipCode,
        state: contentItem.value.Country,
        mapTypeId: Microsoft.Maps.MapTypeId.road,
        height: "470"
    });
};
*/

(function ($) {
    var _credentialsKey = "Ao75sYhQSfLgssT0QkO9n22xt0lgxzntrZ1xpCwLOC-kGhI584OYED3viFXLIWgC";

    // load the directions module only once per session 
    Microsoft.Maps.loadModule('Microsoft.Maps.Directions');

    $.widget("msls.lightswitchBingMapsControl", {
        options: {
            street: null,
            city: null,
            state: null,
            zipcode: null,
            mapType: Microsoft.Maps.MapTypeId.road,
            zoom: 14,
            width: 600,
            height: 500
        },

        _create: function () {
        },

        _init: function () {
            this.createMap();
        },

        destroy: function () {
            this._destroyBingMapsControl();
        },

        _createMapFromCoordinates: function (coordinates) {
            this.htmlMapElement = this.element[0];

            // if coordinates were passed in, then use them 
            if ((coordinates) && (coordinates.length >= 2)) {
                this.destinationLocation = new Microsoft.Maps.Location(coordinates[0], coordinates[1]);

                // create a map centered on the location 
                this.map = new Microsoft.Maps.Map(this.htmlMapElement,
                                   {
                                       credentials: _credentialsKey,
                                       center: this.destinationLocation,
                                       width: this.options.width,
                                       height: this.options.height,
                                       mapTypeId: this.options.mapType,
                                       zoom: this.options.zoom
                                   });

                // add a pushpin using the center of the map, which is based 
                // on the given coordinates 
                var pushpin = new Microsoft.Maps.Pushpin(this.map.getCenter());

                this.map.entities.clear();
                this.map.entities.push(pushpin);
            }
            else {
                // create a map without coordinates 
                this.map = new Microsoft.Maps.Map(this.htmlMapElement,
                                   {
                                       credentials: _credentialsKey,
                                       width: this.options.width,
                                       height: this.options.height,
                                       zoom: 18
                                   });
            }

            this.element.find("div").addClass("mapDiv");
        },

        createMap: function () {
            var widgetInstance = this;

            // construct a request to the REST geocode service using the widget's 
            // optional parameters 
            var geocodeRequest = "http://dev.virtualearth.net/REST/v1/Locations" +
                                 "?addressLine=" + this.options.street +
                                 "&locality=" + this.options.city +
                                 "&adminDistrict=" + this.options.state +
                                 "&postalCode=" + this.options.zipcode +
                                 "&key=" + _credentialsKey;

            // make the ajax request to the Bing Maps geocode REST service 
            $.ajax({
                url: geocodeRequest,
                dataType: 'jsonp',
                async: false,
                jsonp: 'jsonp',
                error: function (XMLHttpRequest, textStatus, errorThrown) {
                    alert(textStatus + " " + errorThrown);
                },
                success: function (result) {
                    var coordinates = null;

                    if (result && result.resourceSets && (result.resourceSets.length > 0) &&
                        result.resourceSets[0].resources && (result.resourceSets[0].resources.length > 0)) {
                        // create a location based on the geocoded coordinates 
                        coordinates = result.resourceSets[0].resources[0].point.coordinates;
                    }
                    widgetInstance._createMapFromCoordinates(coordinates);
                }
            });
        },

        _handleError: function (error) {
            alert("An error occurred.  " + error.message);
        },

        getLocationOfUser: function (htmlDirectionsElement) {
            if (this.map) {
                var me = this;
                // use the HTML element passed in to display the text directions, 
                // a null value means that text directions will not be displayed 
                this.htmlDirectionsElement = htmlDirectionsElement;

                // get the user's current location using geocoding service calls 
                var geoLocationProvider = new Microsoft.Maps.GeoLocationProvider(this.map);
                geoLocationProvider.getCurrentPosition(
                {
                    enableHighAccuracy: true,
                    updateMapView: false,
                    successCallback: function (currentLocation) {
                        // this method is used as a callback for getting the user's current location 
                        // via Bing's REST Geocoding service 
                        var originLocation = currentLocation.center.latitude + ", " + currentLocation.center.longitude;
                        // display the directions on the Bing Maps cotnrol from the user's current location 
                        // to the destination address 
                        try {
                            // initialize the DirectionsManager 
                            var directionsManager = new Microsoft.Maps.Directions.DirectionsManager(me.map);

                            // clear any pushpins 
                            me.map.entities.clear();

                            if (htmlDirectionsElement != null) {
                                // empty previous directions 
                                $(htmlDirectionsElement).empty();
                            }

                            // create start and end waypoints 
                            var startWaypoint = new Microsoft.Maps.Directions.Waypoint({ address: originLocation });
                            var destinationLocation = me.destinationLocation.latitude + ", " + me.destinationLocation.longitude;
                            var endWaypoint = new Microsoft.Maps.Directions.Waypoint({ address: destinationLocation });

                            directionsManager.addWaypoint(startWaypoint);
                            directionsManager.addWaypoint(endWaypoint);

                            if ((htmlDirectionsElement != null) && (originLocation != destinationLocation)) {
                                // set the id of the div to use to display the directions 
                                directionsManager.setRenderOptions({ itineraryContainer: htmlDirectionsElement });
                            }

                            // specify a handler for when an error occurs 
                            Microsoft.Maps.Events.addHandler(directionsManager, "directionsError", this._handleError);

                            // calculate directions, which displays a route on the map 
                            directionsManager.calculateDirections();
                        }
                        catch (ex) {
                            _handleError(ex);
                        }
                    }
                });
            }
        },


        _destroyBingMapsControl: function () {
            if (this.map != null) {
                this.map.dispose();
                this.map = null;
            }
        }
    });
}(jQuery));
