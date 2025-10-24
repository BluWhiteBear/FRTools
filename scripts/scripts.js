function loadHTML(elementId, file) {
    fetch(file)
        .then(response => response.text())
        .then(html => {
            document.getElementById(elementId).innerHTML = html;
        });
}

function loadComponents() {
    loadHTML("navbar-placeholder", "components/comp_navbar.html");
    //loadHTML("footer-placeholder", "footer.html");
}

document.addEventListener('DOMContentLoaded', () => {
    loadComponents();
    
    // Add observer for navbar loading completion
    const navbarPlaceholder = document.getElementById('navbar-placeholder');
});