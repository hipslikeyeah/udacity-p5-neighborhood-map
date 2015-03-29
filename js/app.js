"use strict";

// *******************************
// *         DATA MODEL          *
// *******************************
var places = [
	{
		name: 'The Raines Law Room',
		address: '48 W 17th St, New York, NY 10011',
		lat: 40.738782,
		lng: -73.994566,
		info: 'Speakeasy Pouring Prohibition-Era Drinks',
		tags: ['drinking', 'nightlife', 'bars'],
	},
	{
		name: 'Apple Store',
		address: '767 5th Ave, New York, NY 10153',
		lat: 40.763738,
		lng: -73.972299,
		info: 'Retailer of Apple Products and Accessories',
		tags: ['shopping', 'technology']
	},
	{
		name: 'Big Gay Ice Cream Shop',
		address: '125 E 7th St, New York, NY 10009',
		lat: 40.726434,
		lng: -73.984075,
		info: 'Trendy Soft-Serve with Creative Flavors',
		tags: ['food']
	},
	{
		name: 'Dylan\'s Candy Bar',
		address: '1011 3rd Ave, New York, NY 10065',
		lat: 40.762234,
		lng: -73.965738,
		info: 'Two Floors of Sweet Treats',
		tags: ['kids', 'shopping', 'food']
	},
	{
		name: 'Serendipity 3',
		address: '225 E 60th St, New York, NY 10022',
		lat: 40.761887,
		lng:  -73.964858,
		info: 'Legendary Dessert Destination',
		tags: ['food']
	},
	{
		name: 'Northeast Kingdom',
		address: '18 Wyckoff Ave, Brooklyn, NY 11237',
		lat: 40.706360,
		lng: -73.922870,
		info: 'Farm-to-table New American Meals',
		tags: ['food']
	},
	{
		name: 'McGee\'s',
		address: '240 W 55th St, New York, NY 10019',
		lat: 40.764892,
		lng: -73.983084,
		info: 'Huge 3-Level Irish Pub, Inspiration for "How I Met Your Mother" Bar',
		tags: ['food', 'bars', 'drinking', 'nightlife']
	},
	{
		name: 'Doughnut Plant',
		address: '220 W 23rd St, New York, NY 10011',
		lat: 40.744380,
		lng: -73.996704,
		info: 'Handcrafted Donuts with Unique Flavors',
		tags: ['food']
	},
	// template for future places
	/*{
		name: '',
		address: '',
		lat: ,
		lng: ,
		info: '',
		tags: ['']
	}*/
];

// *******************************
// *         GOOGLE MAPS         *
// *******************************
var gMap = {
	map: {},
	infoWindow: new google.maps.InfoWindow(), // reusable info window
	options: {
		center: { lat: 40.74390243309498, lng: -73.9486100842285},
		zoom: 12
	},
	infoWindowContent: '<div class="info-window"><div class="window-title">%title%</div><div class="window-description">%description%</div></div>',
	init: function(vm) {
		gMap.map = new google.maps.Map(document.getElementById('map'), gMap.options);
		// shows markers depending on which loads faster - vm or google map
		if (vm.initialized && !vm.hasMarkers) vm.showMarkers();
	}
};

// *******************************
// *         PLACE OBJECT        *
// *******************************
var Place = function(data, parent) {
	// info from provided data model
	this.name = ko.observable(data.name);
	this.info = ko.observable(data.info);
	this.address = ko.observable(data.address);
	this.tags = ko.observableArray(data.tags);
	this.lat = ko.observable(data.lat);
	this.lng = ko.observable(data.lng);

	// if this place has extra info via ajax
	this.initialized = ko.observable(false);

	// google maps marker
	var marker = new google.maps.Marker({
		position: new google.maps.LatLng(data.lat, data.lng),
		icon: 'img/marker.png'
	});

	// click handler for google maps marker
	google.maps.event.addListener(marker, 'click', (function(place, parent) {
		return function() {
			// tell viewmodel to show this place
			parent.showPlace(place);
		};
	}) (this, parent));
	this.marker = marker;
};

// *******************************
// *        FILTER OBJECT        *
// *******************************
var Filter = function(data) {
	this.name = ko.observable(data.name);
	this.on = ko.observable(true);
};

// *******************************
// *          VIEW MODEL         *
// *******************************
var ViewModel = function() {
	var self = this;
	self.searchFilter = ko.observable('');
	self.currentPlace = ko.observable();
	self.initialized = false;
	self.hasMarkers = false;
	self.connectionError = ko.observable(false);

	// *******************************
	// *            INIT             *
	// *******************************
	self.init = function() {
		var tempTagArr = [];
		var tempFilterArr = [];

		// create container for places
		self.placeList = ko.observableArray([]);

		// loop through places array and convert to ko object
		places.forEach(function(place) {
			self.placeList.push(new Place(place, self));

			// loop through tags for each place and add to self.filters
			place.tags.forEach(function(tag){
				// if current tag is not already a filter, add to self.filters
				if (tempTagArr.indexOf(tag) < 0) {
					tempTagArr.push(tag);
				}
			});// end tag loop
		});// end place loop

		// loop through tags and make filter objects from them
		tempTagArr.forEach(function(tag){
			tempFilterArr.push(new Filter({name: tag}));
		});

		// set filters based on temporary array
		// this has performance benefits over pushing items one at a time
		self.filters = ko.observableArray(tempFilterArr);

		// array of filters currently applied
		self.currentFilters = ko.computed(function() {
			var tempCurrentFilters = [];

			// loop through filters and get all filters that are on
			ko.utils.arrayForEach(self.filters(), function(filter){
				if (filter.on()) tempCurrentFilters.push(filter.name());
			});

			return tempCurrentFilters;
		});

		// array of places to be shown based on currentFilters
		self.filteredPlaces = ko.computed(function() {
			var tempPlaces = ko.observableArray([]);
			var returnPlaces = ko.observableArray([]);

			// apply filter
			ko.utils.arrayForEach(self.placeList(), function(place){
				var placeTags = place.tags();

				// loop through all tags for a place and
				// determine if any are also a currently applied filter
				var intersections = placeTags.filter(function(tag){
					return self.currentFilters().indexOf(tag) != -1;
				});

				// if one or more tags for a place are in a filter, add it
				if (intersections.length > 0) tempPlaces.push(place);
			});

			var tempSearchFilter = self.searchFilter().toLowerCase();

			// if there is no additional text to search for, return filtered places
			if (!tempSearchFilter){
				returnPlaces = tempPlaces();
			}
			// if user is also searching via text box, apply text filter
			else{
				returnPlaces = ko.utils.arrayFilter(tempPlaces(), function(place) {
		        	return place.name().toLowerCase().indexOf(tempSearchFilter) !== -1;
		        });
			}

			// hide/show correct markers based on list of current places
			self.filterMarkers(returnPlaces);
			return returnPlaces;

		});

		// if no markers have been shown, show them
		if (!self.hasMarkers) self.showMarkers();
		self.initialized = true;
	};

	// *******************************
	// *          FUNCTIONS          *
	// *******************************

	// shows/hides correct map markers
	self.filterMarkers = function(filteredPlaces) {
		ko.utils.arrayForEach(self.placeList(), function(place){
			if (filteredPlaces.indexOf(place) === -1) {
				place.marker.setVisible(false);
			}
			else{
				place.marker.setVisible(true);
			}
		});
	};

	// turns filter on or off
	// called when filter is clicked in view
	self.toggleFilter = function(filter) {
		filter.on(!filter.on());
	};

	// show the currently selected place
	// called when list item or map marker is clicked
	self.showPlace = function(place) {
		// set info window content and show it
		gMap.infoWindow.setContent(gMap.infoWindowContent.replace('%title%', place.name()).replace('%description%', place.address()));
		gMap.infoWindow.open(gMap.map, place.marker);

		// set the old marker icon back
		if (self.currentPlace()) self.currentPlace().marker.setIcon('img/marker.png');

		// set new marker to selected icon
		place.marker.setIcon('img/marker_selected.png');

		// reset error status
		self.connectionError(false);

		// if place does not have additional info via ajax
		if (!place.initialized()) {

			// call to get initial information
			$.ajax({
				url: 'https://api.foursquare.com/v2/venues/search?ll='+place.lat()+','+place.lng()+'&intent=match&name='+place.name()+'&client_id=5ZPHOZSSOIEHWPYI4U5BBM42EXBJOYQIY1LBR1RZ3LIGNQG1&client_secret=HRH0UQDDMCO2JKC2NHJMJYRU2N05SQ4TGDHFHGZEQODZBX4S&v=20150326'
			})
			.done(function(data){
				var venue = data.response.venues[0];

				//set fetched info as properties of Place object
				place.id = ko.observable(venue.id);

				if (venue.hasOwnProperty('url')) {
					place.url = ko.observable(venue.url);
				}
				if (venue.hasOwnProperty('contact') && venue.contact.hasOwnProperty('formattedPhone')) {
					place.phone = ko.observable(venue.contact.formattedPhone);
				}

				// use id to get photo
				$.ajax({
					url: 'https://api.foursquare.com/v2/venues/'+place.id()+'/photos?client_id=5ZPHOZSSOIEHWPYI4U5BBM42EXBJOYQIY1LBR1RZ3LIGNQG1&client_secret=HRH0UQDDMCO2JKC2NHJMJYRU2N05SQ4TGDHFHGZEQODZBX4S&v=20150326'
				})
				.done(function(data){
					// set first photo url as the place photo property
					var photos = data.response.photos.items;
					place.photo = ko.observable(photos[0].prefix + 'width400' + photos[0].suffix);
					place.initialized(true);

					// set current place and scroll user to information
					self.currentPlace(place);
					self.scrollTo('#info-container');
				})
				.fail(function(err) {
					// if there is an error, set error status and scroll user to the info
					self.connectionError(true);
					self.scrollTo('#info-container');
				});

			})
			.fail(function(err) {
				// if there is an error, set error status and scroll user to the info
				self.connectionError(true);
				self.scrollTo('#info-container');
			})
		}
		// if place has already fetched data
		else {
			// set current place and scroll user to information
			self.currentPlace(place);
			self.scrollTo('#info-container');
		}
	};

	// helper function to scroll user to specified element
	// el is a string representing the element selector
	self.scrollTo = function(el) {
		$('html, body').animate({ scrollTop: $(el).offset().top }, "slow");
	};

	// show marker for each place
	self.showMarkers = function() {
		ko.utils.arrayForEach(self.placeList(), function(place){
			place.marker.setMap(gMap.map);
		});

		self.hasMarkers = true;
	};
};


// *******************************
// *            SETUP            *
// *******************************

// empty view model
var vm = new ViewModel();

// listener for view model initialization
$( document ).ready(function() {
	vm.init();
	ko.applyBindings(vm);

	// resize map and reset center when window size changes
	$(window).on('resize', function() {
		google.maps.event.trigger(gMap.map, 'resize');
		gMap.map.setCenter(gMap.options.center);
	});
});
// listener for google map initialization
google.maps.event.addDomListener(window, 'load', gMap.init(vm));