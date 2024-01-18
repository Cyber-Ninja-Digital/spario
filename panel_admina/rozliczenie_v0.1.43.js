  let rowsPerPage = 15;
let sortDirections = Array(23).fill(true);  // For 22 columns
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
        // Event listener for hiding drivers with kursy = 0
        document.getElementById('hide-zero-kursy').addEventListener('click', hideZeroKursy);

        // Event listeners for sorting table when column headers are clicked
        let headers = document.querySelectorAll("#data-table th");
        headers.forEach((header, index) => {
            header.addEventListener('click', () => sortTable(index));
        });
});

function updateWeekInfo(week) {
    document.getElementById('week-info').textContent = `Displaying data for the week: ${latestWeek}`;
}
let globalData = null; 
let currentWeekNumber; 
function loadAndDisplayData() {
    showSkeletonLoader();
    // Загрузите доступные недели
    fetch('https://us-central1-ccmcolorpartner.cloudfunctions.net/getAvailableWeeks')
    .then(response => response.json())
.then(weeks => {
    // Сортируем недели в порядке убывания
    weeks.sort((a, b) => {
        const [weekA, yearA] = a.split('-').map(Number);
        const [weekB, yearB] = b.split('-').map(Number);
        return yearB - yearA || weekB - weekA;
    });

    // Обновление списка недель в user interface (UI)
    const select = document.getElementById('week-select');
    select.innerHTML = weeks.map(week => `<option value="${week}">${week}</option>`);

    // Загрузите данные для последней недели в списке
    const latestWeek = weeks[0];
    select.value = latestWeek;
    loadAndDisplayWeekData(latestWeek);
    updateWeekInfo(latestWeek);
})
}
// Глобальная переменная для хранения номера недели
function loadAndDisplayWeekData(week) {
      const apiUrl = `https://us-central1-ccmcolorpartner.cloudfunctions.net/getDriversDataForWeek?weekNumber=${week}`;
    console.log(`Loading data for week: ${week}`);

    currentWeekNumber = week; // Сохраняем номер недели в глобальную переменную
    console.log(`Loading data for the week from: (Week numbers: ${week})`);
    
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

            // Update button state, text, and style based on data
            const isAnyDriverAwaiting = checkIfAnyDriverAwaitingApproval(data);
            const button = document.getElementById('update-summary-status');
            button.disabled = !isAnyDriverAwaiting;
            if (isAnyDriverAwaiting) {
                button.classList.remove('button-disabled'); // Удалите класс для активной кнопки
            } else {
                button.classList.add('button-disabled'); // Добавьте класс для неактивной кнопки
            }
        })
        .catch(error => {
            console.error('Error fetching data: ', error);
        });
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
    // Пробуем преобразовать строку в число
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
            // Add data to the new row
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
            // Добавляем ячейку для кнопки 'Szczegóły'
            const detailButtonCell = newRow.insertCell();
            const detailButton = document.createElement('button');
            detailButton.textContent = 'Szczegóły';
            detailButton.dataset.driverId = driverId; // Сохраняем идентификатор в атрибуте данных
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
          // Добавляем ячейку для кнопки 'Szczegóły'
            const detailButtonCell = newRow.insertCell();
            const detailButton = document.createElement('button');
            detailButton.textContent = 'Szczegóły';
            detailButton.dataset.driverId = driverId; // Сохраняем идентификатор в атрибуте данных
            detailButton.addEventListener('click', showDetailsModal);
            detailButtonCell.appendChild(detailButton);

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
function showSkeletonLoader(rows = 17, columns = 23) {
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
function hideZeroKursy() {
    filterZeroKursy();
    paginateData(globalData);
    document.getElementById('total-pages').textContent = Math.ceil(Object.keys(globalData).length / rowsPerPage);
    currentPage = 1;  // Reset to first page after filtering
    updateCurrentPage();
}

function filterZeroKursy() {
    globalData = Object.fromEntries(
        Object.entries(globalData).filter(([driverId, driverData]) => {
            const weekData = driverData.weeks?.[Object.keys(driverData.weeks)[0]];
            return weekData?.summary?.kursy !== 0;
        })
    );
}

function sortTable(columnIndex) {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    let rows = Array.from(tableBody.getElementsByTagName('tr'));
    const isAscending = sortDirections[columnIndex];
    
    rows.sort((a, b) => {
        let cellA = a.cells[columnIndex].innerText;
        let cellB = b.cells[columnIndex].innerText;

        if (!isNaN(cellA) && !isNaN(cellB)) {  // If it's a number
            cellA = parseFloat(cellA);
            cellB = parseFloat(cellB);
        }

        if (cellA < cellB) return isAscending ? -1 : 1;
        if (cellA > cellB) return isAscending ? 1 : -1;
        return 0;
    });

    // Update the direction for the next time the column is clicked
    sortDirections[columnIndex] = !isAscending;

    // Append the sorted rows to the table body
    tableBody.innerHTML = "";
    for (let row of rows) {
        tableBody.appendChild(row);
    }
}










function setLastWeekDates() {
    const [dateFrom, dateTo] = getLastWeekDates();
    document.querySelector('#date-control input[type="text"]').value = `${dateFrom} - ${dateTo}`;
}
