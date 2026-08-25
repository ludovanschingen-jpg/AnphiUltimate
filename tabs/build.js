(function(module) {
    const uw = module.uw;
    const log = module.log;
    const GM_getValue = module.GM_getValue;
    const GM_setValue = module.GM_setValue;
    const GM_xmlhttpRequest = module.GM_xmlhttpRequest;

    const NAMES = { 
        main: 'Sénat', lumber: 'Scierie', stoner: 'Carrière', ironer: 'Mine d\'argent', 
        storage: 'Entrepôt', farm: 'Ferme', barracks: 'Caserne', docks: 'Port', 
        wall: 'Remparts', academy: 'Académie', temple: 'Temple', market: 'Marché', hide: 'Grotte',
        theater: 'Théâtre', thermal: 'Thermes', library: 'Bibliothèque', lighthouse: 'Phare', 
        tower: 'Tour', statue: 'Statue divine', oracle: 'Oracle', trade_office: 'Comptoir' 
    };

    const CLASSIC_BUILDINGS = ['main', 'lumber', 'farm', 'stoner', 'ironer', 'storage', 'barracks', 'docks', 'academy', 'temple', 'market', 'wall', 'hide'];
    const LEFT_SPECIALS = ['theater', 'thermal', 'library', 'lighthouse'];
    const RIGHT_SPECIALS = ['tower', 'statue', 'oracle', 'trade_office'];
    
    // Coordonnées 100% décodées et validées (Permutation Remparts et Comptoir effectuée)
    const SPRITES = { 
        main: [450, 0], lumber: [400, 0], stoner: [200, 50], ironer: [50, 50], 
        storage: [0, 0], farm: [150, 0], barracks: [100, 0], docks: [50, 0], 
        wall: [0, 100], academy: [250, 50], temple: [250, 0], market: [0, 50], 
        hide: [200, 0], 
        theater: [350, 50], thermal: [400, 50], library: [300, 0], lighthouse: [350, 0], 
        tower: [300, 50], statue: [150, 50], oracle: [50, 100], trade_office: [450, 50] 
    };

    const FR_TO_ID = { 
        'senat': 'main', 'sénat': 'main', 'scierie': 'lumber', 'ferme': 'farm', 
        'carriere': 'stoner', 'carrière': 'stoner', 'entrepot': 'storage', 'entrepôt': 'storage',
        'mine': 'ironer', "mine d'argent": 'ironer', 'caserne': 'barracks', 'temple': 'temple', 
        'marche': 'market', 'marché': 'market', 'port': 'docks', 'academie': 'academy', 'académie': 'academy',
        'remparts': 'wall', 'muraille': 'wall', 'grotte': 'hide', 'thermes': 'thermal', 
        'bibliotheque': 'library', 'bibliothèque': 'library', 'phare': 'lighthouse', 'tour': 'tower', 
        'statue': 'statue', 'oracle': 'oracle', 'comptoir': 'trade_office', 'theatre': 'theater', 'théâtre': 'theater'
    };

    let buildData = {
        enabled: false, gratisEnabled: false,
        settings: { interval: 2, webhook: '' },
        stats: { built: 0, gratisClaimed: 0 },
        queues: {}, designerTemplate: {}, nextCheckTime: 0
    };

    let senateWatcherInterval = null;
    let gratisInterval = null;

    // --- INJECTION DES ELEMENTS GLOBAUX ---
    function injectGlobalUI() {
        // Bouton Top Bar très visible
        if (!document.getElementById('gu-topbar-designer-btn')) {
            const btn = document.createElement('div');
            btn.id = 'gu-topbar-designer-btn';
            btn.innerHTML = '🛠️ Designer de Ville';
            btn.title = "Ouvrir le Designer de Ville";
            btn.style = `position: fixed; top: 4px; left: 50%; transform: translateX(-50%); 
                         background: linear-gradient(180deg, #FFD700, #B8860B); border: 2px solid #333; 
                         color: #000; font-weight: bold; font-family: Arial, sans-serif; font-size: 14px;
                         padding: 6px 15px; border-radius: 4px; cursor: pointer; z-index: 99999; 
                         box-shadow: 0 4px 6px rgba(0,0,0,0.6); text-shadow: 1px 1px 0px rgba(255,255,255,0.5);`;
            btn.onclick = () => GU_Build.openDesigner();
            document.body.appendChild(btn);
        }

        // Fenêtre Modale Géante
        if (!document.getElementById('gu-designer-modal')) {
            const modal = document.createElement('div');
            modal.id = 'gu-designer-modal';
            modal.style = `display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                           width: 1100px; background: #1a1408; border: 3px solid #8B6914; border-radius: 8px; 
                           z-index: 100000; box-shadow: 0 0 30px rgba(0,0,0,0.9); padding: 20px; color: #F5DEB3;`;
            modal.innerHTML = `
                <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #8B6914; padding-bottom: 10px; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-family: Cinzel, serif; color: #FFD700; font-size: 22px;">🏛️ Gestionnaire de Ville (Designer)</h2>
                    <div style="cursor: pointer; font-weight: bold; color: #E53935; font-size: 18px;" onclick="GU_Build.closeDesigner()">❌ Fermer</div>
                </div>
                
                <div id="gu-modal-grid-content" style="background: rgba(0,0,0,0.4); padding: 25px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.2);">
                    <!-- Rempli dynamiquement -->
                </div>

                <div style="display: flex; gap: 15px; margin-top: 25px; justify-content: center;">
                    <button onclick="GU_Build.importTown()" style="padding: 12px 25px; font-size: 14px; background: #7B1FA2; color: white; border: 1px solid #4A148C; border-radius: 4px; cursor: pointer; font-weight: bold;">📥 Importer la ville actuelle</button>
                    <button onclick="GU_Build.applyTemplate()" style="padding: 12px 25px; font-size: 14px; background: #1976D2; color: white; border: 1px solid #0D47A1; border-radius: 4px; cursor: pointer; font-weight: bold;">▶ Appliquer à la file d'attente</button>
                    <button onclick="GU_Build.saveTemplate()" style="padding: 12px 25px; font-size: 14px; background: #388E3C; color: white; border: 1px solid #1B5E20; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 Sauvegarder Template</button>
                    <button onclick="GU_Build.resetDesigner()" style="padding: 12px 25px; font-size: 14px; background: #F57C00; color: white; border: 1px solid #E65100; border-radius: 4px; cursor: pointer; font-weight: bold;">🔄 Réinitialiser</button>
                </div>
            `;
            document.body.appendChild(modal);
        }
    }

    // --- CONTENU DE L'ONGLET LATERAL (Allégé) ---
    module.render = function(container) {
        container.innerHTML = `
            <div class="main-control inactive" id="build-control">
                <div class="control-info">
                    <div class="control-label">Auto Build</div>
                    <div class="control-status" id="build-status">En attente</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-build">
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="main-control inactive" id="gratis-control" style="margin-top:10px;">
                <div class="control-info">
                    <div class="control-label">Auto Gratis (-5 min)</div>
                    <div class="control-status" id="gratis-status">Inactif</div>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="toggle-gratis">
                    <span class="toggle-slider"></span>
                </label>
            </div>

            <div class="bot-section" style="margin-top: 20px;">
                <button onclick="GU_Build.openDesigner()" style="width: 100%; padding: 12px; background: linear-gradient(180deg, #D4AF37, #8B6914); border: 1px solid #FFD700; color: #1a1408; font-weight: bold; font-family: Cinzel, serif; font-size: 12px; cursor: pointer; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                    🏛️ OUVRIR LE DESIGNER
                </button>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>📊</span> Statistiques & File</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="stats-grid" style="margin-bottom: 10px;">
                        <div class="stat-box"><span class="stat-value" id="build-stat-built">0</span><span class="stat-label">Construits</span></div>
                        <div class="stat-box"><span class="stat-value" id="build-stat-queued">0</span><span class="stat-label">En file</span></div>
                        <div class="stat-box"><span class="stat-value" id="build-stat-gratis">0</span><span class="stat-label">Gratis</span></div>
                    </div>
                    
                    <div style="font-size: 10px; color: #D4AF37; margin-bottom: 5px;">File actuelle (Ville en cours):</div>
                    <div id="build-queue-display" style="min-height: 50px; display: flex; flex-wrap: wrap; gap: 4px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px;"></div>
                </div>
            </div>
            
            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>⚙️</span> Options</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="option-group">
                        <span class="option-label">Intervalle de verification</span>
                        <select class="option-select" id="build-interval">
                            <option value="2">2 minutes</option>
                            <option value="5">5 minutes</option>
                            <option value="10">10 minutes</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    };

    module.init = function() {
        injectGlobalUI();
        loadData();
        initializeDesignerTemplate();

        document.getElementById('toggle-build').checked = buildData.enabled;
        document.getElementById('toggle-gratis').checked = buildData.gratisEnabled;
        document.getElementById('build-interval').value = buildData.settings.interval;
        
        updateStats();
        updateQueueDisplay();
        
        document.getElementById('toggle-build').onchange = (e) => toggleBuild(e.target.checked);
        document.getElementById('toggle-gratis').onchange = (e) => toggleGratis(e.target.checked);
        document.getElementById('build-interval').onchange = (e) => {
            buildData.settings.interval = parseInt(e.target.value);
            saveData();
            if (buildData.enabled) buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
        };

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
        
        // Exposition globale des fonctions
        window.GU_Build = {
            add: (bid, lvl) => addToQueue(bid, lvl),
            remove: (idx) => removeFromQueue(idx),
            updateDesigner: (bid, val) => updateDesignerLevel(bid, val),
            openDesigner: () => {
                document.getElementById('gu-designer-modal').style.display = 'block';
                renderDesignerModalGrid();
            },
            closeDesigner: () => {
                document.getElementById('gu-designer-modal').style.display = 'none';
            },
            importTown: () => importTownLevelsToDesigner(),
            applyTemplate: () => generateQueueFromDesigner(),
            saveTemplate: () => saveDesignerTemplate(),
            resetDesigner: () => resetDesignerGrid()
        };

        log('BUILD', 'Module initialisé avec Modal Géante et icônes parfaites', 'info');
    };

    module.isActive = function() { return buildData.enabled || buildData.gratisEnabled; };
    module.onActivate = function() { updateStats(); updateQueueDisplay(); };

    // --- LOGIQUE DESIGNER DANS LA FENÊTRE MODALE ---
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
            renderDesignerModalGrid();
            if (!silent) log('BUILD', 'Niveaux actuels importés dans le designer !', 'success');
        } catch (e) {}
    }

    function renderDesignerModalGrid() {
        const container = document.getElementById('gu-modal-grid-content');
        if (!container) return;

        let totalLevels = 0;
        
        // TAILE AUGMENTÉE : Multiplicateur x1.5 (75px au lieu de 50px)
        const scale = 1.5;
        const boxSize = 50 * scale; // 75px
        const bgWidth = 500 * scale; // 750px
        const bgHeight = 150 * scale; // 225px

        const createBox = (bid) => {
            const sp = SPRITES[bid] || [0, 0];
            const level = buildData.designerTemplate[bid] || 0;
            totalLevels += level;
            const borderCol = (LEFT_SPECIALS.includes(bid) || RIGHT_SPECIALS.includes(bid)) && level > 0 ? '#4CAF50' : '#8B6914';

            // Coordonnées multipliées par le scale pour que le zoom soit parfait
            const posX = sp[0] * scale;
            const posY = sp[1] * scale;

            return `
                <div style="position: relative; width: ${boxSize}px; height: ${boxSize}px; border: 2px solid ${borderCol}; box-shadow: 2px 2px 8px #000; background: url('https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png') no-repeat -${posX}px -${posY}px; background-size: ${bgWidth}px ${bgHeight}px;" title="${NAMES[bid]}">
                    <input type="number" min="0" max="50" value="${level}" onchange="GU_Build.updateDesigner('${bid}', this.value)" 
                           style="position: absolute; bottom: 0; right: 0; width: 36px; height: 20px; background: rgba(0,0,0,0.85); border: 1px solid #D4AF37; color: #FFF; text-align: center; font-size: 14px; font-weight: bold; border-radius: 2px; padding: 0; box-sizing: border-box; margin:0;" />
                </div>
            `;
        };

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 30px; align-items: center;">
                
                <!-- BÂTIMENTS CLASSIQUES -->
                <div style="width: 100%;">
                    <div style="font-size: 14px; color: #D4AF37; border-bottom: 1px solid rgba(212,175,55,0.3); margin-bottom: 15px; font-weight: bold; text-align: center;">BÂTIMENTS CLASSIQUES</div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
                        ${CLASSIC_BUILDINGS.map(createBox).join('')}
                    </div>
                </div>

                <!-- BÂTIMENTS SPÉCIAUX (Gauche et Droite) -->
                <div style="display: flex; justify-content: space-between; width: 85%; margin-top: 10px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 13px; color: #D4AF37; margin-bottom: 10px; font-weight: bold;">SPÉCIAUX GAUCHE (1 Max)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            ${LEFT_SPECIALS.map(createBox).join('')}
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; font-size: 20px; font-weight: bold; color: #4CAF50; padding: 0 30px;">
                        Total Niveaux: <span style="color:#FFD700; margin-left: 10px;">${totalLevels}</span>
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 13px; color: #D4AF37; margin-bottom: 10px; font-weight: bold;">SPÉCIAUX DROITE (1 Max)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                            ${RIGHT_SPECIALS.map(createBox).join('')}
                        </div>
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
        renderDesignerModalGrid();
    }

    function applyPrerequisites(bid, targetLevel) {
        buildData.designerTemplate[bid] = targetLevel;
        if (targetLevel <= 0) return;

        if (['thermal', 'library', 'lighthouse', 'tower', 'oracle', 'statue', 'trade_office'].includes(bid)) {
            if ((buildData.designerTemplate['main'] || 0) < 24) buildData.designerTemplate['main'] = 24;
            if ((buildData.designerTemplate['storage'] || 0) < 22) buildData.designerTemplate['storage'] = 22;
        }
        if (bid === 'thermal' && (buildData.designerTemplate['farm'] || 0) < 35) buildData.designerTemplate['farm'] = 35;
        if (bid === 'library' && (buildData.designerTemplate['academy'] || 0) < 30) buildData.designerTemplate['academy'] = 30;
        if (bid === 'lighthouse' && (buildData.designerTemplate['docks'] || 0) < 20) buildData.designerTemplate['docks'] = 20;
        if (bid === 'tower' && (buildData.designerTemplate['wall'] || 0) < 15) buildData.designerTemplate['wall'] = 15;
        if (bid === 'oracle' && (buildData.designerTemplate['temple'] || 0) < 12) buildData.designerTemplate['temple'] = 12;

        if (bid === 'academy' && targetLevel >= 34) {
            ['main','storage','farm','lumber','stoner','ironer'].forEach(b => {
                if ((buildData.designerTemplate[b] || 0) < 24 && b !== 'storage' && b !== 'farm') buildData.designerTemplate[b] = 24;
                if ((buildData.designerTemplate[b] || 0) < 22 && (b === 'storage' || b === 'farm')) buildData.designerTemplate[b] = 22;
            });
        }
        if (bid === 'academy' && targetLevel >= 1) {
            if ((buildData.designerTemplate['main'] || 0) < 8) buildData.designerTemplate['main'] = 8;
            if ((buildData.designerTemplate['storage'] || 0) < 10) buildData.designerTemplate['storage'] = 10;
        }
        if (bid === 'barracks' && targetLevel >= 1) {
            if ((buildData.designerTemplate['main'] || 0) < 4) buildData.designerTemplate['main'] = 4;
        }
        if (bid === 'docks' && targetLevel >= 1) {
            if ((buildData.designerTemplate['main'] || 0) < 6) buildData.designerTemplate['main'] = 6;
            if ((buildData.designerTemplate['storage'] || 0) < 5) buildData.designerTemplate['storage'] = 5;
            if ((buildData.designerTemplate['lumber'] || 0) < 5) buildData.designerTemplate['lumber'] = 5;
        }
        if (bid === 'temple' && targetLevel >= 1) {
            if ((buildData.designerTemplate['main'] || 0) < 5) buildData.designerTemplate['main'] = 5;
            if ((buildData.designerTemplate['storage'] || 0) < 8) buildData.designerTemplate['storage'] = 8;
        }
        if (bid === 'market' && targetLevel >= 1) {
            if ((buildData.designerTemplate['main'] || 0) < 3) buildData.designerTemplate['main'] = 3;
            if ((buildData.designerTemplate['storage'] || 0) < 10) buildData.designerTemplate['storage'] = 10;
            if ((buildData.designerTemplate['stoner'] || 0) < 5) buildData.designerTemplate['stoner'] = 5;
        }
        if (bid === 'wall' && targetLevel >= 1) {
            if ((buildData.designerTemplate['main'] || 0) < 3) buildData.designerTemplate['main'] = 3;
            if ((buildData.designerTemplate['ironer'] || 0) < 1) buildData.designerTemplate['ironer'] = 1;
        }
    }

    function saveDesignerTemplate() { saveData(); log('BUILD', 'Template sauvegardé.', 'success'); }
    function resetDesignerGrid() { for (let key in buildData.designerTemplate) buildData.designerTemplate[key] = 0; saveData(); renderDesignerModalGrid(); log('BUILD', 'Niveaux réinitialisés.', 'info'); }

    // --- LOGIQUE BOT AUTOBUILD ---
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
        buildData.queues[tid] = newQueue; saveData(); refreshSenateQueue(); updateStats(); updateQueueDisplay();
        log('BUILD', `Template appliqué ! ${newQueue.length} constructions planifiées.`, 'success');
        GU_Build.closeDesigner(); 
    }

    function toggleBuild(enabled) {
        buildData.enabled = enabled;
        document.getElementById('build-status').textContent = enabled ? 'Actif' : 'En attente';
        if (enabled) {
            log('BUILD', 'Bot démarré', 'success');
            buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
            processAllQueues();
        } else { log('BUILD', 'Bot arrêté', 'info'); }
        saveData();
    }

    function toggleGratis(enabled) {
        buildData.gratisEnabled = enabled;
        const status = document.getElementById('gratis-status');
        if (enabled) {
            status.textContent = 'Actif'; status.style.color = '#81C784';
            gratisInterval = setInterval(checkGratis, 2500); log('BUILD', 'Auto Gratis activé', 'success');
        } else {
            status.textContent = 'Inactif'; status.style.color = '#E57373';
            if (gratisInterval) clearInterval(gratisInterval); log('BUILD', 'Auto Gratis désactivé', 'info');
        }
        saveData();
    }

    function checkGratis() {
        try {
            const btn = uw.$('.type_building_queue.type_free').not('.disabled');
            if (btn.length > 0) {
                btn.click();
                const town = uw.ITowns.getCurrentTown();
                for (let model of town.buildingOrders().models) {
                    if (model.attributes && model.attributes.building_time < 300) { callGratis(town.id, model.id); return; }
                }
            }
        } catch (e) {}
    }

    function callGratis(townId, orderId) {
        uw.gpAjax.ajaxPost('frontend_bridge', 'execute', { model_url: `BuildingOrder/${orderId}`, action_name: 'buyInstant', arguments: { order_id: orderId }, town_id: townId }, null, {
            success: () => { buildData.stats.gratisClaimed++; saveData(); updateStats(); }
        });
    }

    async function processAllQueues() { for (const tid in buildData.queues) await processTownQueue(tid); }

    async function processTownQueue(tid) {
        const q = buildData.queues[tid] || [];
        if (q.length === 0) return;
        const town = uw.ITowns.getTown(tid);
        if (!town || town.buildingOrders().length >= (uw.GameDataPremium.isAdvisorActivated('curator') ? 7 : 2)) return;

        const item = q[0];
        uw.gpAjax.ajaxPost('frontend_bridge', 'execute', { model_url: 'BuildingOrder', action_name: 'buildUp', arguments: { building_id: item.buildingId }, town_id: tid }, false, () => {
            log('BUILD', `${town.getName()}: ${NAMES[item.buildingId]} niv.${item.level}`, 'success');
            buildData.queues[tid].shift(); buildData.stats.built++; saveData(); updateStats(); updateQueueDisplay(); refreshSenateQueue();
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

    function startSenateWatcher() { senateWatcherInterval = setInterval(() => { injectSenateQueue(); addBuildButtons(); }, 1000); }

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
                return `<div style="width:35px;height:35px;position:relative;cursor:pointer;border:1px solid #8B6914;border-radius:3px;background:url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px;background-size:500px 150px;" title="${NAMES[it.buildingId]} niv.${it.level}">
                    <span style="position:absolute;bottom:0px;right:0px;background:#000;color:#fff;font-size:9px;padding:0 2px;">${it.level}</span>
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
        container.innerHTML = queue.length === 0 ? '<div style="color: #8B8B83; font-style: italic; padding: 5px; width: 100%;">File vide</div>' : queue.map((it) => {
            const sp = SPRITES[it.buildingId] || [0, 0];
            return `<div style="width:35px;height:35px;position:relative;border:1px solid #8B6914;background:url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px;background-size:500px 150px;" title="${NAMES[it.buildingId]} niv.${it.level}">
                <span style="position:absolute;bottom:0px;right:0px;background:#000;color:#fff;font-size:9px;padding:0 2px;">${it.level}</span>
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
