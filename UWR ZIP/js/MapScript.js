        // Initialize the map
        const map = L.map('map').setView([37.8, -96], 4); // Centered on the US

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Example: Add a marker (New York City)
        const marker = L.marker([40.7128, -74.0060]).addTo(map);
        marker.bindPopup("<b>New York City</b><br>The Big Apple.").openPopup();

        // Example: Add a circle (around Kansas City)
        const circle = L.circle([39.0997, -94.5786], {
            color: 'red',
            fillColor: '#f03',
            fillOpacity: 0.5,
            radius: 50000 // in meters
        }).addTo(map);
        circle.bindPopup("<b>Kansas City</b><br>Population hub.");

        // Example: Add a polygon (triangle in California)
        const polygon = L.polygon([
            [34.0522, -118.2437], // Los Angeles
            [36.7783, -119.4179], // Central California
            [38.5816, -121.4944]  // Sacramento
        ]).addTo(map);
        polygon.bindPopup("<b>California Triangle</b><br>Example area.");

        // Add event listener to log clicks
        map.on('click', (e) => {
            alert(`You clicked the map at ${e.latlng}`);
        });