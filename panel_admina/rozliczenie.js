let rowsPerPage = 15;
document.addEventListener('DOMContentLoaded', function () {
    const [dateFrom, dateTo] = getLastWeekDates();
    document.getElementById('date-from').value = dateFrom;
    document.getElementById('date-to').value = dateTo;
    updateWeekInfo(dateFrom, dateTo);
    showSkeletonLoader();
    loadAndDisplayData(dateFrom, dateTo);
    document.getElementById('load-data').addEventListener('click', function() {
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        updateWeekInfo(dateFrom, dateTo);
        showSkeletonLoader();
        loadAndDisplayData(dateFrom, dateTo);
    });
    document.getElementById('search').addEventListener('input', function () {
        filterData();
    });
    document.getElementById('city-select').addEventListener('change', function () {
        filterData();
    });
        document.getElementById('rows-per-page').addEventListener('change', function() {
            console.log('Rows per page changed:', this.value);  // Добавьте эту строку

        rowsPerPage = parseInt(this.value);
        console.log('Updated rowsPerPage:', rowsPerPage);  // Добавьте эту строку

        paginateData(globalData);  // Перерисовка таблицы с новым значением rowsPerPage
        document.getElementById('total-pages').textContent = Math.ceil(Object.keys(globalData).length / rowsPerPage);
        // Обновление номера текущей страницы
        currentPage = 1;
        updateCurrentPage();
    });
    function filterData() {
        const searchValue = document.getElementById('search').value.toLowerCase();
        const selectedCity = document.getElementById('city-select').value;
        const filteredData = Object.fromEntries(
            Object.entries(globalData).filter(([driverId, driverData]) => {
                const weekData = driverData.weeks?.[Object.keys(driverData.weeks)[0]];
                return (
                    driverId.toLowerCase().includes(searchValue) &&
                    (selectedCity === "all" || weekData?.summary?.city === selectedCity)
                );
            })
        );
        paginateData(filteredData);
        document.getElementById('total-pages').textContent = Math.ceil(Object.keys(filteredData).length / rowsPerPage);
        updateCurrentPage();
    }
});
function updateWeekInfo(dateFrom, dateTo) {
    const weekNumberFrom = getWeekNumber(new Date(dateFrom));
    const weekNumberTo = getWeekNumber(new Date(dateTo));
    document.getElementById('week-info').textContent = `Displaying data for the week: ${dateFrom} to ${dateTo} (Week numbers: ${weekNumberFrom} to ${weekNumberTo})`;
}
function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}
function getLastWeekDates() {
    const now = new Date();
    const lastSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 6);
    const formatDate = date => date.toISOString().split('T')[0];
    return [formatDate(lastMonday), formatDate(lastSunday)];
}
function updateWeekInfo(dateFrom, dateTo) {
    document.getElementById('week-info').textContent = `Displaying data for the week: ${dateFrom} to ${dateTo}`;
}
let globalData = null; 
function loadAndDisplayData(dateFrom, dateTo) {
    const weekNumberFrom = getWeekNumber(new Date(dateFrom));
    const weekNumberTo = getWeekNumber(new Date(dateTo));
    const apiUrl = `https://us-central1-ccmcolorpartner.cloudfunctions.net/getDriversDataForWeek?weekNumber=${weekNumberFrom}`;
    console.log(`Loading data for the week from: ${dateFrom} to: ${dateTo} (Week numbers: ${weekNumberFrom} to ${weekNumberTo})`);
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            globalData = data; 
            displayDataInTable(data);
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
        });
}
function formatNumber(value) {
    return typeof value === 'number' ? value.toFixed(2) : "N/A";
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
            // Add data to the new row
            newRow.insertCell().appendChild(document.createTextNode(driverId));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.city || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.commission)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.gotowka)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.inne)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.koztyUZ)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.kursy)));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.partner));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.podatek_do_zaplaty)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.przychod_dodatkowy)));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.service.join(", ") || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.status || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.tips)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.total)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_bonus)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_dodatkowy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_przejazdy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.wynajem)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.zus)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.zwrot_kosztow)));
                        for (let i = 0; i < newRow.cells.length; i++) {
                newRow.cells[i].classList.add('data-fade');
            }
        }
    }
        document.getElementById('total-pages').textContent = Math.ceil(Object.keys(data).length / rowsPerPage);
    paginateData(data);
}
let currentPage = 1;
function paginateData(data) {
    console.log('Paginating data with', rowsPerPage, 'rows per page');  // Добавьте эту строку

    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = Object.entries(data).slice(startIndex, endIndex);
    for (const [driverId, driverData] of paginatedData) {
        const weekData = driverData.weeks?.[Object.keys(driverData.weeks)[0]]; 
        if (weekData && weekData.summary) {
            const newRow = tableBody.insertRow();
            newRow.insertCell().appendChild(document.createTextNode(driverId));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.city || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.commission)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.gotowka)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.inne)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.koztyUZ)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.kursy)));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.partner));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.podatek_do_zaplaty)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.przychod_dodatkowy)));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.service.join(", ") || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(weekData.summary.status || "N/A"));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.tips)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.total)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_bonus)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_dodatkowy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.vat_przejazdy)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.wynajem)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.zus)));
            newRow.insertCell().appendChild(document.createTextNode(formatNumber(weekData.summary.zwrot_kosztow)));
        }
    }
}
function nextPage() {
    if (currentPage < Math.ceil(Object.keys(globalData).length / rowsPerPage)) {
        currentPage++;
        paginateData(globalData);
        updateCurrentPage();
    }
}
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        paginateData(globalData);
        updateCurrentPage();
    }
}
function updateCurrentPage() {
    console.log('Updating current page to', currentPage);  // Добавьте эту строку

    document.getElementById('current-page').textContent = currentPage;
}
function showSkeletonLoader(rows = 15, columns = 20) {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";
    for (let i = 0; i < rows; i++) {
        const newRow = tableBody.insertRow();
        for (let j = 0; j < columns; j++) {
            const newCell = newRow.insertCell();
            const textNode = document.createElement('div');
            textNode.className = 'skeleton';
            textNode.style.height = '20px'; // You can adjust this
            textNode.style.width = '100%';
            newCell.appendChild(textNode);
        }
    }
}