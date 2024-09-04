let currentPosition = { lat: 0, lng: 0 };
let map;
let userMarker;
let policeMarkers = [];
let hospitalMarkers = [];
let railwayMarkers = [];
let hotelMarkers = [];
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

// Function to find and display nearest police stations, hospitals, railway stations, and hotels
function findNearestResources() {
    if (currentPosition.lat === 0 && currentPosition.lng === 0) {
        document.getElementById('nearest-police-station').textContent = 'Unable to find nearest resources.';
        document.getElementById('nearest-hospital').textContent = 'Unable to find nearest resources.';
        document.getElementById('nearest-railway-station').textContent = 'Unable to find nearest resources.';
        document.getElementById('nearest-hotel').textContent = 'Unable to find nearest resources.';
        return;
    }

    // Clear previous markers
    policeMarkers.forEach(marker => map.removeLayer(marker));
    hospitalMarkers.forEach(marker => map.removeLayer(marker));
    railwayMarkers.forEach(marker => map.removeLayer(marker));
    hotelMarkers.forEach(marker => map.removeLayer(marker));
    policeMarkers = [];
    hospitalMarkers = [];
    railwayMarkers = [];
    hotelMarkers = [];

    // Fetch nearest police stations
    fetchResources('police', 'police-list', 'nearest-police-station', policeIcon);
    
    // Fetch nearest hospitals
    fetchResources('hospital', 'hospital-list', 'nearest-hospital', hospitalIcon);
    
    // Fetch nearest railway stations
    fetchResources('railway_station', 'transport-list', 'nearest-railway-station', railwayIcon);
    
    // Fetch nearest hotels
    fetchResources('hotel', 'safety-places-list', 'nearest-hotel', hotelIcon);
}

// Generic function to fetch resources (police, hospital, railway station, hotel) and update the map and list
function fetchResources(type, listId, nearestId, icon) {
    // Adjust query for railway stations and hotels
    const queryType = type === 'railway_station' ? 'railway=station' : (type === 'hotel' ? 'tourism=hotel' : `amenity=${type}`);
    const url = `https://overpass-api.de/api/interpreter?data=[out:json];node[${queryType}](around:${searchRadius},${currentPosition.lat},${currentPosition.lng});out;`;

    console.log(`Fetching ${type} from URL: ${url}`); // Debugging: log URL to ensure it's correct

    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(`${type} data:`, data); // Log response data for debugging
            const listElement = document.getElementById(listId);
            listElement.innerHTML = ''; // Clear previous list items

            let nearestResource = null;
            let minDistance = Infinity;

            // Collect resources and distances
            const resourcesWithDistances = data.elements.map(item => {
                const lat = item.lat;
                const lon = item.lon;
                const distance = calculateDistance(currentPosition.lat, currentPosition.lng, lat, lon);
                return { ...item, distance };
            });

            // Sort resources by distance
            resourcesWithDistances.sort((a, b) => a.distance - b.distance);

            // Update the list and map with sorted data
            resourcesWithDistances.forEach(item => {
                const lat = item.lat;
                const lon = item.lon;
                const distance = item.distance;

                // Format the name properly for railway stations and hotels
                const name = item.tags.name ? item.tags.name : type.replace('_', ' ').toUpperCase();
                const formattedName = type === 'railway_station' ? `${name} station` : (type === 'hotel' ? `${name} hotel` : name);

                // Add marker for each resource found
                const marker = L.marker([lat, lon], { icon })
                    .addTo(map)
                    .bindPopup(`${formattedName}<br>Distance: ${distance.toFixed(2)} km`);
                
                // Add marker to the appropriate array
                if (type === 'police') {
                    policeMarkers.push(marker);
                } else if (type === 'hospital') {
                    hospitalMarkers.push(marker);
                } else if (type === 'railway_station') {
                    railwayMarkers.push(marker);
                } else if (type === 'hotel') {
                    hotelMarkers.push(marker);
                }

                // Add resource to the list with distance
                const listItem = document.createElement('li');
                listItem.textContent = `${formattedName} - ${distance.toFixed(2)} km`;
                listElement.appendChild(listItem);

                // Update nearest resource
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestResource = item;
                }
            });

            // Display nearest resource
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

// Function to calculate distance between two coordinates
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
}

function toRad(degrees) {
    return degrees * Math.PI / 180;
}

// Add an emergency contact
document.getElementById('contact-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    
    if (name && phone) {
        emergencyContacts.push({ name, phone });
        updateContactList();
        
        document.getElementById('contact-name').value = '';
        document.getElementById('contact-phone').value = '';
    }
});

// Update the contact list with delete buttons
function updateContactList() {
    const contactList = document.getElementById('contacts-list');
    contactList.innerHTML = ''; // Clear previous list items

    emergencyContacts.forEach((contact, index) => {
        const listItem = document.createElement('li');
        listItem.textContent = `${contact.name} - ${contact.phone}`;
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteContact(index);

        listItem.appendChild(deleteButton);
        contactList.appendChild(listItem);
    });
}

// Function to delete a contact
function deleteContact(index) {
    emergencyContacts.splice(index, 1);
    updateContactList();
}

// SOS Functionality
function sendSOS() {
    if (currentPosition.lat === 0 && currentPosition.lng === 0) {
        alert('Unable to determine your location.');
        return;
    }
    
    // Create the SOS message
    const sosMessage = `SOS! I need help. My current location is Latitude: ${currentPosition.lat}, Longitude: ${currentPosition.lng}.`;

    // Display an alert with the SOS message
    alert(sosMessage);

    // Optionally, you could send this message to a server or notify emergency contacts
    // For example, you might send it via email, SMS, or a server endpoint
    // For now, we'll just log it to the console
    console.log('SOS Alert:', sosMessage);

    // Optionally, you could also send the SOS message to the emergency contacts list
    emergencyContacts.forEach(contact => {
        console.log(`Sending SOS to ${contact.name} at ${contact.phone}`);
        // Add actual sending logic here (e.g., using an API)
    });
}

// Initialize map on page load
window.onload = function() {
    initMap();
    getLocation(); // Ensure to call getLocation on page load

    // Set up event listener for the radius slider
    const radiusSlider = document.getElementById('radius-slider');
    const radiusLabel = document.getElementById('radius-label');
    
    radiusSlider.addEventListener('input', function() {
        searchRadius = parseInt(radiusSlider.value, 10);
        radiusLabel.textContent = `Radius: ${searchRadius} meters`;
        findNearestResources(); // Update resources based on the new radius
    });

    // Set up event listener for the Google Maps button
    document.getElementById('open-google-maps').addEventListener('click', openGoogleMaps);
};
