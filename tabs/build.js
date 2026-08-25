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

    // Coordonnées exactes et vérifiées de la sprite sheet des bâtiments (500x150 px)
    const SPRITES = { 
        academy: [0, 0], barracks: [50, 0], docks: [100, 0], farm: [150, 0], 
        hide: [200, 0], ironer: [250, 0], library: [300, 0], lighthouse: [350, 0], 
        lumber: [400, 0], main: [450, 0], 
        market: [0, 50], oracle: [100, 50], statue: [150, 50], 
        stoner: [200, 50], storage: [250, 50], temple: [300, 50], theater: [350, 50], 
        thermal: [400, 50], tower: [450, 50], 
        wall: [0, 100], trade_office: [50, 100] 
    };

    // Organisation exacte des recherches sur deux lignes
    const RESEARCH_ROWS = [
        ['stone_cultivation', 'booty', 'espionage', 'slinger', 'archer', 'hoplite', 'town_guard', 'architecture', 'ceramics', 'crane', 'colony_ship', 'bireme', 'fire_ship', 'demolition_ship'],
        ['trireme', 'fast_transport', 'transport_ship', 'phalanx', 'ram', 'cartography', 'meteorology', 'code_of_laws', 'mathematics', 'plow', 'pillage', 'negotiation', 'cryptology']
    ];

    let buildData = {
        designerTemplate: {}, researchTemplate: {}
    };

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
            
            btn.onclick = () => GU_Build.openDesigner();
            document.body.appendChild(btn);
        }

        if (!document.getElementById('gu-designer-modal')) {
            const modal = document.createElement('div');
            modal.id = 'gu-designer-modal';
            modal.style = `display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                           width: 1150px; background: #f3e5c8; border: 3px solid #8B6914; border-radius: 4px; 
                           z-index: 100000; box-shadow: 0 0 30px rgba(0,0,0,0.9); color: #3b2a18;`;
            
            modal.innerHTML = `
                <div id="gu-designer-header" style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, #d4be94, #b59b6c); border-bottom: 2px solid #8B6914; padding: 8px 15px; cursor: move;">
                    <h2 style="margin: 0; font-family: Cinzel, serif; color: #3b2a18; font-size: 16px; font-weight: bold;">Gestionnaire de Ville & Recherches</h2>
                    <div style="cursor: pointer; font-weight: bold; color: #8b0000; font-size: 14px; padding: 2px 6px;" onclick="GU_Build.closeDesigner()">✕ Fermer</div>
                </div>
                
                <div style="padding: 15px; max-height: 75vh; overflow-y: auto;">
                    <div id="gu-modal-grid-content">
                        <!-- Grille -->
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            makeDraggable(modal, document.getElementById("gu-designer-header"));
        }
    }

    module.render = function(container) {
        container.innerHTML = `
            <div class="bot-section">
                <button onclick="GU_Build.openDesigner()" style="width: 100%; padding: 12px; background: linear-gradient(180deg, #D4AF37, #8B6914); border: 1px solid #FFD700; color: #1a1408; font-weight: bold; font-family: Cinzel, serif; font-size: 12px; cursor: pointer; border-radius: 4px;">
                    🏛️ OUVRIR LE DESIGNER
                </button>
            </div>
        `;
    };

    module.init = function() {
        injectGlobalUI();
        window.GU_Build = {
            openDesigner: () => {
                const modal = document.getElementById('gu-designer-modal');
                modal.style.top = '50%';
                modal.style.left = '50%';
                modal.style.transform = 'translate(-50%, -50%)';
                modal.style.display = 'block';
                renderGrid();
            },
            closeDesigner: () => { document.getElementById('gu-designer-modal').style.display = 'none'; },
            updateDesigner: (bid, val) => {
                if (!buildData.designerTemplate) buildData.designerTemplate = {};
                buildData.designerTemplate[bid] = parseInt(val) || 0;
                saveData();
            },
            updateResearch: (rid, val) => {
                if (!buildData.researchTemplate) buildData.researchTemplate = {};
                buildData.researchTemplate[rid] = parseInt(val) || 0;
                saveData();
            }
        };
    };

    module.isActive = function() { return false; };

    function renderGrid() {
        const container = document.getElementById('gu-modal-grid-content');
        if (!container) return;

        const boxSize = 50;

        const createBuildingBox = (bid) => {
            const sp = SPRITES[bid] || [0, 0];
            const level = buildData.designerTemplate[bid] || 0;
            return `
                <div style="position: relative; width: ${boxSize}px; height: ${boxSize}px; border: 1px solid #7c5c23; background: url('https://gpit.innogamescdn.com/images/game/main/buildings_sprite_50x50.png') no-repeat -${sp[0]}px -${sp[1]}px; background-size: 500px 150px; box-shadow: inset 0 0 3px rgba(0,0,0,0.2); overflow: hidden;" title="${NAMES[bid]}">
                    <input type="number" min="0" max="50" value="${level}" onchange="GU_Build.updateDesigner('${bid}', this.value)" 
                           style="position: absolute; bottom: 1px; right: 1px; width: 26px; height: 16px; background: rgba(0,0,0,0.8); border: 1px solid #7c5c23; color: #fff; text-align: center; font-size: 10px; font-weight: bold; z-index: 2;" />
                </div>
            `;
        };

        const createResearchBox = (rid) => {
            const resState = buildData.researchTemplate && buildData.researchTemplate[rid] ? buildData.researchTemplate[rid] : 0;
            return `
                <div style="position: relative; width: ${boxSize}px; height: ${boxSize}px; border: 1px solid #7c5c23; background: rgba(255,255,255,0.7); box-shadow: inset 0 0 3px rgba(0,0,0,0.2); overflow: hidden;" title="${rid}">
                    <div style="width: 50px; height: 50px; position: absolute; top: 0; left: 0; pointer-events: none; background: url('https://gpit.innogamescdn.com/images/game/researches/${rid}.png') center center no-repeat; background-size: contain;"></div>
                    <input type="number" min="0" max="1" value="${resState}" onchange="GU_Build.updateResearch('${rid}', this.value)" 
                           style="position: absolute; bottom: 1px; right: 1px; width: 26px; height: 16px; background: rgba(0,0,0,0.8); border: 1px solid #7c5c23; color: #fff; text-align: center; font-size: 10px; font-weight: bold; z-index: 2;" />
                </div>
            `;
        };

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
                
                <!-- BÂTIMENTS CLASSIQUES -->
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 3px;">
                    ${CLASSIC_BUILDINGS.map(createBuildingBox).join('')}
                </div>

                <!-- BÂTIMENTS SPÉCIAUX -->
                <div style="display: flex; justify-content: space-between; width: 100%; padding: 0 40px; box-sizing: border-box;">
                    <div style="display: flex; gap: 3px;">
                        ${LEFT_SPECIALS.map(createBuildingBox).join('')}
                    </div>
                    <div style="display: flex; gap: 3px;">
                        ${RIGHT_SPECIALS.map(createBuildingBox).join('')}
                    </div>
                </div>

                <!-- LIGNE DE SÉPARATION -->
                <div style="width: 100%; height: 1px; background: #7c5c23; margin: 10px 0;"></div>

                <!-- RECHERCHES DE L'ACADÉMIE -->
                <div style="display: flex; flex-direction: column; gap: 3px; align-items: center; width: 100%;">
                    <div style="display: flex; justify-content: center; gap: 3px; flex-wrap: wrap;">
                        ${RESEARCH_ROWS[0].map(createResearchBox).join('')}
                    </div>
                    <div style="display: flex; justify-content: center; gap: 3px; flex-wrap: wrap;">
                        ${RESEARCH_ROWS[1].map(createResearchBox).join('')}
                    </div>
                </div>

            </div>
        `;
    }

    function saveData() { GM_setValue('gu_build_data', JSON.stringify(buildData)); }
    function loadData() { const s = GM_getValue('gu_build_data'); if (s) try { Object.assign(buildData, JSON.parse(s)); } catch(e) {} }

})(module);
