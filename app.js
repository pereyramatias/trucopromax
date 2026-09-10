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
            btn.classList.add('text-sky-300');
            btn.classList.remove('text-slate-400');
        } else {
            btn.classList.remove('text-sky-300');
            btn.classList.add('text-slate-400');
        }
    });

    if(viewName === 'leaderboard' || viewName === 'history') fetchData();
}

// Fetch Data from Google Sheets
async function fetchData() {
    if(!API_URL || API_URL === 'PEGÁ_TU_LINK_DE_APPS_SCRIPT_ACÁ') {
        Swal.fire({
            title: 'Falta configuración',
            text: 'Pegá la URL de tu Apps Script en el archivo app.js (constante API_URL).',
            icon: 'info',
            background: '#1e293b',
            color: '#f8fafc'
        });
        return;
    }

    loadingLeaderboard.classList.remove('hidden');
    tableContainer.classList.add('hidden');

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        // Si el Apps Script devuelve un error controlado (ej: faltan pestañas)
        if (data.error) {
            Swal.fire({
                title: 'Error en el Google Sheet',
                text: data.error,
                icon: 'error',
                background: '#1e293b',
                color: '#f8fafc'
            });
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
        Swal.fire({
            title: 'Error',
            text: 'No se pudieron cargar los datos de la liga.',
            icon: 'error',
            background: '#1e293b',
            color: '#f8fafc'
        });
    } finally {
        loadingLeaderboard.classList.add('hidden');
        if (appData.players.length > 0) {
            tableContainer.classList.remove('hidden');
        } else {
            loadingLeaderboard.innerHTML = '<p class="text-slate-400 py-8">Todavía no hay jugadores cargados.</p>';
            loadingLeaderboard.classList.remove('hidden');
        }
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
        else medal = `<span class="text-slate-500 font-medium">${index + 1}</span>`;

        const row = document.createElement('tr');
        row.className = "border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors";
        row.innerHTML = `
            <td class="p-4 text-center text-xl drop-shadow-md">${medal}</td>
            <td class="p-4 font-bold text-white tracking-wide">${player.nombre}</td>
            <td class="p-4 text-center font-black text-sky-400 text-xl">${player.puntos}</td>
            <td class="p-4 text-center text-slate-400 font-medium">${player.jugados}</td>
            <td class="p-4 text-center text-slate-400 font-medium">${player.winrate}%</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

// Render History
function renderHistory() {
    historyContainer.innerHTML = '';
    
    if (!appData.matches || appData.matches.length === 0) {
        historyContainer.innerHTML = '<div class="glass-card p-8 rounded-2xl text-center"><p class="text-slate-400 text-lg">Aún no hay partidos jugados. ¡Armá el primer equipo!</p></div>';
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
        card.className = "glass-card rounded-3xl p-5 shadow-lg border-l-4 border-l-sky-500 relative overflow-hidden transition-all hover:scale-[1.01]";
        
        card.innerHTML = `
            <div class="flex justify-between items-center mb-4">
                <span class="text-xs text-slate-400 font-medium tracking-wide">📅 ${dateStr}</span>
                <span class="bg-slate-800/80 text-sky-300 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-inner">${badgeType}</span>
            </div>
            
            <div class="flex justify-between items-stretch gap-3">
                <!-- Team A -->
                <div class="flex-1 flex flex-col justify-between text-center p-3 rounded-2xl ${isWinA ? 'bg-gradient-to-b from-blue-900/40 to-blue-800/20 border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]' : 'bg-slate-800/40 border border-transparent'}">
                    <div class="text-blue-400 font-black mb-3 drop-shadow-sm ${isWinA ? 'text-2xl' : 'text-lg'}">
                        ${match.ptsA !== "" && match.ptsA !== undefined ? match.ptsA : (isWinA ? '🏆' : '-')}
                    </div>
                    <div class="text-[12px] font-medium text-slate-300 flex flex-col gap-1.5 mt-auto">
                        ${teamAArr.map(p => `<span>${p}</span>`).join('')}
                    </div>
                </div>

                <div class="flex items-center justify-center px-1">
                    <span class="bg-slate-800 text-slate-400 font-black italic text-xs px-2 py-1 rounded-full shadow-inner">VS</span>
                </div>

                <!-- Team B -->
                <div class="flex-1 flex flex-col justify-between text-center p-3 rounded-2xl ${isWinB ? 'bg-gradient-to-b from-red-900/40 to-red-800/20 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]' : 'bg-slate-800/40 border border-transparent'}">
                    <div class="text-red-400 font-black mb-3 drop-shadow-sm ${isWinB ? 'text-2xl' : 'text-lg'}">
                        ${match.ptsB !== "" && match.ptsB !== undefined ? match.ptsB : (isWinB ? '🏆' : '-')}
                    </div>
                    <div class="text-[12px] font-medium text-slate-300 flex flex-col gap-1.5 mt-auto">
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
    btnWinA.classList.replace('bg-slate-800', 'bg-blue-600');
    btnWinA.classList.replace('text-blue-400', 'text-white');
    btnWinA.classList.replace('border-blue-500/50', 'border-blue-400');
    
    btnWinB.classList.replace('bg-red-600', 'bg-slate-800');
    btnWinB.classList.replace('text-white', 'text-red-400');
    btnWinB.classList.replace('border-red-400', 'border-red-500/50');
});

btnWinB.addEventListener('click', () => {
    matchWinnerInput.value = 'B';
    btnWinB.classList.replace('bg-slate-800', 'bg-red-600');
    btnWinB.classList.replace('text-red-400', 'text-white');
    btnWinB.classList.replace('border-red-500/50', 'border-red-400');
    
    btnWinA.classList.replace('bg-blue-600', 'bg-slate-800');
    btnWinA.classList.replace('text-white', 'text-blue-400');
    btnWinA.classList.replace('border-blue-400', 'border-blue-500/50');
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
        return Swal.fire({ title: 'Epa', text: 'Tenés que elegir los jugadores de ambos equipos.', icon: 'warning', background: '#1e293b', color: '#f8fafc' });
    }

    const intersect = teamA.filter(value => teamB.includes(value));
    if (intersect.length > 0) {
        return Swal.fire({ title: 'Che!', text: 'Hay jugadores que están en los dos equipos a la vez.', icon: 'error', background: '#1e293b', color: '#f8fafc' });
    }

    if (!winner) {
        return Swal.fire({ title: 'Falta algo', text: 'Elegí qué equipo ganó el partido.', icon: 'warning', background: '#1e293b', color: '#f8fafc' });
    }

    btnSaveMatch.disabled = true;
    btnSaveMatch.innerHTML = 'Guardando... <span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full ml-2"></span>';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow', // Necesario para Google Apps Script
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addMatch', teamA, teamB, ptsA, ptsB, winner })
        });
        
        const result = await response.json();
        if(result.success) {
            Swal.fire({ title: '¡Cantado!', text: 'El partido se guardó de 10.', icon: 'success', background: '#1e293b', color: '#f8fafc' });
            matchForm.reset();
            matchWinnerInput.value = '';
            
            // Reset winner buttons UI
            btnWinA.className = "flex-1 py-4 rounded-2xl font-black text-lg border-2 border-blue-500/50 bg-slate-800 text-blue-400 shadow-md transition-all active:scale-95";
            btnWinB.className = "flex-1 py-4 rounded-2xl font-black text-lg border-2 border-red-500/50 bg-slate-800 text-red-400 shadow-md transition-all active:scale-95";
            
            // Volver al Historial y recargar
            switchView('history');
        } else {
            Swal.fire({ title: 'Error', text: result.message || 'Algo falló en el server', icon: 'error', background: '#1e293b', color: '#f8fafc' });
        }
    } catch (error) {
        Swal.fire({ title: 'Error', text: 'No se pudo conectar con la base de datos.', icon: 'error', background: '#1e293b', color: '#f8fafc' });
    } finally {
        btnSaveMatch.disabled = false;
        btnSaveMatch.innerHTML = 'GUARDAR RESULTADO 🚀';
    }
});

// Save New Player Submit
playerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = newPlayerName.value.trim();
    if (!name) return;

    btnSavePlayer.disabled = true;
    btnSavePlayer.innerHTML = 'Agregando... <span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full ml-2"></span>';

    try {
        // Enviar POST request. Si el backend falla, caerá al catch.
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addPlayer', name })
        });
        
        // Si el payload devuelto no es JSON válido, esto lanzará error y pasará al catch.
        const result = await response.json();
        
        if(result.success) {
            Swal.fire({ title: '¡Adentro!', text: `${name} ya está anotado para jugar.`, icon: 'success', background: '#1e293b', color: '#f8fafc' });
            playerForm.reset();
            switchView('leaderboard');
        } else {
            Swal.fire({ title: 'Mmm...', text: result.message || 'Error al agregar', icon: 'warning', background: '#1e293b', color: '#f8fafc' });
        }
    } catch (error) {
        console.error("Error detallado:", error);
        Swal.fire({ 
            title: 'Ups...', 
            text: 'Ocurrió un error al guardar. Intentá refrescar la página. Si el jugador se guardó en la planilla igual, puede ser un error de conexión (CORS) normal.', 
            icon: 'error', 
            background: '#1e293b', 
            color: '#f8fafc' 
        });
    } finally {
        // Asegurarnos de habilitar el botón siempre
        btnSavePlayer.disabled = false;
        btnSavePlayer.innerHTML = 'SUMAR AL ASADO 🍷';
    }
});

// Listeners extras
document.getElementById('btn-refresh').addEventListener('click', fetchData);

// Iniciar cargando la tabla y asegurando estado inicial de botones
document.querySelector('[data-target="view-leaderboard"]').classList.add('text-sky-300');
document.querySelector('[data-target="view-leaderboard"]').classList.remove('text-slate-400');
fetchData();
