// js/ui.js
// console.log("[Debug UI_JS_LOAD] ui.js is being parsed/executed."); 

import * as CONSTANTS from './constants.js';

// --- DOM Element Exports ---
export const canvas = document.getElementById('gameCanvas');
export const scoreDisplayElem = document.getElementById('scoreDisplay');
export const healthDisplayElem = document.getElementById('healthDisplay');
export const buffIndicatorContainer = document.getElementById('buffIndicatorContainer');
export const survivalBonusIndicator = document.getElementById('survivalBonusIndicator');
export const activeBuffIndicator = document.getElementById('activeBuffIndicator');
export const uiHighScoreContainer = document.getElementById('highScoreContainer');
export const highScoreListDisplay = document.getElementById('highScoreList');
export const startScreenHighScoresDiv = document.getElementById('startScreenHighScores');

export const startScreen = document.getElementById('startScreen');
export const settingsScreen = document.getElementById('settingsScreen');
export const gameOverScreen = document.getElementById('gameOverScreen');
export const evolutionScreen = document.getElementById('evolutionScreen');
export const evolutionOptionsContainer = document.getElementById('evolutionOptionsContainer');
export const freeUpgradeScreen = document.getElementById('freeUpgradeScreen');
export const freeUpgradeOptionContainer = document.getElementById('freeUpgradeOptionContainer');
export const closeFreeUpgradeButton = document.getElementById('closeFreeUpgradeButton');
export const lootChoiceScreen = document.getElementById('lootChoiceScreen');
export const lootOptionsContainer = document.getElementById('lootOptionsContainer');
export const abilityCooldownUI = document.getElementById('abilityCooldownUI');
export const evolutionTooltip = document.getElementById('evolutionTooltip');
export const countdownOverlay = document.getElementById('countdownOverlay');

export const pauseScreen = document.getElementById('pauseScreen');
export const pausePlayerStatsPanel = document.getElementById('pausePlayerStatsPanel');

export const detailedHighScoresScreen = document.getElementById('detailedHighScoresScreen');
const detailedScoresList = document.getElementById('detailedScoresList');
const detailedStatsDisplayContainer = document.getElementById('detailedStatsDisplayContainer');
const statsPanelTitle = document.getElementById('statsPanelTitle');

const statsCoreDiv = document.getElementById('statsCore');
const statsUpgradesUl = document.getElementById('statsUpgradesList');
const statsImmunitiesContainer = document.getElementById('statsImmunitiesContainer');
const statsAbilitiesDiv = document.getElementById('statsAbilities');
const statsMouseAbilitiesDiv = document.getElementById('statsMouseAbilities');
const statsBossTiersDiv = document.getElementById('statsBossTiers');

export const kineticChargeUIElement = document.getElementById('kineticChargeUI');
export const kineticChargeBarFillElement = document.getElementById('kineticChargeBarFill');
export const kineticChargeTextElement = document.getElementById('kineticChargeText');


// --- UI State ---
let previousScreenForSettings = null;

// --- UI Update Functions ---
export function updateScoreDisplay(currentScore) { if (scoreDisplayElem) scoreDisplayElem.textContent = `Score: ${currentScore}`; }
export function updateHealthDisplay(currentHp, maxHp) { if (healthDisplayElem) healthDisplayElem.textContent = `Health: ${currentHp}/${maxHp}`; }

export function updateBuffIndicator(immuneColorsList = [], getReadableColorNameFunc) {
    if (!buffIndicatorContainer || !getReadableColorNameFunc) return;
    buffIndicatorContainer.innerHTML = '';
    if (immuneColorsList.length > 0) {
        const textSpan = document.createElement('span'); textSpan.textContent = "Immune:";
        buffIndicatorContainer.appendChild(textSpan);
        immuneColorsList.forEach(color => { const swatch = document.createElement('div'); swatch.classList.add('buffSwatch'); swatch.style.backgroundColor = color; swatch.title = getReadableColorNameFunc(color); buffIndicatorContainer.appendChild(swatch); });
    }
}
export function updateSurvivalBonusIndicator(currentSurvivalUpgrades, maxSurvivalUpgradesConst) {
    if (!survivalBonusIndicator) return;
    if (currentSurvivalUpgrades > 0) { survivalBonusIndicator.textContent = `Survival Bonus: +${currentSurvivalUpgrades}${(currentSurvivalUpgrades >= maxSurvivalUpgradesConst ? " (Max)" : "")}`; }
    else { survivalBonusIndicator.textContent = ''; }
}
export function updateActiveBuffIndicator(playerInstance, currentPostPopupImmunityTimer, currentPostDamageImmunityTimer) {
    if (!activeBuffIndicator || !playerInstance) return;
    let textParts = []; let maxImmunityTime = 0;
    if (currentPostPopupImmunityTimer > 0) maxImmunityTime = Math.max(maxImmunityTime, currentPostPopupImmunityTimer);
    if (currentPostDamageImmunityTimer > 0) maxImmunityTime = Math.max(maxImmunityTime, currentPostDamageImmunityTimer);
    if (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0) { textParts.push(`Teleporting (${(playerInstance.teleportEffectTimer / 1000).toFixed(1)}s)`); }
    if (playerInstance.isShieldOvercharging) { textParts.push(`Overcharge (${(playerInstance.shieldOverchargeTimer / 1000).toFixed(1)}s)`); }
    if (maxImmunityTime > 0 && !(playerInstance.teleporting && playerInstance.teleportEffectTimer > 0) && !playerInstance.isShieldOvercharging) { textParts.push(`Shield (${Math.ceil(maxImmunityTime / 1000)}s)`);}
    
    if (playerInstance.isHarmonized && playerInstance.hasPerfectHarmonyHelm) {
        textParts.push("Harmony!");
    }
    activeBuffIndicator.textContent = textParts.join(' ').trim();
}
export function displayHighScores(containerElement, scoresArray) {
    if (!containerElement) return; containerElement.innerHTML = '';
    if (!scoresArray || scoresArray.length === 0) { containerElement.innerHTML = "<li>No scores yet!</li>"; return; }
    scoresArray.forEach(scoreItem => { const li = document.createElement('li'); li.textContent = `${scoreItem.name}: ${scoreItem.score}`; containerElement.appendChild(li); });
}


export function updateAbilityCooldownUI(playerInstance) {
    if (!abilityCooldownUI || !playerInstance) {
        return;
    }
    abilityCooldownUI.innerHTML = '';

    const abilityDisplayOrder = [
        { type: 'mouse', id: 'omegaLaser', keybindText: 'LMB', iconText: '🔥', check: () => playerInstance.hasOmegaLaser, isCharging: () => playerInstance.isFiringOmegaLaser, timer: () => playerInstance.omegaLaserTimer, maxTime: () => playerInstance.omegaLaserDuration, cooldownTimer: () => playerInstance.omegaLaserCooldownTimer, cooldownMax: () => playerInstance.omegaLaserCooldown },
        { type: 'mouse', id: 'shieldOvercharge', keybindText: 'RMB', iconText: '🛡️', check: () => playerInstance.hasShieldOvercharge, isCharging: () => playerInstance.isShieldOvercharging, timer: () => playerInstance.shieldOverchargeTimer, maxTime: () => playerInstance.shieldOverchargeDuration, cooldownTimer: () => playerInstance.shieldOverchargeCooldownTimer, cooldownMax: () => playerInstance.shieldOverchargeCooldown },
        { type: 'slot', slot: '1', id: 'empBurst',        defaultIcon: '💥', fixedName: 'EMP Burst' },
        { type: 'slot', slot: '2', id: 'miniGravityWell', defaultIcon: '🔮', fixedName: 'Mini Gravity Well' },
        { type: 'slot', slot: '3', id: 'teleport',        defaultIcon: '🌀', fixedName: 'Teleport' }
    ];

    abilityDisplayOrder.forEach(desc => {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('ability-slot');
        slotDiv.id = `ability-slot-${desc.id || desc.slot}`;

        let isUnlocked = false;
        let isReady = false;
        let isChargingOrActive = false;
        let maxTimer = 0; 
        let displayCooldownTimerValue = 0; 

        if (desc.type === 'mouse') {
            isUnlocked = desc.check();
            if (isUnlocked) {
                isChargingOrActive = desc.isCharging();
                if (isChargingOrActive) {
                    displayCooldownTimerValue = desc.timer(); 
                    maxTimer = desc.maxTime();
                } else if (desc.cooldownTimer() > 0) {
                    displayCooldownTimerValue = desc.cooldownTimer(); 
                    maxTimer = desc.cooldownMax();
                } else {
                    isReady = true;
                }
            }
        } else if (desc.type === 'slot') {
            const ability = playerInstance.activeAbilities[desc.slot];
            if (ability) {
                isUnlocked = true;
                maxTimer = ability.cooldownDuration; 
                if (playerInstance.hasUltimateConfigurationHelm) { 
                    maxTimer *= 1.5;
                }

                if (ability.id === 'miniGravityWell' && playerInstance.activeMiniWell && playerInstance.activeMiniWell.isActive) {
                    isChargingOrActive = true;
                    displayCooldownTimerValue = playerInstance.activeMiniWell.lifeTimer;
                    maxTimer = playerInstance.activeMiniWell.maxLife; 
                } else if (ability.cooldownTimer > 0) {
                    displayCooldownTimerValue = ability.cooldownTimer;
                } else {
                    isReady = true;
                }
            } else {
                isUnlocked = false;
            }
        }

        const keybindSpan = document.createElement('span');
        keybindSpan.classList.add('keybind');
        keybindSpan.textContent = desc.keybindText || desc.slot;

        const iconDivElem = document.createElement('div');
        iconDivElem.classList.add('icon');
        iconDivElem.textContent = desc.defaultIcon || '?';
         if (isUnlocked && desc.type === 'mouse') iconDivElem.textContent = desc.iconText;
         else if (isUnlocked && desc.type === 'slot' && playerInstance.activeAbilities[desc.slot]) {
            const abilityId = playerInstance.activeAbilities[desc.slot].id;
             switch(abilityId) {
                case 'empBurst': iconDivElem.textContent = '💥'; break;
                case 'miniGravityWell': iconDivElem.textContent = '🔮'; break;
                case 'teleport': iconDivElem.textContent = '🌀'; break;
            }
         }


        const cooldownOverlayDiv = document.createElement('div');
        cooldownOverlayDiv.classList.add('cooldown-overlay');

        const cooldownTimerSpan = document.createElement('span');
        cooldownTimerSpan.classList.add('cooldown-timer');

        slotDiv.appendChild(keybindSpan);
        slotDiv.appendChild(iconDivElem);
        slotDiv.appendChild(cooldownOverlayDiv);
        slotDiv.appendChild(cooldownTimerSpan);

        if (!isUnlocked) {
            slotDiv.classList.add('locked');
            iconDivElem.style.opacity = '0.3';
            const lockIconDiv = document.createElement('div');
            lockIconDiv.classList.add('icon', 'lock-icon-overlay'); lockIconDiv.textContent = '🔒';
            slotDiv.appendChild(lockIconDiv);
            cooldownOverlayDiv.style.height = '100%';
            cooldownOverlayDiv.style.backgroundColor = 'rgba(50,50,50,0.8)';
        } else if (isChargingOrActive) {
            slotDiv.classList.add('charging');
            if (maxTimer > 0 && displayCooldownTimerValue >= 0) { 
                cooldownOverlayDiv.style.height = `${Math.max(0, (1 - (displayCooldownTimerValue / maxTimer)) * 100)}%`;
                cooldownTimerSpan.textContent = (displayCooldownTimerValue / 1000).toFixed(1) + 's';
            } else if (maxTimer > 0 && displayCooldownTimerValue < 0) { 
                 cooldownOverlayDiv.style.height = '100%'; 
                 cooldownTimerSpan.textContent = '0.0s';
            }
        } else if (!isReady && displayCooldownTimerValue > 0) {
            slotDiv.classList.add('on-cooldown');
            if (maxTimer > 0) {
                const cooldownPercent = (displayCooldownTimerValue / maxTimer) * 100;
                cooldownOverlayDiv.style.height = `${Math.min(100, Math.max(0, cooldownPercent))}%`;
                cooldownTimerSpan.textContent = (displayCooldownTimerValue / 1000).toFixed(1) + 's';
            }
        } else if (isReady) {
            slotDiv.classList.add('ready');
            cooldownOverlayDiv.style.height = '0%';
        }
        abilityCooldownUI.appendChild(slotDiv);
    });
}

// console.log("[Debug UI_JS_FUNC_DEF] Defining updateKineticChargeUI function now.");
export function updateKineticChargeUI(currentCharge, maxCharge, currentMaxPotencyBonus, playerHasKineticConversionEvolution) {
    // console.log(`[Debug KINETIC_UI_ENTERED] updateKineticChargeUI ENTERED. Visible: ${playerHasKineticConversionEvolution}, Charge: ${currentCharge}/${maxCharge}`);
    if (!kineticChargeUIElement || !kineticChargeBarFillElement || !kineticChargeTextElement) {
        return;
    }
    if (playerHasKineticConversionEvolution) {
        kineticChargeUIElement.style.display = 'flex';
    } else {
        kineticChargeUIElement.style.display = 'none';
        return; 
    }
    const chargePercentage = Math.max(0, Math.min(100, (currentCharge / maxCharge) * 100));
    kineticChargeBarFillElement.style.width = `${chargePercentage}%`;
    let barColor = 'rgba(0, 60, 120, 0.8)';
    if (chargePercentage > 89.9) {
        // console.log("[Debug SPARKLE] Charge percentage > 89.9. Current:", chargePercentage); 
        barColor = 'rgba(255, 100, 0, 1.0)';
        if (!kineticChargeBarFillElement.classList.contains('sparkling')) {
            // console.log("[Debug SPARKLE] Adding 'sparkling' class."); 
            kineticChargeBarFillElement.classList.add('sparkling');
            kineticChargeBarFillElement.style.setProperty('--sparkle1-x', `${Math.random()*80 + 10}%`);
            kineticChargeBarFillElement.style.setProperty('--sparkle1-y', `${Math.random()*60 + 20}%`);
            kineticChargeBarFillElement.style.setProperty('--sparkle2-x', `${Math.random()*80 + 10}%`);
            kineticChargeBarFillElement.style.setProperty('--sparkle2-y', `${Math.random()*60 + 20}%`);
        }
    } else { 
        if (kineticChargeBarFillElement.classList.contains('sparkling')) {
            kineticChargeBarFillElement.classList.remove('sparkling');
        }
        if (chargePercentage > 70) {
            barColor = 'rgba(255, 180, 0, 0.9)';
        } else if (chargePercentage > 30) {
            barColor = 'rgba(0, 150, 200, 0.9)';
        }
    }
    kineticChargeBarFillElement.style.backgroundColor = barColor;
    if (kineticChargeTextElement) {
        if (currentCharge > 1) {
            const potencyBonusForCurrentCharge = currentMaxPotencyBonus * (currentCharge / maxCharge);
            kineticChargeTextElement.textContent = `+${(potencyBonusForCurrentCharge * 100).toFixed(0)}% Dmg`;
        } else {
            kineticChargeTextElement.textContent = '';
        }
    }
}

// --- Screen Management ---
const ALL_SCREENS_FOR_SHOW_SCREEN = [ startScreen, settingsScreen, gameOverScreen, evolutionScreen, freeUpgradeScreen, pauseScreen, countdownOverlay, lootChoiceScreen, detailedHighScoresScreen ];
export function showScreen(screenElementToShow, cameFromPauseMenu = false, callbacks = {}) {
    ALL_SCREENS_FOR_SHOW_SCREEN.forEach(screen => {
        if (screen) screen.style.display = 'none';
    });
    if (pausePlayerStatsPanel) {
        if (detailedStatsDisplayContainer && pausePlayerStatsPanel.parentElement === detailedStatsDisplayContainer && screenElementToShow !== detailedHighScoresScreen) {
            document.body.appendChild(pausePlayerStatsPanel);
        }
        if (screenElementToShow !== pauseScreen &&
            screenElementToShow !== gameOverScreen &&
            screenElementToShow !== detailedHighScoresScreen) {
            pausePlayerStatsPanel.style.display = 'none';
        }
    }
    let gameIsNowPaused = false;
    let canvasShouldBeVisible = false;
    if (screenElementToShow === null) {
        if (canvas) canvas.style.display = 'block';
        canvasShouldBeVisible = true;
    } else {
        const showCanvasBehind = screenElementToShow === pauseScreen ||
                                 screenElementToShow === evolutionScreen ||
                                 screenElementToShow === freeUpgradeScreen ||
                                 screenElementToShow === lootChoiceScreen ||
                                 screenElementToShow === countdownOverlay ||
                                 (screenElementToShow === settingsScreen && previousScreenForSettings === pauseScreen);
        if (canvas) canvas.style.display = showCanvasBehind ? 'block' : 'none';
        canvasShouldBeVisible = showCanvasBehind;
        if (screenElementToShow) screenElementToShow.style.display = 'flex';
        if ([evolutionScreen, freeUpgradeScreen, lootChoiceScreen, startScreen, gameOverScreen, settingsScreen, pauseScreen, countdownOverlay, detailedHighScoresScreen].includes(screenElementToShow)) {
            gameIsNowPaused = true;
        }
    }

    // Call height equalization logic if the evolution screen is being shown
    if (screenElementToShow === evolutionScreen) {
        equalizeEvolutionCardHeights();
    }
    if (screenElementToShow === freeUpgradeScreen) {
        equalizeFreeUpgradeCardHeights();
    }
    if (screenElementToShow === lootChoiceScreen) {
        equalizeLootCardHeights();
    }


    if (gameIsNowPaused && callbacks.onPauseGame) {
        callbacks.onPauseGame(screenElementToShow);
    } else if (!gameIsNowPaused && callbacks.onResumeGame) {
        callbacks.onResumeGame(screenElementToShow);
    }
    if (callbacks.onApplyMusicPlayState) {
        callbacks.onApplyMusicPlayState(screenElementToShow);
    }
    return gameIsNowPaused;
}
export function getPreviousScreenForSettings() { return previousScreenForSettings; }
export function setPreviousScreenForSettings(screenRef) { previousScreenForSettings = screenRef; }

// --- UI Population Functions ---
function getTierStyling(tier) {
    switch(tier) {
        case 'core': return { color: '#00E0FF', text: 'CORE' }; 
        case 'common': return { color: '#9DB8B7', text: 'COMMON' }; 
        case 'rare': return { color: '#55FF55', text: 'RARE' }; // Changed to Green
        case 'epic': return { color: '#C077FF', text: 'EPIC' };   
        case 'legendary': return { color: '#FFB000', text: 'LEGENDARY' }; 
        default: return { color: '#FFFFFF', text: tier ? tier.toUpperCase() : ''};
    }
}

function equalizeEvolutionCardHeights() {
    if (!evolutionOptionsContainer) return;
    const optionElements = evolutionOptionsContainer.querySelectorAll('.evolutionOption');
    if (optionElements.length > 0) {
        requestAnimationFrame(() => { // Ensure calculations happen after layout
            let maxHeight = 0;
            optionElements.forEach(opt => {
                opt.style.minHeight = '0'; 
                opt.style.height = 'auto';
                if (opt.offsetHeight > maxHeight) {
                    maxHeight = opt.offsetHeight;
                }
            });

            if (maxHeight > 0) {
                optionElements.forEach(opt => {
                    opt.style.minHeight = `${maxHeight}px`;
                });
            }
        });
    }
}
function equalizeFreeUpgradeCardHeights() {
    if (!freeUpgradeOptionContainer) return;
    const optionElements = freeUpgradeOptionContainer.querySelectorAll('.freeUpgradeOption');
     if (optionElements.length > 0) {
        requestAnimationFrame(() => {
            let maxHeight = 0;
            optionElements.forEach(opt => {
                opt.style.minHeight = '0';
                opt.style.height = 'auto';
                if (opt.offsetHeight > maxHeight) {
                    maxHeight = opt.offsetHeight;
                }
            });
            if (maxHeight > 0) {
                optionElements.forEach(opt => {
                    opt.style.minHeight = `${maxHeight}px`;
                });
            }
        });
    }
}
function equalizeLootCardHeights() {
     if (!lootOptionsContainer) return;
    const optionElements = lootOptionsContainer.querySelectorAll('.lootOption');
    if (optionElements.length > 0) {
        requestAnimationFrame(() => {
            let maxHeight = 0;
            optionElements.forEach(opt => {
                opt.style.minHeight = '0';
                opt.style.height = 'auto';
                if (opt.offsetHeight > maxHeight) {
                    maxHeight = opt.offsetHeight;
                }
            });
            if (maxHeight > 0) {
                optionElements.forEach(opt => {
                    opt.style.minHeight = `${maxHeight}px`;
                });
            }
        });
    }
}


export function populateEvolutionOptionsUI(choices, playerInstance, evolutionSelectCallback, currentShrinkMeCooldown, getReadableColorNameFunc) {
    if (!evolutionOptionsContainer || !playerInstance) return;
    evolutionOptionsContainer.innerHTML = '';

    choices.forEach(uiChoiceData => { 
        const choiceWrapper = document.createElement('div');
        choiceWrapper.classList.add('evolution-choice-wrapper');

        const optionDiv = document.createElement('div');
        optionDiv.classList.add('evolutionOption');
        optionDiv.dataset.class = uiChoiceData.classType;

        const tierLabel = document.createElement('span');
        tierLabel.classList.add('evolution-tier-label'); 

        if (!uiChoiceData.originalEvolution.isTiered) {
            optionDiv.dataset.tier = "core";
            const tierStyle = getTierStyling("core"); 
            tierLabel.textContent = tierStyle.text;
            tierLabel.style.color = tierStyle.color;
            tierLabel.classList.add('has-tier');
        } else if (uiChoiceData.originalEvolution.isTiered && uiChoiceData.rolledTier && uiChoiceData.rolledTier !== "none") {
            const tierStyle = getTierStyling(uiChoiceData.rolledTier);
            tierLabel.textContent = tierStyle.text;
            tierLabel.style.color = tierStyle.color;
            tierLabel.classList.add('has-tier');
            optionDiv.dataset.tier = uiChoiceData.rolledTier; 
        }
        
        choiceWrapper.appendChild(tierLabel); 
        
        let displayText = `<h3>${uiChoiceData.text}</h3>`; 
        if (uiChoiceData.cardEffectString) {
             displayText += `<span class="evolution-details">${uiChoiceData.cardEffectString}</span>`;
        }
        optionDiv.innerHTML = displayText;

        if (uiChoiceData.detailedDescription && evolutionTooltip) {
            optionDiv.onmouseover = (event) => { 
                let tooltipText = "";
                let effectiveTierForTooltip = "core"; 
                if (uiChoiceData.originalEvolution.isTiered && uiChoiceData.rolledTier && uiChoiceData.rolledTier !== "none") {
                    effectiveTierForTooltip = uiChoiceData.rolledTier;
                }
                
                const tierStyle = getTierStyling(effectiveTierForTooltip);
                tooltipText = `<span style="text-transform: capitalize; font-weight: bold; color: ${tierStyle.color};">${tierStyle.text} TIER</span><br>`;
                tooltipText += uiChoiceData.detailedDescription;

                evolutionTooltip.innerHTML = tooltipText; 
                evolutionTooltip.style.left = `${event.pageX + 15}px`; 
                evolutionTooltip.style.top = `${event.pageY + 15}px`; 
                evolutionTooltip.style.display = 'block'; 
            };
            optionDiv.onmousemove = (event) => { 
                evolutionTooltip.style.left = `${event.pageX + 15}px`; 
                evolutionTooltip.style.top = `${event.pageY + 15}px`;
            };
            optionDiv.onmouseout = () => { evolutionTooltip.style.display = 'none'; };
        }

        const baseEvoForMaxCheck = uiChoiceData.originalEvolution;
        const isMaxed = baseEvoForMaxCheck.isMaxed ? baseEvoForMaxCheck.isMaxed(playerInstance) : false;

        if (baseEvoForMaxCheck.id === 'noMoreEvolutions' || isMaxed ) {
            optionDiv.classList.add('disabled');
            if (optionDiv.dataset.tier !== "core" || !isMaxed) { 
                 optionDiv.dataset.tier = 'disabled';
            } else if (optionDiv.dataset.tier === "core" && isMaxed) {
            }


            if (baseEvoForMaxCheck.id === 'smallerPlayer' && currentShrinkMeCooldown > 0) {
                const h3 = optionDiv.querySelector('h3');
                if (h3) {
                    h3.innerHTML += `<p style="font-size:10px; color:#aaa;">(Available in ${currentShrinkMeCooldown} more evolution${currentShrinkMeCooldown !== 1 ? 's' : ''})</p>`;
                }
            }
        } else {
            optionDiv.onclick = () => evolutionSelectCallback(uiChoiceData); 
        }
        
        choiceWrapper.appendChild(optionDiv); 
        evolutionOptionsContainer.appendChild(choiceWrapper); 
    });

    // Height equalization is now called from showScreen after this screen is made visible
}

export function populateFreeUpgradeOptionUI(chosenUpgrade, onContinueCallback) {
    if (!freeUpgradeOptionContainer || !closeFreeUpgradeButton) return;
    freeUpgradeOptionContainer.innerHTML = '';
    const optionDiv = document.createElement('div');
    optionDiv.classList.add('freeUpgradeOption');
    optionDiv.innerHTML = `<h3>${chosenUpgrade.text}</h3><p>${chosenUpgrade.id === 'noMoreFreeUpgrades' ? 'Continue playing!' : 'Claim this free bonus!'}</p>`;
    freeUpgradeOptionContainer.appendChild(optionDiv);
    closeFreeUpgradeButton.onclick = () => onContinueCallback(chosenUpgrade);

    // Height equalization is now called from showScreen
}

export function populateLootOptionsUI(choices, playerInstance, onSelectLootCallback, allPossibleColors, getReadableColorNameFunc) {
    if (!lootOptionsContainer || !playerInstance) return;
    lootOptionsContainer.innerHTML = '';
    choices.forEach(choice => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('lootOption');
        let colorsToOffer = [];

        if (choice.type === 'path_buff') { // Handle Path Buffs for first boss
             optionDiv.innerHTML = `<h3>${choice.name}</h3> <p>${choice.description}</p><span class="optionType" style="color: #FFD700; font-weight:bold;">Path Defining</span>`;
             optionDiv.onclick = () => onSelectLootCallback(choice); 
        } else if (choice.id === 'adaptiveShield') {
           let availableColors = allPossibleColors.filter(c => !playerInstance.immuneColorsList.includes(c));
           let offeredColorsText = [];
           if (availableColors.length > 0) {
               for(let i = 0; i < 4 && availableColors.length > 0; i++){
                   const rIndex = Math.floor(Math.random() * availableColors.length);
                   const selectedColor = availableColors.splice(rIndex, 1)[0];
                   colorsToOffer.push(selectedColor);
                   offeredColorsText.push(`<span style="color:${selectedColor}; text-shadow: 1px 1px 1px black; font-weight: bold;">${getReadableColorNameFunc(selectedColor)}</span>`);
               }
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
    // Height equalization is now called from showScreen
}


export function displayGameOverScreenContent(currentScore, isNewHighScore, onSubmitScoreCallback, onRestartCallback, onMainMenuCallback) {
    if (!gameOverScreen) return;
    gameOverScreen.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = "Game Over!";
    gameOverScreen.appendChild(title);

    const scoreP = document.createElement('p');
    scoreP.textContent = `Your final score: ${currentScore}`;
    gameOverScreen.appendChild(scoreP);

    if (isNewHighScore) {
        const newHSP = document.createElement('p');
        newHSP.style.color = '#0f0';
        newHSP.textContent = "New High Score!";
        gameOverScreen.appendChild(newHSP);

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'playerNameInputGameOver';
        nameInput.placeholder = "Enter name (max 10)";
        nameInput.maxLength = 10;
        gameOverScreen.appendChild(nameInput);

        const submitButton = document.createElement('button');
        submitButton.id = 'submitScoreButtonGameOver';
        submitButton.textContent = "Submit";
        submitButton.onclick = () => {
            const name = (nameInput.value.trim().substring(0,10)||"ANON").toUpperCase();
            onSubmitScoreCallback(name);
            submitButton.disabled = true;
            submitButton.textContent = "Submitted!";
        };
        gameOverScreen.appendChild(submitButton);
    }

    const restartButton = document.createElement('button');
    restartButton.id = 'restartButtonGOScreen';
    restartButton.textContent = "Play Again";
    restartButton.onclick = onRestartCallback;
    gameOverScreen.appendChild(restartButton);

    const mainMenuButton = document.createElement('button');
    mainMenuButton.id = 'mainMenuButtonGOScreen';
    mainMenuButton.textContent = "Main Menu";
    mainMenuButton.onclick = onMainMenuCallback;
    gameOverScreen.appendChild(mainMenuButton);
}

export function displayDetailedHighScoresScreenUI(scoresData, onEntryClickCallback, onBackCallback) {
    if (!detailedHighScoresScreen || !detailedScoresList || !detailedStatsDisplayContainer) { console.error("Detailed high scores screen elements not found!"); return; }
    detailedScoresList.innerHTML = '';

    if (pausePlayerStatsPanel && pausePlayerStatsPanel.parentElement !== document.body) {
        document.body.appendChild(pausePlayerStatsPanel);
        pausePlayerStatsPanel.style.display = 'none';
    }


    if (!scoresData || scoresData.length === 0) {
        const li = document.createElement('li'); li.textContent = "No high scores recorded yet."; detailedScoresList.appendChild(li);
        if (detailedStatsDisplayContainer) detailedStatsDisplayContainer.innerHTML = '<p style="color:#aaa; text-align:center; margin-top: 20px;">Select a score to view details.</p>';
    } else {
        scoresData.forEach((scoreEntry, index) => {
            const li = document.createElement('li');
            let dateString = '';
            if (scoreEntry.timestamp) {
                dateString = ` (${new Date(scoreEntry.timestamp).toLocaleDateString()})`;
            }
            li.textContent = `${index + 1}. ${scoreEntry.name} - ${scoreEntry.score}${dateString}`;

            if (scoreEntry.stats) {
                li.onclick = () => {
                    const currentSelected = detailedScoresList.querySelector('.selected-score');
                    if (currentSelected) { currentSelected.classList.remove('selected-score'); }
                    li.classList.add('selected-score');
                    onEntryClickCallback(scoreEntry.stats, scoreEntry.name);
                };
            } else {
                li.style.cursor = "default";
                li.title = "Detailed stats not available for this entry.";
            }
            detailedScoresList.appendChild(li);
        });
         if (detailedStatsDisplayContainer) detailedStatsDisplayContainer.innerHTML = '<p style="color:#aaa; text-align:center; margin-top: 20px;">Select a score to view details.</p>';
    }

    const backButton = document.getElementById('backToMainMenuFromScoresButton');
    if (backButton) {
        const newBackButton = backButton.cloneNode(true);
        backButton.parentNode.replaceChild(newBackButton, backButton);
        newBackButton.onclick = onBackCallback;
    }
}


export function updatePauseScreenStatsDisplay(statsSnapshot, getReadableColorNameFunc, panelTitleText = "Player Status") {
    if (!statsCoreDiv || !statsUpgradesUl || !statsImmunitiesContainer || !statsBossTiersDiv || !statsAbilitiesDiv || !statsMouseAbilitiesDiv) {
        console.warn("One or more pause stat panel divs not found in ui.js for updatePauseScreenStatsDisplay.");
        if (pausePlayerStatsPanel) pausePlayerStatsPanel.innerHTML = "<p>Error loading stats sections.</p>";
        return;
    }
    if (statsPanelTitle) {
        statsPanelTitle.textContent = panelTitleText;
    }

    if (!statsSnapshot || !statsSnapshot.playerData) {
        const noDataMsg = "<p><span style='color: #aaa; font-size:11px;'>No data available for this entry.</span></p>";
        statsCoreDiv.innerHTML = noDataMsg; statsUpgradesUl.innerHTML = `<li>${noDataMsg.replace(/<p>|<\/p>/g, '')}</li>`;
        statsImmunitiesContainer.innerHTML = `<span>${noDataMsg.replace(/<p>|<\/p>/g, '')}</span>`; statsAbilitiesDiv.innerHTML = noDataMsg;
        statsMouseAbilitiesDiv.innerHTML = noDataMsg; statsBossTiersDiv.innerHTML = noDataMsg;
        return;
    }

    const { playerData, bossTierData, gameplayTimeData } = statsSnapshot;
    const bossTypeNamesFromSource = CONSTANTS.bossTypeNames || ["CHASER", "REFLECTOR", "SINGULARITY"];
    const bossTypeKeysFromSource = CONSTANTS.bossTypeKeys || ["chaser", "reflector", "singularity"];

    let coreHTML = '';
    const formatNum = (val, digits = 1) => (typeof val === 'number' && !isNaN(val) ? val.toFixed(digits) : 'N/A');
    const formatInt = (val) => (typeof val === 'number' && !isNaN(val) ? val.toString() : 'N/A');

    coreHTML += `<p><span class="stat-label">Max HP:</span><span class="stat-value">${formatInt(playerData.maxHp)}</span></p>`;
    coreHTML += `<p><span class="stat-label">Player Size:</span><span class="stat-value">${formatNum(playerData.finalRadius)}</span></p>`; 
    coreHTML += `<p><span class="stat-label">Times Hit:</span><span class="stat-value">${formatInt(playerData.timesHit)}</span></p>`;
    if (gameplayTimeData !== undefined) { const mins = Math.floor(gameplayTimeData / 60000); const secs = Math.floor((gameplayTimeData % 60000) / 1000); coreHTML += `<p><span class="stat-label">Time Played:</span><span class="stat-value">${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}</span></p>`; }
    coreHTML += `<p><span class="stat-label">Damage Dealt:</span><span class="stat-value">${playerData.totalDamageDealt ? playerData.totalDamageDealt.toLocaleString() : 0}</span></p>`;
    statsCoreDiv.innerHTML = coreHTML;

    statsUpgradesUl.innerHTML = '';
    if (playerData.displayedUpgrades && playerData.displayedUpgrades.length > 0) { playerData.displayedUpgrades.forEach(upg => { const li = document.createElement('li'); li.innerHTML = `<span class="stat-label">${upg.name}</span><span class="stat-value">${upg.description || 'Active'}</span>`; statsUpgradesUl.appendChild(li); });}
    else { statsUpgradesUl.innerHTML = '<li><span style="color: #aaa; font-size:11px;">No upgrades acquired.</span></li>';}

    statsImmunitiesContainer.innerHTML = '';
    if (playerData.immuneColorsList && playerData.immuneColorsList.length > 0) { playerData.immuneColorsList.forEach(color => { const s = document.createElement('div'); s.className = 'immunity-swatch-pause'; s.style.backgroundColor = color; if (getReadableColorNameFunc) s.title = getReadableColorNameFunc(color); statsImmunitiesContainer.appendChild(s); });}
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
        bossTypeNamesFromSource.forEach((name, index) => { const key = bossTypeKeysFromSource[index]; const tier = bossTierData[key] || 0; if (tier > 0) { const p = document.createElement('p'); p.innerHTML = `<span class="stat-label">${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()}:</span><span class="stat-value">Tier ${tier}</span>`; statsBossTiersDiv.appendChild(p); encountered = true;}});
        if (!encountered) { statsBossTiersDiv.innerHTML = '<p><span style="color: #aaa; font-size:11px;">No bosses encountered.</span></p>';}
    } else { statsBossTiersDiv.innerHTML = '<p><span style="color: #aaa; font-size:11px;">Boss data unavailable.</span></p>';}
}