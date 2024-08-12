let rowsPerPage = 800;
let globalData; // Исходные данные
let filteredData; // Отфильтрованные данные
let sortDirections = Array(18).fill(true); // For 18 columns
let currentPage = 1;

document.addEventListener('DOMContentLoaded', function () {
    setLastWeekDates();
    const [dateFrom, dateTo] = getLastWeekDates();
    document.getElementById('date-range').value = `${dateFrom} - ${dateTo}`;
    updateWeekInfo(dateFrom, dateTo);
    showSkeletonLoader();
    loadAndDisplayData(dateFrom, dateTo);

    document.getElementById('load-data').addEventListener('click', function () {
        const dateInputs = document.getElementById('date-range').value.split(' - ');
        const dateFrom = dateInputs[0];
        const dateTo = dateInputs[1];
        updateWeekInfo(dateFrom, dateTo);
        showSkeletonLoader();
        loadAndDisplayData(dateFrom, dateTo);
    });

    document.getElementById('search').addEventListener('input', function () {
        filterData();
    });

    document.getElementById('status-select').addEventListener('change', function () {
        filterData();
    });

    document.getElementById('type-select').addEventListener('change', function () {
        filterData();
    });

    document.getElementById('rows-per-page').addEventListener('change', function () {
        rowsPerPage = parseInt(this.value);
        paginateData(filteredData);
        document.getElementById('total-pages').textContent = Math.ceil(filteredData.length / rowsPerPage);
        currentPage = 1;
        updateCurrentPage();
    });

    document.querySelectorAll("#data-table th").forEach((header, index) => {
        header.addEventListener('click', () => sortTable(index));
    });
});

function setLastWeekDates() {
    const [dateFrom, dateTo] = getLastWeekDates();
    document.querySelector('#date-control input[type="text"]').value = `${dateFrom} - ${dateTo}`;
}

function filterData() {
    const searchValue = document.getElementById('search').value.toLowerCase();
    const selectedStatus = document.getElementById('status-select').value;
    const selectedType = document.getElementById('type-select').value;
    const dateRange = document.getElementById('date-range').value.split(' - ');
    const dateFrom = new Date(dateRange[0]);
    const dateTo = new Date(dateRange[1]);

    if (!Array.isArray(globalData)) {
        console.error('globalData is not an array:', globalData);
        return;
    }

    filteredData = globalData.filter(invoice => {
        const invoiceDate = new Date(invoice.purchaseDate);
        return (
            (
                (invoice.driverName && invoice.driverName.toLowerCase().includes(searchValue)) ||
                (invoice.numerfaktury && invoice.numerfaktury.toLowerCase().includes(searchValue)) ||
                (invoice.nipseller && invoice.nipseller.toLowerCase().includes(searchValue)) ||
                (invoice.rejectionComment && invoice.rejectionComment.toLowerCase().includes(searchValue))
            ) &&
            (selectedStatus === "all" || invoice.status === selectedStatus) &&
            (selectedType === "all" || invoice.type === selectedType) &&
            (invoiceDate >= dateFrom && invoiceDate <= dateTo)
        );
    });

    paginateData(filteredData);
    document.getElementById('total-pages').textContent = Math.ceil(filteredData.length / rowsPerPage);
    currentPage = 1;
    updateCurrentPage();
}

function updateWeekInfo(dateFrom, dateTo) {
    const weekNumberFrom = getWeekNumber(new Date(dateFrom));
    const weekNumberTo = getWeekNumber(new Date(dateTo));
    document.getElementById('week-info').textContent = `Displaying data for the week: ${dateFrom} to ${dateTo} (Week numbers: ${weekNumberFrom} to ${weekNumberTo})`;
}

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return weekNo;
}

function getLastWeekDates() {
    const now = new Date();
    const lastSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1);
    const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 5);
    const formatDate = date => date.toISOString().split('T')[0];
    return [formatDate(lastMonday), formatDate(lastSunday)];
}

function loadAndDisplayData(dateFrom, dateTo) {
    const dateFromObj = new Date(dateFrom);
    const dateToObj = new Date(dateTo);

    // Установка времени конца дня для dateToObj
    dateToObj.setHours(23, 59, 59, 999);

    const realtimeDb = firebase.database().ref('/drivers');
    
    realtimeDb.once('value')
        .then((snapshot) => {
            const drivers = snapshot.val();
            let filteredInvoices = {};

            for (let driverId in drivers) {
                const driverData = drivers[driverId];
                if (driverData.invoices) {
                    for (let invoiceId in driverData.invoices) {
                        const invoice = driverData.invoices[invoiceId];
                        const invoiceTimestamp = new Date(invoice.timestamp);
                        if (invoiceTimestamp >= dateFromObj && invoiceTimestamp <= dateToObj) {
                            if (!filteredInvoices[driverId]) {
                                filteredInvoices[driverId] = {};
                            }
                            filteredInvoices[driverId][invoiceId] = invoice;
                        }
                    }
                }
            }

            invoicesData = filteredInvoices;
            displayInvoicesInTable(invoicesData);
            sortTable(0); // Автоматическая сортировка данных по первой колонке после их загрузки
        })
        .catch((error) => {
            console.error('Error fetching invoices data: ', error);
        });
}





function updateStatusOptions(statuses) {
    const statusSelect = document.getElementById('status-select');
    statusSelect.innerHTML = '<option value="all">Wszystkie</option>';
    statuses.forEach(status => {
        statusSelect.innerHTML += `<option value="${status}">${status}</option>`;
    });
}

function updateTypeOptions(types) {
    const typeSelect = document.getElementById('type-select');
    typeSelect.innerHTML = '<option value="all">Wszystkie</option>';
    types.forEach(type => {
        typeSelect.innerHTML += `<option value="${type}">${type}</option>`;
    });
}

function displayInvoicesInTable(data) {
    const table = document.getElementById('data-table');
    const tableBody = table.getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";

    if (typeof data !== 'object' || data === null) {
        console.error('Data is not a valid object:', data);
        return;
    }

    const invoicesArray = [];
    let uniqueStatuses = new Set();
    let uniqueTypes = new Set();

    for (const driverName in data) {
        if (data.hasOwnProperty(driverName)) {
            const invoices = data[driverName];
            for (const invoiceId in invoices) {
                if (invoices.hasOwnProperty(invoiceId)) {
                    const invoice = invoices[invoiceId];
                    invoice.driverName = driverName;
                    invoice.invoiceId = invoiceId;
                    invoice.addedDate = new Date(invoice.timestamp).toLocaleString(); // Используем toLocaleString для полного представления даты и времени
                    invoicesArray.push(invoice);
                    if (invoice.status) uniqueStatuses.add(invoice.status);
                    if (invoice.type) uniqueTypes.add(invoice.type);
                }
            }
        }
    }

    updateStatusOptions(Array.from(uniqueStatuses));
    updateTypeOptions(Array.from(uniqueTypes));

    globalData = invoicesArray;

    const totalPagesElement = document.getElementById('total-pages');
    if (totalPagesElement) {
        totalPagesElement.textContent = Math.ceil(invoicesArray.length / rowsPerPage);
    }

    paginateData(invoicesArray);
}

function paginateData(data) {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    for (const invoice of paginatedData) {
        const row = tableBody.insertRow();
        
                const cellAddedDate = row.insertCell();

        const cellDriverId = row.insertCell();
        const cellInvoiceNumber = row.insertCell();
        const cellPurchaseDate = row.insertCell();
        const cellType = row.insertCell();
        const cellRegistrationNumber = row.insertCell();
        const cellNipSeller = row.insertCell();
        const cellLiters = row.insertCell();
        const cellFuelType = row.insertCell();
        const cellGrossAmount = row.insertCell();
        const cellVatRate = row.insertCell();
        const cellNetAmount = row.insertCell();
        const cellVatAmount = row.insertCell();
        const cellVatReturn = row.insertCell();
        const cellStatus = row.insertCell();
        const cellChangeStatus = row.insertCell();
        const cellFilePreview = row.insertCell();
        const cellRejectionComment = row.insertCell();
        const cellStatusSprawdzenia = row.insertCell();
        
                cellAddedDate.textContent = invoice.addedDate;

        cellDriverId.textContent = invoice.driverName;
        cellInvoiceNumber.textContent = invoice.numerfaktury;
        cellPurchaseDate.textContent = invoice.purchaseDate;
        cellType.textContent = invoice.type;
        cellRegistrationNumber.textContent = invoice.registrationNumber;
        cellNipSeller.textContent = invoice.nipseller;
        cellLiters.textContent = invoice.liters;
        cellFuelType.textContent = invoice.fuelType;
        cellGrossAmount.textContent = invoice.grossAmount;
        cellVatRate.textContent = invoice.vatRate;
        cellNetAmount.textContent = invoice.netAmount;
        cellVatAmount.textContent = invoice.vatAmount;
        cellVatReturn.textContent = invoice.vatReturn;
        cellStatus.textContent = invoice.status;
        cellFilePreview.innerHTML = invoice.fileURL ? `<a href="${invoice.fileURL}" target="_blank">Podgląd</a>` : "Brak";
        cellRejectionComment.textContent = invoice.rejectionComment;
        cellStatusSprawdzenia.textContent = invoice.statusSprawdzenia || "N/A";

        // Change status button with dropdown
        const changeStatusSelect = document.createElement('select');
        changeStatusSelect.innerHTML = `
        <option value="W trakcie sprawdzenia">W trakcie sprawdzenia</option>
            <option value="zaakceptowany">zaakceptowany</option>
            <option value="odrzucony">odrzucony</option>
        `;
        changeStatusSelect.value = invoice.status; // set current status as selected
        changeStatusSelect.addEventListener('change', function () {
            const newStatus = changeStatusSelect.value;
            updateInvoiceStatus(invoice.driverName, invoice.invoiceId, newStatus);
            invoice.status = newStatus; // update the status in global data
            cellStatus.textContent = newStatus; // update the status in the table cell
        });
        cellChangeStatus.appendChild(changeStatusSelect);
    }
    updateCurrentPage();
}

function updateInvoiceStatus(driverName, invoiceId, newStatus) {
    const refPath = `/drivers/${driverName}/invoices/${invoiceId}/status`;
    const invoiceStatusRef = firebase.database().ref(refPath);
    invoiceStatusRef.set(newStatus)
        .then(() => {
            console.log('Status updated successfully.');
        })
        .catch((error) => {
            console.error('Error updating status: ', error);
        });
}

function showSkeletonLoader() {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";

    for (let i = 0; i < rowsPerPage; i++) {
        const row = tableBody.insertRow();
        for (let j = 0; j < 18; j++) {
            const cell = row.insertCell();
            cell.innerHTML = '<div class="skeleton-loader"></div>';
        }
    }
}

function sortTable(columnIndex) {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    const rows = Array.from(tableBody.rows);
    const direction = sortDirections[columnIndex] ? -1 : 1; // Начальное направление для сортировки от новых к старым

    rows.sort((a, b) => {
        const dateA = parseDate(a.cells[columnIndex].textContent.trim());
        const dateB = parseDate(b.cells[columnIndex].textContent.trim());
        return direction * (dateB - dateA);
    });

    sortDirections[columnIndex] = !sortDirections[columnIndex]; // Переключаем направление для последующих вызовов
    tableBody.innerHTML = "";
    rows.forEach(row => tableBody.appendChild(row));
}



function parseDate(dateStr) {
    console.log('Parsing date:', dateStr); // Отладочный вывод перед парсингом
    let [date, time] = dateStr.split(', ');
    if (!time) {
        console.error('Invalid date format:', dateStr);
        return new Date(); // Возвращаем текущее время или другую логическую базовую дату
    }
    let [day, month, year] = date.split('.');
    let [hours, minutes, seconds] = time.split(':');

    return new Date(year, month - 1, day, hours, minutes, seconds);
}



function updateCurrentPage() {
    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    const currentPageElement = document.getElementById('current-page');
    const paginationInfoElement = document.getElementById('pagination-info');
    if (currentPageElement) {
        currentPageElement.textContent = currentPage;
    }
    if (paginationInfoElement) {
        paginationInfoElement.textContent = `Displaying ${tableBody.rows.length} of ${filteredData.length} records`;
    }
}

