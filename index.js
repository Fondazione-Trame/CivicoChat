const API_URL = 'https://civicochat.pingumc.com/api';
            let token = localStorage.getItem('token');
            let currentUser = JSON.parse(localStorage.getItem('currentUser'));
            let turni = [];
            let currentDate = new Date();

            async function fetchAPI(endpoint, options = {}) {
                if (token) {
                    options.headers = {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    };
                }

                try {
                    const response = await fetch(`${API_URL}${endpoint}`, options);
                    const data = await response.json();

                    if (!response.ok) {
                        throw new Error(data.error || 'Errore nella richiesta');
                    }

                    return data;
                } catch (error) {
                    console.error('Errore API:', error);
                    throw error;
                }
            }

            // Modifica alla funzione generateCalendar per rendere tutti i giorni cliccabili
function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');

    ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].forEach(day => {
        const th = document.createElement('th');
        th.textContent = day;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Calcola il giorno della settimana del primo giorno del mese (0 = Domenica, 1 = Lunedì, ...)
    let startingDay = firstDay.getDay();
    // Converti la domenica (0) in 7 per allinearsi con il nostro calendario che inizia di lunedì
    if (startingDay === 0) startingDay = 7;
    // Aggiusta per iniziare da lunedì (1)
    startingDay--;

    let date = 1;
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('tr');

        for (let j = 0; j < 7; j++) {
            const cell = document.createElement('td');

            if (i === 0 && j < startingDay) {
                // Celle vuote prima dell'inizio del mese
                cell.classList.add('empty');
                row.appendChild(cell);
            } else if (date > lastDay.getDate()) {
                // Celle vuote dopo la fine del mese
                cell.classList.add('empty');
                row.appendChild(cell);
            } else {
                // Giorni del mese
                cell.textContent = date;

                // Formatta la data corrente come YYYY-MM-DD
                const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

                // Verifica se oggi
                const today = new Date();
                if (date === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    cell.classList.add('today');
                }

                // Verifica se ci sono turni per questo giorno
                const turniDelGiorno = turni.filter(turno => {
                    return turno.shift_date === currentDateStr || turno.data === currentDateStr;
                });

                if (turniDelGiorno.length > 0) {
                    // Aggiungi badge con il numero di turni
                    const badge = document.createElement('div');
                    badge.classList.add('turno-badge');
                    badge.textContent = turniDelGiorno.length;
                    cell.appendChild(badge);

                    // Aggiungi indicatori per i tipi di servizio
                    const indicatorsDiv = document.createElement('div');
                    indicatorsDiv.classList.add('turni-indicator');

                    // Crea un Set dei servizi per mostrare ogni tipo una sola volta
                    const servizi = new Set();
                    turniDelGiorno.forEach(turno => {
                        const servizio = turno.service || turno.servizio;
                        if (servizio) servizi.add(servizio.toLowerCase());
                    });

                    // Aggiungi i dot per ogni tipo di servizio
                    servizi.forEach(servizio => {
                        const dot = document.createElement('span');
                        dot.classList.add('dot', servizio.toLowerCase());
                        indicatorsDiv.appendChild(dot);
                    });

                    cell.appendChild(indicatorsDiv);
                }

                // Rendi la cella cliccabile
                cell.onclick = () => handleDayClick(currentDateStr, date);

                date++;
            }

            row.appendChild(cell);
        }

        table.appendChild(row);

        if (date > lastDay.getDate()) {
            break;
        }
    }

    calendarDiv.appendChild(table);
}

// Funzione per gestire il click su un giorno del calendario
function handleDayClick(dateStr, dayNumber) {
    // Rimuovi la classe selected-day da tutte le celle
    document.querySelectorAll('td').forEach(td => td.classList.remove('selected-day'));

    // Trova la cella corrispondente al giorno selezionato
    document.querySelectorAll('td').forEach(td => {
        if (!td.classList.contains('empty') && parseInt(td.textContent) === dayNumber) {
            td.classList.add('selected-day');
        }
    });

    // Filtra i turni per la data selezionata
    const turniDelGiorno = turni.filter(turno => {
        return turno.shift_date === dateStr || turno.data === dateStr;
    });

    if (turniDelGiorno.length > 0) {
        // Dividere i turni in mattina e pomeriggio
        const turniMattina = turniDelGiorno.filter(turno => {
            const oraInizio = parseInt((turno.start_time || turno.oraInizio).split(':')[0]);
            return oraInizio < 13;
        });

        const turniPomeriggio = turniDelGiorno.filter(turno => {
            const oraInizio = parseInt((turno.start_time || turno.oraInizio).split(':')[0]);
            return oraInizio >= 13;
        });

        showTurniDetailsWithTable(turniDelGiorno, turniMattina, turniPomeriggio, dateStr);
    } else {
        // Se non ci sono turni, mostra un messaggio
        const modal = document.getElementById('turnoModal');
        const detailsDiv = document.getElementById('turnoDetails');

        const data = new Date(dateStr);
        const dataFormatted = data.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        detailsDiv.innerHTML = `
            <h4>Turni del ${dataFormatted}</h4>
            <p class="no-data">Nessun turno programmato per questa data.</p>
            <div style="text-align: center; margin-top: 20px;">
                <button id="addTurnoBtn">➕ Aggiungi turno per questa data</button>
            </div>
        `;

        modal.style.display = 'block';

        document.getElementById('addTurnoBtn').addEventListener('click', () => {
            document.getElementById('data').value = dateStr;
            closeModal();
            showTab('aggiungi');
        });
    }
}

// Nuova funzione per mostrare i dettagli dei turni con tabella mattina/pomeriggio
function showTurniDetailsWithTable(turniGiorno, turniMattina, turniPomeriggio, dateStr) {
    const modal = document.getElementById('turnoModal');
    const detailsDiv = document.getElementById('turnoDetails');

    detailsDiv.innerHTML = '';

    // Formatta la data per l'intestazione
    const data = new Date(dateStr);
    const dataFormatted = data.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Intestazione
    const header = document.createElement('h4');
    header.textContent = `Turni del ${dataFormatted}`;
    detailsDiv.appendChild(header);

    // Crea la tabella per fasce orarie
    const table = document.createElement('table');
    table.className = 'turni-table';

    // Intestazione tabella
    table.innerHTML = `
        <thead>
            <tr>
                <th>Fascia oraria</th>
                <th>Operatori</th>
            </tr>
        </thead>
    `;

    // Corpo tabella
    const tbody = document.createElement('tbody');

    // Riga mattina
    const morningRow = document.createElement('tr');
    morningRow.innerHTML = '<td class="fascia-oraria">Mattina</td>';

    const morningCell = document.createElement('td');
    if (turniMattina.length > 0) {
        turniMattina.forEach(turno => {
            const turnoDiv = document.createElement('div');
            turnoDiv.className = `turno-item ${(turno.service || turno.servizio).toLowerCase()}`;

            turnoDiv.innerHTML = `
                <div class="turno-volontario">${turno.volunteer || turno.volontario}</div>
                <div class="turno-orario">${(turno.start_time || turno.oraInizio).substring(0, 5)}-${(turno.end_time || turno.oraFine).substring(0, 5)}</div>
                <div class="turno-servizio-badge">${(turno.service || turno.servizio).toUpperCase()}</div>
            `;

            morningCell.appendChild(turnoDiv);
        });
    } else {
        morningCell.innerHTML = '<div class="no-turni">Nessun turno</div>';
    }

    morningRow.appendChild(morningCell);
    tbody.appendChild(morningRow);

    // Riga pomeriggio
    const afternoonRow = document.createElement('tr');
    afternoonRow.innerHTML = '<td class="fascia-oraria">Pomeriggio</td>';

    const afternoonCell = document.createElement('td');
    if (turniPomeriggio.length > 0) {
        turniPomeriggio.forEach(turno => {
            const turnoDiv = document.createElement('div');
            turnoDiv.className = `turno-item ${(turno.service || turno.servizio).toLowerCase()}`;

            turnoDiv.innerHTML = `
                <div class="turno-volontario">${turno.volunteer || turno.volontario}</div>
                <div class="turno-orario">${(turno.start_time || turno.oraInizio).substring(0, 5)}-${(turno.end_time || turno.oraFine).substring(0, 5)}</div>
                <div class="turno-servizio-badge">${(turno.service || turno.servizio).toUpperCase()}</div>
            `;

            afternoonCell.appendChild(turnoDiv);
        });
    } else {
        afternoonCell.innerHTML = '<div class="no-turni">Nessun turno</div>';
    }

    afternoonRow.appendChild(afternoonCell);
    tbody.appendChild(afternoonRow);

    table.appendChild(tbody);
    detailsDiv.appendChild(table);

    // Aggiungi pulsante per inserire un nuovo turno nella stessa data
    const addButtonContainer = document.createElement('div');
    addButtonContainer.style.textAlign = 'center';
    addButtonContainer.style.marginTop = '20px';

    const addButton = document.createElement('button');
    addButton.textContent = '➕ Aggiungi turno per questa data';
    addButton.addEventListener('click', () => {
        document.getElementById('data').value = dateStr;
        closeModal();
        showTab('aggiungi');
    });

    addButtonContainer.appendChild(addButton);
    detailsDiv.appendChild(addButtonContainer);

    modal.style.display = 'block';
}

// Funzioni per navigare tra i mesi
function prevMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar();
}

// Funzione per chiudere il modal
function closeModal() {
    document.getElementById('turnoModal').style.display = 'none';
}

            // Aggiungi l'inizializzazione dei pulsanti rapidi al caricamento del documento
            document.addEventListener('DOMContentLoaded', async function() {
                if (!token || !currentUser) {
                    window.location.href = "index.html";
                    return;
                }

                const userDisplay = document.getElementById('loggedUserDisplay');
                if (userDisplay) {
                    userDisplay.textContent = `👤 ${currentUser.isAdmin ? '👑 Admin' : 'Utente'}: ${currentUser.username}`;
                }

                await caricaDati();
                showTab('calendario');

                // Aggiungi tasti rapidi al form
                addQuickTimeButtons();
            });

            async function login(username, password) {
                try {
                    const data = await fetchAPI('/login', {
                        method: 'POST',
                        body: JSON.stringify({ username, password })
                    });

                    token = data.token;
                    currentUser = data.user;

                    localStorage.setItem('token', token);
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));

                    return true;
                } catch (error) {
                    console.error('Errore di login:', error);
                    throw error;
                }
            }

            async function register(username, password) {
                try {
                    return await fetchAPI('/register', {
                        method: 'POST',
                        body: JSON.stringify({ username, password })
                    });
                } catch (error) {
                    console.error('Errore di registrazione:', error);
                    throw error;
                }
            }

            function logout() {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                window.location.href = "index.html";
            }

async function getTurni() {
    return await fetchAPI('/shifts');
}

            async function aggiungiTurno(turno) {
                try {
                    return await fetchAPI('/shifts', {
                        method: 'POST',
                        body: JSON.stringify({
                            volunteer: turno.volontario,
                            service: turno.servizio,
                            shift_date: turno.data,
                            start_time: turno.oraInizio,
                            end_time: turno.oraFine,
                            activity: turno.attivita,
                            notes: turno.note
                        })
                    });
                } catch (error) {
                    throw error;
                }
            }

            async function eliminaTurno(id) {
                try {
                    return await fetchAPI(`/shifts/${id}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    throw error;
                }
            }

            async function getStatistiche() {
                try {
                    return await fetchAPI('/statistics');
                } catch (error) {
                    console.error('Errore nel recupero delle statistiche:', error);
                    return null;
                }
            }

            document.addEventListener('DOMContentLoaded', async function() {
                if (!token || !currentUser) {
                    window.location.href = "index.html";
                    return;
                }

                const userDisplay = document.getElementById('loggedUserDisplay');
                if (userDisplay) {
                    userDisplay.textContent = `👤 ${currentUser.isAdmin ? '👑 Admin' : 'Utente'}: ${currentUser.username}`;
                }

                await caricaDati();
                showTab('calendario');
            });

async function caricaDati() {
    try {
        // Ottieni i turni dal server
        const shifts = await getTurni();

        // Mappa i turni dal formato del server al formato utilizzato localmente
        turni = shifts.map(shift => ({
            id: shift.id,
            volontario: shift.volunteer,
            servizio: shift.service,
            data: shift.shift_date,
            oraInizio: shift.start_time,
            oraFine: shift.end_time,
            attivita: shift.activity,
            note: shift.notes,
            creatore: shift.created_by
        }));

        // Aggiorna il calendario e la lista dei turni
        generateCalendar();
        aggiornaTurniLista();

        // Aggiorna anche la lista permessi se si è nella tab permessi
        if (document.getElementById('permessi').style.display !== 'none') {
            await aggiornaPermessiLista();
        }
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        alert('Errore nel caricamento dei dati. Riprova più tardi.');
    }
}

            function showTab(tabId) {
                document.querySelectorAll('.content-section').forEach(section => {
                    section.style.display = 'none';
                });
                document.getElementById(tabId).style.display = 'block';

                // Gestione specifica per le diverse tab
                if (tabId === 'chat') {
                    loadMessages();
                    // Avvia polling automatico ogni 3 secondi quando si è nella chat
                    if (chatInterval === null) {
                        chatInterval = setInterval(loadMessages, 3000);
                    }
                } else {
                    // Ferma il polling quando si esce dalla chat
                    if (chatInterval !== null) {
                        clearInterval(chatInterval);
                        chatInterval = null;
                    }
                }

                if (tabId === 'statistiche') {
                    aggiornaStatistiche();
                }
            }

// Modifica alla funzione generateCalendar per renderla completa
function generateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];

    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    const calendarDiv = document.getElementById('calendar');
    calendarDiv.innerHTML = '';

    const table = document.createElement('table');
    const headerRow = document.createElement('tr');

    ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].forEach(day => {
        const th = document.createElement('th');
        th.textContent = day;
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Calcola il giorno della settimana del primo giorno del mese (0 = Domenica, 1 = Lunedì, ...)
    let startingDay = firstDay.getDay();
    // Converti la domenica (0) in 7 per allinearsi con il nostro calendario che inizia di lunedì
    if (startingDay === 0) startingDay = 7;
    // Aggiusta per iniziare da lunedì (1)
    startingDay--;

    let date = 1;
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('tr');

        for (let j = 0; j < 7; j++) {
            const cell = document.createElement('td');

            if (i === 0 && j < startingDay) {
                // Celle vuote prima dell'inizio del mese
                cell.classList.add('empty');
                row.appendChild(cell);
            } else if (date > lastDay.getDate()) {
                // Celle vuote dopo la fine del mese
                cell.classList.add('empty');
                row.appendChild(cell);
            } else {
                // Giorni del mese
                cell.textContent = date;

                // Formatta la data corrente come YYYY-MM-DD
                const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;

                // Verifica se oggi
                const today = new Date();
                if (date === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    cell.classList.add('today');
                }

                // Verifica se ci sono turni per questo giorno
                const turniDelGiorno = turni.filter(turno => {
                    return turno.data === currentDateStr;
                });

                if (turniDelGiorno.length > 0) {
                    // Aggiungi indicatore numerico dei turni
                    const badge = document.createElement('div');
                    badge.className = 'turno-badge';
                    badge.textContent = turniDelGiorno.length;
                    cell.appendChild(badge);

                    // Aggiungi indicatori di servizio (pallini colorati)
                    const indicatorDiv = document.createElement('div');
                    indicatorDiv.className = 'turni-indicator';

                    // Ottieni i servizi unici per questo giorno
                    const servizi = [...new Set(turniDelGiorno.map(t => t.servizio.toLowerCase()))];

                    // Aggiungi un pallino per ogni tipo di servizio
                    servizi.forEach(servizio => {
                        const dot = document.createElement('span');
                        dot.className = `dot ${servizio.toLowerCase()}`;
                        indicatorDiv.appendChild(dot);
                    });

                    cell.appendChild(indicatorDiv);
                }

                // Rendi la cella cliccabile
                cell.onclick = () => handleDayClick(currentDateStr, date);

                date++;
            }

            row.appendChild(cell);
        }

        table.appendChild(row);

        if (date > lastDay.getDate()) {
            break;
        }
    }

    calendarDiv.appendChild(table);
}

            function prevMonth() {
                currentDate.setMonth(currentDate.getMonth() - 1);
                generateCalendar();
            }

            function nextMonth() {
                currentDate.setMonth(currentDate.getMonth() + 1);
                generateCalendar();
            }

function showTurniDetails(turniGiorno) {
    const modal = document.getElementById('turnoModal');
    const detailsDiv = document.getElementById('turnoDetails');

    detailsDiv.innerHTML = '';

    // Formatta la data per l'intestazione
    const dataRaw = turniGiorno[0].shift_date || turniGiorno[0].data;
    const data = new Date(dataRaw);
    const dataFormatted = data.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Intestazione
    const header = document.createElement('h4');
    header.textContent = `Turni del ${dataFormatted}`;
    detailsDiv.appendChild(header);

    // Crea un riepilogo di chi era presente quel giorno
    const volontariPresenti = [...new Set(turniGiorno.map(turno => turno.volunteer || turno.volontario))];

    const riepilogoDiv = document.createElement('div');
    riepilogoDiv.className = 'presenze-riepilogo';

    const riepilogoTitle = document.createElement('h5');
    riepilogoTitle.textContent = 'Operatori presenti:';
    riepilogoDiv.appendChild(riepilogoTitle);

    const voloList = document.createElement('ul');
    volontariPresenti.forEach(volontario => {
        const li = document.createElement('li');
        const turniVolontario = turniGiorno.filter(t => (t.volunteer || t.volontario) === volontario);
        const servizi = turniVolontario.map(t => t.service || t.servizio).join(', ');
        li.textContent = `${volontario} (${servizi})`;
        voloList.appendChild(li);
    });

    riepilogoDiv.appendChild(voloList);
    detailsDiv.appendChild(riepilogoDiv);

    // Aggiungi una linea di separazione
    const separator = document.createElement('hr');
    detailsDiv.appendChild(separator);

    // Aggiungi i dettagli di ogni turno
    turniGiorno.forEach(turno => {
        const turnoCard = document.createElement('div');
        turnoCard.classList.add('turno-card');
        const servizio = (turno.service || turno.servizio).toLowerCase();
        turnoCard.classList.add(servizio);

        turnoCard.innerHTML = `
            <div class="turno-header">
                <div class="turno-servizio">${turno.service || turno.servizio}</div>
                <div class="turno-orario">${turno.start_time || turno.oraInizio} - ${turno.end_time || turno.oraFine}</div>
            </div>
            <div class="turno-body">
                <p><strong>Operatore:</strong> ${turno.volunteer || turno.volontario}</p>
                ${(turno.activity || turno.attivita) ? `<p><strong>Attività:</strong> ${turno.activity || turno.attivita}</p>` : ''}
                ${(turno.notes || turno.note) ? `<p><strong>Note:</strong> ${turno.notes || turno.note}</p>` : ''}
            </div>
            <div class="turno-footer">
                <button class="delete-btn" onclick="eliminaTurnoHandler(${turno.id})">🗑️ Elimina</button>
            </div>
        `;

        detailsDiv.appendChild(turnoCard);
    });

    // Aggiungi pulsante per inserire un nuovo turno nella stessa data
    const addButtonContainer = document.createElement('div');
    addButtonContainer.style.textAlign = 'center';
    addButtonContainer.style.marginTop = '20px';

    const addButton = document.createElement('button');
    addButton.textContent = '➕ Aggiungi turno per questa data';
    addButton.addEventListener('click', () => {
        const dataValue = turniGiorno[0].shift_date || turniGiorno[0].data;
        document.getElementById('data').value = dataValue;
        closeModal();
        showTab('aggiungi');
    });

    addButtonContainer.appendChild(addButton);
    detailsDiv.appendChild(addButtonContainer);

    modal.style.display = 'block';
}

            function closeModal() {
                document.getElementById('turnoModal').style.display = 'none';
            }

            window.addEventListener('click', function(event) {
                const modal = document.getElementById('turnoModal');
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });

function aggiornaTurniLista() {
    const turniListDiv = document.getElementById('turniList');
    if (!turniListDiv) return;

    // Ottieni i filtri
    const filterVolontario = document.getElementById('filterVolontario')?.value.toLowerCase() || '';
    const filterServizio = document.getElementById('filterServizio')?.value || '';
    const filterMese = document.getElementById('filterMese')?.value || '';

    // Filtra i turni
    let turniFiltered = [...turni];

    if (filterVolontario) {
        turniFiltered = turniFiltered.filter(turno =>
            turno.volontario.toLowerCase().includes(filterVolontario)
        );
    }

    if (filterServizio) {
        turniFiltered = turniFiltered.filter(turno =>
            turno.servizio === filterServizio
        );
    }

    if (filterMese) {
        const [year, month] = filterMese.split('-');
        turniFiltered = turniFiltered.filter(turno => {
            const turnoDate = new Date(turno.data);
            return turnoDate.getFullYear() === parseInt(year) &&
                turnoDate.getMonth() === (parseInt(month) - 1);
        });
    }

    // Ordina i turni per data
    turniFiltered.sort((a, b) => new Date(a.data) - new Date(b.data));

    // Mostra i turni
    if (turniFiltered.length === 0) {
        turniListDiv.innerHTML = '<div class="no-data">Nessun turno trovato con i filtri applicati.</div>';
    } else {
        turniListDiv.innerHTML = '';

        turniFiltered.forEach(turno => {
            const turnoCard = document.createElement('div');
            turnoCard.className = `turno-card ${turno.servizio.toLowerCase()}`;

            // Formatta la data
            const data = new Date(turno.data);
            const dataFormatted = data.toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            turnoCard.innerHTML = `
                <div class="turno-header">
                    <div class="turno-servizio">${turno.servizio}</div>
                    <div class="turno-data">${dataFormatted}</div>
                </div>
                <div class="turno-body">
                    <p><strong>Operatore:</strong> ${turno.volontario}</p>
                    <p><strong>Orario:</strong> ${turno.oraInizio.substring(0, 5)} - ${turno.oraFine.substring(0, 5)}</p>
                    ${turno.attivita ? `<p><strong>Attività:</strong> ${turno.attivita}</p>` : ''}
                    ${turno.note ? `<p><strong>Note:</strong> ${turno.note}</p>` : ''}
                    <p><strong>Inserito da:</strong> ${turno.creatore || currentUser.username}</p>
                </div>
                <div class="turno-footer">
                    <button class="delete-btn" onclick="deleteTurno(${turno.id})">🗑️ Elimina</button>
                </div>
            `;

            turniListDiv.appendChild(turnoCard);
        });
    }
}

// Funzione per eliminare un turno
async function deleteTurno(id) {
    if (confirm('Sei sicuro di voler eliminare questo turno?')) {
        try {
            await eliminaTurno(id);
            await caricaDati();
            alert('Turno eliminato con successo!');
        } catch (error) {
            alert('Errore nell\'eliminazione del turno: ' + (error.message || 'Riprova più tardi.'));
        }
    }
}

// Funzione per resettare i filtri
function resetFilters() {
    document.getElementById('filterVolontario').value = '';
    document.getElementById('filterServizio').value = '';
    document.getElementById('filterMese').value = '';
    aggiornaTurniLista();
}
    if (filterMese) {
        const [year, month] = filterMese.split('-');
        turniDaMostrare = turniDaMostrare.filter(turno => {
            const turnoDate = new Date(turno.shift_date || turno.data);
            return turnoDate.getFullYear() === parseInt(year) && turnoDate.getMonth() === parseInt(month) - 1;
        });
    }

    if (turniDaMostrare.length === 0) {
        container.innerHTML = '<p class="no-data">Nessun turno trovato con i filtri selezionati.</p>';
        return;
    }

    // Raggruppa i turni per settimana
    const turniPerSettimana = {};

    turniDaMostrare.forEach(turno => {
        const data = new Date(turno.shift_date || turno.data);
        const inizioSettimana = getInizioPeriodoSettimana(data);
        const chiaveSettimana = inizioSettimana.toISOString().split('T')[0];

        if (!turniPerSettimana[chiaveSettimana]) {
            turniPerSettimana[chiaveSettimana] = {
                dataInizio: inizioSettimana,
                giorni: {
                    0: { mattina: [], pomeriggio: [] },
                    1: { mattina: [], pomeriggio: [] },
                    2: { mattina: [], pomeriggio: [] },
                    3: { mattina: [], pomeriggio: [] },
                    4: { mattina: [], pomeriggio: [] },
                    5: { mattina: [], pomeriggio: [] },
                    6: { mattina: [], pomeriggio: [] }
                }
            };
        }

        const giornoSettimana = data.getDay(); // 0 è domenica, 6 è sabato
        const oraInizio = parseInt((turno.start_time || turno.oraInizio).split(':')[0]);

        // Dividi tra mattina (prima delle 13) e pomeriggio
        if (oraInizio < 13) {
            turniPerSettimana[chiaveSettimana].giorni[giornoSettimana].mattina.push(turno);
        } else {
            turniPerSettimana[chiaveSettimana].giorni[giornoSettimana].pomeriggio.push(turno);
        }
    });

    // Ordina le settimane per data (dalla più recente)
    const settimaneOrdinate = Object.keys(turniPerSettimana).sort((a, b) =>
        new Date(b) - new Date(a)
    );

    // Crea una tabella per ogni settimana
    settimaneOrdinate.forEach(chiaveSettimana => {
        const settimana = turniPerSettimana[chiaveSettimana];
        const dataInizio = settimana.dataInizio;

        // Crea intestazione per la settimana
        const settimanaHeader = document.createElement('div');
        settimanaHeader.className = 'data-header';

        const dataFine = new Date(dataInizio);
        dataFine.setDate(dataFine.getDate() + 6);

        const dataInizioFormatted = dataInizio.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
        const dataFineFormatted = dataFine.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

        settimanaHeader.innerHTML = `<h3>Settimana dal ${dataInizioFormatted} al ${dataFineFormatted}</h3>`;
        container.appendChild(settimanaHeader);

        // Crea la tabella settimanale
        const table = document.createElement('table');
        table.className = 'turni-table';

        // Intestazione della tabella
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Fascia</th>';

        const giorniSettimana = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        giorniSettimana.forEach((giorno, index) => {
            const data = new Date(settimana.dataInizio);
            data.setDate(data.getDate() + index);
            const dataGiorno = data.getDate();
            headerRow.innerHTML += `<th>${giorno} ${dataGiorno}</th>`;
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Corpo della tabella
        const tbody = document.createElement('tbody');

        // Riga mattina
        const mattinaRow = document.createElement('tr');
        mattinaRow.innerHTML = '<td class="fascia-oraria">Mattina</td>';

        // Riga pomeriggio
        const pomeriggioRow = document.createElement('tr');
        pomeriggioRow.innerHTML = '<td class="fascia-oraria">Pomeriggio</td>';

        // Popola le celle con i turni
        for (let i = 0; i < 7; i++) {
            const cellaMattinaHTML = creaCellaTurni(settimana.giorni[i].mattina);
            const cellaPomeriggioHTML = creaCellaTurni(settimana.giorni[i].pomeriggio);

            mattinaRow.innerHTML += cellaMattinaHTML;
            pomeriggioRow.innerHTML += cellaPomeriggioHTML;
        }

        tbody.appendChild(mattinaRow);
        tbody.appendChild(pomeriggioRow);
        table.appendChild(tbody);

        container.appendChild(table);
    });
}

// Funzione per ottenere la data di inizio della settimana (domenica)
function getInizioPeriodoSettimana(data) {
    const risultato = new Date(data);
    const giorno = data.getDay(); // 0 è domenica, 6 è sabato
    risultato.setDate(data.getDate() - giorno);
    return risultato;
}

// Funzione per creare il contenuto HTML della cella
function creaCellaTurni(turniNellaCella) {
    if (turniNellaCella.length === 0) {
        return '<td class="cella-vuota">-</td>';
    }

    let htmlCella = '<td class="cella-turni">';

    turniNellaCella.forEach(turno => {
        const servizio = (turno.service || turno.servizio).toLowerCase();
        const volontario = turno.volunteer || turno.volontario;
        const oraInizio = turno.start_time || turno.oraInizio;
        const oraFine = turno.end_time || turno.oraFine;

        htmlCella += `
            <div class="turno-item ${servizio}">
                <div class="turno-volontario">${volontario}</div>
                <div class="turno-orario">${oraInizio.substring(0, 5)}-${oraFine.substring(0, 5)}</div>
                <div class="turno-servizio-badge">${servizio.toUpperCase()}</div>
            </div>
        `;
    });

    htmlCella += '</td>';
    return htmlCella;
}

            function resetFilters() {
                document.getElementById('filterVolontario').value = '';
                document.getElementById('filterServizio').value = '';
                document.getElementById('filterMese').value = '';
                aggiornaTurniLista();
            }

            async function aggiornaStatistiche() {
                const container = document.getElementById('statsContainer');
                container.innerHTML = '<p>Caricamento statistiche...</p>';

                try {
                    const stats = await getStatistiche();
                    if (!stats) {
                        container.innerHTML = '<p class="error">Impossibile caricare le statistiche</p>';
                        return;
                    }

                    container.innerHTML = `
                        <div class="stats-card">
                            <h3>Statistiche Generali</h3>
                            <p>Numero totale di turni: ${stats.totalShifts}</p>
                            <p>Numero di operatori: ${stats.totalVolunteers}</p>
                            <p>Ore totali di servizio: ${stats.totalHours}</p>
                        </div>
                        <div class="stats-card">
                            <h3>Distribuzione per Servizio</h3>
                            <ul>
                                ${stats.serviceDistribution.map(s => `<li>${s.service}: ${s.count} turni (${s.hours} ore)</li>`).join('')}
                            </ul>
                        </div>
                    `;
                } catch (error) {
                    console.error('Errore nel caricamento delle statistiche:', error);
                    container.innerHTML = '<p class="error">Errore nel caricamento delle statistiche</p>';
                }
            }

            if (document.getElementById('turnoForm')) {
                document.getElementById('turnoForm').addEventListener('submit', async function(e) {
                    e.preventDefault();

                    const nuovoTurno = {
                        volontario: document.getElementById('volontario').value,
                        servizio: document.getElementById('servizio').value,
                        data: document.getElementById('data').value,
                        oraInizio: document.getElementById('oraInizio').value,
                        oraFine: document.getElementById('oraFine').value,
                        attivita: document.getElementById('attivita').value,
                        note: document.getElementById('note').value
                    };

                    try {
                        await aggiungiTurno(nuovoTurno);
                        this.reset();
                        alert('✅ Turno aggiunto con successo!');
                        await caricaDati();
                        showTab('lista');
                    } catch (error) {
                        console.error('Errore nell\'aggiunta del turno:', error);
                        alert('Errore nell\'aggiunta del turno: ' + error.message);
                    }
                });
            }

            async function eliminaTurnoHandler(id) {
                if (confirm('Sei sicuro di voler eliminare questo turno?')) {
                    try {
                        await eliminaTurno(id);
                        await caricaDati();
                        closeModal();
                        alert('✅ Turno eliminato con successo!');
                    } catch (error) {
                        console.error('Errore nell\'eliminazione del turno:', error);
                        alert('Errore nell\'eliminazione del turno: ' + error.message);
                    }
                }
            }

            if (document.getElementById('filterVolontario')) {
                document.getElementById('filterVolontario').addEventListener('input', aggiornaTurniLista);
            }
            if (document.getElementById('filterServizio')) {
                document.getElementById('filterServizio').addEventListener('change', aggiornaTurniLista);
            }
            if (document.getElementById('filterMese')) {
                document.getElementById('filterMese').addEventListener('change', aggiornaTurniLista);
            }
            // Variabili per la chat
            let chatMessages = [];
            let lastMessageDate = null;
            let chatInterval = null;

            // Funzione per caricare i messaggi
            async function loadMessages() {
                try {
                    const messages = await fetchAPI('/messages');

                    // Controlla se ci sono nuovi messaggi
                    if (messages.length > chatMessages.length) {
                        chatMessages = messages;
                        displayMessages();
                    }
                } catch (error) {
                    console.error('Errore nel caricamento dei messaggi:', error);
                }
            }

            // Visualizza i messaggi nella chat
            function displayMessages() {
                const chatContainer = document.getElementById('chatMessages');
                chatContainer.innerHTML = '';

                let currentDate = null;

                chatMessages.forEach((msg, index) => {
                    // Converti la data dal formato MySQL
                    const messageDate = new Date(msg.timestamp);
                    const messageDay = messageDate.toLocaleDateString('it-IT');

                    // Aggiungi divisore per data se cambia
                    if (currentDate !== messageDay) {
                        currentDate = messageDay;
                        const dateDiv = document.createElement('div');
                        dateDiv.className = 'date-divider';
                        dateDiv.textContent = formatChatDate(messageDate);
                        chatContainer.appendChild(dateDiv);
                    }

                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${msg.sender === currentUser.username ? 'message-sent' : 'message-received'}`;

                    const infoDiv = document.createElement('div');
                    infoDiv.className = 'message-info';
                    infoDiv.textContent = msg.sender;

                    const contentDiv = document.createElement('div');
                    contentDiv.textContent = msg.content;

                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'message-time';
                    timeDiv.textContent = messageDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

                    messageDiv.appendChild(infoDiv);
                    messageDiv.appendChild(contentDiv);
                    messageDiv.appendChild(timeDiv);
                    chatContainer.appendChild(messageDiv);
                });

                // Scorri automaticamente in basso
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            // Formatta la data per la visualizzazione nella chat
            function formatChatDate(date) {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                if (date.toDateString() === today.toDateString()) {
                    return 'Oggi';
                } else if (date.toDateString() === yesterday.toDateString()) {
                    return 'Ieri';
                } else {
                    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
                }
            }

            // Invia un nuovo messaggio
            async function sendMessage() {
                const messageTextEl = document.getElementById('messageText');
                const messageText = messageTextEl.value.trim();

                if (!messageText) return;

                try {
                    await fetchAPI('/messages', {
                        method: 'POST',
                        body: JSON.stringify({ content: messageText })
                    });
                    messageTextEl.value = '';
                    await loadMessages();
                } catch (error) {
                    console.error('Errore nell\'invio del messaggio:', error);
                    alert('Errore nell\'invio del messaggio: ' + error.message);
                }
            }

            // Modifica la funzione showTab per gestire la chat
            function showTab(tabId) {
                document.querySelectorAll('.content-section').forEach(section => {
                    section.style.display = 'none';
                });
                document.getElementById(tabId).style.display = 'block';

                // Gestione specifica per la tab chat
                if (tabId === 'chat') {
                    loadMessages();
                    // Avvia polling automatico ogni 3 secondi quando si è nella chat
                    if (chatInterval === null) {
                        chatInterval = setInterval(loadMessages, 3000);
                    }
                } else {
                    // Ferma il polling quando si esce dalla chat
                    if (chatInterval !== null) {
                        clearInterval(chatInterval);
                        chatInterval = null;
                    }
                }

                if (tabId === 'statistiche') {
                    aggiornaStatistiche();
                }
            }

            document.addEventListener('DOMContentLoaded', function() {
                // Aggiungi event listener per il tasto invio nella chat
                const messageInput = document.getElementById('messageText');
                if (messageInput) {
                    messageInput.addEventListener('keypress', function(e) {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    });
                }
            });
// Funzioni per la gestione dei permessi
async function getPermessi() {
    try {
        const permessi = await fetchAPI('/permessi');
        return permessi.map(permesso => ({
            id: permesso.id,
            tipo: permesso.tipo,
            dataInizio: permesso.data_inizio,
            dataFine: permesso.data_fine,
            motivo: permesso.motivo,
            stato: permesso.stato,
            richiedente: permesso.richiesto_da,
            dataRichiesta: permesso.data_richiesta,
            noteRisposta: permesso.note_risposta,
            gestitoDa: permesso.gestito_da,
            dataRisposta: permesso.data_risposta
        }));
    } catch (error) {
        console.error('Errore nel recupero dei permessi:', error);
        return [];
    }
}

async function richiediPermesso(permesso) {
    try {
        return await fetchAPI('/permessi', {
            method: 'POST',
            body: JSON.stringify({
                tipo: permesso.tipo,
                data_inizio: permesso.dataInizio,
                data_fine: permesso.dataFine,
                motivo: permesso.motivo
            })
        });
    } catch (error) {
        throw error;
    }
}

async function aggiornaStatoPermesso(id, stato, noteRisposta) {
    try {
        return await fetchAPI(`/permessi/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                stato: stato,
                note_risposta: noteRisposta
            })
        });
    } catch (error) {
        throw error;
    }
}

async function eliminaPermesso(id) {
    try {
        return await fetchAPI(`/permessi/${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        throw error;
    }
}

// Aggiorna la lista dei permessi
async function aggiornaPermessiLista() {
    const permessiList = document.getElementById('permessiList');
    permessiList.innerHTML = '<p>Caricamento permessi...</p>';

    try {
        const permessi = await getPermessi();

        if (permessi.length === 0) {
            permessiList.innerHTML = '<p class="no-data">Nessun permesso trovato.</p>';
            return;
        }

        permessiList.innerHTML = '';

        permessi.forEach(permesso => {
            const dataInizio = new Date(permesso.dataInizio);
            const dataFine = new Date(permesso.dataFine);
            const dataInizioFormatted = dataInizio.toLocaleDateString('it-IT');
            const dataFineFormatted = dataFine.toLocaleDateString('it-IT');

            const permessoCard = document.createElement('div');
            permessoCard.classList.add('permesso-card', permesso.tipo.toLowerCase(), permesso.stato.toLowerCase());

            const statoLabel = {
                'IN_ATTESA': 'In attesa',
                'APPROVATO': 'Approvato',
                'RIFIUTATO': 'Rifiutato'
            };

            permessoCard.innerHTML = `
                <div class="permesso-header">
                    <span class="permesso-tipo">${permesso.tipo === 'ORDINARIO' ? '📅 Permesso Ordinario' : '⚠️ Permesso Straordinario'}</span>
                    <span class="permesso-stato ${permesso.stato.toLowerCase()}">${statoLabel[permesso.stato]}</span>
                </div>
                <div class="permesso-body">
                    <p><strong>Richiesto da:</strong> ${permesso.richiedente}</p>
                    <p><strong>Periodo:</strong> dal ${dataInizioFormatted} al ${dataFineFormatted}</p>
                    <p><strong>Motivo:</strong> ${permesso.motivo || 'Non specificato'}</p>
                    ${permesso.stato !== 'IN_ATTESA' ? `
                        <p><strong>Gestito da:</strong> ${permesso.gestitoDa}</p>
                        ${permesso.noteRisposta ? `<p><strong>Note:</strong> ${permesso.noteRisposta}</p>` : ''}
                    ` : ''}
                </div>
                <div class="permesso-footer">
                    ${permesso.stato === 'IN_ATTESA' && currentUser.isAdmin ? `
                        <button class="approve-btn" onclick="approvaPermesso(${permesso.id})">✅ Approva</button>
                        <button class="delete-btn" onclick="rifiutaPermesso(${permesso.id})">❌ Rifiuta</button>
                    ` : ''}
                    ${(currentUser.isAdmin || permesso.richiedente === currentUser.username) ? `
                        <button onclick="eliminaPermessoHandler(${permesso.id})">🗑️ Elimina</button>
                    ` : ''}
                </div>
            `;

            permessiList.appendChild(permessoCard);
        });
    } catch (error) {
        console.error('Errore nel caricamento dei permessi:', error);
        permessiList.innerHTML = '<p class="error">Errore nel caricamento dei permessi.</p>';
    }
}

// Handler per l'approvazione di un permesso
async function approvaPermesso(id) {
    try {
        const note = prompt('Inserisci eventuali note (opzionali):');
        await aggiornaStatoPermesso(id, 'APPROVATO', note);
        await aggiornaPermessiLista();
        alert('✅ Permesso approvato con successo!');
    } catch (error) {
        console.error('Errore nell\'approvazione del permesso:', error);
        alert('Errore nell\'approvazione del permesso: ' + error.message);
    }
}

// Handler per il rifiuto di un permesso
async function rifiutaPermesso(id) {
    try {
        const note = prompt('Inserisci il motivo del rifiuto:');
        if (!note) {
            alert('Devi specificare un motivo per il rifiuto.');
            return;
        }
        await aggiornaStatoPermesso(id, 'RIFIUTATO', note);
        await aggiornaPermessiLista();
        alert('❌ Permesso rifiutato.');
    } catch (error) {
        console.error('Errore nel rifiuto del permesso:', error);
        alert('Errore nel rifiuto del permesso: ' + error.message);
    }
}

// Handler per l'eliminazione di un permesso
async function eliminaPermessoHandler(id) {
    if (confirm('Sei sicuro di voler eliminare questo permesso?')) {
        try {
            await eliminaPermesso(id);
            await aggiornaPermessiLista();
            alert('✅ Permesso eliminato con successo!');
        } catch (error) {
            console.error('Errore nell\'eliminazione del permesso:', error);
            alert('Errore nell\'eliminazione del permesso: ' + error.message);
        }
    }
}

// Gestore per il form di richiesta permesso
if (document.getElementById('permessoForm')) {
    document.getElementById('permessoForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const nuovoPermesso = {
            tipo: document.getElementById('tipoPermesso').value,
            dataInizio: document.getElementById('dataInizio').value,
            dataFine: document.getElementById('dataFine').value,
            motivo: document.getElementById('motivoPermesso').value
        };

        // Verifica che la data di fine sia successiva alla data di inizio
        if (new Date(nuovoPermesso.dataInizio) > new Date(nuovoPermesso.dataFine)) {
            alert('La data di fine deve essere successiva alla data di inizio.');
            return;
        }

        try {
            await richiediPermesso(nuovoPermesso);
            this.reset();
            alert('✅ Richiesta di permesso inviata con successo!');
            showTab('permessi');
            await aggiornaPermessiLista();
        } catch (error) {
            console.error('Errore nella richiesta di permesso:', error);
            alert('Errore nella richiesta di permesso: ' + error.message);
        }
    });
}

// Modifica la funzione showTab per gestire la visualizzazione dei permessi
function showTab(tabId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(tabId).style.display = 'block';

    // Gestione specifica per le diverse tab
    if (tabId === 'chat') {
        loadMessages();
        // Avvia polling automatico ogni 3 secondi quando si è nella chat
        if (chatInterval === null) {
            chatInterval = setInterval(loadMessages, 3000);
        }
    } else {
        // Ferma il polling quando si esce dalla chat
        if (chatInterval !== null) {
            clearInterval(chatInterval);
            chatInterval = null;
        }
    }

    if (tabId === 'permessi') {
        aggiornaPermessiLista();
    }
}

async function caricaDati() {
    try {
        // Ottieni i turni dal server
        const shifts = await getTurni();

        // Mappa i turni dal formato del server al formato utilizzato localmente
        turni = shifts.map(shift => ({
            id: shift.id,
            volontario: shift.volunteer,
            servizio: shift.service,
            data: shift.shift_date,
            oraInizio: shift.start_time,
            oraFine: shift.end_time,
            attivita: shift.activity,
            note: shift.notes,
            creatore: shift.created_by
        }));

        // Aggiorna il calendario e la lista dei turni
        generateCalendar();
        aggiornaTurniLista();

        // Aggiorna anche la lista permessi se si è nella tab permessi
        if (document.getElementById('permessi').style.display !== 'none') {
            await aggiornaPermessiLista();
        }

        // Aggiungi gestione errori
    } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        alert('Errore nel caricamento dei dati: ' + (error.message || 'Riprova più tardi.'));
    }
}
// Funzione per aggiungere i pulsanti rapidi per la selezione dell'orario
function addQuickTimeButtons() {
    const turnoForm = document.getElementById('turnoForm');
    if (!turnoForm) return;

    // Crea un container per i pulsanti rapidi
    const quickButtonsDiv = document.createElement('div');
    quickButtonsDiv.className = 'quick-buttons';

    // Pulsante per il turno mattutino (9:00 - 13:00)
    const morningButton = document.createElement('button');
    morningButton.type = 'button';
    morningButton.className = 'quick-button morning';
    morningButton.textContent = '🌅 Turno Mattina (9:00 - 13:00)';
    morningButton.onclick = () => {
        document.getElementById('oraInizio').value = '09:00';
        document.getElementById('oraFine').value = '13:00';
    };

    // Pulsante per il turno pomeridiano
    const afternoonButton = document.createElement('button');
    afternoonButton.type = 'button';
    afternoonButton.className = 'quick-button afternoon';
    afternoonButton.textContent = '🌇 Turno Pomeriggio (15:30 - 19:30)';
    afternoonButton.onclick = () => {
        document.getElementById('oraInizio').value = '15:30';
        document.getElementById('oraFine').value = '19:30';
    };

    // Aggiungi i pulsanti al container
    quickButtonsDiv.appendChild(morningButton);
    quickButtonsDiv.appendChild(afternoonButton);

    // Inserisci il container prima del form o in una posizione specifica
    const timeFieldGroup = document.querySelector('#turnoForm .form-group:nth-child(4)');
    if (timeFieldGroup) {
        turnoForm.insertBefore(quickButtonsDiv, timeFieldGroup);
    } else {
        turnoForm.prepend(quickButtonsDiv);
    }
}
// Aggiungi il gestore del form per l'invio dei turni
if (document.getElementById('turnoForm')) {
    document.getElementById('turnoForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const turno = {
            volontario: document.getElementById('volontario').value,
            servizio: document.getElementById('servizio').value,
            data: document.getElementById('data').value,
            oraInizio: document.getElementById('oraInizio').value,
            oraFine: document.getElementById('oraFine').value,
            attivita: document.getElementById('attivita').value,
            note: document.getElementById('note').value
        };

        try {
            await aggiungiTurno(turno);
            await caricaDati();
            showTab('calendario');
            alert('Turno aggiunto con successo!');
            this.reset();
        } catch (error) {
            alert('Errore nell\'aggiunta del turno: ' + (error.message || 'Riprova più tardi.'));
        }
    });
}