let invoicesData = [];  // Глобальный массив для хранения данных о фактурах

document.addEventListener('DOMContentLoaded', function () {
    setLastWeekDates();
    const [dateFrom, dateTo] = getLastWeekDates();
    document.getElementById('date-range').value = `${dateFrom} - ${dateTo}`;

    loadAndDisplayData(dateFrom, dateTo);

    document.getElementById('load-data').addEventListener('click', function() {
        const dateInputs = document.getElementById('date-range').value.split(' - ');
        const dateFrom = dateInputs[0];
        const dateTo = dateInputs[1];
        loadAndDisplayData(dateFrom, dateTo);
    });

    document.getElementById('date-range').addEventListener('change', function() {
        const dateInputs = this.value.split(' - ');
        const dateFrom = dateInputs[0];
        const dateTo = dateInputs[1];
        loadAndDisplayData(dateFrom, dateTo);
    });
});

function loadAndDisplayData(dateFrom, dateTo) {
    const weekNumberFrom = getWeekNumber(new Date(dateFrom));
    const apiUrl = `https://us-central1-ccmcolorpartner.cloudfunctions.net/getDriversInvoicesForWeek?weekNumber=${weekNumberFrom}`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            invoicesData = data;
            displayInvoicesInTable(invoicesData);
        })
        .catch(error => {
            console.error('Error fetching invoices data: ', error);
        });
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




function displayInvoicesInTable(data) {
    const table = document.getElementById('data-table');
    if (!table) {
        console.error('Table with id "data-table" not found');
        return;
    }
    const tableBody = table.getElementsByTagName('tbody')[0];
    tableBody.innerHTML = "";

    if (!Array.isArray(data)) {
        console.error('Data is not an array:', data);
        return;
    }

    for (const invoice of data) {
        const row = tableBody.insertRow();

        row.insertCell().appendChild(document.createTextNode(invoice.driverId || "N/A"));
        row.insertCell().appendChild(document.createTextNode(invoice.invoiceNumber || "N/A"));
        row.insertCell().appendChild(document.createTextNode(invoice.purchaseDate || "N/A"));
        row.insertCell().appendChild(document.createTextNode(invoice.type || "N/A"));
        row.insertCell().appendChild(document.createTextNode(invoice.registrationNumber || "Nie dotyczy"));
        row.insertCell().appendChild(document.createTextNode(invoice.nipSeller || "N/A"));
        row.insertCell().appendChild(document.createTextNode(invoice.liters || "0"));
        row.insertCell().appendChild(document.createTextNode(invoice.fuelType || "N/A"));
        row.insertCell().appendChild(document.createTextNode(invoice.grossAmount || "0"));
        row.insertCell().appendChild(document.createTextNode(invoice.vatRate || "0%"));
        row.insertCell().appendChild(document.createTextNode(invoice.netAmount || "0"));
        row.insertCell().appendChild(document.createTextNode(invoice.vatAmount || "0"));
        row.insertCell().appendChild(document.createTextNode(invoice.vatReturn || "0"));
        row.insertCell().appendChild(document.createTextNode(invoice.status || "N/A"));

        // Для cellChangeStatus нужно создать элемент select или другой интерактивный элемент
        const selectStatus = document.createElement('select');
        // Заполнение select значениями статусов, можно добавить логику изменения статуса здесь
        selectStatus.innerHTML = '<option value="zaakceptowany">zaakceptowany</option>';
        selectStatus.value = invoice.status;
        row.insertCell().appendChild(selectStatus);

        // Для cellFilePreview можно добавить ссылку, если есть URL файла
        const fileLink = document.createElement('a');
        fileLink.href = invoice.fileURL || "#";
        fileLink.textContent = invoice.fileURL ? "Zobacz plik" : "Nie ma pliku";
        row.insertCell().appendChild(fileLink);

        row.insertCell().appendChild(document.createTextNode(invoice.rejectionComment || "N/A"));
        row.insertCell().appendChild(document.createTextNode(invoice.statusSprawdzenia || "N/A"));
    }

    paginateData(data); // Пагинация данных
}

function setLastWeekDates() {
    const [dateFrom, dateTo] = getLastWeekDates();
    document.querySelector('#date-control input[type="text"]').value = `${dateFrom} - ${dateTo}`;
}
