// js/uiManager.js
import * as CONSTANTS from './constants.js';
import {
    canvas as gameCanvasElement,
    scoreDisplayElem, healthDisplayElem, highScoreListDisplay, startScreenHighScoresDiv,
    startScreen as importedStartScreen,
    settingsScreen as importedSettingsScreen,
    gameOverScreen as importedGameOverScreen,
    evolutionScreen as importedEvolutionScreen,
    freeUpgradeScreen as importedFreeUpgradeScreen,
    pauseScreen as importedPauseScreen,
    countdownOverlay as importedCountdownOverlay,
    lootChoiceScreen as importedLootChoiceScreen,
    detailedHighScoresScreen as importedDetailedHighScoresScreen,
    evolutionOptionsContainer,
    closeFreeUpgradeButton, freeUpgradeOptionContainer,
    lootOptionsContainer, abilityCooldownUI, evolutionTooltip,
    pausePlayerStatsPanel,
    kineticChargeUIElement, kineticChargeBarFillElement, kineticChargeTextElement,
    uiHighScoreContainer,
    rerollEvolutionButton, rerollInfoSpan,
    blockInfoSpan, toggleBlockModeButton,
    toggleFreezeModeButton, freezeInfoSpan,
    detailedScoresList,
    statsPanelTitle,
    statsCoreDiv, statsUpgradesUl, statsImmunitiesContainer,
    statsAbilitiesDiv, statsMouseAbilitiesDiv, statsBossTiersDiv,
    buffIndicatorContainer, survivalBonusIndicator, activeBuffIndicator,
    highScoreCategorySelect,
    playerPreviewCanvas,
    playerPreviewPlaceholder,
    statsPanelWrapper
} from './ui.js';
import { getReadableColorName as getReadableColorNameFromUtils } from './utils.js';
import { Player } from './player.js';

// --- UI State ---
let localPreviousScreenForSettings = null;
let localCurrentActiveScreenElement = null;

// --- Player Preview Canvas State ---
let previewCanvasEl = null;
let previewCtx = null;
let currentPreviewAimAngle = 0;
let lastPreviewPlayerDataSnapshot = null;
let isPreviewAnimating = false;
let globalPreviewMouseListenerAttached = false;


const ALL_SCREENS_FOR_SHOW_SCREEN = [
    importedStartScreen, importedSettingsScreen, importedGameOverScreen,
    importedEvolutionScreen, importedFreeUpgradeScreen, importedPauseScreen,
    importedCountdownOverlay, importedLootChoiceScreen, importedDetailedHighScoresScreen
];

// --- Helper Function for Time Formatting ---
export function formatMillisecondsToTime(ms) {
    if (typeof ms !== 'number' || isNaN(ms)) return "N/A";
    let milliseconds = Math.floor((ms % 1000) / 10);
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / (1000 * 60)) % 60);

    minutes = (minutes < 10) ? "0" + minutes : minutes.toString();
    seconds = (seconds < 10) ? "0" + seconds : seconds.toString();
    milliseconds = (milliseconds < 10) ? "0" + milliseconds : milliseconds.toString();
    if (milliseconds.length === 1) milliseconds = "0" + milliseconds;

    return minutes + ":" + seconds + "." + milliseconds;
}

// --- Player Preview Canvas Functions ---
function handleGlobalPreviewMouseMove(e) {
    // This condition ensures angle updates ONLY for the active detailed high scores preview
    if (!previewCtx || !previewCanvasEl || !localCurrentActiveScreenElement || localCurrentActiveScreenElement.id !== 'detailedHighScoresScreen' || !isPreviewAnimating) {
        return;
    }
    const rect = previewCanvasEl.getBoundingClientRect(); // Get rect of the preview canvas itself
    const mouseX = e.clientX - rect.left; // Mouse X relative to preview canvas
    const mouseY = e.clientY - rect.top; // Mouse Y relative to preview canvas

    currentPreviewAimAngle = Math.atan2(
        mouseY - (previewCanvasEl.height / 2),
        mouseX - (previewCanvasEl.width / 2)
    );
}


function initPlayerPreviewCanvas() {
    if (playerPreviewCanvas && !previewCtx) {
        previewCanvasEl = playerPreviewCanvas;
        previewCtx = previewCanvasEl.getContext('2d');

        // Attach mousemove to window for global tracking, but conditionally update angle
        if (!globalPreviewMouseListenerAttached) {
            window.addEventListener('mousemove', handleGlobalPreviewMouseMove);
            globalPreviewMouseListenerAttached = true;
        }
        
        console.log("Player Preview Canvas Initialized by UIManager");
    }
}


function playerPreviewAnimationLoop() {
    if (!isPreviewAnimating) {
        return;
    }
    if (!previewCtx || !previewCanvasEl) {
        isPreviewAnimating = false;
        return;
    }

    previewCtx.clearRect(0, 0, previewCanvasEl.width, previewCanvasEl.height);

    if (lastPreviewPlayerDataSnapshot) {
        if (playerPreviewPlaceholder) playerPreviewPlaceholder.style.display = 'none';
        Player.drawFromSnapshot(
            previewCtx,
            lastPreviewPlayerDataSnapshot,
            previewCanvasEl.width / 2,
            previewCanvasEl.height / 2,
            currentPreviewAimAngle
        );
    } else {
        if (playerPreviewPlaceholder) playerPreviewPlaceholder.style.display = 'block';
    }
    
    requestAnimationFrame(playerPreviewAnimationLoop);
}

function startOrUpdatePreviewAnimation(playerData) {
    lastPreviewPlayerDataSnapshot = playerData;

    if (playerData && !isPreviewAnimating) {
        isPreviewAnimating = true;
        requestAnimationFrame(playerPreviewAnimationLoop);
        console.log("Preview animation STARTED with data");
    } else if (!playerData && isPreviewAnimating) {
        isPreviewAnimating = false; 
        if (previewCtx && previewCanvasEl) {
            previewCtx.clearRect(0, 0, previewCanvasEl.width, previewCanvasEl.height);
        }
        if (playerPreviewPlaceholder) playerPreviewPlaceholder.style.display = 'block';
        console.log("Preview animation STOPPED (no data)");
    } else if (playerData && isPreviewAnimating) {
        console.log("Preview animation data UPDATED");
    } else if (!playerData && !isPreviewAnimating) {
        if (previewCtx && previewCanvasEl) {
             previewCtx.clearRect(0, 0, previewCanvasEl.width, previewCanvasEl.height);
        }
        if (playerPreviewPlaceholder) playerPreviewPlaceholder.style.display = 'block';
    }
}


// --- UI Update Functions ---
export function updateScoreDisplay(currentScoreVal) {
    if (scoreDisplayElem) scoreDisplayElem.textContent = `Score: ${currentScoreVal}`;
}
export function updateHealthDisplay(currentHp, maxHp) {
    if (healthDisplayElem) healthDisplayElem.textContent = `Health: ${currentHp}/${maxHp}`;
}

export function updateBuffIndicator(immuneColorsList = []) {
    if (!buffIndicatorContainer) return;
    buffIndicatorContainer.innerHTML = '';
    if (immuneColorsList.length > 0) {
        const textSpan = document.createElement('span'); textSpan.textContent = "Immune:";
        buffIndicatorContainer.appendChild(textSpan);
        immuneColorsList.forEach(color => {
            const swatch = document.createElement('div');
            swatch.classList.add('buffSwatch');
            swatch.style.backgroundColor = color;
            swatch.title = getReadableColorNameFromUtils(color);
            buffIndicatorContainer.appendChild(swatch);
        });
    }
}

export function updateSurvivalBonusIndicator(currentSurvivalUpgradesVal, maxSurvivalUpgradesConst) {
    if (!survivalBonusIndicator) return;
    if (currentSurvivalUpgradesVal > 0) { survivalBonusIndicator.textContent = `Survival Bonus: +${currentSurvivalUpgradesVal}${(currentSurvivalUpgradesVal >= maxSurvivalUpgradesConst ? " (Max)" : "")}`; }
    else { survivalBonusIndicator.textContent = ''; }
}

export function updateActiveBuffIndicator(playerInstance, currentPostPopupImmunityTimerVal, currentPostDamageImmunityTimerVal) {
    if (!activeBuffIndicator || !playerInstance) return;
    let textParts = []; let maxImmunityTime = 0;
    if (currentPostPopupImmunityTimerVal > 0) maxImmunityTime = Math.max(maxImmunityTime, currentPostPopupImmunityTimerVal);
    if (currentPostDamageImmunityTimerVal > 0) maxImmunityTime = Math.max(maxImmunityTime, currentPostDamageImmunityTimerVal);
    if (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0) { textParts.push(`Teleporting (${(playerInstance.teleportEffectTimer / 1000).toFixed(1)}s)`); }
    if (playerInstance.isShieldOvercharging) { textParts.push(`Overcharge (${(playerInstance.shieldOverchargeTimer / 1000).toFixed(1)}s)`); }
    if (maxImmunityTime > 0 && !(playerInstance.teleporting && playerInstance.teleportEffectTimer > 0) && !playerInstance.isShieldOvercharging) { textParts.push(`Shield (${Math.ceil(maxImmunityTime / 1000)}s)`);}

    if (playerInstance.isHarmonized && playerInstance.hasPerfectHarmonyHelm) {
        textParts.push("Harmony!");
    }
    activeBuffIndicator.textContent = textParts.join(' ').trim();
}

export function displayTopRecordForEachCategory(containerElement, allHighScoresObject) {
    if (!containerElement || !allHighScoresObject) return;
    containerElement.innerHTML = '';

    const categoriesToShow = [
        { key: "nexusWeaverTier1Time", label: "Nexus T1", isTime: true },
        { key: "nexusWeaverTier2Time", label: "Nexus T2", isTime: true },
        { key: "nexusWeaverTier3Time", label: "Nexus T3", isTime: true },
        { key: "nexusWeaverTier4Time", label: "Nexus T4", isTime: true },
        { key: "nexusWeaverTier5Time", label: "Nexus T5", isTime: true },
        { key: "survival", label: "Survival", isTime: false }
    ];

    let hasAnyRecord = false;
    categoriesToShow.forEach(catInfo => {
        const scoresForCategory = allHighScoresObject[catInfo.key] || [];
        const li = document.createElement('li');
        let entryText = `${catInfo.label}: `;
        if (scoresForCategory.length > 0) {
            const topEntry = scoresForCategory[0];
            const valueDisplay = catInfo.isTime ? formatMillisecondsToTime(topEntry.value) : topEntry.value.toLocaleString();
            entryText += `${valueDisplay} (${topEntry.name})`;
            hasAnyRecord = true;
        } else {
            entryText += catInfo.isTime ? "--:--.--" : "No Record";
        }
        li.textContent = entryText;
        li.style.fontSize = "12px"; li.style.whiteSpace = "nowrap";
        containerElement.appendChild(li);
    });
    if (!hasAnyRecord && categoriesToShow.length > 0) {
        const li = document.createElement('li'); li.textContent = "No high scores yet!"; li.style.fontSize = "12px";
        containerElement.appendChild(li);
    }
}

export function updateAllHighScoreDisplays(allHighScoresObject) {
    if (highScoreListDisplay && allHighScoresObject) {
        displayTopRecordForEachCategory(highScoreListDisplay, allHighScoresObject);
    }
    if (startScreenHighScoresDiv && allHighScoresObject) {
        displayTopRecordForEachCategory(startScreenHighScoresDiv, allHighScoresObject);
    }
}

export function updateAbilityCooldownUI(playerInstance) {
    if (!abilityCooldownUI || !playerInstance) return;
    abilityCooldownUI.innerHTML = '';
    const abilityDisplayOrder = [
        { type: 'mouse', id: 'omegaLaser', keybindText: 'LMB', iconText: '🔥', check: () => playerInstance.hasOmegaLaser, isCharging: () => playerInstance.isFiringOmegaLaser, timer: () => playerInstance.omegaLaserTimer, maxTime: () => playerInstance.omegaLaserDuration, cooldownTimer: () => playerInstance.omegaLaserCooldownTimer, cooldownMax: () => playerInstance.omegaLaserCooldown },
        { type: 'mouse', id: 'shieldOvercharge', keybindText: 'RMB', iconText: '🛡️', check: () => playerInstance.hasShieldOvercharge, isCharging: () => playerInstance.isShieldOvercharging, timer: () => playerInstance.shieldOverchargeTimer, maxTime: () => playerInstance.shieldOverchargeDuration, cooldownTimer: () => playerInstance.shieldOverchargeCooldownTimer, cooldownMax: () => playerInstance.shieldOverchargeCooldown },
        { type: 'slot', slot: '1', id: 'empBurst',        defaultIcon: '💥', fixedName: 'EMP Burst' },
        { type: 'slot', slot: '2', id: 'miniGravityWell', defaultIcon: '🔮', fixedName: 'Mini Gravity Well' },
        { type: 'slot', slot: '3', id: 'teleport',        defaultIcon: '🌀', fixedName: 'Teleport' }
    ];
    abilityDisplayOrder.forEach(desc => {
        const slotDiv = document.createElement('div'); slotDiv.classList.add('ability-slot'); slotDiv.id = `ability-slot-${desc.id || desc.slot}`;
        let isUnlocked = false, isReady = false, isChargingOrActive = false, maxTimer = 0, displayCooldownTimerValue = 0;
        if (desc.type === 'mouse') {
            isUnlocked = desc.check();
            if (isUnlocked) {
                isChargingOrActive = desc.isCharging();
                if (isChargingOrActive) { displayCooldownTimerValue = desc.timer(); maxTimer = desc.maxTime(); }
                else if (desc.cooldownTimer() > 0) { displayCooldownTimerValue = desc.cooldownTimer(); maxTimer = desc.cooldownMax(); }
                else { isReady = true; }
            }
        } else if (desc.type === 'slot') {
            const ability = playerInstance.activeAbilities[desc.slot];
            if (ability) {
                isUnlocked = true; maxTimer = ability.cooldownDuration;
                if (playerInstance.hasUltimateConfigurationHelm) maxTimer *= 1.5;
                if (ability.id === 'miniGravityWell' && playerInstance.activeMiniWell && playerInstance.activeMiniWell.isActive) {
                    isChargingOrActive = true; displayCooldownTimerValue = playerInstance.activeMiniWell.lifeTimer; maxTimer = playerInstance.activeMiniWell.maxLife;
                } else if (ability.cooldownTimer > 0) { displayCooldownTimerValue = ability.cooldownTimer; }
                else { isReady = true; }
            }
        }
        const keybindSpan = document.createElement('span'); keybindSpan.classList.add('keybind'); keybindSpan.textContent = desc.keybindText || desc.slot;
        const iconDivElem = document.createElement('div'); iconDivElem.classList.add('icon'); iconDivElem.textContent = desc.defaultIcon || '?';
        if (isUnlocked && desc.type === 'mouse') iconDivElem.textContent = desc.iconText;
        else if (isUnlocked && desc.type === 'slot' && playerInstance.activeAbilities[desc.slot]) {
            const abilityId = playerInstance.activeAbilities[desc.slot].id;
            switch(abilityId) { case 'empBurst': iconDivElem.textContent = '💥'; break; case 'miniGravityWell': iconDivElem.textContent = '🔮'; break; case 'teleport': iconDivElem.textContent = '🌀'; break; default: break; }
        }
        const cooldownOverlayDiv = document.createElement('div'); cooldownOverlayDiv.classList.add('cooldown-overlay');
        const cooldownTimerSpan = document.createElement('span'); cooldownTimerSpan.classList.add('cooldown-timer');
        slotDiv.appendChild(keybindSpan); slotDiv.appendChild(iconDivElem); slotDiv.appendChild(cooldownOverlayDiv); slotDiv.appendChild(cooldownTimerSpan);
        if (!isUnlocked) {
            slotDiv.classList.add('locked'); iconDivElem.style.opacity = '0.3';
            const lockIconDiv = document.createElement('div'); lockIconDiv.classList.add('icon', 'lock-icon-overlay'); lockIconDiv.textContent = '🔒';
            slotDiv.appendChild(lockIconDiv); cooldownOverlayDiv.style.height = '100%'; cooldownOverlayDiv.style.backgroundColor = 'rgba(50,50,50,0.8)';
        } else if (isChargingOrActive) {
            slotDiv.classList.add('charging');
            if (maxTimer > 0 && displayCooldownTimerValue >= 0) { cooldownOverlayDiv.style.height = `${Math.max(0, (1 - (displayCooldownTimerValue / maxTimer)) * 100)}%`; cooldownTimerSpan.textContent = (displayCooldownTimerValue / 1000).toFixed(1) + 's'; }
            else if (maxTimer > 0 && displayCooldownTimerValue < 0) { cooldownOverlayDiv.style.height = '100%'; cooldownTimerSpan.textContent = '0.0s';}
        } else if (!isReady && displayCooldownTimerValue > 0) {
            slotDiv.classList.add('on-cooldown');
            if (maxTimer > 0) { const cooldownPercent = (displayCooldownTimerValue / maxTimer) * 100; cooldownOverlayDiv.style.height = `${Math.min(100, Math.max(0, cooldownPercent))}%`; cooldownTimerSpan.textContent = (displayCooldownTimerValue / 1000).toFixed(1) + 's'; }
        } else if (isReady) { slotDiv.classList.add('ready'); cooldownOverlayDiv.style.height = '0%'; }
        abilityCooldownUI.appendChild(slotDiv);
    });
}

export function updateKineticChargeUI(currentCharge, maxCharge, currentMaxPotencyBonus, playerHasKineticConversionEvolution) {
    if (!kineticChargeUIElement || !kineticChargeBarFillElement || !kineticChargeTextElement) return;
    if (playerHasKineticConversionEvolution) kineticChargeUIElement.style.display = 'flex';
    else { kineticChargeUIElement.style.display = 'none'; return; }
    const chargePercentage = Math.max(0, Math.min(100, (currentCharge / maxCharge) * 100));
    kineticChargeBarFillElement.style.width = `${chargePercentage}%`;
    let barColor = 'rgba(0, 60, 120, 0.8)';
    if (chargePercentage > 89.9) {
        barColor = 'rgba(255, 100, 0, 1.0)';
        if (!kineticChargeBarFillElement.classList.contains('sparkling')) {
            kineticChargeBarFillElement.classList.add('sparkling');
            kineticChargeBarFillElement.style.setProperty('--sparkle1-x', `${Math.random()*80 + 10}%`);
            kineticChargeBarFillElement.style.setProperty('--sparkle1-y', `${Math.random()*60 + 20}%`);
            kineticChargeBarFillElement.style.setProperty('--sparkle2-x', `${Math.random()*80 + 10}%`);
            kineticChargeBarFillElement.style.setProperty('--sparkle2-y', `${Math.random()*60 + 20}%`);
        }
    } else {
        if (kineticChargeBarFillElement.classList.contains('sparkling')) kineticChargeBarFillElement.classList.remove('sparkling');
        if (chargePercentage > 70) barColor = 'rgba(255, 180, 0, 0.9)';
        else if (chargePercentage > 30) barColor = 'rgba(0, 150, 200, 0.9)';
    }
    kineticChargeBarFillElement.style.backgroundColor = barColor;
    if (kineticChargeTextElement) {
        if (currentCharge > 1) {
            const potencyBonusForCurrentCharge = currentMaxPotencyBonus * (currentCharge / maxCharge);
            kineticChargeTextElement.textContent = `+${(potencyBonusForCurrentCharge * 100).toFixed(0)}% Dmg`;
        } else kineticChargeTextElement.textContent = '';
    }
}

export function showScreen(screenElementToShow) {
    ALL_SCREENS_FOR_SHOW_SCREEN.forEach((screen) => {
        if (screen) screen.style.display = (screen === screenElementToShow) ? 'flex' : 'none';
    });
    localCurrentActiveScreenElement = screenElementToShow;

    if (screenElementToShow === importedDetailedHighScoresScreen) {
        if (statsPanelWrapper && pausePlayerStatsPanel && pausePlayerStatsPanel.parentElement !== statsPanelWrapper) {
            statsPanelWrapper.innerHTML = '';
            statsPanelWrapper.appendChild(pausePlayerStatsPanel);
        }
        startOrUpdatePreviewAnimation(null); 
    } else {
        if (pausePlayerStatsPanel && pausePlayerStatsPanel.parentElement !== document.body) {
             document.body.appendChild(pausePlayerStatsPanel);
        }
        if (screenElementToShow !== importedPauseScreen && screenElementToShow !== importedGameOverScreen) {
            if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';
        }
        if (isPreviewAnimating && localCurrentActiveScreenElement !== importedDetailedHighScoresScreen) { // Also check current screen
            isPreviewAnimating = false; 
        }
    }

    if (screenElementToShow === null) {
        if (gameCanvasElement) gameCanvasElement.style.display = 'block';
    } else {
        if (gameCanvasElement) {
            const showCanvasBehind = screenElementToShow === importedPauseScreen ||
                                     screenElementToShow === importedEvolutionScreen ||
                                     screenElementToShow === importedFreeUpgradeScreen ||
                                     screenElementToShow === importedLootChoiceScreen ||
                                     screenElementToShow === importedCountdownOverlay ||
                                     (screenElementToShow === importedSettingsScreen && localPreviousScreenForSettings === importedPauseScreen);
            gameCanvasElement.style.display = showCanvasBehind ? 'block' : 'none';
        }
    }
    if (screenElementToShow === importedEvolutionScreen) equalizeEvolutionCardHeights();
    if (screenElementToShow === importedFreeUpgradeScreen) equalizeFreeUpgradeCardHeights();
    if (screenElementToShow === importedLootChoiceScreen) equalizeLootCardHeights();
}


export function getPreviousScreenForSettings() { return localPreviousScreenForSettings; }
export function setPreviousScreenForSettings(screenRef) { localPreviousScreenForSettings = screenRef; }
export function getCurrentActiveScreen() { return localCurrentActiveScreenElement; }

function getTierStyling(tier) {
    switch(tier) {
        case 'core': return { color: '#00E0FF', text: 'CORE' };
        case 'common': return { color: '#9DB8B7', text: 'COMMON' };
        case 'rare': return { color: '#55FF55', text: 'RARE' };
        case 'epic': return { color: '#C077FF', text: 'EPIC' };
        case 'legendary': return { color: '#FFB000', text: 'LEGENDARY' };
        default: return { color: '#FFFFFF', text: tier ? tier.toUpperCase() : ''};
    }
}
function equalizeEvolutionCardHeights() {
    if (!evolutionOptionsContainer) return;
    const optionElements = evolutionOptionsContainer.querySelectorAll('.evolutionOption');
    if (optionElements.length > 0) {
        requestAnimationFrame(() => {
            let maxHeight = 0;
            optionElements.forEach(opt => { opt.style.minHeight = '0'; opt.style.height = 'auto'; if (opt.offsetHeight > maxHeight) maxHeight = opt.offsetHeight; });
            if (maxHeight > 0) optionElements.forEach(opt => { opt.style.minHeight = `${maxHeight}px`; });
        });
    }
}
function equalizeFreeUpgradeCardHeights() {
    if (!freeUpgradeOptionContainer) return;
    const optionElements = freeUpgradeOptionContainer.querySelectorAll('.freeUpgradeOption');
     if (optionElements.length > 0) {
        requestAnimationFrame(() => {
            let maxHeight = 0;
            optionElements.forEach(opt => { opt.style.minHeight = '0'; opt.style.height = 'auto'; if (opt.offsetHeight > maxHeight) maxHeight = opt.offsetHeight; });
            if (maxHeight > 0) optionElements.forEach(opt => { opt.style.minHeight = `${maxHeight}px`; });
        });
    }
}
function equalizeLootCardHeights() {
     if (!lootOptionsContainer) return;
    const optionElements = lootOptionsContainer.querySelectorAll('.lootOption');
    if (optionElements.length > 0) {
        requestAnimationFrame(() => {
            let maxHeight = 0;
            optionElements.forEach(opt => { opt.style.minHeight = '0'; opt.style.height = 'auto'; if (opt.offsetHeight > maxHeight) maxHeight = opt.offsetHeight; });
            if (maxHeight > 0) optionElements.forEach(opt => { opt.style.minHeight = `${maxHeight}px`; });
        });
    }
}

export function populateEvolutionOptionsUI(
    choices, playerInstance, evolutionSelectCallback, rerollCallback,
    toggleBlockModeCallback, currentShrinkMeCooldownVal, toggleFreezeModeCallback, selectFreezeCallback
) {
    if (!evolutionOptionsContainer || !playerInstance) return;
    evolutionOptionsContainer.innerHTML = '';
    const maxReRolls = CONSTANTS.MAX_EVOLUTION_REROLLS; const maxBlocks = CONSTANTS.MAX_EVOLUTION_BLOCKS; const maxFreezes = CONSTANTS.MAX_EVOLUTION_FREEZES_PER_RUN;

    if (rerollEvolutionButton && rerollInfoSpan) {
        rerollEvolutionButton.disabled = playerInstance.evolutionReRollsRemaining <= 0 || playerInstance.isFreezeModeActive || playerInstance.isBlockModeActive;
        rerollEvolutionButton.onclick = rerollCallback;
        rerollInfoSpan.textContent = `Re-rolls left: ${playerInstance.evolutionReRollsRemaining || 0}/${maxReRolls}`;
    }
    if (toggleBlockModeButton && blockInfoSpan) {
        toggleBlockModeButton.disabled = (playerInstance.evolutionBlocksRemaining <= 0 && !playerInstance.isBlockModeActive) || playerInstance.isFreezeModeActive;
        if (playerInstance.isBlockModeActive) { toggleBlockModeButton.textContent = "Block Active (Cancel X)"; toggleBlockModeButton.classList.add('block-mode-active'); }
        else { toggleBlockModeButton.textContent = `Enable Block (X)`; toggleBlockModeButton.classList.remove('block-mode-active'); }
        toggleBlockModeButton.onclick = toggleBlockModeCallback;
        blockInfoSpan.textContent = `Blocks left: ${playerInstance.evolutionBlocksRemaining !== undefined ? playerInstance.evolutionBlocksRemaining : 0}/${maxBlocks}`;
    }
    if (toggleFreezeModeButton && freezeInfoSpan) {
        toggleFreezeModeButton.disabled = (playerInstance.evolutionFreezesRemaining <= 0 && !playerInstance.isFreezeModeActive && !playerInstance.frozenEvolutionChoice) || playerInstance.isBlockModeActive;
        if (playerInstance.isFreezeModeActive) { toggleFreezeModeButton.textContent = "Freeze Active (Cancel F)"; toggleFreezeModeButton.classList.add('freeze-mode-active'); toggleFreezeModeButton.classList.remove('has-frozen-choice');}
        else if (playerInstance.frozenEvolutionChoice) { toggleFreezeModeButton.textContent = "Unfreeze Current (F)"; toggleFreezeModeButton.classList.add('has-frozen-choice'); toggleFreezeModeButton.classList.remove('freeze-mode-active');}
        else { toggleFreezeModeButton.textContent = `Enable Freeze (F)`; toggleFreezeModeButton.classList.remove('freeze-mode-active'); toggleFreezeModeButton.classList.remove('has-frozen-choice');}
        toggleFreezeModeButton.onclick = toggleFreezeModeCallback;
        freezeInfoSpan.textContent = `Freezes left: ${playerInstance.evolutionFreezesRemaining || 0}/${maxFreezes}`;
    }

    choices.forEach((uiChoiceData, index) => {
        const choiceWrapper = document.createElement('div'); choiceWrapper.classList.add('evolution-choice-wrapper');
        const optionDiv = document.createElement('div'); optionDiv.classList.add('evolutionOption'); optionDiv.dataset.class = uiChoiceData.classType; optionDiv.dataset.baseId = uiChoiceData.baseId;
        const tierLabel = document.createElement('span'); tierLabel.classList.add('evolution-tier-label');
        if (!uiChoiceData.originalEvolution.isTiered) {
            optionDiv.dataset.tier = "core"; const tierStyle = getTierStyling("core");
            tierLabel.textContent = tierStyle.text; tierLabel.style.color = tierStyle.color; tierLabel.classList.add('has-tier');
        } else if (uiChoiceData.originalEvolution.isTiered && uiChoiceData.rolledTier && uiChoiceData.rolledTier !== "none") {
            const tierStyle = getTierStyling(uiChoiceData.rolledTier);
            tierLabel.textContent = tierStyle.text; tierLabel.style.color = tierStyle.color; tierLabel.classList.add('has-tier'); optionDiv.dataset.tier = uiChoiceData.rolledTier;
        }
        choiceWrapper.appendChild(tierLabel);
        let displayText = `<h3>${uiChoiceData.text}</h3>`;
        if (uiChoiceData.cardEffectString) displayText += `<span class="evolution-details">${uiChoiceData.cardEffectString}</span>`;
        optionDiv.innerHTML = displayText;
        const baseEvoForMaxCheck = uiChoiceData.originalEvolution;
        const isMaxed = baseEvoForMaxCheck.isMaxed ? baseEvoForMaxCheck.isMaxed(playerInstance) : false;
        const isAlreadyBlockedByPlayer = playerInstance.blockedEvolutionIds && playerInstance.blockedEvolutionIds.includes(uiChoiceData.baseId);
        if (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData.baseId === uiChoiceData.baseId && playerInstance.hasUsedFreezeForCurrentOffers) {
            optionDiv.classList.add('actually-frozen');
        }
        if (uiChoiceData.detailedDescription && evolutionTooltip) {
            optionDiv.onmouseover = (event) => {
                if (playerInstance.isBlockModeActive && uiChoiceData.baseId !== 'noMoreEvolutions' && !uiChoiceData.baseId.startsWith('empty_slot_') && !isAlreadyBlockedByPlayer && playerInstance.evolutionBlocksRemaining > 0) optionDiv.classList.add('primed-for-block');
                if (playerInstance.isFreezeModeActive && uiChoiceData.baseId !== 'noMoreEvolutions' && !uiChoiceData.baseId.startsWith('empty_slot_') && !isMaxed && !isAlreadyBlockedByPlayer && (playerInstance.evolutionFreezesRemaining > 0 || (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData.baseId === uiChoiceData.baseId))) optionDiv.classList.add('primed-for-freeze');
                let tooltipText = ""; let effectiveTierForTooltip = "core";
                if (uiChoiceData.originalEvolution.isTiered && uiChoiceData.rolledTier && uiChoiceData.rolledTier !== "none") effectiveTierForTooltip = uiChoiceData.rolledTier;
                const tierStyle = getTierStyling(effectiveTierForTooltip);
                tooltipText = `<span style="text-transform: capitalize; font-weight: bold; color: ${tierStyle.color};">${tierStyle.text} TIER</span><br>`;
                tooltipText += uiChoiceData.detailedDescription;
                evolutionTooltip.innerHTML = tooltipText; evolutionTooltip.style.left = `${event.pageX + 15}px`; evolutionTooltip.style.top = `${event.pageY + 15}px`; evolutionTooltip.style.display = 'block';
            };
            optionDiv.onmousemove = (event) => { evolutionTooltip.style.left = `${event.pageX + 15}px`; evolutionTooltip.style.top = `${event.pageY + 15}px`; };
            optionDiv.onmouseout = () => { optionDiv.classList.remove('primed-for-block'); optionDiv.classList.remove('primed-for-freeze'); evolutionTooltip.style.display = 'none'; };
        }
        if (baseEvoForMaxCheck.id === 'noMoreEvolutions' || baseEvoForMaxCheck.id.startsWith('empty_slot_') || isMaxed || isAlreadyBlockedByPlayer ) {
            optionDiv.classList.add('disabled'); if (optionDiv.dataset.tier !== "core" || !isMaxed) optionDiv.dataset.tier = 'disabled';
            if(isAlreadyBlockedByPlayer && !optionDiv.classList.contains('disabled')){ const h3 = optionDiv.querySelector('h3'); if (h3) h3.innerHTML += `<p style="font-size:10px; color:#ff8080;">(Blocked)</p>`; optionDiv.classList.add('disabled'); optionDiv.dataset.tier = 'disabled'; }
            if (baseEvoForMaxCheck.id === 'smallerPlayer' && currentShrinkMeCooldownVal > 0) { const h3 = optionDiv.querySelector('h3'); if (h3) h3.innerHTML += `<p style="font-size:10px; color:#aaa;">(Cooldown: ${currentShrinkMeCooldownVal})</p>`;}
        } else {
            optionDiv.onclick = () => {
                if (playerInstance.isFreezeModeActive) { if (selectFreezeCallback) selectFreezeCallback(uiChoiceData, index); }
                else if (playerInstance.isBlockModeActive) { if (evolutionSelectCallback) evolutionSelectCallback(uiChoiceData, index); }
                else { if (evolutionSelectCallback) evolutionSelectCallback(uiChoiceData, index); }
            };
        }
        choiceWrapper.appendChild(optionDiv); evolutionOptionsContainer.appendChild(choiceWrapper);
    });
    equalizeEvolutionCardHeights();
}

export function populateFreeUpgradeOptionUI(chosenUpgrade, onContinueCallback) {
    if (!freeUpgradeOptionContainer || !closeFreeUpgradeButton) return;
    freeUpgradeOptionContainer.innerHTML = '';
    const optionDiv = document.createElement('div');
    optionDiv.classList.add('freeUpgradeOption');
    optionDiv.innerHTML = `<h3>${chosenUpgrade.text}</h3><p>${chosenUpgrade.id === 'noMoreFreeUpgrades' ? 'Continue playing!' : 'Claim this free bonus!'}</p>`;
    freeUpgradeOptionContainer.appendChild(optionDiv);
    closeFreeUpgradeButton.onclick = () => onContinueCallback(chosenUpgrade);
}

export function populateLootOptionsUI(choices, playerInstance, onSelectLootCallback, allPossibleColors) {
    if (!lootOptionsContainer || !playerInstance) return;
    lootOptionsContainer.innerHTML = '';
    choices.forEach(choice => {
        const optionDiv = document.createElement('div'); optionDiv.classList.add('lootOption'); let colorsToOffer = [];
        if (choice.type === 'path_buff') {
             optionDiv.innerHTML = `<h3>${choice.name}</h3> <p>${choice.description}</p><span class="optionType" style="color: #FFD700; font-weight:bold;">Path Defining</span>`;
             optionDiv.onclick = () => onSelectLootCallback(choice);
        } else if (choice.id === 'adaptiveShield') {
           let availableColors = allPossibleColors.filter(c => !playerInstance.immuneColorsList.includes(c)); let offeredColorsText = [];
           if (availableColors.length > 0) {
               for(let i = 0; i < 4 && availableColors.length > 0; i++){ const rIndex = Math.floor(Math.random() * availableColors.length); const selectedColor = availableColors.splice(rIndex, 1)[0]; colorsToOffer.push(selectedColor); offeredColorsText.push(`<span style="color:${selectedColor}; text-shadow: 1px 1px 1px black; font-weight: bold;">${getReadableColorNameFromUtils(selectedColor)}</span>`);}
               optionDiv.innerHTML = `<h3>${choice.name}</h3> <p>${choice.description.replace('up to 4 new random ray colors', `immunity to: ${offeredColorsText.join(', ')}`)}</p> <span class="optionType">${choice.type.charAt(0).toUpperCase() + choice.type.slice(1)}</span>`;
               optionDiv.onclick = () => onSelectLootCallback({...choice, chosenColors: colorsToOffer });
           } else {
               optionDiv.innerHTML = `<h3>${choice.name}</h3> <p>Already immune to all known ray colors!</p> <span class="optionType">${choice.type.charAt(0).toUpperCase() + choice.type.slice(1)}</span>`;
               optionDiv.style.opacity = '0.6'; optionDiv.style.cursor = 'not-allowed';
           }
        } else {
            optionDiv.innerHTML = `<h3>${choice.name}</h3> <p>${choice.description}</p> <span class="optionType">${choice.type.charAt(0).toUpperCase() + choice.type.slice(1)}</span>`;
            optionDiv.onclick = () => onSelectLootCallback(choice);
        }
        lootOptionsContainer.appendChild(optionDiv);
    });
    equalizeLootCardHeights();
}


export function displayGameOverScreenContent(currentScoreVal, isNewHighScore, onSubmitScoreCallback, onRestartCallback, onMainMenuCallback) {
    if (!importedGameOverScreen) return;
    importedGameOverScreen.innerHTML = '';
    const title = document.createElement('h2'); title.textContent = "Game Over!"; importedGameOverScreen.appendChild(title);
    const scoreP = document.createElement('p'); scoreP.textContent = `Your final score: ${currentScoreVal}`; importedGameOverScreen.appendChild(scoreP);
    if (isNewHighScore) {
        const newHSP = document.createElement('p'); newHSP.style.color = '#0f0'; newHSP.textContent = "New High Score!"; importedGameOverScreen.appendChild(newHSP);
        const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = 'playerNameInputGameOver'; nameInput.placeholder = "Enter name (max 10)"; nameInput.maxLength = 10; importedGameOverScreen.appendChild(nameInput);
        const submitButton = document.createElement('button'); submitButton.id = 'submitScoreButtonGameOver'; submitButton.textContent = "Submit";
        submitButton.onclick = () => { const name = (nameInput.value.trim().substring(0,10)||"ANON").toUpperCase(); onSubmitScoreCallback(name); submitButton.disabled = true; submitButton.textContent = "Submitted!"; };
        importedGameOverScreen.appendChild(submitButton);
    }
    const restartButton = document.createElement('button'); restartButton.id = 'restartButtonGOScreen'; restartButton.textContent = "Play Again"; restartButton.onclick = onRestartCallback; importedGameOverScreen.appendChild(restartButton);
    const mainMenuButton = document.createElement('button'); mainMenuButton.id = 'mainMenuButtonGOScreen'; mainMenuButton.textContent = "Main Menu"; mainMenuButton.onclick = onMainMenuCallback; importedGameOverScreen.appendChild(mainMenuButton);
}

export function displayDetailedHighScoresScreenUI(allHighScoresObject, onEntryClickCallback, onBackCallback) {
    if (!importedDetailedHighScoresScreen || !detailedScoresList || !statsPanelWrapper || !highScoreCategorySelect || !playerPreviewCanvas) {
        console.error("Detailed high scores screen elements not found for displayDetailedHighScoresScreenUI!"); return;
    }

    initPlayerPreviewCanvas();

    if (pausePlayerStatsPanel && statsPanelWrapper && pausePlayerStatsPanel.parentElement !== statsPanelWrapper) {
        statsPanelWrapper.innerHTML = '';
        statsPanelWrapper.appendChild(pausePlayerStatsPanel);
    }
    if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';

    startOrUpdatePreviewAnimation(null);

    highScoreCategorySelect.innerHTML = '';
    const categories = [
        { value: "survival", text: "Survival Scores" },
        { value: "nexusWeaverTier1Time", text: "Nexus Weaver T1 Time" },
        { value: "nexusWeaverTier2Time", text: "Nexus Weaver T2 Time" },
        { value: "nexusWeaverTier3Time", text: "Nexus Weaver T3 Time" },
        { value: "nexusWeaverTier4Time", text: "Nexus Weaver T4 Time" },
        { value: "nexusWeaverTier5Time", text: "Nexus Weaver T5 Time" },
    ];

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.value;
        option.textContent = cat.text;
        highScoreCategorySelect.appendChild(option);
    });

    const renderScoresForCategory = (categoryKey) => {
        detailedScoresList.innerHTML = '';
        startOrUpdatePreviewAnimation(null);
        if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';

        const scoresData = allHighScoresObject[categoryKey] || [];
        const isTimeBased = categoryKey.toLowerCase().includes("time");

        if (!scoresData || scoresData.length === 0) {
            const li = document.createElement('li');
            li.textContent = "No high scores recorded for this category yet.";
            detailedScoresList.appendChild(li);
        } else {
            scoresData.forEach((scoreEntry, index) => {
                const li = document.createElement('li');
                let dateString = scoreEntry.timestamp ? ` (${new Date(scoreEntry.timestamp).toLocaleDateString()})` : '';
                const valueDisplay = isTimeBased ? formatMillisecondsToTime(scoreEntry.value) : scoreEntry.value.toLocaleString();
                li.textContent = `${index + 1}. ${scoreEntry.name} - ${valueDisplay}${dateString}`;

                if (scoreEntry.stats && scoreEntry.stats.playerData) {
                    li.onclick = () => {
                        const currentSelected = detailedScoresList.querySelector('.selected-score');
                        if (currentSelected) currentSelected.classList.remove('selected-score');
                        li.classList.add('selected-score');
                        onEntryClickCallback(scoreEntry.stats, scoreEntry.name, categoryKey);
                        currentPreviewAimAngle = 0; // Reset aim angle on new selection
                        startOrUpdatePreviewAnimation(scoreEntry.stats.playerData);
                        if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'block';
                    };
                } else {
                    li.style.cursor = "default";
                    li.title = "Detailed stats not available for this entry.";
                }
                detailedScoresList.appendChild(li);
            });
        }
    };

    highScoreCategorySelect.onchange = (event) => {
        renderScoresForCategory(event.target.value);
        localStorage.setItem('highScoreLastCategory', event.target.value);
    };
    
    const lastSelectedCategory = localStorage.getItem('highScoreLastCategory');
    if (lastSelectedCategory && categories.find(c => c.value === lastSelectedCategory)) {
        highScoreCategorySelect.value = lastSelectedCategory;
    } else {
        highScoreCategorySelect.value = "survival";
    }
    renderScoresForCategory(highScoreCategorySelect.value);

    const backButton = document.getElementById('backToMainMenuFromScoresButton');
    if (backButton) {
        const newBackButton = backButton.cloneNode(true);
        backButton.parentNode.replaceChild(newBackButton, backButton);
        newBackButton.onclick = () => {
            isPreviewAnimating = false; 
            startOrUpdatePreviewAnimation(null);
            onBackCallback();
        };
    }
}

export function updatePauseScreenStatsDisplay(statsSnapshot, panelTitleText = "Player Status") {
    if (!statsCoreDiv || !statsUpgradesUl || !statsImmunitiesContainer || !statsBossTiersDiv || !statsAbilitiesDiv || !statsMouseAbilitiesDiv) {
        if (pausePlayerStatsPanel) pausePlayerStatsPanel.innerHTML = "<p>Error loading stats sections.</p>";
        return;
    }
    if (statsPanelTitle) statsPanelTitle.textContent = panelTitleText;
    if (!statsSnapshot || !statsSnapshot.playerData) {
        const noDataMsg = "<p><span style='color: #aaa; font-size:11px;'>No data available for this entry.</span></p>";
        statsCoreDiv.innerHTML = noDataMsg; statsUpgradesUl.innerHTML = `<li>${noDataMsg.replace(/<p>|<\/p>/g, '')}</li>`;
        statsImmunitiesContainer.innerHTML = `<span>${noDataMsg.replace(/<p>|<\/p>/g, '')}</span>`; statsAbilitiesDiv.innerHTML = noDataMsg;
        statsMouseAbilitiesDiv.innerHTML = noDataMsg; statsBossTiersDiv.innerHTML = noDataMsg;
        return;
    }
    const { playerData, bossTierData, gameplayTimeData } = statsSnapshot;
    const bossTypeNamesFromSource = CONSTANTS.standardBossTypeNames ? [...CONSTANTS.standardBossTypeNames, CONSTANTS.nexusWeaverBossName] : ["CHASER", "REFLECTOR", "SINGULARITY", "NEXUS WEAVER"];
    const bossTypeKeysFromSource = CONSTANTS.standardBossTypeKeys ? [...CONSTANTS.standardBossTypeKeys, CONSTANTS.nexusWeaverBossKey] : ["chaser", "reflector", "singularity", "nexusWeaver"];
    let coreHTML = '';
    const formatNum = (val, digits = 1) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(digits) : 'N/A');
    const formatInt = (val) => (typeof val === 'number' && !isNaN(val) ? val.toString() : 'N/A');
    const formatPercent = (val) => (typeof val === 'number' && !isNaN(val) ? (val * 100).toFixed(0) + '%' : '0%');
    const formatMultiplier = (val) => (typeof val === 'number' && !isNaN(val) ? 'x' + val.toFixed(2) : 'x1.00');
    coreHTML += `<p><span class="stat-label">Max HP:</span><span class="stat-value">${formatInt(playerData.maxHp)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Player Size:</span><span class="stat-value">${formatNum(playerData.finalRadius)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Times Hit:</span><span class="stat-value">${formatInt(playerData.timesHit)}</span></p>`;
    if (gameplayTimeData !== undefined) { coreHTML += `<p><span class="stat-label">Time Played:</span><span class="stat-value">${formatMillisecondsToTime(gameplayTimeData)}</span></p>`; }
    coreHTML += `<p><span class="stat-label">Damage Dealt:</span><span class="stat-value">${playerData.totalDamageDealt ? playerData.totalDamageDealt.toLocaleString() : 0}</span></p>`;
    if (playerData.rayCritChance !== undefined && (playerData.rayCritChance > 0 || playerData.rayCritDamageMultiplier > 1.5)) {
        coreHTML += `<p><span class="stat-label">Ray Crit Chance:</span><span class="stat-value">${formatPercent(playerData.rayCritChance)}</span></p>`;
        coreHTML += `<p><span class="stat-label">Ray Crit Damage:</span><span class="stat-value">${formatMultiplier(playerData.rayCritDamageMultiplier)}</span></p>`;
    }
    if (playerData.abilityCritChance !== undefined && (playerData.abilityCritChance > 0 || playerData.abilityCritDamageMultiplier > 1.5)) {
        coreHTML += `<p><span class="stat-label">Ability Crit Chance:</span><span class="stat-value">${formatPercent(playerData.abilityCritChance)}</span></p>`;
        coreHTML += `<p><span class="stat-label">Ability Crit Damage:</span><span class="stat-value">${formatMultiplier(playerData.abilityCritDamageMultiplier)}</span></p>`;
    }
    statsCoreDiv.innerHTML = coreHTML;
    statsUpgradesUl.innerHTML = '';
    if (playerData.displayedUpgrades && playerData.displayedUpgrades.length > 0) {
        playerData.displayedUpgrades.forEach(upg => { const li = document.createElement('li'); li.innerHTML = `<span class="stat-label">${upg.name}</span><span class="stat-value">${upg.description || 'Active'}</span>`; statsUpgradesUl.appendChild(li); });
    } else { statsUpgradesUl.innerHTML = '<li><span style="color: #aaa; font-size:11px;">No upgrades acquired.</span></li>'; }
    let existingBlockedHeader = pausePlayerStatsPanel.querySelector('#blockedEvolutionsHeader'); if (existingBlockedHeader) existingBlockedHeader.remove();
    let existingBlockedList = pausePlayerStatsPanel.querySelector('#blockedEvolutionsList'); if (existingBlockedList) existingBlockedList.remove();
    if (playerData.blockedEvolutionIds && playerData.blockedEvolutionIds.length > 0) {
        const blockedHeader = document.createElement('h4'); blockedHeader.classList.add('stats-header'); blockedHeader.id = 'blockedEvolutionsHeader'; blockedHeader.textContent = 'Blocked Evolutions';
        const blockedList = document.createElement('ul'); blockedList.id = 'blockedEvolutionsList'; blockedList.classList.add('stats-section'); blockedList.style.listStyleType = 'none'; blockedList.style.padding = '0'; blockedList.style.margin = '0 0 10px 0';
        playerData.blockedEvolutionIds.forEach(id => { const li = document.createElement('li'); const evoDetail = CONSTANTS.evolutionChoicesMasterList?.find(e => e.id === id); const evoName = evoDetail ? evoDetail.text : id.replace(/([A-Z])/g, ' $1').trim(); li.innerHTML = `<span class="stat-label" style="color: #ff8080;">${evoName}</span><span class="stat-value">(Blocked)</span>`; blockedList.appendChild(li); });
        const abilitiesHeader = statsAbilitiesDiv.previousElementSibling;
        if (abilitiesHeader && abilitiesHeader.classList.contains('stats-header')) { abilitiesHeader.parentNode.insertBefore(blockedHeader, abilitiesHeader); abilitiesHeader.parentNode.insertBefore(blockedList, abilitiesHeader); }
        else if(statsUpgradesUl.parentNode) { statsUpgradesUl.parentNode.appendChild(blockedHeader); statsUpgradesUl.parentNode.appendChild(blockedList); }
    }
    statsImmunitiesContainer.innerHTML = '';
    if (playerData.immuneColorsList && playerData.immuneColorsList.length > 0) { playerData.immuneColorsList.forEach(color => { const s = document.createElement('div'); s.className = 'immunity-swatch-pause'; s.style.backgroundColor = color; s.title = getReadableColorNameFromUtils(color); statsImmunitiesContainer.appendChild(s); });}
    else { statsImmunitiesContainer.innerHTML = '<span style="color: #aaa; font-size:11px;">None</span>'; }
    statsAbilitiesDiv.innerHTML = ''; let hasNumAbs = false;
    if (playerData.formattedActiveAbilities && playerData.formattedActiveAbilities.length > 0) { playerData.formattedActiveAbilities.forEach(ab => { hasNumAbs = true; const p = document.createElement('p'); p.innerHTML = `<span class="stat-label">${ab.name} (Slot ${ab.slot}):</span><span class="stat-value">${ab.desc}</span>`; statsAbilitiesDiv.appendChild(p); });}
    if (!hasNumAbs) { statsAbilitiesDiv.innerHTML = '<p><span style="color: #aaa; font-size:11px;">No numeric key abilities.</span></p>';}
    statsMouseAbilitiesDiv.innerHTML = ''; let hasMouseAbs = false;
    if (playerData.formattedMouseAbilities && playerData.formattedMouseAbilities.length > 0) { playerData.formattedMouseAbilities.forEach(ab => { hasMouseAbs = true; const p = document.createElement('p'); p.innerHTML = `<span class="stat-label">${ab.name}:</span><span class="stat-value">${ab.desc}</span>`; statsMouseAbilitiesDiv.appendChild(p); });}
    if (!hasMouseAbs) { statsMouseAbilitiesDiv.innerHTML = '<p><span style="color: #aaa; font-size:11px;">No mouse abilities.</span></p>';}
    statsBossTiersDiv.innerHTML = '';
    if (bossTierData && bossTypeNamesFromSource && bossTypeKeysFromSource && bossTypeNamesFromSource.length > 0) {
        let encountered = false;
        bossTypeKeysFromSource.forEach((key, index) => {
            const tier = bossTierData[key] || 0;
            const name = bossTypeNamesFromSource[index] ? bossTypeNamesFromSource[index] : key.charAt(0).toUpperCase() + key.slice(1);
            if (tier > 0) {
                const p = document.createElement('p');
                p.innerHTML = `<span class="stat-label">${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}:</span><span class="stat-value">Tier ${tier}</span>`;
                statsBossTiersDiv.appendChild(p); encountered = true;
            }
        });
        if (!encountered) { statsBossTiersDiv.innerHTML = '<p><span style="color: #aaa; font-size:11px;">No bosses encountered.</span></p>';}
    } else { statsBossTiersDiv.innerHTML = '<p><span style="color: #aaa; font-size:11px;">Boss data unavailable.</span></p>';}
}