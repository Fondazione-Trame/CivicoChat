// Configurazione e variabili globali
const API_URL = 'https://civicochat.pingumc.com/api';
let token = localStorage.getItem('token');
let currentUser = null;
let turni = [];
let currentDate = new Date();
let chatInterval = null;

// Inizializzazione sicura dell'utente corrente
try {
  const userStr = localStorage.getItem('currentUser');
  if (userStr) {
    currentUser = JSON.parse(userStr);
  }
} catch (error) {
  console.error('Errore nel parsing dei dati utente:', error);
  localStorage.removeItem('currentUser'); // Ripulisce i dati corrotti
}

// Funzione per le chiamate API con gestione degli errori
async function fetchAPI(endpoint, options = {}) {
  // Mostra indicatore di caricamento
  const loadingIndicator = document.getElementById('loadingIndicator');
  if (loadingIndicator) loadingIndicator.style.display = 'block';
  
  if (token) {
    options.headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      // Gestione token scaduto
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        window.location.href = "index.html";
        throw new Error('Sessione scaduta. Effettua nuovamente il login.');
      }
      throw new Error(data.error || 'Errore nella richiesta');
    }
    
    return data;
  } catch (error) {
    console.error('Errore API:', error);
    throw error;
  } finally {
    // Nascondi indicatore di caricamento
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}

// Funzione per sanitizzare l'input HTML
function sanitizeHTML(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Funzione per generare il calendario
            // Modifica alla funzione generateCalendar per rendere tutti i giorni cliccabili
function generateCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const monthNames = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  
  const calendarHeader = document.getElementById('currentMonth');
  if (calendarHeader) {
    calendarHeader.textContent = `${monthNames[month]} ${year}`;
  }
  
  const calendarDiv = document.getElementById('calendar');
  if (!calendarDiv) return;
  
  calendarDiv.innerHTML = '';
  
  const table = document.createElement('table');
  const headerRow = document.createElement('tr');
  
  ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].forEach(day => {
    const th = document.createElement('th');
    th.textContent = day;
    headerRow.appendChild(th);
  });
  
  table.appendChild(headerRow);
  
  // Calcola il giorno della settimana del primo giorno del mese
  let startingDay = firstDay.getDay();
    // Converti la domenica (0) in 7 per allinearsi con il nostro calendario che inizia di lunedì
  if (startingDay === 0) startingDay = 7; // Converti domenica da 0 a 7
  startingDay--; // Aggiusta per iniziare da lunedì
  
  let date = 1;
  for (let i = 0; i < 6; i++) {
    const row = document.createElement('tr');
    
    for (let j = 0; j < 7; j++) {
      const cell = document.createElement('td');
      cell.dataset.month = month;
      cell.dataset.year = year;
      
      if (i === 0 && j < startingDay) {
        // Celle vuote prima dell'inizio del mese
        cell.classList.add('empty');
      } else if (date > lastDay.getDate()) {
        // Celle vuote dopo la fine del mese
        cell.classList.add('empty');
      } else {
        // Giorni del mese
        cell.textContent = date;
        cell.dataset.date = date;
        
        // Formatta la data come YYYY-MM-DD
        const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
        cell.dataset.fullDate = formattedDate;
        
        // Verifica se oggi
        const today = new Date();
        if (date === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
          cell.classList.add('today');
        }
        
        // Verifica se ci sono turni per questo giorno
        const turniDelGiorno = turni.filter(turno => {
          const turnoDate = turno.shift_date || turno.data;
          return turnoDate === formattedDate;
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
        cell.onclick = () => handleDayClick(formattedDate, date, month, year);
        
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

// Funzione migliorata per gestire il click su un giorno
function handleDayClick(dateStr, day, month, year) {
  // Rimuovi la classe selected-day da tutte le celle
  document.querySelectorAll('td').forEach(td => td.classList.remove('selected-day'));
  
  // Trova la cella corretta del giorno corrente
  document.querySelectorAll('td').forEach(td => {
    if (!td.classList.contains('empty') && 
        parseInt(td.dataset.date) === day && 
        parseInt(td.dataset.month) === month &&
        parseInt(td.dataset.year) === year) {
      td.classList.add('selected-day');
    }
  });
  
  // Filtra i turni per la data selezionata
  const turniDelGiorno = turni.filter(turno => {
    const turnoDate = turno.shift_date || turno.data;
    return turnoDate === dateStr;
  });
  
  if (turniDelGiorno.length > 0) {
    // Dividi i turni in mattina e pomeriggio
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
    if (!modal) return;
    
    const detailsDiv = document.getElementById('turnoDetails');
    if (!detailsDiv) return;
    
    const data = new Date(dateStr);
    const dataFormatted = data.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    detailsDiv.innerHTML = `
      <h4>Turni del ${sanitizeHTML(dataFormatted)}</h4>
      <p class="no-data">Nessun turno programmato per questa data.</p>
      <div style="text-align: center; margin-top: 20px;">
        <button id="addTurnoBtn">➕ Aggiungi turno per questa data</button>
      </div>
    `;
    
    modal.style.display = 'block';
    
    const addButton = document.getElementById('addTurnoBtn');
    if (addButton) {
      // Rimuove eventuali event listener precedenti
      const newButton = addButton.cloneNode(true);
      addButton.parentNode.replaceChild(newButton, addButton);
      
      newButton.addEventListener('click', () => {
        const dataInput = document.getElementById('data');
        if (dataInput) dataInput.value = dateStr;
        closeModal();
        showTab('aggiungi');
      });
    }
  }
}

// Funzione migliorata per mostrare i dettagli dei turni
function showTurniDetailsWithTable(turniGiorno, turniMattina, turniPomeriggio, dateStr) {
  const modal = document.getElementById('turnoModal');
  if (!modal) return;
  
  const detailsDiv = document.getElementById('turnoDetails');
  if (!detailsDiv) return;
  
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
      const servizio = sanitizeHTML(turno.service || turno.servizio || '');
      turnoDiv.className = `turno-item ${servizio.toLowerCase()}`;
      
      const volontario = sanitizeHTML(turno.volunteer || turno.volontario || '');
      const oraInizio = sanitizeHTML((turno.start_time || turno.oraInizio || '').substring(0, 5));
      const oraFine = sanitizeHTML((turno.end_time || turno.oraFine || '').substring(0, 5));
      
      turnoDiv.innerHTML = `
        <div class="turno-volontario">${volontario}</div>
        <div class="turno-orario">${oraInizio}-${oraFine}</div>
        <div class="turno-servizio-badge">${servizio.toUpperCase()}</div>
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
      const servizio = sanitizeHTML(turno.service || turno.servizio || '');
      turnoDiv.className = `turno-item ${servizio.toLowerCase()}`;
      
      const volontario = sanitizeHTML(turno.volunteer || turno.volontario || '');
      const oraInizio = sanitizeHTML((turno.start_time || turno.oraInizio || '').substring(0, 5));
      const oraFine = sanitizeHTML((turno.end_time || turno.oraFine || '').substring(0, 5));
      
      turnoDiv.innerHTML = `
        <div class="turno-volontario">${volontario}</div>
        <div class="turno-orario">${oraInizio}-${oraFine}</div>
        <div class="turno-servizio-badge">${servizio.toUpperCase()}</div>
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
    const dataInput = document.getElementById('data');
    if (dataInput) dataInput.value = dateStr;
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
  const modal = document.getElementById('turnoModal');
  if (modal) modal.style.display = 'none';
}

// Unico evento DOMContentLoaded
            // Aggiungi l'inizializzazione dei pulsanti rapidi al caricamento del documento
document.addEventListener('DOMContentLoaded', async function() {
  // Verifica se l'utente è loggato
  if (!token) {
    window.location.href = "index.html";
    return;
  }
  
  try {
    // Visualizza il nome utente
    const userDisplay = document.getElementById('loggedUserDisplay');
    if (userDisplay && currentUser) {
      userDisplay.textContent = `👤 ${currentUser.isAdmin ? '👑 Admin' : 'Utente'}: ${sanitizeHTML(currentUser.username)}`;
    }
    
    // Carica i dati iniziali
    await loadInitialData();
    
    // Aggiungi tasti rapidi al form
    if (typeof addQuickTimeButtons === 'function') {
      addQuickTimeButtons();
    }
    
    // Mostra la scheda calendario come default
    showTab('calendario');
  } catch (error) {
    console.error('Errore durante l\'inizializzazione:', error);
    alert('Si è verificato un errore durante il caricamento dei dati. Ricarica la pagina o effettua nuovamente il login.');
  }
});

// Funzioni di autenticazione
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

// Funzioni per gestire i turni
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

// Funzione per caricare i dati iniziali
async function loadInitialData() {
  try {
    // Mostra indicatore di caricamento
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    
    // Carica i turni dal server
    turni = await getTurni();
    
    // Genera il calendario con i turni
    generateCalendar();
    
    // Aggiorna la lista dei turni
    if (typeof updateTurniList === 'function') {
      updateTurniList();
    }
    
    return turni;
  } catch (error) {
    console.error('Errore durante il caricamento dei dati:', error);
    throw error;
  } finally {
    // Nascondi indicatore di caricamento
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}

// Funzione per mostrare le diverse tab dell'applicazione
function showTab(tabId) {
  // Nasconde tutte le sezioni
  document.querySelectorAll('.content-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Mostra la sezione richiesta
  const targetTab = document.getElementById(tabId);
  if (targetTab) targetTab.style.display = 'block';
  
  // Gestione specifica per le diverse tab
  if (tabId === 'chat') {
    if (typeof loadMessages === 'function') {
      loadMessages();
    }
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
    if (typeof aggiornaStatistiche === 'function') {
      aggiornaStatistiche();
    }
  }
}

// Funzione per aggiornare la lista dei turni
function updateTurniList() {
  const turniList = document.getElementById('turniList');
  if (!turniList) return;
  
  turniList.innerHTML = '';
  
  if (turni.length === 0) {
    turniList.innerHTML = '<p class="no-data">Nessun turno trovato.</p>';
    return;
  }
  
  // Filtra i turni in base ai filtri attuali
  let filteredTurni = [...turni];
  
  const filterVolontario = document.getElementById('filterVolontario')?.value.toLowerCase() || '';
  const filterServizio = document.getElementById('filterServizio')?.value || '';
  const filterMese = document.getElementById('filterMese')?.value || '';
  
  if (filterVolontario) {
    filteredTurni = filteredTurni.filter(turno => 
      (turno.volunteer || turno.volontario || '').toLowerCase().includes(filterVolontario)
    );
  }
  
  if (filterServizio) {
    filteredTurni = filteredTurni.filter(turno => 
      (turno.service || turno.servizio) === filterServizio
    );
  }
  
  if (filterMese) {
    const [year, month] = filterMese.split('-');
    filteredTurni = filteredTurni.filter(turno => {
      const turnoDate = (turno.shift_date || turno.data);
      return turnoDate.startsWith(`${year}-${month}`);
    });
  }
  
  // Ordina i turni per data e ora
  filteredTurni.sort((a, b) => {
    const dateA = new Date(`${a.shift_date || a.data}T${a.start_time || a.oraInizio}`);
    const dateB = new Date(`${b.shift_date || b.data}T${b.start_time || b.oraInizio}`);
    return dateA - dateB;
  });
  
  // Crea gli elementi per ogni turno
  filteredTurni.forEach(turno => {
    const turnoDiv = document.createElement('div');
    const servizio = sanitizeHTML(turno.service || turno.servizio || '');
    turnoDiv.className = `turno-card ${servizio.toLowerCase()}`;
    
    const data = new Date(turno.shift_date || turno.data);
    const dataFormatted = data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    
    const volontario = sanitizeHTML(turno.volunteer || turno.volontario || '');
    const oraInizio = sanitizeHTML((turno.start_time || turno.oraInizio || '').substring(0, 5));
    const oraFine = sanitizeHTML((turno.end_time || turno.oraFine || '').substring(0, 5));
    
    turnoDiv.innerHTML = `
      <div class="turno-header">
        <div class="turno-date">${dataFormatted}</div>
        <div class="turno-time">${oraInizio} - ${oraFine}</div>
      </div>
      <div class="turno-body">
        <div class="turno-volontario">${volontario}</div>
        <div class="turno-servizio">${servizio.toUpperCase()}</div>
      </div>
      <div class="turno-actions">
        <button class="view-btn" data-turno-id="${turno.id}">👁️ Dettagli</button>
        ${currentUser && (currentUser.isAdmin || currentUser.username === (turno.created_by)) ? 
        `<button class="delete-btn" data-turno-id="${turno.id}">🗑️ Elimina</button>` : ''}
      </div>
    `;
    
    turniList.appendChild(turnoDiv);
  });
  
  // Aggiungi event listener per i pulsanti
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const turnoId = e.target.dataset.turnoId;
      if (typeof viewTurnoDetails === 'function') {
        viewTurnoDetails(turnoId);
      }
    });
  });
  
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const turnoId = e.target.dataset.turnoId;
      if (confirm('Sei sicuro di voler eliminare questo turno?')) {
        try {
          await eliminaTurno(turnoId);
          await loadInitialData();
          alert('Turno eliminato con successo!');
        } catch (error) {
          alert('Errore nell\'eliminazione del turno: ' + (error.message || 'Riprova più tardi.'));
        }
      }
    });
  });
}

// Funzione per resettare i filtri
function resetFilters() {
  const filterVolontario = document.getElementById('filterVolontario');
  const filterServizio = document.getElementById('filterServizio');
  const filterMese = document.getElementById('filterMese');
  
  if (filterVolontario) filterVolontario.value = '';
  if (filterServizio) filterServizio.value = '';
  if (filterMese) filterMese.value = '';
  
  updateTurniList();
}

// Chiudi il modal quando si clicca all'esterno
chatMessages = messages;
displayMessages();