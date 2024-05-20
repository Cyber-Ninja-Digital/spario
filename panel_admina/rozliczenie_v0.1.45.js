let rowsPerPage = 15;
let sortDirections = Array(23).fill(true); // For 22 columns
let globalData = {}; 
let currentPage = 1;

document.addEventListener('DOMContentLoaded', function () {
    loadAndDisplayData();
    document.getElementById('week-select').addEventListener('change', function() {
        const selectedWeek = this.value;
        loadAndDisplayWeekData(selectedWeek);
    });
    showSkeletonLoader();

    document.getElementById('search').addEventListener('input', function () {
        filterData();
    });
    document.getElementById('city-select').addEventListener('change', function () {
        filterData();
    });
    document.getElementById('rows-per-page').addEventListener('change', function() {
        rowsPerPage = parseInt(this.value);
        paginateData(globalData);
        document.getElementById('total-pages').textContent = Math.ceil(Object.keys(globalData).length / rowsPerPage);
        currentPage = 1;
        updateCurrentPage();
    });
    
    document.getElementById('hide-zero-kursy').addEventListener('click', hideZeroKursy);
    
    let headers = document.querySelectorAll("#data-table th");
    headers.forEach((header, index) => {
        header.addEventListener('click', () => sortTable(index));
    });
});

async function loadAndDisplayData() {
    showSkeletonLoader();
    const weeks = await getAvailableWeeks();
    const select = document.getElementById('week-select');
    select.innerHTML = weeks.map(week => `<option value="${week}">${week}</option>`);
    const latestWeek = weeks[0];
    select.value = latestWeek;
    loadAndDisplayWeekData(latestWeek);
    updateWeekInfo(latestWeek);
}

async function getAvailableWeeks() {
    try {
        const snapshot = await firebase.database().ref('/drivers').once('value');
        const drivers = snapshot.val();
        let weeks = {};

        for (let driverId in drivers) {
            const driverData = drivers[driverId];
            for (let week in driverData.weeks) {
                weeks[week] = true;
            }
        }
        return Object.keys(weeks).sort().reverse();
    } catch (error) {
        console.error('Error fetching weeks: ', error);
        return [];
    }
}

function updateWeekInfo(week) {
    document.getElementById('week-info').textContent = `Wyświetlanie danych za tydzień: ${week}`;
}

async function loadAndDisplayWeekData(week) {
    try {
        const snapshot = await firebase.database().ref('/drivers').once('value');
        const drivers = snapshot.val();
        let weekData = {};

        for (let driverId in drivers) {
            const driverData = drivers[driverId];
            const driverWeekData = driverData.weeks?.[week];
            if (driverWeekData) {
                weekData[driverId] = {
                    balance: driverData.balance,
                    weeks: {
                        [week]: driverWeekData
                    }
                };
            }
        }

        globalData = weekData;
        displayDataInTable(globalData);

        const isAnyDriverAwaiting = checkIfAnyDriverAwaitingApproval(globalData);
        const button = document.getElementById('update-summary-status');
        button.disabled = !isAnyDriverAwaiting;
        if (isAnyDriverAwaiting) {
            button.classList.remove('button-disabled');
        } else {
            button.classList.add('button-disabled');
        }
    } catch (error) {
        console.error('Error fetching data: ', error);
    }
}

function checkIfAnyDriverAwaitingApproval(data) {
    for (const [driverId, driverData] of Object.entries(data)) {
        const weekData = driverData.weeks?.[Object.keys(driverData.weeks)[0]];
        if (weekData && weekData.summary && weekData.summary.status === "Czekam na zatwierdzenie") {
            return true;
        }
    }
    return false;
}

function formatNumber(value) {
    if (typeof value === 'string') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            value = numValue;
        }
    }
    if (typeof value === 'number') {
        return value.toFixed(2);
    } else if (value === null || value === undefined || value === "") {
        return "0";
    } else {
        return "N/A";
    }
}

function displayDataInTable(data) {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";
    const cities = [...new Set(Object.values(data).map(driverData => driverData.weeks[Object.keys(driverData.weeks)[0]]?.summary?.city))];
    const citySelect = document.getElementById('city-select');
    citySelect.innerHTML = `<option value="all">All</option>` + cities.map(city => `<option value="${city}">${city}</option>`).join('');

    for (const [driverId, driverData] of Object.entries(data)) {
        const weekData = driverData.weeks?.[Object.keys(driverData.weeks)[0]];
        if (weekData && weekData.summary) {
            const newRow = tableBody.insertRow();
            newRow.insertCell().appendChild(document.createTextNode(driverId));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.city || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.kursy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.przychod_dodatkowy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.commission)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.gotowka)));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.partner));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.service.join(", ") || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_bonus)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_dodatkowy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_przejazdy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.wynajem)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.zus)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.koztyUZ)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.inne)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.bonusPartnera)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.umowa_najmu)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.roznica)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.zwrot_kosztow)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.podatek_do_zaplaty)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.total)));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.status || "N/A"));
            const detailButtonCell = newRow.insertCell();
            const detailButton = document.createElement('button');
            detailButton.textContent = 'Szczegóły';
            detailButton.dataset.driverId = driverId;
            detailButton.addEventListener('click', showDetailsModal);
            detailButtonCell.appendChild(detailButton);
            for (let i = 0; i < newRow.cells.length; i++) {
                newRow.cells[i].classList.add('data-fade');
            }
        }
    }
    document.getElementById('total-pages').textContent = Math.ceil(Object.keys(data).length / rowsPerPage);
    paginateData(data);
}

function paginateData(data) {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";
    const keys = Object.keys(data);
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    for (let i = start; i < end && i < keys.length; i++) {
        const driverId = keys[i];
        const driverData = data[driverId];
        const weekData = driverData.weeks?.[Object.keys(driverData.weeks)[0]];
        if (weekData && weekData.summary) {
            const newRow = tableBody.insertRow();
            newRow.insertCell().appendChild(document.createTextNode(driverId));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.city || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.kursy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.przychod_dodatkowy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.commission)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.gotowka)));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.partner));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.service.join(", ") || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_bonus)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_dodatkowy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_przejazdy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.wynajem)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.zus)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.koztyUZ)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.inne)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.bonusPartnera)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.umowa_najmu)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.roznica)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.zwrot_kosztow)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.podatek_do_zaplaty)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.total)));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.status || "N/A"));
            const detailButtonCell = newRow.insertCell();
            const detailButton = document.createElement('button');
            detailButton.textContent = 'Szczegóły';
            detailButton.dataset.driverId = driverId;
            detailButton.addEventListener('click', showDetailsModal);
            detailButtonCell.appendChild(detailButton);
            for (let i = 0; i < newRow.cells.length; i++) {
                newRow.cells[i].classList.add('data-fade');
            }
        }
    }
}

function showSkeletonLoader() {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";
    const rows = 10;
    const cols = 23;
    for (let i = 0; i < rows; i++) {
        const newRow = tableBody.insertRow();
        for (let j = 0; j < cols; j++) {
            const newCell = newRow.insertCell();
            newCell.classList.add('skeleton');
        }
    }
}

function filterData() {
    const searchQuery = document.getElementById('search').value.toLowerCase();
    const selectedCity = document.getElementById('city-select').value;
    const filteredData = {};
    for (const [driverId, driverData] of Object.entries(globalData)) {
        const weekData = driverData.weeks?.[Object.keys(driverData.weeks)[0]];
        if (weekData && weekData.summary) {
            const city = weekData.summary.city || "";
            if (
                (driverId.toLowerCase().includes(searchQuery) || city.toLowerCase().includes(searchQuery)) &&
                (selectedCity === "all" || city === selectedCity)
            ) {
                filteredData[driverId] = driverData;
            }
        }
    }
    displayDataInTable(filteredData);
}

function sortTable(columnIndex) {
    const sortedData = Object.entries(globalData).sort((a, b) => {
        const aData = getColumnData(a[1], columnIndex);
        const bData = getColumnData(b[1], columnIndex);

        if (aData < bData) {
            return sortDirections[columnIndex] ? -1 : 1;
        } else if (aData > bData) {
            return sortDirections[columnIndex] ? 1 : -1;
        } else {
            return 0;
        }
    });

    globalData = Object.fromEntries(sortedData);
    sortDirections[columnIndex] = !sortDirections[columnIndex];
    displayDataInTable(globalData);
}

function getColumnData(driverData, columnIndex) {
    const weekData = driverData.weeks?.[Object.keys(driverData.weeks)[0]];
    if (!weekData || !weekData.summary) {
        return "";
    }
    const summary = weekData.summary;
    switch (columnIndex) {
        case 0: return driverData.driverId;
        case 1: return summary.city || "";
        case 2: return summary.kursy;
        case 3: return summary.przychod_dodatkowy;
        case 4: return summary.commission;
        case 5: return summary.gotowka;
        case 6: return summary.partner;
        case 7: return summary.service.join(", ") || "";
        case 8: return summary.vat_bonus;
        case 9: return summary.vat_dodatkowy;
        case 10: return summary.vat_przejazdy;
        case 11: return summary.wynajem;
        case 12: return summary.zus;
        case 13: return summary.koztyUZ;
        case 14: return summary.inne;
        case 15: return summary.bonusPartnera;
        case 16: return summary.umowa_najmu;
        case 17: return summary.roznica;
        case 18: return summary.zwrot_kosztow;
        case 19: return summary.podatek_do_zaplaty;
        case 20: return summary.total;
        case 21: return summary.status || "";
        default: return "";
    }
}

function updateCurrentPage() {
    document.getElementById('current-page').textContent = currentPage;
    paginateData(globalData);
}

document.getElementById('prev-page').addEventListener('click', function() {
    if (currentPage > 1) {
        currentPage--;
        updateCurrentPage();
    }
});

document.getElementById('next-page').addEventListener('click', function() {
    const totalPages = Math.ceil(Object.keys(globalData).length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updateCurrentPage();
    }
});

function hideZeroKursy() {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    const rows = tableBody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const kursyCell = rows[i].getElementsByTagName('td')[2];
        if (kursyCell && parseFloat(kursyCell.textContent) === 0) {
            rows[i].style.display = 'none';
        }
    }
}
