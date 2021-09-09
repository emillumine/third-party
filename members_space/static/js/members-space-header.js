/**
 * Toggle the navbar on mobile screens
 */
function toggleHeader() {
    var x = document.getElementById("topnav");

    if (x.className === "topnav") {
        x.className += " responsive";
    } else {
        x.className = "topnav";
    }
}

$(document).ready(function() {
    // Navbar redirections
    $('#nav_home').on('click', function() {
        goto('home');
    });
    $('#nav_my_info').on('click', function() {
        goto('mes-infos');
    });
    $('#nav_my_shifts').on('click', function() {
        goto('mes-services');
    });
    $('#nav_shifts_exchange').on('click', function() {
        goto('echange-de-services');
    });
});
