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
    $('#nav_home').on('click', (e) => {
        e.preventDefault();
        if (current_location !== "home") {
            goto('home');
        }
        if (document.getElementById("topnav").className !== "topnav") {
            toggleHeader();
        }
    });
    $('#nav_my_info').on('click', (e) => {
        e.preventDefault();
        if (current_location !== "my_info") {
            goto('mes-infos');
        }
        toggleHeader();
    });
    $('#nav_my_shifts').on('click', (e) => {
        e.preventDefault();
        if (current_location !== "my_shifts") {
            goto('mes-services');
        }
        toggleHeader();
    });
    $('#nav_faq').on('click', (e) => {
        e.preventDefault();
        if (current_location !== "faq") {
            goto('faq');
        }
        toggleHeader();
    });
    $('#nav_shifts_exchange').on('click', (e) => {
        e.preventDefault();
        if (current_location !== "shifts_exchange") {
            goto('echange-de-services');
        }
        toggleHeader();
    });
    $('#nav_calendar').prop("href", abcd_calendar_link);
    $('#nav_calendar').on('click', () => {
        toggleHeader();
    });

    if (partner_data.is_associated_people === "True" && block_actions_for_attached_people === "True") {
        $(".pairs_info").show();
    }
});
