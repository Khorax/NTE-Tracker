const defaultTasks = {
    dailies: ["Spend Character Pixels", "Daily Activity", "Collect Fluffy Clouds", "Collect Beetle Box", "Fountain Pool", "Fortune Shades (Tree)"],
    weeklies: ["3 Weekly Bosses", "Auction House", "Kill Mammot", "Spend City Stamina", "Mysterious Cargo Delivery", "Pink Paws Heist", "Beyond the Rails"]
};

let currentTab = 'dailies';
let staminaInterval;

function loadApp() {
    let data = JSON.parse(localStorage.getItem('nte_data'));
    if (!data) {
        data = { 
            lastDailyReset: 0, 
            lastWeeklyReset: 0, 
            done: [], 
            customDailies: [...defaultTasks.dailies], 
            customWeeklies: [...defaultTasks.weeklies],
            streak: 0,
            lastFullClear: '' 
        };
    }

    const now = new Date();
    // Daily Reset 5:00 Uhr
    const dailyResetTime = new Date(now);
    dailyResetTime.setHours(5, 0, 0, 0);
    if (now < dailyResetTime) dailyResetTime.setDate(dailyResetTime.getDate() - 1);

    // Reset Logik
    if (data.lastDailyReset < dailyResetTime.getTime()) {
        data.done = data.done.filter(t => !data.customDailies.includes(t));
        data.lastDailyReset = now.getTime();
    }
    
    // Streak-Reset (Falls ein Tag komplett verpasst wurde)
    const yesterday = new Date(dailyResetTime);
    yesterday.setDate(yesterday.getDate() - 1);
    if (data.lastFullClear && new Date(data.lastFullClear) < yesterday) {
        data.streak = 0; 
    }

    save(data);
    
    // Stamina Felder füllen
    document.getElementById('current-stamina').value = localStorage.getItem('nte_stamina_val') || '';
    document.getElementById('max-stamina').value = localStorage.getItem('nte_stamina_max') || 240;

    initSortable();
    startStaminaLiveUpdater();
    updateStaminaTimer();
    
    // WICHTIG: Erst jetzt den Tab schalten, damit render() korrekt läuft
    switchTab('dailies');
}

function initSortable() {
    const el = document.getElementById('task-list');
    if (!el) return;
    Sortable.create(el, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function() {
            const data = JSON.parse(localStorage.getItem('nte_data'));
            const items = Array.from(el.querySelectorAll('.task-content span'));
            const newOrder = items.map(s => s.innerText);
            if (currentTab === 'dailies') data.customDailies = newOrder;
            else data.customWeeklies = newOrder;
            save(data);
        }
    });
}

function render() {
    const data = JSON.parse(localStorage.getItem('nte_data'));
    const listContainer = document.getElementById('task-list');
    if (!listContainer) return;

    // Streak Anzeige Update
    const streakCont = document.getElementById('streak-container');
    const streakCount = document.getElementById('streak-count');
    if (currentTab === 'dailies' && data.streak && data.streak > 0) {
        streakCont.style.display = 'inline-block';
        streakCount.innerText = data.streak;
    } else {
        streakCont.style.display = 'none'; // Versteckt den Streak in Weeklies & Tools
    }

    listContainer.innerHTML = '';
    const currentTasks = currentTab === 'dailies' ? data.customDailies : data.customWeeklies;
    
    currentTasks.forEach(task => {
        const isDone = data.done.includes(task);
        const item = document.createElement('div');
        item.className = `task-item ${isDone ? 'done' : ''}`;
        item.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${isDone ? 'checked' : ''}>
                <span>${task}</span>
            </div>
            <div class="task-actions">
                <button class="delete-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
                <div class="drag-handle">
                    <span></span><span></span>
                    <span></span><span></span>
                    <span></span><span></span>
                </div>
            </div>
        `;
        item.querySelector('.task-content').onclick = () => toggleTask(task);
        item.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteTask(task); };
        listContainer.appendChild(item);
    });
    
    updateProgress(data, currentTasks);
}

function toggleTask(task) {
    const data = JSON.parse(localStorage.getItem('nte_data'));
    const isChecking = !data.done.includes(task);
    
    if (isChecking) data.done.push(task);
    else data.done = data.done.filter(t => t !== task);
    
    save(data);

    // Streak Check
    if (isChecking && currentTab === 'dailies') {
        const today = new Date().toDateString();
        const allDone = data.customDailies.every(t => data.done.includes(t));
        
        if (allDone && data.lastFullClear !== today) {
            data.streak = (data.streak || 0) + 1;
            data.lastFullClear = today;
            save(data);
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
    }
    
    render();
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase() === tab));
    document.getElementById('tools-container').style.display = tab === 'tools' ? 'block' : 'none';
    document.getElementById('tasks-area').style.display = tab === 'tools' ? 'none' : 'block';
    document.getElementById('tab-reset-btn').style.display = tab === 'tools' ? 'none' : 'inline-block';
    document.getElementById('tab-reset-btn').innerText = `${tab.charAt(0).toUpperCase() + tab.slice(1)} zurücksetzen`;
    render();
}

// Hilfsfunktionen (Stamina etc.)
function startStaminaLiveUpdater() {
    if (staminaInterval) clearInterval(staminaInterval);
    staminaInterval = setInterval(updateStaminaTimer, 10000); // Alle 10 Sek prüfen
}

function updateStaminaTimer() {
    const currInput = document.getElementById('current-stamina');
    const maxInput = document.getElementById('max-stamina');
    const res = document.getElementById('stamina-result');
    
    let curr = parseInt(currInput.value);
    let max = parseInt(maxInput.value) || 240;
    
    localStorage.setItem('nte_stamina_val', currInput.value);
    localStorage.setItem('nte_stamina_max', max);

    if (isNaN(curr)) { res.innerText = "Gib deine Stamina ein..."; return; }
    if (curr >= max) { res.innerHTML = "<b>VOLL!</b>"; return; }

    const diff = max - curr;
    const totalMinutes = diff * 6; // 1 Punkt = 6 Min
    const target = new Date(new Date().getTime() + totalMinutes * 60000);
    
    res.innerHTML = `Voll in <b>${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m</b><br><small>ca. ${target.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} Uhr</small>`;
}

function addNewTask() {
    const input = document.getElementById('new-task-input');
    if (!input.value.trim()) return;
    const data = JSON.parse(localStorage.getItem('nte_data'));
    const list = currentTab === 'dailies' ? data.customDailies : data.customWeeklies;
    list.push(input.value.trim());
    save(data);
    input.value = '';
    render();
}

function deleteTask(task) {
    const data = JSON.parse(localStorage.getItem('nte_data'));
    if (currentTab === 'dailies') data.customDailies = data.customDailies.filter(t => t !== task);
    else data.customWeeklies = data.customWeeklies.filter(t => t !== task);
    data.done = data.done.filter(t => t !== task);
    save(data);
    render();
}

function confirmTabReset() {
    if (confirm(`${currentTab} zurücksetzen?`)) {
        const data = JSON.parse(localStorage.getItem('nte_data'));
        const tasks = currentTab === 'dailies' ? data.customDailies : data.customWeeklies;
        data.done = data.done.filter(t => !tasks.includes(t));
        save(data);
        render();
    }
}

function updateProgress(data, currentTasks) {
    const done = currentTasks.filter(t => data.done.includes(t)).length;
    const perc = currentTasks.length > 0 ? (done / currentTasks.length) * 100 : 0;
    document.getElementById('progress-bar').style.width = perc + '%';
    document.getElementById('progress-text').innerText = `${done} / ${currentTasks.length} erledigt`;
}

function save(data) { localStorage.setItem('nte_data', JSON.stringify(data)); }

document.getElementById('current-stamina').addEventListener('input', updateStaminaTimer);
document.getElementById('max-stamina').addEventListener('input', updateStaminaTimer);
document.getElementById('new-task-input').addEventListener('keypress', (e) => { if(e.key === 'Enter') addNewTask(); });

loadApp();