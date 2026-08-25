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
                           width: 1150px; background: #1a1408; border: 3px solid #8B6914; border-radius: 8px; 
                           z-index: 100000; box-shadow: 0 0 30px rgba(0,0,0,0.9); color: #F5DEB3;`;
            
            modal.innerHTML = `
                <div id="gu-designer-header" style="display: flex; justify-content: space-between; align-items: center; background: linear-gradient(to bottom, #3b2a18, #1a1408); border-bottom: 2px solid #8B6914; padding: 10px 20px; cursor: move; border-top-left-radius: 6px; border-top-right-radius: 6px;">
                    <h2 style="margin: 0; font-family: Cinzel, serif; color: #FFD700; font-size: 22px;">🏛️ Gestionnaire de Ville & Recherches</h2>
                    <div style="cursor: pointer; font-weight: bold; color: #E53935; font-size: 16px; padding: 5px;" onclick="GU_Build.closeDesigner()">❌ Fermer</div>
                </div>
                
                <div style="padding: 20px; max-height: 75vh; overflow-y: auto;">
                    <div id="gu-modal-grid-content" style="background: rgba(0,0,0,0.4); padding: 25px; border-radius: 6px; border: 1px solid rgba(212,175,55,0.2);">
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
                modal.style.display = 'block';
                renderGrid();
            },
            closeDesigner: () => { document.getElementById('gu-designer-modal').style.display = 'none'; }
        };
    };

    module.isActive = function() { return false; };

    function renderGrid() {
        const container = document.getElementById('gu-modal-grid-content');
        if (!container) return;

        const boxSize = 55;

        const createBuildingBox = (bid) => `
            <div style="position: relative; width: ${boxSize}px; height: ${boxSize}px; border: 2px solid #8B6914; background: #1a1408; overflow: hidden;" title="${NAMES[bid]}">
                <div style="width: 50px; height: 50px; transform: scale(1.1); position: absolute; top: 2px; left: 2px; pointer-events: none;">
                    <div class="building_icon ${bid}" style="width: 50px; height: 50px;"></div>
                </div>
            </div>
        `;

        const createResearchBox = (rid) => `
            <div style="position: relative; width: ${boxSize}px; height: ${boxSize}px; border: 2px solid #8B6914; background: rgba(30,22,10,0.95); display: flex; align-items: center; justify-content: center; overflow: hidden;" title="${rid}">
                <div style="width: 45px; height: 45px; pointer-events: none; background: url('https://gpit.innogamescdn.com/images/game/researches/${rid}.png') center center no-repeat; background-size: contain;"></div>
            </div>
        `;

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 20px; align-items: center;">
                <div style="width: 100%;">
                    <div style="font-size: 13px; color: #D4AF37; border-bottom: 1px solid rgba(212,175,55,0.3); margin-bottom: 10px; font-weight: bold; text-align: center;">BÂTIMENTS CLASSIQUES</div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;">
                        ${CLASSIC_BUILDINGS.map(createBuildingBox).join('')}
                    </div>
                </div>

                <div style="display: flex; justify-content: space-between; width: 85%; margin-top: 5px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 12px; color: #D4AF37; margin-bottom: 8px; font-weight: bold;">SPÉCIAUX GAUCHE</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            ${LEFT_SPECIALS.map(createBuildingBox).join('')}
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div style="font-size: 12px; color: #D4AF37; margin-bottom: 8px; font-weight: bold;">SPÉCIAUX DROITE</div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            ${RIGHT_SPECIALS.map(createBuildingBox).join('')}
                        </div>
                    </div>
                </div>

                <div style="width: 100%; height: 2px; background: linear-gradient(to right, transparent, #D4AF37, transparent); margin: 10px 0;"></div>

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

})(module);
