  let rowsPerPage = 15;
let globalData; // Исходные данные
let filteredData; // Отфильтрованные данные
 let sortDirections = Array(18).fill(true);  // For 18 columns
 document.addEventListener('DOMContentLoaded', function () {
         setLastWeekDates();
 const [dateFrom, dateTo] = getLastWeekDates();
 document.getElementById('date-range').value = `${dateFrom} - ${dateTo}`;
     updateWeekInfo(dateFrom, dateTo);
     showSkeletonLoader();
     loadAndDisplayData(dateFrom, dateTo);
     document.getElementById('load-data').addEventListener('click', function() {
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
    console.log("Status changed:", this.value);
    filterData();
});

document.getElementById('type-select').addEventListener('change', function () {
    console.log("Type changed:", this.value);
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
    const selectedStatus = document.getElementById('status-select').value;
    const selectedType = document.getElementById('type-select').value;
    const dateRange = document.getElementById('date-range').value.split(' - ');
    const dateFrom = new Date(dateRange[0]);
    const dateTo = new Date(dateRange[1]);

    if (!Array.isArray(globalData)) {
        console.error('globalData is not an array:', globalData);
        return; // Выход из функции, если globalData не массив
    }

    // Фильтрация данных
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

    // Пагинация с использованием отфильтрованных данных
    paginateData(filteredData);
    document.getElementById('total-pages').textContent = Math.ceil(filteredData.length / rowsPerPage);
    currentPage = 1;
    updateCurrentPage();
}

 document.getElementById('status-select').addEventListener('change', filterData);
     document.getElementById('type-select').addEventListener('change', filterData);
     document.getElementById('date-range').addEventListener('change', filterData);
         // Event listeners for sorting table when column headers are clicked
         let headers = document.querySelectorAll("#data-table th");
         headers.forEach((header, index) => {
             header.addEventListener('click', () => sortTable(index));
         });
 });
 function updateWeekInfo(dateFrom, dateTo) {
     const weekNumberFrom = getWeekNumber(new Date(dateFrom));
     const weekNumberTo = getWeekNumber(new Date(dateTo));
     document.getElementById('week-info').textContent = 
         `Wyświetlane dane za tydzień: ${dateFrom} do ${dateTo} (Numery tygodni: ${weekNumberFrom} do ${weekNumberTo})`;
 }
 function getWeekNumber(d) {
     d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
     d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
     var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
     var weekNo = Math.ceil(( ( (d - yearStart) / 86400000) + 1)/7);
     return weekNo;
 }
 function getLastWeekDates() {
     const now = new Date();
     const lastSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1); // +1 to start week from Monday
     const lastMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() - 5); // -5 to get Monday starting the week
     const formatDate = date => date.toISOString().split('T')[0];
     return [formatDate(lastMonday), formatDate(lastSunday)];
 }
 function updateWeekInfo(dateFrom, dateTo) {
     document.getElementById('week-info').textContent = `Displaying data for the week: ${dateFrom} to ${dateTo}`;
 }
 let invoicesData = [];  // Глобальный массив для хранения данных о фактурах
function loadAndDisplayData(dateFrom, dateTo) {
    const apiUrl = `https://us-central1-ccmcolorpartner.cloudfunctions.net/getDriversInvoicesForDateRange?dateFrom=${dateFrom}&dateTo=${dateTo}`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log("Received data:", data); // Добавлено для отладки
              console.log("loadAndDisplayData: updating globalData");
            invoicesData = data;
            displayInvoicesInTable(invoicesData);
        })
        .catch(error => {
            console.error('Error fetching invoices data: ', error);
        });
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
    if (!table) {
        console.error('Table with id "data-table" not found');
        return;
    }
    const tableBody = table.getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";

    if (typeof data !== 'object' || data === null) {
        console.error('Data is not a valid object:', data);
        return;
    }

    const invoicesArray = []; // Собираем все счета в один массив для пагинации
    let uniqueStatuses = new Set();
    let uniqueTypes = new Set();
    for (const driverName in data) {
        if (data.hasOwnProperty(driverName)) {
            const invoices = data[driverName];
            for (const invoiceId in invoices) {
                if (invoices.hasOwnProperty(invoiceId)) {
                    const invoice = invoices[invoiceId];
                    invoice.driverName = driverName; // Сохраняем имя водителя в объекте счета
                    invoicesArray.push(invoice);

                    // Собираем уникальные статусы и типы
                    if (invoice.status) uniqueStatuses.add(invoice.status);
                    if (invoice.type) uniqueTypes.add(invoice.type);
                }
            }
        }
    }

    // Обновляем опции в селекторах
    updateStatusOptions(Array.from(uniqueStatuses));
    updateTypeOptions(Array.from(uniqueTypes));

    // Сохраняем данные в глобальную переменную
    globalData = invoicesArray;

    // Обновляем общее количество страниц, если элемент 'total-pages' существует
    const totalPagesElement = document.getElementById('total-pages');
    if (totalPagesElement) {
        totalPagesElement.textContent = Math.ceil(invoicesArray.length / rowsPerPage);
    }

    // Вызываем пагинацию для отображения первой страницы данных
    paginateData(invoicesArray);
}

  let currentPage = 1;
function paginateData(data) {
      console.log("paginateData: data length", data.length);

    const tableBody = document.getElementById('data-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    for (const invoice of paginatedData) {
        const row = tableBody.insertRow();

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
         const cellstatusSprawdzenia = row.insertCell();
        cellDriverId.textContent = invoice.driverName || "N/A"; // Используем поле driverName      
         cellInvoiceNumber.textContent = invoice.numerfaktury;
         cellPurchaseDate.textContent = invoice.purchaseDate;
         cellType.textContent = invoice.type;
         cellRegistrationNumber.textContent = invoice.registrationNumber ? invoice.registrationNumber : "Nie dotyczy";
         cellNipSeller.textContent = invoice.nipseller;
         cellLiters.textContent = invoice.liters;
         cellFuelType.textContent = invoice.fuelType;
         cellGrossAmount.textContent = invoice.grossAmount;
         cellVatRate.textContent = invoice.vatRate;
         cellNetAmount.textContent = invoice.netAmount;
         cellVatAmount.textContent = invoice.vatAmount;
         cellVatReturn.textContent = invoice.vatReturn;
         cellStatus.textContent = invoice.status;
         cellFilePreview.innerHTML = invoice.fileURL ? '<a href="' + invoice.fileURL + '" target="_blank">Zobacz plik</a>' : 'Nie ma pliku';
         cellRejectionComment.textContent = invoice.rejectionComment;
         cellstatusSprawdzenia.textContent = invoice.statusSprawdzenia;
         // Пример создания выпадающего списка для изменения статуса
         const select = document.createElement('select');
         select.innerHTML = `
             <option value="w trakcie sprawdzenia">w trakcie sprawdzenia</option>
             <option value="zaakceptowany">zaakceptowany</option>
             <option value="odrzucony">odrzucony</option>
         `;
         select.value = invoice.status;
         select.addEventListener('change', (event) => {
             // Здесь код для обновления статуса фактуры в базе данных
         });
         cellChangeStatus.appendChild(select);
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
 function showSkeletonLoader(rows = 15, columns = 18) {
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
 $(function() {
     const [startDate, endDate] = getLastWeekDates();
     $('#date-control input[type="text"]').daterangepicker({
         startDate: startDate,
         endDate: endDate,
         "locale": {
             "format": "YYYY-MM-DD",  // Здесь мы меняем формат на "YYYY-MM-DD"
             "separator": " - ",
             "firstDay": 1 // Понедельник
         },
         "autoApply": true,
         "opens": "center"
     });
 });
 document.getElementById('load-data').addEventListener('click', function() {
     const dateInputs = document.querySelector('#date-control input[type="text"]').value.split(' - ');
     const dateFrom = dateInputs[0];
     const dateTo = dateInputs[1];
     updateWeekInfo(dateFrom, dateTo);
     showSkeletonLoader();
     loadAndDisplayData(dateFrom, dateTo);
 });
 function setLastWeekDates() {
     const [dateFrom, dateTo] = getLastWeekDates();
     document.querySelector('#date-control input[type="text"]').value = `${dateFrom} - ${dateTo}`;
 }
