// Initialize Leaflet Map
const map = L.map('map').setView([37.8, -96], 5); // Default view of the US

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Location Search Functionality
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");

    searchInput.addEventListener("keyup", function (event) {
        if (event.key === "Enter") {
            let query = searchInput.value.trim();
            if (query.length > 0) {
                searchLocation(query);
            }
        }
    });
});

// Function to Fetch Coordinates Using OpenStreetMap's Nominatim API
function searchLocation(query) {
    const geocodeApiUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;

    fetch(geocodeApiUrl)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                let lat = parseFloat(data[0].lat);
                let lon = parseFloat(data[0].lon);

                // Smooth zoom-in transition
                map.flyTo([lat, lon], 12, {
                    animate: true,
                    duration: 2
                });

                L.marker([lat, lon]).addTo(map).bindPopup(`Search Result: ${query}`).openPopup();

                // Fetch election data using the API
                fetchElectionData(query);
            } else {
                alert("Location not found. Try refining your search.");
            }
        })
        .catch(error => {
            console.error("Error fetching location:", error);
            alert("Error fetching location. Please try again.");
        });
}

// Fetch Election Data
function fetchElectionData(address) {
    const apiKey = "AIzaSyDBydlP-ld4_hjIc5U62FF6XP1dhDEIgzA";
    const electionApiUrl = `https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const officialsApiUrl = `https://www.googleapis.com/civicinfo/v2/representatives?address=${encodeURIComponent(address)}&key=${apiKey}`;

    // Check cache first
    const cachedData = localStorage.getItem(address);
    if (cachedData) {
        const { electionData, officialsData, timestamp } = JSON.parse(cachedData);

        // Optional: Set expiration for cache (e.g., 1 day = 86400000 ms)
        const cacheExpiration = 24 * 60 * 60 * 1000;
        if (Date.now() - timestamp < cacheExpiration) {
            displayElectionInfo(electionData);
            displayOfficialsData(officialsData);
            return;
        } else {
            localStorage.removeItem(address); // Remove expired cache
        }
    }

    // Fetch fresh data if not cached
    Promise.all([
        fetch(electionApiUrl).then(response => response.json()),
        fetch(officialsApiUrl).then(response => response.json())
    ])
        .then(([electionData, officialsData]) => {
            // Cache the response
            localStorage.setItem(address, JSON.stringify({
                electionData,
                officialsData,
                timestamp: Date.now()
            }));

            displayElectionInfo(electionData);
            displayOfficialsData(officialsData);
        })
        .catch(error => {
            console.error("Error fetching election or officials data:", error);
            document.getElementById("electionInfo").innerHTML = "<p>Error fetching data. Try again later.</p>";
            document.getElementById("electionInfo").style.display = "block";
        });
}

// Fetch Districts & Elected Officials
function displayElectionInfo(data) {
    let electionInfo = "<h3>Upcoming Elections</h3>";

    if (data.election) {
        electionInfo += `
            <p><strong>Election:</strong> ${data.election.name}</p>
            <p><strong>Date:</strong> ${data.election.electionDay}</p>
        `;
    }

    if (data.contests) {
        electionInfo += "<h3>Candidates</h3><ul>";
        data.contests.forEach(contest => {
            if (contest.candidates) {
                contest.candidates.forEach(candidate => {
                    electionInfo += `<li>${candidate.name} (${candidate.party || "No Party"})</li>`;
                });
            }
        });
        electionInfo += "</ul>";
    }

    let infoBox = document.getElementById("electionInfo");
    infoBox.innerHTML = `<button id="closeButton">&times;</button>` + electionInfo;
    infoBox.style.display = "block";

    attachCloseButton();
}

function displayOfficialsData(data) {
    let hierarchy = {
        "United States": {},
        "State": {},
        "County": {},
        "City/Town": {}
    };

    data.offices.forEach((office) => {
        office.officialIndices.forEach(i => {
            let official = data.officials[i];
            let officialEntry = `
                <ul>
                    <li><strong>${official.name}</strong> (${official.party || "No Party"})</li>
                    ${official.phones ? `<li>Phone: ${official.phones[0]}</li>` : ""}
                    ${official.urls ? `<li><a href="${official.urls[0]}" target="_blank">Website</a></li>` : ""}
                </ul>`;

            if (
                office.name.includes("President") ||
                office.name.includes("Vice President") ||
                office.name.includes("U.S. Senator") ||
                office.name.includes("U.S. House") ||
                (office.name.includes("U.S. Representative") && office.divisionId.includes("/cd:"))
            ) {
                if (!hierarchy["United States"][office.name]) hierarchy["United States"][office.name] = [];
                hierarchy["United States"][office.name].push(officialEntry);
            } else if (
                office.name.includes("Governor") ||
                office.name.includes("State Senator") ||
                office.name.includes("State Representative") ||
                office.name.includes("Secretary of State") ||
                office.name.includes("Attorney General") ||
                office.name.includes("State Treasurer")
            ) {
                if (!hierarchy["State"][office.name]) hierarchy["State"][office.name] = [];
                hierarchy["State"][office.name].push(officialEntry);
            } else if (
                office.name.includes("County") || 
                office.name.includes("Sheriff") || 
                office.name.includes("County Executive")
            ) {
                if (!hierarchy["County"][office.name]) hierarchy["County"][office.name] = [];
                hierarchy["County"][office.name].push(officialEntry);
            } else if (
                office.name.includes("Mayor") ||
                office.name.includes("City")
            ) {
                if (!hierarchy["City/Town"][office.name]) hierarchy["City/Town"][office.name] = [];
                hierarchy["City/Town"][office.name].push(officialEntry);
            }
        });
    });

    let structuredInfo = `<h3>Your Elected Officials</h3>`;
    for (let level in hierarchy) {
        if (Object.keys(hierarchy[level]).length > 0) {
            structuredInfo += `<details><summary><strong>${level}</strong></summary>`;
            for (let office in hierarchy[level]) {
                structuredInfo += `<details><summary><strong>${office}</strong></summary>`;
                structuredInfo += hierarchy[level][office].join("");
                structuredInfo += `</details>`;
            }
            structuredInfo += `</details>`;
        }
    }

    document.getElementById("electionInfo").innerHTML += structuredInfo;
}

// Attach Close Button Functionality
function attachCloseButton() {
    document.querySelector("#electionInfo").addEventListener("click", function (event) {
        if (event.target && event.target.id === "closeButton") {
            this.style.display = "none";  // Hides the election info box
        }
    });
}

// Login Modal Functionality
document.addEventListener("DOMContentLoaded", function () {
    const loginLink = document.getElementById("loginLink");
    const loginModal = document.getElementById("loginModal");
    const closeButton = document.querySelector(".close-button");

    // Open Modal
    loginLink.addEventListener("click", function (event) {
        event.preventDefault();
        loginModal.style.display = "flex";
    });

    // Close Modal with 'X'
    closeButton.addEventListener("click", function () {
        loginModal.style.display = "none";
    });

    // Close Modal by Clicking Outside
    window.addEventListener("click", function (event) {
        if (event.target === loginModal) {
            loginModal.style.display = "none";
        }
    });
});

