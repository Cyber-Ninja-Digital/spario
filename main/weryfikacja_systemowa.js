if ("undefined" == typeof jQuery) console.error("jQuery has not been loaded!");
else {
    function e(e, r) {
        $("#" + e + "_city").prop("required", r), $("#" + e + "_postal_code").prop("required", r), $("#" + e + "_address").prop("required", r), $("#" + e + "_building").prop("required", r), $("#" + e + "_apartment").prop("required", r);
    }
    function r(e) {
        $("#progress-line .step-segment").removeClass("completed");
        for (let r = 0; r < e; r++) $("#progress-line .step-segment").eq(r).addClass("completed");
    }
    console.log("jQuery has been loaded successfully!"),
        $(document).ready(function () {
            async function e(e, r, t, a, s) {
                if (!e || !t) return null;
                var o = firebase
                    .storage()
                    .ref("drives/" + t + "/" + r)
                    .put(e);
                return new Promise((e, r) => {
                    o.on(
                        "state_changed",
                        function (e) {
                            var r = (e.bytesTransferred / e.totalBytes) * 100;
                            switch ((a.css("width", r + "%"), e.state)) {
                                case firebase.storage.TaskState.PAUSED:
                                    s.text("Upload is paused");
                                    break;
                                case firebase.storage.TaskState.RUNNING:
                                    s.text("Uploading...");
                            }
                        },
                        function (e) {
                            s.text("Error during upload: " + e.message), r(e);
                        },
                        async function () {
                            var r = await o.snapshot.ref.getDownloadURL();
                            a.css("background-color", "green"), s.text("Upload completed successfully!"), e(r);
                        }
                    );
                });
            }
            $("#car_type").change(function () {
                "wlasny_samochod" === $(this).val() ? ($("#own_car_details").show(), $("#own_car_details input").attr("required", "required")) : ($("#own_car_details").hide(), $("#own_car_details input").removeAttr("required"));
            }),
                $("#car_type").trigger("change"),
                $("#start").click(function () {
                    $("#greeting").hide(), $("#step_1").css("display", "block").animate({ opacity: 1, transform: "scale(1)" }, 500);
                }),
                $("#next_step_1").click(function () {
                    if (
                        0 == $('input[name="apps"]:checked').length
                            ? ($("#error_step_1").text("Proszę wybrać przynajmniej jedną aplikację."), $('input[name="apps"]').attr("title", "Это поле обязательно для заполнения!").css("border", "2px solid red"), !1)
                            : ($("#error_step_1").text(""), $('input[name="apps"]').removeAttr("title").css("border", ""), !0)
                    ) {
                        var e = $("#checkbox-bolt").prop("checked"),
                            t = $("#checkbox-uber").prop("checked"),
                            a = $("#checkbox-freenow").prop("checked");
                        db
                            .collection("users")
                            .doc(currentUserId)
                            .collection("dokumenty")
                            .doc("aplikacje")
                            .set({ Bolt: e, Uber: t, FreeNow: a })
                            .then(function () {
                                console.log("Step 1 data successfully saved for user: ", currentUserId);
                            })
                            .catch(function (e) {
                                console.error("Error saving data: ", e);
                            }),
                            $("#step_1").css("display", "none"),
                            $("#step_2").css("display", "block").animate({ opacity: 1, transform: "scale(1)" }, 500),
                            r(1);
                    }
                }),
                $("#next_step_2").click(async function () {
                    if (
                        (function e() {
                            r = "wlasny_samochod" === $("#car_type").val() ? $("#own_car_details input") : $("#step_2 input:file:not(#own_car_details input)");
                            var r,
                                t = !0,
                                a = [];
                            if (
                                (r.each(function () {
                                    if (!$(this).val()) {
                                        t = !1;
                                        var e = $("label[for='" + $(this).attr("id") + "']").text();
                                        a.push(e);
                                    }
                                }),
                                t)
                            )
                                return $("#error_step_2").text(""), r.removeAttr("title").css("border", ""), !0;
                            var s = "Proszę wypełnić następujące pola: " + a.join(", ");
                            return (
                                $("#error_step_2").text(s),
                                r.each(function () {
                                    $(this).val() ? $(this).removeAttr("title").css("border", "") : $(this).attr("title", "Это поле обязательно для заполнения!").css("border", "2px solid red");
                                }),
                                !1
                            );
                        })()
                    ) {
                        var t = $("#driver_license_front").prop("files")[0],
                            a = $("#driver_license_back").prop("files")[0],
                            s = $("#identity_proof").prop("files")[0],
                            o = $("#car_registration_front").prop("files")[0],
                            n = $("#car_registration_back").prop("files")[0],
                            i = $("#car_insurance").prop("files")[0],
                            c = $("#car_type").val(),
                            d = $("#citizenship").val(),
                            l = $("#driver_license_expiry").val(),
                            p = $("#identity_proof_expiry").val(),
                            u = $("#car_registration_expiry").val(),
                            f = $("#car_insurance_expiry").val();
                        let g = (await db.collection("users").doc(currentUserId).get()).data().driverId;
                        var y = await e(t, "driverLicenseFront", g, $("#driver_license_front").next(".uploadProgressContainer").find(".uploadProgressBar"), $("#driver_license_front").next(".uploadProgressContainer").find(".uploadStatus")),
                            v = await e(a, "driverLicenseBack", g, $("#driver_license_back").next(".uploadProgressContainer").find(".uploadProgressBar"), $("#driver_license_back").next(".uploadProgressContainer").find(".uploadStatus")),
                            h = await e(s, "identityProof", g, $("#identity_proof").next(".uploadProgressContainer").find(".uploadProgressBar"), $("#identity_proof").next(".uploadProgressContainer").find(".uploadStatus")),
                            k = await e(
                                o,
                                "carRegistrationFront",
                                g,
                                $("#car_registration_front").next(".uploadProgressContainer").find(".uploadProgressBar"),
                                $("#car_registration_front").next(".uploadProgressContainer").find(".uploadStatus")
                            ),
                            w = await e(
                                n,
                                "carRegistrationBack",
                                g,
                                $("#car_registration_back").next(".uploadProgressContainer").find(".uploadProgressBar"),
                                $("#car_registration_back").next(".uploadProgressContainer").find(".uploadStatus")
                            ),
                            m = await e(i, "carInsurance", g, $("#car_insurance").next(".uploadProgressContainer").find(".uploadProgressBar"), $("#car_insurance").next(".uploadProgressContainer").find(".uploadStatus"));
                        db
                            .collection("users")
                            .doc(currentUserId)
                            .collection("dokumenty")
                            .doc("samochod")
                            .set({
                                car_type: c,
                                citizenship: d,
                                prawo_jazdy: { przod: y, tyl: v, expiryDate: l, status: "W trakcie sprawdzenia" },
                                dowod_tozsamosci: { file: h, expiryDate: p, status: "W trakcie sprawdzenia" },
                                dowod_rejestracyjn: { przod: k, tyl: w, expiryDate: u, status: "W trakcie sprawdzenia" },
                                polisa_oc: { file: m, expiryDate: f, status: "W trakcie sprawdzenia" },
                            })
                            .then(function () {
                                console.log("Step 2 data successfully saved for user: ", currentUserId);
                            })
                            .catch(function (e) {
                                console.error("Error saving data: ", e);
                            }),
                            $("#step_2").css("display", "none"),
                            $("#step_3").css("display", "block").animate({ opacity: 1, transform: "scale(1)" }, 500),
                            r(2);
                    }
                }),
                $("#submit").click(function () {
                    var e, t;
                    if (
                        ((e = $('#step_3 input[type="text"], #step_3 input[type="date"]')),
                        (t = !0),
                        e.each(function () {
                            $(this).val() || (t = !1);
                        }),
                        t)
                    ) {
                        var a = $("#residence_address").val() + " " + $("#residence_building").val() + "/" + $("#residence_apartment").val() + ", " + $("#residence_postal_code").val() + " " + $("#residence_city").val(),
                            s = $("#registration_address").val() + " " + $("#registration_building").val() + "/" + $("#registration_apartment").val() + ", " + $("#registration_postal_code").val() + " " + $("#registration_city").val(),
                            o =
                                $("#correspondence_address").val() +
                                " " +
                                $("#correspondence_building").val() +
                                "/" +
                                $("#correspondence_apartment").val() +
                                ", " +
                                $("#correspondence_postal_code").val() +
                                " " +
                                $("#correspondence_city").val(),
                            n = $("#work_status").val(),
                            i = $("#pesel").val(),
                            c = $("#dob").val(),
                            d = $("#rachunekBankowy").val();
                        db.collection("users")
                            .doc(currentUserId)
                            .collection("dokumenty")
                            .doc("dane_personalne")
                            .set({ residenceAddress: a, registrationAddress: s, correspondenceAddress: o, workStatus: n, pesel: i, data_urodzenia: c, rachunekBankowy: d, status: "W trakcie sprawdzenia" })
                            .then(function () {
                                console.log("Step 3 data successfully updated for user: ", currentUserId), $("#step_3").hide(), $("#step_4").css("display", "block").animate({ opacity: 1, transform: "scale(1)" }, 500), r(3);
                            })
                            .catch(function (e) {
                                console.error("Error updating data: ", e);
                            });
                    } else
                        $("#error_step_3").text("Proszę wypełnić wszystkie поля."),
                            e.each(function () {
                                $(this).val() ? $(this).removeAttr("title").css("border", "") : $(this).attr("title", "Это поле обязательно для заполнения!").css("border", "2px solid red");
                            });
                }),
                $("#next_step_4").click(async function () {
                    (await areAllDocumentsSigned())
                        ? ($("#error_step_4").text(""),
                          $("#step_4").hide(),
                          await db.collection("users").doc(currentUserId).update({ systemStatus: "Weryfikacja Systemowa Pozytywna" }),
                          $("#thank_you").css("display", "block").animate({ opacity: 1, transform: "scale(1)" }, 500),
                          setTimeout(function () {
                              window.location.href = "/panel-kierowcy/dashboard";
                          }, 5e3))
                        : $("#error_step_4").text("Proszę zapoznać się и podpisać wszystkie dokumentы."),
                        r(4);
                });
        }),
        $(document).ready(function () {
            $("#car_type").change(function () {
                "partner_car" === $(this).val() ? $("#car_details").hide() : $("#car_details").show();
            });
        }),
        $(document).ready(function () {
            $("#citizenship").change(function () {
                var e = $(this).val();
                "foreigner" === e ? $("#document_hint").text("Zdjęcie karty pobytu, dokumentu potwierdzającego legalność pobytu") : "polish" === e && $("#document_hint").text("Dow\xf3d tożsamości");
            });
        }),
        $(document).ready(function () {
            $("#pesel").on("input", function () {
                var e = $(this).val();
                if (11 === e.length) {
                    var r = parseInt(e.slice(0, 2), 10),
                        t = parseInt(e.slice(2, 4), 10),
                        a = parseInt(e.slice(4, 6), 10);
                    t > 80 ? ((r += 1800), (t -= 80)) : t > 60 ? ((r += 2200), (t -= 60)) : t > 40 ? ((r += 2100), (t -= 40)) : t > 20 ? ((r += 2e3), (t -= 20)) : (r += 1900);
                    var s = r + "-" + (t < 10 ? "0" : "") + t + "-" + (a < 10 ? "0" : "") + a;
                    $("#dob").val(s);
                } else $("#dob").val("");
            });
        }),
        $(document).ready(function () {
            function r(e) {
                $("#" + e + "_city").val($("#residence_city").val()),
                    $("#" + e + "_postal_code").val($("#residence_postal_code").val()),
                    $("#" + e + "_address").val($("#residence_address").val()),
                    $("#" + e + "_building").val($("#residence_building").val()),
                    $("#" + e + "_apartment").val($("#residence_apartment").val());
            }
            $("#residenceToRegistration").change(function () {
                $(this).prop("checked") ? (r("registration"), e("registration", !1), $("#registration_fields").hide()) : (e("registration", !0), $("#registration_fields").show());
            }),
                $("#residenceToCorrespondence").change(function () {
                    $(this).prop("checked") ? (r("correspondence"), e("correspondence", !1), $("#correspondence_fields").hide()) : (e("correspondence", !0), $("#correspondence_fields").show());
                }),
                $("#residenceToRegistration").trigger("change"),
                $("#residenceToCorrespondence").trigger("change");
        });
}
