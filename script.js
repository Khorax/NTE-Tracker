const defaultTasks = {
    dailies: ["Spend Character Pixels", "Daily Activity", "Collect Fluffy Clouds", "Collect Beetle Box", "Fountain Pool", "Fortune Shades (Tree)"],
    weeklies: ["3 Weekly Bosses", "Auction House", "Kill Mammot", "Spend City Stamina", "Mysterious Cargo Delivery", "Pink Paws Heist", "Beyond the Rails"]
};

let currentTab = 'dailies';
let staminaInterval;

function loadApp() {
    let data = JSON.parse(localStorage.getItem('nte_data'));
    if (!data) {
        data = { lastDaily: '', lastWeekly: '', done: [], customDailies: [...defaultTasks.dailies], customWeeklies: [...defaultTasks.weeklies] };
    }

    // 1. Stamina-Daten laden
    const savedStamina = localStorage.getItem('nte_stamina_val');
    const maxStamina = parseInt(localStorage.getItem('nte_stamina_max')) || 240;
    
    document.getElementById('current-stamina').value = savedStamina || '';
    document.getElementById('max-stamina').value = maxStamina;

    // 2. Zeit-Logik für Reset
    const now = new Date();
    const today = now.toDateString();
    const thisWeek = getWeekNumber(now);

    if (data.lastDaily !== today) {
        data.done = data.done.filter(t => !data.customDailies.includes(t));
        data.lastDaily = today;
    }
    if (data.lastWeekly !== thisWeek) {
        data.done = data.done.filter(t => !data.customWeeklies.includes(t));
        data.lastWeekly = thisWeek;
    }

    save(data);
    
    // 3. UI & Timer starten
    updateStaminaTimer(); 
    startStaminaLiveUpdater(); 
    switchTab('dailies');
}

function startStaminaLiveUpdater() {
    if (staminaInterval) clearInterval(staminaInterval);
    
    staminaInterval = setInterval(() => {
        const currInput = document.getElementById('current-stamina');
        const maxInput = document.getElementById('max-stamina');
        const lastSaveTime = localStorage.getItem('nte_stamina_time');
        
        let curr = parseInt(currInput.value);
        let max = parseInt(maxInput.value) || 240;

        if (!isNaN(curr) && curr < max && lastSaveTime) {
            const now = new Date().getTime();
            const past = parseInt(lastSaveTime);
            const msPassed = now - past;

            if (msPassed >= 360000) {
                const pointsGained = Math.floor(msPassed / 360000);
                curr = Math.min(max, curr + pointsGained);
                currInput.value = curr;
                
                const newSaveTime = past + (pointsGained * 360000);
                localStorage.setItem('nte_stamina_time', newSaveTime.toString());
                localStorage.setItem('nte_stamina_val', curr.toString());
                
                updateStaminaTimer();
            }
        }
    }, 1000);
}

function updateStaminaTimer() {
    const currField = document.getElementById('current-stamina');
    const maxField = document.getElementById('max-stamina');
    const toolCard = document.querySelector('.tool-card');
    const res = document.getElementById('stamina-result');

    const curr = currField.value;
    const max = maxField.value || 240;

    if (document.activeElement === currField || !localStorage.getItem('nte_stamina_time')) {
        localStorage.setItem('nte_stamina_time', new Date().getTime().toString());
    }
    
    localStorage.setItem('nte_stamina_val', curr);
    localStorage.setItem('nte_stamina_max', max);

    if (curr === "" || isNaN(curr)) { 
        res.innerText = "Gib deine Stamina ein..."; 
        if(toolCard) toolCard.classList.remove('stamina-full');
        return; 
    }
    
    const current = parseInt(curr);
    const maxVal = parseInt(max);

    if (current >= maxVal) { 
        res.innerHTML = "<span style='color:var(--primary); font-weight:bold;'>VOLL!</span>"; 
        if(toolCard) toolCard.classList.add('stamina-full');
        return; 
    }

    if(toolCard) toolCard.classList.remove('stamina-full');

    const lastTime = parseInt(localStorage.getItem('nte_stamina_time'));
    const msSinceLastPoint = new Date().getTime() - lastTime;
    const totalPointsNeeded = maxVal - current;
    const totalMsToFull = (totalPointsNeeded * 360000) - (msSinceLastPoint % 360000);
    
    const target = new Date(new Date().getTime() + totalMsToFull);
    const h = Math.floor(totalMsToFull / 3600000);
    const m = Math.floor((totalMsToFull % 3600000) / 60000);

    res.innerHTML = `Voll in <b>${h}h ${m}m</b><br><small>ca. ${target.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} Uhr</small>`;
}

function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase() === tab);
    });

    const listContainer = document.getElementById('task-list');
    const toolsContainer = document.getElementById('tools-container');
    const addTaskArea = document.querySelector('.add-task-container');
    const resetBtn = document.getElementById('tab-reset-btn');
    
    // NEU: Referenzen für die Progress-Elemente
    const progressBar = document.querySelector('.progress-container');
    const progressText = document.getElementById('progress-text');

    if (tab === 'tools') {
        listContainer.style.display = 'none';
        addTaskArea.style.display = 'none';
        toolsContainer.style.display = 'block';
        resetBtn.style.display = 'none';
        
        // Progress ausblenden
        if(progressBar) progressBar.style.display = 'none';
        if(progressText) progressText.style.display = 'none';
    } else {
        listContainer.style.display = 'flex';
        addTaskArea.style.display = 'flex';
        toolsContainer.style.display = 'none';
        resetBtn.style.display = 'inline-block';
        resetBtn.innerText = `${tab.charAt(0).toUpperCase() + tab.slice(1)} zurücksetzen`;
        
        // Progress wieder einblenden
        if(progressBar) progressBar.style.display = 'block';
        if(progressText) progressText.style.display = 'block';
        
        render();
    }
}

function render() {
    const data = JSON.parse(localStorage.getItem('nte_data'));
    const listContainer = document.getElementById('task-list');
    if(!listContainer) return;
    listContainer.innerHTML = '';
    const currentTasks = currentTab === 'dailies' ? data.customDailies : data.customWeeklies;
    
    currentTasks.forEach(task => {
        const isDone = data.done.includes(task);
        const item = document.createElement('div');
        item.className = `task-item ${isDone ? 'done' : ''}`;
        item.innerHTML = `
            <div class="task-content"><input type="checkbox" ${isDone ? 'checked' : ''}><span>${task}</span></div>
            <button class="delete-btn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>`;
        item.querySelector('.task-content').onclick = () => toggleTask(task);
        item.querySelector('.delete-btn').onclick = (e) => { e.stopPropagation(); deleteTask(task); };
        listContainer.appendChild(item);
    });
    updateProgress(data, currentTasks);
}

function toggleTask(task) {
    const data = JSON.parse(localStorage.getItem('nte_data'));
    const isChecking = !data.done.includes(task);

    if (isChecking) {
        data.done.push(task);
    } else {
        data.done = data.done.filter(t => t !== task);
    }
    
    save(data);
    render();

    if (isChecking) {
        const currentTasks = currentTab === 'dailies' ? data.customDailies : data.customWeeklies;
        const allDone = currentTasks.every(t => data.done.includes(t));
        
        if (allDone && currentTasks.length > 0) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#00d4ff', '#ff00ff', '#ffffff']
            });
        }
    }
}

function addNewTask() {
    const input = document.getElementById('new-task-input');
    const name = input.value.trim();
    if (!name) return;
    const data = JSON.parse(localStorage.getItem('nte_data'));
    currentTab === 'dailies' ? data.customDailies.push(name) : data.customWeeklies.push(name);
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
    const data = JSON.parse(localStorage.getItem('nte_data'));
    const tasksInTab = currentTab === 'dailies' ? data.customDailies : data.customWeeklies;
    if (confirm(`${currentTab} zurücksetzen?`)) {
        data.done = data.done.filter(t => !tasksInTab.includes(t));
        save(data);
        render();
    }
}

function updateProgress(data, currentTasks) {
    const done = currentTasks.filter(t => data.done.includes(t)).length;
    const perc = currentTasks.length > 0 ? (done / currentTasks.length) * 100 : 0;
    const bar = document.getElementById('progress-bar');
    const text = document.getElementById('progress-text');
    if(bar) bar.style.width = perc + '%';
    if(text) text.innerText = `${done} / ${currentTasks.length} erledigt`;
}

function save(data) { localStorage.setItem('nte_data', JSON.stringify(data)); }

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    return Math.ceil((((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}

document.getElementById('current-stamina').addEventListener('input', updateStaminaTimer);
document.getElementById('max-stamina').addEventListener('input', updateStaminaTimer);
document.getElementById('new-task-input').addEventListener('keypress', (e) => { if(e.key === 'Enter') addNewTask(); });

loadApp();