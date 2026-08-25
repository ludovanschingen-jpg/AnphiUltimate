(function(module) {
    const uw = module.uw;
    const log = module.log;
    const GM_getValue = module.GM_getValue;
    const GM_setValue = module.GM_setValue;

    // --- DONNÉES ET CONFIGURATION ---
    const NAMES = { 
        main: 'Sénat', lumber: 'Scierie', stoner: 'Carrière', ironer: 'Mine d\'argent', 
        storage: 'Entrepôt', farm: 'Ferme', barracks: 'Caserne', docks: 'Port', 
        wall: 'Remparts', academy: 'Académie', temple: 'Temple', market: 'Marché', hide: 'Grotte',
        theater: 'Théâtre', thermal: 'Thermes', library: 'Bibliothèque', lighthouse: 'Phare', 
        tower: 'Tour', statue: 'Statue divine', oracle: 'Oracle', trade_office: 'Comptoir' 
    };

    // Ordre exact du screenshot classique
    const CLASSIC_BUILDINGS = ['main', 'lumber', 'farm', 'stoner', 'ironer', 'storage', 'barracks', 'docks', 'academy', 'temple', 'market', 'wall', 'hide'];
    const LEFT_SPECIALS = ['theater', 'thermal', 'library', 'lighthouse'];
    const RIGHT_SPECIALS = ['tower', 'statue', 'oracle', 'trade_office'];
    
    // Coordonnées natives InnoGames 100% exactes (sans l'obélisque, vrai Oracle)
    const SPRITES = { 
        academy: [0, 0], barracks: [50, 0], docks: [100, 0], farm: [150, 0], 
        hide: [200, 0], ironer: [250, 0], wall: [300, 0], theater: [350, 0], 
        lumber: [400, 0], main: [450, 0], 
        market: [0, 50], oracle: [100, 50], statue: [150, 50], 
        stoner: [200, 50], storage: [250, 50], temple: [300, 50], thermal: [350, 50], 
        library: [400, 50], lighthouse: [450, 50], 
        trade_office: [0, 100], tower: [50, 100] 
    };

    const FR_TO_ID = { 
        'senat': 'main', 'sénat': 'main', 'scierie': 'lumber', 'ferme': 'farm', 
        'carriere': 'stoner', 'carrière': 'stoner', 'entrepot': 'storage', 'entrepôt': 'storage',
        'mine': 'ironer', "mine d'argent": 'ironer', 'caserne': 'barracks', 'temple': 'temple', 
        'marche': 'market', 'marché': 'market', 'port': 'docks', 'academie': 'academy', 'académie': 'academy',
        'remparts': 'wall', 'muraille': 'wall', 'grotte': 'hide', 'thermes': 'thermal', 
        'bibliotheque': 'library', 'bibliothèque': 'library', 'phare': 'lighthouse', 'tour': 'tower', 
        'statue': 'statue', 'oracle': 'oracle', 'comptoir': 'trade_office', 
        'theatre': 'theater', 'théâtre': 'theater'
    };

    let buildData = {
        enabled: false,
        gratisEnabled: false,
        settings: { interval: 2, webhook: '' },
        stats: { built: 0, gratisClaimed: 0 },
        queues: {},
        designerTemplate: {},
        nextCheckTime: 0
    };

    let senateWatcherInterval = null;
    let gratisInterval = null;

    // --- INJECTION CSS PROPRE ---
    function injectStyles() {
        if (document.getElementById('gu-build-styles')) return;
        const style = document.createElement('style');
        style.id = 'gu-build-styles';
        style.textContent = `
            .gu-designer-wrapper { background: #fdf1d4; border: 1px solid #8e6633; padding: 15px; border-radius: 2px; box-shadow: inset 0 0 10px rgba(0,0,0,0.1); margin-top: 10px; }
            .gu-bld-row { display: flex; justify-content: center; gap: 4px; }
            .gu-bld-divider { width: 90%; height: 1px; background: rgba(0,0,0,0.3); margin: 15px auto; }
            .gu-bld-specials { display: flex; justify-content: center; align-items: center; gap: 30px; }
            .gu-bld-box { position: relative; width: 50px; height: 50px; border: 1px solid #111; box-shadow: 1px 1px 3px rgba(0,0,0,0.5); cursor: pointer; background-image: url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png); background-repeat: no-repeat; background-size: 500px 150px; }
            .gu-bld-box:hover { border-color: #D4AF37 !important; }
            .gu-bld-inp { position: absolute; bottom: 2px; right: 2px; width: 24px; height: 14px; background: rgba(0,0,0,0.8); border: 1px solid #777; color: #fff; font-size: 10px; font-weight: bold; text-align: center; padding: 0; outline: none; border-radius: 1px; }
            .gu-bld-inp::-webkit-outer-spin-button, .gu-bld-inp::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .gu-bld-inp[type=number] { -moz-appearance: textfield; }
        `;
        document.head.appendChild(style);
    }

    // --- RENDER DU MODULE ---
    module.render = function(container) {
        container.innerHTML = `
            <div class="main-control inactive" id="build-control">
                <div class="control-info">
                    <div class="control-label">Auto Build & Designer</div>
                    <div class="control-status" id="build-status">En attente</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-build">
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>⚡</span> Auto Gratis</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="main-control inactive" id="gratis-control" style="margin-bottom: 15px;">
                        <div class="control-info">
                            <div class="control-label">Construction Instantanée Gratuite</div>
                            <div class="control-status" id="gratis-status">Inactif</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-gratis">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>🎨</span> Gestionnaire de Ville (Designer)</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div id="designer-container">
                        <!-- Généré dynamiquement -->
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
                        <button class="btn" id="btn-import-town" style="flex: 1; padding: 8px; font-size: 11px; background: linear-gradient(180deg,#9C27B0,#7B1FA2); color:white; border:none;">📥 Importer Niveaux Ville</button>
                        <button class="btn btn-success" id="btn-save-designer" style="flex: 1; padding: 8px; font-size: 11px;">💾 Sauvegarder Template</button>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
                        <button class="btn" id="btn-apply-designer" style="flex: 1; padding: 8px; font-size: 11px; background: linear-gradient(180deg,#2196F3,#1976D2); color:white; border:none;">▶ Appliquer à la Ville</button>
                        <button class="btn" id="btn-reset-designer" style="flex: 1; padding: 8px; font-size: 11px; background: linear-gradient(180deg,#FF9800,#F57C00); color:white; border:none;">🔄 Réinitialiser Niveaux</button>
                    </div>
                </div>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>📊</span> Statistiques & Options</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="stats-grid" style="margin-bottom: 10px;">
                        <div class="stat-box"><span class="stat-value" id="build-stat-built">0</span><span class="stat-label">Construits</span></div>
                        <div class="stat-box"><span class="stat-value" id="build-stat-queued">0</span><span class="stat-label">En attente</span></div>
                        <div class="stat-box"><span class="stat-value" id="build-stat-gratis">0</span><span class="stat-label">Gratis</span></div>
                    </div>
                    <div class="option-group">
                        <span class="option-label">Intervalle de check</span>
                        <select class="option-select" id="build-interval">
                            <option value="2">2 min</option>
                            <option value="5">5 min</option>
                            <option value="10">10 min</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>📋</span> File d'attente actuelle</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div id="build-queue-display" style="min-height: 60px; display: flex; flex-wrap: wrap; gap: 6px;"></div>
                </div>
            </div>
        `;
    };

    module.init = function() {
        injectStyles();
        loadData();
        initializeDesignerTemplate();

        document.getElementById('toggle-build').checked = buildData.enabled;
        document.getElementById('toggle-gratis').checked = buildData.gratisEnabled;
        document.getElementById('build-interval').value = buildData.settings.interval;
        
        renderDesignerGrid();
        updateStats();
        updateQueueDisplay();
        
        document.getElementById('toggle-build').onchange = (e) => toggleBuild(e.target.checked);
        document.getElementById('toggle-gratis').onchange = (e) => toggleGratis(e.target.checked);
        document.getElementById('build-interval').onchange = (e) => {
            buildData.settings.interval = parseInt(e.target.value);
            saveData();
            if (buildData.enabled) buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
        };

        document.getElementById('btn-import-town').onclick = () => importTownLevelsToDesigner();
        document.getElementById('btn-save-designer').onclick = () => saveDesignerTemplate();
        document.getElementById('btn-apply-designer').onclick = () => generateQueueFromDesigner();
        document.getElementById('btn-reset-designer').onclick = () => resetDesignerGrid();

        document.querySelectorAll('#tab-build .section-header').forEach(h => {
            h.onclick = () => {
                h.classList.toggle('collapsed');
                const c = h.nextElementSibling;
                if (c) c.style.display = h.classList.contains('collapsed') ? 'none' : 'block';
            };
        });

        if (buildData.enabled) toggleBuild(true);
        if (buildData.gratisEnabled) toggleGratis(true);

        startSenateWatcher();
        startTimer();
        
        window.GU_Build = {
            add: (bid, lvl) => addToQueue(bid, lvl),
            remove: (idx) => removeFromQueue(idx),
            updateDesigner: (bid, val) => updateDesignerLevel(bid, val)
        };

        log('BUILD', 'Module initialisé avec l\'interface classique propre', 'info');
    };

    module.isActive = function() { return buildData.enabled || buildData.gratisEnabled; };
    module.onActivate = function() { renderDesignerGrid(); updateStats(); updateQueueDisplay(); };

    // --- LOGIQUE DESIGNER ---
    function initializeDesignerTemplate() {
        if (!buildData.designerTemplate || Object.keys(buildData.designerTemplate).length === 0) {
            buildData.designerTemplate = {};
            importTownLevelsToDesigner(true);
        }
    }

    function importTownLevelsToDesigner(silent = false) {
        try {
            const town = uw.ITowns.getCurrentTown();
            if (!town) return;
            const buildingList = town.buildingList ? town.buildingList() : {};
            
            for (const bid of Object.keys(NAMES)) {
                const currentObj = buildingList[bid];
                buildData.designerTemplate[bid] = currentObj ? (currentObj.level || currentObj.akt_level || 0) : 0;
            }
            saveData();
            renderDesignerGrid();
            if (!silent) log('BUILD', 'Niveaux actuels importés dans le designer !', 'success');
        } catch (e) {}
    }

    function renderDesignerGrid() {
        const container = document.getElementById('designer-container');
        if (!container) return;

        let totalLevels = 0;

        const createBox = (bid) => {
            const sp = SPRITES[bid] || [0, 0];
            const level = buildData.designerTemplate[bid] || 0;
            totalLevels += level;
            
            const isSpecial = LEFT_SPECIALS.includes(bid) || RIGHT_SPECIALS.includes(bid);
            const borderCol = isSpecial && level > 0 ? '#4CAF50' : '#111';

            return `
                <div class="gu-bld-box" style="background-position: -${sp[0]}px -${sp[1]}px; border-color: ${borderCol};" title="${NAMES[bid]}">
                    <input type="number" class="gu-bld-inp" min="0" max="50" value="${level}" onchange="GU_Build.updateDesigner('${bid}', this.value)" />
                </div>
            `;
        };

        container.innerHTML = `
            <div class="gu-designer-wrapper">
                <div class="gu-bld-row">
                    ${CLASSIC_BUILDINGS.map(createBox).join('')}
                </div>
                <div class="gu-bld-divider"></div>
                <div class="gu-bld-specials">
                    <div class="gu-bld-row" style="margin:0;">
                        ${LEFT_SPECIALS.map(createBox).join('')}
                    </div>
                    <div style="font-size: 11px; font-weight: bold; color: #0044ff; font-family: Arial, sans-serif;">
                        Niveaux : ${totalLevels}
                    </div>
                    <div class="gu-bld-row" style="margin:0;">
                        ${RIGHT_SPECIALS.map(createBox).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function updateDesignerLevel(bid, val) {
        let num = parseInt(val) || 0;
        if (num < 0) num = 0; if (num > 50) num = 50;
        
        if (LEFT_SPECIALS.includes(bid) && num > 0) LEFT_SPECIALS.forEach(s => { if (s !== bid) buildData.designerTemplate[s] = 0; });
        if (RIGHT_SPECIALS.includes(bid) && num > 0) RIGHT_SPECIALS.forEach(s => { if (s !== bid) buildData.designerTemplate[s] = 0; });
        
        applyPrerequisites(bid, num);
        saveData();
        renderDesignerGrid();
    }

    function applyPrerequisites(bid, targetLevel) {
        buildData.designerTemplate[bid] = targetLevel;
        if (targetLevel <= 0) return;

        if (['thermal', 'library', 'lighthouse', 'tower'].includes(bid)) {
            if ((buildData.designerTemplate['main'] || 0) < 24) buildData.designerTemplate['main'] = 24;
            if ((buildData.designerTemplate['storage'] || 0) < 22) buildData.designerTemplate['storage'] = 22;
        }
        if (bid === 'thermal' && (buildData.designerTemplate['farm'] || 0) < 35) buildData.designerTemplate['farm'] = 35;
        if (bid === 'library' && (buildData.designerTemplate['academy'] || 0) < 30) buildData.designerTemplate['academy'] = 30;
        if (bid === 'lighthouse' && (buildData.designerTemplate['docks'] || 0) < 20) buildData.designerTemplate['docks'] = 20;
        if (bid === 'tower' && (buildData.designerTemplate['wall'] || 0) < 15) buildData.designerTemplate['wall'] = 15;
    }

    function saveDesignerTemplate() { saveData(); log('BUILD', 'Template sauvegardé.', 'success'); }
    function resetDesignerGrid() {
        for (let key in buildData.designerTemplate) buildData.designerTemplate[key] = 0;
        saveData(); renderDesignerGrid(); log('BUILD', 'Niveaux réinitialisés.', 'info');
    }

    // --- LOGIQUE BOT ---
    function generateQueueFromDesigner() {
        const tid = uw.Game.townId;
        const town = uw.ITowns.getTown(tid);
        if (!town) return;

        const newQueue = [];
        const buildingList = town.buildingList ? town.buildingList() : {};

        for (const [bid, targetLvl] of Object.entries(buildData.designerTemplate)) {
            if (targetLvl <= 0) continue;
            const currentLvl = buildingList[bid] ? (buildingList[bid].level || buildingList[bid].akt_level || 0) : 0;
            for (let l = currentLvl + 1; l <= targetLvl; l++) newQueue.push({ buildingId: bid, level: l });
        }

        buildData.queues[tid] = newQueue;
        saveData(); refreshSenateQueue(); updateStats(); updateQueueDisplay();
        log('BUILD', `Template appliqué ! ${newQueue.length} constructions planifiées.`, 'success');
    }

    function toggleBuild(enabled) {
        buildData.enabled = enabled;
        document.getElementById('build-status').textContent = enabled ? 'Actif' : 'En attente';
        if (enabled) {
            log('BUILD', 'Bot démarré', 'success');
            buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
            processAllQueues();
        } else {
            log('BUILD', 'Bot arrêté', 'info');
        }
        saveData();
    }

    function toggleGratis(enabled) {
        buildData.gratisEnabled = enabled;
        const status = document.getElementById('gratis-status');
        if (enabled) {
            status.textContent = 'Actif'; status.style.color = '#81C784';
            gratisInterval = setInterval(checkGratis, 2500);
            log('BUILD', 'Auto Gratis activé', 'success');
        } else {
            status.textContent = 'Inactif'; status.style.color = '#E57373';
            if (gratisInterval) clearInterval(gratisInterval);
            log('BUILD', 'Auto Gratis désactivé', 'info');
        }
        saveData();
    }

    function checkGratis() {
        try {
            const gratisButton = uw.$('.type_building_queue.type_free').not('.disabled');
            if (gratisButton.length > 0) {
                gratisButton.click();
                const town = uw.ITowns.getCurrentTown();
                for (let model of town.buildingOrders().models) {
                    if (model.attributes && model.attributes.building_time < 300) {
                        callGratis(town.id, model.id); return;
                    }
                }
            }
        } catch (e) {}
    }

    function callGratis(townId, orderId) {
        uw.gpAjax.ajaxPost('frontend_bridge', 'execute', { model_url: `BuildingOrder/${orderId}`, action_name: 'buyInstant', arguments: { order_id: orderId }, town_id: townId }, null, {
            success: () => { buildData.stats.gratisClaimed++; saveData(); updateStats(); }
        });
    }

    async function processAllQueues() {
        for (const tid in buildData.queues) await processTownQueue(tid);
    }

    async function processTownQueue(tid) {
        const q = buildData.queues[tid] || [];
        if (q.length === 0) return;
        const town = uw.ITowns.getTown(tid);
        if (!town || town.buildingOrders().length >= (uw.GameDataPremium.isAdvisorActivated('curator') ? 7 : 2)) return;

        const item = q[0];
        uw.gpAjax.ajaxPost('frontend_bridge', 'execute', { model_url: 'BuildingOrder', action_name: 'buildUp', arguments: { building_id: item.buildingId }, town_id: tid }, false, () => {
            log('BUILD', `${town.getName()}: ${NAMES[item.buildingId]} niv.${item.level}`, 'success');
            buildData.queues[tid].shift(); buildData.stats.built++; saveData();
            updateStats(); updateQueueDisplay(); refreshSenateQueue();
            setTimeout(() => processTownQueue(tid), 1000);
        }, () => {});
    }

    function addToQueue(bid, lvl) {
        const tid = uw.Game.townId;
        if (!buildData.queues[tid]) buildData.queues[tid] = [];
        buildData.queues[tid].push({ buildingId: bid, level: lvl });
        saveData(); refreshSenateQueue(); updateStats(); updateQueueDisplay(); uw.$('.ab-btn').remove();
    }

    function removeFromQueue(idx) {
        const tid = uw.Game.townId;
        if (buildData.queues[tid]) {
            buildData.queues[tid].splice(idx, 1);
            saveData(); refreshSenateQueue(); updateStats(); updateQueueDisplay(); uw.$('.ab-btn').remove();
        }
    }

    function startSenateWatcher() {
        senateWatcherInterval = setInterval(() => { injectSenateQueue(); addBuildButtons(); }, 1000);
    }

    function injectSenateQueue() {
        if (uw.$('#autobuild-senate-queue').length) { refreshSenateQueue(); return; }
        const $bt = uw.$('#building_tasks_main');
        if (!$bt.length) return;
        $bt.after(`<div id="autobuild-senate-queue" style="background:linear-gradient(180deg,rgba(45,34,23,0.95),rgba(30,23,15,0.95));border:2px solid #D4AF37;border-radius:6px;margin:10px;padding:10px;"><div class="queue-items" style="display:flex;flex-wrap:wrap;gap:4px;"></div></div>`);
        refreshSenateQueue();
    }

    function refreshSenateQueue() {
        const queue = buildData.queues[uw.Game.townId] || [];
        const $items = uw.$('#autobuild-senate-queue .queue-items');
        if ($items.length) {
            $items.html(queue.length === 0 ? '<div style="color:#8B8B83;padding:10px;">File vide</div>' : queue.map((it, i) => {
                const sp = SPRITES[it.buildingId] || [0, 0];
                return `<div style="width:40px;height:40px;position:relative;cursor:pointer;border:1px solid #8B6914;border-radius:3px;background:url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px;background-size:500px 150px;" title="${NAMES[it.buildingId]} niv.${it.level}">
                    <span style="position:absolute;bottom:1px;right:1px;background:#000;color:#fff;font-size:9px;padding:0 3px;">${it.level}</span>
                    <div onclick="event.stopPropagation();GU_Build.remove(${i})" style="position:absolute;top:-5px;right:-5px;background:#E53935;color:#fff;width:14px;height:14px;text-align:center;line-height:14px;font-size:10px;border-radius:50%;display:none;">x</div>
                </div>`;
            }).join(''));
            $items.find('div[title]').hover(function(){ uw.$(this).find('div:last').show(); }, function(){ uw.$(this).find('div:last').hide(); });
        }
    }

    function addBuildButtons() {
        uw.$('.gpwindow_content:visible .building').each(function() {
            const $b = uw.$(this);
            if ($b.find('.ab-btn').length) return;
            const $name = $b.find('.name').first();
            const bid = Object.keys(NAMES).find(k => NAMES[k] === $name.text().trim()) || ($b.attr('class').match(/building_([a-z_]+)/) || [])[1];
            if (!bid) return;
            const nLvl = (parseInt($b.find('.level').first().text()) || 0) + uw.ITowns.getTown(uw.Game.townId).buildingOrders().filter(o => o.getBuildingId() === bid).length + (buildData.queues[uw.Game.townId] || []).filter(it => it.buildingId === bid).length + 1;
            $name.append(`<span class="ab-btn" onclick="event.stopPropagation();GU_Build.add('${bid}',${nLvl})" style="background:#D4AF37;color:#000;font-size:9px;padding:2px;margin-left:4px;cursor:pointer;border-radius:2px;">+ FILE</span>`);
        });
    }

    function updateQueueDisplay() {
        const container = document.getElementById('build-queue-display');
        if (!container) return;
        const queue = buildData.queues[uw.Game.townId] || [];
        container.innerHTML = queue.length === 0 ? '<div style="color: #8B8B83; font-style: italic; padding: 15px; width: 100%;">Ouvrez le Sénat pour remplir la file</div>' : queue.map((it) => {
            const sp = SPRITES[it.buildingId] || [0, 0];
            return `<div style="width:40px;height:40px;position:relative;border:1px solid #8B6914;background:url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px;background-size:500px 150px;">
                <span style="position:absolute;bottom:1px;right:1px;background:#000;color:#fff;font-size:9px;padding:0 3px;">${it.level}</span>
            </div>`;
        }).join('');
    }

    function startTimer() {
        setInterval(() => {
            const el = document.getElementById('build-timer');
            if (!el) return;
            if (!buildData.enabled) return el.textContent = 'PAUSE';
            const diff = buildData.nextCheckTime - Date.now();
            if (diff <= 0) { processAllQueues(); buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000; }
            el.textContent = `${String(Math.max(0, Math.floor(diff / 60000))).padStart(2, '0')}:${String(Math.max(0, Math.floor((diff % 60000) / 1000))).padStart(2, '0')}`;
        }, 1000);
    }

    function updateStats() {
        if (document.getElementById('build-stat-built')) document.getElementById('build-stat-built').textContent = buildData.stats.built;
        if (document.getElementById('build-stat-queued')) document.getElementById('build-stat-queued').textContent = Object.values(buildData.queues).reduce((a, q) => a + q.length, 0);
        if (document.getElementById('build-stat-gratis')) document.getElementById('build-stat-gratis').textContent = buildData.stats.gratisClaimed;
    }

    function saveData() { GM_setValue('gu_build_data', JSON.stringify(buildData)); }
    function loadData() { const s = GM_getValue('gu_build_data'); if (s) try { Object.assign(buildData, JSON.parse(s)); } catch(e) {} }

})(module);
