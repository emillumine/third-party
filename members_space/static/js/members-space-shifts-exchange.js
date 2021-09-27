function init_shifts_list() {
    $(".loading-incoming-shifts").hide();
    $("#shifts_list").show();

    if (incoming_shifts.length === 0) {
        $("#shifts_list").text("Aucun service à venir...");
    } else {
        $("#shifts_list").empty();

        for (shift of incoming_shifts) {
            let shift_line_template = $("#selectable_shift_line_template");
            let datetime_shift_start = new Date(shift.date_begin);

            let f_date_shift_start = datetime_shift_start.toLocaleDateString("fr-fr", date_options);

            f_date_shift_start = f_date_shift_start.charAt(0).toUpperCase() + f_date_shift_start.slice(1);

            shift_line_template.find(".shift_line_date").text(f_date_shift_start);
            shift_line_template.find(".shift_line_time").text(datetime_shift_start.toLocaleTimeString("fr-fr"));

            $("#shifts_list").append(shift_line_template.html());
        }
    }
}

function init_shifts_exchange() {
    // TODO : block everything if is_associated_people (or just block actions ?)

    if (incoming_shifts !== null) {
        init_shifts_list();
    } else {
        load_partner_shifts(partner_data.concerned_partner_id)
            .then(init_shifts_list);
    }

    const vw = window.innerWidth;
    const default_initial_view = (vw <=768) ? 'listWeek' : 'dayGridMonth';

    const hidden_days = $.map(days_to_hide.split(", "), Number);

    const calendarEl = document.getElementById('calendar');
    let calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'fr',
        initialView: default_initial_view,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listWeek,timeGridDay'
        },
        eventTimeFormat: {
            hour: '2-digit',
            minute: '2-digit'
        },
        allDaySlot: false,
        contentHeight: "auto",
        eventDisplay: "block",
        hiddenDays: hidden_days,
        events: '/shifts/get_list_shift_calendar/' + partner_data.partner_id,
        eventClick: function(info) {
            console.log(info);
        }
    });

    calendar.render();
}