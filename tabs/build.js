const uw = module.uw;
const log = module.log;
const GM_getValue = module.GM_getValue;
const GM_setValue = module.GM_setValue;
const GM_xmlhttpRequest = module.GM_xmlhttpRequest;

const NAMES = { main: 'Senat', lumber: 'Scierie', farm: 'Ferme', stoner: 'Carriere', storage: 'Entrepot', ironer: 'Mine', barracks: 'Caserne', temple: 'Temple', market: 'Marche', docks: 'Port', academy: 'Academie', wall: 'Remparts', hide: 'Grotte', thermal: 'Thermes', library: 'Bibliotheque', lighthouse: 'Phare', tower: 'Tour', statue: 'Statue', oracle: 'Oracle', trade_office: 'Comptoir', theater: 'Theatre' };
const SPRITES = { main: [450, 0], storage: [250, 50], farm: [150, 0], academy: [0, 0], temple: [300, 50], barracks: [50, 0], docks: [100, 0], market: [0, 50], hide: [200, 0], lumber: [400, 0], stoner: [200, 50], ironer: [250, 0], wall: [50, 100], theater: [350, 50], thermal: [350, 0], library: [450, 50], lighthouse: [100, 50], tower: [400, 50], statue: [150, 50], oracle: [50, 50], trade_office: [300, 0] };
const FR_TO_ID = { 
    'senat': 'main', 'sénat': 'main',
    'scierie': 'lumber', 
    'ferme': 'farm', 
    'carriere': 'stoner', 'carrière': 'stoner',
    'entrepot': 'storage', 'entrepôt': 'storage',
    'mine': 'ironer', "mine d'argent": 'ironer', 'argent': 'ironer',
    'caserne': 'barracks', 
    'temple': 'temple', 
    'marche': 'market', 'marché': 'market',
    'port': 'docks', 
    'academie': 'academy', 'académie': 'academy',
    'remparts': 'wall', 'muraille': 'wall',
    'grotte': 'hide', 
    'thermes': 'thermal', 
    'bibliotheque': 'library', 'bibliothèque': 'library',
    'phare': 'lighthouse', 
    'tour': 'tower', 
    'statue': 'statue', 'statue divine': 'statue',
    'oracle': 'oracle', 
    'comptoir': 'trade_office', 
    'theatre': 'theater', 'théâtre': 'theater'
};

// Batiments "normaux" (une seule case, pas de groupe exclusif)
const NORMAL_BUILDINGS = ['main', 'lumber', 'farm', 'stoner', 'storage', 'ironer', 'barracks', 'temple', 'market', 'docks', 'academy', 'wall', 'hide'];
// Les deux groupes de batiments speciaux : un seul batiment par groupe peut etre construit dans une ville
const SPECIAL_LEFT = ['theater', 'thermal', 'library', 'lighthouse'];
const SPECIAL_RIGHT = ['tower', 'statue', 'oracle', 'trade_office'];

// Niveaux maximum de chaque batiment (mondes recents / Achille-Bellerophon)
const BUILDING_MAX_LEVELS = {
    main: 25, lumber: 40, farm: 45, stoner: 40, storage: 35, ironer: 40,
    barracks: 30, temple: 30, market: 30, docks: 30, academy: 36, wall: 25, hide: 10,
    theater: 1, thermal: 1, library: 1, lighthouse: 1, tower: 1, statue: 1, oracle: 1, trade_office: 1
};

// Prerequis de construction de chaque batiment (source : wiki.fr.grepolis.com/wiki/Batiments + support.innogames.com)
// Format : [ [batiment_requis, niveau_requis], ... ]
// Ces prerequis ne conditionnent que le DEMARRAGE du batiment (niveau 1) ; une fois construit, on peut monter les niveaux librement.
const REQUIREMENTS = {
    main: [],
    lumber: [],
    stoner: [],
    ironer: [],
    farm: [],
    storage: [],
    market: [['main', 3], ['storage', 5]],
    barracks: [['ironer', 1], ['main', 2], ['farm', 3], ['lumber', 1]],
    temple: [['stoner', 1]],
    docks: [['main', 14], ['lumber', 15], ['ironer', 10]],
    academy: [['main', 8], ['farm', 6], ['barracks', 5]],
    wall: [['main', 5], ['temple', 3]],
    hide: [['main', 10], ['storage', 7], ['market', 4]],
    theater: [['main', 24], ['lumber', 35], ['ironer', 32], ['docks', 5], ['academy', 5]],
    thermal: [['main', 24], ['farm', 35], ['docks', 5], ['academy', 5]],
    library: [['main', 24], ['academy', 20], ['docks', 5]],
    lighthouse: [['main', 24], ['docks', 20], ['academy', 5]],
    tower: [['main', 21], ['wall', 20], ['temple', 5], ['market', 5]],
    statue: [['main', 21], ['temple', 12], ['market', 5]],
    oracle: [['main', 21], ['hide', 10], ['temple', 5], ['market', 5]],
    trade_office: [['main', 21], ['market', 15], ['temple', 5]]
};

let buildData = {
    enabled: false,
    gratisEnabled: false,
    settings: { interval: 2, webhook: '' },
    stats: { built: 0, gratisClaimed: 0 },
    queues: {},
    templates: {},
    nextCheckTime: 0
};

let senateWatcherInterval = null;
let gratisInterval = null;
let fillInterval = null;

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
                    • Termine instantanément les constructions de moins de 5 minutes<br>
                    • Fonctionne uniquement quand le bouton est disponible<br>
                    • Gratuit et sans limite d'utilisation
                </div>
            </div>
        </div>

        <div class="bot-section">
            <div class="section-header">
                <div class="section-title"><span>🏛️</span> Templates de construction</div>
                <span class="section-toggle">▼</span>
            </div>
            <div class="section-content">
                <div style="font-size: 11px; color: #BDB76B; margin-bottom: 10px;">
                    Choisissez les niveaux voulus pour chaque batiment, enregistrez le plan comme template, puis appliquez-le a n'importe quelle ville : la file sera remplie automatiquement avec tous les prerequis necessaires.
                </div>

                <div id="tpl-normal-grid" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; padding:10px; background:rgba(0,0,0,0.2); border-radius:6px;">
                    ${NORMAL_BUILDINGS.map(renderNormalBuildingCell).join('')}
                </div>

                <div style="display:flex; gap:10px; margin-bottom:14px;">
                    <div style="flex:1; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px;">
                        <div style="font-size:10px; color:#D4AF37; text-align:center; margin-bottom:8px; font-family:Cinzel,serif;">Speciaux — Emplacement Gauche</div>
                        <div id="tpl-special-left" style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                            ${SPECIAL_LEFT.map(renderSpecialCell).join('')}
                        </div>
                    </div>
                    <div style="flex:1; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px;">
                        <div style="font-size:10px; color:#D4AF37; text-align:center; margin-bottom:8px; font-family:Cinzel,serif;">Speciaux — Emplacement Droite</div>
                        <div id="tpl-special-right" style="display:flex; gap:6px; justify-content:center; flex-wrap:wrap;">
                            ${SPECIAL_RIGHT.map(renderSpecialCell).join('')}
                        </div>
                    </div>
                </div>

                <div style="display:flex; gap:6px; margin-bottom:8px;">
                    <input type="text" id="tpl-name-input" placeholder="Nom du template" maxlength="40"
                        style="flex:1; background:#1a1a14; border:1px solid #8B6914; color:#FFD700; padding:7px; border-radius:4px; font-size:12px;">
                    <button id="tpl-save-btn"
                        style="background:linear-gradient(145deg,#D4AF37,#8B6914); border:1px solid #FFD700; color:#1a1408; font-weight:bold; padding:7px 14px; border-radius:4px; cursor:pointer; font-size:11px; white-space:nowrap;">
                        💾 Enregistrer
                    </button>
                </div>

                <div style="display:flex; gap:6px; align-items:center;">
                    <select id="tpl-select"
                        style="flex:1; background:#1a1a14; border:1px solid #8B6914; color:#FFD700; padding:7px; border-radius:4px; font-size:12px;">
                        <option value="">-- Choisir un template --</option>
                    </select>
                    <button id="tpl-apply-btn"
                        style="background:linear-gradient(145deg,#81C784,#4a7a4a); border:1px solid #A5D6A7; color:#0d1f0d; font-weight:bold; padding:7px 12px; border-radius:4px; cursor:pointer; font-size:11px; white-space:nowrap;">
                        ✅ Appliquer a cette ville
                    </button>
                    <button id="tpl-delete-btn" title="Supprimer le template"
                        style="background:linear-gradient(145deg,#E57373,#8B3A3A); border:1px solid #FFCDD2; color:#2a0d0d; font-weight:bold; padding:7px 10px; border-radius:4px; cursor:pointer; font-size:11px;">
                        🗑️
                    </button>
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
                <div class="section-title"><span>📋</span> File d'attente</div>
                <span class="section-toggle">▼</span>
            </div>
            <div class="section-content">
                <div id="build-queue-display" style="min-height: 60px; display: flex; flex-wrap: wrap; gap: 6px;">
                    <div style="color: #8B8B83; font-style: italic; padding: 15px; text-align: center; width: 100%;">Ouvrez le Senat pour ajouter des constructions</div>
                </div>
            </div>
        </div>
    `;
};

function renderNormalBuildingCell(bid) {
    const sp = SPRITES[bid] || [0, 0];
    const max = BUILDING_MAX_LEVELS[bid] || 30;
    return `<div style="width:64px; text-align:center;">
        <div style="width:50px;height:50px;background:#1a1a14;border:2px solid #8B6914;border-radius:4px;margin:0 auto;">
            <div style="width:100%;height:100%;background:url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px;background-size:500px 150px;"></div>
        </div>
        <div style="font-size:9px;color:#D4AF37;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${NAMES[bid]}</div>
        <input type="number" class="tpl-level-input" data-bid="${bid}" min="0" max="${max}" value="0"
            style="width:48px;background:#1a1a14;border:1px solid #8B6914;color:#FFD700;text-align:center;font-size:11px;border-radius:3px;margin-top:3px;padding:2px 0;">
    </div>`;
}

function renderSpecialCell(bid) {
    const sp = SPRITES[bid] || [0, 0];
    return `<div class="tpl-special-cell" data-bid="${bid}" data-selected="0" title="${NAMES[bid]}" style="width:58px; text-align:center; cursor:pointer; user-select:none;">
        <div class="tpl-special-icon" style="width:50px;height:50px;background:#1a1a14;border:2px solid #4a4a3a;border-radius:4px;margin:0 auto;">
            <div style="width:100%;height:100%;background:url(https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png) no-repeat -${sp[0]}px -${sp[1]}px;background-size:500px 150px;opacity:0.5;"></div>
        </div>
        <div style="font-size:9px;color:#BDB76B;margin-top:3px;">${NAMES[bid]}</div>
    </div>`;
}

module.init = function() {
    loadData();
    
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
        log('BUILD', 'Intervalle: ' + e.target.value + ' min', 'info');
        if (buildData.enabled) {
            buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
        }
    };

    document.querySelectorAll('#tab-build .section-header').forEach(h => {
        h.onclick = () => {
            h.classList.toggle('collapsed');
            const c = h.nextElementSibling;
            if (c) c.style.display = h.classList.contains('collapsed') ? 'none' : 'block';
        };
    });

    // --- Templates de construction ---
    initSpecialToggleHandlers();
    refreshTemplateSelect();

    document.getElementById('tpl-save-btn').onclick = saveTemplateFromUI;
    document.getElementById('tpl-delete-btn').onclick = () => {
        const sel = document.getElementById('tpl-select');
        const name = sel.value;
        if (!name) { log('BUILD', 'Selectionnez un template a supprimer', 'error'); return; }
        delete buildData.templates[name];
        saveData();
        refreshTemplateSelect();
        log('BUILD', `Template "${name}" supprime`, 'info');
    };
    document.getElementById('tpl-apply-btn').onclick = () => {
        const sel = document.getElementById('tpl-select');
        const name = sel.value;
        if (!name) { log('BUILD', 'Selectionnez un template a appliquer', 'error'); return; }
        applyTemplateToTown(name);
    };
    document.getElementById('tpl-select').onchange = (e) => {
        const name = e.target.value;
        if (name && buildData.templates[name]) loadTemplateIntoUI(buildData.templates[name]);
    };

    if (buildData.enabled) {
        toggleBuild(true);
    }

    if (buildData.gratisEnabled) {
        toggleGratis(true);
    }

    startSenateWatcher();
    startTimer();
    
    window.GU_Build = {
        add: (bid, lvl) => addToQueue(bid, lvl),
        remove: (idx) => removeFromQueue(idx)
    };

    log('BUILD', 'Module initialise', 'info');
};

module.isActive = function() {
    return buildData.enabled || buildData.gratisEnabled;
};

module.onActivate = function(container) {
    updateStats();
    updateQueueDisplay();
    refreshTemplateSelect(document.getElementById('tpl-select') ? document.getElementById('tpl-select').value : undefined);
};

function toggleBuild(enabled) {
    buildData.enabled = enabled;
    const ctrl = document.getElementById('build-control');
    const status = document.getElementById('build-status');
    
    if (enabled) {
        ctrl.classList.remove('inactive');
        status.textContent = 'Actif';
        log('BUILD', 'Bot demarre', 'success');
        buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
        processAllQueues();

        // Remplissage continu : tant que le bot est actif, on retente regulierement de
        // remplir la file de construction (nouveaux emplacements libres, ressources reconstituees...)
        // jusqu'a ce qu'il n'y ait plus rien a construire ou plus assez de ressources.
        if (fillInterval) clearInterval(fillInterval);
        fillInterval = setInterval(() => {
            if (buildData.enabled) processAllQueues();
        }, 20000);
    } else {
        ctrl.classList.add('inactive');
        status.textContent = 'En attente';
        log('BUILD', 'Bot arrete', 'info');
        if (fillInterval) {
            clearInterval(fillInterval);
            fillInterval = null;
        }
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
        
        // Démarrer l'intervalle de vérification du bouton Gratis
        if (gratisInterval) clearInterval(gratisInterval);
        gratisInterval = setInterval(checkGratis, 2500);
    } else {
        ctrl.classList.add('inactive');
        status.textContent = 'Inactif';
        status.style.color = '#E57373';
        log('BUILD', 'Auto Gratis désactivé', 'info');
        
        // Arrêter l'intervalle
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
        // Chercher le bouton Gratis disponible (pas désactivé)
        const gratisButton = uw.$('.type_building_queue.type_free').not('.disabled');
        
        if (gratisButton.length > 0) {
            // Cliquer sur le bouton
            gratisButton.click();
            
            // Récupérer les informations de la ville actuelle
            const town = uw.ITowns.getCurrentTown();
            if (!town) return;
            
            // Chercher une construction de moins de 5 minutes (300 secondes)
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

        // Continue immediatement a remplir la file (jusqu'a epuisement des emplacements/ressources)
        setTimeout(() => processTownQueue(tid), 1000);
    }, () => {
        // Echec (ressources insuffisantes, prerequis manquant, etc.) : on laisse l'item en file,
        // le prochain cycle de remplissage (fillInterval / timer) retentera automatiquement.
    });
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
    if (buildData.enabled) processTownQueue(tid);
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
        container.innerHTML = '<div style="color: #8B8B83; font-style: italic; padding: 15px; text-align: center; width: 100%;">Ouvrez le Senat pour ajouter des constructions</div>';
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

// ============================================================================
// TEMPLATES DE CONSTRUCTION
// ============================================================================

function initSpecialToggleHandlers() {
    document.querySelectorAll('.tpl-special-cell').forEach(cell => {
        cell.onclick = () => {
            const bid = cell.dataset.bid;
            const group = SPECIAL_LEFT.includes(bid) ? SPECIAL_LEFT : SPECIAL_RIGHT;
            const wasSelected = cell.dataset.selected === '1';

            // Deselectionner tous les batiments du meme groupe (un seul possible par emplacement)
            group.forEach(gid => {
                const el = document.querySelector(`.tpl-special-cell[data-bid="${gid}"]`);
                if (!el) return;
                el.dataset.selected = '0';
                el.querySelector('.tpl-special-icon').style.borderColor = '#4a4a3a';
                el.querySelector('.tpl-special-icon div').style.opacity = '0.5';
            });

            if (!wasSelected) {
                cell.dataset.selected = '1';
                cell.querySelector('.tpl-special-icon').style.borderColor = '#FFD700';
                cell.querySelector('.tpl-special-icon div').style.opacity = '1';
            }
        };
    });
}

function collectTemplateFromUI() {
    const template = {};
    document.querySelectorAll('.tpl-level-input').forEach(inp => {
        const bid = inp.dataset.bid;
        const lvl = parseInt(inp.value) || 0;
        if (lvl > 0) template[bid] = Math.min(lvl, BUILDING_MAX_LEVELS[bid] || lvl);
    });
    document.querySelectorAll('.tpl-special-cell').forEach(cell => {
        if (cell.dataset.selected === '1') template[cell.dataset.bid] = 1;
    });
    return template;
}

function loadTemplateIntoUI(template) {
    document.querySelectorAll('.tpl-level-input').forEach(inp => {
        inp.value = template[inp.dataset.bid] || 0;
    });
    document.querySelectorAll('.tpl-special-cell').forEach(cell => {
        const bid = cell.dataset.bid;
        const selected = !!template[bid];
        cell.dataset.selected = selected ? '1' : '0';
        cell.querySelector('.tpl-special-icon').style.borderColor = selected ? '#FFD700' : '#4a4a3a';
        cell.querySelector('.tpl-special-icon div').style.opacity = selected ? '1' : '0.5';
    });
}

function saveTemplateFromUI() {
    const nameInput = document.getElementById('tpl-name-input');
    const name = nameInput.value.trim();
    if (!name) { log('BUILD', 'Entrez un nom pour le template', 'error'); return; }

    const template = collectTemplateFromUI();
    if (Object.keys(template).length === 0) { log('BUILD', 'Le template est vide', 'error'); return; }

    buildData.templates[name] = template;
    saveData();
    refreshTemplateSelect(name);
    log('BUILD', `Template "${name}" enregistre (${Object.keys(template).length} batiments)`, 'success');
}

function refreshTemplateSelect(selectName) {
    const sel = document.getElementById('tpl-select');
    if (!sel) return;
    const names = Object.keys(buildData.templates || {});
    sel.innerHTML = '<option value="">-- Choisir un template --</option>' +
        names.map(n => `<option value="${n.replace(/"/g, '&quot;')}">${n}</option>`).join('');
    if (selectName && names.includes(selectName)) sel.value = selectName;
}

// Lit les niveaux actuels des batiments d'une ville via l'API du jeu.
function getTownBuildingLevels(tid) {
    try {
        const town = uw.ITowns.getTown(tid);
        if (!town || !town.getBuildings) return {};
        return Object.assign({}, town.getBuildings().getBuildings());
    } catch (e) {
        log('BUILD', `Impossible de lire les niveaux de batiments: ${e.message}`, 'error');
        return {};
    }
}

// Calcule les niveaux "projetes" d'une ville : niveau reel + constructions en cours + file auto-build.
function computeProjectedLevels(tid) {
    const levels = getTownBuildingLevels(tid);
    try {
        const town = uw.ITowns.getTown(tid);
        if (town) {
            town.buildingOrders().forEach(o => {
                const bid = (typeof o.getBuildingId === 'function') ? o.getBuildingId() : o.attributes.building_id;
                levels[bid] = (levels[bid] || 0) + 1;
            });
        }
    } catch (e) {}
    (buildData.queues[tid] || []).forEach(it => {
        levels[it.buildingId] = (levels[it.buildingId] || 0) + 1;
    });
    return levels;
}

// Applique un template a la ville actuellement selectionnee : calcule tous les niveaux
// manquants (batiment cible + tous ses prerequis en cascade) et les ajoute a la file dans
// le bon ordre de dependance.
function applyTemplateToTown(templateName) {
    const template = buildData.templates[templateName];
    if (!template) { log('BUILD', `Template "${templateName}" introuvable`, 'error'); return; }

    const tid = uw.Game.townId;
    const projected = computeProjectedLevels(tid);
    const newItems = [];
    const visiting = new Set();
    let hadConflict = false;

    const currentLevel = (bid) => projected[bid] || 0;

    function queueLevelUp(bid) {
        const lvl = currentLevel(bid) + 1;
        newItems.push({ buildingId: bid, level: lvl });
        projected[bid] = lvl;
    }

    function checkExclusiveGroup(bid) {
        const group = SPECIAL_LEFT.includes(bid) ? SPECIAL_LEFT : (SPECIAL_RIGHT.includes(bid) ? SPECIAL_RIGHT : null);
        if (!group) return true;
        const conflict = group.find(other => other !== bid && currentLevel(other) >= 1);
        if (conflict) {
            log('BUILD', `Template: ${NAMES[bid]} ignore - ${NAMES[conflict]} occupe deja cet emplacement special`, 'error');
            hadConflict = true;
            return false;
        }
        return true;
    }

    function ensureLevel(bid, targetLevel) {
        if (currentLevel(bid) >= targetLevel) return;
        if (currentLevel(bid) < 1) {
            if (visiting.has(bid)) return; // securite anti-boucle
            visiting.add(bid);
            if (!checkExclusiveGroup(bid)) { visiting.delete(bid); return; }
            (REQUIREMENTS[bid] || []).forEach(([reqBid, reqLvl]) => ensureLevel(reqBid, reqLvl));
            if (currentLevel(bid) < 1) queueLevelUp(bid);
            visiting.delete(bid);
        }
        while (currentLevel(bid) < targetLevel) {
            queueLevelUp(bid);
        }
    }

    Object.keys(template).forEach(bid => {
        const targetLevel = template[bid];
        if (!targetLevel || targetLevel <= 0) return;
        ensureLevel(bid, targetLevel);
    });

    if (newItems.length === 0) {
        log('BUILD', hadConflict ? 'Template: rien ajoute (conflit d\'emplacement special)' : 'Template: rien a ajouter, niveaux deja atteints', 'info');
        return;
    }

    if (!buildData.queues[tid]) buildData.queues[tid] = [];
    buildData.queues[tid].push(...newItems);
    saveData();
    refreshSenateQueue();
    updateStats();
    updateQueueDisplay();
    log('BUILD', `Template "${templateName}" applique: ${newItems.length} construction(s) ajoutee(s) a la file (prerequis inclus)`, 'success');

    if (buildData.enabled) processTownQueue(tid);
}

// ============================================================================

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
        templates: buildData.templates
    }));
}

function loadData() {
    const saved = GM_getValue('gu_build_data');
    if (saved) {
        try {
            const d = JSON.parse(saved);
            buildData = { ...buildData, ...d };
            if (!buildData.templates) buildData.templates = {};
        } catch(e) {}
    }
}
