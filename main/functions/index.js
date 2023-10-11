const functions = require('firebase-functions');
const admin = require('firebase-admin');
const puppeteer = require('puppeteer-core');
const chrome = require('chrome-aws-lambda');
const cors = require('cors');
const corsHandler = cors({
    origin: 'https://www.panel-color.pl'
});
const JSZip = require('jszip');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const { createClient } = require('node-regon');


admin.initializeApp();

exports.checkUserStatus = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        console.log(`Processing user document for id ${context.params.userId}`);
        return await checkUserStatuses(change.after, context);
    });
async function checkUserStatuses(userSnapshot, context) {
    console.log(`Checking statuses for user ${userSnapshot.id}`);
    const userData = userSnapshot.data();
    const personalDataStatus = userData.dane_personalne.status;
    if (personalDataStatus !== 'Zaakceptowane') {
        console.log(`Status of personalData is not "Zaakceptowane", it is "${personalDataStatus}"`);
    }
    let allSamochodAccepted = true;
    const samochod = userData.samochod;
    for (const dokument in samochod) {
        if (samochod[dokument].status !== 'Zaakceptowane') {
            console.log(`Status of ${dokument} is not "Zaakceptowane", it is "${samochod[dokument].status}"`);
            allSamochodAccepted = false;
        }
    }
    let allDokumentyAccepted = true;
    const dokumenty = userData.dokumenty;
    for (const dokument in dokumenty) {
        if (dokumenty[dokument].status !== 'Zaakceptowane') {
            console.log(`Status of ${dokument} is not "Zaakceptowane", it is "${dokumenty[dokument].status}"`);
            allDokumentyAccepted = false;
        }
    }
    if (personalDataStatus === 'Zaakceptowane' && allSamochodAccepted && allDokumentyAccepted) {
        console.log('All statuses are "Zaakceptowane", updating user status');
        await userSnapshot.ref.update({
            status: 'konto zweryfikowane',
        });
        console.log('Updated user status');
        const updatedUserSnapshot = await userSnapshot.ref.get();
        console.log('Fetched updated user data');
        if (updatedUserSnapshot.data().status === 'konto zweryfikowane') {
            console.log('User status updated to "konto zweryfikowane", checking if document already exists in "umowy"');
            const umowyCollectionRef = admin.firestore().collection('users').doc(context.params.userId).collection('umowy');
            const umowySnapshot = await umowyCollectionRef.where('Nazwa', '==', "Umowa Zlecenia").get();
            if (!umowySnapshot.empty) {
                console.log('Document already exists in "umowy", not creating a new one');
                return;
            }
            const pdfData = {
                ...userData,
                creationDate: admin.firestore.FieldValue.serverTimestamp(),
                statusUmowy: 'Oczekuję na podpis',
                valid_until: admin.firestore.Timestamp.fromDate(new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate())),
                user_id: context.params.userId,
                Nazwa: "Umowa Zlecenia",
                pdfUrl: "not_generated_yet",
                signatureUrl: `umowy/${context.params.userId}/signatureUrl`
            };
            console.log('Constructed pdfData');
            try {
                const pdfRef = umowyCollectionRef.doc();
                console.log('Obtained reference to umowy document');
                await pdfRef.set(pdfData);
                console.log('Successfully created document in umowy');
            } catch (error) {
                console.error(`Failed to create document in 'umowy': ${error}`);
            }
        } else {
            console.log('Status of updated user data is not "konto zweryfikowane"');
        }
    } else {
        console.log('Not all statuses are "Zaakceptowane"');
    }
}
exports.checkUserStatus = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        console.log(`Processing user document for id ${context.params.userId}`);
        return await checkUserStatuses(change.after, context);
    });
exports.processGeneratedPdf = functions.firestore
    .document('users/{userId}/umowy/{umowyId}')
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();
        if (!previousValue.output && newValue.output) {
            const pdfUrl = newValue.output.download;
            console.log(`Generated PDF URL: ${pdfUrl}`);
            if (!pdfUrl) {
                console.log('No PDF URL was generated. The PDF generation may have failed.');
                return;
            }
            try {
                const umowyRef = admin.firestore().collection('users').doc(context.params.userId).collection('umowy').doc(context.params.umowyId);
                await umowyRef.update({
                    'pdfUrl': pdfUrl,
                });
                console.log(`Updated umowy document with PDF URL: ${pdfUrl}`);
            } catch (error) {
                console.error(`Failed to update umowy document with PDF URL: ${error}`);
            }
        } else {
            console.log('The output field did not change. This function may have been triggered by a different update.');
        }
    });
exports.generatePdfUrl = functions.firestore
    .document('users/{userId}/umowy/{umowyId}')
    .onCreate(async (snapshot, context) => {
        const newValue = snapshot.data();
        const fileName = context.params.umowyId + '.pdf';
        const bucket = admin.storage().bucket('ccmcolorpartner.appspot.com');
        try {
            const [url] = await bucket.file(fileName).getSignedUrl({
                action: 'read',
                expires: '03-09-2491'
            });
            console.log(`Generated signed URL for PDF: ${url}`);
            await snapshot.ref.update({
                'pdfUrl': url,
            });
            console.log(`Updated umowy document with signed URL: ${url}`);
        } catch (error) {
            console.error(`Failed to generate signed URL or update umowy document: ${error}`);
        }
    });
exports.handleStatusChangeToSigned = functions.firestore
    .document('users/{userId}/umowy/{umowyId}')
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();
        if (previousValue.statusUmowy !== "Umowa została podpisana" && newValue.statusUmowy === "Umowa została podpisana") {
            console.log(`Document with id ${context.params.umowyId} was signed, generating a new document...`);
            const signatureUrlFromUpdatedDocument = newValue.signatureUrl;
            const userData = newValue;
            const danePersonalne = userData.dane_personalne || {};
            const today = new Date();
            const formattedDate = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
            const pdfData = {
                ...userData,
                creationDate: admin.firestore.FieldValue.serverTimestamp(),
                statusUmowy: 'Umowa Podpisana',
                valid_until: admin.firestore.Timestamp.fromDate(new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate())),
                user_id: context.params.userId,
                Nazwa: "Umowa Zlecenia",
                pdfUrl: "not_generated_yet",
                signatureUrl: signatureUrlFromUpdatedDocument,
                currentDate: formattedDate
            };
            console.log('Constructed pdfData for new document');
            try {
                const umowyCollectionRef = admin.firestore().collection('users').doc(context.params.userId).collection('umowy');
                // Удаление предыдущего документа
                await change.before.ref.delete();
                console.log(`Deleted the previous document with id: ${context.params.umowyId}`);
                const newUmowyDocRef = umowyCollectionRef.doc();
                console.log('Obtained reference to new umowy document');
                await newUmowyDocRef.set(pdfData);
                console.log('Successfully created new document in umowy');
                // Уведомление администраторов по электронной почте
                const adminUsersSnapshot = await admin.firestore().collection('users').where('role', '==', 'admin').get();
                adminUsersSnapshot.forEach(async adminDoc => {
                    const adminData = adminDoc.data();
                    const adminEmail = adminData.email;
                    if (!adminEmail) {
                        console.error(`Admin with id ${adminDoc.id} does not have an email address`);
                        return;
                    }
                    const emailData = {
                        to: adminEmail,
                        message: {
                            subject: 'Nowa podpisana umowa',
                            html: `
                                Drogi Adminie,<br><br>
                                Nowa umowa została podpisana przez użytkownika ${newValue.firstName} ${newValue.lastName}. Proszę sprawdzić aplikację, aby uzyskać szczegóły.<br><br>
                                Pozdrawiamy,<br>
                                Twój zespół
                            `,
                        }
                    };
                    await admin.firestore().collection('mail').add(emailData);
                    console.log(`Added email data for ${adminEmail} to Firestore`);
                });
            } catch (error) {
                console.error(`Failed to handle the signed document: ${error}`);
            }
        } else {
            console.log('Status did not change to "Umowa została podpisana", no action taken.');
        }
    });
exports.handleStatusChangeToWyslanaUmowaZlecenia = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();
        if (previousValue.statusUmow !== "Wysłana Umowa Zlecenia do podpisu" && newValue.statusUmow === "Wysłana Umowa Zlecenia do podpisu") {
            console.log(`statusUmow changed to "Wysłana Umowa Zlecenia do podpisu" for user with id ${context.params.userId}`);
            // Загружаем HTML-шаблон
            const response = await fetch('https://firebasestorage.googleapis.com/v0/b/ccmcolorpartner.appspot.com/o/template%2Findex.html?alt=media&token=a2d7d64c-48df-4c5a-8897-4b634f4ec32d');
            const templateHtml = await response.text();
            const browser = await puppeteer.launch({
                executablePath: await chrome.executablePath,
                headless: true,
                args: chrome.args
            });
            const page = await browser.newPage();
            await page.setContent(templateHtml);
            const pdfBuffer = await page.pdf({ format: 'A4' });
            await browser.close();
            // Сохраняем PDF в Firebase Storage
            const bucket = admin.storage().bucket('ccmcolorpartner.appspot.com');
            const fileName = `${context.params.userId}/umowaZlecenia.pdf`;
            const file = bucket.file(fileName);
            const fileWriteStream = file.createWriteStream({
                metadata: {
                    contentType: 'application/pdf',
                },
            });
            fileWriteStream.end(pdfBuffer);
            return new Promise((resolve, reject) => {
                fileWriteStream.on('finish', async () => {
                    console.log(`PDF saved to Firebase Storage as ${fileName}`);
                    // Генерируем подписанную URL для PDF
                    const [pdfDownloadUrl] = await file.getSignedUrl({
                        action: 'read',
                        expires: '03-09-2491'
                    });
                    const umowyCollection = admin.firestore().collection('users').doc(context.params.userId).collection('umowy');
                    const newUmowyDoc = await umowyCollection.add({
                        'pdfUrl': pdfDownloadUrl,
                        'title': 'Umowa Zlecenia',
                        'statusUmowy': 'Oczekuję na podpis',
                        'creationDate': new Date().toISOString(),
                        'expiryYear': new Date().getFullYear() + 1
                    });
                    console.log(`New umowy document created with ID: ${newUmowyDoc.id}`);
                    console.log(`Updated Firestore with signed URL: ${pdfDownloadUrl}`);
                    resolve();
                });
                fileWriteStream.on('error', reject);
            });
        } else {
            console.log('statusUmow did not change to "Wysłana Umowa Zlecenia do подpisu", no action taken.');
            return;
        }
    });
exports.handleRozliczenieDodaneStatusChange = functions.database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();

        if (previousValue.status !== "Rozliczenie dodane" && newValue.status === "Rozliczenie dodane") {
            // Задержка на 5 секунд
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Обновляем статус на "Rozliczam faktury"
            await change.after.ref.update({
                status: "Rozliczam faktury"
            });
        }

        return null;
    });
    exports.handleRozliczenieDodaneStatusCreate = functions.database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onCreate(async (snapshot, context) => {
        const newValue = snapshot.val();

        if (newValue.status === "Rozliczenie dodane") {
            // Задержка на 5 секунд
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Обновляем статус на "Rozliczam faktury"
            await snapshot.ref.update({
                status: "Rozliczam faktury"
            });
        }

        return null;
    });

exports.calculateInvoicesAndExpensesOnChange = functions.database.ref('drivers/{driverId}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();
        const driverId = context.params.driverId;

        function getValidNumber(value) {
            return (typeof value === 'number' && !isNaN(value)) ? value : 0;
        }

        if (previousValue.status !== "Rozliczam faktury" && newValue.status === "Rozliczam faktury") {
            const rootRef = admin.database().ref();
            // Получаем фактуры и расходы водителя
            let invoices = await rootRef.child(`drivers/${driverId}/invoices`).once('value').then(snap => snap.val()) || {};
            let expensesValue = 0, invoiceValue = 0, vatReturn = 0;
            const startDate = new Date(newValue.startDate);
            const endDate = new Date(newValue.endDate);

            Object.values(invoices).forEach((invoice) => {
                let invoiceDate = new Date(invoice.purchaseDate + "T00:00:00");
                if (invoice && invoice.status === 'zaakceptowany' && invoiceDate >= startDate && invoiceDate <= endDate) {
                    if (invoice.type === 'wydatek') {
                        expensesValue += Number(invoice.grossAmount || 0);
                    } else if (invoice.type === 'faktura') {
                        invoiceValue += Number(invoice.grossAmount || 0);
                        vatReturn += Number(invoice.vatReturn || 0);
                    }
                }
            });

            // Вычисляем total, учитывая предыдущие значения
            const total = getValidNumber(newValue.total);
            const totalUpdated = total + vatReturn - expensesValue;

            // Обновляем summary водителя
            await change.after.ref.update({
                total: totalUpdated,
                inne: expensesValue,
                zwrot_kosztow: invoiceValue,
                vat_bonus: vatReturn
            });

            await change.after.ref.update({
                status: "Rozliczam Najem Samochodu"
            });
        }
        return null;
    });

exports.handleCarRentStatusChange = functions.runWith({ memory: '1GB' }).database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();
        const driverName = context.params.driverName;

        if (previousValue.status !== "Rozliczam Najem Samochodu" && newValue.status === "Rozliczam Najem Samochodu") {
            const rootRef = admin.database().ref();
            const carId = (await rootRef.child(`drivers/${driverName}/car`).once('value')).val();
            const startDate = newValue.startDate;
            const endDate = newValue.endDate;
            let rentValue = 0;

            if (carId) {
                rentValue = (await rootRef.child(`admin/carsrent/${carId}/rent`).once('value')).val() || 0;
            } else {
                console.error(`No car ID found for driver: ${driverName}`);
            }

            const totalUpdated = newValue.total - rentValue;
            await change.after.ref.update({
                total: totalUpdated,
                wynajem: rentValue
            });

            await change.after.ref.update({
                status: "Rozliczam ZUS"
            });

            if (rentValue > 0) {
                const pdfBuffer = await createCarRentPDF(newValue, context.params.driverName, context.params.weekId);
                const fileName = `${context.params.driverName}/fakturyzawynajem/carRent_${context.params.weekId}.pdf`;
                const pdfUrl = await saveToFirebaseStorage(pdfBuffer, fileName);

                // Save PDF URL in Realtime Database for the user
                const userFakturyRef = rootRef.child(`drivers/${driverName}/fakturyzawynajem/${context.params.weekId}`);
                await userFakturyRef.set({
                    pdfUrl: pdfUrl,
                    status: "Faktura wygenerowana",
                    startDate: startDate,
                    endDate: endDate,
                });

                // Save the same data for admin
                const adminFakturyRef = admin.database().ref(`admin/faktury_za_wynajem/${context.params.weekId}/${context.params.driverName}`);
                await adminFakturyRef.set({
                    pdfUrl: pdfUrl,
                    status: "Faktura wygenerowana",
                    startDate: startDate,
                    endDate: endDate,
                });
            }
        }
        return null;
    });

async function createCarRentPDF(data, driverName, weekId) {
    const rootRef = admin.database().ref();
    const carId = (await rootRef.child(`drivers/${driverName}/car`).once('value')).val();
    const carData = carId ? (await rootRef.child(`admin/carsrent/${carId}`).once('value')).val() : {};

    const usersSnapshot = await admin.firestore().collection('users').where('driverId', '==', driverName).get();
    if (usersSnapshot.empty) {
        console.error(`No document found for driverName: ${driverName}`);
        return null;
    }
    const driverData = usersSnapshot.docs[0].data();

    const currentDate = new Date();
    const salesDate = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
    const paymentDueDate = new Date(currentDate);
    paymentDueDate.setDate(currentDate.getDate() + 7);
    const paymentDateFormatted = `${paymentDueDate.getDate()}-${paymentDueDate.getMonth() + 1}-${paymentDueDate.getFullYear()}`;
    const wynajemValue = parseFloat(data.wynajem);

    const invoiceNumber = `FV 1/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    const vatAmount = wynajemValue * 0.23;
    const carDescription = `Wynajem ${carData.make} ${carData.model} nr. rej ${carData.number}`;
    const dateRange = `od ${data.startDate} do ${data.endDate}`;

    const rentAmountWords = number_to_words_pl(wynajemValue);
    console.log(rentAmountWords);  // Добавьте эту строку, чтобы убедиться, чт

    const netAmount = wynajemValue * 0.77;
    function number_to_words_pl(n) {
        const jednosci = ["", "jeden", "dwa", "trzy", "cztery", "pięć", "sześć", "siedem", "osiem", "dziewięć"];
        const nascie = ["dziesięć", "jedenaście", "dwanaście", "trzynaście", "czternaście", "piętnaście", "szesnaście", "siedemnaście", "osiemnaście", "dziewiętnaście"];
        const dziesiatki = ["", "", "dwadzieścia", "trzydzieści", "czterdzieści", "pięćdziesiąt", "sześćdziesiąt", "siedemdziesiąt", "osiemdziesiąt", "dziewięćdziesiąt"];
        const setki = ["", "sto", "dwieście", "trzysta", "czterysta", "pięćset", "sześćset", "siedemset", "osiemset", "dziewięćset"];

        let wholePart = Math.floor(n);
        let decimalPart = Math.round((n - wholePart) * 100);

        let words = getWordsForNumber(wholePart);
        words += " złotych";
        if (decimalPart > 0 || wholePart === 0) {
            words += " " + getWordsForNumber(decimalPart) + " groszy";
        }

        return words;

        function getWordsForNumber(num) {
            if (0 <= num && num < 10) {
                return jednosci[num];
            } else if (10 <= num && num < 20) {
                return nascie[num - 10];
            } else if (20 <= num && num < 100) {
                return dziesiatki[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + jednosci[num % 10] : "");
            } else if (100 <= num && num < 1000) {
                return setki[Math.floor(num / 100)] + (num % 100 !== 0 ? " " + getWordsForNumber(num % 100) : "");
            } else if (1000 <= num && num < 1000000) {
                const tys = Math.floor(num / 1000);
                if (tys === 1) {
                    return "tysiąc" + (num % 1000 !== 0 ? " " + getWordsForNumber(num % 1000) : "");
                } else if (tys >= 2 && tys <= 4) {
                    return getWordsForNumber(tys) + " tysiące" + (num % 1000 !== 0 ? " " + getWordsForNumber(num % 1000) : "");
                } else {
                    return getWordsForNumber(tys) + " tysięcy" + (num % 1000 !== 0 ? " " + getWordsForNumber(num % 1000) : "");
                }
            } else if (num === 1000000) {
                return "milion";
            } else {
                return "Liczba jest zbyt dużа!";
            }
        }
    }




    const templateUrl = "https://firebasestorage.googleapis.com/v0/b/ccmcolorpartner.appspot.com/o/template%2Ffaktury_za_wynajem.html?alt=media&token=bdb8deb5-cd32-4ba7-b15d-4c4156ce70e4";
    const response = await fetch(templateUrl);
    let templateHtml = await response.text();

    // Замените плейсхолдеры в шаблоне
    templateHtml = templateHtml.replace(/PLACEHOLDER_ADRES/g, driverData.dane_personalne.correspondenceAddress);
    templateHtml = templateHtml.replace(/PLACEHOLDER_IMIE_NAZWISKO/g, `${driverData.firstName} ${driverData.lastName}`);
    templateHtml = templateHtml.replace(/PLACEHOLDER_INVOICE_NUMBER/g, invoiceNumber);
    templateHtml = templateHtml.replace(/PLACEHOLDER_SALES_DATE/g, salesDate);
    templateHtml = templateHtml.replace(/PLACEHOLDER_PAYMENT_DUE_DATE/g, paymentDateFormatted);
    templateHtml = templateHtml.replace(/PLACEHOLDER_CAR_DESCRIPTION/g, carDescription);
    templateHtml = templateHtml.replace(/PLACEHOLDER_DATE_RANGE/g, dateRange);
    templateHtml = templateHtml.replace(/PLACEHOLDER_NET_AMOUNT/g, netAmount.toFixed(2));
    templateHtml = templateHtml.replace(/PLACEHOLDER_RENT_AMOUNT/g, wynajemValue.toFixed(2));
    templateHtml = templateHtml.replace(/PLACEHOLDER_VAT_AMOUNT/g, vatAmount.toFixed(2));
    templateHtml = templateHtml.replace(/PLACEHOLDER_SLOWNIE/g, rentAmountWords);

    const browser = await puppeteer.launch({
        executablePath: await chrome.executablePath,
        headless: true,
        args: chrome.args
    });
    const page = await browser.newPage();
    await page.setContent(templateHtml);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    return pdfBuffer;
}

exports.handleZUSStatusChange = functions.database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();
        const driverName = context.params.driverName;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentDay = currentDate.getDate();

        let shouldUpdateToPartnerStatus = false;

        if (previousValue.status !== "Rozliczam ZUS" && newValue.status === "Rozliczam ZUS") {
            const rootRef = admin.database().ref();

            // Получим все записи для данного водителя
            const allDriverWeeks = (await rootRef.child(`drivers/${driverName}/weeks`).once('value')).val();

            const isDriverFirstCalculation = !allDriverWeeks || Object.keys(allDriverWeeks).length === 1;

            // Проверка, был ли ЗУС рассчитан ранее в этом месяце
            const previousZUSCalculations = (await rootRef.child(`drivers/${driverName}/weeks`).orderByChild('month').equalTo(currentMonth).once('value')).val();

            let zusAlreadyCalculated = false;
            for (let weekId in previousZUSCalculations) {
                if (previousZUSCalculations[weekId].zus && previousZUSCalculations[weekId].zus > 0) {
                    zusAlreadyCalculated = true;
                    break;
                }
            }

            const shouldCalculateZUS = (!zusAlreadyCalculated || isDriverFirstCalculation) && (currentDay >= 5 && currentDay <= 11 || isDriverFirstCalculation);

            if (shouldCalculateZUS) {
                let valueZUS = await rootRef.child(`drivers/${driverName}/valueZUS`).once('value').then(snap => snap.val()) || 0;
                if (!valueZUS) {
                    valueZUS = (await rootRef.child('admin/valueZUS').once('value')).val() || 0;
                }

                const totalUpdated = newValue.total - valueZUS;
                const updateData = {
                    total: totalUpdated,
                    zus: valueZUS || 0
                };

                if (valueZUS > 0) {
                    updateData.koztyUZ = 165.55;
                }

                await change.after.ref.update(updateData);
                shouldUpdateToPartnerStatus = true;
            } else {
                shouldUpdateToPartnerStatus = true;
            }
        }

        if (shouldUpdateToPartnerStatus && newValue.status !== "Rozliczam kwotę Partnera") {
            await change.after.ref.update({ status: "Rozliczam kwotę Partnera" });
        }

        return null;
    });







    exports.handlePartnerStatusChange = functions.database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();
        const driverName = context.params.driverName;
        
        if (previousValue.status !== "Rozliczam kwotę Partnera" && newValue.status === "Rozliczam kwotę Partnera") {
            const rootRef = admin.database().ref();
            // Пытаемся получить значение Partner у конкретного водителя
            let valuePartner = await rootRef.child(`drivers/${driverName}/valuePartner`).once('value').then(snap => snap.val());
            
            // Если у водителя нет значения Partner, берем его из административной части
            if (!valuePartner) {
                valuePartner = (await rootRef.child('admin/valuePartner').once('value')).val() || 0;
                console.log(`Using valuePartner from admin: ${valuePartner}`);
            } else {
                console.log(`Using valuePartner from driver ${driverName}: ${valuePartner}`);
            }
            
            const totalUpdated = newValue.total - valuePartner;
            await change.after.ref.update({
                total: totalUpdated,
                partner: valuePartner
            });
            await change.after.ref.update({
                status: "Rozliczam Umowę Najmu"
            });
        }
    });

exports.updateUmowaNajmuAndStatus = functions
    .runWith({ memory: '1GB' })
    .database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();
        if (previousValue.status !== "Rozliczam Umowę Najmu" && newValue.status === "Rozliczam Umowę Najmu") {
            const umowaNajmuValue = calculateUmowaNajmu(newValue);
            await change.after.ref.child('umowa_najmu').set(umowaNajmuValue);
            await change.after.ref.child('status').set("Czekam na Rozliczenie PIT");
            console.log(`Updated umowa_najmu value and status for driver ${context.params.driverName} and week ${context.params.weekId}`);
        } else if (previousValue.status !== "Czekam na Rozliczenie PIT" && newValue.status === "Czekam na Rozliczenie PIT") {
            const podatek_do_zaplaty = newValue.umowa_najmu * 0.085;
            await change.after.ref.child('podatek_do_zaplaty').set(podatek_do_zaplaty);
            await change.after.ref.child('status').set("Kierowca Rozliczony");
            console.log(`Calculated tax and updated status to "Kierowca Rozliczony" for driver ${context.params.driverName} and week ${context.params.weekId}`);
        }
        // Создание PDF на основе данных пользователя и обновленных данных
        const pdfBuffer = await createPDF(newValue, context.params.driverName, context.params.weekId);
        // Сохранение PDF в Firebase Cloud Storage
        const fileName = `${context.params.driverName}/umowaNajmu_${context.params.weekId}.pdf`;
        const pdfUrl = await saveToFirebaseStorage(pdfBuffer, fileName);
        const pit28Ref = admin.database().ref(`drivers/${context.params.driverName}/pit28/${context.params.weekId}`);
        const startDate = newValue.startDate;
        const endDate = newValue.endDate;
        const currentDate = new Date();
        const numer = `${context.params.weekId}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
        // Записываем всю генерируемую информацию в эту запись
        await pit28Ref.set({
            umowa_najmu: newValue.umowa_najmu,
            podatek_do_zaplaty: newValue.umowa_najmu * 0.085,
            pdfUrl: pdfUrl,
            status: "Kierowca Rozliczony",
            startDate: startDate,
            endDate: endDate,
            numer: numer,
            weekId: context.params.weekId
        });
        console.log(`PIT28 info saved for driver ${context.params.driverName} and week ${context.params.weekId}`);
        // Save the same data for admin with additional driverId and status "Dokument wygenerowany"
        const adminPit28Ref = admin.database().ref(`admin/pit28/${context.params.weekId}/${context.params.driverName}`);
        await adminPit28Ref.set({
            driverId: context.params.driverName,
            umowa_najmu: newValue.umowa_najmu,
            podatek_do_zaplaty: newValue.umowa_najmu * 0.085,
            pdfUrl: pdfUrl,
            status: "Dokument wygenerowany",
            startDate: startDate,
            endDate: endDate,
            numer: numer,
            weekId: context.params.weekId
        });
        console.log(`PIT28 info saved for admin for driver ${context.params.driverName} and week ${context.params.weekId}`);
    });

async function createPDF(data, driverName, weekId) {
    // Поиск пользователя по driverId (который соответствует driverName из RealtimeDB)
    const usersSnapshot = await admin.firestore().collection('users').where('driverId', '==', driverName).get();

    if (usersSnapshot.empty) {
        console.error(`No document found for driverName: ${driverName}`);
        return null;  // или бросьте ошибку, если это предпочтительнее
    }

    const driverData = usersSnapshot.docs[0].data();
    const signatureUrl = driverData.signatureUrl || '';  // Получение URL подписи или пустой строки, если URL отсутствует
    const adres = driverData.dane_personalne.correspondenceAddress;
    const imieINazwisko = `${driverData.firstName} ${driverData.lastName}`;
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
    const numer = `${weekId}/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    const startDate = data.startDate;
    const endDate = data.endDate;
    const templateUrl = "https://firebasestorage.googleapis.com/v0/b/ccmcolorpartner.appspot.com/o/template%2Frachunek_umowa_najmu.html?alt=media&token=59df9e07-7552-4cf7-83ca-3ce367030f2e";
    const response = await fetch(templateUrl);
    let templateHtml = await response.text();
    const umowaNajmuString = data.umowa_najmu.toFixed(2);
    const [umowaNajmuFull, umowaNajmuDecimal] = umowaNajmuString.split('.');

    // Заменяем плейсхолдеры
    templateHtml = templateHtml.replace(/PLACEHOLDER_UMOWA_NAJMU/g, umowaNajmuString);
    templateHtml = templateHtml.replace(/PLACEHOLDER_FULL/g, umowaNajmuFull);
    templateHtml = templateHtml.replace(/PLACEHOLDER_DECIMAL/g, umowaNajmuDecimal);
    templateHtml = templateHtml.replace("PLACEHOLDER_ADRES", adres);
    templateHtml = templateHtml.replace("PLACEHOLDER_IMIE_NAZWISKO", imieINazwisko);
    templateHtml = templateHtml.replace("PLACEHOLDER_START_DATE", startDate);
    templateHtml = templateHtml.replace("PLACEHOLDER_END_DATE", endDate);
    templateHtml = templateHtml.replace("PLACEHOLDER_CURRENT_DATE", formattedDate);
    templateHtml = templateHtml.replace("PLACEHOLDER_NUMER", numer);
    templateHtml = templateHtml.replace("PLACEHOLDER_SIGNATURE", signatureUrl);  // Заменяем плейсхолдер подписи

    const browser = await puppeteer.launch({
        executablePath: await chrome.executablePath,
        headless: true,
        args: chrome.args
    });

    const page = await browser.newPage();
    await page.setContent(templateHtml);
    const pdfBuffer = await page.pdf({ format: 'A4' });
    await browser.close();
    return pdfBuffer;
}

async function saveToFirebaseStorage(pdfBuffer, fileName) {
    const bucket = admin.storage().bucket('ccmcolorpartner.appspot.com');
    const file = bucket.file(fileName);
    const fileWriteStream = file.createWriteStream({
        metadata: {
            contentType: 'application/pdf',
        },
    });
    fileWriteStream.end(pdfBuffer);
    await new Promise((resolve, reject) => {
        fileWriteStream.on('finish', resolve);
        fileWriteStream.on('error', reject);
    });
    const [pdfDownloadUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
    });
    return pdfDownloadUrl;
}

async function saveToFirebaseStorage(pdfBuffer, fileName) {
    const bucket = admin.storage().bucket('ccmcolorpartner.appspot.com');
    const file = bucket.file(fileName);
    const fileWriteStream = file.createWriteStream({
        metadata: {
            contentType: 'application/pdf',
        },
    });
    fileWriteStream.end(pdfBuffer);
    await new Promise((resolve, reject) => {
        fileWriteStream.on('finish', resolve);
        fileWriteStream.on('error', reject);
    });
    const [pdfDownloadUrl] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491'
    });
    return pdfDownloadUrl;
}
function calculateUmowaNajmu(data) {
    const przychod = Math.abs(data.przychod_dodatkowy || 0) + Math.abs(data.kursy || 0) + Math.abs(data.tips || 0);
    const potracenia_podatki = Math.abs(data.inne || 0) + Math.abs(data.commission || 0) + Math.abs(data.vat_dodatkowy || 0) + Math.abs(data.vat_przejazdy || 0);
    const zwrot_vat_z_faktur_za_paliwo = Math.abs(data.vat_bonus || 0);
    const rozliczenie = Math.abs(data.partner || 0);
    const zwrot_kosztow = Math.abs(data.zwrot_kosztow || 0);
    return przychod - potracenia_podatki + zwrot_vat_z_faktur_za_paliwo - rozliczenie - zwrot_kosztow;
}
exports.updateDriverBalance = functions.database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();
        if (previousValue.status !== "Kierowca Rozliczony" && newValue.status === "Kierowca Rozliczony") {
            const totalValue = newValue.total || 0;
            const driverRef = change.after.ref.parent.parent.parent;
            const driverSnapshot = await driverRef.once('value');
            const currentBalance = driverSnapshot.val().balance || 0;
            const updatedBalance = currentBalance + totalValue;
            await driverRef.child('balance').set(updatedBalance);
            await change.after.ref.child('status').set("Generuję kwotę przelewu");
            console.log(`Updated balance for driver ${context.params.driverName} and set status to "Generuję kwotę przelewu"`);
        }
    });
exports.generateTransferAmount = functions.database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();
        if (previousValue.status !== "Generuję kwotę przelewu" && newValue.status === "Generuję kwotę przelewu") {
            // Извлекаем необходимые значения из данных
            const umowaNajmu = newValue.total || 0;
            const gotowka = Math.abs(newValue.gotowka) || 0; // Убедимся, что значение gotowka положительное
            const zwrotKosztow = newValue.zwrot_kosztow || 0;
            const kosztyUZ = newValue.koztyUZ || 0;
            const wynajem = newValue.wynajem || 0;
            // Рассчитываем roznica
            const roznica = gotowka - zwrotKosztow;
            // Вычисляем Przelew
            const przelew = umowaNajmu - gotowka + zwrotKosztow + kosztyUZ - wynajem;
            // Обновляем данные в базе данных
            await change.after.ref.update({
                roznica: roznica,   // Добавляем roznica в обновление
                przelew: przelew,
                status: "Rozliczenie zakończone"
            });
        }
        return null;
    });
exports.notifyDriver = functions.database.ref('drivers/{driverName}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const newValue = change.after.val();
        const previousValue = change.before.val();
        if (previousValue.status !== "Wyślij rozliczenie" && newValue.status === "Wyślij rozliczenie") {
            const driverName = context.params.driverName;
            const usersSnapshot = await admin.firestore().collection('users').where('driverId', '==', driverName).limit(1).get();
            if (usersSnapshot.empty) {
                console.error(`No user found in Firestore with the driverId ${driverName}`);
                return null;
            }
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            const driverEmail = userData.mail;
            if (!driverEmail) {
                console.error(`User with driverId ${driverName} does not have an email address`);
                return null;
            }
            const emailData = {
                to: driverEmail,
                message: {
                    subject: 'Twoje rozliczenie jest gotowe!',
                    html: `
                        Drogi kierowco,<br><br>
                        Twoje rozliczenie za tydzień jest gotowe. Proszę sprawdzić aplikację, aby uzyskać szczegóły.<br><br>
                        Pozdrawiamy,<br>
                        Twój zespół
                    `,
                }
            };
            await admin.firestore().collection('mail').add(emailData);
            console.log(`Added email data for ${driverEmail} to Firestore`);
            await change.after.ref.update({ status: "Rozliczenie wysłane na maila" });
        }
    });
    exports.sendNotifications = functions.https.onRequest((request, response) => {
        return corsHandler(request, response, async () => {
            if (request.method === 'OPTIONS') {
                response.set('Access-Control-Allow-Methods', 'POST');
                response.set('Access-Control-Allow-Headers', 'Content-Type');
                response.set('Access-Control-Allow-Origin', 'https://www.panel-color.pl');
                response.status(204).send('');
                return;
            }
    
            const { users, subject, message, imageUrl } = request.body;
    
            if (!users || !subject || !message) {
                response.status(400).send({ error: 'Some required parameters are missing.' });
                return;
            }
            const formattedMessage = message.replace(/\n/g, "<br>") + "<br><br>Pozdrawiamy, zespół ColorPartner";
    
            try {
                let targetUsers = [];
    
                if (users.includes("all")) {
                    // Получите список всех пользователей из Firestore
                    const allUsersSnapshot = await admin.firestore().collection('users').get();
                    allUsersSnapshot.forEach(doc => targetUsers.push(doc.data()));
                } else {
                    for (const userId of users) {
                        const userSnapshot = await admin.firestore().collection('users').doc(userId).get();
                        if (!userSnapshot.exists) {
                            throw new Error(`No user found in Firestore with the userId ${userId}`);
                        }
                        targetUsers.push(userSnapshot.data());
                    }
                }
    
                const promises = targetUsers.map(userData => {
                    const userEmail = userData.email;
                    if (!userEmail) {
                        throw new Error(`User with userId ${userData.id} does not have an email address`);
                    }
                    const emailData = {
                        to: userEmail,
                        message: {
                            subject: subject,
                            html: `${formattedMessage}<br><br>${imageUrl ? `<img src="${imageUrl}" alt="Attached Image"/>` : ''}`,
                        }
                    };
                    return admin.firestore().collection('mail').add(emailData);
                });
                
                await Promise.all(promises);
                response.set('Access-Control-Allow-Origin', 'https://www.panel-color.pl');
                response.send({ status: 'success' });
            } catch (error) {
                console.error('Error sending notifications:', error);
                response.status(500).send({ error: 'Failed to send notifications.' });
            }
        });
    });
    
exports.updateFinance = functions.https.onRequest((request, response) => {
    return corsHandler(request, response, async () => {
        if (request.method === 'OPTIONS') {
            response.set('Access-Control-Allow-Methods', 'POST');
            response.set('Access-Control-Allow-Headers', 'Content-Type');
            response.set('Access-Control-Allow-Origin', 'https://www.panel-color.pl');
            response.status(204).send('');
            return;
        }

        const { month, type, description, brutto, vat, netto } = request.body;

        if (!month || !type || !description || !brutto || !vat || !netto) {
            response.status(400).send({ error: 'Some required parameters are missing.' });
            return;
        }

        const vatValue = brutto * (vat / 100);

        const financeRef = admin.firestore().collection('finances').doc(month);
        let financeData = await financeRef.get();

        if (!financeData.exists) {
            // инициализация начальных данных, если они отсутствуют
            const initialData = {
                "Przychód": {
                    "brutto": 0,
                    "netto": 0,
                    "vat": 0,
                    "details": {}
                },
                "Wydatki": {
                    "brutto": 0,
                    "netto": 0,
                    "vat": 0,
                    "details": {}
                },
                "Dochód netto": 0,
                "Dochód brutto": 0,
                "Dochód VAT": 0
            };
            await financeRef.set(initialData);
            financeData = await financeRef.get();
        }
        console.log("financeData exists:", financeData.exists);

        const currentData = financeData.data();

        // Проверка и инициализация details для выбранного типа
        if (!currentData[type]) {
            currentData[type] = {
                brutto: 0,
                netto: 0,
                vat: 0,
                details: {}
            };
        }

        // Создание новой транзакции
        const transactionData = {
            date: admin.firestore.Timestamp.fromDate(new Date(request.body.date)),
            description: request.body.description,
            brutto: request.body.brutto,
            vat: request.body.vat,
            netto: request.body.netto
        };

        // Добавляем транзакцию в details
        const transactionId = financeRef.collection(type).doc().id;
        currentData[type].details[transactionId] = transactionData;

        // Обновление общих значений
        console.log("Current type:", type);
        console.log("Current data:", currentData);

        currentData[type].brutto += request.body.brutto;
        currentData[type].vat += request.body.brutto * (request.body.vat / 100);
        currentData[type].netto += request.body.netto;

        // Обновление общего дохода
        currentData["Dochód brutto"] = currentData["Przychód"].brutto - currentData["Wydatki"].brutto;
        currentData["Dochód netto"] = currentData["Przychód"].netto - currentData["Wydatki"].netto;
        currentData["Dochód VAT"] = currentData["Przychód"].vat - currentData["Wydatki"].vat;

        try {
            await financeRef.update(currentData);
            response.send({ status: 'success' });
        } catch (error) {
            console.error('Error updating finance data:', error);
            response.status(500).send({ error: 'Failed to update finance data.' });
        }
    });
});

exports.createTransactionsFromSummary = functions.database.ref('drivers/{driverId}/weeks/{weekId}/summary')
    .onUpdate(async (change, context) => {
        const beforeData = change.before.val();
        const afterData = change.after.val();

        if (beforeData.status !== 'Rozliczenie zakońoczone' && afterData.status === 'Rozliczenie zakońoczone') {
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const currentDate = new Date(afterData.endDate);
            const month = monthNames[currentDate.getMonth()];
            const year = currentDate.getFullYear();

            const financeRef = admin.firestore().collection('finances').doc(`${month} ${year}`);
            let financeData = await financeRef.get();

            if (!financeData.exists) {
                const initialData = {
                    "Przychód": {
                        "brutto": 0,
                        "netto": 0,
                        "vat": 0,
                        "details": {}
                    },
                    "Wydatki": {
                        "brutto": 0,
                        "netto": 0,
                        "vat": 0,
                        "details": {}
                    },
                    "Dochód netto": 0,
                    "Dochód brutto": 0,
                    "Dochód VAT": 0
                };
                await financeRef.set(initialData);
                financeData = await financeRef.get();
            }

            const currentData = financeData.data();
            const driver = context.params.driverId;
            const week = context.params.weekId;

            const generateTransaction = (amount, vatPercentage, description) => {
                const vat = amount * vatPercentage;
                return {
                    date: admin.firestore.Timestamp.fromDate(new Date(afterData.endDate)),
                    description: `${description} ${driver} ${week}`,
                    brutto: amount + vat,
                    vat: vat,
                    netto: amount
                };
            };

            const addTransaction = (type, transaction) => {
                const transactionId = financeRef.collection(type).doc().id;
                currentData[type].details[transactionId] = transaction;
                currentData[type].brutto += transaction.brutto;
                currentData[type].vat += transaction.vat;
                currentData[type].netto += transaction.netto;
            };

            // Commission
            addTransaction("Wydatki", generateTransaction(afterData.commission, 0.08, "Commission"));

            // Gotowka
            addTransaction("Wydatki", generateTransaction(afterData.gotowka, 0, `Gotówka ${driver} ${week}`));

            // Inne
            addTransaction("Wydatki", generateTransaction(afterData.inne, 0, `Inne ${driver} ${week}`));

            // Kursy
            addTransaction("Przychód", generateTransaction(afterData.kursy, afterData.vat_przejazdy / afterData.kursy, `Kursy ${driver} ${week}`));

            // Partner
            addTransaction("Przychód", generateTransaction(parseFloat(afterData.partner), 0, `Opłata partnerska ${driver} ${week}`));

            // Przychod Dodatkowy
            addTransaction("Przychód", generateTransaction(afterData.przychod_dodatkowy, afterData.vat_dodatkowy / afterData.przychod_dodatkowy, `Przychód dodatkowy ${driver} ${week}`));

            // Total
            addTransaction("Wydatki", generateTransaction(afterData.total, 0, `Wypłata ${driver} ${week}`));

            // Wynajem
            addTransaction("Przychód", generateTransaction(parseFloat(afterData.wynajem), 0, `Wynajem ${driver} ${week}`));

            // ZUS
            addTransaction("Przychód", generateTransaction(parseFloat(afterData.zus), 0, `ZUS ${driver} ${week}`));

            // VAT Bonus
            addTransaction("Wydatki", generateTransaction(afterData.vat_bonus, 1, `VAT Bonus ${driver} ${week}`));

            // After adding all transactions, update the finance document:

            currentData["Dochód brutto"] = currentData["Przychód"].brutto - currentData["Wydatki"].brutto;
            currentData["Dochód netto"] = currentData["Przychód"].netto - currentData["Wydatki"].netto;
            currentData["Dochód VAT"] = currentData["Przychód"].vat - currentData["Wydatki"].vat;

            try {
                await financeRef.update(currentData);
            } catch (error) {
                console.error('Error updating finance data:', error);
                return null;
            }
        }

        return null;
    });
exports.generateDocument = functions.runWith({
    timeoutSeconds: 540, // Максимальное время ожидания — 9 минут
    memory: '2GB' // Увеличиваем память до 2GB
}).https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        try {
            const driverName = req.body.driverName;
            const documentType = req.body.documentType;

            console.log("Received request path:", req.path);
            console.log("Received driverName:", driverName);
            console.log("Determined documentType:", documentType);

            const pdfUrl = await createPdfVer(driverName, documentType);

            if (!pdfUrl) {
                res.status(500).send("Error generating the document.");
                return;
            }

            res.set('Content-Type', 'application/json');
            res.send({ pdfUrl: pdfUrl });

        } catch (error) {
            console.error("Error in generateDocument:", error);
            res.status(500).send("Internal server error.");
        }
    });
});
async function createPdfVer(driverName, documentType) {
    let templateUrl;
    console.log("Document Type in Cloud Function:", documentType);

    switch (documentType) {
        case "regulamin":
            templateUrl = "https://firebasestorage.googleapis.com/v0/b/ccmcolorpartner.appspot.com/o/template%2Fzasday_wspolpracy.html?alt=media&token=3bc77319-a1e1-4dc2-a2ed-8d7345e6d7fc";
            break;
        case "zasadyWspolpracy":
            templateUrl = "https://firebasestorage.googleapis.com/v0/b/ccmcolorpartner.appspot.com/o/template%2Fzasday_wspolpracy.html?alt=media&token=3bc77319-a1e1-4dc2-a2ed-8d7345e6d7fc";
            break;
        case "rodo":
            templateUrl = "https://firebasestorage.googleapis.com/v0/b/ccmcolorpartner.appspot.com/o/template%2Frodo.html?alt=media&token=45f753ce-88a9-4d7b-9598-b16056f40cd8";
            break;
        default:
            throw new Error("Invalid document type");
    }
    console.log("Using templateUrl:", templateUrl);

    const usersSnapshot = await admin.firestore().collection('users').where('driverId', '==', driverName).get();
    if (usersSnapshot.empty) {
        console.error(`No user found with driverId: ${driverName}`);
        throw new Error(`No user found with driverId: ${driverName}`);
    }

    const userDoc = usersSnapshot.docs[0];
    const userMainData = userDoc.data();

    const userId = userDoc.id;
    const danePersonalneSnapshot = await admin.firestore().collection('users').doc(userId).collection('dokumenty').doc('dane_personalne').get();

    if (!danePersonalneSnapshot.exists) {
        console.error(`No dane_personalne found for userId: ${userId}`);
        throw new Error(`No dane_personalne found for userId: ${userId}`);
    }

    const driverData = danePersonalneSnapshot.data();
    console.log("Retrieved driverData:", driverData);

    const documentSignatureSnapshot = await admin.firestore().collection('users').doc(userId).collection('dokumenty').doc(documentType).get();
    let signatureUrl = "OCZEKUJĘ NA PODPIS";
    if (documentSignatureSnapshot.exists && documentSignatureSnapshot.data().signature) {
        signatureUrl = documentSignatureSnapshot.data().signature;
    }

    const response = await fetch(templateUrl);
    let templateHtml = await response.text();

    templateHtml = templateHtml.replace("PLACEHOLDER_FIRST_NAME", userMainData.firstName);
    templateHtml = templateHtml.replace("PLACEHOLDER_LAST_NAME", userMainData.lastName);
    templateHtml = templateHtml.replace("PLACEHOLDER_PESEL", driverData.pesel);

    templateHtml = templateHtml.replace("PLACEHOLDER_REGISTRATION_ADDRESS", driverData.registrationAddress);
    templateHtml = templateHtml.replace("PLACEHOLDER_DATE", new Date().toLocaleDateString());
    templateHtml = templateHtml.replace("PLACEHOLDER_SIGNATURE", `<img src="${signatureUrl}" alt="Podpis" width="150" height="100">`);

    const browser = await puppeteer.launch({
        args: chrome.args,
        executablePath: await chrome.executablePath,
        headless: chrome.headless,
    });

    const page = await browser.newPage();
    await page.setContent(templateHtml);
    const pdfBuffer = await page.pdf({ format: 'A4' });

    // Saving the PDF to Firebase Cloud Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(`documents/${driverName}/${documentType}.pdf`);
    await file.save(pdfBuffer);

    // Getting the URL of the saved PDF
    const pdfUrl = await file.getSignedUrl({
        action: 'read',
        expires: '03-17-2025'
    });

    // Update the Firestore document if it was signed
    if (signatureUrl !== "OCZEKUJĘ NA PODPIS") {
        await admin.firestore().collection('users').doc(userId).collection('dokumenty').doc(documentType).set({
            signed: true,
            pdfUrl: pdfUrl[0]
        }, { merge: true });
    }

    await browser.close();

    return pdfUrl[0];
}


const generateUniqueName = (invoiceNumber) => {
    const date = new Date();
    const formattedDate = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
    return `${formattedDate}_${invoiceNumber.replace(/\//g, '-')}`;
};

exports.onInvoiceStatusChange = functions.database.ref('drivers/{driverName}/invoices/{invoiceId}')
    .onUpdate(async (change, context) => {
        const beforeData = change.before.val();
        const afterData = change.after.val();

        // Проверяем, был ли статус изменен на "zaakceptowany"
        if (beforeData.status !== 'zaakceptowany' && afterData.status === 'zaakceptowany') {
            const monthYear = afterData.purchaseDate.slice(0, 7); // получаем YYYY-MM из purchaseDate
            const companyData = await fetchDataFromRegon(afterData.nipseller);

            const dataToSave = {
                numerfaktury: afterData.numerfaktury,
                vatAmount: afterData.vatAmount,
                vatRate: afterData.vatRate,
                netAmount: afterData.netAmount,
                grossAmount: afterData.grossAmount,
                fileURL: afterData.fileURL,
                companyName: companyData.companyName,
                address: companyData.address
            };

            // Генерация уникального имени для сохранения в Firestore
            const uniqueDocName = generateUniqueName(afterData.numerfaktury);

            // Сохраняем данные в Firestore
            await admin.firestore()
                .collection('finance')
                .doc(monthYear)
                .collection('wydatki')
                .doc(uniqueDocName)
                .set(dataToSave);

            console.log(`Invoice ${afterData.numerfaktury} for month ${monthYear} saved in Firestore with doc name ${uniqueDocName}.`);
        }
    });

const fetchDataFromRegon = async (nip) => {
    console.log(`Fetching data for NIP: ${nip}`);

    try {
        console.log('Creating client for REGON...');
        const client = await createClient({
            key: "c2722d1516fe4455a818",
            birVersion: '1.1',
            sandbox: false
        });

        console.log('Client created successfully.');
        console.log('Finding company by NIP...');
        const findCompanyByNip = await client.findByNip(nip);  // Изменил gus на client
        console.log(`Found company with Regon: ${findCompanyByNip.Regon}`);

        console.log('Fetching full report...');
        const companyRegon = findCompanyByNip.Regon;
        const fullReport = await client.getFullReport(companyRegon, findCompanyByNip.Typ, findCompanyByNip.SilosID);  // Изменил gus на client
        console.log('Full report fetched successfully.');

        return {
            nip: findCompanyByNip.NIP,
            companyName: findCompanyByNip.Nazwa,
            address: `${findCompanyByNip.Ulica} ${findCompanyByNip.NrNieruchomosci}, ${findCompanyByNip.KodPocztowy} ${findCompanyByNip.Miejscowosc}`
        };

    } catch (error) {
        console.error('Error fetching data from REGON:', error);
        throw error;
    }
};
exports.generateJPKVAT = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method === 'OPTIONS') {
            // Этот блок будет обрабатывать предварительные запросы (pre-flight).
            response.set('Access-Control-Allow-Methods', 'POST');
            response.set('Access-Control-Allow-Headers', 'Content-Type');
            response.set('Access-Control-Allow-Origin', 'https://www.panel-color.pl');
            response.status(204).send('');
            return;
        }

        try {
            console.log("Received request:", request.body);

            // Проверка на наличие параметра месяца в запросе
            if (!request.body.month || !request.body.year) {
                console.warn("Year and Month parameters are required in request.");
                response.status(400).send('Year and Month parameters are required');
                return;
            }

            // Генерация XML для продаж и покупок на основе указанного месяца
            const salesXML = await generateXMLForSales(request.body.year, request.body.month);

            const combinedXML = salesXML;


            // Сохранение XML в Firebase Storage и получение URL
            const fileURL = await saveXMLToStorage(combinedXML, request.body.year, request.body.month);

            // Добавьте запись в Firestore с метаданными о созданном файле
            const month = request.body.month;
            const year = request.body.year;
            const docId = `${year}-${month}`;

            console.log("Saving metadata to Firestore...");
            await admin.firestore()
                .collection('finance')
                .doc(docId)
                .collection('jpk_reports')
                .add({
                    generationDate: new Date(),
                    month: month,
                    year: year,
                    fileURL: fileURL
                });

            console.log("JPK VAT generation and save completed successfully.");
            // Вернуть URL созданного файла как часть ответа
            response.status(200).json({ fileURL });

        } catch (error) {
            console.error('Error generating JPK VAT:', error);
            response.status(500).send('Internal server error');
        }
    });
});
const generateXMLForSales = async (year, month) => {
    const path = `${year}-${month}`;

    const sprzedazRef = admin.firestore().collection('finance').doc(path).collection('przychody');
    const zakupRef = admin.firestore().collection('finance').doc(path).collection('wydatki');

    const zakupSnapshot = await zakupRef.get();
    const sprzedazSnapshot = await sprzedazRef.get();
    const currentDateTime = new Date().toISOString();

    if (sprzedazSnapshot.empty && zakupSnapshot.empty) {
        console.log('No sales or purchases data found for the given month/year.');
        return '</tns:JPK>';
    }
    let totalVATSales = 0;
    let totalVATPurchases = 0;
    let totalNetPurchases = 0; // Сумма всех покупок без НДС

    // Рассчитываем значения для блока <tns:Deklaracja>
    let P_38 = 0;
    let P_42 = totalNetPurchases;
    let P_43 = totalVATPurchases;
    let P_48 = P_43;
    let P_51 = P_38 - P_48;
    let P_53 = P_48 > P_38 ? P_48 - P_38 : 0;
    let P_62 = P_53 == P_48 - P_38 ? P_53 : 0;
    // Начало XML
    let xml = `<tns:JPK xmlns:tns="http://crd.gov.pl/wzor/2021/12/27/11148/" xmlns:etd="http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2021/06/08/eD/DefinicjeTypy/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
        <tns:Naglowek>
            <tns:KodFormularza kodSystemowy="JPK_V7M (2)" wersjaSchemy="1-0E">JPK_VAT</tns:KodFormularza>
            <tns:WariantFormularza>2</tns:WariantFormularza>
            <tns:DataWytworzeniaJPK>${currentDateTime}</tns:DataWytworzeniaJPK>
            <tns:NazwaSystemu>Ognik Premium</tns:NazwaSystemu>
            <tns:CelZlozenia poz="P_7">1</tns:CelZlozenia>
            <tns:KodUrzedu>0224</tns:KodUrzedu>
            <tns:Rok>${year}</tns:Rok>
            <tns:Miesiac>${month}</tns:Miesiac>
        </tns:Naglowek>
        <tns:Podmiot1 rola="Podatnik">
            <tns:OsobaNiefizyczna>
                <tns:NIP>8943198563</tns:NIP>
                <tns:PelnaNazwa>
                COLOR PARTNER SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
                </tns:PelnaNazwa>
                <tns:Email>krystynalupa@wp.pl</tns:Email>
            </tns:OsobaNiefizyczna>
        </tns:Podmiot1>`;

    xml += `
    <tns:Deklaracja>
    <tns:Naglowek>
<tns:KodFormularzaDekl kodSystemowy="VAT-7 (22)" kodPodatku="VAT" rodzajZobowiazania="Z" wersjaSchemy="1-0E">VAT-7</tns:KodFormularzaDekl>
<tns:WariantFormularzaDekl>22</tns:WariantFormularzaDekl>
</tns:Naglowek>
        <tns:PozycjeSzczegolowe>
        <tns:P_38>${Math.round(P_38)}</tns:P_38>
        <tns:P_42>${Math.round(P_42)}</tns:P_42>
        <tns:P_43>${Math.round(P_43)}</tns:P_43>
        <tns:P_48>${Math.round(P_48)}</tns:P_48>
        <tns:P_51>${Math.round(P_51)}</tns:P_51>
        <tns:P_53>${Math.round(P_53)}</tns:P_53>
        <tns:P_62>${Math.round(P_62)}</tns:P_62>        
        </tns:PozycjeSzczegolowe>
        <tns:Pouczenia>1</tns:Pouczenia>
    </tns:Deklaracja>
    <tns:Ewidencja>
    `;

    let sprzedazCounter = 0;  // инициализация счетчика

    // Добавление данных о продажах
    sprzedazSnapshot.forEach(doc => {
        const data = doc.data();
        totalVATSales += parseFloat(data.vatAmount || "0");
        xml += `
                <tns:SprzedazWiersz>
                <tns:LpZakupu>${sprzedazCounter}</tns:tns:LpZakupu>
                    <tns:NrKontrahenta>${data.nip}</tns:NrKontrahenta>
                    <tns:NazwaKontrahenta>${data.companyName}</tns:NazwaKontrahenta>
                    <tns:AdresKontrahenta>${data.address}</tns:AdresKontrahenta>
                    <tns:DowodSprzedazy>${data.numerfaktury}</tns:DowodSprzedazy>
                    <tns:DataWystawienia>${data.purchaseDate}</tns:DataWystawienia>
                    <tns:K_19>${data.netAmount}</tns:K_19>
                    <tns:K_20>${data.vatAmount}</tns:K_20>
                </tns:SprzedazWiersz>
            `;
    });
    xml += `
    <tns:SprzedazCtrl>
        <tns:LiczbaWierszySprzedazy>${sprzedazSnapshot.size}</tns:LiczbaWierszySprzedazy>
        <tns:PodatekNalezny>${totalVATSales.toFixed(2)}</tns:PodatekNalezny>
    </tns:SprzedazCtrl>
`;
    let zakupCounter = 0;  // инициализация счетчика

    // Добавление данных о покупках
    zakupSnapshot.forEach(doc => {
        zakupCounter++;  // увеличиваем счетчик на 1
        const data = doc.data();
        totalNetPurchases += parseFloat(data.netAmount || "0");
        totalVATPurchases += parseFloat(data.vatAmount || "0");
        xml += `
                <tns:ZakupWiersz>
                <tns:LpZakupu>${zakupCounter}</tns:LpZakupu>
                    <tns:NrDostawcy>${data.nip}</tns:NrDostawcy>
                    <tns:NazwaDostawcy>${data.companyName}</tns:NazwaDostawcy>
                    <tns:DowodZakupu>${data.numerfaktury}</tns:DowodZakupu>
                    <tns:DataZakupu>${data.purchaseDate}</tns:DataZakupu>
                    <tns:DataWplywu>${data.purchaseDate}</tns:DataWplywu>
                    <tns:K_42>${data.netAmount}</tns:K_42>
                    <tns:K_43>${data.vatAmount}</tns:K_43>
                </tns:ZakupWiersz>
            `;
    });



    xml += `
        <tns:ZakupCtrl>
            <tns:LiczbaWierszyZakupow>${zakupSnapshot.size}</tns:LiczbaWierszyZakupow>
            <tns:PodatekNaliczony>${totalVATPurchases.toFixed(2)}</tns:PodatekNaliczony>
        </tns:ZakupCtrl>
    </tns:Ewidencja>
    </tns:JPK>`;

    return xml;
}

const saveXMLToStorage = async (xml, year, month) => {
    const storage = new Storage();

    // Определите путь к файлу в Firebase Storage
    const filePath = `jpk_reports/JPK_${year}_${month}.xml`;
    const bucketName = 'ccmcolorpartner.appspot.com'; // Название вашего бакета
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    console.log(`Saving XML to ${filePath} in bucket ${bucketName}...`);

    // Загружаем XML в Firebase Storage
    await file.save(xml, {
        contentType: 'application/xml',
        public: true,
        metadata: {
            cacheControl: 'public, max-age=300',
        },
    });

    console.log(`File saved successfully at ${filePath}`);

    // Возвращает публичный URL файла
    return `https://storage.googleapis.com/${bucketName}/${filePath}`;
};

exports.getDriversDataForWeek = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        try {
            const weekNumber = req.query.weekNumber;

            if (!weekNumber) {
                res.status(400).send('Week number is required.');
                return;
            }

            const snapshot = await admin.database().ref('/drivers').once('value');
            const drivers = snapshot.val();
            let weekData = {};

            // Extract only necessary data for each driver
            for (let driverId in drivers) {
                const driverData = drivers[driverId];
                const driverWeekData = driverData.weeks?.[weekNumber];

                if (driverWeekData) {
                    weekData[driverId] = {
                        // Include any other driver data you need here
                        balance: driverData.balance,
                        weeks: {
                            [weekNumber]: driverWeekData
                        }
                    };
                }
            }

            res.status(200).send(weekData);
        } catch (error) {
            console.error('Error fetching drivers: ', error);
            res.status(500).send(error);
        }
    });
});
