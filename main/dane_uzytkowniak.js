async function populateTable() {
    document.getElementById("users-table-body").innerHTML = "";
    let e = await db.collection("users").get();
    for (let a of e.docs) {
        let t = a.data(),
            o = await db.collection("users").doc(a.id).collection("loginHistory").get(),
            d = [];
        o.forEach((e) => {
            let a = e.data();
            d.push(`Action: ${a.action}, Timestamp: ${a.timestamp.toDate()}`);
        });

        // Fetching data from 'dane_personalne' collection
        const danePersonalneSnapshot = await db.collection("users").doc(a.id).collection("dokumenty").doc('dane_personalne').get();
        const danePersonalneData = danePersonalneSnapshot.data() || {};  // default to empty object if no data
        
        // Fetching data from 'aplikacje' collection
        const aplikacjeSnapshot = await db.collection("users").doc(a.id).collection("dokumenty").doc('aplikacje').get();
        const aplikacjeData = aplikacjeSnapshot.data() || {};  // default to empty object if no data
        
        // Fetching data from 'samochod' collection
        const samochodSnapshot = await db.collection("users").doc(a.id).collection("dokumenty").doc('samochod').get();
        const samochodData = samochodSnapshot.data() || {};

            let s = document.createElement("tr"),
                n = document.createElement("td");
            (n.innerText = t.driverId), s.appendChild(n);
            let i = document.createElement("td");
            (i.innerText = t.email), s.appendChild(i);
            let r = document.createElement("td");
            (r.innerText = t.firstName), s.appendChild(r);
            let l = document.createElement("td");
            (l.innerText = t.lastName), s.appendChild(l);
            let c = document.createElement("td"),
                p = document.createElement("button");
            (p.innerText = "Show Login History"), (p.type = "button"), (p.className = "btn btn-info"), (p.dataset.toggle = "modal"), (p.dataset.target = `#loginHistoryModal${a.id}`), c.appendChild(p), s.appendChild(c);
            let u = document.createElement("td"),
                h = document.createElement("button");
            (h.innerText = "Show Additional Info"), (h.type = "button"), (h.className = "btn btn-info"), (h.dataset.toggle = "modal"), (h.dataset.target = `#additionalInfoModal${a.id}`), u.appendChild(h), s.appendChild(u);
            let m = document.createElement("td");
            (m.innerText = t.systemStatus), s.appendChild(m);
            let w = document.createElement("div");
            (w.className = "modal fade"),
                (w.id = `additionalInfoModal${a.id}`),
                (w.tabIndex = "-1"),
                (w.role = "dialog"),
                (w.innerHTML = `
        <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">User Details</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>

      
      <div class="modal-body">
        <div class="dataBlock">
          <h3>Dane personalne:</h3>
          <p><strong>Driver ID:</strong> ${t.driverId || ""}</p>
<p><strong>Email:</strong> ${t.email || ""}</p>
<p><strong>Imię:</strong> ${t.firstName || ""}</p>
<p><strong>Nazwisko:</strong> ${t.lastName || ""}</p>
<p><strong>Numer telefonu:</strong> ${t.phoneNumber || ""}</p>
          <h7>Adres zamieszkania:</h7>
          <p id="residence_address">${danePersonalneData.residenceAddress || ""}</p>
          <h7>Adres zameldowania:</h7>
          <p id="registration_address">${danePersonalneData.registrationAddress || ""}</p>
          <h7>Adres korespondecyjny:</h7>
          <p id="correspondence_address">${danePersonalneData.correspondenceAddress || ""}</p>
          <h7>Status pracy:</h7>
          <p id="work_status">${danePersonalneData.workStatus || ""}</p>
          <h7>PESEL:</h7>
          <p id="pesel">${danePersonalneData.pesel || ""}</p>
          <h7>Obywatelstwo:</h7>
          <p id="citizenship">${t.citizenship || ""}</p>
          <h7>Data Urodzenia:</h7>
          <p id="dob">${danePersonalneData.data_urodzenia || ""}</p>
          <h7>Rachunek Bankowy:</h7>
          <p id="rachunek_bankowy">${danePersonalneData.rachunekBankowy || ""}</p>
          <h7>Dane personalne status:</h7>
          <select id="personal_status_${a.id}" onchange="updateStatus('dane_personalne.status', '${a.id}', this.value)">
            <option value="W trakcie sprawdzenia" ${danePersonalneData.status === "W trakcie sprawdzenia" ? "selected" : ""}>W trakcie sprawdzenia</option>
            <option value="Zaakceptowane" ${danePersonalneData.status === "Zaakceptowane" ? "selected" : ""}>Zaakceptowane</option>
            <option value="Odrzucone" ${danePersonalneData.status === "Odrzucone" ? "selected" : ""}>Odrzucone</option>
          </select>
        </div>
        <div class="dataBlock">
          <h3>Aplikacje:</h3>
          <h7>Bolt:</h7>
          <p id="bolt">${aplikacjeData.Bolt || ""}</p>
          <h7>Uber:</h7>
          <p id="uber">${aplikacjeData.Uber || ""}</p>
          <h7>FreeNow:</h7>
          <p id="freenow">${aplikacjeData.FreeNow || ""}</p>
        </div>

        <div class="dataBlock">
          <h3>Dokumenty:</h3>
          <h4>Prawo jazdy:</h4>
          <h7>Prawo jazdy prz\xf3d:</h7><a href="${samochodData.prawo_jazdy?.przod?.file || "#"}" target="_blank">otw\xf3rz dokument</a><br>
          <h7>Prawo jazdy tyl:</h7><a href="${samochodData.prawo_jazdy?.tyl?.file || "#"}" target="_blank">otw\xf3rz dokument</a><br>
          <h7>Prawo jazdy ważność:</h7>
          <p id="driver_license_expiry">${samochodData.prawo_jazdy?.expiryDate || ""}</p>
          <h7>Prawo jazdy status:</h7>
          <select id="driver_license_status" onchange="updateStatus('dokumenty.prawo_jazdy.status', '${a.id}', this.value)">
  <option value="w trakcie sprawdzenia" ${samochodData.prawo_jazdy?.status === "w trakcie sprawdzenia" ? "selected" : ""}>W trakcie sprawdzenia</option>
  <option value="Zaakceptowane" ${samochodData.prawo_jazdy?.status === "Zaakceptowane" ? "selected" : ""}>Zaakceptowany</option>
  <option value="odrzucony" ${samochodData.prawo_jazdy?.status === "odrzucony" ? "selected" : ""}>Odrzucony</option>
</select>
        </div>

        <div class="dataBlock">
          <h4>Dow\xf3d tożsamości:</h4>
          <h7>Dow\xf3d tożsamości skan:</h7><a href="${samochodData.dowod_tozsamosci?.file || "#"}" target="_blank">otw\xf3rz dokument</a><br>
          <h7>Dow\xf3d tożsamości ważność:</h7>
          <p id="identity_proof_expiry">${samochodData.dowod_tozsamosci?.expiryDate || ""}</p>
          <h7>Dow\xf3d tożsamości status:</h7>
          <select id="identity_proof_status_${a.id}" onchange="updateStatus('dokumenty.dowod_tozsamosci.status', '${a.id}', this.value)">
            <option value="W trakcie sprawdzenia" ${samochodData.dowod_tozsamosci?.status === "W trakcie sprawdzenia" ? "selected" : ""}>W trakcie sprawdzenia</option>
            <option value="Zaakceptowane" ${samochodData.dowod_tozsamosci?.status === "Zaakceptowane" ? "selected" : ""}>Zaakceptowane</option>
            <option value="Odrzucone" ${samochodData.dowod_tozsamosci?.status === "Odrzucone" ? "selected" : ""}>Odrzucone</option>
          </select>
        </div>

        <div class="dataBlock">
          <h3>Samoch\xf3d:</h3>
          <h4>Dow\xf3d rejestracyjny:</h4>
          <h7>Typ samochodu:</h7>
          <p id="car_type">${samochodData.car_type || ""}</p>
          <h7>Dow\xf3d rejestracji prz\xf3d:</h7><a href="${samochodData.dowod_rejestracyjny?.przod?.file || "#"}" target="_blank">otw\xf3rz dokument</a><br>
          <h7>Dow\xf3d rejestracji tyl:</h7><a href="${samochodData.dowod_rejestracyjny?.tyl?.file || "#"}" target="_blank">otw\xf3rz dokument</a><br>
          <h7>Dow\xf3d rejestracji ważność:</h7>
          <p id="car_registration_expiry">${samochodData.dowod_rejestracyjny?.expiryDate || ""}</p>
          <h7>Dow\xf3d rejestracji status:</h7>
          <select id="car_registration_status_${a.id}" onchange="updateStatus('samochod.dowod_rejestracyjn.status', '${a.id}', this.value)">
            <option value="W trakcie sprawdzenia" ${samochodData.dowod_rejestracyjny?.status === "W trakcie sprawdzenia" ? "selected" : ""}>W trakcie sprawdzenia</option>
            <option value="Zaakceptowane" ${samochodData.dowod_rejestracyjny?.status === "Zaakceptowane" ? "selected" : ""}>Zaakceptowane</option>
            <option value="Odrzucone" ${samochodData.dowod_rejestracyjny?.status === "Odrzucone" ? "selected" : ""}>Odrzucone</option>
          </select>
        </div>

        <div class="dataBlock">
          <h4>Polisa OC:</h4>
          <h7>Polisa OC skan:</h7><a href="${samochodData.polisa_oc?.file || "#"}" target="_blank">otw\xf3rz dokument</a><br>
          <h7>Polisa OC ważność:</h7>
          <p id="car_insurance_expiry">${samochodData.polisa_oc?.expiryDate || ""}</p>
          <h7>Polisa OC status:</h7>
          <select id="car_insurance_status_${a.id}" onchange="updateStatus('samochod.polisa_oc.status', '${a.id}', this.value)">
            <option value="W trakcie sprawdzenia" ${samochodData.polisa_oc?.status === "W trakcie sprawdzenia" ? "selected" : ""}>W trakcie sprawdzenia</option>
            <option value="Zaakceptowane" ${samochodData.polisa_oc?.status === "Zaakceptowane" ? "selected" : ""}>Zaakceptowane</option>
            <option value="Odrzucone" ${samochodData.polisa_oc?.status === "Odrzucone" ? "selected" : ""}>Odrzucone</option>
          </select>
        </div>

        
      </div>
    </div>
  </div>
`),
                u.appendChild(w);
            let y = document.createElement("div");
            (y.className = "modal fade"),
                (y.id = `loginHistoryModal${a.id}`),
                (y.tabIndex = "-1"),
                (y.role = "dialog"),
                (y.innerHTML = `
    <div class="modal-dialog" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">User Details</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          ${d.join("<br>")}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `),
                c.appendChild(y),
                document.getElementById("users-table-body").appendChild(s);
        }
    }
    async function updateStatus(e, a, t) {
        await db
            .collection("users")
            .doc(a)
            .update({ [e]: t });
    }
    populateTable();
