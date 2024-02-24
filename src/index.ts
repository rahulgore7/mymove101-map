window.Webflow ||= [];
window.Webflow.push(() => {
  //AIzaSyBiegygmIH32-8OIQ-_BitxvYHtzUBDIdk
  const mapElement = document.querySelector<HTMLElement>('[fs-element="map-target"]');
  if (!mapElement) {
    return;
  }

  const map = new window.google.maps.Map(mapElement, {
    center: { lat: 21.83825727341409, lng: 73.7190406198092 },
    zoom: 10,
  });

  const form = document.querySelector<HTMLFormElement>('[fs-element="search-form"]');
  const input = document.querySelector<HTMLInputElement>('[fs-element="search-input"]');

  if (!form || !input) {
    return;
  }

  const autocomplete = new window.google.maps.places.Autocomplete(input, {
    fields: ['geometry', 'name'],
    types: ['geocode'],
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const value = autocomplete.getPlace();
    if (value && value.geometry && value.geometry.location) {
      map.setCenter(value.geometry.location);
      console.log(value);
    }
    console.log(value);
  });
});
