// TODO: Reemplazar por tu URL de Google Apps Script Web App
const API_URL = 'https://script.google.com/macros/s/AKfycbxv0RbOmm-bT8VTweqcPQi8rQZuXR703E7Y_Mfm0apnUvyZ8Y44XSaSKU62g0FLo1g/exec';

let appData = { players: [], matches: [] };

// DOM Elements
const views = document.querySelectorAll('.view-section');
const leaderboardBody = document.getElementById('leaderboard-body');
const historyContainer = document.getElementById('history-container');
const loadingLeaderboard = document.getElementById('loading-leaderboard');
const tableContainer = document.getElementById('table-container');

const matchForm = document.getElementById('match-form');
const teamAChipsContainer = document.getElementById('team-a-chips');
const teamBChipsContainer = document.getElementById('team-b-chips');
const btnWinA = document.getElementById('btn-win-a');
const btnWinB = document.getElementById('btn-win-b');
const iconWinA = document.getElementById('icon-win-a');
const iconWinB = document.getElementById('icon-win-b');
const matchWinnerInput = document.getElementById('match-winner');
const btnSaveMatch = document.getElementById('btn-save-match');

const playerForm = document.getElementById('player-form');
const newPlayerName = document.getElementById('new-player-name');
const btnSavePlayer = document.getElementById('btn-save-player');

// State para chips
let selectedTeamA = new Set();
let selectedTeamB = new Set();

// Nav logic
function switchView(viewName) {
    views.forEach(view => {
        view.classList.add('hidden');
        if (view.id === `view-${viewName}`) {
            view.classList.remove('hidden');
        }
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        if(btn.dataset.target === `view-${viewName}`) {
            btn.classList.add('active', 'text-white');
            btn.classList.remove('text-slate-500');
        } else {
            btn.classList.remove('active', 'text-white');
            btn.classList.add('text-slate-500');
        }
    });
}

// Global SweetAlert config for Premium look
const Toast = Swal.mixin({
    toast: true,
    position: 'top',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: 'rgba(15, 23, 42, 0.95)',
    color: '#fff',
    iconColor: '#38bdf8',
    customClass: { popup: 'backdrop-blur-md border border-white/10 rounded-2xl mt-4' }
});

const showAlert = (title, text, icon) => {
    Swal.fire({
        title, text, icon,
        background: '#0f172a',
        color: '#f8fafc',
        confirmButtonColor: '#0ea5e9',
        customClass: { popup: 'border border-white/10 rounded-3xl' }
    });
};

async function fetchData() {
    if(!API_URL || API_URL === 'PEGÁ_TU_LINK_DE_APPS_SCRIPT_ACÁ') {
        showAlert('Falta configuración', 'Pegá la URL de tu Apps Script.', 'info');
        return;
    }

    loadingLeaderboard.classList.remove('hidden');
    tableContainer.classList.add('hidden');

    try {
        const url = API_URL + (API_URL.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) return showAlert('Error', data.error, 'error');

        if (Array.isArray(data)) appData = { players: data, matches: [] };
        else appData = data;

        if (!appData.players) appData.players = [];
        if (!appData.matches) appData.matches = [];

        renderLeaderboard();
        renderHistory();
        renderTeamChips();
    } catch (error) {
        console.error(error);
        showAlert('Error', 'No se pudo sincronizar con los servidores.', 'error');
    } finally {
        loadingLeaderboard.classList.add('hidden');
        if (appData.players.length > 0) tableContainer.classList.remove('hidden');
        else {
            loadingLeaderboard.innerHTML = '<p class="text-slate-500 py-8 text-sm">No hay jugadores cargados todavía.</p>';
            loadingLeaderboard.classList.remove('hidden');
        }
    }
}

// Generate Avatar Initials
function getInitials(name) {
    return name.substring(0, 2).toUpperCase();
}

function renderLeaderboard() {
    leaderboardBody.innerHTML = '';
    appData.players.forEach((player, index) => {
        let badge = '';
        if (index === 0) badge = '<div class="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center border border-yellow-500/30 text-xs font-bold shadow-[0_0_10px_rgba(234,179,8,0.3)]">1</div>';
        else if (index === 1) badge = '<div class="w-8 h-8 rounded-full bg-slate-300/20 text-slate-300 flex items-center justify-center border border-slate-300/30 text-xs font-bold">2</div>';
        else if (index === 2) badge = '<div class="w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 flex items-center justify-center border border-amber-700/30 text-xs font-bold">3</div>';
        else badge = `<span class="text-slate-600 font-semibold text-xs ml-3">${index + 1}</span>`;

        const row = document.createElement('tr');
        row.className = "border-b border-white/5 hover:bg-white/[0.02] transition-colors";
        row.innerHTML = `
            <td class="py-4 pl-5">${badge}</td>
            <td class="py-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-xs font-bold border border-brand-500/20">
                        ${getInitials(player.nombre)}
                    </div>
                    <span class="font-semibold text-white">${player.nombre}</span>
                </div>
            </td>
            <td class="py-4 text-center font-bold text-brand-400 text-lg">${player.puntos}</td>
            <td class="py-4 text-center text-slate-400 font-medium pr-4">${player.jugados}</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

function renderHistory() {
    historyContainer.innerHTML = '';
    if (!appData.matches || appData.matches.length === 0) {
        historyContainer.innerHTML = '<div class="glass-panel p-8 rounded-3xl text-center"><i class="ph ph-scroll text-4xl text-slate-600 mb-3 block"></i><p class="text-slate-400 text-sm">Aún no hay partidos jugados.</p></div>';
        return;
    }

    const sortedMatches = [...appData.matches].reverse();
    sortedMatches.forEach(match => {
        const teamAArr = match.teamA ? match.teamA.split(',').map(s => s.trim()) : [];
        const teamBArr = match.teamB ? match.teamB.split(',').map(s => s.trim()) : [];
        
        const isWinA = match.winner === 'A';
        const isWinB = match.winner === 'B';
        const dateStr = new Date(match.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });

        const card = document.createElement('div');
        card.className = "glass-panel rounded-3xl p-5 relative overflow-hidden transition-all";
        card.innerHTML = `
            <div class="flex justify-between items-center mb-5">
                <div class="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <i class="ph ph-calendar-blank"></i> ${dateStr}
                </div>
                <span class="bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-inner">
                    ${teamAArr.length}v${teamBArr.length}
                </span>
            </div>
            
            <div class="flex justify-between items-stretch gap-3">
                <!-- A -->
                <div class="flex-1 flex flex-col justify-between p-4 rounded-2xl ${isWinA ? 'bg-blue-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-slate-800/30 border border-white/5'}">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-2 h-2 rounded-full ${isWinA ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-slate-600'}"></div>
                        <span class="text-xs font-bold ${isWinA ? 'text-blue-400' : 'text-slate-500'}">AZUL</span>
                    </div>
                    <div class="text-[13px] font-medium text-slate-300 flex flex-col gap-2">
                        ${teamAArr.map(p => `<span class="truncate">${p}</span>`).join('')}
                    </div>
                    ${isWinA ? '<div class="mt-4"><i class="ph-fill ph-trophy text-blue-400 text-xl drop-shadow-md"></i></div>' : ''}
                </div>

                <div class="flex items-center justify-center">
                    <span class="text-slate-600 font-black italic text-xs">VS</span>
                </div>

                <!-- B -->
                <div class="flex-1 flex flex-col justify-between p-4 rounded-2xl ${isWinB ? 'bg-red-500/10 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-slate-800/30 border border-white/5'}">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-2 h-2 rounded-full ${isWinB ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'bg-slate-600'}"></div>
                        <span class="text-xs font-bold ${isWinB ? 'text-red-400' : 'text-slate-500'}">ROJO</span>
                    </div>
                    <div class="text-[13px] font-medium text-slate-300 flex flex-col gap-2">
                        ${teamBArr.map(p => `<span class="truncate">${p}</span>`).join('')}
                    </div>
                    ${isWinB ? '<div class="mt-4"><i class="ph-fill ph-trophy text-red-400 text-xl drop-shadow-md"></i></div>' : ''}
                </div>
            </div>
        `;
        historyContainer.appendChild(card);
    });
}

window.togglePlayerSelection = function(team, playerName) {
    if (team === 'A') {
        if (selectedTeamA.has(playerName)) selectedTeamA.delete(playerName);
        else selectedTeamA.add(playerName);
        selectedTeamB.delete(playerName);
    } else {
        if (selectedTeamB.has(playerName)) selectedTeamB.delete(playerName);
        else selectedTeamB.add(playerName);
        selectedTeamA.delete(playerName);
    }
    renderTeamChips();
};

function renderTeamChips() {
    const sorted = [...appData.players].sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    // Chips A
    teamAChipsContainer.innerHTML = sorted.map(p => {
        const isSelected = selectedTeamA.has(p.nombre);
        const isDisabled = selectedTeamB.has(p.nombre);
        const btnClass = isSelected 
            ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] border-blue-400' 
            : (isDisabled ? 'bg-slate-800/30 text-slate-600 opacity-50 cursor-not-allowed border-transparent' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-white/10');
        
        return `<button type="button" onclick="togglePlayerSelection('A', '${p.nombre}')" class="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border ${btnClass}" ${isDisabled ? 'disabled' : ''}>
            ${p.nombre}
        </button>`;
    }).join('');

    // Chips B
    teamBChipsContainer.innerHTML = sorted.map(p => {
        const isSelected = selectedTeamB.has(p.nombre);
        const isDisabled = selectedTeamA.has(p.nombre);
        const btnClass = isSelected 
            ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] border-red-400' 
            : (isDisabled ? 'bg-slate-800/30 text-slate-600 opacity-50 cursor-not-allowed border-transparent' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-white/10');
        
        return `<button type="button" onclick="togglePlayerSelection('B', '${p.nombre}')" class="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border ${btnClass}" ${isDisabled ? 'disabled' : ''}>
            ${p.nombre}
        </button>`;
    }).join('');
}

const baseClassA = "py-6 rounded-3xl font-black text-lg border-2 transition-all flex flex-col items-center justify-center gap-2 relative";
const baseClassB = "py-6 rounded-3xl font-black text-lg border-2 transition-all flex flex-col items-center justify-center gap-2 relative";

btnWinA.addEventListener('click', () => {
    matchWinnerInput.value = 'A';
    btnWinA.className = `${baseClassA} border-blue-400 bg-blue-500/20 text-white scale-[1.05] shadow-[0_0_20px_rgba(59,130,246,0.4)]`;
    iconWinA.className = "text-5xl drop-shadow-lg transition-all scale-110";
    
    btnWinB.className = `${baseClassB} border-red-500/10 bg-red-500/5 text-red-500/50 grayscale opacity-50 active:scale-95`;
    iconWinB.className = "text-4xl drop-shadow-md transition-all scale-90";
});

btnWinB.addEventListener('click', () => {
    matchWinnerInput.value = 'B';
    btnWinB.className = `${baseClassB} border-red-400 bg-red-500/20 text-white scale-[1.05] shadow-[0_0_20px_rgba(239,68,68,0.4)]`;
    iconWinB.className = "text-5xl drop-shadow-lg transition-all scale-110";
    
    btnWinA.className = `${baseClassA} border-blue-500/10 bg-blue-500/5 text-blue-500/50 grayscale opacity-50 active:scale-95`;
    iconWinA.className = "text-4xl drop-shadow-md transition-all scale-90";
});

matchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teamA = Array.from(selectedTeamA);
    const teamB = Array.from(selectedTeamB);
    const winner = matchWinnerInput.value;

    if (teamA.length === 0 || teamB.length === 0) return showAlert('Atención', 'Elegí los jugadores de ambos equipos.', 'warning');
    if (teamA.length !== teamB.length) return showAlert('Equipos desparejos', `El Equipo Azul tiene ${teamA.length} y el Equipo Rojo tiene ${teamB.length}. Tienen que ser la misma cantidad.`, 'error');
    if (teamA.length < 2 || teamA.length > 3) return showAlert('Formato inválido', 'Solo se permite jugar 2v2 (Pica Pica) o 3v3 (Gallo).', 'warning');
    if (!winner) return showAlert('Falta', 'Tenés que seleccionar quién ganó el partido.', 'warning');

    btnSaveMatch.disabled = true;
    btnSaveMatch.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Guardando...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addMatch', teamA, teamB, winner })
        });
        
        const result = await response.json();
        if(result.success) {
            Toast.fire({ icon: 'success', title: '¡Partido guardado con éxito!' });
            
            // Reset Form State
            selectedTeamA.clear();
            selectedTeamB.clear();
            renderTeamChips();
            matchWinnerInput.value = '';
            
            // Reset Buttons
            btnWinA.className = `${baseClassA} border-blue-500/20 bg-blue-500/5 text-blue-500 active:scale-95`;
            iconWinA.className = "text-4xl drop-shadow-md transition-all";
            btnWinB.className = `${baseClassB} border-red-500/20 bg-red-500/5 text-red-500 active:scale-95`;
            iconWinB.className = "text-4xl drop-shadow-md transition-all";
            
            switchView('history');
            fetchData();
        } else showAlert('Error', result.message, 'error');
    } catch (error) {
        showAlert('Error', 'No se pudo conectar con la base de datos.', 'error');
    } finally {
        btnSaveMatch.disabled = false;
        btnSaveMatch.innerHTML = '<i class="ph ph-paper-plane-tilt text-xl"></i> Guardar Partido';
    }
});

playerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = newPlayerName.value.trim();
    if (!name) return;

    btnSavePlayer.disabled = true;
    btnSavePlayer.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Registrando...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addPlayer', name })
        });
        const result = await response.json();
        if(result.success) {
            Toast.fire({ icon: 'success', title: `${name} ya puede jugar` });
            playerForm.reset();
            switchView('leaderboard');
            fetchData();
        } else showAlert('Atención', result.message, 'warning');
    } catch (error) {
        showAlert('Ups...', 'Ocurrió un error al guardar. Verificá si igual se guardó recargando la página.', 'error');
    } finally {
        btnSavePlayer.disabled = false;
        btnSavePlayer.innerHTML = '<i class="ph ph-user-plus text-xl"></i> Sumar Jugador';
    }
});

document.getElementById('btn-refresh').addEventListener('click', fetchData);
document.querySelector('[data-target="view-leaderboard"]').classList.add('active');
fetchData();
