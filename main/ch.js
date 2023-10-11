let cachedData = null;
let currentPage = 1;
const itemsPerPage = 10;

function formatNumber(e) {
    return void 0 !== e ? parseFloat(e).toFixed(2) : 0;
}
function getFirstWeek() {
    return new Promise((e, t) => {
        let r = document.getElementById("week-selector");
        realtimeDb.ref("drivers").on("value", (a) => {
            let d = a.val(),
                l = new Set(),
                n;
            for (let s in d) {
                let m = d[s];
                for (let o in m.weeks) l.add(o), (!n || o > n) && (n = o);
            }
            (r.innerHTML = ""),
                Array.from(l)
                    .sort((e, t) => t - e)
                    .forEach((e) => {
                        let t = document.createElement("option");
                        t.value = e;
                        let a, l;
                        for (let n in d) {
                            let s = data[n];
                            if (s.weeks && s.weeks[e] && s.weeks[e].summary && ((a = s.weeks[e].summary.startDate), (l = s.weeks[e].summary.endDate), a && l)) break;
                        }
                        (t.textContent = `Tydzień ${e} (${a} - ${l})`), r.appendChild(t);
                    }),
                n ? e(n) : t("No weeks found.");
        });
    });
}
function displayAllDrivers() {
    document.getElementById("week-selector").addEventListener("change", (e) => {
        displayDriversForWeek(e.target.value);
    });
}

function displayDriversForWeek(e, data) {
    let t = document.getElementById("drivers-data-body");

    if (!data) {
        realtimeDb.ref("drivers").off();
        realtimeDb.ref("drivers").on("value", (r) => {
            cachedData = r.val();
            displayDriversForWeek(e, cachedData);
        });
        return;
    }

    let d = [],
        l = document.getElementById("driver-filter").value;

    let sortedKeys = Object.keys(data).sort();
    
    for (let i = (currentPage - 1) * itemsPerPage; i < currentPage * itemsPerPage && i < sortedKeys.length; i++) {
        let n = sortedKeys[i];
        if (l && !n.includes(l)) continue;
        let s = a[n];
        if (s.weeks && s.weeks[e]) {
            let m = s.weeks[e];
            if (m.summary) {
                let o = document.createElement("tr"),
                    i = document.createElement("button");
                if (
                    ((i.id = `save-button-${n}`),
                        (i.innerText = "Zapisz"),
                        (i.style.display = "none"),
                        (o.innerHTML = `
<td>${n}</td>
<td>${e}</td>
<td>${m.summary.city || "N/A"}</td>
<td>${m.summary.service ? m.summary.service : "0"}</td>
<td>${formatNumber(m.summary.kursy)}</td>
<td>${formatNumber(m.summary.przychod_dodatkowy)}</td>
<td>${formatNumber(m.summary.commission)}</td>
<td>${formatNumber(m.summary.gotowka)}</td>
<td>${formatNumber(m.summary.vat_przejazdy + m.summary.vat_dodatkowy)}</td>
<td>${formatNumber(m.summary.vat_bonus)}</td>
<td>${formatNumber(m.summary.partner)}</td>
<td>${formatNumber(m.summary.zus)}</td>
<td>${formatNumber(m.summary.inne)}</td>
<td>${formatNumber(m.summary.wynajem)}</td>
<td>${formatNumber(m.summary.zwrot_kosztow)}</td>
<td>${formatNumber(m.summary.roznica)}</td>
<td>${formatNumber(m.summary.umowa_najmu)}</td>
<td>${formatNumber(m.summary.podatek_do_zaplaty)}</td>
<td>${formatNumber(m.summary.total)}</td>
<td>${formatNumber(m.summary.przelew)}</td>
<td>${m.summary.status || "N/A"}</td>
<td>${formatNumber(s.balance)}</td>

`),
                        t.appendChild(o),
                        document.getElementById(`partner-value-${n}`),
                        o.querySelector("td:last-child").appendChild(i),
                        d.push({ element: o, appElements: [], total: m.summary.total, id: n, driverData: s }),
                        m.apps)
                )
                    for (let u in m.apps) {
                        let y = m.apps[u],
                            p = document.createElement("tr");
                        (p.innerHTML = `
        <td></td>
        <td></td>
        <td></td>
        <td>${u}</td>
        <td>${formatNumber(y.kursy)}</td>
        <td>${formatNumber(y.przychod_dodatkowy)}</td>
        <td>${formatNumber(y.commission)}</td>
        <td>${formatNumber(y.gotowka)}</td>
        <td>${formatNumber(y.vat_przejazdy + y.vat_dodatkowy)}</td>
        <td>${formatNumber(y.vat_bonus)}</td>
        <td>${formatNumber(y.partner)}</td>
        <td>${formatNumber(y.zus)}</td>
        <td>${formatNumber(y.inne)}</td>
        <td>${formatNumber(y.wynajem)}</td>
        <td>${formatNumber(y.zwrot_kosztow)}</td>
        <td>${formatNumber(y.podatek_do_zaplaty)}</td>
        <td>${formatNumber(y.total)}</td>
        <td>${formatNumber(y.balance)}</td>
                        <td></td>

      `),
                            (p.style.display = "none"),
                            o.addEventListener("click", () => {
                                "none" === p.style.display ? (p.style.display = "table-row") : (p.style.display = "none");
                            }),
                            d[d.length - 1].appElements.push(p);
                    }
            }
        }
    }
    (t.innerHTML = ""),
        d
            .sort((e, t) => t.total - e.total)
            .forEach((e) => {
                t.appendChild(e.element),
                    e.appElements.forEach((e) => {
                        t.appendChild(e);
                    });
            });
}
document.getElementById("next-page").addEventListener("click", function() {
    currentPage++;
    displayDriversForWeek(selectedWeek, cachedData);
});

document.getElementById("prev-page").addEventListener("click", function() {
    if (currentPage > 1) {
        currentPage--;
        displayDriversForWeek(selectedWeek, cachedData);
    }
});

document.getElementById("driver-filter").addEventListener("input", function () {
    displayDriversForWeek(selectedWeek, cachedData);
});

document.addEventListener("DOMContentLoaded", function () {
    getFirstWeek()
        .then((e) => {
            displayDriversForWeek(e, cachedData);
        })
        .catch((e) => console.error(e));
});


function exportTableToCSV(e) {
    for (var t = [], r = document.querySelectorAll("#drivers-data tr"), a = 0; a < r.length; a++) {
        for (var d = [], l = r[a].querySelectorAll("td, th"), n = 0; n < l.length; n++) {
            let s = l[n].innerText;
            3 === n && (s = s.replace(/,/g, " ")), d.push(s);
        }
        t.push(d.join(","));
    }
    var m = new Blob([t.join("\n")], { type: "text/csv" }),
        o = document.createElement("a");
    (o.download = e), (o.href = window.URL.createObjectURL(m)), (o.style.display = "none"), document.body.appendChild(o), o.click();
}
function displayDriversForCity(e) {
    let t = document.getElementById("drivers-data-body"),
        r = realtimeDb.ref("drivers");
    r.off(),
        r.on("value", (r) => {
            let a = r.val();
            for (let d in ((t.innerHTML = ""), a)) {
                let l = a[d];
                for (let n in l.weeks) {
                    let s = l.weeks[n];
                    if (s.summary && s.summary.city === e) {
                        let m = createRowForDriver(l, n, s);
                        t.appendChild(m);
                    }
                }
            }
        });
}
function displayAppData(e, t) {
    if (e)
        for (let [r, a] of e ? Object.entries(e) : []) {
            let d = `${t}-${r}`,
                l = document.getElementById(d);
            l && (l.textContent = a);
        }
}
function fillWeeksSelector(e) {
    let t = document.getElementById("week-selector"),
        r = realtimeDb.ref(`drivers/${e}/weeks`);
    return new Promise((e, a) => {
        r.on(
            "value",
            (r) => {
                let a = Object.entries(r.val()).sort(([e, t], [r, a]) => {
                    let d = Number(e.split("-")[0]);
                    return Number(r.split("-")[0]) - d;
                });
                for (let [d, l] of ((t.innerHTML = ""), a)) {
                    let n = document.createElement("option");
                    n.value = d;
                    let s = d.split("-")[0],
                        m = l.summary?.startDate || "Brak",
                        o = l.summary?.endDate || "Brak";
                    (n.textContent = `Tydzień ${s} (${m} - ${o})`), t.appendChild(n);
                }
                (t.value = a[0][0]), e(a[0][0]);
            },
            a
        );
    });
}
document.getElementById("driver-filter").addEventListener("input", function () {
    displayDriversForWeek(document.getElementById("week-selector").value);
}),
    document.addEventListener("DOMContentLoaded", function () {
        getFirstWeek()
            .then((e) => {
                displayDriversForWeek(e);
            })
            .catch((e) => console.error(e));
    }),
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
                        l = t.children[r].innerText;
                    switch (a) {
                        case "asc":
                            return d > l ? 1 : -1;
                        case "desc":
                            return d < l ? 1 : -1;
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
    realtimeDb.ref("drivers").on("value", (e) => {
        let t = e.val(),
            r = document.getElementById("city-selector"),
            a = new Set();
        for (let d in t) {
            let l = t[d];
            for (let n in l.weeks) {
                let s = l.weeks[n];
                s.summary && s.summary.city && a.add(s.summary.city);
            }
        }
        (r.innerHTML = ""),
            a.forEach((e) => {
                let t = document.createElement("option");
                (t.value = e), (t.textContent = e), r.appendChild(t);
            });
    }),
    document.getElementById("city-selector").addEventListener("change", (e) => {
        displayDriversForCity(e.target.value);
    }),
    document.getElementById("week-selector").addEventListener("change", (e) => {
        displayDriversForWeek(e.target.value);
    });
