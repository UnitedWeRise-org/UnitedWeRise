document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("searchInput");

    searchInput.addEventListener("keyup", function () {
        let query = searchInput.value.toLowerCase();
        console.log("Search filter applied: " + query);
        
        // Placeholder for actual filtering logic (modify as needed)
        filterContent(query);
    });
});

// Example function to filter content (modify to match your actual needs)
function filterContent(query) {
    // Example: Filtering navigation links (can be replaced with actual site data)
    let items = document.querySelectorAll("nav ul li a");
    
    items.forEach(item => {
        if (item.textContent.toLowerCase().includes(query)) {
            item.style.display = "inline";
        } else {
            item.style.display = "none";
        }
    });
}
