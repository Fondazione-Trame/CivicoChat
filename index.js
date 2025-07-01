
const API_URL = 'https://civicochat.pingumc.com/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('currentUser'));
let turni = [];
let currentDate = new Date();
let chatInterval = null;

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
    if (typeof addQuickTimeButtons === 'function') {
        addQuickTimeButtons();
    }
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
        if (typeof loadMessages === 'function') {
            loadMessages();
            // Avvia polling automatico ogni 3 secondi quando si è nella chat
            if (chatInterval === null) {
                chatInterval = setInterval(loadMessages, 3000);
            }
        }
    } else {
        // Ferma il polling quando si esce dalla chat
        if (chatInterval !== null) {
            clearInterval(chatInterval);
            chatInterval = null;
        }
    }
}

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

// Inizializzazione dei form
document.addEventListener('DOMContentLoaded', function() {
    const turnoForm = document.getElementById('turnoForm');
    if (turnoForm) {
        turnoForm.addEventListener('submit', async function(e) {
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
                alert('Turno aggiunto con successo!');
                turnoForm.reset();
                await caricaDati();
                showTab('calendario');
            } catch (error) {
                alert('Errore nell\'aggiunta del turno: ' + (error.message || 'Riprova più tardi.'));
            }
        });
    }

    // Gestione permessi form se esiste
    const permessoForm = document.getElementById('permessoForm');
    if (permessoForm) {
        permessoForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const permesso = {
                tipo: document.getElementById('tipoPermesso').value,
                data_inizio: document.getElementById('dataInizio').value,
                data_fine: document.getElementById('dataFine').value,
                motivo: document.getElementById('motivoPermesso').value
            };

            try {
                await richiediPermesso(permesso);
                alert('Permesso richiesto con successo!');
                permessoForm.reset();
                showTab('permessi');
                await aggiornaPermessiLista();
            } catch (error) {
                alert('Errore nella richiesta del permesso: ' + (error.message || 'Riprova più tardi.'));
            }
        });
    }
});

// Funzione per inviare messaggio chat se esiste
function sendMessage() {
    const messageText = document.getElementById('messageText');
    const content = messageText.value.trim();

    if (!content) return;

    inviaMessaggio(content)
        .then(() => {
            messageText.value = '';
            loadMessages();
        })
        .catch(error => {
            console.error('Errore nell\'invio del messaggio:', error);
            alert('Errore nell\'invio del messaggio. Riprova.');
        });
}

// Funzioni per i permessi
async function richiediPermesso(permesso) {
    return await fetchAPI('/permessi', {
        method: 'POST',
        body: JSON.stringify(permesso)
    });
}

async function aggiornaPermessiLista() {
    try {
        const permessi = await fetchAPI('/permessi');
        const permessiList = document.getElementById('permessiList');

        if (permessi.length === 0) {
            permessiList.innerHTML = '<div class="no-data">Nessuna richiesta di permesso.</div>';
            return;
        }

        permessiList.innerHTML = '';

        permessi.forEach(permesso => {
            const permessoCard = document.createElement('div');
            permessoCard.className = `permesso-card ${permesso.stato.toLowerCase()}`;

            // Formatta le date
            const dataInizio = new Date(permesso.data_inizio);
            const dataFine = new Date(permesso.data_fine);
            const dataInizioFormatted = dataInizio.toLocaleDateString('it-IT');
            const dataFineFormatted = dataFine.toLocaleDateString('it-IT');

            // Calcola durata in giorni
            const diffTime = Math.abs(dataFine - dataInizio);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            permessoCard.innerHTML = `
                <div class="permesso-header">
                    <div class="permesso-tipo">${permesso.tipo}</div>
                    <div class="permesso-stato">${getStatoLabel(permesso.stato)}</div>
                </div>
                <div class="permesso-body">
                    <p><strong>Periodo:</strong> ${dataInizioFormatted} - ${dataFineFormatted} (${diffDays} giorni)</p>
                    <p><strong>Richiesto da:</strong> ${permesso.richiesto_da}</p>
                    ${permesso.motivo ? `<p><strong>Motivo:</strong> ${permesso.motivo}</p>` : ''}
                    ${permesso.note_risposta ? `<p><strong>Note:</strong> ${permesso.note_risposta}</p>` : ''}
                </div>
                <div class="permesso-footer">
                    ${getPermessoActions(permesso)}
                </div>
            `;

            permessiList.appendChild(permessoCard);
        });

        // Aggiungi event listeners per i pulsanti dinamici
        document.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                rispondiPermesso(id, 'APPROVATO');
            });
        });

        document.querySelectorAll('.reject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                rispondiPermesso(id, 'RIFIUTATO');
            });
        });

        document.querySelectorAll('.delete-permesso-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                eliminaPermesso(id);
            });
        });

    } catch (error) {
        console.error('Errore nel caricamento dei permessi:', error);
    }
}

// Funzioni di supporto per i permessi
function getStatoLabel(stato) {
    switch (stato) {
        case 'IN_ATTESA': return '⏳ In attesa';
        case 'APPROVATO': return '✅ Approvato';
        case 'RIFIUTATO': return '❌ Rifiutato';
        default: return stato;
    }
}

function getPermessoActions(permesso) {
    if (currentUser.isAdmin && permesso.stato === 'IN_ATTESA') {
        return `
            <button class="approve-btn" data-id="${permesso.id}">✅ Approva</button>
            <button class="reject-btn" data-id="${permesso.id}">❌ Rifiuta</button>
        `;
    } else if (permesso.richiesto_da === currentUser.username || currentUser.isAdmin) {
        return `<button class="delete-permesso-btn" data-id="${permesso.id}">🗑️ Elimina</button>`;
    }
    return '';
}

// Handler per il rifiuto di un permesso
async function rispondiPermesso(id, stato) {
    let note = '';
    if (stato === 'RIFIUTATO') {
        note = prompt('Inserisci una motivazione per il rifiuto:') || '';
    }

    try {
        await fetchAPI(`/permessi/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ stato, note_risposta: note })
        });
        alert(`Permesso ${stato.toLowerCase()} con successo!`);
        await aggiornaPermessiLista();
    } catch (error) {
        alert('Errore nell\'aggiornamento del permesso: ' + (error.message || 'Riprova più tardi.'));
    }
}

// Handler per l'eliminazione di un permesso
async function eliminaPermesso(id) {
    if (confirm('Sei sicuro di voler eliminare questa richiesta di permesso?')) {
        try {
            await fetchAPI(`/permessi/${id}`, {
                method: 'DELETE'
            });
            alert('Permesso eliminato con successo!');
            await aggiornaPermessiLista();
        } catch (error) {
            alert('Errore nell\'eliminazione del permesso: ' + (error.message || 'Riprova più tardi.'));
        }
    }
}

// Funzioni per la chat
async function loadMessages() {
    try {
        // Ottieni i turni dal server
        const messages = await fetchAPI('/messages');
        const chatContainer = document.getElementById('chatMessages');
        if (!chatContainer) return;

        chatContainer.innerHTML = '';

        if (messages.length === 0) {
            chatContainer.innerHTML = '<div class="no-messages">Nessun messaggio. Inizia la conversazione!</div>';
            return;
        }

        messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.sender === currentUser.username ? 'sent' : 'received'}`;

            // Formatta la data
            const timestamp = new Date(message.timestamp);
            const timeString = timestamp.toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
            });
            const dateString = timestamp.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            messageDiv.innerHTML = `
                <div class="message-sender">${message.sender}</div>
                <div class="message-content">${message.content}</div>
                <div class="message-time">${timeString} ${dateString}</div>
            `;

            chatContainer.appendChild(messageDiv);
        });

        // Scorrimento automatico verso l'ultimo messaggio
        chatContainer.scrollTop = chatContainer.scrollHeight;
        // Aggiungi gestione errori
    } catch (error) {
        console.error('Errore nel caricamento dei messaggi:', error);
    }
}

async function inviaMessaggio(content) {
    return await fetchAPI('/messages', {
        method: 'POST',
        body: JSON.stringify({ content })
    });
}

// Funzione per aggiungere pulsanti rapidi al form del turno
function addQuickTimeButtons() {
    const timeButtons = [
        { label: 'Mattina (8-14)', start: '08:00', end: '14:00' },
        { label: 'Pomeriggio (14-20)', start: '14:00', end: '20:00' },
        { label: 'Giornata intera (8-20)', start: '08:00', end: '20:00' }
    ];

    const oraInizioField = document.getElementById('oraInizio');
    const oraFineField = document.getElementById('oraFine');

    if (!oraInizioField || !oraFineField) return;

    // Crea un container per i pulsanti rapidi
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'quick-time-buttons';
    buttonContainer.style.marginBottom = '15px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.flexWrap = 'wrap';

    timeButtons.forEach(btn => {
    // Pulsante per il turno mattutino (9:00 - 13:00)
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = btn.label;
        button.style.fontSize = '0.85rem';
        button.style.padding = '4px 8px';

        button.addEventListener('click', () => {
            oraInizioField.value = btn.start;
            oraFineField.value = btn.end;
        });

    // Aggiungi i pulsanti al container
        buttonContainer.appendChild(button);
    });

    // Inserisci il container dopo il campo oraInizio
    oraInizioField.parentNode.insertAdjacentElement('afterend', buttonContainer);
}
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