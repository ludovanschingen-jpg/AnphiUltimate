(function(module) {
    const uw = module.uw;
    const log = module.log;
    const GM_getValue = module.GM_getValue;
    const GM_setValue = module.GM_setValue;

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

    // Organisation exacte des recherches par lignes (reflétant l'interface native de l'Académie)
    const RESEARCH_ROWS = [
        ['stone_cultivation', 'booty', 'espionage', 'slinger', 'archer', 'hoplite', 'town_guard', 'architecture', 'ceramics', 'crane', 'colony_ship', 'bireme', 'fire_ship', 'demolition_ship'],
        ['trireme', 'fast_transport', 'transport_ship', 'phalanx', 'ram', 'cartography', 'meteorology', 'code_of_laws', 'mathematics', 'plow', 'pillage', 'negotiation', 'cryptology']
    ];

    let buildData = {
        enabled: false, gratisEnabled: false,
        settings: { interval: 2, webhook: '' },
        stats: { built: 0, gratisClaimed: 0 },
        queues: {}, designerTemplate: {}, researchTemplate: {}, nextCheckTime: 0
    };

    let senateWatcherInterval = null;
    let gratisInterval = null;

    // --- FENÊTRE DÉPLAÇABLE ---
    function makeDraggable(elmnt, header) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            e = e || window.event;
            if (e.target.tagName.toLowerCase() === 'div' && e.target.textContent.includes('Fermer')) return;
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            elmnt.style.transform = 'none'; 
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // --- INTERFACE GLOBALE ---
    function injectGlobalUI() {
        if (!document.getElementById('gu-topbar-designer-btn')) {
            const btn = document.createElement('div');
            btn.id = 'gu-topbar-designer-btn';
            btn.innerHTML = '🏛️ Gestion';
            btn.title = "Ouvrir le Gestionnaire de Ville & Recherches";
            btn.style = `position: fixed; top: 5px; left: 140px; 
                         background: linear-gradient(180deg, #3b2a18, #1a1408); border: 2px solid #D4AF37; 
                         color: #FFD700; font-weight: bold; font-family: Cinzel, serif; font-size: 11px;
                         padding: 2px 10px; border-radius: 4px; cursor: pointer; z-index: 5000; 
                         box-shadow: 0 2px 4px rgba(0,0,0,0.8); text-shadow: 1px 1px 2px #000;`;
            
            btn.onmouseover = () => btn.style.borderColor = '#FFF';
            btn.onmouseout = () => btn.style.borderColor = '#D4AF37';
            btn.onclick = () => GU_Build.openDesigner();
            document.body.appendChild(btn);
        }

        if (!document.getElementById('gu-designer-modal')) {
            const modal = document.createElement('div');
            modal.id = 'gu-designer-modal';
            modal.style = `display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                           width: 1150px; background: #1a1408; border: 3px solid #8B6914; border-radius: 8px; 
                           z-index: 100000; box-shadow: 0 0 30px rgba(0,0,0,0.9); color: #F5DEB3;`;
            
            modal.innerHTML = `
                <div id="gu-designer-header" style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, #3b2a18, #1a1408); border-bottom: 2px solid #8B6914; padding: 10px 20px; cursor: move; border-top-left-radius: 6px; border-top-right-radius: 6px;">
                    <h2 style="margin: 0; font-family: Cinzel, serif; color: #FFD700; font-size: 22px;">🏛️ Gestionnaire de Ville & Recherches</h2>
                    <div style="cursor: pointer; font-weight: bold; color: #E53935; font-size: 16px; padding: 5px;" onclick="GU_Build.closeDesigner()">❌ Fermer</div>
                </div>
                
                <div style="padding: 20px; max-height: 75vh; overflow-y: auto;">
                    <div id="gu-modal-grid-content" style="background: rgba(0,0,0,0.4); padding: 25px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.2);">
                        <!-- Grille générée -->
                    </div>

                    <div style="display: flex; gap: 15px; margin-top: 25px; justify-content: center;">
                        <button onclick="GU_Build.importTown()" style="padding: 12px 25px; font-size: 14px; background: #7B1FA2; color: white; border: 1px solid #4A148C; border-radius: 4px; cursor: pointer; font-weight: bold;">📥 Importer la ville actuelle</button>
                        <button onclick="GU_Build.applyTemplate()" style="padding: 12px 25px; font-size: 14px; background: #1976D2; color: white; border: 1px solid #0D47A1; border-radius: 4px; cursor: pointer; font-weight: bold;">▶ Appliquer à la file d'attente</button>
                        <button onclick="GU_Build.saveTemplate()" style="padding: 12px 25px; font-size: 14px; background: #388E3C; color: white; border: 1px solid #1B5E20; border-radius: 4px; cursor: pointer; font-weight: bold;">💾 Sauvegarder Template</button>
                        <button onclick="GU_Build.resetDesigner()" style="padding: 12px 25px; font-size: 14px; background: #F57C00; color: white; border: 1px solid #E65100; border-radius: 4px; cursor: pointer; font-weight: bold;">🔄 Réinitialiser</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            makeDraggable(modal, document.getElementById("gu-designer-header"));
        }
    }

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

            <div class="bot-section" style="margin-top: 20px;">
                <button onclick="GU_Build.openDesigner()" style="width: 100%; padding: 12px; background: linear-gradient(180deg, #D4AF37, #8B6914); border: 1px solid #FFD700; color: #1a1408; font-weight: bold; font-family: Cinzel, serif; font-size: 12px; cursor: pointer; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
                    🏛️ OUVRIR LE DESIGNER
                </button>
            </div>
        `;
    };

    module.init = function() {
        injectGlobalUI();
        loadData();
        initializeDesignerTemplate();

        window.GU_Build = {
            updateDesigner: (bid, val) => updateDesignerLevel(bid, val),
            updateResearch: (rid, val) => updateResearchLevel(rid, val),
            openDesigner: () => {
                const modal = document.getElementById('gu-designer-modal');
                modal.style.top = '50%';
                modal.style.left = '50%';
                modal.style.transform = 'translate(-50%, -50%)';
                modal.style.display = 'block';
                renderDesignerModalGrid();
            },
            closeDesigner: () => { document.getElementById('gu-designer-modal').style.display = 'none'; },
            importTown: () => importTownLevelsToDesigner(),
            applyTemplate: () => generateQueueFromDesigner(),
            saveTemplate: () => saveDesignerTemplate(),
            resetDesigner: () => resetDesignerGrid()
        };
    };

    module.isActive = function() { return buildData.enabled; };

    function initializeDesignerTemplate() {
        if (!buildData.designerTemplate || Object.keys(buildData.designerTemplate).length === 0) {
            buildData.designerTemplate = {};
        }
        if (!buildData.researchTemplate) {
            buildData.researchTemplate = {};
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
        } catch (e) {}
    }

    function renderDesignerModalGrid() {
        const container = document.getElementById('gu-modal-grid-content');
        if (!container) return;

        let totalLevels = 0;
        const boxSize = 55;

        const createBuildingBox = (bid) => {
            const level = buildData.designerTemplate[bid] || 0;
            totalLevels += level;
            const borderCol = (LEFT_SPECIALS.includes(bid) || RIGHT_SPECIALS.includes(bid)) && level > 0 ? '#4CAF50' : '#8B6914';

            return `
                <div style="position: relative; width: ${boxSize}px; height: ${boxSize}px; border: 2px solid ${borderCol}; box-shadow: 2px 2px 6px #000; background: #1a1408; overflow: hidden;" title="${NAMES[bid]}">
                    <div style="width: 50px; height: 50px; transform: scale(1.1); position: absolute; top: 2px; left: 2px; pointer-events: none;">
                        <div class="building_icon ${bid}" style="width: 50px; height: 50px;"></div>
                    </div>
                    <input type="number" min="0" max="50" value="${level}" onchange="GU_Build.updateDesigner('${bid}', this.value)" 
                           style="position: absolute; bottom: 0; right: 0; width: 30px; height: 18px; background: rgba(0,0,0,0.85); border: 1px solid #D4AF37; color: #FFF; text-align: center; font-size: 11px; font-weight: bold; border-radius: 2px; padding: 0; box-sizing: border-box; z-index: 2;" />
                </div>
            `;
        };

        const createResearchBox = (rid) => {
            const resState = buildData.researchTemplate && buildData.researchTemplate[rid] ? 1 : 0;
            const borderCol = resState > 0 ? '#4CAF50' : '#8B6914';

            return `
                <div style="position: relative; width: ${boxSize}px; height: ${boxSize}px; border: 2px solid ${borderCol}; box-shadow: 2px 2px 6px #000; background: rgba(30,22,10,0.95); display: flex; align-items: center; justify-content: center; overflow: hidden;" title="${rid}">
                    <div style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
                        <div class="research_icon ${rid}" style="width: 45px; height: 45px; background-size: contain; background-repeat: no-repeat; background-position: center;"></div>
                    </div>
                    <input type="number" min="0" max="1" value="${resState}" onchange="GU_Build.updateResearch('${rid}', this.value)" 
                           style="position: absolute; bottom: 0; right: 0; width: 26px; height: 16px; background: rgba(0,0,0,0.85); border: 1px solid #D4AF37; color: #FFF; text-align: center; font-size: 10px; font-weight: bold; border-radius: 2px; padding: 0; box-sizing: border-box; z-index: 2;" />
                </div>
            `;
        };

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
                
                <!-- BÂTIMENTS CLASSIQUES -->
                <div style="width: 100%;">
                    <div style="font-size: 13px; color: #D4AF37; border-bottom: 1px solid rgba(212,175,55,0.3); margin-bottom: 10px; font-weight: bold; text-align: center;">BÂTIMENTS CLASSIQUES</div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;">
                        ${CLASSIC_BUILDINGS.map(createBuildingBox).join('')}
                    </div>
                </div>

                <!-- BÂTIMENTS SPÉCIAUX -->
                <div style="display: flex; justify-content: space-between; width: 85%; margin-top: 5px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 12px; color: #D4AF37; margin-bottom: 8px; font-weight: bold;">SPÉCIAUX GAUCHE (1 Max)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            ${LEFT_SPECIALS.map(createBuildingBox).join('')}
                        </div>
                    </div>
                    
                    <div style="display: flex; align-items: center; font-size: 18px; font-weight: bold; color: #4CAF50; padding: 0 20px;">
                        Total Niveaux: <span style="color:#FFD700; margin-left: 8px;">${totalLevels}</span>
                    </div>

                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 12px; color: #D4AF37; margin-bottom: 8px; font-weight: bold;">SPÉCIAUX DROITE (1 Max)</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            ${RIGHT_SPECIALS.map(createBuildingBox).join('')}
                        </div>
                    </div>
                </div>

                <!-- LIGNE DE SÉPARATION -->
                <div style="width: 100%; height: 2px; background: linear-gradient(to right, transparent, #D4AF37, transparent); margin: 10px 0;"></div>

                <!-- RECHERCHES DE L'ACADÉMIE (Lignes exactes comme sur l'image) -->
                <div style="width: 100%;">
                    <div style="font-size: 13px; color: #D4AF37; border-bottom: 1px solid rgba(212,175,55,0.3); margin-bottom: 10px; font-weight: bold; text-align: center;">RECHERCHES DE L'ACADÉMIE</div>
                    <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
                        <div style="display: flex; justify-content: center; gap: 6px; flex-wrap: wrap;">
                            ${RESEARCH_ROWS[0].map(createResearchBox).join('')}
                        </div>
                        <div style="display: flex; justify-content: center; gap: 6px; flex-wrap: wrap;">
                            ${RESEARCH_ROWS[1].map(createResearchBox).join('')}
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
        buildData.designerTemplate[bid] = num;
        saveData();
        renderDesignerModalGrid();
    }

    function updateResearchLevel(rid, val) {
        let num = parseInt(val) || 0;
        if (num < 0) num = 0; if (num > 1) num = 1;
        if (!buildData.researchTemplate) buildData.researchTemplate = {};
        buildData.researchTemplate[rid] = num;
        saveData();
        renderDesignerModalGrid();
    }

    function saveDesignerTemplate() { saveData(); }
    function resetDesignerGrid() { 
        for (let key in buildData.designerTemplate) buildData.designerTemplate[key] = 0; 
        for (let key in buildData.researchTemplate) buildData.researchTemplate[key] = 0; 
        saveData(); 
        renderDesignerModalGrid(); 
    }

    function generateQueueFromDesigner() { GU_Build.closeDesigner(); }
    function saveData() { GM_setValue('gu_build_data', JSON.stringify(buildData)); }
    function loadData() { const s = GM_getValue('gu_build_data'); if (s) try { Object.assign(buildData, JSON.parse(s)); } catch(e) {} }

})(module);
