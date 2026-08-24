(function(module) {
    const uw = module.uw;
    const log = module.log;
    const GM_getValue = module.GM_getValue;
    const GM_setValue = module.GM_setValue;
    const GM_xmlhttpRequest = module.GM_xmlhttpRequest;

    // Durées de base selon le choix utilisateur (en secondes)
    const DURATION_OPTIONS = {
        1: { label: '5 minutes',  base: 300,  booty: 600,  intervalSec: 5  * 60 },
        2: { label: '10 minutes', base: 600,  booty: 1200, intervalSec: 10 * 60 },
        3: { label: '20 minutes', base: 1200, booty: 2400, intervalSec: 20 * 60 }
    };

    let farmData = {
        enabled: false,
        settings: { mode: 'least_resources', duration: 1, webhook: '' },
        stats: { cycles: 0, totalRes: 0 },
        cycleCount: 0,
        interval: null,
        nextRunTime: 0  // timestamp ms du prochain run
    };

    // ─── UI ──────────────────────────────────────────────────────────────────────

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

            <!-- BOUTON D'ARRÊT D'URGENCE TOUJOURS VISIBLE -->
            <div style="margin-bottom: 15px;">
                <button class="btn btn-danger btn-full" id="farm-emergency-stop" style="font-weight: bold; letter-spacing: 1px;">
                    🛑 ARRÊT D'URGENCE
                </button>
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
                    <div class="section-title"><span>⏱️</span> Prochaine Récolte (Jitter Actif)</div>
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
                        <div class="option-group">
                            <span class="option-label">Intervalle de base</span>
                            <select class="option-select" id="farm-duration">
                                <option value="1">5 minutes</option>
                                <option value="2">10 minutes</option>
                                <option value="3">20 minutes</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-top:10px;padding:10px;background:rgba(0,0,0,0.2);border-radius:6px;font-size:11px;color:#BDB76B;">
                        ℹ️ Intervalle cible : <strong id="farm-interval-label">5 minutes</strong> (avec 2 tâches aléatoires et pauses humaines).
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

    // ─── INIT ─────────────────────────────────────────────────────────────────────

    module.init = function() {
        loadData();

        document.getElementById('toggle-farm').checked    = farmData.enabled;
        document.getElementById('farm-mode').value        = farmData.settings.mode;
        document.getElementById('farm-duration').value    = farmData.settings.duration;
        document.getElementById('farm-webhook').value     = farmData.settings.webhook || '';
        updateStats();
        updateIntervalLabel();

        document.getElementById('toggle-farm').onchange = (e) => toggleFarm(e.target.checked);

        // Gestionnaire du bouton d'arrêt d'urgence
        document.getElementById('farm-emergency-stop').onclick = () => emergencyStop();

        document.getElementById('farm-mode').onchange = (e) => {
            farmData.settings.mode = e.target.value;
            saveData();
            log('FARM', 'Mode: ' + (e.target.value === 'least_resources' ? 'Villes vides' : 'Cyclique'), 'info');
        };

        document.getElementById('farm-duration').onchange = (e) => {
            farmData.settings.duration = parseInt(e.target.value);
            saveData();
            updateIntervalLabel();
            const opt = DURATION_OPTIONS[farmData.settings.duration];
            log('FARM', `Intervalle de base: ${opt.label}`, 'info');
            if (farmData.enabled) {
                clearTimeout(farmData.interval);
                scheduleNext(getHumanizedDelayMs(opt.intervalSec));
            }
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

        if (farmData.enabled) toggleFarm(true);

        startTimer();
        log('FARM', 'Module humanisé (panneaux multiples) initialisé', 'info');
    };

    module.isActive  = function() { return farmData.enabled; };
    module.onActivate = function() { updateStats(); };

    // ─── CONTRÔLE ────────────────────────────────────────────────────────────────

    function toggleFarm(enabled) {
        farmData.enabled = enabled;
        const ctrl   = document.getElementById('farm-control');
        const status = document.getElementById('farm-status');

        if (enabled) {
            ctrl.classList.remove('inactive');
            status.textContent = 'Actif (Sécurisé)';
            log('FARM', 'Bot démarré avec filtres anti-détection', 'success');
            runFarmCycle();
        } else {
            ctrl.classList.add('inactive');
            status.textContent = 'En attente';
            log('FARM', 'Bot arrêté', 'info');
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
        if (status) status.textContent = 'Arrêt d\'urgence activé';

        log('FARM', '🚨 ARRÊT D\'URGENCE activé ! Toutes les actions du bot ont été coupées.', 'error');
        if (window.GrepolisUltimate) window.GrepolisUltimate.updateButtonState();
    }

    // ─── HUMANISATION & JITTER ───────────────────────────────────────────────────

    function getHumanizedDelayMs(baseSec) {
        const baseMs = baseSec * 1000;
        const jitterSec = Math.floor(Math.random() * 91) - 30; // -30s à +60s
        let finalMs = baseMs + (jitterSec * 1000);

        if (finalMs < 120000) finalMs = 120000;

        // 15% de chance d'une pause de fatigue humaine (allonge de 3 à 12 minutes)
        if (Math.random() < 0.15) {
            const breakMin = Math.floor(Math.random() * 10) + 3;
            const breakMs = breakMin * 60 * 1000;
            log('FARM', `Simulation humaine : Pause prolongée de ${breakMin} min...`, 'warning');
            finalMs += breakMs;
        }

        return finalMs;
    }

    // ─── ACTIONS ALÉATOIRES (PANNEAU DE 5 TÂCHES) ─────────────────────────────────

    async function performRandomHumanActions() {
        if (!farmData.enabled) return;
        const status = document.getElementById('farm-status');
        
        try {
            if (status) status.textContent = 'Randomisation en cours...';
            log('FARM', 'Comportement humain : Sélection et exécution de 2 tâches aléatoires...', 'info');

            // Panneau des 5 actions possibles dans Grepolis
            const possibleTasks = [
                { name: 'Rapports', type: uw.GPWindowMgr?.TYPE_REPORT },
                { name: 'Carte', type: uw.GPWindowMgr?.TYPE_MAP },
                { name: 'Alliance', type: uw.GPWindowMgr?.TYPE_ALLIANCE },
                { name: 'Forum Alliance', type: uw.GPWindowMgr?.TYPE_ALLIANCE_FORUM || uw.GPWindowMgr?.TYPE_FORUM },
                { name: 'Rang / Classement', type: uw.GPWindowMgr?.TYPE_RANKING }
            ].filter(t => t.type !== undefined);

            if (possibleTasks.length === 0) return;

            // Mélanger le tableau et prendre 2 tâches différentes
            possibleTasks.sort(() => Math.random() - 0.5);
            const selectedTasks = possibleTasks.slice(0, 2);

            for (const task of selectedTasks) {
                if (!farmData.enabled) break;

                log('FARM', `Action simulée : Ouverture de [${task.name}]`, 'info');
                
                if (uw.GPWindowMgr && typeof uw.GPWindowMgr.Create === 'function') {
                    uw.GPWindowMgr.Create(task.type);

                    // Attendre entre 2 et 4 secondes (2000 à 4000 ms)
                    const waitTime = Math.floor(Math.random() * 2001) + 2000;
                    await new Promise(r => setTimeout(r, waitTime));

                    if (!farmData.enabled) break;

                    // Fermer la fenêtre
                    if (typeof uw.GPWindowMgr.CloseAllOpenWindowsOfType === 'function') {
                        uw.GPWindowMgr.CloseAllOpenWindowsOfType(task.type);
                    }
                } else {
                    await new Promise(r => setTimeout(r, 3000));
                }

                // Petite pause entre les deux tâches
                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500));
            }

        } catch (e) {
            console.error('[FARM Random Error]', e);
        } finally {
            if (status && farmData.enabled) {
                status.textContent = 'Actif (Sécurisé)';
            }
        }
    }

    // ─── CYCLE PRINCIPAL ─────────────────────────────────────────────────────────

    async function runFarmCycle() {
        if (!farmData.enabled) return;

        // 1. Exécuter 2 tâches aléatoires du panneau (avec une chance sur deux ou systématique)
        if (Math.random() < 0.8) {
            await performRandomHumanActions();
        }

        if (!farmData.enabled) return;

        // 2. Exécuter la récolte des villages paysans
        await executeFarmClaim();

        if (!farmData.enabled) return;

        // 3. Planifier le prochain cycle avec jitter
        const opt = DURATION_OPTIONS[farmData.settings.duration];
        const nextDelay = getHumanizedDelayMs(opt.intervalSec);
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
                // Mélange aléatoire (Shuffling)
                list.sort(() => Math.random() - 0.5);
            }

            const ids = list.map(p => p.id);
            const opt = DURATION_OPTIONS[farmData.settings.duration];

            if (!farmData.enabled) return;
            log('FARM', `Récolte: ${ids.length} île(s)...`, 'info');

            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 1000) + 500));
            if (!farmData.enabled) return;

            await new Promise(r => uw.gpAjax.ajaxGet('farm_town_overviews', 'index', {}, false, () => r(), () => r()));
            await new Promise(r => setTimeout(r, 800));

            if (!farmData.enabled) return;

            await new Promise((resolve) => {
                uw.gpAjax.ajaxPost('farm_town_overviews', 'claim_loads_multiple', {
                    towns: ids,
                    time_option_base:  opt.base,
                    time_option_booty: opt.booty,
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

    function updateIntervalLabel() {
        const opt = DURATION_OPTIONS[farmData.settings.duration];
        const el  = document.getElementById('farm-interval-label');
        if (el) el.textContent = opt.label;
    }

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
