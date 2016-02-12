var time = 0;

function addTime() {
    if (time < 210) {
        time = time + 5;
    }

    updateMinutes(time);
}

function removeTime() {
    if (time >= 5) {
        time = time - 5;
    }

    updateMinutes(time);
}

function updateMinutes(t) {
    if (t >= 0) {
        document.getElementById("time").innerHTML = hour(t) + ":" + minute(t);
    }
}

function hour(minutes) {
    return Math.floor(minutes / 60)
}

function minute(minutes) {
    if (Math.floor(minutes % 60) < 10) {
        return "0" + Math.floor(minutes % 60);
    } else {
        return Math.floor(minutes % 60);
    }
}

function getTotalMinutes(formattedTime) {
    return parseInt(formattedTime.split(":")[0] * 60) + parseInt(formattedTime.split(":")[1]);
}

function displayAlert() {
    swal({
        title: "Payment",
        html: "<p><input id=\"meter\" name=\"meter\" placeholder=\"Meter Number\"></input><br><input id=\"card\" name=\"card\" placeholder=\"Card Number\"></input><br><input id=\"cvc\" name=\"cvc\" placeholder=\"Card CVC\"></input><br><input id=\"exp_month\" name=\"exp_month\" placeholder=\"Expiration Month\"></input><br><input id=\"exp_year\" name=\"exp_year\" placeholder=\"Expiration Year\"></input>",
        showCancelButton: true,
        closeOnConfirm: false
    }, function() {
        if ($("#meter").val() && $("#card").val() && $("#cvc").val() && $("#exp_month").val() && $("#exp_year").val()) {
            post("/meter/" + $("#meter").val(), {
                "card": $("#card").val(),
                "cvc": $("#cvc").val(),
                "exp_month": $("#exp_month").val(),
                "exp_year": $("#exp_year").val(),
                "minutes": getTotalMinutes($("#time").text())
            });
        } else {
            swal("Error", "Please make sure all information was entered correctly.", "error");
        }
    });
}

function post(path, params, method) {
    method = method || "post";

    var form = document.createElement("form");
    form.setAttribute("method", method);
    form.setAttribute("action", path);

    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            var hiddenField = document.createElement("input");
            hiddenField.setAttribute("type", "hidden");
            hiddenField.setAttribute("name", key);
            hiddenField.setAttribute("value", params[key]);

            form.appendChild(hiddenField);
        }
    }

    document.body.appendChild(form);
    form.submit();
}