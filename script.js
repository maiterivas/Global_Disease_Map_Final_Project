const map = L.map('map').setView([20, 0], 2);

// Add a tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// Load GeoJSON and CSV data
Promise.all([
    d3.json('countries.geojson'), // Replace with your GeoJSON file
    d3.csv('health_data.csv')   // Replace with your CSV file
]).then(([geojson, csvData]) => {
    // Convert CSV data into a dictionary for quick lookup
    const dataDict = {};
    csvData.forEach(row => {
        dataDict[row.Country.trim()] = {
            Disease: row.Disease,
            DiseaseCategory: row.DiseaseCategory,
            HealthcareAccess: row.HealthcareAccess,
            MortalityRate: row.MortalityRate,
            PopulationAffected: row.PopulationAffected
        };
    });

    // Overlay GeoJSON data onto the Leaflet map
    L.geoJSON(geojson, {
        onEachFeature: (feature, layer) => {
            const countryName = feature.properties.ADMIN; // Adjust based on your GeoJSON
            const stats = dataDict[countryName];

            // Bind popup to each feature
            const popupContent = stats
                ? `
                <strong>${countryName}</strong><br>
                <strong>Disease:</strong> ${stats.Disease}<br>
                <strong>Disease Category:</strong> ${stats.DiseaseCategory}<br>
                <strong>Healthcare Access:</strong> ${stats.HealthcareAccess}%<br>
                <strong>Mortality Rate:</strong> ${stats.MortalityRate}%<br>
                <strong>Population Affected:</strong> ${stats.PopulationAffected}
                `
                : `<strong>${countryName}</strong><br>No data available.`;

            layer.bindPopup(popupContent);

            // Optional: Add hover interaction for better UX
            layer.on('mouseover', () => {
                layer.openPopup();
                layer.setStyle({ fillOpacity: 0.7 });
            });
            layer.on('mouseout', () => {
                layer.closePopup();
                layer.setStyle({ fillOpacity: 0.5 });
            });
        },
        style: {
            color: '#3388ff',
            weight: 1,
            fillOpacity: 0.5
        }
    }).addTo(map);
}).catch(error => {
    console.error('Error loading data:', error);
});