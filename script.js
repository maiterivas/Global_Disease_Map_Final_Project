const map = L.map('map').setView([20, 0], 2);

// Add a tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors',
    maxZoom: 18
}).addTo(map);

// Create an SVG container for hover tooltips
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip-chart")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("padding", "10px")
    .style("box-shadow", "0 0 5px rgba(0, 0, 0, 0.3)");

// Load GeoJSON and CSV data
Promise.all([
    d3.json('https://raw.githubusercontent.com/maiterivas/Global_Socioeconomic_Map/8506c59221c9d7ab16dd8f93dbbc2bbdf608977d/countries.geojson'), // GeoJSON file
    d3.csv('Country_Data.csv') // CSV file
]).then(([geojson, csvData]) => {
    // Convert CSV data into a dictionary for quick lookup
    const dataDict = {};
    csvData.forEach(row => {
        dataDict[row.country.trim()] = {
            'Child Mortality': +row.child_mort,
            'Health': +row.health,
            'Income': +row.income,
            'Inflation': +row.inflation,
            'Life Expectancy': +row.life_expec,
            'GDP per Capita': +row.gdpp
        };
    });

    // Map of display names for datasets
    const datasetDisplayNames = {
        child_mort: 'Child Mortality',
        health: 'Health',
        income: 'Income',
        inflation: 'Inflation',
        life_expec: 'Life Expectancy',
        gdpp: 'GDP per Capita'
    };

    // Initial dataset selection
    let currentDataset = 'child_mort';

    // Function to calculate the range of the current dataset
    function calculateRange() {
        const values = Object.values(dataDict)
            .map(stats => stats[datasetDisplayNames[currentDataset]])
            .filter(value => value !== null && !isNaN(value));
        const min = Math.min(...values);
        const max = Math.max(...values);
        return { min, max };
    }

    // Function to create a dynamic color scale based on dataset range
    function createColorScale() {
        const { min, max } = calculateRange();
        return d3.scaleSequential(d3.interpolateYlOrRd).domain([min, max]);
    }

    // Initialize the color scale
    let colorScale = createColorScale();

    // Function to style GeoJSON features dynamically
    function styleFeature(feature) {
        const countryName = feature.properties.ADMIN;
        const stats = dataDict[countryName];
        const value = stats ? stats[datasetDisplayNames[currentDataset]] : null;

        return {
            fillColor: value !== null ? colorScale(value) : '#cccccc',
            color: '#3388ff',
            weight: 1,
            fillOpacity: 0.8
        };
    }

    // Create GeoJSON layer
    const geoJsonLayer = L.geoJSON(geojson, {
        onEachFeature: (feature, layer) => {
            const countryName = feature.properties.ADMIN;
            const stats = dataDict[countryName];

            // Bind popup
            const popupContent = stats
                ? `
                <strong>${countryName}</strong><br>
                <strong>${datasetDisplayNames[currentDataset]}:</strong> ${stats[datasetDisplayNames[currentDataset]]}<br>
                <br>
                ${Object.entries(stats)
                    .filter(([key]) => key !== datasetDisplayNames[currentDataset])
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('<br>')}
                `
                : `<strong>${countryName}</strong><br>No data available.`;

            layer.bindPopup(popupContent);

            // Hover effects with bar chart
            layer.on('mouseover', (e) => {
                const countryName = feature.properties.ADMIN;
                const stats = dataDict[countryName];
                if (stats) {
                    const data = Object.entries(stats).map(([key, value]) => ({ key, value }));
                    const svgWidth = 200;
                    const svgHeight = 100;
                    const barHeight = svgHeight / data.length;

                    tooltip.html(""); // Clear previous chart
                    const svg = tooltip.append("svg")
                        .attr("width", svgWidth)
                        .attr("height", svgHeight);

                    const x = d3.scaleLinear()
                        .domain([0, d3.max(data, d => d.value)])
                        .range([0, svgWidth]);

                    svg.selectAll("rect")
                        .data(data)
                        .enter()
                        .append("rect")
                        .attr("x", 0)
                        .attr("y", (d, i) => i * barHeight)
                        .attr("width", d => x(d.value))
                        .attr("height", barHeight - 2)
                        .attr("fill", "steelblue");

                    svg.selectAll("text")
                        .data(data)
                        .enter()
                        .append("text")
                        .attr("x", d => x(d.value) + 5)
                        .attr("y", (d, i) => (i * barHeight) + barHeight / 2)
                        .text(d => `${d.key}: ${d.value}`)
                        .attr("font-size", "10px")
                        .attr("alignment-baseline", "middle");

                    tooltip.style("visibility", "visible")
                        .style("top", `${e.originalEvent.pageY + 10}px`)
                        .style("left", `${e.originalEvent.pageX + 10}px`);
                }

                layer.setStyle({ fillOpacity: 0.9 });
            });

            layer.on('mouseout', () => {
                tooltip.style("visibility", "hidden");
                layer.setStyle({ fillOpacity: 0.8 });
            });
        },
        style: styleFeature
    }).addTo(map);

    // Dropdown event listener
    document.getElementById('dataset-select').addEventListener('change', (event) => {
        currentDataset = event.target.value; // Get the selected dataset
        console.log(`Dataset changed to: ${currentDataset}`); // Debugging: log the selected dataset

        // Recreate the color scale for the new dataset
        colorScale = createColorScale();

        // Update each feature's style based on the new dataset
        geoJsonLayer.eachLayer(layer => {
            layer.setStyle(styleFeature(layer.feature)); // Re-apply style
            const countryName = layer.feature.properties.ADMIN; // Get country name
            const stats = dataDict[countryName]; // Get stats for the current country
            
            // Update popup content with the new dataset value
            const popupContent = stats
                ? `
                    <strong>${countryName}</strong><br>
                    <strong>${datasetDisplayNames[currentDataset]}:</strong> ${stats[datasetDisplayNames[currentDataset]]}<br>
                    <strong>Other Data:</strong><br>
                    ${Object.entries(stats)
                        .filter(([key]) => key !== datasetDisplayNames[currentDataset])
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('<br>')}
                `
                : `<strong>${countryName}</strong><br>No data available.`;

            layer.bindPopup(popupContent); // Re-bind popup with updated content
        });

        // Update the legend to reflect the new dataset
        updateLegend();
    });

    // Function to update the legend dynamically
    function updateLegend() {
        const { min, max } = calculateRange();
        const grades = d3.range(min, max, (max - min) / 5).concat(max); // Divide the range into 5 intervals
        const legendDiv = document.querySelector('.info.legend');
        if (legendDiv) {
            legendDiv.innerHTML = `<strong>${datasetDisplayNames[currentDataset]}</strong><br>`;
            grades.forEach((grade, index) => {
                const color = colorScale(grade);
                legendDiv.innerHTML +=
                    `<i style="background:${color}"></i> ${grade.toFixed(1)}${grades[index + 1] ? `–${grades[index + 1].toFixed(1)}` : '+'}<br>`;
            });
        }
    }

    // Add legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'info legend');
        div.innerHTML = '<h4>Legend</h4>'; // Placeholder until updateLegend is called
        return div;
    };
    legend.addTo(map);
    updateLegend(); // Initial legend update
}).catch(error => {
    console.error('Error loading data:', error);
});