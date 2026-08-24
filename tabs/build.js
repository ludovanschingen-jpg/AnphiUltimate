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

    // Groupes : Bâtiments classiques (mono bloc) et Bâtiments spéciaux séparés par colonne
    const CLASSIC_BUILDINGS = ['main', 'lumber', 'stoner', 'ironer', 'storage', 'farm', 'barracks', 'docks', 'wall', 'academy', 'temple', 'market', 'hide'];
    const LEFT_SPECIALS = ['theater', 'thermal', 'library', 'lighthouse'];
    const RIGHT_SPECIALS = ['tower', 'statue', 'oracle', 'trade_office'];
    
    // Coordonnées exactes des sprites de bâtiments (50x50) alignées sur la matrice officielle 10x3
    const SPRITES = { 
        academy: [0, 0], barracks: [50, 0], docks: [100, 0], farm: [150, 0], 
        hide: [200, 0], ironer: [250, 0], trade_office: [300, 0], theater: [350, 0], 
        lumber: [400, 0], main: [450, 0], market: [0, 50], tower: [50, 50], 
        oracle: [100, 50], statue: [150, 50], stoner: [200, 50], storage: [250, 50], 
        temple: [300, 50], thermal: [350, 50], library: [400, 50], lighthouse: [450, 50], 
        wall: [0, 100] 
    };

    const FR_TO_ID = { 
        'senat': 'main', 'sénat': 'main',
        'scierie': 'lumber', 'ferme': 'farm', 
        'carriere': 'stoner', 'carrière': 'stoner',
        'entrepot': 'storage', 'entrepôt': 'storage',
        'mine': 'ironer', "mine d'argent": 'ironer',
        'caserne': 'barracks', 'temple': 'temple', 
        'marche': 'market', 'marché': 'market',
        'port': 'docks', 'academie': 'academy', 'académie': 'academy',
        'remparts': 'wall', 'muraille': 'wall',
        'grotte': 'hide', 'thermes': 'thermal', 
        'bibliotheque': 'library', 'bibliothèque': 'library',
        'phare': 'lighthouse', 'tour': 'tower', 
        'statue': 'statue', 'oracle': 'oracle', 
        'comptoir': 'trade_office', 'theatre': 'theater', 'théâtre': 'theater'
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
                    <div style="padding: 12px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 11px; color: #BDB76B;">
                        <strong>ℹ️ Fonctionnement:</strong><br>
                        • Clique automatiquement sur le bouton "Gratis" toutes les 2.5 secondes<br>
                        • Termine instantanément les constructions de moins de 5 minutes
                    </div>
                </div>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>🎨</span> Designer de Template (Style Vues Ville)</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div style="margin-bottom: 12px; font-size: 11px; color: #F5DEB3;">
                        Bâtiments classiques en bloc, et bâtiments spéciaux séparés (1 seul choix max par colonne).
                    </div>
                    
                    <div id="designer-container" style="display: flex; flex-direction: column; gap: 10px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.3); max-height: 450px; overflow-y: auto;">
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
                    <div class="section-title"><span>📊</span> Statistiques</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="stats-grid">
                        <div class="stat-box">
                            <span class="stat-value" id="build-stat-built">0</span>
                            <span class="stat-label">Construits</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="build-stat-queued">0</span>
                            <span class="stat-label">En attente</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" id="build-stat-gratis">0</span>
                            <span class="stat-label">Gratis utilisés</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>⏱️</span> Prochain Check</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div class="timer-container">
                        <div class="timer-label">Temps restant</div>
                        <div class="timer-value" id="build-timer">--:--</div>
                    </div>
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

            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>📋</span> File d'attente actuelle</div>
                    <span class="section-toggle">▼</span>
                </div>
                <div class="section-content">
                    <div id="build-queue-display" style="min-height: 60px; display: flex; flex-wrap: wrap; gap: 6px;">
                        <div style="color: #8B8B83; font-style: italic; padding: 15px; text-align: center; width: 100%;">Ouvrez le Sénat pour voir la file</div>
                    </div>
                </div>
            </div>
        `;
    };

    module.init = function() {
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
            log('BUILD', 'Intervalle: ' + e.target.value + ' min', 'info');
            if (buildData.enabled) {
                buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
            }
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

        log('BUILD', 'Module initialisé avec layout mono-bloc et colonnes spéciales exclusives', 'info');
    };

    module.isActive = function() {
        return buildData.enabled || buildData.gratisEnabled;
    };

    module.onActivate = function(container) {
        renderDesignerGrid();
        updateStats();
        updateQueueDisplay();
    };

    function initializeDesignerTemplate() {
        if (!buildData.designerTemplate || Object.keys(buildData.designerTemplate).length === 0) {
            buildData.designerTemplate = {};
            importTownLevelsToDesigner(true);
        }
    }

    function importTownLevelsToDesigner(silent = false) {
        try {
            const town = uw.ITowns.getCurrentTown();
            if (!town) {
                if (!silent) log('BUILD', 'Aucune ville active détectée pour importer les niveaux.', 'warning');
                return;
            }
            const buildingList = town.buildingList ? town.buildingList() : {};
            
            for (const bid of Object.keys(NAMES)) {
                const currentObj = buildingList[bid];
                const lvl = currentObj ? (currentObj.level || currentObj.akt_level || 0) : 0;
                buildData.designerTemplate[bid] = lvl;
            }
            
            saveData();
            renderDesignerGrid();
            if (!silent) log('BUILD', 'Niveaux actuels de la ville importés dans le designer !', 'success');
        } catch (e) {
            console.error('[GU Build] Erreur import niveaux ville:', e);
        }
    }

    function renderDesignerGrid() {
        const container = document.getElementById('designer-container');
        if (!container) return;

        const renderItems = (bids) => bids.map(bid => {
            const sp = SPRITES[bid] || [0, 0];
            const level = buildData.designerTemplate[bid] !== undefined ? buildData.designerTemplate[bid] : 0;
            
            return `
                <div style="width: 60px; background: #1a1408; border: 1px solid #8B6914; border-radius: 6px; padding: 4px; text-align: center;" title="${NAMES[bid]}">
                    <div style="width: 45px; height: 45px; margin: 0 auto; background: url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px; background-size: 500px 150px; border-radius: 4px;"></div>
                    <div style="font-size: 9px; color: #F5DEB3; margin: 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${NAMES[bid]}</div>
                    <input type="number" min="0" max="50" value="${level}" 
                        onchange="GU_Build.updateDesigner('${bid}', this.value)"
                        style="width: 42px; background: #0f0a04; border: 1px solid #D4AF37; color: #FFD700; text-align: center; font-size: 11px; font-weight: bold; border-radius: 3px; padding: 1px;" />
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <!-- Bloc Classique (Mono Bloc) -->
            <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.15);">
                <div style="font-size: 10px; font-family: Cinzel, serif; color: #D4AF37; margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid rgba(212,175,55,0.2); padding-bottom: 3px;">🏛️ Bâtiments Classiques</div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
                    ${renderItems(CLASSIC_BUILDINGS)}
                </div>
            </div>

            <!-- Deux colonnes pour les Bâtiments Spéciaux exclusifs -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.15);">
                    <div style="font-size: 10px; font-family: Cinzel, serif; color: #D4AF37; margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid rgba(212,175,55,0.2); padding-bottom: 3px;">⭐ Spéciaux Gauche (1 Max)</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
                        ${renderItems(LEFT_SPECIALS)}
                    </div>
                </div>

                <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.15);">
                    <div style="font-size: 10px; font-family: Cinzel, serif; color: #D4AF37; margin-bottom: 6px; font-weight: bold; border-bottom: 1px solid rgba(212,175,55,0.2); padding-bottom: 3px;">⭐ Spéciaux Droite (1 Max)</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
                        ${renderItems(RIGHT_SPECIALS)}
                    </div>
                </div>
            </div>
        `;
    }

    function updateDesignerLevel(bid, val) {
        let num = parseInt(val) || 0;
        if (num < 0) num = 0;
        if (num > 50) num = 50;
        
        // Règle d'exclusion mutuelle pour les bâtiments spéciaux
        if (LEFT_SPECIALS.includes(bid) && num > 0) {
            LEFT_SPECIALS.forEach(s => {
                if (s !== bid) buildData.designerTemplate[s] = 0;
            });
        }
        if (RIGHT_SPECIALS.includes(bid) && num > 0) {
            RIGHT_SPECIALS.forEach(s => {
                if (s !== bid) buildData.designerTemplate[s] = 0;
            });
        }
        
        applyPrerequisites(bid, num);
        saveData();
        renderDesignerGrid();
    }

    function applyPrerequisites(bid, targetLevel) {
        buildData.designerTemplate[bid] = targetLevel;

        if (targetLevel <= 0) return;

        if (['thermal', 'library', 'lighthouse', 'tower'].includes(bid) && targetLevel > 0) {
            if ((buildData.designerTemplate['main'] || 0) < 24) buildData.designerTemplate['main'] = 24;
            if ((buildData.designerTemplate['storage'] || 0) < 22) buildData.designerTemplate['storage'] = 22;
        }

        if (bid === 'thermal' && targetLevel > 0) {
            if ((buildData.designerTemplate['farm'] || 0) < 35) buildData.designerTemplate['farm'] = 35;
        }
        if (bid === 'library' && targetLevel > 0) {
            if ((buildData.designerTemplate['academy'] || 0) < 30) buildData.designerTemplate['academy'] = 30;
        }
        if (bid === 'lighthouse' && targetLevel > 0) {
            if ((buildData.designerTemplate['docks'] || 0) < 20) buildData.designerTemplate['docks'] = 20;
        }
        if (bid === 'tower' && targetLevel > 0) {
            if ((buildData.designerTemplate['wall'] || 0) < 15) buildData.designerTemplate['wall'] = 15;
        }

        if (bid === 'academy' && targetLevel >= 34) {
            if ((buildData.designerTemplate['main'] || 0) < 24) buildData.designerTemplate['main'] = 24;
            if ((buildData.designerTemplate['storage'] || 0) < 22) buildData.designerTemplate['storage'] = 22;
            if ((buildData.designerTemplate['farm'] || 0) < 22) buildData.designerTemplate['farm'] = 22;
            if ((buildData.designerTemplate['lumber'] || 0) < 24) buildData.designerTemplate['lumber'] = 24;
            if ((buildData.designerTemplate['stoner'] || 0) < 24) buildData.designerTemplate['stoner'] = 24;
            if ((buildData.designerTemplate['ironer'] || 0) < 24) buildData.designerTemplate['ironer'] = 24;
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

    function saveDesignerTemplate() {
        saveData();
        log('BUILD', 'Template du Designer sauvegardé avec succès.', 'success');
    }

    function generateQueueFromDesigner() {
        const tid = uw.Game.townId;
        const town = uw.ITowns.getTown(tid);
        if (!town) {
            log('BUILD', 'Ville introuvable pour appliquer le template.', 'error');
            return;
        }

        const newQueue = [];
        const buildingList = town.buildingList ? town.buildingList() : {};

        for (const [bid, targetLvl] of Object.entries(buildData.designerTemplate)) {
            if (targetLvl <= 0) continue;
            const currentObj = buildingList[bid];
            const currentLvl = currentObj ? (currentObj.level || currentObj.akt_level || 0) : 0;
            
            for (let l = currentLvl + 1; l <= targetLvl; l++) {
                newQueue.push({ buildingId: bid, level: l });
            }
        }

        buildData.queues[tid] = newQueue;
        saveData();
        refreshSenateQueue();
        updateStats();
        updateQueueDisplay();
        log('BUILD', `Template appliqué ! ${newQueue.length} constructions planifiées en tenant compte des prérequis.`, 'success');
    }

    function resetDesignerGrid() {
        for (let key in buildData.designerTemplate) {
            buildData.designerTemplate[key] = 0;
        }
        saveData();
        renderDesignerGrid();
        log('BUILD', 'Niveaux du Designer réinitialisés à 0.', 'info');
    }

    function openRequiredWindows() {
        try {
            if (uw.GPWindowMgr) {
                if (typeof uw.GPWindowMgr.HasOpenWindowsOfType === 'function' && !uw.GPWindowMgr.HasOpenWindowsOfType(uw.GPWindowMgr.TYPE_SENATE)) {
                    uw.GPWindowMgr.Create(uw.GPWindowMgr.TYPE_SENATE);
                }
                if (typeof uw.GPWindowMgr.HasOpenWindowsOfType === 'function' && !uw.GPWindowMgr.HasOpenWindowsOfType(uw.GPWindowMgr.TYPE_ACADEMY)) {
                    uw.GPWindowMgr.Create(uw.GPWindowMgr.TYPE_ACADEMY);
                }
            }
        } catch (e) {
            console.error('[GU Build] Erreur ouverture fenêtres:', e);
        }
    }

    function toggleBuild(enabled) {
        buildData.enabled = enabled;
        const ctrl = document.getElementById('build-control');
        const status = document.getElementById('build-status');
        
        if (enabled) {
            ctrl.classList.remove('inactive');
            status.textContent = 'Actif';
            log('BUILD', 'Bot de construction démarré', 'success');
            openRequiredWindows();
            buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
            processAllQueues();
        } else {
            ctrl.classList.add('inactive');
            status.textContent = 'En attente';
            log('BUILD', 'Bot de construction arrêté', 'info');
        }
        
        saveData();
        if (window.GrepolisUltimate) {
            window.GrepolisUltimate.updateButtonState();
        }
    }

    function toggleGratis(enabled) {
        buildData.gratisEnabled = enabled;
        const ctrl = document.getElementById('gratis-control');
        const status = document.getElementById('gratis-status');
        
        if (enabled) {
            ctrl.classList.remove('inactive');
            status.textContent = 'Actif';
            status.style.color = '#81C784';
            log('BUILD', 'Auto Gratis activé', 'success');
            if (gratisInterval) clearInterval(gratisInterval);
            gratisInterval = setInterval(checkGratis, 2500);
        } else {
            ctrl.classList.add('inactive');
            status.textContent = 'Inactif';
            status.style.color = '#E57373';
            log('BUILD', 'Auto Gratis désactivé', 'info');
            if (gratisInterval) {
                clearInterval(gratisInterval);
                gratisInterval = null;
            }
        }
        
        saveData();
        if (window.GrepolisUltimate) {
            window.GrepolisUltimate.updateButtonState();
        }
    }

    function checkGratis() {
        try {
            const gratisButton = uw.$('.type_building_queue.type_free').not('.disabled');
            if (gratisButton.length > 0) {
                gratisButton.click();
                const town = uw.ITowns.getCurrentTown();
                if (!town) return;
                const buildingOrders = town.buildingOrders();
                if (!buildingOrders || !buildingOrders.models) return;
                for (let model of buildingOrders.models) {
                    if (model.attributes && model.attributes.building_time < 300) {
                        callGratis(town.id, model.id);
                        return;
                    }
                }
            }
        } catch (e) {
            log('BUILD', `Erreur Auto Gratis: ${e.message}`, 'error');
        }
    }

    function callGratis(townId, orderId) {
        try {
            const data = {
                model_url: `BuildingOrder/${orderId}`,
                action_name: 'buyInstant',
                arguments: { order_id: orderId },
                town_id: townId
            };
            const townName = uw.ITowns.getTown(townId)?.getName() || `Ville ${townId}`;
            uw.gpAjax.ajaxPost('frontend_bridge', 'execute', data, null, {
                success: function() {
                    buildData.stats.gratisClaimed++;
                    saveData();
                    updateStats();
                    log('BUILD', `${townName}: Gratis utilisé (Order ${orderId})`, 'success');
                },
                error: function(error) {
                    log('BUILD', `${townName}: Erreur Gratis: ${error}`, 'error');
                }
            });
        } catch (e) {
            log('BUILD', `Erreur callGratis: ${e.message}`, 'error');
        }
    }

    async function processAllQueues() {
        for (const tid in buildData.queues) {
            if (buildData.queues.hasOwnProperty(tid)) {
                await processTownQueue(tid);
            }
        }
    }

    async function processTownQueue(tid) {
        const q = buildData.queues[tid] || [];
        if (q.length === 0) return;

        const town = uw.ITowns.getTown(tid);
        if (!town) return;

        const max = uw.GameDataPremium.isAdvisorActivated('curator') ? 7 : 2;
        const currentOrders = town.buildingOrders().length;

        if (currentOrders >= max) return;

        const item = q[0];
        const name = NAMES[item.buildingId] || item.buildingId;

        uw.gpAjax.ajaxPost('frontend_bridge', 'execute', {
            model_url: 'BuildingOrder', action_name: 'buildUp',
            arguments: { building_id: item.buildingId }, town_id: tid
        }, false, () => {
            log('BUILD', `${town.getName()}: ${name} niv.${item.level}`, 'success');
            buildData.queues[tid].shift();
            buildData.stats.built++;
            saveData();
            updateStats();
            updateQueueDisplay();
            
            if (tid == uw.Game.townId) {
                refreshSenateQueue();
                uw.$('.ab-btn').remove();
            }

            setTimeout(() => processTownQueue(tid), 1000);
        }, () => {});
    }

    function addToQueue(bid, lvl) {
        const tid = uw.Game.townId;
        if (!buildData.queues[tid]) buildData.queues[tid] = [];
        buildData.queues[tid].push({ buildingId: bid, level: lvl });
        saveData();
        log('BUILD', `+ ${NAMES[bid]} niv.${lvl}`, 'success');
        refreshSenateQueue();
        updateStats();
        updateQueueDisplay();
        uw.$('.ab-btn').remove();
    }

    function removeFromQueue(idx) {
        const tid = uw.Game.townId;
        if (buildData.queues[tid]) {
            buildData.queues[tid].splice(idx, 1);
            saveData();
            refreshSenateQueue();
            updateStats();
            updateQueueDisplay();
            uw.$('.ab-btn').remove();
        }
    }

    function startSenateWatcher() {
        if (senateWatcherInterval) clearInterval(senateWatcherInterval);
        senateWatcherInterval = setInterval(() => {
            injectSenateQueue();
            addBuildButtons();
        }, 1000);
    }

    function injectSenateQueue() {
        if (uw.$('#autobuild-senate-queue').length) {
            refreshSenateQueue();
            return;
        }

        const $bt = uw.$('#building_tasks_main');
        if (!$bt.length) return;

        const queue = buildData.queues[uw.Game.townId] || [];
        const $parent = $bt.closest('.gpwindow_content');
        if ($parent.length && $parent.css('overflow') !== 'auto') {
            $parent.css({ 'overflow-y': 'auto', 'overflow-x': 'hidden' });
        }
        
        $bt.after(`<div id="autobuild-senate-queue" style="background:linear-gradient(180deg,rgba(45,34,23,0.95),rgba(30,23,15,0.95));border:2px solid #D4AF37;border-radius:6px;margin:10px;padding:10px;flex-shrink:0;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid rgba(212,175,55,0.3);">
                <span style="font-family:Cinzel,serif;font-size:12px;color:#F5DEB3;">File Auto Build</span>
                <span style="background:rgba(212,175,55,0.3);color:#FFD700;padding:2px 8px;border-radius:10px;font-size:10px;">${queue.length}</span>
            </div>
            <div class="queue-items" style="display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow-y:auto;"></div>
        </div>`);
        refreshSenateQueue();
    }

    function refreshSenateQueue() {
        const queue = buildData.queues[uw.Game.townId] || [];
        const $items = uw.$('#autobuild-senate-queue .queue-items');
        const $count = uw.$('#autobuild-senate-queue').find('span:last');
        
        if ($count.length) $count.text(queue.length);
        
        if ($items.length) {
            if (queue.length === 0) {
                $items.html('<div style="color:#8B8B83;font-style:italic;text-align:center;padding:15px;">File vide - Utilisez les boutons "+ FILE"</div>');
            } else {
                $items.html(queue.map((it, i) => {
                    const sp = SPRITES[it.buildingId] || [0, 0];
                    return `<div style="width:50px;height:50px;background:#1a1a14;border:2px solid #8B6914;border-radius:4px;position:relative;display:inline-block;margin:3px;cursor:pointer;" title="${NAMES[it.buildingId]} niv.${it.level}">
                        <div style="width:100%;height:100%;background:url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px;background-size:500px 150px;"></div>
                        <span style="position:absolute;bottom:2px;right:2px;background:linear-gradient(145deg,#D4AF37,#8B6914);color:#1a1408;font-weight:bold;font-size:10px;padding:1px 4px;border-radius:3px;">${it.level}</span>
                        <div onclick="event.stopPropagation();GU_Build.remove(${i})" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;background:#E53935;color:#fff;border:2px solid #FFCDD2;border-radius:50%;font-size:10px;line-height:12px;text-align:center;cursor:pointer;display:none;">x</div>
                    </div>`;
                }).join(''));
                $items.find('div[title]').hover(function(){ uw.$(this).find('div:last').show(); }, function(){ uw.$(this).find('div:last').hide(); });
            }
        }
    }

    function addBuildButtons() {
        const $w = uw.$('.gpwindow_content:visible');
        if (!$w.length) return;

        $w.find('.building').each(function() {
            const $b = uw.$(this);
            if ($b.find('.ab-btn').length) return;

            const $name = $b.find('.name').first();
            let nameStr = $name.text().trim().toLowerCase();
            nameStr = nameStr.replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            
            let bid = FR_TO_ID[nameStr];

            if (!bid) {
                const nameNorm = nameStr.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                for (const [k, v] of Object.entries(FR_TO_ID)) {
                    const kNorm = k.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    if (nameNorm.includes(kNorm) || kNorm.includes(nameNorm)) { 
                        bid = v; 
                        break; 
                    }
                }
            }
            
            if (!bid) {
                const buildingClasses = $b.attr('class') || '';
                const classMatch = buildingClasses.match(/building_([a-z_]+)/);
                if (classMatch && classMatch[1]) {
                    bid = classMatch[1];
                }
            }
            
            if (!bid) return;

            const currentLvl = parseInt($b.find('.level').first().text()) || 0;
            const town = uw.ITowns.getTown(uw.Game.townId);
            const inRealQueue = town.buildingOrders().filter(o => o.getBuildingId() === bid).length;
            const inAutoQueue = (buildData.queues[uw.Game.townId] || []).filter(it => it.buildingId === bid).length;
            const nextLvl = currentLvl + inRealQueue + inAutoQueue + 1;

            $name.append(`<span class="ab-btn" onclick="event.stopPropagation();GU_Build.add('${bid}',${nextLvl})" style="background:linear-gradient(145deg,#D4AF37,#8B6914);border:1px solid #FFD700;color:#1a1408;font-size:8px;font-weight:bold;padding:2px 5px;margin-left:4px;cursor:pointer;border-radius:3px;">+ FILE</span>`);
        });
    }

    function updateQueueDisplay() {
        const container = document.getElementById('build-queue-display');
        if (!container) return;
        
        const queue = buildData.queues[uw.Game.townId] || [];
        if (queue.length === 0) {
            container.innerHTML = '<div style="color: #8B8B83; font-style: italic; padding: 15px; text-align: center; width: 100%;">Ouvrez le Sénat pour voir la file</div>';
        } else {
            container.innerHTML = queue.map((it, i) => {
                const sp = SPRITES[it.buildingId] || [0, 0];
                return `<div style="width:50px;height:50px;background:#1a1a14;border:2px solid #8B6914;border-radius:4px;position:relative;cursor:pointer;" title="${NAMES[it.buildingId]} niv.${it.level}">
                    <div style="width:100%;height:100%;background:url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px;background-size:500px 150px;"></div>
                    <span style="position:absolute;bottom:2px;right:2px;background:linear-gradient(145deg,#D4AF37,#8B6914);color:#1a1408;font-weight:bold;font-size:10px;padding:1px 4px;border-radius:3px;">${it.level}</span>
                </div>`;
            }).join('');
        }
    }

    function startTimer() {
        setInterval(() => {
            const el = document.getElementById('build-timer');
            if (!el) return;
            
            if (!buildData.enabled) {
                el.textContent = 'PAUSE';
                return;
            }

            const diff = buildData.nextCheckTime - Date.now();
            if (diff <= 0) {
                processAllQueues();
                buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
            }
            
            const m = Math.max(0, Math.floor(diff / 60000)).toString().padStart(2, '0');
            const s = Math.max(0, Math.floor((diff % 60000) / 1000)).toString().padStart(2, '0');
            el.textContent = `${m}:${s}`;
        }, 1000);
    }

    function updateStats() {
        const b = document.getElementById('build-stat-built');
        const q = document.getElementById('build-stat-queued');
        const g = document.getElementById('build-stat-gratis');
        
        if (b) b.textContent = buildData.stats.built;
        if (q) q.textContent = Object.values(buildData.queues).reduce((a, queue) => a + queue.length, 0);
        if (g) g.textContent = buildData.stats.gratisClaimed;
    }

    function saveData() {
        GM_setValue('gu_build_data', JSON.stringify({
            enabled: buildData.enabled,
            gratisEnabled: buildData.gratisEnabled,
            settings: buildData.settings,
            stats: buildData.stats,
            queues: buildData.queues,
            designerTemplate: buildData.designerTemplate
        }));
    }

    function loadData() {
        const saved = GM_getValue('gu_build_data');
        if (saved) {
            try {
                const d = JSON.parse(saved);
                buildData = { ...buildData, ...d };
            } catch(e) {}
        }
    }

})(module);
