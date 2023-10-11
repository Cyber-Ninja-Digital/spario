document.addEventListener("DOMContentLoaded", (e) => {
    function t() {
        let e = parseFloat(document.getElementById("gross-amount").value),
            t = parseFloat(document.getElementById("vat-rate").value),
            n = (e * t) / (1 + t);
        (document.getElementById("vat-amount").value = n.toFixed(2)), (document.getElementById("vat-return").value = (0.5 * n).toFixed(2));
    }
    function n() {
        let e = parseFloat(document.getElementById("gross-amount").value),
            t = parseFloat(document.getElementById("vat-rate").value);
        document.getElementById("net-amount").value = (e / (1 + t)).toFixed(2);
    }
function a(e, t) {
firebase.auth().onAuthStateChanged(n => {
    if (n) { 
        let a = firebase.auth().currentUser.uid;
        console.log("Current UID:", a); 
        firebase.firestore().collection("companies").doc(companyId).collection("users").doc(a).get().then(n => {
            if (n.exists) {
                let a = n.data().driverId;
                let i = new Date;
                let l = i.getDate() - i.getDay() + (0 === i.getDay() ? -6 : 1);
                let o = new Date(i.setDate(l));
                let s = `${o.getFullYear()}-${o.getMonth() + 1}-${o.getDate()}`;
                let storageRef = firebase.storage().ref(`companies/${companyId}/invoices/${a}/${s}/${e.name}`);
                let u = storageRef.put(e);
                u.on(firebase.storage.TaskEvent.STATE_CHANGED, function(snapshot) {
                }, function(error) {
                    console.error("Error uploading file:", error); 
                }, function() {
                    console.log("File uploaded successfully");
                    u.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                        console.log("File available at", downloadURL);
                        t.fileURL = downloadURL;
                        realtimeDb.ref().child(`companies/${companyId}/drivers/${a}/invoices`).push(t);
                        document.getElementById("invoice-form").reset();
                        alert("Faktura została pomyślnie dodana. Możesz dodać kolejną fakturę!");
                    });
                });
            } else {
                console.log("User document does not exist!"); 
            }
        }).catch(e => {
            console.log("Error getting user document:", e); 
        });
    } else {
        console.log("User is not authenticated!"); 
    }
});
}
document.getElementById("gross-amount").addEventListener("input", t),
        document.getElementById("vat-rate").addEventListener("change", t),
        document.getElementById("gross-amount").addEventListener("input", n),
        document.getElementById("vat-rate").addEventListener("change", n),
        firebase.auth().onAuthStateChanged((e) => {
            if (e) {
                let t = e.uid;
                firebase
                    .firestore()
                    .collection(`companies/${companyId}/users`)
                    .doc(t)
                    .get()
                    .then((e) => {
                        if (e.exists) {
                            let t = e.data().driverId;
                            realtimeDb
                                .ref()
                                .child(`companies/${companyId}/drivers/` + t + "/invoices")
                                .on(
                                    "value",
                                    (e) => {
                                        let t = e.val(),
                                            n = document.getElementById("invoices-table").getElementsByTagName("tbody")[0];
                                        for (let a in ((n.innerHTML = ""), t)) {
                                            let i = t[a],
                                                l = n.insertRow();
                                            (l.insertCell().innerText = i.numerfaktury),
                                                (l.insertCell().innerText = i.purchaseDate),
                                                (l.insertCell().innerText = i.type),
                                                (l.insertCell().innerText = i.registrationNumber || ""),
                                                (l.insertCell().innerText = i.nipseller),
                                                (l.insertCell().innerText = i.liters),
                                                (l.insertCell().innerText = i.fuelType),
                                                (l.insertCell().innerText = i.grossAmount),
                                                (l.insertCell().innerText = i.vatRate),
                                                (l.insertCell().innerText = i.netAmount),
                                                (l.insertCell().innerText = i.vatAmount),
                                                (l.insertCell().innerText = i.vatReturn),
                                                (l.insertCell().innerText = i.status);
                                            let o = l.insertCell();
                                            i.fileURL ? (o.innerHTML = '<a href="' + i.fileURL + '" target="_blank">Zobacz fakturę</a>') : (o.innerText = "Nie ma pliku"),
                                                (l.insertCell().innerHTML = '<button class="delete-btn" data-invoice-id="' + a + '">Usuń</button>');
                                        }
                                    },
                                    (e) => {
                                        console.error("Error reading from database", e);
                                    }
                                );
                        } else console.log("No such document!");
                    })
                    .catch((e) => {
                        console.log("Error getting document:", e);
                    });
            }
        }),
        document.getElementById("net-amount").addEventListener("input", t),
        document.getElementById("vat-rate").addEventListener("change", t),
        document.getElementById("type").addEventListener("change", function () {
            "paragon" === this.value ? (document.getElementById("registration-number-container").style.display = "block") : (document.getElementById("registration-number-container").style.display = "none");
        }),
        document.getElementById("net-amount").addEventListener("input", n),
        document.getElementById("vat-rate").addEventListener("change", n),
        document.getElementById("invoice-form").addEventListener("submit", function (e) {
            e.preventDefault();
            var t,
                n = document.querySelectorAll("#invoice-form input");
            if (!n) {
                console.log("No input elements found in the form.");
                return;
            }
            if (
                (t =
                    "paragon" === document.getElementById("type").value
                        ? Array.prototype.every.call(n, function (e) {
                              return "" !== e.value;
                          })
                        : Array.prototype.every.call(n, function (e) {
                              return "registration-number" === e.id || "" !== e.value;
                          }))
            ) {
                let i = {
                    numerfaktury: document.getElementById("numer-faktury").value,
                    purchaseDate: document.getElementById("purchase-date").value,
                    type: document.getElementById("type").value,
                    nipseller: document.getElementById("nip-seller").value,
                    liters: document.getElementById("liters").value,
                    fuelType: document.getElementById("fuel-type").value,
                    grossAmount: document.getElementById("gross-amount").value,
                    vatRate: document.getElementById("vat-rate").value,
                    netAmount: document.getElementById("net-amount").value,
                    vatAmount: document.getElementById("vat-amount").value,
                    vatReturn: document.getElementById("vat-return").value,
                    status: "w trakcie sprawdzenia",
                };
                i.registrationNumber || (i.registrationNumber = "Nie dotyczy"), "paragon" === i.type && (i.registrationNumber = document.getElementById("registration-number").value);
                let l = document.getElementById("invoice-file").files[0];
                l
                    ? imageCompression(l, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: !0 })
                          .then(function (e) {
                              console.log("compressedFile instanceof Blob", e instanceof Blob), console.log(`compressedFile size ${e.size / 1024 / 1024} MB`), a((l = e), i);
                          })
                          .catch(function (e) {
                              console.log(e.message);
                          })
                    : a(l, i);
            } else alert("Proszę wypełnić wszystkie pola.");
        });
}),
    document.getElementById("invoices-table").addEventListener("click", function (e) {
        if (e.target.classList.contains("delete-btn")) {
            let t = e.target.getAttribute("data-invoice-id");
            firebase.auth().onAuthStateChanged((e) => {
                if (e) {
                    let n = firebase.auth().currentUser.uid;
firebase.firestore().collection("companies").doc(companyId).collection("users").doc(a).get().then(n => {
                            if (e.exists) {
                                let n = e.data().driverId;
                                realtimeDb
                                    .ref()
                                    .child("drivers/" + n + "/invoices/" + t)
                                    .once("value", function (e) {
                                        let t = e.val();
                                        "w trakcie sprawdzenia" === t.status
                                            ? (firebase
                                                  .storage()
                                                  .ref(`companies/${companyId}/invoices/${n}/${t.week}/${t.fileName}`)
                                                  .delete()
                                                  .then(function () {
                                                      console.log("File deleted successfully");
                                                  })
                                                  .catch(function (e) {
                                                      console.error("Error deleting file", e);
                                                  }),
                                              r.remove(),
                                              alert("Faktura została usunięta."))
                                            : alert('Tylko faktury ze statusem "w trakcie sprawdzenia" mogą być usunięte.');
                                    });
                            } else console.log("No such document!");
                        })
                        .catch((e) => {
                            console.log("Error getting document:", e);
                        });
                }
            });
        }
    });