"use strict";
(() => {
  // bin/live-reload.js
  new EventSource(`${"http://localhost:3000"}/esbuild`).addEventListener("change", () => location.reload());

  // src/index.ts
  var map;
  var service;
  var marker = null;
  window.Webflow ||= [];
  window.Webflow.push(() => {
    const mapElement = document.querySelector('[fs-element="map-target"]');
    if (!mapElement) {
      return;
    }
    map = new google.maps.Map(mapElement, {
      center: { lat: 39.86610830468986, lng: -102.4204412752872 },
      zoom: 15
    });
    const form = document.querySelector('[fs-element="search-form"]');
    const input = document.querySelector('[fs-element="search-input"]');
    if (!form || !input) {
      return;
    }
    const autocomplete = new google.maps.places.Autocomplete(input);
    const schoolSection = document.querySelector(".school-section");
    if (schoolSection) {
      schoolSection.style.display = "none";
    }
    const parkSection = document.querySelector(".park-section");
    if (parkSection) {
      parkSection.style.display = "none";
    }
    const transitSection = document.querySelector(".transit-section");
    if (transitSection) {
      transitSection.style.display = "none";
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const value = autocomplete.getPlace();
      if (value && value.geometry && value.geometry.location) {
        map.setCenter(value.geometry.location);
        if (schoolSection && parkSection && transitSection) {
          schoolSection.style.display = "block";
          parkSection.style.display = "block";
          transitSection.style.display = "block";
        }
        addMarkerToMap(value.geometry.location, value.name || "Searched Location");
        const request = {
          location: value.geometry.location,
          radius: 1e3,
          // 1km radius
          type: "restaurant"
          // Use single string for type
        };
        service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, callback);
        getNearbySchools(value.geometry.location);
        getNearbyParks(value.geometry.location);
      }
    });
  });
  function callback(results, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      if (!results || results.length === 0) {
        console.error("No results returned");
        return;
      }
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: results[0].geometry?.location }, (results2, status2) => {
        if (status2 === "OK" && results2 && results2[0]) {
          let county = null;
          for (const component of results2[0].address_components) {
            if (component.types.includes("administrative_area_level_2")) {
              county = component.long_name;
              break;
            }
          }
          if (county) {
            const origin = results2[0].geometry?.location ?? new google.maps.LatLng(0, 0);
            getTransitDetails(origin, "bus_station");
            getTransitDetails(origin, "airport");
          }
        } else {
          console.error("Geocoder failed with status", status2);
        }
      });
    } else {
      console.error("Places service failed with status:", status);
    }
  }
  function getTransitDetails(origin, destinationType) {
    const request = {
      location: origin,
      rankBy: google.maps.places.RankBy.DISTANCE,
      type: destinationType
      // Update type to be a single string
    };
    const placesService = new google.maps.places.PlacesService(map);
    placesService.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        if (results.length > 0) {
          const nearestPlace = results[0];
          const placeName = nearestPlace.name;
          const placeLocation = nearestPlace.geometry?.location;
          if (placeLocation) {
            const directionsService = new google.maps.DirectionsService();
            const transitRequest = {
              origin,
              destination: placeLocation,
              travelMode: google.maps.TravelMode.TRANSIT
            };
            directionsService.route(transitRequest, (result, status2) => {
              if (status2 === google.maps.DirectionsStatus.OK && result) {
                if (destinationType === "bus_station") {
                  const bus_transit_name = document.getElementById("bus-transit-name");
                  if (bus_transit_name) {
                    bus_transit_name.innerHTML = placeName ?? "";
                    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat()},${origin.lng()}&destination=${placeLocation.lat()},${placeLocation.lng()}&travelmode=transit`;
                    console.log("Bus Station URL:", directionsUrl);
                    const bus_stop_direction = document.querySelector(
                      ".bus-stop-direction"
                    );
                    if (bus_stop_direction) {
                      bus_stop_direction.addEventListener("click", () => {
                        window.open(directionsUrl, "_blank");
                      });
                    }
                  }
                  const bus_transit_distance = document.getElementById("bus-transit-distance");
                  if (bus_transit_distance) {
                    bus_transit_distance.innerHTML = result.routes[0].legs[0].distance?.text ?? "Unknown";
                  }
                } else if (destinationType === "airport") {
                  const air_transit_name = document.getElementById("air-transit-name");
                  if (air_transit_name) {
                    air_transit_name.innerHTML = placeName ?? "";
                    const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat()},${origin.lng()}&destination=${placeLocation.lat()},${placeLocation.lng()}&travelmode=transit`;
                    console.log("Airport URL:", directionsUrl);
                    const airportDirectionImage = document.querySelector(
                      ".airport-direction"
                    );
                    if (airportDirectionImage) {
                      airportDirectionImage.addEventListener("click", () => {
                        window.open(directionsUrl, "_blank");
                      });
                    }
                  }
                  const air_transit_distance = document.getElementById("air-transit-distance");
                  if (air_transit_distance) {
                    air_transit_distance.innerHTML = result.routes[0].legs[0].distance?.text ?? "Unknown";
                  }
                }
              } else {
                console.error("Directions service failed with status", status2);
              }
            });
          }
        } else {
          console.error("No " + destinationType + " found near the location.");
        }
      } else {
        console.error("Places service failed with status:", status);
      }
    });
  }
  function getNearbySchools(origin) {
    const productContainer = document.querySelector(".product-container");
    if (!productContainer) {
      console.error("Product container not found");
      return;
    }
    const request = {
      location: origin,
      radius: 1e3,
      // 1km radius
      type: "school"
      // Search for schools
    };
    productContainer.innerHTML = "";
    const placesService = new google.maps.places.PlacesService(map);
    placesService.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        results.forEach((place) => {
          const placeName = place.name;
          const placeLocation = place.geometry?.location;
          const distance = placeLocation ? google.maps.geometry.spherical.computeDistanceBetween(origin, placeLocation).toFixed(2) : "Unknown";
          const schoolType = place.types.includes("school") ? "public" : "private";
          if (place.photos && place.photos[0]) {
            const photoUrl = place.photos && place.photos[0].getUrl();
            const productCard = document.createElement("div");
            productCard.classList.add("product-card");
            const productImage = document.createElement("div");
            productImage.classList.add("product-image");
            const productThumb = document.createElement("img");
            productThumb.classList.add("product-thumb");
            productThumb.src = photoUrl || "default-school-image.jpg";
            productThumb.alt = place.name || "School Image";
            productImage.appendChild(productThumb);
            const productInfo = document.createElement("div");
            productInfo.classList.add("product-info");
            const productBrand = document.createElement("h6");
            productBrand.classList.add("product-brand1");
            productBrand.textContent = placeName || "Unknown School";
            productInfo.appendChild(productBrand);
            const schoolTpe = document.createElement("div");
            schoolTpe.classList.add("type");
            schoolTpe.textContent = schoolType || "Unknown Type";
            const schoolDistance = document.createElement("div");
            schoolDistance.classList.add("distance");
            schoolDistance.textContent = `${distance} meters` || "Unknown Distance";
            productInfo.appendChild(schoolTpe);
            productInfo.appendChild(schoolDistance);
            productCard.appendChild(productImage);
            productCard.appendChild(productInfo);
            productContainer.appendChild(productCard);
          }
        });
      } else {
        console.error("Places service failed with status:", status);
      }
    });
  }
  function getNearbyParks(origin) {
    const parkContainer = document.querySelector(".park-container");
    if (!parkContainer) {
      console.error("Product container not found");
      return;
    }
    const request = {
      location: origin,
      radius: 1e3,
      // 1km radius
      type: "park"
      // Search for parks
    };
    parkContainer.innerHTML = "";
    const placesService = new google.maps.places.PlacesService(map);
    placesService.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        results.forEach((place) => {
          const placeName = place.name;
          const placeLocation = place.geometry?.location;
          const distance = placeLocation ? google.maps.geometry.spherical.computeDistanceBetween(origin, placeLocation).toFixed(2) : "Unknown";
          if (place.photos && place.photos[0]) {
            const photoUrl = place.photos[0].getUrl();
            const parkCard = document.createElement("div");
            parkCard.classList.add("park-card");
            const parkImage = document.createElement("div");
            parkImage.classList.add("park-images");
            const parkThumb = document.createElement("img");
            parkThumb.classList.add("park-thumb");
            parkThumb.src = photoUrl || "default-park-image.jpg";
            parkThumb.alt = place.name || "Park Image";
            parkImage.appendChild(parkThumb);
            const parkInfo = document.createElement("div");
            parkInfo.classList.add("park-info");
            const parkBrand = document.createElement("h6");
            parkBrand.classList.add("park-brand");
            parkBrand.textContent = placeName || "Unknown Park";
            const parkDistance = document.createElement("div");
            parkDistance.classList.add("park-distance");
            parkDistance.textContent = `${distance} meters` || "Unknown distance";
            parkInfo.appendChild(parkBrand);
            parkInfo.appendChild(parkDistance);
            parkCard.appendChild(parkImage);
            parkCard.appendChild(parkInfo);
            parkContainer.appendChild(parkCard);
          }
        });
      } else {
        console.error("Places service failed with status:", status);
      }
    });
  }
  function addMarkerToMap(location2, title) {
    if (marker) {
      marker.setMap(null);
    }
    marker = new google.maps.Marker({
      position: location2,
      map,
      title
    });
  }
})();
//# sourceMappingURL=index.js.map
