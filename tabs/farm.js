(function(module) {
    const uw = module.uw;
    const log = module.log;
    const GM_getValue = module.GM_getValue;
    const GM_setValue = module.GM_setValue;
    const GM_xmlhttpRequest = module.GM_xmlhttpRequest;
    const GM_addStyle = module.GM_addStyle;

    // Options de durées standard acceptées par le serveur Grepolis pour les requêtes de farm
    const DURATION_OPTIONS = {
        1: { label: '5 minutes',  base: 300,  booty: 600 },
        2: { label: '20 minutes', base: 1200, booty: 2400 }
    };

    let farmData = {
        enabled: false,
        settings: { mode: 'least_resources', webhook: '' },
        stats: { cycles: 0, totalRes: 0 },
        cycleCount: 0,
        interval: null,
        nextRunTime: 0
    };

    // ─── STYLES DU BOUTON STOP ET HUD ────────────────────────────────────────────

    if (GM_addStyle) {
        GM_addStyle(`
            .gu-stop-routine-overlay {
                position: fixed;
                top: 15px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999999;
                display: none;
                font-family: 'Cinzel', 'Philosopher', Georgia, serif;
                pointer-events: none;
            }
            .gu-stop-routine-overlay.active {
                display: block;
                pointer-events: auto;
            }
            .gu-stop-routine-btn {
                background: linear-gradient(145deg, #3a2b1c 0%, #1a1408 100%);
                border: 2px solid #D4AF37;
                border-radius: 6px;
                color: #ffcccc;
                padding: 8px 18px;
                font-family: 'Cinzel', serif;
                font-size: 12px;
                font-weight: bold;
                text-shadow: 0 1px 2px rgba(0,0,0,0.8);
                box-shadow: 0 4px 20px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,215,0,0.3);
                cursor: pointer;
                transition: all 0.2s ease;
                letter-spacing: 0.5px;
            }
            .gu-stop-routine-btn:hover {
                transform: scale(1.05);
                border-color: #FFD700;
                color: #ffffff;
                box-shadow: 0 6px 25px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,215,0,0.5);
            }
        `);
    }

    // ─── UI DE L'ONGLET ──────────────────────────────────────────────────────────

    module.render = function(container) {
        container.innerHTML = `
            <div class="main-control inactive" id="farm-control">
                <div class="control-info">
                    <div class="control-label">Auto Farm (Anti-Détection Avancé)</div>
                    <div class="control-status" id="farm-status">En attente</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-farm">
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>📊</span> Statistiques</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="stats-grid">
                        <div class="stat-box">
                            <span class="stat-value" id="farm-stat-cycles">0</span>
                            <span class="stat-label">Passages</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="farm-stat-res">0</span>
                            <span class="stat-label">Ressources</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>⏱️</span> Prochaine Récolte (10 à 17 min aléatoires)</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="timer-container">
                        <div class="timer-label">Temps restant</div>
                        <div class="timer-value" id="farm-timer">--:--</div>
                    </div>
                    <div style="margin-top:8px;font-size:11px;color:#8B8B83;text-align:center;" id="farm-next-label"></div>
                </div>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>⚙️</span> Options</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="options-grid">
                        <div class="option-group">
                            <span class="option-label">Mode de tri</span>
                            <select class="option-select" id="farm-mode">
                                <option value="least_resources">Villes vides</option>
                                <option value="round_robin">Cyclique</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-top:10px;padding:10px;background:rgba(0,0,0,0.2);border-radius:6px;font-size:11px;color:#BDB76B;">
                        ℹ️ Automatisation : 2 onglets ouverts/fermés proprement, puis récolte standard, puis délai aléatoire entre 10 et 17 minutes.
                    </div>
                </div>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>🔔</span> Webhook Discord</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <input type="text" id="farm-webhook"
                        style="width:100%;background:#1a1408;border:1px solid #8B6914;color:#F5DEB3;padding:8px;border-radius:4px;font-size:11px;box-sizing:border-box;"
                        placeholder="https://discord.com/api/webhooks/...">
                </div>
            </div>
        `;
    };

    // ─── GESTION DU BOUTON STOP SUR L'ÉCRAN ──────────────────────────────────────

    function createStopButton() {
        if (document.getElementById('gu-stop-routine')) return;

        const overlay = document.createElement('div');
        overlay.id = 'gu-stop-routine';
        overlay.className = 'gu-stop-routine-overlay';
        overlay.innerHTML = `
            <button class="gu-stop-routine-btn" id="gu-stop-action-btn">Stop current routine</button>
        `;
        document.body.appendChild(overlay);

        document.getElementById('gu-stop-action-btn').onclick = () => emergencyStop();
    }

    function showStopButton(show) {
        let overlay = document.getElementById('gu-stop-routine');
        if (!overlay && show) {
            createStopButton();
            overlay = document.getElementById('gu-stop-routine');
        }
        if (overlay) {
            if (show) overlay.classList.add('active');
            else overlay.classList.remove('active');
        }
    }

    // ─── INIT ─────────────────────────────────────────────────────────────────────

    module.init = function() {
        loadData();
        createStopButton();

        document.getElementById('toggle-farm').checked    = farmData.enabled;
        document.getElementById('farm-mode').value        = farmData.settings.mode;
        document.getElementById('farm-webhook').value     = farmData.settings.webhook || '';
        updateStats();

        document.getElementById('toggle-farm').onchange = (e) => toggleFarm(e.target.checked);

        document.getElementById('farm-mode').onchange = (e) => {
            farmData.settings.mode = e.target.value;
            saveData();
            log('FARM', 'Mode: ' + (e.target.value === 'least_resources' ? 'Villes vides' : 'Cyclique'), 'info');
        };

        document.getElementById('farm-webhook').onchange = (e) => {
            farmData.settings.webhook = e.target.value.trim();
            saveData();
        };

        document.querySelectorAll('#tab-farm .section-header').forEach(h => {
            h.onclick = () => {
                h.classList.toggle('collapsed');
                const c = h.nextElementSibling;
                if (c) c.style.display = h.classList.contains('collapsed') ? 'none' : 'block';
            };
        });

        if (farmData.enabled) {
            toggleFarm(true);
        }

        startTimer();
        log('FARM', 'Module humanisé (timer 10-17 min aléatoire) initialisé', 'info');
    };

    module.isActive  = function() { return farmData.enabled; };
    module.onActivate = function() { updateStats(); };

    // ─── CONTRÔLE ────────────────────────────────────────────────────────────────

    function toggleFarm(enabled) {
        farmData.enabled = enabled;
        const ctrl   = document.getElementById('farm-control');
        const status = document.getElementById('farm-status');
        const toggle = document.getElementById('toggle-farm');

        if (toggle) toggle.checked = enabled;

        if (enabled) {
            if (ctrl) ctrl.classList.remove('inactive');
            if (status) status.textContent = 'Actif (Sécurisé)';
            log('FARM', 'Auto Farm démarré', 'success');
            runFarmCycle();
        } else {
            if (ctrl) ctrl.classList.add('inactive');
            if (status) status.textContent = 'En attente';
            showStopButton(false);
            log('FARM', 'Auto Farm arrêté', 'info');
            clearTimeout(farmData.interval);
            farmData.nextRunTime = 0;
        }

        saveData();
        if (window.GrepolisUltimate) window.GrepolisUltimate.updateButtonState();
    }

    function emergencyStop() {
        farmData.enabled = false;
        clearTimeout(farmData.interval);
        farmData.nextRunTime = 0;
        saveData();

        const toggle = document.getElementById('toggle-farm');
        if (toggle) toggle.checked = false;

        const ctrl = document.getElementById('farm-control');
        if (ctrl) ctrl.classList.add('inactive');

        const status = document.getElementById('farm-status');
        if (status) status.textContent = 'Arrêt d\'urgence';

        showStopButton(false);

        log('FARM', '🚨 STOP CURRENT ROUTINE : Routine stoppée par l\'utilisateur.', 'error');
        if (window.GrepolisUltimate) window.GrepolisUltimate.updateButtonState();
    }

    // ─── TIMER ALÉATOIRE STRICT ENTRE 10 ET 17 MINUTES ──────────────────────────

    function getRandomIntervalMs() {
        const minMins = 10;
        const maxMins = 17;
        const randomMins = Math.floor(Math.random() * (maxMins - minMins + 1)) + minMins;
        return randomMins * 60 * 1000;
    }

    // ─── TÂCHES ALÉATOIRES (OUVERTURE ET FERMETURE PROPRE) ───────────────────────

    async function performRandomHumanActions() {
        if (!farmData.enabled) return;
        
        try {
            log('FARM', 'Routine humaine : Ouverture et fermeture progressive de 2 onglets...', 'info');

            const possibleTasks = [
                { name: 'Rapports', type: uw.GPWindowMgr?.TYPE_REPORT },
                { name: 'Carte', type: uw.GPWindowMgr?.TYPE_MAP },
                { name: 'Alliance', type: uw.GPWindowMgr?.TYPE_ALLIANCE },
                { name: 'Forum Alliance', type: uw.GPWindowMgr?.TYPE_ALLIANCE_FORUM || uw.GPWindowMgr?.TYPE_FORUM },
                { name: 'Rang / Classement', type: uw.GPWindowMgr?.TYPE_RANKING }
            ].filter(t => t.type !== undefined);

            if (possibleTasks.length === 0) return;

            possibleTasks.sort(() => Math.random() - 0.5);
            const selectedTasks = possibleTasks.slice(0, 2);

            for (const task of selectedTasks) {
                if (!farmData.enabled) break;

                log('FARM', `Ouverture de l'onglet : [${task.name}]`, 'info');
                
                if (uw.GPWindowMgr && typeof uw.GPWindowMgr.Create === 'function') {
                    const winInstance = uw.GPWindowMgr.Create(task.type);

                    // Temps d'attente "humain" entre 2 et 4 secondes
                    const waitTime = Math.floor(Math.random() * 2001) + 2000;
                    await new Promise(r => setTimeout(r, waitTime));

                    if (!farmData.enabled) break;

                    log('FARM', `Fermeture de l'onglet : [${task.name}]`, 'info');
                    if (winInstance && typeof winInstance.close === 'function') {
                        winInstance.close();
                    } else if (typeof uw.GPWindowMgr.CloseAllOpenWindowsOfType === 'function') {
                        uw.GPWindowMgr.CloseAllOpenWindowsOfType(task.type);
                    }
                } else {
                    await new Promise(r => setTimeout(r, 3000));
                }

                // Petite pause naturelle entre les deux actions
                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 800));
            }

        } catch (e) {
            console.error('[FARM Random Error]', e);
        }
    }

    // ─── CYCLE PRINCIPAL ─────────────────────────────────────────────────────────

    async function runFarmCycle() {
        if (!farmData.enabled) return;

        // 1. DÉBUT DU CYCLE ACTIF : Affichage du bouton "Stop current routine"
        showStopButton(true);

        // Exécuter les 2 tâches aléatoires (ouverture -> attente 2-4s -> fermeture systématique)
        await performRandomHumanActions();

        if (!farmData.enabled) {
            showStopButton(false);
            return;
        }

        // Exécuter la récolte des villages paysans
        await executeFarmClaim();

        if (!farmData.enabled) {
            showStopButton(false);
            return;
        }

        // 2. FIN DE LA ROUTINE : Masquage du bouton "Stop current routine"
        showStopButton(false);

        // 3. Planifier le délai aléatoire entre 10 et 17 minutes pour le prochain passage
        const nextDelay = getRandomIntervalMs();
        log('FARM', `Prochain cycle planifié dans ~${Math.round(nextDelay / 60000)} minutes.`, 'info');
        scheduleNext(nextDelay);
    }

    function scheduleNext(delayMs) {
        clearTimeout(farmData.interval);
        farmData.nextRunTime = Date.now() + delayMs;
        farmData.interval = setTimeout(() => runFarmCycle(), delayMs);
        saveData();
    }

    // ─── RÉCOLTE ────────────────────────────────────────────────────────────────

    async function executeFarmClaim() {
        try {
            let list = getPolisList();

            if (list.length === 0) {
                log('FARM', 'Aucune ville disponible', 'warning');
                return;
            }

            if (farmData.settings.mode === 'round_robin') {
                const offset = farmData.cycleCount % list.length;
                list = list.slice(offset).concat(list.slice(0, offset));
                farmData.cycleCount++;
            } else {
                list.sort(() => Math.random() - 0.5);
            }

            const ids = list.map(p => p.id);

            if (!farmData.enabled) return;
            log('FARM', `Récolte: ${ids.length} île(s)...`, 'info');

            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500));
            if (!farmData.enabled) return;

            await new Promise(r => uw.gpAjax.ajaxGet('farm_town_overviews', 'index', {}, false, () => r(), () => r()));
            await new Promise(r => setTimeout(r, 800));

            if (!farmData.enabled) return;

            // Utilisation d'une option de base standard valide (ex: option 1 = 5 min / booty 10 min)
            const activeOption = DURATION_OPTIONS[1];

            await new Promise((resolve) => {
                uw.gpAjax.ajaxPost('farm_town_overviews', 'claim_loads_multiple', {
                    towns: ids,
                    time_option_base:  activeOption.base,
                    time_option_booty: activeOption.booty,
                    claim_factor: 'normal'
                }, false, (resp) => {
                    let realGain = 0;
                    try {
                        const rj = resp?.json || resp || {};
                        if (rj.resources) {
                            realGain = (rj.resources.wood || 0) + (rj.resources.stone || 0) + (rj.resources.iron || 0);
                        } else if (rj.loot) {
                            realGain = Object.values(rj.loot).reduce((s, v) => s + (v || 0), 0);
                        }
                    } catch(_) {}

                    const displayGain = realGain > 0 ? realGain : ids.length * 115;

                    farmData.stats.cycles++;
                    farmData.stats.totalRes += displayGain;
                    updateStats();
                    saveData();

                    if (realGain === 0) {
                        log('FARM', `⚠️ ${ids.length} île(s) — villages vides (0 res)`, 'warning');
                    } else {
                        log('FARM', `✅ ${ids.length} île(s) récoltée(s), +${displayGain} res`, 'success');
                        sendWebhook('Récolte Auto Farm (Sécurisé)',
                            `${ids.length} îles récoltées\nGain: +${displayGain.toLocaleString()} ressources`);
                    }

                    resolve();
                }, () => resolve());
            });

        } catch(e) {
            log('FARM', 'Erreur: ' + e.message, 'error');
        }
    }

    // ─── LISTE DES VILLES ────────────────────────────────────────────────────────

    function getPolisList() {
        const towns = uw.MM.getOnlyCollectionByName('Town').models;
        const islandMap = new Map();

        for (const t of towns) {
            if (t.attributes.on_small_island) continue;
            const islandId = t.attributes.island_id;
            const res      = t.attributes.resources || {};
            const totalRes = (res.wood || 0) + (res.stone || 0) + (res.iron || 0);
            const townData = { id: t.attributes.id, name: t.attributes.name, total: totalRes, islandId };

            if (islandMap.has(islandId)) {
                if (farmData.settings.mode === 'least_resources' && townData.total < islandMap.get(islandId).total) {
                    islandMap.set(islandId, townData);
                }
            } else {
                islandMap.set(islandId, townData);
            }
        }

        return Array.from(islandMap.values());
    }

    // ─── TIMER UI ────────────────────────────────────────────────────────────────

    function startTimer() {
        setInterval(() => {
            const el    = document.getElementById('farm-timer');
            const label = document.getElementById('farm-next-label');
            if (!el) return;

            if (!farmData.enabled || farmData.nextRunTime === 0) {
                el.textContent = '--:--';
                el.classList.remove('ready');
                if (label) label.textContent = '';
                return;
            }

            const diff = farmData.nextRunTime - Date.now();

            if (diff <= 0) {
                el.textContent = 'PRÊT';
                el.classList.add('ready');
                if (label) label.textContent = '';
            } else {
                el.classList.remove('ready');
                const h    = Math.floor(diff / 3600000);
                const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
                const secs = Math.floor((diff % 60000)    / 1000).toString().padStart(2, '0');
                el.textContent = h > 0 ? `${h}:${mins}:${secs}` : `${mins}:${secs}`;

                if (label) label.textContent = '';
            }
        }, 1000);
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────────

    function updateStats() {
        const c = document.getElementById('farm-stat-cycles');
        const r = document.getElementById('farm-stat-res');
        if (c) c.textContent = farmData.stats.cycles;
        if (r) r.textContent = farmData.stats.totalRes.toLocaleString();
    }

    // ─── WEBHOOK ─────────────────────────────────────────────────────────────────

    function sendWebhook(title, desc) {
        if (!farmData.settings.webhook) return;
        GM_xmlhttpRequest({
            method: 'POST',
            url: farmData.settings.webhook,
            data: JSON.stringify({
                embeds: [{
                    title,
                    description: desc,
                    color: 3066993,
                    footer: { text: 'Grepolis Ultimate — Auto Farm (Humain)' },
                    timestamp: new Date().toISOString()
                }]
            }),
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // ─── PERSISTANCE ─────────────────────────────────────────────────────────────

    function saveData() {
        GM_setValue('gu_farm_data', JSON.stringify({
            enabled:    farmData.enabled,
            settings:   farmData.settings,
            stats:      farmData.stats,
            cycleCount: farmData.cycleCount,
            nextRunTime: farmData.nextRunTime
        }));
    }

    function loadData() {
        const saved = GM_getValue('gu_farm_data');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                farmData = { ...farmData, ...d, interval: null };
            } catch(e) {}
        }
    }

})(module);
