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
      firebase.auth().onAuthStateChanged((n) => {
          if (n) {
              let a = firebase.auth().currentUser.uid;
              firebase
                  .firestore()
                  .collection("users")
                  .doc(a)
                  .get()
                  .then((n) => {
                      if (n.exists) {
                          let a = n.data().driverId,
                              l = new Date(),
                              i = l.getDate() - l.getDay() + (0 === l.getDay() ? -6 : 1),
                              o = new Date(l.setDate(i)),
                              s = `${o.getFullYear()}-${o.getMonth() + 1}-${o.getDate()}`,
                              u = document.getElementById("numer-faktury").value;
                          u = u.replace(/ /g, "_").replace(/\W/g, "");
                          let d = firebase.storage().ref(`invoices/${a}/${s}/${u}`).put(e);
                          d.on(
                              firebase.storage.TaskEvent.STATE_CHANGED,
                              function (e) {},
                              function (e) {
                                  console.error(e);
                              },
                              function () {
                                  console.log("File uploaded successfully"),
                                      d.snapshot.ref.getDownloadURL().then(function (e) {
                                          console.log("File available at", e),
                                              (t.fileURL = e),
                                              realtimeDb.ref().child(`drivers/${a}/invoices`).push(t),
                                              document.getElementById("invoice-form").reset(),
                                              alert("Faktura została pomyślnie dodana. Możesz dodać kolejną fakturę!");
                                      });
                              }
                          );
                      } else console.log("No such document!");
                  })
                  .catch((e) => {
                      console.log("Error getting document:", e);
                  });
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
                  .collection("users")
                  .doc(t)
                  .get()
                  .then((e) => {
                      if (e.exists) {
                          let t = e.data().driverId;
                          realtimeDb
                              .ref()
                              .child("drivers/" + t + "/invoices")
                              .on(
                                  "value",
                                  (e) => {
                                      let t = e.val(),
                                          n = document.getElementById("invoices-table").getElementsByTagName("tbody")[0];
                                      for (let a in ((n.innerHTML = ""), t)) {
                                        let l=t[a],i=n.insertRow(), labels=["Numer Faktury", "Data zakupu", "Typ", "Numer rejestracyjny auta", "NIP Sprzedawcy", "Litry", "Rodzaj paliwa", "Kwota brutto", "Stawka VAT", "Kwota Netto", "Kwota VAT", "VAT Do zwrotu", "Status"];
                                        i.insertCell().outerHTML = `<td data-label="${labels[0]}">${l.numerfaktury}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[1]}">${l.purchaseDate}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[2]}">${l.type}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[3]}">${l.registrationNumber||""}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[4]}">${l.nipseller}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[5]}">${l.liters}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[6]}">${l.fuelType}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[7]}">${l.grossAmount}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[8]}">${l.vatRate}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[9]}">${l.netAmount}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[10]}">${l.vatAmount}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[11]}">${l.vatReturn}</td>`;
                                        i.insertCell().outerHTML = `<td data-label="${labels[12]}">${l.status}</td>`;                                        
                                          let o = i.insertCell();
                                          l.fileURL ? (o.innerHTML = '<a href="' + l.fileURL + '" target="_blank">Zobacz fakturę</a>') : (o.innerText = "Nie ma pliku"),
                                              (i.insertCell().innerHTML = '<button class="delete-btn" data-invoice-id="' + a + '">Usuń</button>');
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
              let l = {
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
              l.registrationNumber || (l.registrationNumber = "Nie dotyczy"), "paragon" === l.type && (l.registrationNumber = document.getElementById("registration-number").value);
              let i = document.getElementById("invoice-file").files[0];
              i
                  ? imageCompression(i, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: !0 })
                        .then(function (e) {
                            console.log("compressedFile instanceof Blob", e instanceof Blob), console.log(`compressedFile size ${e.size / 1024 / 1024} MB`), a((i = e), l);
                        })
                        .catch(function (e) {
                            console.log(e.message);
                        })
                  : a(i, l);
          } else alert("Proszę wypełnić wszystkie pola.");
      });
}),
  document.getElementById("invoices-table").addEventListener("click", function (e) {
      if (e.target.classList.contains("delete-btn")) {
          let t = e.target.getAttribute("data-invoice-id");
          firebase.auth().onAuthStateChanged((e) => {
              if (e) {
                  let n = firebase.auth().currentUser.uid;
                  firebase
                      .firestore()
                      .collection("users")
                      .doc(n)
                      .get()
                      .then((e) => {
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
                                                .ref(`invoices/${n}/${t.week}/${t.fileName}`)
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
