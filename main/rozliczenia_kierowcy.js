
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded");
    auth.onAuthStateChanged((user) => {
        console.log("Auth state changed. User:", user);
        if (user) {
            let uid = user.uid;
            let docRef = db.collection("users").doc(uid);
            docRef.get().then((doc) => {
                console.log("Got user document:", doc);
                if (doc.exists) {
                    let data = doc.data(),
                        driverId = data.driverId;
                        fillWeeksSelector(driverId).then((latestWeek) => {
                            console.log("Filled weeks selector");
                            displayUserData(driverId, latestWeek);
                            fetchDriverSummaryData(driverId, latestWeek);
                            let selector = document.getElementById("week-selector");
                            selector.addEventListener("change", (e) => {
                                console.log("Week selector changed. Event:", e);
                                let week = e.target.value;
                                displayUserData(driverId, week);
                                fetchDriverSummaryData(driverId, week);
                            });
                        });
                        
                }
            }).catch((error) => {
                console.error("Error fetching user data:", error);
            });
        }
    });
});

let currentWeekRef, currentWeekHandler;

function displayUserData(driverId, weekId = null) {
    console.log("Displaying user data for driverId:", driverId, "and weekId:", weekId);
    if (currentWeekRef && currentWeekHandler) {
        console.log("Unsubscribing from previous weekRef");
        currentWeekRef.off('value', currentWeekHandler);
    }

    let weekRef = weekId ? 
        realtimeDb.ref(`drivers/${driverId}/weeks/${weekId}/apps`) : 
        realtimeDb.ref(`drivers/${driverId}/weeks`);

    currentWeekRef = weekRef;

    currentWeekHandler = (snapshot) => {
        console.log("Received snapshot:", snapshot);
        let weekData = snapshot.val();
        console.log("Week data:", weekData);
        if (weekData) for (let appId in weekData) displayAppData(weekData[appId], appId);
    };

    weekRef.on("value", currentWeekHandler);
}

let currentListener = null;

function fetchDriverSummaryData(driverId, weekId = null) {
    console.log("Fetching driver summary data for driverId:", driverId);

    // Unsubscribe from the previous listener
    if (currentListener) {
        let oldRef = realtimeDb.ref(`drivers/${driverId}/weeks`);
        oldRef.off('value', currentListener);
        currentListener = null;
    }

    // Always expect weekId to be provided
    if (!weekId) {
        console.warn("fetchDriverSummaryData called without weekId");
        return;
    }

    let refPath = `drivers/${driverId}/weeks/${weekId}/summary`;
    let ref = realtimeDb.ref(refPath);

    currentListener = ref.on("value", (snapshot) => {
        console.log("Received snapshot for driver summary data:", snapshot);
        let summary = snapshot.val();
        console.log("Driver summary data:", summary);

        if (summary) {
            let vat_total = summary.vat_dodatkowy + summary.vat_przejazdy; // добавьте эту строку
            
            for (let [field, value] of Object.entries(summary)) {
                let elementId = `summary-${field}`,
                    element = document.getElementById(elementId);

                element && (element.textContent = value);
            }

            // Обновите элемент vat_total с помощью расчетного значения
            document.getElementById('summary-vat_total').textContent = vat_total;
        }
    });
}





function displayAppData(e, t) {
    if (e) {
        for (let [n, r] of (e ? Object.entries(e) : [])) {
            let a = `${t}-${n}`,
                l = document.getElementById(a);
            l && (l.textContent = r);
        }
    }
}


function fillWeeksSelector(driverId) {
    const weekSelector = document.getElementById("week-selector");
    const driversRef = realtimeDb.ref(`drivers/${driverId}/weeks`);

    return new Promise((resolve, reject) => {
        driversRef.on('value', snapshot => {
            const weeks = snapshot.val();

            let sortedWeeks = Object.entries(weeks).sort(([aKey, aValue], [bKey, bValue]) => {
                const aWeekNumber = Number(aKey.split('-')[0]);
                const bWeekNumber = Number(bKey.split('-')[0]);
                return bWeekNumber - aWeekNumber; // сортируем в обратном порядке
            });

            // Очистить текущие опции в селекторе
            weekSelector.innerHTML = '';

            // Добавить каждую неделю в селектор
            for (const [week, data] of sortedWeeks) {
                const option = document.createElement("option");
                option.value = week;
                const weekNumber = week.split('-')[0];
                const startDate = data.summary?.startDate || "Brak";
                const endDate = data.summary?.endDate || "Brak";
                option.textContent = `Tydzień ${weekNumber} (${startDate} - ${endDate})`;
                weekSelector.appendChild(option);
            }

            // Выбрать самую свежую неделю
            weekSelector.value = sortedWeeks[0][0];

            resolve(sortedWeeks[0][0]);
        }, reject);
    });
}

