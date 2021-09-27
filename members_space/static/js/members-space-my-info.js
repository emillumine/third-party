function init_my_info() {
    init_my_info_data();

    $(".member_email").text(partner_data.email);

    if (partner_data.is_associated_people === "False") {
        $("#attached_info_area").hide();
    } else {
        $(".attached_partner_name").text(partner_data.parent_name);
    }

    if (partner_data.street !== "") {
        $(".member_address")
            .append(partner_data.street + "<br/>");
        if (partner_data.street2 !== "") {
            $(".member_address")
                .append(partner_data.street2 + "<br/>");
        }
        $(".member_address")
            .append(partner_data.zip + " " + partner_data.city);
    } else {
        $(".member_address_line").hide();
    }

    if (partner_data.mobile !== "") {
        $(".member_mobile")
            .append(partner_data.mobile);
    } else {
        $(".member_mobile_line").hide();
    }

    if (partner_data.phone !== "") {
        $(".member_phone")
            .append(partner_data.phone);
    } else {
        $(".member_phone_line").hide();
    }
}