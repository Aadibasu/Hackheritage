let currentPosition = { lat: 0, lng: 0 };
let map;
let userMarker;
let policeMarkers = [];
let hospitalMarkers = [];
let railwayMarkers = [];
let hotelMarkers = [];
let busMarkers = [];
let searchRadius = 10000; // Default Radius in meters
const emergencyContacts = []; // Initialize the emergency contacts array

// Define custom icons with local file paths
const policeIcon = L.icon({
    iconUrl: 'hospital.png', // Path to your police icon
    iconSize: [30, 30], // Size of the icon
    iconAnchor: [15, 30], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -30] // Point from which the popup should open relative to the iconAnchor
});

const hospitalIcon = L.icon({
    iconUrl: 'hotels.png', // Path to your hospital icon
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

const railwayIcon = L.icon({
    iconUrl: 'railway_station.png', // Path to your railway station icon
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

const hotelIcon = L.icon({
    iconUrl: 'police.png', // Path to your hotel icon
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

const busIcon = L.icon({
    iconUrl: 'bus_station.png', // Path to your bus station icon
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

// Initialize the map
function initMap() {
    map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

// Get current location and update map
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            document.getElementById('location-status').textContent = `Latitude: ${currentPosition.lat}, Longitude: ${currentPosition.lng}`;

            // Update map view
            map.setView([currentPosition.lat, currentPosition.lng], 13);

            // Add or update marker for the current location
            if (userMarker) {
                userMarker.setLatLng([currentPosition.lat, currentPosition.lng]);
            } else {
                userMarker = L.marker([currentPosition.lat, currentPosition.lng])
                    .addTo(map)
                    .bindPopup('You are here!')
                    .openPopup();
            }

            // Find nearest resources based on user location
            findNearestResources();

        }, error => {
            console.error('Error getting location:', error);
            document.getElementById('location-status').textContent = 'Unable to retrieve your location.';
        });
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

// Function to open Google Maps with the current location
function openGoogleMaps() {
    if (currentPosition.lat === 0 && currentPosition.lng === 0) {
        alert('Unable to determine your location.');
        return;
    }

    const url = `https://www.google.com/maps?q=${currentPosition.lat},${currentPosition.lng}`;
    window.open(url, '_blank');
}

// Function to find and display nearest police stations, hospitals, railway stations, hotels, and bus stations
function findNearestResources() {
    if (currentPosition.lat === 0 && currentPosition.lng === 0) {
        document.getElementById('nearest-police-station').textContent = 'Unable to find nearest resources.';
        document.getElementById('nearest-hospital').textContent = 'Unable to find nearest resources.';
        document.getElementById('nearest-railway-station').textContent = 'Unable to find nearest resources.';
        document.getElementById('nearest-bus-station').textContent = 'Unable to find nearest resources.';
        return;
    }

    // Clear previous markers
    policeMarkers.forEach(marker => map.removeLayer(marker));
    hospitalMarkers.forEach(marker => map.removeLayer(marker));
    railwayMarkers.forEach(marker => map.removeLayer(marker));
    hotelMarkers.forEach(marker => map.removeLayer(marker));
    busMarkers.forEach(marker => map.removeLayer(marker));
    policeMarkers = [];
    hospitalMarkers = [];
    railwayMarkers = [];
    hotelMarkers = [];
    busMarkers = [];

    // Fetch nearest resources
    fetchResources('police', 'police-list', 'nearest-police-station', policeIcon);
    fetchResources('hospital', 'hospital-list', 'nearest-hospital', hospitalIcon);
    fetchResources('railway_station', 'transport-list', 'nearest-railway-station', railwayIcon);
    fetchResources('hotel', 'safety-places-list', 'nearest-hotel', hotelIcon);
    fetchResources('bus_station', 'bus-stations-list', 'nearest-bus-station', busIcon);
}

// Calculate distance between two geographic points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Fetch resources from Overpass API and update UI
function fetchResources(type, listId, nearestId, icon) {
    const queryType = type === 'railway_station' ? 'railway=station' : (type === 'hotel' ? 'tourism=hotel' : `amenity=${type}`);
    const url = `https://overpass-api.de/api/interpreter?data=[out:json];node[${queryType}](around:${searchRadius},${currentPosition.lat},${currentPosition.lng});out;`;

    console.log(`Fetching ${type} from URL: ${url}`);

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(`${type} data:`, data);
            const listElement = document.getElementById(listId);
            listElement.innerHTML = '';

            let nearestResource = null;
            let minDistance = Infinity;

            const resourcesWithDistances = data.elements.map(item => {
                const lat = item.lat;
                const lon = item.lon;
                const distance = calculateDistance(currentPosition.lat, currentPosition.lng, lat, lon);
                return { ...item, distance };
            });

            resourcesWithDistances.sort((a, b) => a.distance - b.distance);

            resourcesWithDistances.forEach(item => {
                const lat = item.lat;
                const lon = item.lon;
                const distance = item.distance;

                const name = item.tags.name ? item.tags.name : type.replace('_', ' ').toUpperCase();
                const formattedName = type === 'railway_station' ? `${name} station` : (type === 'hotel' ? `${name} hotel` : name);

                const marker = L.marker([lat, lon], { icon })
                    .addTo(map)
                    .bindPopup(`${formattedName}<br>Distance: ${distance.toFixed(2)} km`);
                
                if (type === 'police') {
                    policeMarkers.push(marker);
                } else if (type === 'hospital') {
                    hospitalMarkers.push(marker);
                } else if (type === 'railway_station') {
                    railwayMarkers.push(marker);
                } else if (type === 'hotel') {
                    hotelMarkers.push(marker);
                } else if (type === 'bus_station') {
                    busMarkers.push(marker);
                }

                const listItem = document.createElement('li');
                listItem.textContent = `${formattedName} - ${distance.toFixed(2)} km`;
                listElement.appendChild(listItem);

                if (distance < minDistance) {
                    minDistance = distance;
                    nearestResource = item;
                }
            });

            if (nearestResource) {
                document.getElementById(nearestId).textContent = `Nearest ${type.replace('_', ' ')}: ${nearestResource.tags.name || 'Unknown'}, Distance: ${minDistance.toFixed(2)} km`;
            } else {
                document.getElementById(nearestId).textContent = `No ${type.replace('_', ' ')}s found.`;
            }
        })
        .catch(error => {
            console.error(`Error fetching ${type}s data:`, error);
            document.getElementById(nearestId).textContent = `Unable to retrieve ${type}s data.`;
        });
}

// Initialize the map
initMap();

// Event listeners for search radius slider
document.getElementById('radius-slider').addEventListener('input', function() {
    searchRadius = this.value;
    document.getElementById('radius-label').textContent = `Radius: ${searchRadius} meters`;
    findNearestResources(); // Update resources based on the new radius
});

// Event listeners for Google Maps button
document.getElementById('open-google-maps').addEventListener('click', openGoogleMaps);

// Handle SOS button click
function sendSOS() {
    alert('SOS has been sent!'); // Implement actual SOS functionality here
}

// Find safe route function placeholder
function findSafeRoute() {
    alert('Safe route functionality is not implemented yet.');
}

// Add event listener for contact form submission
document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    if (name && phone) {
        const contact = { name, phone };
        emergencyContacts.push(contact);

        // Create list item with delete button
        const contactList = document.getElementById('contacts-list');
        const listItem = document.createElement('li');
        listItem.textContent = `${name} - ${phone}`;

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.addEventListener('click', function() {
            contactList.removeChild(listItem);
            // Remove contact from the array
            const index = emergencyContacts.indexOf(contact);
            if (index > -1) {
                emergencyContacts.splice(index, 1);
            }
        });

        listItem.appendChild(deleteButton);
        contactList.appendChild(listItem);

        document.getElementById('contact-name').value = '';
        document.getElementById('contact-phone').value = '';
    }
});
