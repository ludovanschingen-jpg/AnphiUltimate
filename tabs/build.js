// Builder revision 2026-08-26 — bâtiments actuels + prérequis visuels + recherches
// Corrections appliquées :
//  1) processAllQueues : chaque ville est désormais traitée dans un try/catch
//     dédié pour qu'une exception inattendue sur une ville ne bloque plus
//     le passage aux villes suivantes dans la même routine.
//  2) processTownActionQueue : ajout de hasPendingBuildingOrder() pour
//     distinguer une recherche "juste en attente" (Académie déjà en
//     construction) d'une recherche réellement bloquée (aucune construction
//     d'Académie en cours) qui doit désormais faire passer à la ville suivante.
const uw = module.uw;
const log = module.log;
const GM_getValue = module.GM_getValue;
const GM_setValue = module.GM_setValue;
const GM_xmlhttpRequest = module.GM_xmlhttpRequest;

// Données Grepolis dynamiques : alignées sur GameData utilisé par GrepolisInjected.
// On n'utilise plus l'ancien sprite atlas du wiki pour identifier les bâtiments.
const NAMES = {
    main:'Senat', lumber:'Scierie', farm:'Ferme', stoner:'Carriere', storage:'Entrepot',
    ironer:'Mine', barracks:'Caserne', temple:'Temple', market:'Marche', docks:'Port',
    academy:'Academie', wall:'Remparts', hide:'Grotte', thermal:'Thermes', library:'Bibliotheque',
    lighthouse:'Phare', tower:'Tour', statue:'Statue', oracle:'Oracle',
    trade_office:'Comptoir', theater:'Theatre'
};
const NORMAL_BUILDINGS = ['main','lumber','farm','stoner','storage','ironer','barracks','temple','market','docks','academy','wall','hide'];
const SPECIAL_LEFT = ['theater','thermal','library','lighthouse'];
const SPECIAL_RIGHT = ['tower','statue','oracle','trade_office'];

const BUILDING_MAX_LEVELS = {
    main:25,lumber:40,farm:45,stoner:40,storage:35,ironer:40,barracks:30,temple:30,
    market:30,docks:30,academy:36,wall:25,hide:10,
    theater:1,thermal:1,library:1,lighthouse:1,tower:1,statue:1,oracle:1,trade_office:1
};

// Liste issue directement de Palette.tsx de l'autre script.
const RESEARCH_KEY_PREFIX = '__research__';

// Ordre conforme au tableau du Wiki FR : 1 / 4 / 7 / 10 / 13 / 16 / 19 / 22 / 25 / 28 / 31 / 34.
// Les identifiants sont ceux utilisés par l'autre script (GameData/GrepoAuto).
const RESEARCH_LEVEL_GROUPS = {
    1:  ['slinger','archer','town_guard'],
    4:  ['hoplite','meteorology'],
    7:  ['espionage','diplomacy','pottery'],
    10: ['rider','architecture','instructor'],
    13: ['bireme','building_crane','shipwright','colonize_ship'],
    16: ['chariot','attack_ship','conscription'],
    19: ['demolition_ship','catapult','cryptography','democracy'],
    22: ['small_transporter','plow','berth'],
    25: ['trireme','phalanx','breach','mathematics'],
    28: ['ram','cartography','take_over','take_over_old'],
    31: ['stone_storm','temple_looting','divine_selection'],
    34: ['combat_experience','strong_wine','set_sail']
};

const RESEARCH_IDS = [...new Set(Object.values(RESEARCH_LEVEL_GROUPS).flat())];
const RESEARCH_FALLBACK = {
    slinger:{name:'Frondeur',academy:1}, archer:{name:'Archer',academy:1}, town_guard:{name:'Gardes de la cité',academy:1},
    hoplite:{name:'Hoplite',academy:4}, meteorology:{name:'Météorologie',academy:4},
    espionage:{name:'Espionnage',academy:7}, diplomacy:{name:'Loyauté des villageois',academy:7}, pottery:{name:'Céramique',academy:7},
    rider:{name:'Cavalier',academy:10}, architecture:{name:'Architecture',academy:10}, instructor:{name:'Instructeur',academy:10},
    bireme:{name:'Birème',academy:13}, building_crane:{name:'Grue',academy:13}, shipwright:{name:'Constructeur naval',academy:13}, colonize_ship:{name:'Navire de colonisation',academy:13},
    chariot:{name:'Char',academy:16}, attack_ship:{name:'Bateau-feu',academy:16}, conscription:{name:'Conscription',academy:16},
    demolition_ship:{name:'Brûlot',academy:19}, catapult:{name:'Catapulte',academy:19}, cryptography:{name:'Cryptographie',academy:19}, democracy:{name:'Démocratie',academy:19},
    small_transporter:{name:'Navire de transport rapide',academy:22}, plow:{name:'Charrue',academy:22}, berth:{name:'Couchettes',academy:22},
    trireme:{name:'Trière',academy:25}, phalanx:{name:'Phalange',academy:25}, breach:{name:'Percée',academy:25}, mathematics:{name:'Mathématiques',academy:25},
    ram:{name:'Bélier',academy:28}, cartography:{name:'Cartographie',academy:28}, take_over:{name:'Conquête',academy:28}, take_over_old:{name:'Révolte',academy:28},
    stone_storm:{name:'Grêle de pierres',academy:31}, temple_looting:{name:'Pillage de temple',academy:31}, divine_selection:{name:'Sélection divine',academy:31},
    combat_experience:{name:'Expérience de combat',academy:34}, strong_wine:{name:'Vin puissant',academy:34}, set_sail:{name:'Mettre les voiles',academy:34},
    // Variantes présentes dans l'autre script : conservées si GameData les expose.
    booty_bpv:{name:'Butin',academy:7}, booty:{name:'Butin',academy:7}
};


function getBuildingData(bid){ return uw.GameData?.buildings?.[bid] || null; }
function getBuildingName(bid){ return getBuildingData(bid)?.name || NAMES[bid] || bid; }
function getBuildingMaxLevel(bid){ return Number(getBuildingData(bid)?.max_level ?? BUILDING_MAX_LEVELS[bid] ?? 30); }

// Prérequis bâtiments : Grepolis n'expose pas toujours ces données sous la même
// propriété selon la version du client. On essaie plusieurs formats natifs puis
// on utilise une table de secours correspondant aux bâtiments actuels.
const BUILDING_DEPENDENCY_FALLBACK = {
    // Bâtiments disponibles dès le début / sans prérequis de construction.
    main:[],
    lumber:[],
    farm:[],
    stoner:[],
    storage:[],

    // Bâtiments normaux.
    ironer:[['lumber',1]],
    barracks:[['ironer',1],['main',2],['farm',3],['lumber',1]],
    temple:[['stoner',1]],
    market:[['main',3],['storage',5]],
    docks:[['main',14],['lumber',15],['ironer',10]],
    academy:[['main',8],['farm',6],['barracks',5]],
    wall:[['main',5],['temple',3]],
    hide:[['main',10],['storage',7],['market',4]],

    // Bâtiments spéciaux — emplacement gauche.
    theater:[['main',24],['lumber',35],['ironer',32],['docks',5],['academy',5]],
    thermal:[['main',24],['farm',35],['docks',5],['academy',5]],
    library:[['main',24],['docks',5],['academy',20]],
    lighthouse:[['main',24],['docks',20],['academy',5]],

    // Bâtiments spéciaux — emplacement droit.
    tower:[['main',21],['wall',20],['temple',5],['market',5]],
    statue:[['main',21],['temple',12],['market',5]],
    oracle:[['main',21],['hide',10],['market',5],['temple',5]],
    trade_office:[['main',21],['market',15],['temple',5]]
};

function normalizeBuildingDependencies(raw){
    if(!raw) return [];
    if(Array.isArray(raw)){
        const rows=[];
        for(const item of raw){
            if(Array.isArray(item) && item.length>=2){
                const id=String(item[0]), lvl=Number(item[1]);
                if(Number.isFinite(lvl) && lvl>0) rows.push([id,lvl]);
            }else if(item && typeof item==='object'){
                const id=item.building||item.id||item.type||item.building_id;
                const lvl=item.level??item.required_level??item.value;
                const n=Number(lvl);
                if(id && Number.isFinite(n) && n>0) rows.push([String(id),n]);
            }
        }
        return rows.filter(([id])=>NORMAL_BUILDINGS.includes(id)||SPECIAL_LEFT.includes(id)||SPECIAL_RIGHT.includes(id));
    }
    if(typeof raw==='object'){
        const nested=raw.buildings||raw.building||raw.dependencies||raw.requirements||raw.prerequisites;
        if(nested && nested!==raw){
            const n=normalizeBuildingDependencies(nested);
            if(n.length) return n;
        }
        return Object.entries(raw)
            .map(([id,lvl])=>[String(id),Number(typeof lvl==='object' ? (lvl.level??lvl.required_level??lvl.value) : lvl)])
            .filter(([id,lvl])=>(NORMAL_BUILDINGS.includes(id)||SPECIAL_LEFT.includes(id)||SPECIAL_RIGHT.includes(id))&&Number.isFinite(lvl)&&lvl>0);
    }
    return [];
}

function getBuildingDependencies(bid){
    // Pour les bâtiments du Builder, la table explicite est la source de vérité.
    // Cela évite qu'une structure GameData différente selon le monde/client
    // masque ou remplace les prérequis attendus.
    if(Object.prototype.hasOwnProperty.call(BUILDING_DEPENDENCY_FALLBACK,bid)){
        return BUILDING_DEPENDENCY_FALLBACK[bid].map(([id,lvl])=>[id,lvl]);
    }

    const data=getBuildingData(bid);
    const candidates=[
        data?.dependencies,
        data?.building_dependencies,
        data?.requirements,
        data?.prerequisites,
        data?.build_dependencies,
        data?.buildings?.dependencies,
        data?.construction?.dependencies
    ];
    for(const raw of candidates){
        const deps=normalizeBuildingDependencies(raw);
        if(deps.length) return deps;
    }
    return [];
}
function getResearchData(rid){ return uw.GameData?.researches?.[rid] || null; }
function getResearchName(rid){ return getResearchData(rid)?.name || RESEARCH_FALLBACK[rid]?.name || rid; }
function getResearchAcademyLevel(rid){
    const data=getResearchData(rid);
    const candidates=[
        data?.building_dependencies?.academy,
        data?.academy_level,
        data?.academy,
        data?.building_requirements?.academy,
        RESEARCH_FALLBACK[rid]?.academy
    ];
    for(const v of candidates){ const n=Number(v); if(Number.isFinite(n)&&n>0) return n; }
    return 0;
}
function getResearchIdsAvailable(){
    const native=Object.keys(uw.GameData?.researches||{});
    const available=RESEARCH_IDS.filter(rid=>native.length===0 || native.includes(rid));
    const extras=native.filter(rid=>!RESEARCH_IDS.includes(rid)).filter(rid=>getResearchData(rid));
    return [...new Set([...available,...extras])];
}
function getResearchSortKey(rid){
    const level=getResearchAcademyLevel(rid);
    const groups=Object.entries(RESEARCH_LEVEL_GROUPS);
    for(let i=0;i<groups.length;i++){
        const ids=groups[i][1];
        const idx=ids.indexOf(rid);
        if(idx!==-1) return [Number(groups[i][0]),idx,0];
    }
    return [level||999,999,1];
}
function getResearchIdsSorted(){
    return getResearchIdsAvailable().sort((a,b)=>{
        const ka=getResearchSortKey(a), kb=getResearchSortKey(b);
        return ka[0]-kb[0] || ka[2]-kb[2] || ka[1]-kb[1] || getResearchName(a).localeCompare(getResearchName(b),'fr');
    });
}

// Ancien mapping utilisé seulement pour reconnaître les intitulés du Sénat.
const FR_TO_ID = {
    senat:'main', sénat:'main', scierie:'lumber', ferme:'farm', carriere:'stoner', carrière:'stoner',
    entrepot:'storage', entrepôt:'storage', mine:'ironer', "mine d'argent":'ironer', argent:'ironer',
    caserne:'barracks', temple:'temple', marche:'market', marché:'market', port:'docks',
    academie:'academy', académie:'academy', remparts:'wall', muraille:'wall', grotte:'hide',
    thermes:'thermal', bibliotheque:'library', bibliothèque:'library', phare:'lighthouse', tour:'tower',
    statue:'statue', 'statue divine':'statue', oracle:'oracle', comptoir:'trade_office', theatre:'theater', théâtre:'theater'
};

// Reste du fallback conservé pour compatibilité avec les anciennes données.
const REQUIREMENTS = {};
let buildData = {
    enabled: false,
    gratisEnabled: false,
    settings: { interval: 10, webhook: '', humanizer: true, humanizerMinDelay: 1000, humanizerMaxDelay: 2000, humanizerTownMinDelay: 1200, humanizerTownMaxDelay: 2400 },
    stats: { built: 0, gratisClaimed: 0 },
    queues: {},
    researchQueues: {},
    actionQueues: {},
    activeTemplates: {},
    templates: {},
    nextCheckTime: 0
};

let senateWatcherInterval = null;
let gratisInterval = null;
let fillInterval = null;
let templateEditOrder = [];
let lastTemplateUiTownId = null;

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

                <div id="tpl-normal-grid" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; padding:10px; background:rgba(0,0,0,0.2); border-radius:6px;">
                    ${NORMAL_BUILDINGS.map(renderNormalBuildingCell).join('')}
                </div>

                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px;">
                        <div style="font-size:10px;color:#D4AF37;text-align:center;margin-bottom:8px;font-family:Cinzel,serif;">Speciaux — Emplacement Gauche</div>
                        <div id="tpl-special-left" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">${SPECIAL_LEFT.map(renderSpecialCell).join('')}</div>
                    </div>
                    <div style="flex:1; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px;">
                        <div style="font-size:10px;color:#D4AF37;text-align:center;margin-bottom:8px;font-family:Cinzel,serif;">Speciaux — Emplacement Droite</div>
                        <div id="tpl-special-right" style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">${SPECIAL_RIGHT.map(renderSpecialCell).join('')}</div>
                    </div>
                </div>

                <div style="padding:8px;margin-bottom:12px;background:rgba(0,0,0,0.2);border-radius:6px;border:1px solid rgba(212,175,55,0.2);">
                    <div style="font-size:10px;color:#D4AF37;text-align:center;margin-bottom:8px;font-family:Cinzel,serif;">Recherches — Académie</div>
                    <div id="tpl-research-grid" style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-height:230px;overflow-y:auto;">
                        ${getResearchIdsSorted().map(renderResearchCell).join('')}
                    </div>
                </div>

                <div id="tpl-prereq-preview" style="padding:8px;margin-bottom:12px;background:linear-gradient(180deg,rgba(212,175,55,0.08),rgba(0,0,0,0.22));border:1px solid rgba(212,175,55,0.35);border-radius:6px;">
                    <div style="font-size:10px;color:#FFD700;margin-bottom:7px;font-family:Cinzel,serif;">📋 File de construction</div>
                    <div id="tpl-prereq-list" style="display:flex;flex-direction:column;gap:4px;max-height:210px;overflow-y:auto;"><div style="font-size:10px;color:#8B8B83;font-style:italic;">La file apparaîtra ici dans l'ordre exact d'exécution.</div></div>
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
                    <button id="tpl-reset-btn" title="Réinitialiser le template en cours" aria-label="Réinitialiser le template en cours"
                        style="background:linear-gradient(145deg,#64B5F6,#1E5A92); border:1px solid #90CAF9; color:#F5FAFF; font-weight:bold; width:34px; height:30px; padding:0; border-radius:4px; cursor:pointer; font-size:18px; line-height:28px; display:flex; align-items:center; justify-content:center;">
                        ↻
                    </button>
                    <button id="tpl-delete-btn" title="Supprimer le template"
                        style="background:linear-gradient(145deg,#E57373,#8B3A3A); border:1px solid #FFCDD2; color:#2a0d0d; font-weight:bold; padding:7px 10px; border-radius:4px; cursor:pointer; font-size:11px;">
                        🗑️
                    </button>
                </div>
                <div style="margin-top:8px;">
                    <button id="tpl-apply-all-btn"
                        style="width:100%; background:linear-gradient(145deg,#9575CD,#4A2E7A); border:1px solid #D1C4E9; color:#F5F0FF; font-weight:bold; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:11px;">
                        🌍 Appliquer a TOUTES mes villes
                    </button>
                    <div style="font-size:9px;color:#8B8B83;margin-top:4px;text-align:center;">
                        Applique le template selectionne a chacune de vos villes (chacune reçoit son propre plan calcule selon ses niveaux actuels).
                    </div>
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
                        <option value="5">5 minutes</option>
                        <option value="10">10 minutes</option>
                        <option value="20">20 minutes</option>
                        <option value="40">40 minutes</option>
                    </select>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:8px;background:rgba(0,0,0,0.2);border-radius:6px;">
                    <div>
                        <div style="font-size:11px;color:#D4AF37;">Humaniser les actions</div>
                        <div style="font-size:9px;color:#8B8B83;max-width:280px;">Traite les villes une par une avec des délais variables avant chaque action et entre les villes.</div>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="toggle-humanizer">
                        <span class="toggle-slider"></span>
                    </label>
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
    const max=getBuildingMaxLevel(bid);
    return `<div style="width:76px;text-align:center;">
        <div title="${getBuildingName(bid)}" style="width:50px;height:50px;background:#1a1a14;border:2px solid #8B6914;border-radius:4px;margin:0 auto;">
            <div style="width:100%;height:100%;background:url(https://gpfr.innogamescdn.com/images/game/main/${bid}.png) center/cover no-repeat;"></div>
        </div>
        <select class="tpl-mode-select" data-bid="${bid}" title="Mode pour ${getBuildingName(bid)}" style="width:72px;background:#1a1a14;border:1px solid #6b5a32;color:#D4AF37;font-size:8px;border-radius:3px;margin-top:3px;padding:1px 0;">
            <option value="upgrade">Améliorer</option>
            <option value="demolish">Démolir</option>
        </select>
        <input type="number" class="tpl-level-input" data-bid="${bid}" min="0" max="${max}" value="0" title="${getBuildingName(bid)}"
            style="width:48px;background:#1a1a14;border:1px solid #8B6914;color:#FFD700;text-align:center;font-size:11px;border-radius:3px;margin-top:3px;padding:2px 0;">
    </div>`;
}
function renderSpecialCell(bid) {
    return `<div class="tpl-special-cell" data-bid="${bid}" data-selected="0" title="${getBuildingName(bid)}" style="width:78px;text-align:center;cursor:pointer;user-select:none;">
        <div class="tpl-special-icon" style="width:50px;height:50px;background:#1a1a14;border:2px solid #4a4a3a;border-radius:4px;margin:0 auto;overflow:hidden;">
            <div style="width:100%;height:100%;background:url(https://gpfr.innogamescdn.com/images/game/main/${bid}.png) center/cover no-repeat;opacity:0.48;"></div>
        </div>
        <select class="tpl-mode-select" data-bid="${bid}" title="Mode pour ${getBuildingName(bid)}" style="width:72px;background:#1a1a14;border:1px solid #6b5a32;color:#D4AF37;font-size:8px;border-radius:3px;margin-top:3px;padding:1px 0;">
            <option value="upgrade">Améliorer</option>
            <option value="demolish">Démolir</option>
        </select>
        <input type="number" class="tpl-special-level-input" data-bid="${bid}" min="0" max="1" value="0" title="Niveau cible" style="width:42px;background:#1a1a14;border:1px solid #8B6914;color:#FFD700;text-align:center;font-size:10px;border-radius:3px;margin-top:3px;padding:1px 0;">
    </div>`;
}
function renderResearchCell(rid) {
    const academy=getResearchAcademyLevel(rid), name=getResearchName(rid);
    return `<div class="tpl-research-cell" data-rid="${rid}" data-selected="0" title="${name} — Académie ${academy}" style="width:48px;height:48px;cursor:pointer;user-select:none;position:relative;opacity:0.48;border:2px solid #4a4a3a;border-radius:4px;background:#1a1a14;overflow:hidden;">
        <div class="ga_action_icon research_icon research ${rid}" style="width:40px;height:40px;margin:2px auto 0;"></div>
        <span style="position:absolute;right:1px;bottom:1px;background:rgba(0,0,0,0.85);color:#FFD700;font-size:8px;font-weight:bold;padding:1px 3px;border-radius:3px;">${academy}</span>
    </div>`;
}

module.init = function() {
    loadData();
    
    document.getElementById('toggle-build').checked = buildData.enabled;
    document.getElementById('toggle-gratis').checked = buildData.gratisEnabled;
    document.getElementById('build-interval').value = buildData.settings.interval;
    const humanizerToggle=document.getElementById('toggle-humanizer');
    if(humanizerToggle) humanizerToggle.checked = buildData.settings.humanizer !== false;
    updateStats();
    updateQueueDisplay();
    
    document.getElementById('toggle-build').onchange = (e) => toggleBuild(e.target.checked);
    document.getElementById('toggle-gratis').onchange = (e) => toggleGratis(e.target.checked);
    if(humanizerToggle) humanizerToggle.onchange = (e) => { buildData.settings.humanizer=e.target.checked; saveData(); log('BUILD', e.target.checked ? 'Humaniser activé' : 'Humaniser désactivé', 'info'); };
    document.getElementById('build-interval').onchange = (e) => {
        buildData.settings.interval = parseInt(e.target.value);
        saveData();
        log('BUILD', 'Intervalle: ' + e.target.value + ' min', 'info');
        if (buildData.enabled) {
            buildData.nextCheckTime = Date.now() + buildData.settings.interval * 60000;
            processAllQueues();
        }
    };

    // Les sections du Builder restent ouvertes en permanence.
    document.querySelectorAll('#tab-build .section-header').forEach(h => {
        h.classList.remove('collapsed');
        const c = h.nextElementSibling;
        if (c) c.style.display = 'block';
        h.onclick = (e) => { e.preventDefault(); e.stopPropagation(); };
    });

    // --- Templates de construction ---
    initSpecialToggleHandlers();
    initResearchToggleHandlers();
    initTemplateInputHandlers();
    initSpecialLevelInputHandlers();
    initTemplateModeHandlers();
    refreshTemplateSelect();
    refreshTemplatePrerequisites();
    renderExecutionQueuePreview();
    syncTemplateUIForCurrentTown(true);

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
    document.getElementById('tpl-apply-all-btn').onclick = () => {
        const sel = document.getElementById('tpl-select');
        const name = sel.value;
        if (!name) { log('BUILD', 'Selectionnez un template a appliquer', 'error'); return; }
        applyTemplateToAllTowns(name);
    };
    document.getElementById('tpl-reset-btn').onclick = resetCurrentTemplateUI;
    document.getElementById('tpl-select').onchange = (e) => {
        const name = e.target.value;
        if (name && buildData.templates[name]) loadTemplateIntoUI(buildData.templates[name]);
    };

    if (!buildData.researchQueues) buildData.researchQueues = {};
    if (!buildData.actionQueues) buildData.actionQueues = {};
    if (!buildData.activeTemplates) buildData.activeTemplates = {};
    if (buildData.enabled) { toggleBuild(true); }

    if (buildData.gratisEnabled) {
        toggleGratis(true);
    }

    startSenateWatcher();
    startTimer();
    
    window.GU_Build = {
        add: (bid, lvl) => addToQueue(bid, lvl),
        remove: (idx) => removeFromQueue(idx),
        removeAction: (idx) => removeActionFromQueue(idx)
    };

    log('BUILD', 'Module initialise', 'info');
};

module.isActive = function() {
    return buildData.enabled || buildData.gratisEnabled;
};

module.onActivate = function(container) {
    updateStats();
    updateQueueDisplay();
    syncTemplateUIForCurrentTown(true);
    refreshTemplateSelect(buildData.activeTemplates?.[String(uw.Game?.townId)] || undefined);
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

        // Une routine parcourt les villes une seule fois.
        // Les villes bloquees attendent la prochaine routine du timer.
        if (fillInterval) { clearInterval(fillInterval); fillInterval = null; }
    } else {
        ctrl.classList.add('inactive');
        status.textContent = 'En attente';
        log('BUILD', 'Bot arrete', 'info');
        if (fillInterval) { clearInterval(fillInterval); fillInterval = null; }
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

let processingAllQueues = false;
let processingTownId = null;
let routineBlockedTowns = new Set();

function randomDelay(minMs,maxMs){
    const a=Math.max(0,Number(minMs)||0), b=Math.max(a,Number(maxMs)||a);
    return Math.round(a + Math.random()*(b-a));
}
function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,Math.max(0,ms|0))); }
function humanActionDelay(){
    return buildData.settings.humanizer===false ? 250 : randomDelay(buildData.settings.humanizerMinDelay||1000,buildData.settings.humanizerMaxDelay||2000);
}
function humanTownDelay(){
    return buildData.settings.humanizer===false ? 700 : randomDelay(buildData.settings.humanizerTownMinDelay||2500,buildData.settings.humanizerTownMaxDelay||4500);
}

// Liste déterministe de TOUTES les villes possédées, triée par ID de ville
// croissant. On ne dépend plus d'un "groupe de villes actif" côté jeu (filtre
// qui peut être vide, mal défini, ou changer d'ordre d'une routine à l'autre) :
// la ville "numéro 1" est toujours la même, peu importe son nom, et l'ordre
// est stable d'une routine à l'autre.
function getAllOwnedTownIds(){
    const towns=uw.ITowns?.getTowns?.()||{};
    return Object.values(towns)
        .map(t=>String(t.id))
        .filter(id=>id && id!=='undefined' && id!=='null')
        .sort((a,b)=>Number(a)-Number(b));
}

// Conservée pour compatibilité : utilisée uniquement si un groupe de villes
// actif existe réellement côté jeu. La routine principale (processAllQueues)
// n'en dépend plus — voir getAllOwnedTownIds().
function getSelectedTownGroupIds(){
    try{
        const groups=uw.MM?.getCollections?.()?.TownGroup;
        const townGroups=groups&&groups[0];
        if(townGroups){
            const activeId=townGroups.getActiveGroupId?.();
            const models=activeId!==undefined&&activeId!==null ? townGroups.getTowns?.(activeId) : null;
            if(models && typeof models[Symbol.iterator]==='function'){
                const ids=[];
                for(const model of models){
                    const id=typeof model?.getTownId==='function'?model.getTownId():(model?.id??model?.attributes?.town_id??model?.attributes?.id);
                    if(id!=null && uw.ITowns.getTown(id)) ids.push(String(id));
                }
                if(ids.length) return [...new Set(ids)];
            }
        }
    }catch(e){ log('BUILD',`Impossible de lire le groupe de villes actif: ${e.message}`,'info'); }
    return getAllOwnedTownIds();
}

function getQueuedTownIds(){
    const ids=getAllOwnedTownIds();
    return ids.filter(tid=>buildData.queues[tid]?.length || buildData.researchQueues?.[tid]?.length || buildData.actionQueues?.[tid]?.length);
}

function syncTemplateUIForCurrentTown(force=false){
    const tid=String(uw.Game?.townId||'');
    if(!tid || (!force && lastTemplateUiTownId===tid)) return;
    lastTemplateUiTownId=tid;
    const activeName=buildData.activeTemplates?.[tid];
    if(activeName && buildData.templates?.[activeName]){
        loadTemplateIntoUI(buildData.templates[activeName]);
        refreshTemplateSelect(activeName);
        renderExecutionQueuePreview();
    }else{
        resetCurrentTemplateUI();
        refreshTemplateSelect();
        const sel=document.getElementById('tpl-select'); if(sel) sel.value='';
        updateQueueDisplay();
        refreshSenateQueue();
    }
}

async function switchToTownHumanized(tid){
    tid=String(tid);
    if(String(uw.Game && uw.Game.townId || '')===tid){
        try{ syncTemplateUIForCurrentTown(true); }catch(e){}
        return true;
    }
    try{
        if(uw.HelperTown && typeof uw.HelperTown.townSwitch==='function'){
            await uw.HelperTown.townSwitch(Number(tid));
        }else if(uw.HelperTown && typeof uw.HelperTown.switchToTown==='function'){
            await uw.HelperTown.switchToTown(Number(tid));
        }else if(uw.ITowns && typeof uw.ITowns.setCurrentTown==='function'){
            uw.ITowns.setCurrentTown(Number(tid));
        }else{
            log('BUILD', 'Aucune méthode de changement de ville disponible', 'error');
            return false;
        }

        const deadline=Date.now()+7000;
        while(Date.now()<deadline){
            const gameTown=String(uw.Game && uw.Game.townId || '');
            const currentTown=uw.ITowns && typeof uw.ITowns.getCurrentTown==='function' ? uw.ITowns.getCurrentTown() : null;
            const currentId=currentTown && currentTown.id!==undefined ? String(currentTown.id) : '';
            if(gameTown===tid || currentId===tid){
                if(gameTown!==tid && uw.ITowns && typeof uw.ITowns.setCurrentTown==='function'){
                    try{ uw.ITowns.setCurrentTown(Number(tid)); }catch(e){}
                    await sleep(150);
                }
                if(String(uw.Game && uw.Game.townId || '')===tid){
                    await sleep(humanTownDelay());
                    try{ syncTemplateUIForCurrentTown(true); }catch(e){}
                    return true;
                }
            }
            await sleep(150);
        }
        log('BUILD', 'Changement vers la ville '+tid+' non confirme (ville actuelle: '+String(uw.Game && uw.Game.townId || 'inconnue')+')', 'error');
    }catch(e){
        log('BUILD', 'Impossible de passer a la ville '+tid+': '+e.message, 'error');
    }
    return false;
}

async function demolishBuildingPromise(tid,bid,targetLevel){
    try{
        if(!(await openTownControlPagesHumanized(tid))) return false;
        await sleep(humanActionDelay());
        openSenateWindowHumanized();
        await sleep(randomDelay(buildData.settings.humanizer===false?300:800,buildData.settings.humanizer===false?600:1600));
        // Le bouton de démolition est déclenché via l'interface native du Sénat.
        // On essaie plusieurs sélecteurs utilisés par les versions de Grepolis.
        const candidates=[
            `.building.building_${bid}:visible`,
            `.building[data-building_id="${bid}"]:visible`,
            `.building[data-building="${bid}"]:visible`,
            `.building:has(.name):visible`
        ];
        let row=null;
        for(const sel of candidates){const $r=uw.$(sel).filter(function(){return uw.$(this).find('.name').text().toLowerCase().includes(String(getBuildingName(bid)).toLowerCase());});if($r.length){row=$r.first();break;}}
        if(!row||!row.length){
            const $rows=uw.$('.building:visible');
            $rows.each(function(){if(row)return;const txt=uw.$(this).find('.name').text().trim().toLowerCase();if(txt===String(getBuildingName(bid)).toLowerCase())row=uw.$(this);});
        }
        if(!row||!row.length)return false;
        const buttons=row.find('a,button,.btn,[class*="demol"],[data-action*="demol"],[title*="Démol"],[title*="Demol"]').filter(':visible');
        let btn=null;
        buttons.each(function(){const txt=(uw.$(this).attr('title')||uw.$(this).text()||'').toLowerCase();if(txt.includes('demol')||txt.includes('démol')){btn=uw.$(this);return false;}});
        if(!btn||!btn.length){
            const all=uw.$('a,button,.btn,[data-action], [title]').filter(':visible');
            all.each(function(){const txt=(uw.$(this).attr('title')||uw.$(this).text()||'').toLowerCase();if((txt.includes('demol')||txt.includes('démol'))&&uw.$(this).closest('.building').is(row)){btn=uw.$(this);return false;}});
        }
        if(!btn||!btn.length)return false;
        let beforeOrders=0;try{beforeOrders=uw.ITowns.getTown(tid)?.buildingOrders?.().length||0;}catch(e){}
        btn.trigger('click');
        await sleep(randomDelay(buildData.settings.humanizer===false?700:1400,buildData.settings.humanizer===false?1100:2600));
        // Certaines versions affichent une confirmation. On la confirme seulement si elle est visible.
        const confirm=uw.$('button,.btn,a').filter(':visible').filter(function(){const txt=(uw.$(this).text()||'').trim().toLowerCase();return ['confirmer','confirm','oui','yes'].includes(txt);}).first();
        if(confirm.length){confirm.trigger('click');await sleep(randomDelay(500,1200));}
        let afterOrders=0;try{afterOrders=uw.ITowns.getTown(tid)?.buildingOrders?.().length||0;}catch(e){}
        const actual=getTownBuildingLevels(tid)[bid]||0;
        return afterOrders>beforeOrders || actual<=Number(targetLevel);
    }catch(e){log('BUILD',`Erreur démolition ${getBuildingName(bid)}: ${e.message}`,'error');return false;}
}

async function buildUpPromise(tid,bid){
    try{
        const town=uw.ITowns?.getTown?.(tid);
        let before=0;
        try{ before=town?.buildingOrders?.().filter(o=>{
            const id=typeof o.getBuildingId==='function'?o.getBuildingId():o.attributes?.building_id;
            return String(id)===String(bid);
        }).length||0; }catch(e){}

        let callbackOk=false, callbackDone=false;
        await new Promise(resolve=>{
            try{
                uw.gpAjax.ajaxPost('frontend_bridge','execute',{
                    model_url:'BuildingOrder', action_name:'buildUp', arguments:{building_id:bid}, town_id:tid
                },false,(resp)=>{ callbackOk=true; callbackDone=true; resolve(true); },(err)=>{ callbackOk=false; callbackDone=true; resolve(true); });
            }catch(e){ callbackDone=true; resolve(false); }
        });

        // Grepolis peut répondre sans créer d'ordre (ressources insuffisantes, prérequis, etc.).
        // On vérifie donc le changement réel de la file avant de considérer l'action comme réussie.
        await sleep(buildData.settings.humanizer===false?350:randomDelay(500,900));
        let after=0;
        try{ after=town?.buildingOrders?.().filter(o=>{
            const id=typeof o.getBuildingId==='function'?o.getBuildingId():o.attributes?.building_id;
            return String(id)===String(bid);
        }).length||0; }catch(e){}

        return after>before;
    }catch(e){
        log('BUILD',`Erreur lancement ${getBuildingName(bid)}: ${e.message}`,'error');
        return false;
    }
}

function getOrderedTemplateItems(template){
    const items=[];
    const order=Array.isArray(template?.__order__) ? template.__order__ : [];
    const seen=new Set();
    const pushKey=(key)=>{
        key=String(key);
        if(key==='__order__'||seen.has(key)) return;
        seen.add(key);
        const value=Number(template?.[key])||0;
        if(value<=0) return;
        if(key.startsWith(RESEARCH_KEY_PREFIX)) items.push({type:'research',rid:key.slice(RESEARCH_KEY_PREFIX.length)});
        else items.push({type:'building',buildingId:key,level:value});
    };
    order.forEach(pushKey);
    Object.keys(template||{}).forEach(pushKey);
    return items;
}

function ensureActionQueue(tid){
    if(!buildData.actionQueues) buildData.actionQueues={};
    if(!buildData.actionQueues[tid]) buildData.actionQueues[tid]=[];
    return buildData.actionQueues[tid];
}

function computeCurrentTownProjectedLevels(tid){
    const levels=getTownBuildingLevels(tid);
    try{
        const town=uw.ITowns.getTown(tid);
        town?.buildingOrders?.().forEach(o=>{
            const bid=(typeof o.getBuildingId==='function')?o.getBuildingId():o.attributes?.building_id;
            if(bid)levels[bid]=(levels[bid]||0)+1;
        });
    }catch(e){}
    return levels;
}

function queuePlanForTown(tid, template){
    const queue=ensureActionQueue(tid);
    queue.length=0;
    const projected=computeCurrentTownProjectedLevels(tid);
    const visiting=new Set();
    const queuedResearch=new Set();
    const researchState=getTownResearchState(tid);
    const modes=template?.__modes__||{};
    const pushUpgrade=(bid,target)=>{
        target=Number(target)||0;
        if(!bid||target<=0||visiting.has(bid))return;
        visiting.add(bid);
        getBuildingDependencies(bid).forEach(([reqBid,reqLvl])=>{
            if((modes[reqBid]||'upgrade')==='demolish') return;
            pushUpgrade(reqBid,reqLvl);
        });
        while((projected[bid]||0)<target){
            const level=(projected[bid]||0)+1;
            queue.push({type:'building',mode:'upgrade',buildingId:bid,level});
            projected[bid]=level;
        }
        visiting.delete(bid);
    };
    const pushDemolish=(bid,target)=>{
        target=Math.max(0,Number(target)||0);
        const current=Number(projected[bid])||0;
        if(!bid||current<=target)return;
        for(let level=current-1;level>=target;level--){
            queue.push({type:'building',mode:'demolish',buildingId:bid,level});
            projected[bid]=level;
        }
    };
    const pushResearch=(rid)=>{
        if(queuedResearch.has(rid) || researchState[rid]===true)return;
        const academyLevel=getResearchAcademyLevel(rid);
        pushUpgrade('academy',academyLevel);
        queue.push({type:'research',rid});
        queuedResearch.add(rid);
    };
    getOrderedTemplateItems(template).forEach(item=>{
        if(item.type==='building'){
            const mode=modes[item.buildingId]||'upgrade';
            if(mode==='demolish') pushDemolish(item.buildingId,item.level);
            else pushUpgrade(item.buildingId,item.level);
        }else if(item.type==='research'&&(getResearchData(item.rid)||RESEARCH_FALLBACK[item.rid])) pushResearch(item.rid);
    });
    return queue;
}

function renderExecutionQueuePreview(){
    const list=document.getElementById('tpl-prereq-list');
    if(!list)return;
    const sel=document.getElementById('tpl-select');
    let template=null;
    if(sel?.value&&buildData.templates[sel.value])template=buildData.templates[sel.value];
    else template=collectTemplateFromUI();
    const tid=uw.Game.townId;
    const plan=queuePlanForTown(tid,template);
    if(!plan.length){list.innerHTML='<div style="font-size:10px;color:#8B8B83;font-style:italic;">La file apparaîtra ici dans l"ordre exact d"exécution.</div>';return;}
    list.innerHTML=plan.map((item,i)=>{
        if(item.type==='research')return `<div style="display:flex;align-items:center;gap:7px;font-size:10px;color:#D4AF37;"><span style="width:20px;text-align:right;color:#8B8B83;">${i+1}.</span><div class="research_icon research40x40 ${item.rid}" style="width:30px;height:30px;flex-shrink:0;"></div><span>${getResearchName(item.rid)}</span><strong style="margin-left:auto;color:#FFD700;">Recherche</strong></div>`;
        const iconUrl=`https://gpfr.innogamescdn.com/images/game/main/${item.buildingId}.png`;
        const demolish=item.mode==='demolish';
        return `<div style="display:flex;align-items:center;gap:7px;font-size:10px;color:${demolish?'#FF8A80':'#D4AF37'};"><span style="width:20px;text-align:right;color:#8B8B83;">${i+1}.</span><div style="width:30px;height:30px;border:1px solid ${demolish?'#B74D52':'#8B6914'};border-radius:3px;background:#1a1a14;overflow:hidden;flex-shrink:0;"><div style="width:100%;height:100%;background:url(${iconUrl}) center/cover no-repeat;"></div></div><span>${getBuildingName(item.buildingId)}</span><strong style="margin-left:auto;color:${demolish?'#FF8A80':'#FFD700'};">${demolish?'démolir → '+item.level:'niv. '+item.level}</strong></div>`;
    }).join('');
}

function openSenateWindowHumanized(){
    try{
        const $candidates=uw.$('.building.main:visible, .building_senate:visible, [data-building_id="main"]:visible, [data-building="main"]:visible');
        if($candidates.length){ $candidates.first().trigger('click'); return true; }
        if(uw.GameEvents?.window?.open) { uw.GameEvents.window.open('main'); return true; }
    }catch(e){log('BUILD',`Impossible d'ouvrir le Sénat: ${e.message}`,'info');}
    return false;
}

// Ouvre systématiquement le Sénat (fenêtre gauche) puis l'Académie (fenêtre
// droite) pour la ville donnée, avant tout traitement de la file. C'est une
// étape obligatoire de chaque prise en charge de ville : le template n'est
// appliqué/tenté qu'une fois ces deux fenêtres ouvertes.
async function openTownControlPagesHumanized(tid){
    if(!(await switchToTownHumanized(tid))) return false;
    const townLabel=uw.ITowns.getTown(tid)?.getName?.()||tid;

    await sleep(humanActionDelay());
    const senateOpened=openSenateWindowHumanized();
    log('BUILD',`${townLabel}: ${senateOpened?'Senat ouvert':'ouverture du Senat impossible'}`,'info');
    await sleep(randomDelay(buildData.settings.humanizer===false?200:300,buildData.settings.humanizer===false?450:650));

    let academyOpened=false;
    if(uw.AcademyWindowFactory?.openAcademyWindow){
        try{
            uw.AcademyWindowFactory.openAcademyWindow();
            academyOpened=true;
            await sleep(randomDelay(buildData.settings.humanizer===false?200:300,buildData.settings.humanizer===false?450:650));
        }catch(e){
            log('BUILD',`${townLabel}: erreur ouverture Academie: ${e.message}`,'info');
        }
    }
    log('BUILD',`${townLabel}: ${academyOpened?'Academie ouverte':'ouverture de l\'Academie impossible'}`,'info');

    return true;
}

// Vérifie si un bâtiment donné possède un ordre de construction en cours dans
// une ville. Sert à distinguer une recherche "en attente d'une construction
// déjà lancée" (l'Académie monte, il suffit de patienter) d'une recherche
// réellement bloquée (rien n'est en cours pour combler le prérequis).
function hasPendingBuildingOrder(tid, bid) {
    try {
        const town = uw.ITowns.getTown(tid);
        const orders = town?.buildingOrders?.() || [];
        return orders.some(o => {
            const id = (typeof o.getBuildingId === 'function') ? o.getBuildingId() : o.attributes?.building_id;
            return String(id) === String(bid);
        });
    } catch (e) {
        return false;
    }
}

// Routine principale : parcourt TOUTES les villes possédées, toujours dans le
// même ordre déterministe (ville n°1 = premier ID trié, peu importe son nom),
// et traite chacune jusqu'à un blocage réel (plus de ressources, plus de place
// dans la file, ou recherche impossible sans construction en cours) avant de
// passer à la suivante.
async function processAllQueues(){
    if(processingAllQueues || !buildData.enabled) return;
    processingAllQueues=true;
    routineBlockedTowns=new Set();
    try{
        const towns=getAllOwnedTownIds();
        const active=buildData.activeTemplates||{};
        log('BUILD',`Nouvelle routine : ${towns.length} ville(s) a traiter dans l'ordre`,'info');

        for(const tid of towns){
            if(!buildData.enabled) break;
            if(routineBlockedTowns.has(String(tid))) continue;

            const townLabel=uw.ITowns.getTown(tid)?.getName?.()||tid;

            // On (re)calcule le plan d'actions à partir du template actif de
            // cette ville UNIQUEMENT si la file est vide. Une file déjà
            // partiellement traitée n'est jamais écrasée.
            const templateName=active[String(tid)];
            let q=buildData.actionQueues?.[tid]||[];
            if(!q.length && templateName && buildData.templates?.[templateName]){
                buildData.actionQueues[tid]=queuePlanForTown(tid,buildData.templates[templateName]);
                buildData.queues[tid]=(buildData.actionQueues[tid]||[]).filter(a=>a.type==='building').map(a=>({buildingId:a.buildingId,level:a.level}));
                buildData.researchQueues[tid]=(buildData.actionQueues[tid]||[]).filter(a=>a.type==='research').map(a=>a.rid);
                saveData();
                q=buildData.actionQueues[tid]||[];
            }

            if(!q.length){
                // Rien à faire pour cette ville (pas de template actif ou file
                // déjà entièrement traitée) : on passe directement à la suivante.
                log('BUILD',`${townLabel}: ignoree (${templateName?'template "'+templateName+'" deja termine':'aucun template actif — utilisez "Appliquer a TOUTES mes villes"'})`,'info');
                continue;
            }

            log('BUILD',`${townLabel}: debut du traitement (${q.length} action(s) en file)`,'info');

            // Chaque ville est isolée dans son propre try/catch. Avant, une
            // exception inattendue (sélecteur DOM manquant, propriété
            // undefined, etc.) sur UNE ville arrêtait toute la boucle "for" et
            // empêchait le passage aux villes suivantes, y compris lors des
            // routines ultérieures (même ville rebloquée en premier à chaque fois).
            let result;
            try{
                result=await processTownActionQueue(tid);
            }catch(e){
                log('BUILD', `${townLabel}: erreur inattendue (${e.message}) → passage à la ville suivante`, 'error');
                result={blocked:true, reason:'exception: '+e.message};
            }

            if(result?.blocked){
                routineBlockedTowns.add(String(tid));
                log('BUILD',`${townLabel}: passage a la ville suivante (${result.reason})`,'info');
            } else {
                log('BUILD',`${townLabel}: file terminee pour cette routine`,'info');
            }

            if(buildData.enabled) await sleep(humanTownDelay());
        }

        log('BUILD','Routine terminee, en attente du prochain cycle','info');
    }finally{processingAllQueues=false;processingTownId=null;}
}

async function processTownActionQueue(tid){
    if(!buildData.enabled) return {blocked:false, reason:'disabled'};
    const q=buildData.actionQueues?.[tid]||[];
    if(!q.length) return {blocked:false, reason:'empty'};
    processingTownId=String(tid);
    if(!(await openTownControlPagesHumanized(tid))) return {blocked:true, reason:'ouverture de ville impossible'};

    // Recherches impossibles pendant CETTE routine : elles restent strictement
    // à leur position dans la file et seront retentées en priorité à la prochaine routine.
    const skippedResearchIds = new Set();

    while(buildData.enabled && q.length){
        // On cherche la première action qui peut encore être tentée pendant cette routine.
        // Une recherche déjà bloquée est ignorée temporairement, mais jamais supprimée.
        let actionIndex=-1;
        for(let i=0;i<q.length;i++){
            const candidate=q[i];
            if(candidate?.type==='research' && skippedResearchIds.has(String(candidate.rid))) continue;
            actionIndex=i;
            break;
        }

        // Plus aucune action n'est exécutable pendant cette routine :
        // on quitte immédiatement cette ville et on passe à la suivante.
        if(actionIndex<0){
            saveData(); updateQueueDisplay(); refreshSenateQueue();
            return {blocked:true, reason:'aucune action exécutable pour cette routine'};
        }

        const action=q[actionIndex];
        const town=uw.ITowns.getTown(tid);
        if(!town){
            saveData();
            return {blocked:true, reason:'ville introuvable'};
        }

        if(action.type==='building'){
            let orders=[]; try{orders=town.buildingOrders?.()||[];}catch(e){}
            const max=uw.GameDataPremium?.isAdvisorActivated?.('curator')?7:2;
            if(orders.length>=max){
                log('BUILD',`${town.getName?.()||tid}: file de construction pleine (${orders.length}/${max})`,'info');
                saveData(); updateQueueDisplay(); refreshSenateQueue();
                return {blocked:true, reason:'file de construction pleine'};
            }

            await sleep(humanActionDelay());
            let ok=false;
            if(action.mode==='demolish') ok=await demolishBuildingPromise(tid,action.buildingId,action.level);
            else ok=await buildUpPromise(tid,action.buildingId);

            if(!ok){
                log('BUILD',`${town.getName?.()||tid}: impossible de ${action.mode==='demolish'?'démolir':'construire'} ${getBuildingName(action.buildingId)} (niveau cible ${action.level}) → passage à la ville suivante`,'info');
                saveData(); updateQueueDisplay(); refreshSenateQueue();
                return {blocked:true, reason:'construction/démolition impossible (ressources ou conditions)'};
            }

            q.splice(actionIndex,1);
            if(buildData.queues[tid]?.length){
                const idx=buildData.queues[tid].findIndex(x=>x.buildingId===action.buildingId && x.level===action.level);
                if(idx>=0) buildData.queues[tid].splice(idx,1);
            }
            buildData.stats.built++; saveData(); updateStats(); updateQueueDisplay(); refreshSenateQueue();
            log('BUILD',`${town.getName?.()||tid}: ${action.mode==='demolish'?'Démolition '+getBuildingName(action.buildingId)+' → niv.'+action.level:getBuildingName(action.buildingId)+' niv.'+action.level}`,'success');
            continue;
        }

        if(action.type==='research'){
            const researched=getTownResearchState(tid);
            if(researched[action.rid]===true){
                q.splice(actionIndex,1);
                continue;
            }

            const academy=(town.getBuildings&&town.getBuildings().getBuildings())?.academy||0;
            const neededAcademy=getResearchAcademyLevel(action.rid);

            if(academy<neededAcademy){
                // Correctif : on ne se contente plus de "sauter" la recherche
                // aveuglément. On vérifie si l'Académie est réellement en
                // cours de construction dans cette ville.
                if(hasPendingBuildingOrder(tid,'academy')){
                    // L'Académie monte déjà : simple attente, pas un blocage réel.
                    skippedResearchIds.add(String(action.rid));
                    log('BUILD',`${town.getName?.()||tid}: ${getResearchName(action.rid)} en attente (Académie ${academy}/${neededAcademy} — construction en cours) → tentative des actions suivantes`,'info');
                    continue;
                }
                // Aucun ordre de construction d'Académie en cours : le prérequis
                // ne pourra pas se résoudre tout seul (ressources insuffisantes,
                // file pleine, prérequis manquant pour l'Académie elle-même...).
                // On considère la ville comme réellement bloquée et on passe à la suivante.
                log('BUILD',`${town.getName?.()||tid}: ${getResearchName(action.rid)} impossible (Académie ${academy}/${neededAcademy}, aucune construction en cours) → passage à la ville suivante`,'info');
                saveData(); updateQueueDisplay(); refreshSenateQueue();
                return {blocked:true, reason:'recherche bloquée: Académie insuffisante et aucune construction en cours'};
            }

            await sleep(humanActionDelay());
            if(uw.AcademyWindowFactory?.openAcademyWindow){
                try{uw.AcademyWindowFactory.openAcademyWindow(); await sleep(randomDelay(350,750));}catch(e){}
            }

            const selectors=[`div[data-research_id*="${action.rid}"]`,`[data-research_id="${action.rid}"]`,`.research_icon.research.${action.rid}`,`.research_technology.${action.rid}`,`.research.${action.rid}`];
            let $candidate=null;
            for(const sel of selectors){const $el=uw.$(sel).filter(':visible');if($el&&$el.length){$candidate=$el.first();break;}}

            // Tout échec d'une recherche la rend temporairement bloquée pour CETTE routine.
            // On continue obligatoirement vers l'action suivante.
            if(!$candidate||!$candidate.length){
                skippedResearchIds.add(String(action.rid));
                log('BUILD',`${town.getName?.()||tid}: ${getResearchName(action.rid)} impossible à lancer maintenant → tentative des actions suivantes`,'info');
                continue;
            }

            const $button=$candidate.closest('button,.btn,.research_technology,.research').first();
            try{
                ($button.length?$button:$candidate).click();
            }catch(e){
                skippedResearchIds.add(String(action.rid));
                log('BUILD',`${town.getName?.()||tid}: clic impossible pour ${getResearchName(action.rid)} → tentative des actions suivantes`,'info');
                continue;
            }
            q.splice(actionIndex,1);
            if(buildData.researchQueues?.[tid]){
                const ri=buildData.researchQueues[tid].indexOf(action.rid);
                if(ri>=0) buildData.researchQueues[tid].splice(ri,1);
            }
            saveData(); updateStats(); updateQueueDisplay(); refreshSenateQueue();
            log('BUILD',`${town.getName?.()||tid}: recherche ${getResearchName(action.rid)} lancée`,'success');
            await sleep(buildData.settings.humanizer===false?500:randomDelay(650,1100));
            continue;
        }

        q.splice(actionIndex,1);
    }

    saveData(); updateQueueDisplay(); refreshSenateQueue();
    return {blocked:false, reason:'termine'};
}

async function processTownQueue(tid){
    return processTownActionQueue(tid);
}

function addToQueue(bid, lvl) {
    const tid = uw.Game.townId;
    if (!buildData.queues[tid]) buildData.queues[tid] = [];
    if (!buildData.actionQueues) buildData.actionQueues = {};
    if (!buildData.actionQueues[tid]) buildData.actionQueues[tid] = [];
    const action = { type:'building', mode:'upgrade', buildingId: bid, level: lvl };
    buildData.queues[tid].push({ buildingId: bid, level: lvl });
    buildData.actionQueues[tid].push(action);
    saveData();
    log('BUILD', `+ ${NAMES[bid]} niv.${lvl}`, 'success');
    refreshSenateQueue();
    updateStats();
    updateQueueDisplay();
    uw.$('.ab-btn').remove();
    if (buildData.enabled) processTownActionQueue(tid);
}

function removeActionFromQueue(idx){
    const tid=uw.Game.townId;
    const q=buildData.actionQueues?.[tid]||[];
    if(idx<0||idx>=q.length)return;
    const removed=q.splice(idx,1)[0];
    if(removed?.type==='building' && buildData.queues?.[tid]){
        const bi=buildData.queues[tid].findIndex(x=>x.buildingId===removed.buildingId&&x.level===removed.level);
        if(bi>=0)buildData.queues[tid].splice(bi,1);
    }
    if(removed?.type==='research' && buildData.researchQueues?.[tid]){
        const ri=buildData.researchQueues[tid].indexOf(removed.rid);
        if(ri>=0)buildData.researchQueues[tid].splice(ri,1);
    }
    saveData(); updateStats(); updateQueueDisplay(); refreshSenateQueue();
    log('BUILD',`Action supprimée de la file: ${removed?.type==='research'?getResearchName(removed.rid):getBuildingName(removed.buildingId)}`,'info');
}

function removeFromQueue(idx) {
    const tid = uw.Game.townId;
    if (buildData.actionQueues?.[tid]) {
        const aidx = buildData.actionQueues[tid].findIndex((a, i) => a.type === 'building' && buildData.actionQueues[tid].slice(0,i+1).filter(x=>x.type==='building').length===idx+1);
        if(aidx>=0) buildData.actionQueues[tid].splice(aidx,1);
    }
    if (buildData.queues[tid]) buildData.queues[tid].splice(Math.min(idx, buildData.queues[tid].length-1), 1);
    saveData();
    refreshSenateQueue();
    updateStats();
    updateQueueDisplay();
    uw.$('.ab-btn').remove();
}

function startSenateWatcher() {
    if (senateWatcherInterval) clearInterval(senateWatcherInterval);
    senateWatcherInterval = setInterval(() => {
        syncTemplateUIForCurrentTown();
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

    const queue = (buildData.actionQueues?.[uw.Game.townId] || []);
    
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
    const queue = (buildData.actionQueues?.[uw.Game.townId] || []);
    const $items = uw.$('#autobuild-senate-queue .queue-items');
    const $count = uw.$('#autobuild-senate-queue').find('span:last');
    
    if ($count.length) $count.text(queue.length);
    
    if ($items.length) {
        if (queue.length === 0) {
            $items.html('<div style="color:#8B8B83;font-style:italic;text-align:center;padding:15px;">File vide - Utilisez les boutons "+ FILE"</div>');
        } else {
            $items.html(queue.map((it, i) => {
                if(it.type==='research'){
                    return `<div style="width:50px;height:50px;background:#1a1a14;border:2px solid #6A8FB5;border-radius:4px;position:relative;display:inline-block;margin:3px;cursor:pointer;" title="${getResearchName(it.rid)}">
                        <div class="research_icon research40x40 ${it.rid}" style="width:38px;height:38px;margin:5px auto 0;"></div>
                        <span style="position:absolute;bottom:2px;right:2px;background:#315D86;color:#fff;font-weight:bold;font-size:9px;padding:1px 4px;border-radius:3px;">R</span><span onclick="event.stopPropagation();GU_Build.removeAction(${i})" title="Supprimer" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;background:#E53935;color:#fff;border:2px solid #FFCDD2;border-radius:50%;font-size:10px;line-height:12px;text-align:center;cursor:pointer;">×</span>
                    </div>`;
                }
                const iconUrl = `https://gpfr.innogamescdn.com/images/game/main/${it.buildingId}.png`;
                return `<div style="width:50px;height:50px;background:#1a1a14;border:2px solid #8B6914;border-radius:4px;position:relative;display:inline-block;margin:3px;cursor:pointer;" title="${getBuildingName(it.buildingId)} niv.${it.level}">
                    <div style="width:100%;height:100%;background:url(${iconUrl}) center/cover no-repeat;"></div>
                    <span style="position:absolute;bottom:2px;right:2px;background:linear-gradient(145deg,#D4AF37,#8B6914);color:#1a1408;font-weight:bold;font-size:10px;padding:1px 4px;border-radius:3px;">${it.mode==='demolish'?'D':it.level}</span>
                    <span onclick="event.stopPropagation();GU_Build.removeAction(${i})" title="Supprimer" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;background:#E53935;color:#fff;border:2px solid #FFCDD2;border-radius:50%;font-size:10px;line-height:12px;text-align:center;cursor:pointer;">×</span>
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
    
    const queue = (buildData.actionQueues?.[uw.Game.townId] || []);
    if (queue.length === 0) {
        container.innerHTML = '<div style="color: #8B8B83; font-style: italic; padding: 15px; text-align: center; width: 100%;">Ouvrez le Senat pour ajouter des constructions</div>';
    } else {
        container.innerHTML = queue.map((it, i) => {
            if(it.type==='research') return `<div style="width:50px;height:50px;background:#1a1a14;border:2px solid #6A8FB5;border-radius:4px;position:relative;cursor:pointer;" title="${getResearchName(it.rid)}"><div class="research_icon research40x40 ${it.rid}" style="width:38px;height:38px;margin:5px auto 0;"></div><span style="position:absolute;bottom:2px;right:2px;background:#315D86;color:#fff;font-weight:bold;font-size:9px;padding:1px 4px;border-radius:3px;">R</span><span onclick="event.stopPropagation();GU_Build.removeAction(${i})" title="Supprimer" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;background:#E53935;color:#fff;border:2px solid #FFCDD2;border-radius:50%;font-size:10px;line-height:12px;text-align:center;cursor:pointer;">×</span></div>`;
            const iconUrl = `https://gpfr.innogamescdn.com/images/game/main/${it.buildingId}.png`;
            return `<div style="width:50px;height:50px;background:#1a1a14;border:2px solid #8B6914;border-radius:4px;position:relative;cursor:pointer;" title="${getBuildingName(it.buildingId)} niv.${it.level}"><div style="width:100%;height:100%;background:url(${iconUrl}) center/cover no-repeat;"></div><span style="position:absolute;bottom:2px;right:2px;background:linear-gradient(145deg,#D4AF37,#8B6914);color:#1a1408;font-weight:bold;font-size:10px;padding:1px 4px;border-radius:3px;">${it.level}</span><span onclick="event.stopPropagation();GU_Build.removeAction(${i})" title="Supprimer" style="position:absolute;top:-6px;right:-6px;width:16px;height:16px;background:#E53935;color:#fff;border:2px solid #FFCDD2;border-radius:50%;font-size:10px;line-height:12px;text-align:center;cursor:pointer;">×</span></div>`;
        }).join('');
    }
}

// ============================================================================
// TEMPLATES DE CONSTRUCTION
// ============================================================================

function recordTemplateOrder(key){
    key=String(key);
    templateEditOrder=templateEditOrder.filter(k=>k!==key);
    templateEditOrder.push(key);
}

function initSpecialToggleHandlers() {
    document.querySelectorAll('.tpl-special-cell').forEach(cell => {
        cell.onclick=()=>{
            const bid=cell.dataset.bid;
            const group=SPECIAL_LEFT.includes(bid)?SPECIAL_LEFT:SPECIAL_RIGHT;
            const wasSelected=cell.dataset.selected==='1';
            group.forEach(gid=>{const el=document.querySelector(`.tpl-special-cell[data-bid="${gid}"]`);if(!el)return;el.dataset.selected='0';el.querySelector('.tpl-special-icon').style.borderColor='#4a4a3a';el.querySelector('.tpl-special-icon div').style.opacity='0.5';});
            if(!wasSelected){
                cell.dataset.selected='1';
                cell.querySelector('.tpl-special-icon').style.borderColor='#FFD700';
                cell.querySelector('.tpl-special-icon div').style.opacity='1';
                const levelInput=cell.querySelector('.tpl-special-level-input');
                if(levelInput && !(parseInt(levelInput.value)||0)) levelInput.value='1';
                recordTemplateOrder(bid);
                applyPrerequisitesToTemplateUI();
            } else {
                templateEditOrder=templateEditOrder.filter(k=>k!==bid);
                const levelInput=cell.querySelector('.tpl-special-level-input');
                if(levelInput) levelInput.value='0';
                refreshTemplatePrerequisites(true);
            }
            renderExecutionQueuePreview();
        };
    });
}

function initResearchToggleHandlers(){
    document.querySelectorAll('.tpl-research-cell').forEach(cell=>{
        cell.onclick=()=>{
            const rid=cell.dataset.rid, key=RESEARCH_KEY_PREFIX+rid;
            const selected=cell.dataset.selected==='1';
            cell.dataset.selected=selected?'0':'1';
            cell.style.opacity=selected?'0.48':'1';
            cell.style.borderColor=selected?'#4a4a3a':'#FFD700';
            if(!selected) recordTemplateOrder(key);
            else templateEditOrder=templateEditOrder.filter(k=>k!==key);
            refreshTemplatePrerequisites(true);
            renderExecutionQueuePreview();
        };
    });
}

function initTemplateInputHandlers(){
    document.querySelectorAll('.tpl-level-input').forEach(inp=>{
        const handler=()=>{
            const bid=inp.dataset.bid;
            const lvl=parseInt(inp.value)||0;
            if(lvl>0) recordTemplateOrder(bid);
            else templateEditOrder=templateEditOrder.filter(k=>k!==bid);
            refreshTemplatePrerequisites(true);
            renderExecutionQueuePreview();
        };
        inp.addEventListener('input',handler);
        inp.addEventListener('change',handler);
    });
}

// Calcule les prérequis à partir de toutes les sélections actuelles et
// les écrit immédiatement dans l'interface. Cette fonction ne sauvegarde
// rien et ne modifie pas la file de construction : elle prépare le template.
function applyPrerequisitesToTemplateUI(){
    const result=calculateTemplateRequirements();
    document.querySelectorAll('.tpl-level-input').forEach(inp=>{
        const bid=inp.dataset.bid;
        const explicit=Number(inp.value)||0;
        const required=Number(result.buildings[bid])||0;
        const max=getBuildingMaxLevel(bid);
        const finalLevel=Math.min(Math.max(explicit,required),max);
        if(explicit!==finalLevel) inp.value=String(finalLevel);
        inp.style.borderColor=(required>explicit)?'#66BB6A':'#8B6914';
        inp.title=(required>explicit)
            ? `${getBuildingName(bid)} — prérequis du template: niveau ${required}`
            : getBuildingName(bid);
    });
    refreshTemplatePrerequisites(false);
}

function initSpecialLevelInputHandlers(){
    document.querySelectorAll('.tpl-special-level-input').forEach(inp=>{
        inp.addEventListener('click',e=>e.stopPropagation());
        const handler=()=>{
            const bid=inp.dataset.bid;
            const cell=document.querySelector(`.tpl-special-cell[data-bid="${bid}"]`);
            const lvl=Math.max(0,Math.min(1,parseInt(inp.value)||0));
            inp.value=String(lvl);
            if(cell?.dataset.selected==='1'){
                if(lvl>0)recordTemplateOrder(bid);
                else templateEditOrder=templateEditOrder.filter(k=>k!==bid);
            }
            renderExecutionQueuePreview();
        };
        inp.addEventListener('input',handler);
        inp.addEventListener('change',handler);
    });
}

function getTemplateBuildingMode(bid){
    const el=document.querySelector(`.tpl-mode-select[data-bid="${bid}"]`);
    return el?.value==='demolish' ? 'demolish' : 'upgrade';
}

function initTemplateModeHandlers(){
    document.querySelectorAll('.tpl-mode-select').forEach(sel=>{
        sel.addEventListener('click',e=>e.stopPropagation());
        sel.addEventListener('change',()=>{
            const bid=sel.dataset.bid;
            const mode=sel.value==='demolish'?'demolish':'upgrade';
            const inp=document.querySelector(`.tpl-level-input[data-bid="${bid}"]`);
            if(inp){
                inp.title = mode==='demolish' ? `${getBuildingName(bid)} — niveau cible après démolition` : getBuildingName(bid);
                inp.style.color = mode==='demolish' ? '#FF8A80' : '#FFD700';
            }
            const specialInp=document.querySelector(`.tpl-special-level-input[data-bid="${bid}"]`);
            if(specialInp){
                if(mode==='demolish' && (parseInt(specialInp.value)||0)>0) specialInp.value='0';
                else if(mode==='upgrade' && (parseInt(specialInp.value)||0)<=0) specialInp.value='1';
            }
            renderExecutionQueuePreview();
        });
    });
}

function getTemplateSelections(){
    const buildings={},modes={};
    document.querySelectorAll('.tpl-level-input').forEach(inp=>{const bid=inp.dataset.bid;const lvl=parseInt(inp.value)||0;if(lvl>0)buildings[bid]=Math.min(lvl,getBuildingMaxLevel(bid));modes[bid]=getTemplateBuildingMode(bid);});
    document.querySelectorAll('.tpl-special-cell').forEach(cell=>{if(cell.dataset.selected==='1'){const inp=cell.querySelector('.tpl-special-level-input');const lvl=Math.min(1,Math.max(0,parseInt(inp?.value)||1));if(lvl>0)buildings[cell.dataset.bid]=lvl;modes[cell.dataset.bid]=getTemplateBuildingMode(cell.dataset.bid);}});
    const researches={};
    document.querySelectorAll('.tpl-research-cell').forEach(cell=>{if(cell.dataset.selected==='1')researches[cell.dataset.rid]=true;});
    return {buildings,researches,modes};
}

function calculateTemplateRequirements(){
    const {buildings,researches,modes}=getTemplateSelections();
    // La table ci-dessus est également utilisée pour l'application réelle du template.
    // On calcule donc exactement le même graphe de dépendances pour l'aperçu et la file.

    const required=Object.assign({},buildings);
    const visiting=new Set();
    function ensureBuildingRequirement(bid,lvl){
        const target=Number(lvl)||0;
        if(!bid||target<=0) return;
        const previous=Number(required[bid])||0;
        // On ne reparcourt qu'une branche actuellement en cours de résolution.
        // Une valeur déjà sélectionnée ne doit surtout pas empêcher la descente
        // dans ses dépendances.
        if(visiting.has(bid)) return;
        visiting.add(bid);
        getBuildingDependencies(bid).forEach(([reqBid,reqLvl])=>ensureBuildingRequirement(reqBid,reqLvl));
        required[bid]=Math.max(previous,target);
        visiting.delete(bid);
    }
    Object.entries(buildings).forEach(([bid,lvl])=>{ if((modes[bid]||'upgrade')!=='demolish') ensureBuildingRequirement(bid,lvl); });
    Object.keys(researches).forEach(rid=>ensureBuildingRequirement('academy',getResearchAcademyLevel(rid)));
    return {buildings:required,researches};
}

function syncBuildingInputsToRequirements(){
    const result=calculateTemplateRequirements();
    document.querySelectorAll('.tpl-level-input').forEach(inp=>{
        const bid=inp.dataset.bid,mode=getTemplateBuildingMode(bid);
        const required=result.buildings[bid]||0,explicit=parseInt(inp.value)||0;
        if(mode==='demolish'){
            const finalLevel=Math.min(Math.max(explicit,0),getBuildingMaxLevel(bid));
            if(parseInt(inp.value)!==finalLevel)inp.value=finalLevel;
            inp.style.borderColor='#B74D52';
            inp.title=`${getBuildingName(bid)} — niveau cible après démolition`;
            return;
        }
        const finalLevel=Math.min(Math.max(explicit,required),getBuildingMaxLevel(bid));
        if(parseInt(inp.value)!==finalLevel)inp.value=finalLevel;
        const isAuto=required>explicit;
        inp.style.borderColor=isAuto?'#66BB6A':'#8B6914';
        inp.title=isAuto?`${getBuildingName(bid)} — requis automatiquement: ${required}`:getBuildingName(bid);
    });
}

function refreshTemplatePrerequisites(autoSync=false){
    if(autoSync)syncBuildingInputsToRequirements();
    const list=document.getElementById('tpl-prereq-list');if(!list)return;
    const result=calculateTemplateRequirements(),selectedResearchIds=Object.keys(result.researches);
    const currentLevels=getTownBuildingLevels(uw.Game.townId);
    const rows=Object.entries(result.buildings).filter(([,lvl])=>lvl>0).sort((a,b)=>(a[0]==='academy'?0:1)-(b[0]==='academy'?0:1)||a[0].localeCompare(b[0])).map(([bid,lvl])=>{
        const current=currentLevels[bid]||0,iconUrl=`https://gpfr.innogamescdn.com/images/game/main/${bid}.png`;
        return `<div style="display:flex;align-items:center;gap:7px;font-size:10px;color:#D4AF37;">
            <div style="width:32px;height:32px;border:1px solid ${current>=lvl?'#4CAF50':'#8B6914'};border-radius:3px;background:#1a1a14;overflow:hidden;flex-shrink:0;">
                <div style="width:100%;height:100%;background:url(${iconUrl}) center/cover no-repeat;"></div>
            </div>
            <span style="min-width:95px;">${getBuildingName(bid)}</span><strong style="color:${current>=lvl?'#81C784':'#FFD700'};">niv. ${lvl}</strong>
            <span style="margin-left:auto;color:${current>=lvl?'#81C784':'#BDBDBD'};">${current>=lvl?'OK':`à prévoir: ${lvl}`}</span>
        </div>`;
    });
    const researchRows=selectedResearchIds.map(rid=>{const r={name:getResearchName(rid),academy:getResearchAcademyLevel(rid)};return `<div style="display:flex;align-items:center;gap:7px;font-size:10px;color:#D4AF37;">
        <div class="research_icon research40x40 ${rid}" style="width:32px;height:32px;flex-shrink:0;"></div><span style="min-width:160px;">${r.name}</span><strong style="color:#FFD700;">Académie ${r.academy}</strong><span style="margin-left:auto;color:#BDBDBD;">Recherche sélectionnée</span>
    </div>`;});
    if(!rows.length&&!researchRows.length){list.innerHTML='<div style="font-size:10px;color:#8B8B83;font-style:italic;">Sélectionnez un bâtiment ou une recherche.</div>';return;}
    list.innerHTML=(rows.length?'<div style="font-size:9px;color:#BDB76B;margin-bottom:2px;">Bâtiments nécessaires</div>':'')+rows.join('')+(researchRows.length?'<div style="font-size:9px;color:#BDB76B;margin-top:6px;margin-bottom:2px;">Recherches sélectionnées</div>'+researchRows.join(''):'');
}

function collectTemplateFromUI(){
    const template={};
    document.querySelectorAll('.tpl-level-input').forEach(inp=>{const bid=inp.dataset.bid,lvl=parseInt(inp.value)||0;if(lvl>0)template[bid]=Math.min(lvl,getBuildingMaxLevel(bid));});
    document.querySelectorAll('.tpl-special-cell').forEach(cell=>{if(cell.dataset.selected==='1'){const inp=cell.querySelector('.tpl-special-level-input');const lvl=Math.min(1,Math.max(0,parseInt(inp?.value)||1));if(lvl>0)template[cell.dataset.bid]=lvl;}});
    document.querySelectorAll('.tpl-research-cell').forEach(cell=>{if(cell.dataset.selected==='1')template[RESEARCH_KEY_PREFIX+cell.dataset.rid]=1;});
    const modes={};
    Object.keys(template).forEach(k=>{if(k!=='__order__')modes[k]=getTemplateBuildingMode(k);});
    const order=templateEditOrder.filter(k=>Object.prototype.hasOwnProperty.call(template,k));
    Object.keys(template).forEach(k=>{if(k!=='__order__' && !order.includes(k))order.push(k);});
    template.__order__=order;
    template.__modes__=modes;
    return template;
}

function loadTemplateIntoUI(template){
    templateEditOrder=Array.isArray(template?.__order__) ? [...template.__order__] : [];
    document.querySelectorAll('.tpl-level-input').forEach(inp=>{const bid=inp.dataset.bid;inp.value=template[inp.dataset.bid]||0;const mode=template?.__modes__?.[bid]||'upgrade';const sel=document.querySelector(`.tpl-mode-select[data-bid="${bid}"]`);if(sel)sel.value=mode;inp.style.color=mode==='demolish'?'#FF8A80':'#FFD700';});
    document.querySelectorAll('.tpl-special-cell').forEach(cell=>{const bid=cell.dataset.bid,selected=!!template[bid];cell.dataset.selected=selected?'1':'0';cell.querySelector('.tpl-special-icon').style.borderColor=selected?'#FFD700':'#4a4a3a';cell.querySelector('.tpl-special-icon div').style.opacity=selected?'1':'0.5';const inp=cell.querySelector('.tpl-special-level-input');if(inp)inp.value=selected?(template[bid]||1):0;const mode=template?.__modes__?.[bid]||'upgrade';const sel=cell.querySelector('.tpl-mode-select');if(sel)sel.value=mode;});
    document.querySelectorAll('.tpl-research-cell').forEach(cell=>{const key=RESEARCH_KEY_PREFIX+cell.dataset.rid,selected=!!template[key]||!!template[cell.dataset.rid];cell.dataset.selected=selected?'1':'0';cell.style.opacity=selected?'1':'0.48';cell.style.borderColor=selected?'#FFD700':'#4a4a3a';});
    refreshTemplatePrerequisites(true);
    renderExecutionQueuePreview();
}

function resetCurrentTemplateUI(){
    templateEditOrder=[];
    document.querySelectorAll('.tpl-mode-select').forEach(sel=>sel.value='upgrade');
    document.querySelectorAll('.tpl-level-input').forEach(inp=>{
        inp.value=0;
        inp.style.borderColor='#8B6914';
        inp.title=getBuildingName(inp.dataset.bid);
    });

    document.querySelectorAll('.tpl-special-cell').forEach(cell=>{
        cell.dataset.selected='0';
        cell.querySelector('.tpl-special-icon').style.borderColor='#4a4a3a';
        cell.querySelector('.tpl-special-icon div').style.opacity='0.5';
        const inp=cell.querySelector('.tpl-special-level-input');if(inp)inp.value='0';
    });

    document.querySelectorAll('.tpl-research-cell').forEach(cell=>{
        cell.dataset.selected='0';
        cell.style.opacity='0.48';
        cell.style.borderColor='#4a4a3a';
    });

    const nameInput=document.getElementById('tpl-name-input');
    if(nameInput) nameInput.value='';
    const select=document.getElementById('tpl-select');
    if(select) select.value='';

    refreshTemplatePrerequisites(false);
    renderExecutionQueuePreview();
    log('BUILD', 'Template en cours réinitialisé', 'info');
}

function saveTemplateFromUI() {
    const nameInput = document.getElementById('tpl-name-input');
    const name = nameInput.value.trim();
    if (!name) { log('BUILD', 'Entrez un nom pour le template', 'error'); return; }

    const template = collectTemplateFromUI();
    if (Object.keys(template).filter(k=>k!=='__order__').length === 0) { log('BUILD', 'Le template est vide', 'error'); return; }

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
function getTownResearchState(tid){
    try{
        const attrs=uw.MM?.getModelsForClass?.('Researches')?.[tid]?.attributes;
        if(attrs)return Object.assign({},attrs);
        const town=uw.ITowns.getTown(tid), c=town?.getResearches?.();
        if(c?.attributes)return Object.assign({},c.attributes);
        return {};
    }catch(e){log('BUILD',`Impossible de lire les recherches: ${e.message}`,'error');return {};}
}
function queueResearch(tid,rid){if(!buildData.researchQueues[tid])buildData.researchQueues[tid]=[];if(!buildData.researchQueues[tid].includes(rid))buildData.researchQueues[tid].push(rid);}
function processAllResearchQueues(){for(const tid in (buildData.researchQueues||{}))if(buildData.researchQueues.hasOwnProperty(tid))processTownResearchQueue(tid);}
async function processTownResearchQueue(tid){
    const queue=(buildData.researchQueues&&buildData.researchQueues[tid])||[];
    if(!queue.length || !buildData.enabled)return;
    const town=uw.ITowns.getTown(tid);if(!town)return;
    if(!(await switchToTownHumanized(tid))) return;
    const researched=getTownResearchState(tid);
    while(queue.length&&researched[queue[0]]===true)queue.shift();
    if(!queue.length){saveData();return;}
    const rid=queue[0],academy=(town.getBuildings&&town.getBuildings().getBuildings())?.academy||0;
    if(academy<getResearchAcademyLevel(rid))return;
    try{
        await sleep(humanActionDelay());
        if(uw.AcademyWindowFactory?.openAcademyWindow){
            uw.AcademyWindowFactory.openAcademyWindow();
            await sleep(randomDelay(buildData.settings.humanizer===false?400:900,buildData.settings.humanizer===false?800:1800));
        }
        const selectors=[`div[data-research_id*="${rid}"]`,`[data-research_id="${rid}"]`,`.research_icon.research.${rid}`,`.research_technology.${rid}`,`.research.${rid}`];
        let $candidate=null;
        for(const sel of selectors){const $el=uw.$(sel).filter(':visible');if($el&&$el.length){$candidate=$el.first();break;}}
        if(!$candidate||!$candidate.length)return;
        const $button=$candidate.closest('button,.btn,.research_technology,.research').first();
        ($button.length?$button:$candidate).click();
        await sleep(buildData.settings.humanizer===false?700:randomDelay(900,1800));
        const after=getTownResearchState(tid);
        if(after[rid]===true){queue.shift();saveData();updateStats();log('BUILD',`${town.getName?.()||tid}: recherche ${getResearchName(rid)} lancee`,'success');}
    }catch(e){log('BUILD',`${town.getName?.()||tid}: impossible de lancer ${getResearchName(rid)}: ${e.message}`,'error');}
}

function applyTemplateToTown(templateName){
    const template=buildData.templates[templateName];
    if(!template){log('BUILD',`Template "${templateName}" introuvable`,'error');return;}
    const tid=uw.Game.townId;
    if(!buildData.actionQueues) buildData.actionQueues={};
    const plan=queuePlanForTown(tid,template);
    if(!buildData.activeTemplates) buildData.activeTemplates={};
    buildData.activeTemplates[String(tid)]=templateName;
    buildData.actionQueues[tid]=plan;
    // Compatibilité avec l'ancienne file : on la reconstruit à partir du plan.
    buildData.queues[tid]=(plan.filter(a=>a.type==='building')).map(a=>({buildingId:a.buildingId,level:a.level}));
    buildData.researchQueues[tid]=(plan.filter(a=>a.type==='research')).map(a=>a.rid);
    saveData();
    lastTemplateUiTownId=null;
    syncTemplateUIForCurrentTown(true);
    renderExecutionQueuePreview();
    updateStats(); updateQueueDisplay(); injectSenateQueue(); refreshSenateQueue();
    if(!plan.length){log('BUILD',`Template "${templateName}": aucune action à exécuter`,'info');return;}
    log('BUILD',`Template "${templateName}" chargé : ${plan.length} action(s) dans l'ordre exact`,'success');
    if(buildData.enabled) processAllQueues();
}

// Applique le même template à TOUTES les villes possédées en une seule fois.
// Chaque ville reçoit son propre plan d'actions, calculé individuellement
// selon ses niveaux de bâtiments/recherches actuels (queuePlanForTown est
// appelé séparément pour chaque tid). Sans cela, le template n'étant appliqué
// qu'à la ville actuellement affichée, toutes les autres villes n'ont aucune
// action en file et sont silencieusement ignorées par la routine — ce qui
// donne l'impression que le bot ne change jamais de ville.
function applyTemplateToAllTowns(templateName){
    const template=buildData.templates[templateName];
    if(!template){log('BUILD',`Template "${templateName}" introuvable`,'error');return;}

    const towns=getAllOwnedTownIds();
    if(!towns.length){log('BUILD','Aucune ville trouvee','error');return;}

    if(!buildData.actionQueues) buildData.actionQueues={};
    if(!buildData.activeTemplates) buildData.activeTemplates={};

    let totalActions=0, townsWithActions=0;
    towns.forEach(tid=>{
        const plan=queuePlanForTown(tid,template);
        buildData.activeTemplates[String(tid)]=templateName;
        buildData.actionQueues[tid]=plan;
        buildData.queues[tid]=(plan.filter(a=>a.type==='building')).map(a=>({buildingId:a.buildingId,level:a.level}));
        buildData.researchQueues[tid]=(plan.filter(a=>a.type==='research')).map(a=>a.rid);
        if(plan.length){ totalActions+=plan.length; townsWithActions++; }
    });

    saveData();
    lastTemplateUiTownId=null;
    syncTemplateUIForCurrentTown(true);
    renderExecutionQueuePreview();
    updateStats(); updateQueueDisplay(); injectSenateQueue(); refreshSenateQueue();

    log('BUILD',`Template "${templateName}" applique a ${towns.length} ville(s) — ${townsWithActions} ville(s) avec des actions a effectuer (${totalActions} action(s) au total)`,'success');
    if(buildData.enabled) processAllQueues();
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
    if (q) { const a=Object.values(buildData.actionQueues||{}).reduce((x,q)=>x+q.length,0); q.textContent=a; }
    if (g) g.textContent = buildData.stats.gratisClaimed;
}

function saveData() {
    GM_setValue('gu_build_data', JSON.stringify({
        enabled: buildData.enabled,
        gratisEnabled: buildData.gratisEnabled,
        settings: buildData.settings,
        stats: buildData.stats,
        queues: buildData.queues,
        researchQueues: buildData.researchQueues || {},
        actionQueues: buildData.actionQueues || {},
        activeTemplates: buildData.activeTemplates || {},
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
            if (!buildData.researchQueues) buildData.researchQueues = {};
            if (!buildData.actionQueues) buildData.actionQueues = {};
            if (!buildData.activeTemplates) buildData.activeTemplates = {};
            buildData.settings = { interval: 10, webhook: '', humanizer: true, humanizerMinDelay: 1000, humanizerMaxDelay: 2000, humanizerTownMinDelay: 1200, humanizerTownMaxDelay: 2400, ...(buildData.settings||{}) };
            const allowedIntervals=[5,10,20,40];
            if(!allowedIntervals.includes(Number(buildData.settings.interval))) buildData.settings.interval=10;
            Object.values(buildData.templates).forEach(t=>Object.keys(t||{}).forEach(k=>{if((RESEARCH_FALLBACK[k]||getResearchData(k))&&!k.startsWith(RESEARCH_KEY_PREFIX)){t[RESEARCH_KEY_PREFIX+k]=t[k];delete t[k];}}));
        } catch(e) {}
    }
}
