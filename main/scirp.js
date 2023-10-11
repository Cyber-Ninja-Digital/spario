function formatNumber(e) {
    return void 0 !== e ? parseFloat(e).toFixed(2) : 0;
}
async function getFirstWeek() {
    let e = await getGlobalCompanyId();
    return new Promise((t, r) => {
        let a = document.getElementById("week-selector");
        realtimeDb.ref(`companies/${e}/drivers`).on("value", (e) => {
            let d = e.val(),
                n = new Set(),
                l;
            for (let s in d) {
                let o = d[s];
                for (let i in o.weeks) n.add(i), l || (l = i);
            }
            (a.innerHTML = ""),
                n.forEach((e) => {
                    let t = document.createElement("option");
                    t.value = e;
                    let r, n;
                    for (let l in d) {
                        let s = d[l];
                        if (s.weeks && s.weeks[e] && s.weeks[e].summary && ((r = s.weeks[e].summary.startDate), (n = s.weeks[e].summary.endDate), r && n)) break;
                    }
                    (t.textContent = `Tydzień ${e} (${r} - ${n})`), a.appendChild(t);
                }),
                l ? t(l) : r("No weeks found.");
        });
    });
}
function displayAllDrivers() {
    document.getElementById("week-selector").addEventListener("change", (e) => {
        displayDriversForWeek(e.target.value);
    });
}
function updateCitySelector() {
    const citySelector = document.getElementById("city-selector");
    const weekSelector = document.getElementById("week-selector"); // Added this line

    getGlobalCompanyId().then(companyId => {
        realtimeDb.ref(`companies/${companyId}/drivers`).on("value", (snapshot) => {
            const drivers = snapshot.val();
            const citiesSet = new Set();
            for (const driverId in drivers) {
                const driver = drivers[driverId];
                for (const week in driver.weeks) {
                    const summary = driver.weeks[week].summary;
                    if (summary && summary.city) {
                        citiesSet.add(summary.city);
                    }
                }
            }

            const cities = Array.from(citiesSet);
            cities.sort();
            citySelector.innerHTML = cities.map(city => `<option value="${city}">${city}</option>`).join("");
        });
    });

    // Add an event listener to the city selector
    citySelector.addEventListener('change', (event) => {
        // Get the selected city and week
        const selectedCity = event.target.value;
        const selectedWeek = weekSelector.value; // Get the selected week from the week selector
        // Call the displayDriversForWeek function with the selected city and week
        displayDriversForWeek(selectedWeek, selectedCity);
    });
}


async function displayDriversForWeek(e, selectedCity) {
    let t = await getGlobalCompanyId(),
        r = document.getElementById("drivers-data-body"),
        a = realtimeDb.ref(`companies/${t}/drivers`);
    a.off(),
    a.once("value").then(snapshot=>{
        let a = snapshot.val(),
                d = [],
                n = document.getElementById("driver-filter").value;
            for (let l in a) {
                if (n && !l.includes(n)) continue;
                let s = a[l];
                if (selectedCity && s.weeks && s.weeks[e] && s.weeks[e].summary && s.weeks[e].summary.city !== selectedCity) {
                    continue;
                }                
                if (s.weeks && s.weeks[e]) {
                    let o = s.weeks[e];
                    if (o.summary) {
                        let i = document.createElement("tr"),
                            m = document.createElement("button");
                        (m.id = `save-button-${l}`),
                            (m.innerText = "Zapisz"),
                            (m.style.display = "none"),
                            (i.innerHTML = `
  <td>${l}</td>
  <td>${e}</td>
  <td>${o.summary.city || "N/A"}</td>
  <td>${o.summary.service ? o.summary.service : "0"}</td>
  <td>${formatNumber(o.summary.kursy)}</td>
  <td>${formatNumber(o.summary.przychod_dodatkowy)}</td>
  <td>${formatNumber(o.summary.commission)}</td>
  <td>${formatNumber(o.summary.gotowka)}</td>
  <td>${formatNumber(o.summary.vat_przejazdy + o.summary.vat_dodatkowy)}</td>
  <td>${formatNumber(o.summary.vat_bonus)}</td>
  <td><input id="partner-value-${l}" value="${formatNumber(o.summary.partner)}" disabled></td>
  <td>${formatNumber(o.summary.zus)}</td>
  <td>${formatNumber(o.summary.inne)}</td>
  <td>${formatNumber(o.summary.wynajem)}</td>
  <td>${formatNumber(o.summary.zwrot_kosztow)}</td>
  <td>${formatNumber(o.summary.podatek_do_zaplaty)}</td>
  <td>${formatNumber(o.summary.total)}</td>
  <td>
    <select id="operation-select-${l}">
      <option value="Rozliczony">Rozliczony</option>
      <option value="Przelew wysłany">Przelew wysłany</option>
      <option value="Przyjęta got\xf3wka">Przyjęta got\xf3wka</option>
      <option value="Edytuj">Edytuj</option>
    </select>
  </td>
  <td>${formatNumber(s.balance)}</td>
  `),
                            r.appendChild(i);
                        let u = document.getElementById(`operation-select-${l}`),
                            y = document.getElementById(`partner-value-${l}`);
                        if (
                            (console.log("Operation select element: ", u),
                            console.log("Partner input element: ", y),
                            i.querySelector("td:last-child").appendChild(m),
                            d.push({ element: i, appElements: [], total: o.summary.total, id: l, driverData: s }),
                            o.apps)
                        )
                            for (let p in o.apps) {
                                let c = o.apps[p],
                                    f = document.createElement("tr");
                                (f.innerHTML = `
                <td></td>
                <td></td>
                <td></td>
                <td>${p}</td>
                <td>${formatNumber(c.kursy)}</td>
                <td>${formatNumber(c.przychod_dodatkowy)}</td>
                <td>${formatNumber(c.commission)}</td>
                <td>${formatNumber(c.gotowka)}</td>
                <td>${formatNumber(c.vat_przejazdy + c.vat_dodatkowy)}</td>
                <td>${formatNumber(c.vat_bonus)}</td>
                <td>${formatNumber(c.partner)}</td>
                <td>${formatNumber(c.zus)}</td>
                <td>${formatNumber(c.wynajem)}</td>
                <td>${formatNumber(c.zwrot_kosztow)}</td>
                <td>${formatNumber(c.podatek_do_zaplaty)}</td>
                <td>${formatNumber(c.total)}</td>
                <td>${formatNumber(c.balance)}</td>
                                <td></td>
                <td>${formatNumber(c.balance)}</td>
              `),
                                    (f.style.display = "none"),
                                    i.addEventListener("click", () => {
                                        "none" === f.style.display ? (f.style.display = "table-row") : (f.style.display = "none");
                                    }),
                                    d[d.length - 1].appElements.push(f);
                            }
                    }
                }
            }
            (r.innerHTML = ""),
                d
                    .sort((e, t) => t.total - e.total)
                    .forEach((e) => {
                        r.appendChild(e.element),
                            e.appElements.forEach((e) => {
                                r.appendChild(e);
                            });
                    });
        }),
        r.addEventListener("change", (r) => {
            let a = r.target,
                d = a.id.split("-").pop();
            if ("SELECT" === a.tagName) {
                let n = a.value;
                console.log("Selected operation: ", n);
                let l = {};
                if ("Przelew wysłany" === n) (l.balance = 0), realtimeDb.ref(`companies/${t}/drivers${d}`).update({ balance: l.balance });
                else if ("Przyjęta got\xf3wka" === n) {
                    let sП = prompt("Wprowadź kwotę przyjętej got\xf3wki");
                    if (s && !isNaN(s))
                        realtimeDb
                            .ref(`companies/${t}/drivers${d}/balance`)
                            .once("value")
                            .then((e) => {
                                let r = e.val();
                                (l.balance = r - Number(s)), realtimeDb.ref(`companies/${t}/drivers${d}`).update({ balance: l.balance });
                            });
                    else {
                        alert("Proszę wprowadzić prawidłową liczbę");
                        return;
                    }
                } else "Edytuj" === n && (console.log("Entered 'Edytuj' case"), (document.getElementById(`save-button-${d}`).style.display = "block"), (document.getElementById(`partner-value-${d}`).disabled = !1));
                (l.operation = n), realtimeDb.ref(`companies/${t}/drivers${d}/weeks/${e}/summary`).update({ status: l.operation });
            } else if ("INPUT" === a.tagName) {
                let o = Number(a.value);
                realtimeDb
                    .ref(`companies/${t}/drivers${d}`)
                    .once("value")
                    .then((r) => {
                        let a = r.val(),
                            n = a.weeks[e].summary.partner;
                        (a.weeks[e].summary.partner = o), (a.weeks[e].summary.total = a.weeks[e].summary.total + n - o), realtimeDb.ref(`companies/${t}/drivers${d}/weeks/${e}/summary`).update(a.weeks[e].summary);
                    });
                let i = {};
                i.weeks = { ...driver.weeks };
                let m = i.weeks[e].summary.partner;
                (i.weeks[e].summary.partner = o), (i.weeks[e].summary.total = i.weeks[e].summary.total + m - o), realtimeDb.ref(`companies/${t}/drivers${d}/weeks/${e}/summary`).update(i.weeks[e].summary);
            }
        }),
        r.addEventListener("click", (r) => {
            let a = r.target;
            if ("BUTTON" !== a.tagName) return;
            let d = a.id.split("-").pop();
            r.preventDefault(), console.log("Save button clicked");
            let n = Number(document.getElementById(`partner-value-${d}`).value);
            realtimeDb
                .ref(`companies/${t}/drivers${d}`)
                .once("value")
                .then((r) => {
                    let l = r.val();
                    (l.weeks[e].summary.partner = n),
                        (l.weeks[e].summary.total = l.weeks[e].summary.total - oldPartnerValue + n),
                        realtimeDb.ref(`companies/${t}/drivers${d}`).update(l),
                        realtimeDb.ref(`companies/${t}/drivers${d}/weeks/${e}/summary`).update({ partner: n }),
                        (a.disabled = !0);
                });
            let l = { ...driver };
            (l.weeks[e].summary.partner = n),
                (l.weeks[e].summary.total = l.weeks[e].summary.total - oldPartnerValue + n),
                realtimeDb.ref(`companies/${t}/drivers${d}`).update(l),
                realtimeDb.ref(`companies/${t}/drivers${d}/weeks/${e}/summary`).update({ partner: n }),
                (a.disabled = !0);
        });
}
document.getElementById("driver-filter").addEventListener("input", function () {
    displayDriversForWeek(document.getElementById("week-selector").value);
}),
document.addEventListener("DOMContentLoaded", function(){
    getFirstWeek().then(e => {
        displayDriversForWeek(e);
        displayAllDrivers(); // call displayAllDrivers after data has been loaded
    }).catch(e => console.error(e));
    updateCitySelector();
});

    document.querySelector("#export-button").addEventListener("click", function () {
        exportTableToCSV("drivers_data.csv");
    }),
    document.querySelectorAll("#drivers-data th").forEach((e) => {
        e.addEventListener("click", () => {
            let t = document.querySelector("#drivers-data").querySelector("tbody"),
                r = Array.prototype.indexOf.call(e.parentNode.children, e),
                a = e.getAttribute("data-sort") || "asc",
                d = Array.from(t.querySelectorAll("tr")).sort((e, t) => {
                    let d = e.children[r].innerText,
                        n = t.children[r].innerText;
                    switch (a) {
                        case "asc":
                            return d > n ? 1 : -1;
                        case "desc":
                            return d < n ? 1 : -1;
                        default:
                            return 0;
                    }
                });
            "asc" === a ? e.setAttribute("data-sort", "desc") : e.setAttribute("data-sort", "asc"),
                d.forEach((e) => {
                    t.appendChild(e);
                });
        });
    }),
    function exportTableToCSV(e) {
    for (var t = [], r = document.querySelectorAll("#drivers-data tr"), a = 0; a < r.length; a++) {
        for (var d = [], n = r[a].querySelectorAll("td, th"), l = 0; l < n.length; l++) {
            let s = n[l].innerText;
            3 === l && (s = s.replace(/,/g, " ")), d.push(s);
        }
        t.push(d.join(","));
    }
    var o = new Blob([t.join("\n")], { type: "text/csv" }),
        i = document.createElement("a");
    (i.download = e), (i.href = window.URL.createObjectURL(o)), (i.style.display = "none"), document.body.appendChild(i), i.click();
}
function updateCitySelector() {
    const citySelector = document.getElementById("city-selector");
    getGlobalCompanyId().then(companyId => {
        realtimeDb.ref(`companies/${companyId}/drivers`).on("value", (snapshot) => {
            const drivers = snapshot.val();
            const citiesSet = new Set();
            for (const driverId in drivers) {
                const driver = drivers[driverId];
                for (const week in driver.weeks) {
                    const summary = driver.weeks[week].summary;
                    if (summary && summary.city) {
                        citiesSet.add(summary.city);
                    }
                }
            }

            const cities = Array.from(citiesSet);
            cities.sort();
            citySelector.innerHTML = cities.map(city => `<option value="${city}">${city}</option>`).join("");
        });
    });
}
document.getElementById("city-selector").addEventListener("change", e => {
    let city = e.target.value;
    let week = document.getElementById("week-selector").value;
    displayDriversForWeek(week, city);
});
