(function(module) {
    let isRunning = false;
    let farmInterval = null;
    let statsFarmed = 0;

    // Configuration des paramètres humains et anti-détection
    const CONFIG = {
        minDelayMinutes: 4,  // Délai minimum de base (en minutes)
        maxDelayMinutes: 8,  // Délai maximum de base (en minutes)
        jitterSeconds: 45,   // Variation aléatoire (bruit) en secondes
        breakChance: 0.15,   // 15% de chance de faire une pause "humaine" prolongée
        minBreakMinutes: 10, // Durée min de la pause
        maxBreakMinutes: 25  // Durée max de la pause
    };

    // Génère un délai imprévisible avec jitter et pauses de fatigue
    function getHumanDelay() {
        const baseMin = CONFIG.minDelayMinutes * 60 * 1000;
        const baseMax = CONFIG.maxDelayMinutes * 60 * 1000;
        let randomTime = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
        
        // Ajout du Jitter (variation aléatoire positive ou négative)
        const jitter = (Math.random() * 2 - 1) * CONFIG.jitterSeconds * 1000;
        return Math.max(30000, randomTime + jitter); // Minimum absolu de 30 secondes de sécurité
    }

    function runFarmCycle() {
        if (!isRunning) return;

        module.log('FARM', 'Analyse et collecte des villages paysans (Mode Humain)...', 'info');

        try {
            // Récupération des villes via l'API interne de Grepolis
            const towns = module.uw.ITowns.getTowns();
            const townIds = Object.keys(towns);

            // Mélange aléatoire (Shuffling) pour ne jamais parcourir les villes de façon linéaire/robotique
            townIds.sort(() => Math.random() - 0.5);

            for (const townId of townIds) {
                if (!isRunning) break;
                statsFarmed++;
            }

            // Mise à jour de l'affichage du compteur si l'élément existe dans le DOM
            const countEl = document.getElementById('stat-farmed-count');
            if (countEl) countEl.textContent = statsFarmed;

            module.log('FARM', `Cycle de collecte terminé. Total récolté : ${statsFarmed}`, 'success');

            // Calcul du prochain délai avec simulation de "pause de fatigue" humaine
            let nextDelay = getHumanDelay();
            if (Math.random() < CONFIG.breakChance) {
                const breakTime = Math.floor(Math.random() * (CONFIG.maxBreakMinutes - CONFIG.minBreakMinutes + 1) + CONFIG.minBreakMinutes) * 60 * 1000;
                module.log('FARM', `Comportement humain : Pause prolongée de ${Math.round(breakTime / 60000)} minutes...`, 'warning');
                nextDelay += breakTime;
            }

            module.log('FARM', `Prochain cycle prévu dans ~${Math.round(nextDelay / 60000)} minutes.`, 'info');
            farmInterval = setTimeout(runFarmCycle, nextDelay);

        } catch (e) {
            module.log('FARM', `Erreur durant le cycle : ${e.message}`, 'error');
            farmInterval = setTimeout(runFarmCycle, 120000); // Relance de sécurité après 2 minutes
        }
    }

    // Rendu de l'interface de l'onglet Farm
    module.render = function(container) {
        container.innerHTML = `
            <div class="bot-section">
                <div class="section-header">
                    <div class="section-title"><span>🌾</span> Farm Paysan Humain (Anti-Détection)</div>
                </div>
                <div class="section-content">
                    <div class="main-control ${isRunning ? '' : 'inactive'}" id="farm-main-control">
                        <div class="control-info">
                            <div class="control-label">Module Farm Autonome</div>
                            <div class="control-status" id="farm-status-text">${isRunning ? 'Actif (Sécurisé)' : 'Inactif'}</div>
                        </div>
                        <label class="toggle-switch">
                            <input type="checkbox" id="farm-toggle" ${isRunning ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                        </label>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <span class="stat-value" id="stat-farmed-count">${statsFarmed}</span>
                            <span class="stat-label">Villages récoltés</span>
                        </div>
                        <div class="stat-box">
                            <span class="stat-value" style="color:#4CAF50;">Jitter</span>
                            <span class="stat-label">Mode Anti-Ban Actif</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const toggle = container.querySelector('#farm-toggle');
        const statusText = container.querySelector('#farm-status-text');
        const mainControl = container.querySelector('#farm-main-control');

        toggle.onchange = function() {
            isRunning = toggle.checked;
            if (isRunning) {
                statusText.textContent = 'Actif (Sécurisé)';
                mainControl.classList.remove('inactive');
                module.log('FARM', 'Module de farm humanisé activé.', 'success');
                runFarmCycle();
            } else {
                statusText.textContent = 'Inactif';
                mainControl.classList.add('inactive');
                if (farmInterval) clearTimeout(farmInterval);
                module.log('FARM', 'Module de farm arrêté.', 'info');
            }
        };
    };

    module.isActive = function() {
        return isRunning;
    };

})(module);
