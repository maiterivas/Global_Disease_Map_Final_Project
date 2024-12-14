// Set map dimensions
const width = 960;
const height = 600;

// Create SVG
const svg = d3.select("#map")
    .attr("width", width)
    .attr("height", height);

// Create a projection and path generator
const projection = d3.geoMercator()
    .scale(150)
    .translate([width / 2, height / 1.5]);

const path = d3.geoPath().projection(projection);

// Tooltip
const tooltip = d3.select(".tooltip");

// Load GeoJSON and dataset
Promise.all([
    d3.json("custom.geo.json"), // Load your custom GeoJSON file
    d3.csv("health_data.csv")   // Load the dataset
]).then(([geojson, healthData]) => {
    // Map dataset to a dictionary by country
    const healthMap = {};
    healthData.forEach(d => {
        healthMap[d.Country] = {
            disease: d.Disease,
            mortalityRate: +d["Mortality Rate"],
            affectedPopulation: +d["Affected Population"]
        };
    });

    // Bind data and draw map
    svg.selectAll("path")
        .data(geojson.features) // Use features from custom.geo.json
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const countryData = healthMap[d.properties.ADMIN]; // Ensure matching property
            return countryData ? "steelblue" : "#ccc"; // Color countries with data
        })
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .on("mouseover", (event, d) => {
            const countryData = healthMap[d.properties.ADMIN];
            if (countryData) {
                tooltip.style("display", "block")
                    .style("left", `${event.pageX + 5}px`)
                    .style("top", `${event.pageY - 30}px`)
                    .html(`
                        <strong>${d.properties.ADMIN}</strong><br>
                        Disease: ${countryData.disease}<br>
                        Mortality Rate: ${countryData.mortalityRate}%<br>
                        Affected Population: ${countryData.affectedPopulation.toLocaleString()}
                    `);
            }
        })
        .on("mouseout", () => tooltip.style("display", "none"));
});