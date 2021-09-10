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
        if (current_location !== "home") {
            goto('home');
        }
    });
    $('#nav_my_info').on('click', function() {
        if (current_location !== "my_info") {
            goto('mes-infos');
        }
    });
    $('#nav_my_shifts').on('click', function() {
        if (current_location !== "my_shifts") {
            goto('mes-services');
        }
    });
    $('#nav_shifts_exchange').on('click', function() {
        if (current_location !== "shifts_exchange") {
            goto('echange-de-services');
        }
    });
});
