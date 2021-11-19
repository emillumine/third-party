function init_my_info() {
    init_my_info_data();

    $(".member_email").text(partner_data.email);

    if (partner_data.is_in_association === false) {
        $("#attached_info_area").hide();
    }

    if (partner_data.is_associated_people === "True") {
        $(".attached_partner_name").text(partner_data.parent_name);
    } else if (partner_data.associated_partner_id !== "False") {
        $(".attached_partner_name").text(partner_data.associated_partner_name);
    }

    $(".member_address").empty();
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

    $(".member_mobile").empty();
    if (partner_data.mobile !== "" && partner_data.mobile !== "False" && partner_data.mobile !== false && partner_data.mobile !== null) {
        $(".member_mobile")
            .append(partner_data.mobile);
    } else {
        $(".member_mobile").hide();
    }
    
    $(".member_phone").empty();
    if (partner_data.phone !== "" && partner_data.phone !== "False" && partner_data.phone !== false && partner_data.phone !== null) {
        $(".member_phone")
            .append(partner_data.phone);
    } else {
        $(".member_phone").hide();
    }

    if ($(".member_mobile").text() === "" && $(".member_phone").text() === "") {
        $(".member_phone_line").hide();
    }

    $('#edit_address').off('click').on('click', (e) => {
        $("#street_form").val(partner_data.street);
        $("#street2_form").val(partner_data.street2);
        $("#city_form").val(partner_data.city);
        $('#edit_address_value').hide();
        $('#edit_address_form').show();
    });
    $('#cancel_edit_address').on('click', (e) => {
        $('#edit_address_form').hide();
        $('#edit_address_value').show();
    });
    $('#save_edit_address').off('click').on('click', (e) => {
        data= [];
        data['street']= $("#street_form").val();
        data['street2']= $("#street2_form").val();
        data['city']= $("#city_form").val();

        saveInfo(data, 'address')
    });

    $('#edit_phone').off('click').on('click', (e) => {
        $("#phone_form").val(partner_data.phone);
        $("#mobile_form").val(partner_data.mobile);
        $('#edit_phone_value').hide();
        $('#edit_phone_form').show();
    });
    $('#cancel_edit_phone').off('click').on('click', (e) => {
        $('#edit_phone_form').hide();
        $('#edit_phone_value').show();
    });
    $('#save_edit_phone').off('click').on('click', (e) => {
        console.log('ici');
        data =[];
        data['phone']= $("#phone_form").val();
        data['mobile']= $("#mobile_form").val();

        
        saveInfo(data, 'phone')
    });

}

function saveInfo(data, field){

        

    tData = '&idPartner=' + partner_data.partner_id
    + '&shift_type=' + partner_data.shift_type
    + '&verif_token=' + partner_data.verif_token
    for(d in data){
        tData+="&"+d+"="+data[d];
    }


    tUrl = '/members/save_partner_info';
    $.ajax({
        type: 'POST',
        url: tUrl,
        dataType:"json",
        data: tData,
        timeout: 3000,
        success: function(res) {
            for(d in data){
                partner_data[d]=data[d]
            }
            init_my_info();
            if(field == 'address'){
                $('#edit_address_form').hide();
                $('#edit_address_value').show();
            }
            if(field == 'phone'){
                $('#edit_phone_form').hide();
                $('#edit_phone_value').show();
            }
        },
        error: function(error) {
            console.log(error)
        }
    });
}