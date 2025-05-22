// js/ui.js
import * as CONSTANTS from './constants.js';

// --- DOM Element Exports --- (Same as before)
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


// --- UI State --- (Same as before)
let previousScreenForSettings = null;

// --- UI Update Functions --- (Most are same as before)
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
    activeBuffIndicator.textContent = textParts.join(' ').trim();
}
export function displayHighScores(containerElement, scoresArray) { 
    if (!containerElement) return; containerElement.innerHTML = '';
    if (!scoresArray || scoresArray.length === 0) { containerElement.innerHTML = "<li>No scores yet!</li>"; return; }
    scoresArray.forEach(scoreItem => { const li = document.createElement('li'); li.textContent = `${scoreItem.name}: ${scoreItem.score}`; containerElement.appendChild(li); });
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
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('ability-slot');
        slotDiv.id = `ability-slot-${desc.id || desc.slot}`;

        let isUnlocked = false;
        let isReady = false;
        let isChargingOrActive = false;
        let currentTimer = 0;
        let maxTimer = 0;
        let actualIconText = desc.defaultIcon || '?'; // Start with default
        let keybindText = desc.keybindText || desc.slot;

        if (desc.type === 'mouse') {
            isUnlocked = desc.check();
            actualIconText = desc.iconText; // Mouse abilities have their icon defined directly
            if (isUnlocked) {
                isChargingOrActive = desc.isCharging();
                if (isChargingOrActive) {
                    currentTimer = desc.timer();
                    maxTimer = desc.maxTime();
                } else if (desc.cooldownTimer() > 0) {
                    currentTimer = desc.cooldownTimer();
                    maxTimer = desc.cooldownMax();
                } else {
                    isReady = true;
                }
            }
        } else if (desc.type === 'slot') {
            const ability = playerInstance.activeAbilities[desc.slot];
            if (ability) { // Ability acquired for this slot
                isUnlocked = true;
                // Determine icon based on the acquired ability's ID
                switch(ability.id) {
                    case 'empBurst': actualIconText = '💥'; break;
                    case 'miniGravityWell': actualIconText = '🔮'; break;
                    case 'teleport': actualIconText = '🌀'; break;
                    default: actualIconText = '?'; // Fallback for unknown ability ID
                }

                if (ability.id === 'miniGravityWell' && playerInstance.activeMiniWell && playerInstance.activeMiniWell.isActive) {
                    isChargingOrActive = true;
                    currentTimer = playerInstance.activeMiniWell.lifeTimer;
                    maxTimer = playerInstance.activeMiniWell.maxLife;
                } else if (ability.cooldownTimer > 0) {
                    currentTimer = ability.cooldownTimer;
                    maxTimer = ability.cooldownDuration;
                } else {
                    isReady = true;
                }
            } else { // Slot exists but no ability acquired for it yet
                isUnlocked = false;
                actualIconText = desc.defaultIcon; // Use the default icon for the slot when locked
            }
        }

        const keybindSpan = document.createElement('span');
        keybindSpan.classList.add('keybind');
        keybindSpan.textContent = keybindText;

        const iconDivElem = document.createElement('div');
        iconDivElem.classList.add('icon');
        iconDivElem.textContent = actualIconText; // Use the determined actualIconText

        const cooldownOverlayDiv = document.createElement('div');
        cooldownOverlayDiv.classList.add('cooldown-overlay');

        const cooldownTimerSpan = document.createElement('span');
        cooldownTimerSpan.classList.add('cooldown-timer');

        slotDiv.appendChild(keybindSpan);
        slotDiv.appendChild(iconDivElem); // Append the actual icon first
        slotDiv.appendChild(cooldownOverlayDiv);
        slotDiv.appendChild(cooldownTimerSpan);

        if (!isUnlocked) {
            slotDiv.classList.add('locked');
            iconDivElem.style.opacity = '0.3'; // Make the actual icon faint

            const lockIconDiv = document.createElement('div'); // Create a separate lock icon
            lockIconDiv.classList.add('icon', 'lock-icon-overlay'); // Add a class for specific styling
            lockIconDiv.textContent = '🔒';
            lockIconDiv.style.position = 'absolute'; // Position it on top
            lockIconDiv.style.zIndex = '4'; // Ensure it's above the faint ability icon
            lockIconDiv.style.color = '#DDD'; // Color for the lock
            lockIconDiv.style.opacity = '0.7'; // Make lock slightly transparent if desired
            slotDiv.appendChild(lockIconDiv); // Add the lock icon

            cooldownOverlayDiv.style.height = '100%';
            cooldownOverlayDiv.style.backgroundColor = 'rgba(50,50,50,0.8)';
            cooldownTimerSpan.textContent = '';
        } else if (isChargingOrActive) {
            slotDiv.classList.add('charging');
            if (maxTimer > 0) {
                cooldownOverlayDiv.style.height = `${(1 - (currentTimer / maxTimer)) * 100}%`;
                cooldownTimerSpan.textContent = (currentTimer / 1000).toFixed(1) + 's';
            }
        } else if (!isReady && currentTimer > 0) { // On cooldown
            slotDiv.classList.add('on-cooldown');
            if (maxTimer > 0) {
                const cooldownPercent = (currentTimer / maxTimer) * 100;
                cooldownOverlayDiv.style.height = `${Math.min(100, cooldownPercent)}%`;
                cooldownTimerSpan.textContent = (currentTimer / 1000).toFixed(1) + 's';
            }
        } else if (isReady) {
            slotDiv.classList.add('ready');
            cooldownOverlayDiv.style.height = '0%';
            cooldownTimerSpan.textContent = '';
        }
        abilityCooldownUI.appendChild(slotDiv);
    });
}


// --- (Screen Management - SAME AS PREVIOUS FULL FILE) ---
// ...
// --- (UI Population Functions for Evolution, Free Upgrade, Loot, GameOver, Detailed High Scores - SAME AS PREVIOUS FULL FILE) ---
// ...
// --- (updatePauseScreenStatsDisplay - SAME AS PREVIOUS FULL FILE) ---
// ...
// The rest of ui.js (showScreen, getPreviousScreenForSettings, setPreviousScreenForSettings, populateEvolutionOptionsUI, populateFreeUpgradeOptionUI, populateLootOptionsUI, displayGameOverScreenContent, displayDetailedHighScoresScreenUI, updatePauseScreenStatsDisplay) should remain the same as the previous full file version.
// For brevity, I'm not repeating them here, assuming they are correct from the previous full file.
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
    if (screenElementToShow === null) {
        if (canvas) canvas.style.display = 'block';
    } else {
        const showCanvasBehind = screenElementToShow === pauseScreen ||
                                 screenElementToShow === evolutionScreen ||
                                 screenElementToShow === freeUpgradeScreen ||
                                 screenElementToShow === lootChoiceScreen ||
                                 screenElementToShow === countdownOverlay ||
                                 (screenElementToShow === settingsScreen && previousScreenForSettings === pauseScreen);

        if (canvas) canvas.style.display = showCanvasBehind ? 'block' : 'none';
        if (screenElementToShow) screenElementToShow.style.display = 'flex';

        if (screenElementToShow === settingsScreen) {
            // previousScreenForSettings is set by the caller (main.js) via setPreviousScreenForSettings
        }
        if ([evolutionScreen, freeUpgradeScreen, lootChoiceScreen, startScreen, gameOverScreen, settingsScreen, pauseScreen, countdownOverlay, detailedHighScoresScreen].includes(screenElementToShow)) {
            gameIsNowPaused = true;
        }
    }

    if (gameIsNowPaused && callbacks.onPauseGame) callbacks.onPauseGame(screenElementToShow);
    else if (!gameIsNowPaused && callbacks.onResumeGame) callbacks.onResumeGame();
    if (callbacks.onApplyMusicPlayState) callbacks.onApplyMusicPlayState();

    return gameIsNowPaused;
}
export function getPreviousScreenForSettings() { return previousScreenForSettings; }
export function setPreviousScreenForSettings(screenRef) { previousScreenForSettings = screenRef; }

export function populateEvolutionOptionsUI(choices, playerInstance, evolutionSelectCallback, currentShrinkMeCooldown, getReadableColorNameFunc) {
    if (!evolutionOptionsContainer || !playerInstance) return;
    evolutionOptionsContainer.innerHTML = '';
    choices.forEach(choice => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('evolutionOption');
        optionDiv.dataset.class = choice.classType;
        let displayText = choice.text;

        if (choice.maxLevel !== undefined && choice.maxLevel > 0 && choice.maxLevel < 500) { 
            displayText += ` (Lvl ${choice.level || 0}/${choice.maxLevel})`;
        } else if (choice.level !== undefined && choice.id !== 'smallerPlayer' && choice.maxLevel !== 999) { 
             displayText += ` (Lvl ${choice.level || 0})`;
        } else if (choice.maxLevel === 999 && choice.level !== undefined) { 
            displayText += ` (Lvl ${choice.level || 0})`;
        }

        if (choice.getEffectString && typeof choice.getEffectString === 'function') {
             displayText += `<br><span class="evolution-details">${choice.getEffectString()}</span>`;
        }

        optionDiv.innerHTML = `<h3>${displayText}</h3>`;

        if (choice.detailedDescription && evolutionTooltip) {
            optionDiv.onmouseover = (event) => { evolutionTooltip.innerHTML = choice.detailedDescription; evolutionTooltip.style.left = `${event.pageX + 15}px`; evolutionTooltip.style.top = `${event.pageY + 15}px`; evolutionTooltip.style.display = 'block'; };
            optionDiv.onmousemove = (event) => { evolutionTooltip.style.left = `${event.pageX + 15}px`; evolutionTooltip.style.top = `${event.pageY + 15}px`;};
            optionDiv.onmouseout = () => { evolutionTooltip.style.display = 'none'; };
        }

        if (choice.id === 'noMoreEvolutions' || (choice.isMaxed && choice.isMaxed(playerInstance))) { 
            optionDiv.classList.add('disabled');
            if (choice.id === 'smallerPlayer' && currentShrinkMeCooldown > 0) {
                optionDiv.innerHTML += `<p>(Available in ${currentShrinkMeCooldown} more evolution${currentShrinkMeCooldown !== 1 ? 's' : ''})</p>`;
            }
        } else {
            optionDiv.onclick = () => evolutionSelectCallback(choice);
        }
        evolutionOptionsContainer.appendChild(optionDiv);
    });
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

export function populateLootOptionsUI(choices, playerInstance, onSelectLootCallback, allPossibleColors, getReadableColorNameFunc) {
    if (!lootOptionsContainer || !playerInstance) return;
    lootOptionsContainer.innerHTML = '';
    choices.forEach(choice => {
        const optionDiv = document.createElement('div');
        optionDiv.classList.add('lootOption');
        let colorsToOffer = [];

        if (choice.id === 'adaptiveShield') {
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
    coreHTML += `<p><span class="stat-label">Max HP:</span><span class="stat-value">${playerData.maxHp || CONSTANTS.PLAYER_MAX_HP}</span></p>`;
    coreHTML += `<p><span class="stat-label">Speed:</span><span class="stat-value">${playerData.currentSpeed !== undefined ? playerData.currentSpeed.toFixed(1) : (CONSTANTS.PLAYER_SPEED_BASE !== undefined ? CONSTANTS.PLAYER_SPEED_BASE.toFixed(1) : 'N/A')}</span></p>`;
    coreHTML += `<p><span class="stat-label">Base Radius:</span><span class="stat-value">${playerData.baseRadius ? playerData.baseRadius.toFixed(1) : 'N/A'}</span></p>`;
    coreHTML += `<p><span class="stat-label">Final Radius:</span><span class="stat-value">${playerData.radius ? playerData.radius.toFixed(1) : 'N/A'}</span></p>`;
    coreHTML += `<p><span class="stat-label">Score Size Factor:</span><span class="stat-value">${playerData.currentGrowthFactor !== undefined ? playerData.currentGrowthFactor.toFixed(3) : 'N/A'}</span></p>`;
    coreHTML += `<p><span class="stat-label">Times Hit:</span><span class="stat-value">${playerData.timesHit !== undefined ? playerData.timesHit : 'N/A'}</span></p>`;
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