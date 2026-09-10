// TODO: Reemplazar por tu URL de Google Apps Script Web App
const API_URL = 'https://script.google.com/macros/s/AKfycbz64Nale12AaW2-9C8RKlNL3uWVdT72QhOtmzhdjlMHvx08ZFjBrv_ZKlKAVs7tLHmC/exec';

let appData = {
    players: [],
    matches: []
};

// DOM Elements
const views = document.querySelectorAll('.view-section');
const leaderboardBody = document.getElementById('leaderboard-body');
const historyContainer = document.getElementById('history-container');
const loadingLeaderboard = document.getElementById('loading-leaderboard');
const tableContainer = document.getElementById('table-container');

// Forms
const matchForm = document.getElementById('match-form');
const teamASelect = document.getElementById('team-a');
const teamBSelect = document.getElementById('team-b');
const pointsAInput = document.getElementById('points-a');
const pointsBInput = document.getElementById('points-b');
const btnWinA = document.getElementById('btn-win-a');
const btnWinB = document.getElementById('btn-win-b');
const matchWinnerInput = document.getElementById('match-winner');
const btnSaveMatch = document.getElementById('btn-save-match');

const playerForm = document.getElementById('player-form');
const newPlayerName = document.getElementById('new-player-name');
const btnSavePlayer = document.getElementById('btn-save-player');

// Navigation logic
function switchView(viewName) {
    views.forEach(view => {
        view.classList.add('hidden');
        if (view.id === `view-${viewName}`) {
            view.classList.remove('hidden');
        }
    });

    // Deseleccionar botones del nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === `view-${viewName}`) {
            btn.classList.replace('text-gray-500', 'text-white');
        } else {
            btn.classList.replace('text-white', 'text-gray-500');
        }
    });

    if(viewName === 'leaderboard' || viewName === 'history') fetchData();
}

// Fetch Data from Google Sheets
async function fetchData() {
    if(!API_URL || API_URL === 'PEGÁ_TU_LINK_DE_APPS_SCRIPT_ACÁ') {
        Swal.fire('Falta configuración', 'Pegá la URL de tu Apps Script en el archivo app.js (constante API_URL).', 'info');
        return;
    }

    loadingLeaderboard.classList.remove('hidden');
    tableContainer.classList.add('hidden');

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Si el Apps Script devuelve un error controlado (ej: faltan pestañas)
        if (data.error) {
            Swal.fire('Error en el Google Sheet', data.error, 'error');
            return;
        }

        // Manejo de compatibilidad: si la API vieja devuelve un Array en vez del objeto nuevo
        if (Array.isArray(data)) {
            appData = { players: data, matches: [] };
        } else {
            appData = data;
        }

        // Seguros por si vienen propiedades vacías
        if (!appData.players) appData.players = [];
        if (!appData.matches) appData.matches = [];

        renderLeaderboard();
        renderHistory();
        updateSelects();
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudieron cargar los datos de la liga.', 'error');
    } finally {
        loadingLeaderboard.classList.add('hidden');
        tableContainer.classList.remove('hidden');
    }
}

// Render Leaderboard
function renderLeaderboard() {
    leaderboardBody.innerHTML = '';
    appData.players.forEach((player, index) => {
        let medal = '';
        if (index === 0) medal = '🥇';
        else if (index === 1) medal = '🥈';
        else if (index === 2) medal = '🥉';
        else medal = `<span class="text-gray-500">${index + 1}</span>`;

        const row = document.createElement('tr');
        row.className = "border-b border-gray-700 hover:bg-gray-700 transition-colors";
        row.innerHTML = `
            <td class="p-3 text-center font-bold text-lg">${medal}</td>
            <td class="p-3 font-semibold text-white">${player.nombre}</td>
            <td class="p-3 text-center font-bold text-arg-accent text-lg">${player.puntos}</td>
            <td class="p-3 text-center text-gray-400">${player.jugados}</td>
            <td class="p-3 text-center text-gray-400">${player.winrate}%</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

// Render History
function renderHistory() {
    historyContainer.innerHTML = '';
    
    if (!appData.matches || appData.matches.length === 0) {
        historyContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Aún no hay partidos jugados. ¡Armá el primer equipo!</p>';
        return;
    }

    // Orden cronológico inverso (los más nuevos arriba)
    const sortedMatches = [...appData.matches].reverse();

    sortedMatches.forEach(match => {
        const teamAArr = match.teamA ? match.teamA.split(',').map(s => s.trim()) : [];
        const teamBArr = match.teamB ? match.teamB.split(',').map(s => s.trim()) : [];
        
        // Determinar Badge
        let badgeType = '';
        if (teamAArr.length === 2 && teamBArr.length === 2) badgeType = 'Pica Pica ✌️';
        else if (teamAArr.length === 3 && teamBArr.length === 3) badgeType = 'Gallo 🐓';
        else badgeType = `${teamAArr.length}v${teamBArr.length}`;

        const isWinA = match.winner === 'A';
        const isWinB = match.winner === 'B';

        const dateStr = new Date(match.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

        const card = document.createElement('div');
        card.className = "bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700 relative overflow-hidden";
        
        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs text-gray-400">📅 ${dateStr}</span>
                <span class="bg-gray-700 text-arg-accent text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">${badgeType}</span>
            </div>
            
            <div class="flex justify-between items-stretch gap-2">
                <!-- Team A -->
                <div class="flex-1 flex flex-col justify-between text-center p-2 rounded-lg ${isWinA ? 'bg-blue-900/40 border border-blue-500/50' : 'bg-gray-900/50 border border-transparent'}">
                    <div class="text-blue-400 font-bold mb-2 ${isWinA ? 'text-xl' : 'text-md'}">
                        ${match.ptsA !== "" && match.ptsA !== undefined ? match.ptsA : (isWinA ? '🏆' : '-')}
                    </div>
                    <div class="text-[11px] text-gray-300 flex flex-col gap-1 mt-auto">
                        ${teamAArr.map(p => `<span>${p}</span>`).join('')}
                    </div>
                </div>

                <div class="flex items-center justify-center px-1">
                    <span class="text-gray-600 font-black italic text-xs">VS</span>
                </div>

                <!-- Team B -->
                <div class="flex-1 flex flex-col justify-between text-center p-2 rounded-lg ${isWinB ? 'bg-red-900/40 border border-red-500/50' : 'bg-gray-900/50 border border-transparent'}">
                    <div class="text-red-400 font-bold mb-2 ${isWinB ? 'text-xl' : 'text-md'}">
                        ${match.ptsB !== "" && match.ptsB !== undefined ? match.ptsB : (isWinB ? '🏆' : '-')}
                    </div>
                    <div class="text-[11px] text-gray-300 flex flex-col gap-1 mt-auto">
                        ${teamBArr.map(p => `<span>${p}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        historyContainer.appendChild(card);
    });
}

// Update Multiple Selects
function updateSelects() {
    const sorted = [...appData.players].sort((a, b) => a.nombre.localeCompare(b.nombre));
    const optionsHtml = sorted.map(p => `<option value="${p.nombre}">${p.nombre}</option>`).join('');
    teamASelect.innerHTML = optionsHtml;
    teamBSelect.innerHTML = optionsHtml;
}

// Winner Selection UI Toggle
btnWinA.addEventListener('click', () => {
    matchWinnerInput.value = 'A';
    btnWinA.classList.replace('bg-gray-900', 'bg-blue-600');
    btnWinA.classList.replace('text-blue-400', 'text-white');
    btnWinB.classList.replace('bg-red-600', 'bg-gray-900');
    btnWinB.classList.replace('text-white', 'text-red-400');
});

btnWinB.addEventListener('click', () => {
    matchWinnerInput.value = 'B';
    btnWinB.classList.replace('bg-gray-900', 'bg-red-600');
    btnWinB.classList.replace('text-red-400', 'text-white');
    btnWinA.classList.replace('bg-blue-600', 'bg-gray-900');
    btnWinA.classList.replace('text-white', 'text-blue-400');
});

// Save Match Submit
matchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const teamA = Array.from(teamASelect.selectedOptions).map(opt => opt.value);
    const teamB = Array.from(teamBSelect.selectedOptions).map(opt => opt.value);
    const ptsA = pointsAInput.value;
    const ptsB = pointsBInput.value;
    const winner = matchWinnerInput.value;

    if (teamA.length === 0 || teamB.length === 0) {
        return Swal.fire('Epa', 'Tenés que elegir los jugadores de ambos equipos.', 'warning');
    }

    const intersect = teamA.filter(value => teamB.includes(value));
    if (intersect.length > 0) {
        return Swal.fire('Che!', 'Hay jugadores que están en los dos equipos a la vez.', 'error');
    }

    if (!winner) {
        return Swal.fire('Falta algo', 'Elegí qué equipo ganó el partido.', 'warning');
    }

    btnSaveMatch.disabled = true;
    btnSaveMatch.innerHTML = 'Guardando...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow', // Necesario para Google Apps Script
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addMatch', teamA, teamB, ptsA, ptsB, winner })
        });
        
        const result = await response.json();
        if(result.success) {
            Swal.fire('¡Cantado!', 'El partido se guardó de 10.', 'success');
            matchForm.reset();
            matchWinnerInput.value = '';
            btnWinA.className = "flex-1 py-3 rounded-lg font-bold border-2 border-blue-500 bg-gray-900 text-blue-400 transition-colors";
            btnWinB.className = "flex-1 py-3 rounded-lg font-bold border-2 border-red-500 bg-gray-900 text-red-400 transition-colors";
            
            // Volver al Historial y recargar
            switchView('history');
        } else {
            Swal.fire('Error', result.message || 'Algo falló en el server', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar con la base de datos.', 'error');
    } finally {
        btnSaveMatch.disabled = false;
        btnSaveMatch.innerHTML = 'Guardar Resultado 🚀';
    }
});

// Save New Player Submit
playerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = newPlayerName.value.trim();
    if (!name) return;

    btnSavePlayer.disabled = true;
    btnSavePlayer.innerHTML = 'Agregando...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addPlayer', name })
        });
        
        const result = await response.json();
        if(result.success) {
            Swal.fire('¡Adentro!', `${name} ya está anotado para jugar.`, 'success');
            playerForm.reset();
            switchView('leaderboard');
        } else {
            Swal.fire('Mmm...', result.message || 'Error al agregar', 'warning');
        }
    } catch (error) {
        Swal.fire('Error', 'No se pudo conectar para guardar el jugador.', 'error');
    } finally {
        btnSavePlayer.disabled = false;
        btnSavePlayer.innerHTML = 'Sumar al Asado 🍷';
    }
});

// Listeners extras
document.getElementById('btn-refresh').addEventListener('click', fetchData);

// Iniciar cargando la tabla y asegurando estado inicial de botones
document.querySelector('[data-target="view-leaderboard"]').classList.replace('text-gray-500', 'text-white');
fetchData();
