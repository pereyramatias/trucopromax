// TODO: Reemplazar por tu URL de Google Apps Script Web App
const API_URL = 'https://script.google.com/macros/s/AKfycbwc1ZLabVcqgCga8dr9_ylVmD3csN8zrQrGbRUlN68vYnF_mJf0GXDAy9K-JbS7ZQYm/exec';

let appData = { players: [], matches: [] };
let currentUser = null;

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
    customClass: { popup: 'backdrop-blur-md border border-white/10 rounded-2xl mt-4 shadow-2xl' }
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

// Check Session
function checkSession() {
    const savedUser = localStorage.getItem('truco_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('login-screen').classList.add('hidden');
        
        document.getElementById('profile-name').innerText = currentUser.apodo ? `${currentUser.nombre} "${currentUser.apodo}"` : currentUser.nombre;
        document.getElementById('profile-avatar').innerText = getInitials(currentUser.apodo || currentUser.nombre);
        document.getElementById('profile-apodo').value = currentUser.apodo || '';
        
        if (currentUser.nombre.trim().toLowerCase() === 'fideo') {
            document.getElementById('danger-zone').classList.remove('hidden');
        } else {
            document.getElementById('danger-zone').classList.add('hidden');
        }
        
        fetchData();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
    }
}

// Fetch Data
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

        enrichPlayerData();

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

        const displayName = player.apodo ? `${player.nombre} "${player.apodo}"` : player.nombre;

        let streakIcon = '';
        if (player.streak >= 2) streakIcon = `<span title="Racha: ${player.streak} ganados" class="text-lg drop-shadow-md">🔥</span>`;
        else if (player.streak <= -2) streakIcon = `<span title="Racha: ${Math.abs(player.streak)} perdidos" class="text-lg drop-shadow-md opacity-70">🧊</span>`;

        const row = document.createElement('tr');
        row.className = "border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group";
        row.setAttribute('onclick', `showPlayerStats('${player.nombre}')`);
        row.innerHTML = `
            <td class="py-4 pl-5">${badge}</td>
            <td class="py-4">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-brand-500/10 text-brand-400 flex items-center justify-center text-xs font-bold border border-brand-500/20 group-hover:scale-110 transition-transform">
                        ${getInitials(player.apodo || player.nombre)}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="font-semibold text-white">${displayName}</span>
                        ${streakIcon}
                    </div>
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
    const statsContainer = document.getElementById('history-stats');
    const stat2v2 = document.getElementById('stat-2v2');
    const stat3v3 = document.getElementById('stat-3v3');

    if (!appData.matches || appData.matches.length === 0) {
        historyContainer.innerHTML = '<div class="glass-panel p-8 rounded-3xl text-center"><i class="ph ph-scroll text-4xl text-slate-600 mb-3 block"></i><p class="text-slate-400 text-sm">Aún no hay partidos jugados.</p></div>';
        if (statsContainer) statsContainer.classList.add('hidden');
        return;
    }

    if (statsContainer) statsContainer.classList.remove('hidden');

    let count2v2 = 0;
    let count3v3 = 0;

    const sortedMatches = [...appData.matches].reverse();
    sortedMatches.forEach(match => {
        const teamAArr = match.teamA ? match.teamA.split(',').map(s => s.trim()) : [];
        const teamBArr = match.teamB ? match.teamB.split(',').map(s => s.trim()) : [];
        
        if (teamAArr.length === 2) count2v2++;
        else if (teamAArr.length === 3) count3v3++;

        const isWinA = match.winner === 'A';
        const isWinB = match.winner === 'B';
        const dateStr = new Date(match.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
        const auditor = match.createdBy || 'Desconocido';

        const card = document.createElement('div');
        card.className = "glass-panel rounded-3xl p-5 relative overflow-hidden transition-all";
        card.innerHTML = `
            <div class="flex justify-between items-center mb-5">
                <div class="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <i class="ph ph-calendar-blank"></i> ${dateStr}
                </div>
                <div class="flex items-center gap-3">
                    ${match.createdBy === currentUser.nombre ? `<button onclick="deleteMatch('${match.id}')" class="text-red-400/50 hover:text-red-400 hover:scale-110 transition-all p-1" title="Eliminar partido"><i class="ph-fill ph-trash text-lg"></i></button>` : ''}
                    <span class="bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-inner">
                        ${teamAArr.length}v${teamBArr.length}
                    </span>
                </div>
            </div>
            
            <div class="flex justify-between items-stretch gap-3">
                <!-- A -->
                <div class="flex-1 flex flex-col justify-between p-4 rounded-2xl ${isWinA ? 'bg-blue-500/10 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-slate-800/30 border border-white/5'}">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-2 h-2 rounded-full ${isWinA ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'bg-slate-600'}"></div>
                        <span class="text-xs font-bold ${isWinA ? 'text-blue-400' : 'text-slate-500'}">NOSOTROS</span>
                    </div>
                    <div class="text-[13px] font-medium text-slate-300 flex flex-col gap-2">
                        ${teamAArr.map(p => `<span class="truncate">${p}</span>`).join('')}
                    </div>
                    ${isWinA ? '<div class="mt-4"><i class="ph-fill ph-trophy text-blue-400 text-xl drop-shadow-md"></i></div>' : '<div class="mt-4 text-xl drop-shadow-md opacity-70 grayscale" title="A llorar al campito">🍼</div>'}
                </div>

                <div class="flex items-center justify-center">
                    <span class="text-slate-600 font-black italic text-xs">VS</span>
                </div>

                <!-- B -->
                <div class="flex-1 flex flex-col justify-between p-4 rounded-2xl ${isWinB ? 'bg-red-500/10 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-slate-800/30 border border-white/5'}">
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-2 h-2 rounded-full ${isWinB ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'bg-slate-600'}"></div>
                        <span class="text-xs font-bold ${isWinB ? 'text-red-400' : 'text-slate-500'}">ELLOS</span>
                    </div>
                    <div class="text-[13px] font-medium text-slate-300 flex flex-col gap-2">
                        ${teamBArr.map(p => `<span class="truncate">${p}</span>`).join('')}
                    </div>
                    ${isWinB ? '<div class="mt-4"><i class="ph-fill ph-trophy text-red-400 text-xl drop-shadow-md"></i></div>' : '<div class="mt-4 text-xl drop-shadow-md opacity-70 grayscale" title="A llorar al campito">🍼</div>'}
                </div>
            </div>
            
            <!-- Auditoría -->
            <div class="mt-4 pt-3 border-t border-white/5 flex items-center justify-end gap-1.5 opacity-60">
                <i class="ph-fill ph-pencil-simple text-[10px]"></i>
                <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cargado por: ${auditor}</span>
            </div>
        `;
        historyContainer.appendChild(card);
    });

    if (stat2v2) stat2v2.innerText = count2v2;
    if (stat3v3) stat3v3.innerText = count3v3;
}

window.deleteMatch = async function(matchId) {
    const confirm = await Swal.fire({
        title: '¿Borrar partido?',
        text: 'Se van a restar los puntos de este partido a los jugadores. Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar',
        background: '#0f172a',
        color: '#f8fafc',
        customClass: { popup: 'border border-white/10 rounded-3xl' }
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({
        title: 'Borrando...',
        text: 'Deshaciendo puntos y eliminando registro.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        background: '#0f172a',
        color: '#f8fafc',
        customClass: { popup: 'border border-white/10 rounded-3xl' }
    });

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'deleteMatch', matchId, user: currentUser.nombre })
        });
        const result = await response.json();
        
        if(result.success) {
            Swal.fire({ title: '¡Borrado!', text: result.message, icon: 'success', background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#0ea5e9' });
            fetchData();
        } else {
            Swal.fire({ title: 'Error', text: result.message, icon: 'error', background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#0ea5e9' });
        }
    } catch(err) {
        showAlert('Error', 'Problema de red al intentar borrar.', 'error');
    }
};

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
        const displayName = p.nombre;
        const isSelected = selectedTeamA.has(p.nombre);
        const isDisabled = selectedTeamB.has(p.nombre);
        const btnClass = isSelected 
            ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)] border-blue-400' 
            : (isDisabled ? 'bg-slate-800/30 text-slate-600 opacity-50 cursor-not-allowed border-transparent' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-white/10');
        
        return `<button type="button" onclick="togglePlayerSelection('A', '${p.nombre}')" class="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border ${btnClass}" ${isDisabled ? 'disabled' : ''}>
            ${displayName}
        </button>`;
    }).join('');

    // Chips B
    teamBChipsContainer.innerHTML = sorted.map(p => {
        const displayName = p.nombre;
        const isSelected = selectedTeamB.has(p.nombre);
        const isDisabled = selectedTeamA.has(p.nombre);
        const btnClass = isSelected 
            ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)] border-red-400' 
            : (isDisabled ? 'bg-slate-800/30 text-slate-600 opacity-50 cursor-not-allowed border-transparent' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-white/10');
        
        return `<button type="button" onclick="togglePlayerSelection('B', '${p.nombre}')" class="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border ${btnClass}" ${isDisabled ? 'disabled' : ''}>
            ${displayName}
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

// SUBMIT: Match
matchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const teamA = Array.from(selectedTeamA);
    const teamB = Array.from(selectedTeamB);
    const winner = matchWinnerInput.value;

    if (teamA.length === 0 || teamB.length === 0) return showAlert('Atención', 'Elegí los jugadores de ambos equipos.', 'warning');
    if (teamA.length !== teamB.length) return showAlert('Equipos desparejos', `El Equipo Nosotros tiene ${teamA.length} y el Equipo Ellos tiene ${teamB.length}. Tienen que ser la misma cantidad.`, 'error');
    if (teamA.length < 2 || teamA.length > 3) return showAlert('Formato inválido', 'Solo se permite jugar 2v2 (Pica Pica) o 3v3 (Gallo).', 'warning');
    if (!winner) return showAlert('Falta', 'Tenés que seleccionar quién ganó el partido.', 'warning');

    btnSaveMatch.disabled = true;
    btnSaveMatch.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Guardando...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addMatch', teamA, teamB, winner, createdBy: currentUser.nombre })
        });
        
        const result = await response.json();
        if(result.success) {
            Toast.fire({ icon: 'success', title: '¡Partido guardado con éxito!' });
            
            selectedTeamA.clear();
            selectedTeamB.clear();
            renderTeamChips();
            matchWinnerInput.value = '';
            
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

// SUBMIT: New Player
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
        showAlert('Ups...', 'Ocurrió un error al guardar.', 'error');
    } finally {
        btnSavePlayer.disabled = false;
        btnSavePlayer.innerHTML = '<i class="ph ph-user-plus text-xl"></i> Sumar Jugador';
    }
});

// SUBMIT: Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = document.getElementById('login-pin').value.trim();
    if (!pin) return;
    
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin text-xl"></i> Validando...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', pin })
        });
        const result = await response.json();
        
        if(result.success) {
            currentUser = result.user;
            localStorage.setItem('truco_user', JSON.stringify(currentUser));
            
            document.getElementById('login-screen').classList.add('opacity-0');
            setTimeout(() => {
                document.getElementById('login-screen').classList.add('hidden');
            }, 500);
            
            document.getElementById('profile-name').innerText = currentUser.apodo ? `${currentUser.nombre} "${currentUser.apodo}"` : currentUser.nombre;
            document.getElementById('profile-avatar').innerText = getInitials(currentUser.apodo || currentUser.nombre);
            document.getElementById('profile-apodo').value = currentUser.apodo || '';
            
            fetchData();
            Toast.fire({ icon: 'success', title: `¡Bienvenido ${currentUser.apodo || currentUser.nombre}!` });
        } else {
            showAlert('PIN Inválido', 'El PIN no es correcto o no fue asignado.', 'error');
        }
    } catch(err) {
        showAlert('Error', 'Problema de conexión.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Ingresar <i class="ph-bold ph-arrow-right"></i>';
    }
});

// LOGOUT
document.getElementById('btn-logout').addEventListener('click', () => {
    localStorage.removeItem('truco_user');
    location.reload();
});

// Check Session
function checkSession() {
    const savedUser = localStorage.getItem('truco_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('login-screen').classList.add('hidden');
        
        document.getElementById('profile-name').innerText = currentUser.apodo ? `${currentUser.nombre} "${currentUser.apodo}"` : currentUser.nombre;
        document.getElementById('profile-avatar').innerText = getInitials(currentUser.apodo || currentUser.nombre);
        document.getElementById('profile-apodo').value = currentUser.apodo || '';
        
        if (currentUser.nombre.trim().toLowerCase() === 'fideo') {
            document.getElementById('danger-zone').classList.remove('hidden');
        } else {
            document.getElementById('danger-zone').classList.add('hidden');
        }
        
        fetchData();
    } else {
        document.getElementById('login-screen').classList.remove('hidden');
    }
}

// END SEASON
document.getElementById('btn-end-season').addEventListener('click', async () => {
    const { value: text } = await Swal.fire({
        title: '¡CUIDADO!',
        html: 'Estás por finalizar la temporada actual. Se va a generar una copia de seguridad automática en tu Google Sheets, y luego <b>los puntos y partidos de todos volverán a 0</b>.<br><br>Para confirmar, escribí <b>RESETEAR</b>:',
        input: 'text',
        inputPlaceholder: 'RESETEAR',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Finalizar Temporada',
        cancelButtonText: 'Cancelar',
        background: '#0f172a',
        color: '#f8fafc',
        customClass: { popup: 'border border-red-500/30 rounded-3xl' }
    });

    if (text !== 'RESETEAR') {
        if (text !== undefined) Swal.fire({ title: 'Cancelado', text: 'La palabra clave no coincide.', icon: 'info', background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#0ea5e9' });
        return;
    }

    Swal.fire({
        title: 'Cerrando Temporada...',
        text: 'Guardando backups y reiniciando liga.',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
        background: '#0f172a', color: '#f8fafc'
    });

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'endSeason', user: currentUser.nombre })
        });
        const result = await response.json();
        
        if(result.success) {
            Swal.fire({ title: '¡Nueva Temporada!', text: result.message, icon: 'success', background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#0ea5e9' });
            fetchData();
        } else {
            Swal.fire({ title: 'Error', text: result.message, icon: 'error', background: '#0f172a', color: '#f8fafc', confirmButtonColor: '#0ea5e9' });
        }
    } catch(err) {
        showAlert('Error', 'Problema de red.', 'error');
    }
});

// SUBMIT: Update Profile
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const newApodo = document.getElementById('profile-apodo').value.trim();
    const newPin = document.getElementById('profile-pin').value.trim();
    
    const btn = document.getElementById('btn-save-profile');
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Guardando...';

    try {
        const response = await fetch(API_URL, {
            method: 'POST', redirect: 'follow',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'updateProfile', nombreUsuario: currentUser.nombre, newApodo, newPin })
        });
        const result = await response.json();
        if(result.success) {
            Toast.fire({ icon: 'success', title: 'Perfil actualizado' });
            
            currentUser.apodo = newApodo;
            localStorage.setItem('truco_user', JSON.stringify(currentUser));
            
            document.getElementById('profile-name').innerText = currentUser.apodo ? `${currentUser.nombre} "${currentUser.apodo}"` : currentUser.nombre;
            document.getElementById('profile-avatar').innerText = getInitials(currentUser.apodo || currentUser.nombre);
            document.getElementById('profile-pin').value = '';
            
            fetchData(); // To refresh leaderboard with new nicknames
        } else {
            showAlert('Error', result.message, 'error');
        }
    } catch(err) {
        showAlert('Error', 'No se pudo guardar', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Guardar Cambios';
    }
});

// INIT
document.getElementById('btn-refresh').addEventListener('click', fetchData);
document.querySelector('[data-target="view-leaderboard"]').classList.add('active', 'text-white');
checkSession();

// --- NUEVAS FUNCIONES: Rachas, Paternidades y Armador ---

function enrichPlayerData() {
    appData.players.forEach(p => {
        p.streak = 0;
        p.winsAgainst = {};
        p.lossesAgainst = {};
        p.papa = null;
        p.hijo = null;
    });

    const playerMap = {};
    appData.players.forEach(p => playerMap[p.nombre] = p);

    const sortedMatches = [...appData.matches].reverse(); // del mas nuevo al mas viejo
    
    appData.players.forEach(p => {
        let currentStreak = 0;
        let countingWins = null; 
        for (let match of sortedMatches) {
            const teamA = match.teamA ? match.teamA.split(',').map(s=>s.trim()) : [];
            const teamB = match.teamB ? match.teamB.split(',').map(s=>s.trim()) : [];
            
            let won = null;
            if (teamA.includes(p.nombre)) won = (match.winner === 'A');
            else if (teamB.includes(p.nombre)) won = (match.winner === 'B');
            
            if (won !== null) {
                if (countingWins === null) {
                    countingWins = won;
                    currentStreak = won ? 1 : -1;
                } else {
                    if (countingWins === won) {
                        currentStreak += won ? 1 : -1;
                    } else {
                        break;
                    }
                }
            }
        }
        p.streak = currentStreak;
    });

    appData.matches.forEach(match => {
        const teamA = match.teamA ? match.teamA.split(',').map(s=>s.trim()) : [];
        const teamB = match.teamB ? match.teamB.split(',').map(s=>s.trim()) : [];
        
        teamA.forEach(a => {
            const pA = playerMap[a];
            if (!pA) return;
            teamB.forEach(b => {
                const pB = playerMap[b];
                if (!pB) return;
                
                if (match.winner === 'A') {
                    pA.winsAgainst[b] = (pA.winsAgainst[b] || 0) + 1;
                    pB.lossesAgainst[a] = (pB.lossesAgainst[a] || 0) + 1;
                } else if (match.winner === 'B') {
                    pA.lossesAgainst[b] = (pA.lossesAgainst[b] || 0) + 1;
                    pB.winsAgainst[a] = (pB.winsAgainst[a] || 0) + 1;
                }
            });
        });
    });

    appData.players.forEach(p => {
        let maxWins = 0;
        for (let op in p.winsAgainst) {
            if (p.winsAgainst[op] > maxWins) { maxWins = p.winsAgainst[op]; p.hijo = op; }
        }
        let maxLosses = 0;
        for (let op in p.lossesAgainst) {
            if (p.lossesAgainst[op] > maxLosses) { maxLosses = p.lossesAgainst[op]; p.papa = op; }
        }
    });
}

window.showPlayerStats = function(playerName) {
    const p = appData.players.find(x => x.nombre === playerName);
    if (!p) return;
    
    let statsHtml = `
        <div class="text-left space-y-4 mt-4">
            <div class="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-white/5">
                <span class="text-slate-400 font-semibold text-sm">Winrate (Efectividad)</span>
                <span class="text-brand-400 font-black text-lg">` + p.winrate + `%</span>
            </div>
            <div class="flex justify-between items-center bg-slate-800/50 p-3 rounded-xl border border-white/5">
                <span class="text-slate-400 font-semibold text-sm">Racha Actual</span>
                <span class="text-white font-bold">` + (p.streak > 0 ? '+' : '') + p.streak + (p.streak >= 2 ? ' 🔥' : (p.streak <= -2 ? ' 🧊' : '')) + `</span>
            </div>
            <div class="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                <p class="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Su Papá (Más derrotas contra)</p>
                <p class="text-white font-semibold">` + (p.papa ? p.papa + ' (' + p.lossesAgainst[p.papa] + ' veces)' : 'Nadie todavía') + `</p>
            </div>
            <div class="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20">
                <p class="text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">De Hijo (Más victorias contra)</p>
                <p class="text-white font-semibold">` + (p.hijo ? p.hijo + ' (' + p.winsAgainst[p.hijo] + ' veces)' : 'Nadie todavía') + `</p>
            </div>
        </div>
    `;

    Swal.fire({
        title: p.apodo ? p.nombre + ' "' + p.apodo + '"' : p.nombre,
        html: statsHtml,
        background: '#0f172a',
        color: '#f8fafc',
        showConfirmButton: false,
        showCloseButton: true,
        customClass: { popup: 'border border-white/10 rounded-3xl' }
    });
}

let builderSelected = new Set();

window.openTeamBuilder = function() {
    builderSelected.clear();
    const sorted = [...appData.players].sort((a, b) => a.nombre.localeCompare(b.nombre));
    
    let chipsHtml = sorted.map(p => {
        return '<button type="button" id="bchip-'+p.nombre+'" onclick="toggleBuilderChip(\''+p.nombre+'\')" class="m-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border bg-slate-800 text-slate-300 border-white/10">' + p.nombre + '</button>';
    }).join('');

    Swal.fire({
        title: 'Armador Inteligente 🎲',
        html: '<p class="text-sm text-slate-400 mb-4">Seleccioná a los presentes (4 o 6):</p><div class="flex flex-wrap justify-center mb-4" id="builder-chips-container">' + chipsHtml + '</div><p id="builder-count" class="text-xs font-bold text-brand-400">0 seleccionados</p>',
        background: '#0f172a',
        color: '#f8fafc',
        showCancelButton: true,
        confirmButtonText: '¡Armar Parejo!',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#6366f1',
        preConfirm: () => {
            if (builderSelected.size !== 4 && builderSelected.size !== 6) {
                Swal.showValidationMessage('Tenés que seleccionar exactamente 4 o 6 jugadores.');
                return false;
            }
            return Array.from(builderSelected);
        },
        customClass: { popup: 'border border-indigo-500/30 rounded-3xl' }
    }).then((result) => {
        if (result.isConfirmed) {
            generateBalancedTeams(result.value);
        }
    });
}

window.toggleBuilderChip = function(name) {
    const btn = document.getElementById('bchip-' + name);
    if (builderSelected.has(name)) {
        builderSelected.delete(name);
        btn.className = "m-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border bg-slate-800 text-slate-300 border-white/10";
    } else {
        builderSelected.add(name);
        btn.className = "m-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all border bg-indigo-500 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.5)]";
    }
    document.getElementById('builder-count').innerText = builderSelected.size + ' seleccionados';
}

function generateBalancedTeams(playersArr) {
    const ps = playersArr.map(name => appData.players.find(x => x.nombre === name));
    const teamSize = ps.length / 2;
    const combinations = getCombinations(ps, teamSize);
    
    let bestDiff = Infinity;
    let bestTeamA = [];
    let bestTeamB = [];
    
    combinations.forEach(teamA => {
        const teamB = ps.filter(x => !teamA.includes(x));
        const winrateA = teamA.reduce((sum, x) => sum + x.winrate, 0);
        const winrateB = teamB.reduce((sum, x) => sum + x.winrate, 0);
        const diff = Math.abs(winrateA - winrateB);
        
        if (diff < bestDiff) {
            bestDiff = diff;
            bestTeamA = teamA;
            bestTeamB = teamB;
        }
    });
    
    selectedTeamA.clear();
    selectedTeamB.clear();
    bestTeamA.forEach(p => selectedTeamA.add(p.nombre));
    bestTeamB.forEach(p => selectedTeamB.add(p.nombre));
    renderTeamChips();
    Toast.fire({ icon: 'success', title: 'Equipos equilibrados generados!' });
}

function getCombinations(array, size) {
    const result = [];
    function backtrack(start, combo) {
        if (combo.length === size) {
            result.push([...combo]);
            return;
        }
        for (let i = start; i < array.length; i++) {
            combo.push(array[i]);
            backtrack(i + 1, combo);
            combo.pop();
        }
    }
    backtrack(0, []);
    return result;
}

// --- ANOTADOR DE PUNTOS ---
let scoreA = parseInt(localStorage.getItem('truco_scoreA')) || 0;
let scoreB = parseInt(localStorage.getItem('truco_scoreB')) || 0;

function renderCounter() {
    const valA = document.getElementById('counter-a-val');
    const valB = document.getElementById('counter-b-val');
    if (valA) valA.innerText = scoreA;
    if (valB) valB.innerText = scoreB;
}

window.addScore = function(team, points) {
    let crossedThreshold = false;
    if (team === 'A') {
        let oldScore = scoreA;
        scoreA += points;
        if (scoreA < 0) scoreA = 0;
        if (scoreA > 30) scoreA = 30;
        localStorage.setItem('truco_scoreA', scoreA);
        if (scoreA === 30 && oldScore < 30) crossedThreshold = true;
    } else {
        let oldScore = scoreB;
        scoreB += points;
        if (scoreB < 0) scoreB = 0;
        if (scoreB > 30) scoreB = 30;
        localStorage.setItem('truco_scoreB', scoreB);
        if (scoreB === 30 && oldScore < 30) crossedThreshold = true;
    }
    renderCounter();

    if (crossedThreshold) {
        let winnerName = scoreA >= 30 ? 'NOSOTROS' : 'ELLOS';
        let color = scoreA >= 30 ? '#6366f1' : '#f43f5e';
        Swal.fire({
            title: '¡Ganaron ' + winnerName + '!',
            text: 'Llegaron a 30 puntos. ¿Querés limpiar el anotador para la revancha?',
            icon: 'success',
            iconColor: color,
            background: '#0f172a',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonColor: color,
            cancelButtonColor: '#334155',
            confirmButtonText: 'Sí, borrar puntos',
            cancelButtonText: 'No, dejarlo así',
            customClass: { popup: 'border border-white/10 rounded-3xl' }
        }).then((result) => {
            if (result.isConfirmed) {
                scoreA = 0;
                scoreB = 0;
                localStorage.setItem('truco_scoreA', 0);
                localStorage.setItem('truco_scoreB', 0);
                renderCounter();
            }
        });
    }
}

window.resetCounter = async function() {
    const confirm = await Swal.fire({
        title: '¿Reiniciar anotador?',
        text: 'Los puntos volverán a 0.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#334155',
        confirmButtonText: 'Sí, reiniciar',
        cancelButtonText: 'Cancelar',
        background: '#0f172a',
        color: '#f8fafc',
        customClass: { popup: 'border border-white/10 rounded-3xl' }
    });

    if (confirm.isConfirmed) {
        scoreA = 0;
        scoreB = 0;
        localStorage.setItem('truco_scoreA', 0);
        localStorage.setItem('truco_scoreB', 0);
        renderCounter();
    }
}

// Inicializar anotador visualmente
renderCounter();
