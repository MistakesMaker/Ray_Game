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
    // statsPanelTitle as importedStatsPanelTitleElement, // No longer needed as a direct reference here
    statsImmunitiesContainer,
    statsBossTiersDiv,
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
    if (!previewCtx || !previewCanvasEl || !localCurrentActiveScreenElement || localCurrentActiveScreenElement.id !== 'detailedHighScoresScreen' || !isPreviewAnimating) {
        return;
    }
    const rect = previewCanvasEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    currentPreviewAimAngle = Math.atan2(mouseY - (previewCanvasEl.height / 2), mouseX - (previewCanvasEl.width / 2));
}

function initPlayerPreviewCanvas() {
    if (playerPreviewCanvas && !previewCtx) {
        previewCanvasEl = playerPreviewCanvas;
        previewCtx = previewCanvasEl.getContext('2d');
        if (!globalPreviewMouseListenerAttached) {
            window.addEventListener('mousemove', handleGlobalPreviewMouseMove);
            globalPreviewMouseListenerAttached = true;
        }
    }
}

function playerPreviewAnimationLoop() {
    if (!isPreviewAnimating) return;
    if (!previewCtx || !previewCanvasEl) { isPreviewAnimating = false; return; }
    previewCtx.clearRect(0, 0, previewCanvasEl.width, previewCanvasEl.height);
    if (lastPreviewPlayerDataSnapshot) { 
        if (playerPreviewPlaceholder) playerPreviewPlaceholder.style.display = 'none';
        Player.drawFromSnapshot(previewCtx, lastPreviewPlayerDataSnapshot, previewCanvasEl.width / 2, previewCanvasEl.height / 2, currentPreviewAimAngle);
    } else {
        if (playerPreviewPlaceholder) playerPreviewPlaceholder.style.display = 'block';
    }
    requestAnimationFrame(playerPreviewAnimationLoop);
}

function startOrUpdatePreviewAnimation(snapshotForPreview) { 
    lastPreviewPlayerDataSnapshot = snapshotForPreview; 
    if (snapshotForPreview && !isPreviewAnimating) {
        isPreviewAnimating = true;
        requestAnimationFrame(playerPreviewAnimationLoop);
    } else if (!snapshotForPreview && isPreviewAnimating) {
        isPreviewAnimating = false;
        if (previewCtx && previewCanvasEl) previewCtx.clearRect(0, 0, previewCanvasEl.width, previewCanvasEl.height);
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
        if (isPreviewAnimating && localCurrentActiveScreenElement !== importedDetailedHighScoresScreen) { 
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


export function displayGameOverScreenContent(currentScoreVal, showNameInput, achievedPlacements, onSubmitScoreCallback, onRestartCallback, onMainMenuCallback) {
    if (!importedGameOverScreen) return;
    importedGameOverScreen.innerHTML = '';
    const title = document.createElement('h2'); title.textContent = "Game Over!"; importedGameOverScreen.appendChild(title);
    const scoreP = document.createElement('p'); scoreP.textContent = `Your final score: ${currentScoreVal}`; importedGameOverScreen.appendChild(scoreP);
    
    if (achievedPlacements && achievedPlacements.length > 0) {
        const placementsTitle = document.createElement('p');
        placementsTitle.style.color = '#0f0';
        placementsTitle.style.fontWeight = 'bold';
        placementsTitle.textContent = "New High Score Placements!";
        importedGameOverScreen.appendChild(placementsTitle);

        const placementsList = document.createElement('ul');
        placementsList.style.listStyleType = 'none';
        placementsList.style.paddingLeft = '0';
        placementsList.style.marginTop = '5px';
        achievedPlacements.forEach(placementText => {
            const li = document.createElement('li');
            li.textContent = placementText;
            li.style.color = '#ccffcc';
            li.style.fontSize = '14px';
            placementsList.appendChild(li);
        });
        importedGameOverScreen.appendChild(placementsList);
    } else if (showNameInput) { 
        const infoP = document.createElement('p');
        infoP.textContent = "Enter your name to record your run.";
        infoP.style.fontSize = '14px';
        infoP.style.color = '#ccc';
        importedGameOverScreen.appendChild(infoP);
    }


    if (showNameInput) { 
        const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = 'playerNameInputGameOver'; nameInput.placeholder = "Enter name (max 10)"; nameInput.maxLength = 10; importedGameOverScreen.appendChild(nameInput);
        const submitButton = document.createElement('button'); submitButton.id = 'submitScoreButtonGameOver'; submitButton.textContent = "Submit Score";
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
                
                const previewData = scoreEntry.stats?.playerDataForPreview || scoreEntry.stats?.playerData || null;

                if (scoreEntry.stats) { 
                    li.onclick = () => {
                        const currentSelected = detailedScoresList.querySelector('.selected-score');
                        if (currentSelected) currentSelected.classList.remove('selected-score');
                        li.classList.add('selected-score');
                        
                        // Construct the title for the stats panel when a high score is clicked
                        let statsPanelDisplayTitle = `Stats for ${scoreEntry.name}`;
                        if(categoryKey && categoryKey.toLowerCase().includes("time")){
                            const tierMatch = categoryKey.match(/\d+/);
                            if(tierMatch) statsPanelDisplayTitle += ` (Nexus T${tierMatch[0]} Kill)`;
                            else statsPanelDisplayTitle += ` (Time Trial)`;
                        } else if (categoryKey === "survival") {
                            statsPanelDisplayTitle += " (Survival)";
                        }
                        updatePauseScreenStatsDisplay(scoreEntry.stats, statsPanelDisplayTitle); // Pass the title here

                        currentPreviewAimAngle = 0; 
                        startOrUpdatePreviewAnimation(previewData); 
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

export function updatePauseScreenStatsDisplay(statsSnapshot, panelTitleText = "Current Status") { // Default title if not provided
    const statsRunDiv = document.getElementById('statsRun');
    const statsPlayerCoreDiv = document.getElementById('statsPlayerCore');
    const statsGearUl = document.getElementById('statsGearList');
    const statsAbilitiesCombinedDiv = document.getElementById('statsAbilities'); 

    // The main title of the PAUSE SCREEN or GAME OVER SCREEN is handled by their own H2 tags.
    // This function now only populates the content *within* #pausePlayerStatsPanel.
    // The `panelTitleText` can be used if we decide to add an H4 back *inside* #pausePlayerStatsPanel for context,
    // but for now, the section headers like "📊 Run Information" serve this purpose.

    if (!statsRunDiv || !statsPlayerCoreDiv || !statsGearUl || !statsImmunitiesContainer || !statsAbilitiesCombinedDiv || !statsBossTiersDiv) {
        if (pausePlayerStatsPanel) pausePlayerStatsPanel.innerHTML = "<p>Error loading stats sections (new structure).</p>";
        return;
    }

    const isOldFormat = statsSnapshot && statsSnapshot.playerData && !statsSnapshot.runStats;
    
    let runStats, playerCoreStats, immunities, gear, abilities, blockedEvolutions, bossTierData;

    if (isOldFormat) {
        // console.warn("Displaying stats from OLD snapshot format. Some details might be missing or approximated.");
        const oldPlayerData = statsSnapshot.playerData;
        runStats = {
            timesHit: oldPlayerData.timesHit || 0,
            totalDamageDealt: oldPlayerData.totalDamageDealt || 0,
            gameplayTime: statsSnapshot.gameplayTimeData 
        };
        playerCoreStats = { 
            hp: oldPlayerData.hp, maxHp: oldPlayerData.maxHp, finalRadius: oldPlayerData.finalRadius,
            damageTakenMultiplier: oldPlayerData.damageTakenMultiplier !== undefined ? oldPlayerData.damageTakenMultiplier : 1.0,
            rayDamageBonus: oldPlayerData.rayDamageBonus || 0,
            chainReactionChance: oldPlayerData.chainReactionChance || 0,
            rayCritChance: oldPlayerData.rayCritChance || 0,
            rayCritDamageMultiplier: oldPlayerData.rayCritDamageMultiplier || 1.5,
            abilityDamageMultiplier: oldPlayerData.abilityDamageMultiplier || 1.0,
            abilityCritChance: oldPlayerData.abilityCritChance || 0,
            abilityCritDamageMultiplier: oldPlayerData.abilityCritDamageMultiplier || 1.5,
            temporalEchoChance: oldPlayerData.temporalEchoChance || 0,
            globalCooldownReduction: oldPlayerData.globalCooldownReduction || 0,
            kineticConversionLevel: oldPlayerData.kineticConversionLevelSnapshot || oldPlayerData.kineticConversionLevel || 0, 
            initialKineticDamageBonus: oldPlayerData.initialKineticDamageBonus || CONSTANTS.KINETIC_INITIAL_DAMAGE_BONUS,
            effectiveKineticAdditionalDamageBonusPerLevel: oldPlayerData.effectiveKineticAdditionalDamageBonusPerLevel || CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL,
            baseKineticChargeRate: oldPlayerData.baseKineticChargeRate || CONSTANTS.KINETIC_BASE_CHARGE_RATE,
            effectiveKineticChargeRatePerLevel: oldPlayerData.effectiveKineticChargeRatePerLevel || CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL,
            evolutions: {} 
        };
        if (oldPlayerData.displayedUpgrades) {
            oldPlayerData.displayedUpgrades.forEach(upg => {
                if (upg.name && upg.description) {
                    // Only add very specific text-based evolutions that aren't direct stats
                    if (upg.name.includes("System Overcharge")) playerCoreStats.evolutions["System Overcharge"] = upg.description;
                    else if (upg.name.includes("Vitality Surge")) playerCoreStats.evolutions["Vitality Surge"] = upg.description;
                    // Chameleon Plating is handled by the immunities section
                    else if (upg.name.includes("Evasive Maneuver")) playerCoreStats.evolutions["Evasive Maneuver"] = upg.description;
                }
            });
        }

        immunities = oldPlayerData.immuneColorsList || [];
        gear = (oldPlayerData.displayedUpgrades || []).filter(u => u.description && (u.description.toLowerCase().includes("path") || u.name.toLowerCase().includes("injectors") || u.name.toLowerCase().includes("sub-layer") || u.name.toLowerCase().includes("adaptive shield")));
        abilities = [
            ...(oldPlayerData.formattedActiveAbilities || []), 
            ...(oldPlayerData.formattedMouseAbilities || [])
        ];
        blockedEvolutions = oldPlayerData.blockedEvolutionIds || [];
        bossTierData = statsSnapshot.bossTierData;

    } else if (statsSnapshot && statsSnapshot.runStats && statsSnapshot.playerCoreStats) { 
        ({ runStats, playerCoreStats, immunities, gear, abilities, blockedEvolutions, bossTierData } = statsSnapshot);
    } else {
        const noDataMsg = "<p><span style='color: #aaa; font-size:11px;'>Snapshot data incomplete.</span></p>";
        statsRunDiv.innerHTML = noDataMsg; statsPlayerCoreDiv.innerHTML = noDataMsg; 
        statsGearUl.innerHTML = `<li>${noDataMsg.replace(/<p>|<\/p>/g, '')}</li>`;
        statsImmunitiesContainer.innerHTML = `<span>${noDataMsg.replace(/<p>|<\/p>/g, '')}</span>`;
        statsAbilitiesCombinedDiv.innerHTML = noDataMsg;
        statsBossTiersDiv.innerHTML = noDataMsg;
        return;
    }
    
    const bossTypeNamesFromSource = CONSTANTS.standardBossTypeNames ? [...CONSTANTS.standardBossTypeNames, CONSTANTS.nexusWeaverBossName] : ["CHASER", "REFLECTOR", "SINGULARITY", "NEXUS WEAVER"];
    const bossTypeKeysFromSource = CONSTANTS.standardBossTypeKeys ? [...CONSTANTS.standardBossTypeKeys, CONSTANTS.nexusWeaverBossKey] : ["chaser", "reflector", "singularity", "nexusWeaver"];
    
    const formatNum = (val, digits = 1) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(digits) : 'N/A');
    const formatInt = (val) => (typeof val === 'number' && !isNaN(val) ? val.toString() : 'N/A');
    const formatPercent = (val) => (typeof val === 'number' && !isNaN(val) ? (val * 100).toFixed(0) + '%' : '0%');
    const formatMultiplier = (val) => (typeof val === 'number' && !isNaN(val) ? 'x' + val.toFixed(2) : 'x1.00');

    // --- 📊 Run Information --- 
    let runHTML = '';
    runHTML += `<p><span class="stat-label">Time Played:</span><span class="stat-value">${formatMillisecondsToTime(runStats.gameplayTime)}</span></p>`;
    runHTML += `<p><span class="stat-label">Times Hit:</span><span class="stat-value">${formatInt(runStats.timesHit)}</span></p>`;
    runHTML += `<p><span class="stat-label">Damage Dealt:</span><span class="stat-value">${runStats.totalDamageDealt ? runStats.totalDamageDealt.toLocaleString() : 0}</span></p>`;
    statsRunDiv.innerHTML = runHTML;

    // --- 👤 Player Stats ---
    let coreHTML = '';
    coreHTML += `<p><span class="stat-label">Max HP:</span><span class="stat-value">${formatInt(playerCoreStats.maxHp)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Player Size:</span><span class="stat-value">${formatNum(playerCoreStats.finalRadius)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Damage Reduction:</span><span class="stat-value">${formatPercent(1 - (playerCoreStats.damageTakenMultiplier !== undefined ? playerCoreStats.damageTakenMultiplier : 1.0))}</span></p>`;
    coreHTML += `<p><span class="stat-label">Ray Damage Bonus:</span><span class="stat-value">+${formatNum(playerCoreStats.rayDamageBonus || 0)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Ray Crit Chance:</span><span class="stat-value">${formatPercent(playerCoreStats.rayCritChance || 0)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Ray Crit Damage:</span><span class="stat-value">${formatMultiplier(playerCoreStats.rayCritDamageMultiplier || 1.5)}</span></p>`;
    coreHTML += `<p><span class="stat-label">AOE Explosion Chance:</span><span class="stat-value">${formatPercent(playerCoreStats.chainReactionChance || 0)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Ability Damage Mult:</span><span class="stat-value">${formatMultiplier(playerCoreStats.abilityDamageMultiplier || 1.0)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Ability Crit Chance:</span><span class="stat-value">${formatPercent(playerCoreStats.abilityCritChance || 0)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Ability Crit Damage:</span><span class="stat-value">${formatMultiplier(playerCoreStats.abilityCritDamageMultiplier || 1.5)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Global CD Reduction:</span><span class="stat-value">${formatPercent(playerCoreStats.globalCooldownReduction || 0)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Temporal Echo Chance:</span><span class="stat-value">${formatPercent(playerCoreStats.temporalEchoChance || 0)}</span></p>`;
    
    // Display textual evolution statuses from playerCoreStats.evolutions
    if(playerCoreStats.evolutions){ 
        if(playerCoreStats.evolutions["System Overcharge"]){
            coreHTML += `<p><span class="stat-label">System Overcharge:</span><span class="stat-value">${playerCoreStats.evolutions["System Overcharge"]}</span></p>`;
        }
        if(playerCoreStats.evolutions["Vitality Surge"]){
            coreHTML += `<p><span class="stat-label">Vitality Surge:</span><span class="stat-value">${playerCoreStats.evolutions["Vitality Surge"]}</span></p>`;
        }
        // Chameleon Plating is now only in Immunities section
        if(playerCoreStats.evolutions["Evasive Maneuver"]){
            coreHTML += `<p><span class="stat-label">Evasive Maneuver:</span><span class="stat-value">${playerCoreStats.evolutions["Evasive Maneuver"]}</span></p>`;
        }
    }

    const kineticLevelToDisplay = playerCoreStats.kineticConversionLevel || 0;
    if(kineticLevelToDisplay > 0){
        const KCL = kineticLevelToDisplay;
        const initBonus = playerCoreStats.initialKineticDamageBonus || CONSTANTS.KINETIC_INITIAL_DAMAGE_BONUS;
        const effectiveBonusPerLvl = playerCoreStats.effectiveKineticAdditionalDamageBonusPerLevel || CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL;
        const baseChargeRate = playerCoreStats.baseKineticChargeRate || CONSTANTS.KINETIC_BASE_CHARGE_RATE;
        const effectiveChargePerLvl = playerCoreStats.effectiveKineticChargeRatePerLevel || CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL;

        const maxPotencyBonus = initBonus + (Math.max(0, KCL - 1) * effectiveBonusPerLvl);
        const chargeRate = baseChargeRate + (KCL * effectiveChargePerLvl);
        coreHTML += `<p><span class="stat-label">Kinetic Conversion:</span><span class="stat-value">Lvl ${KCL}, Dmg +${(maxPotencyBonus * 100).toFixed(0)}%, Rate ${chargeRate.toFixed(2)}/s</span></p>`;
    } else {
        coreHTML += `<p><span class="stat-label">Kinetic Conversion:</span><span class="stat-value">Not Acquired</span></p>`;
    }
    statsPlayerCoreDiv.innerHTML = coreHTML;
    
    // --- 🛡️ Immunities --- (Moved up)
    statsImmunitiesContainer.innerHTML = '';
    if (immunities && immunities.length > 0) { immunities.forEach(color => { const s = document.createElement('div'); s.className = 'immunity-swatch-pause'; s.style.backgroundColor = color; s.title = getReadableColorNameFromUtils(color); statsImmunitiesContainer.appendChild(s); });}
    else { statsImmunitiesContainer.innerHTML = '<span style="color: #aaa; font-size:11px;">None</span>'; }

    // --- 🛠️ Gear ---
    statsGearUl.innerHTML = '';
    if (gear && gear.length > 0) {
        gear.forEach(g => { const li = document.createElement('li'); li.innerHTML = `<span class="stat-label">${g.name}</span><span class="stat-value">${g.description || 'Active'}</span>`; statsGearUl.appendChild(li); });
    } else { statsGearUl.innerHTML = '<li><span style="color: #aaa; font-size:11px;">No gear acquired.</span></li>'; }
    
    // --- 💡 Abilities (Combined) ---
    statsAbilitiesCombinedDiv.innerHTML = '';
    if (abilities && abilities.length > 0) {
        abilities.forEach(ab => {
            const p = document.createElement('p');
            let damageText = "";
            if (ab.damage && ab.damage !== "N/A") {
                damageText = ` <span style="color:#ffccaa;">(${ab.damage})</span>`;
            }
            const descText = ab.desc || ab.description || 'Details N/A';
            p.innerHTML = `<span class="stat-label">${ab.name}:</span><span class="stat-value">${descText}${damageText}</span>`;
            statsAbilitiesCombinedDiv.appendChild(p);
        });
    } else { statsAbilitiesCombinedDiv.innerHTML = '<p><span style="color: #aaa; font-size:11px;">No abilities acquired.</span></p>';}

    // --- Blocked Evolutions (if any) ---
    const abilitiesHeaderElement = document.getElementById('abilitiesHeader');
    let existingBlockedHeader = pausePlayerStatsPanel.querySelector('#blockedEvolutionsHeader'); 
    if (existingBlockedHeader) existingBlockedHeader.remove();
    let existingBlockedList = pausePlayerStatsPanel.querySelector('#blockedEvolutionsList'); 
    if (existingBlockedList) existingBlockedList.remove();

    if (blockedEvolutions && blockedEvolutions.length > 0) {
        const blockedHeader = document.createElement('h4'); 
        blockedHeader.classList.add('stats-header'); 
        blockedHeader.id = 'blockedEvolutionsHeader'; 
        blockedHeader.textContent = '🚫 Blocked Evolutions';
        
        const blockedListUl = document.createElement('ul'); 
        blockedListUl.id = 'blockedEvolutionsList'; 
        blockedListUl.classList.add('stats-section'); 
        blockedListUl.style.listStyleType = 'none'; 
        blockedListUl.style.padding = '0'; 
        blockedListUl.style.margin = '0 0 10px 0';
        
        blockedEvolutions.forEach(nameOrObj => { 
            const li = document.createElement('li'); 
            const displayName = (typeof nameOrObj === 'object' && nameOrObj.text) ? nameOrObj.text : nameOrObj;
            li.innerHTML = `<span class="stat-label" style="color: #ff8080;">${displayName}</span><span class="stat-value">(Blocked)</span>`; 
            blockedListUl.appendChild(li); 
        });
        
        if (abilitiesHeaderElement && abilitiesHeaderElement.parentNode) {
            abilitiesHeaderElement.parentNode.insertBefore(blockedHeader, abilitiesHeaderElement);
            abilitiesHeaderElement.parentNode.insertBefore(blockedListUl, abilitiesHeaderElement);
        } else if (statsImmunitiesContainer.parentNode) { 
            statsImmunitiesContainer.parentNode.appendChild(blockedHeader);
            statsImmunitiesContainer.parentNode.appendChild(blockedListUl);
        }
    }

    // --- 💀 Boss Encounters ---
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