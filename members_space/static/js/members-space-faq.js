
function init_faq() {
    $("#unsuscribe_form_link_btn").prop("href", unsuscribe_form_link);
    $("#unsuscribe_form_link_btn2").prop("href", unsuscribe_form_link);
    $("#change_template_form_link_btn").prop("href", change_template_form_link);
    $("#template_unsubscribe_form_link_btn").prop("href", template_unsubscribe_form_link);
    $("#late_service_form_link_btn").prop("href", late_service_form_link);
    $("#sick_leave_form_link_btn").prop("href", sick_leave_form_link);
    $("#associated_subscribe_form_link_btn").prop("href", associated_subscribe_form_link);
    $("#associated_unsubscribe_form_link_btn").prop("href", associated_unsubscribe_form_link);
    $("#covid_form_link_btn").prop("href", covid_form_link);
    $("#covid_end_form_link_btn").prop("href", covid_end_form_link);
    $("#underage_subscribe_form_link_btn").prop("href", underage_subscribe_form_link);
    $("#change_email_form_link_btn").prop("href", change_email_form_link);
    $("#coop_unsubscribe_form_link_btn").prop("href", coop_unsubscribe_form_link);
    $("#helper_subscribe_form_link_btn").prop("href", helper_subscribe_form_link);
    $("#helper_unsubscribe_form_link_btn").prop("href", helper_unsubscribe_form_link);
    $("#request_form_link_btn2").prop("href", request_form_link);
    $("#request_form_link_btn").prop("href", request_form_link);
}

$(document).on('click', "#shift_exchange_btn", () => {
    goto('echange-de-services');
});

$(document).on('click', '.accordion', function() {
    /* Toggle between adding and removing the "active" class,
    to highlight the button that controls the panel */
    this.classList.toggle("active");

    /* Toggle between hiding and showing the active panel */
    var panel = this.nextElementSibling;

    if (panel.style.display === "block") {
        panel.style.display = "none";
    } else {
        panel.style.display = "block";
    }
});
