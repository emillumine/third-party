/* Toggle between adding and removing the "responsive" class to topnav when the user clicks on the icon */
function toggleHeader() {
    var x = document.getElementById("topnav");
    if (x.className === "topnav") {
      x.className += " responsive";
    } else {
      x.className = "topnav";
    }
} 

$(document).ready(function() {
    // let location = window.location.href.substring(window.location.href.lastIndexOf('/') + 1);
    var url = window.location.href.replace(/\/$/, '');  /* remove optional end / */ 
    var location = url.substr(url.lastIndexOf('/') + 1);
    
    $(".nav_item").removeClass('active');
    if (location === "mes-infos") {
        $("#nav_my_info").addClass("active");
    } else {
        $("#nav_home").addClass("active");
    }

    // Navbar redirections
    let base_location = (app_env === 'dev') ? '/members-space/' : '/';

    $('#nav_home').on('click', function() {
        document.location.href = base_location;
    });
    $('#nav_my_info').on('click', function() {
        document.location.href = base_location + "mes-infos";
    });
});
