// js/main.js

// --- Module Imports ---
import * as CONSTANTS from './constants.js';
import * as GameState from './gameState.js';
import * as UIManager from './uiManager.js';
import { getHighScores, addHighScore, updatePendingTierRecordNames } from './highScoreManager.js';
import { initGameLoop, startGameLoop, stopGameLoop } from './gameLoop.js';
import * as EvolutionManager from './evolutionManager.js';
import * as LootManager from './lootManager.js';
import { createFinalStatsSnapshot } from './playerDataManager.js';
import { Player } from './player.js';
import {
    initializeGameLogic as importedInitializeGameLogic,
    resetGameLogicState as importedResetGameLogicState,
    updateGame as importedGameLogicUpdate,
    drawGame as importedGameLogicDraw,
    getPlayerInstance as importedGameLogicGetPlayer,
    getActiveBuffNotificationsArray as importedGameLogicGetActiveBuffs,
    getRays as importedGameLogicGetRays,
    getDecoys as importedGameLogicGetDecoys,
    getBossDefeatEffects as importedGameLogicGetBossDefeatEffects,
    getBossManagerInstance as importedGameLogicGetBossManager,
    getLootDrops as importedGameLogicGetLootDrops,
    getAbilityContextForPlayerLogic,
    getScreenShakeParams as importedGameLogicGetScreenShakeParams,
    updateCanvasDimensionsLogic as importedUpdateCanvasDimensionsLogic
} from './gameLogic.js';
import * as AchievementManager from './achievementManager.js';

import {
    canvas as gameCanvasElement,
    startScreen,
    uiHighScoreContainer,
    pausePlayerStatsPanel as uiPausePlayerStatsPanel,
    gameOverScreen,
    settingsScreen,
    detailedHighScoresScreen,
    achievementsScreen as uiAchievementsScreen, 
    evolutionScreen,
    freeUpgradeScreen,
    lootChoiceScreen,
    countdownOverlay,
    pauseScreen,
} from './ui.js';
import { initializeRayPool, getPooledRay, getReadableColorName as getReadableColorNameFromUtils } from './utils.js';
import {
    initializeAudio, playSound, stopSound, toggleSoundEnabled, applyMusicPlayState,
    updateMusicVolume, updateSpecificSfxVolume,
    newColorSound, gameOverSoundFX, lootPickupSound as audioLootPickupSound,
    shootSound,
    evolutionSound as audioEvolutionSound,
    upgradeSound as audioUpgradeSound,
    targetHitSound as audioTargetHitSound,
    heartSound, bonusPickupSound, screenShakeSound, playerHitSound,
    chainReactionSound,
    bossHitSound, omegaLaserSound, shieldOverchargeSound,
    playerWellDeploySound, playerWellDetonateSound, teleportSound, empBurstSound,
    savageHowlSound
} from './audio.js';
import { setupEventListeners } from './eventListeners.js';

// --- Module-level variables for main.js (coordinator) ---
let lastEvolutionScore = 0;
let wasLastEvolutionScoreBased = true;
let currentPlayerNameForHighScores = "CHAMPION";
let currentRunId = null;

const inputState = {
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false },
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight / 2,
    shiftPressed: false
};

let freeUpgradeChoicesData = [];
let currentActiveScreenMain = null;
let eventFlagsForAchievements = {};
let initialEvoScreenCharges = {
    evolutionReRolls: 0,
    evolutionBlocks: 0,
    evolutionFreezes: 0
};


// --- Variables to hold imported functions from gameLogic.js ---
let initializeGameLogicFunc = null;
let resetGameLogicStateFunc = null;
let gameLogicUpdateFunc = null;
let gameLogicDrawFunc = null;
let gameLogicGetPlayerFunc = null;
let gameLogicGetActiveBuffsFunc = null;
let gameLogicGetRaysFunc = null;
let gameLogicGetDecoysFunc = null;
let gameLogicGetBossDefeatEffectsFunc = null;
let gameLogicGetBossManagerFunc = null;
let gameLogicGetLootDropsFunc = null;
let getAbilityContextForPlayerFuncFromGameLogic = null;
let gameLogicGetScreenShakeParamsFunc = null;
let gameLogicUpdateCanvasDimensionsFunc = null;

function checkPlayerIntegrity(label) {
    const p = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    if (p) {
        if (!(p instanceof Player) || typeof p.draw !== 'function' || typeof p.update !== 'function') {
        }
    } else {
    }
}


function setCanvasDimensions() {
    if (!gameCanvasElement) return;

    gameCanvasElement.width = window.innerWidth;
    gameCanvasElement.height = window.innerHeight;

    if (initializeGameLogicFunc && typeof gameLogicUpdateCanvasDimensionsFunc === 'function') {
         gameLogicUpdateCanvasDimensionsFunc(gameCanvasElement.width, gameCanvasElement.height);
    }


    inputState.mouseX = gameCanvasElement.width / 2;
    inputState.mouseY = gameCanvasElement.height / 2;

    const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    if(currentPlayer && GameState.isGameRunning()){
        if (typeof currentPlayer.x === 'number' && typeof currentPlayer.y === 'number' && typeof currentPlayer.radius === 'number') {
             currentPlayer.x=Math.max(currentPlayer.radius,Math.min(currentPlayer.x,gameCanvasElement.width-currentPlayer.radius));
             currentPlayer.y=Math.max(currentPlayer.radius,Math.min(currentPlayer.y,gameCanvasElement.height-currentPlayer.radius));
        } else {
        }
    }


    if(gameLogicDrawFunc && GameState.isGameRunning() && !GameState.isGameOver() && !GameState.isAnyPauseActive()) {
        const pForDraw = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
        if (pForDraw && typeof pForDraw.draw !== 'function') {
        } else {
            gameLogicDrawFunc();
        }
    }


    if ((GameState.isGamePausedByEsc() || GameState.isGameOver() || (UIManager.getCurrentActiveScreen() === detailedHighScoresScreen)) && uiPausePlayerStatsPanel && uiPausePlayerStatsPanel.style.display === 'block') {
        if (uiPausePlayerStatsPanel.parentElement === document.body && UIManager.getCurrentActiveScreen() !== detailedHighScoresScreen && uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null ) {
            const r = uiHighScoreContainer.getBoundingClientRect(); uiPausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px';
        }  else if (uiPausePlayerStatsPanel.parentElement === document.body && UIManager.getCurrentActiveScreen() !== detailedHighScoresScreen) {
            uiPausePlayerStatsPanel.style.top = '20px';
        }
    }
}

function getGameContextForAchievements() {
    const player = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    return {
        player: player,
        GameState: GameState,
        bossManager: gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null,
        activeBuffNotificationsArray: gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [],
        playSound: playSound,
        audioSystem: {
            upgradeSound: audioUpgradeSound
        },
        currentRunId: currentRunId,
        evolutionManager: EvolutionManager,
        lootManager: LootManager,
        eventFlags: eventFlagsForAchievements,
        initialEvoScreenCharges: initialEvoScreenCharges,
        CONSTANTS: CONSTANTS
    };
}

// Helper to get full context for player methods if needed
function getGameContextForPlayerUpdate() {
    return {
        dt: 0, // Should be set by caller if time-dependent
        keys: inputState.keys,
        mouseX: inputState.mouseX,
        mouseY: inputState.mouseY,
        canvasWidth: gameCanvasElement.width,
        canvasHeight: gameCanvasElement.height,
        targets: gameLogicGetRaysFunc ? gameLogicGetRaysFunc().filter(r => r.isTarget) : [], // Example, adjust as needed
        activeBosses: gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc().activeBosses : [],
        currentGrowthFactor: GameState.getCurrentPlayerRadiusGrowthFactor(),
        currentEffectiveDefaultGrowthFactor: GameState.getCurrentEffectiveDefaultGrowthFactor(),
        updateHealthDisplayCallback: UIManager.updateHealthDisplay,
        updateAbilityCooldownCallback: UIManager.updateAbilityCooldownUI,
        isAnyPauseActiveCallback: GameState.isAnyPauseActive,
        getBossManager: gameLogicGetBossManagerFunc,
        decoysArray: gameLogicGetDecoysFunc ? gameLogicGetDecoysFunc() : [],
        bossDefeatEffectsArray: gameLogicGetBossDefeatEffectsFunc ? gameLogicGetBossDefeatEffectsFunc() : [],
        allRays: gameLogicGetRaysFunc ? gameLogicGetRaysFunc() : [],
        screenShakeParams: gameLogicGetScreenShakeParamsFunc ? gameLogicGetScreenShakeParamsFunc() : {},
        activeBuffNotificationsArray: gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [],
        score: GameState.getScore(),
        evolutionChoices: EvolutionManager.getEvolutionMasterList(),
        ui: UIManager,
        CONSTANTS: CONSTANTS,
        endGameCallback: endGameInternal,
        updateScoreCallback: (amount) => { GameState.incrementScore(amount); UIManager.updateScoreDisplay(GameState.getScore()); if (gameContextForEventListeners.callbacks.checkForNewColorUnlock) gameContextForEventListeners.callbacks.checkForNewColorUnlock(); },
        signalAchievementEvent: gameContextForEventListeners.callbacks.signalAchievementEvent
    };
}


// --- Callbacks passed to other modules ---
function evolutionCycleConcludedCallback(uiSelectedChoice) {
    const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    if (!currentPlayer) {
        GameState.setGamePausedForEvolution(false);
        GameState.setEvolutionPendingAfterBoss(false);
        orchestrateScreenChange(null);
        return;
    }

    if (wasLastEvolutionScoreBased) {
        const evolutionInterval = CONSTANTS.EVOLUTION_SCORE_INTERVAL * (currentPlayer.evolutionIntervalModifier || 1.0);
        let newLastEvolutionScore = lastEvolutionScore + evolutionInterval;
        if (GameState.getScore() >= newLastEvolutionScore) {
            newLastEvolutionScore = Math.floor(GameState.getScore() / evolutionInterval) * evolutionInterval;
        }
        lastEvolutionScore = newLastEvolutionScore;
    }
    wasLastEvolutionScoreBased = true;

    GameState.setSurvivalScoreThisCycle(0);

    if (uiSelectedChoice && uiSelectedChoice.baseId !== 'smallerPlayer') {
        GameState.setCurrentPlayerRadiusGrowthFactor(GameState.getCurrentEffectiveDefaultGrowthFactor());
    }
    if (uiSelectedChoice && uiSelectedChoice.baseId === 'kineticConversion' && UIManager.kineticChargeUIElement && currentPlayer) {
        let maxPotencyBonusAtFullCharge = currentPlayer.initialKineticDamageBonus + (Math.max(0, currentPlayer.kineticConversionLevel - 1) * currentPlayer.effectiveKineticAdditionalDamageBonusPerLevel);
        UIManager.updateKineticChargeUI(currentPlayer.kineticCharge, currentPlayer.kineticChargeConsumption, maxPotencyBonusAtFullCharge, currentPlayer.kineticConversionLevel > 0);
    }

    GameState.setGamePausedForEvolution(false);
    GameState.setEvolutionPendingAfterBoss(false);
    GameState.setPostPopupImmunityTimer(CONSTANTS.POST_POPUP_IMMUNITY_DURATION);

    orchestrateScreenChange(null);

    UIManager.updateActiveBuffIndicator(currentPlayer, GameState.getPostPopupImmunityTimer(), GameState.getPostDamageImmunityTimer());
    UIManager.updateAbilityCooldownUI(currentPlayer);

    AchievementManager.checkAllAchievements(getGameContextForAchievements());


    const currentBossManager = gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null;
    if (currentBossManager && currentBossManager.isBossInQueue() && !currentBossManager.isBossWarningActiveProp() && !GameState.isAnyPauseActive()) {
        currentBossManager.processBossSpawnQueue(getGameContextForBossManager(LootManager));
    }
}

function lootSelectionConcludedCallback(chosenUpgrade, playerInstance, dependencies) {
    if (!playerInstance) {
        GameState.setGamePausedForLootChoice(false);
        orchestrateScreenChange(null);
        return;
    }

    GameState.setGamePausedForLootChoice(false);
    GameState.setPostPopupImmunityTimer(CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.75);

    orchestrateScreenChange(null);

    UIManager.updateActiveBuffIndicator(playerInstance, GameState.getPostPopupImmunityTimer(), GameState.getPostDamageImmunityTimer());
    UIManager.updateAbilityCooldownUI(playerInstance);
    AchievementManager.checkAllAchievements(getGameContextForAchievements());

    const currentBossManager = gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null;
    if (GameState.isEvolutionPendingAfterBoss()) {
        const currentPlayerForEvo = gameLogicGetPlayerFunc();
        const currentEvoThreshold = lastEvolutionScore + (CONSTANTS.EVOLUTION_SCORE_INTERVAL * (currentPlayerForEvo ? currentPlayerForEvo.evolutionIntervalModifier : 1.0));
        if (currentPlayerForEvo && GameState.getScore() >= currentEvoThreshold) {
            triggerEvolutionInternal(true);
        } else {
            GameState.setEvolutionPendingAfterBoss(false);
        }
    } else {
        if (currentBossManager && currentBossManager.isBossInQueue() && !currentBossManager.isBossWarningActiveProp() && !GameState.isAnyPauseActive()) {
            currentBossManager.processBossSpawnQueue(getGameContextForBossManager(LootManager));
        }
    }
}

function pathSelectionConcludedCallback(chosenPathBuff, playerInstance, dependencies) {
    if (!playerInstance) {
        GameState.setGamePausedForLootChoice(false);
        orchestrateScreenChange(null);
        return;
    }

    const activeBuffs = gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [];
    if (chosenPathBuff && dependencies && activeBuffs) {
        activeBuffs.push({ text: `${chosenPathBuff.name} Chosen!`, timer: CONSTANTS.BUFF_NOTIFICATION_DURATION });
    }
    AchievementManager.checkAllAchievements(getGameContextForAchievements());
    lootSelectionConcludedCallback(chosenPathBuff, playerInstance, dependencies);
}


function triggerEvolutionInternal(isScoreBased = true) {
    const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    const currentBossManager = gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null;

    if (!currentPlayer || (GameState.isAnyPauseActive() && !GameState.isGamePausedForEvolution()) || (currentBossManager && currentBossManager.isBossSequenceActive())) {
        if (!isScoreBased && GameState.isEvolutionPendingAfterBoss()) {
            GameState.setEvolutionPendingAfterBoss(false);
        }
        return;
    }

    initialEvoScreenCharges.evolutionReRolls = currentPlayer.evolutionReRollsRemaining;
    initialEvoScreenCharges.evolutionBlocks = currentPlayer.evolutionBlocksRemaining;
    initialEvoScreenCharges.evolutionFreezes = currentPlayer.evolutionFreezesRemaining;


    wasLastEvolutionScoreBased = isScoreBased;
    GameState.setGamePausedForEvolution(true);

    const evolutionDependencies = {
        UIManager: UIManager,
        playSound: playSound,
        onEvolutionCompleteCallback: evolutionCycleConcludedCallback,
        audioTargetHitSound: audioTargetHitSound,
        audioEvolutionSound: audioEvolutionSound,
        audioUpgradeSound: audioUpgradeSound,
        activeBuffNotificationsArray: gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [],
        updateLastEvolutionScore: (newScore) => { lastEvolutionScore = newScore; },
        triggerBossSpawnCheck: () => {
            const innerBossManager = gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null;
            if (innerBossManager && innerBossManager.isBossInQueue() && !innerBossManager.isBossWarningActiveProp() && !GameState.isAnyPauseActive()) {
                innerBossManager.processBossSpawnQueue(getGameContextForBossManager(LootManager));
            }
        },
        inputState: inputState
    };

    EvolutionManager.presentEvolutionUI(currentPlayer, evolutionDependencies);
    orchestrateScreenChange(evolutionScreen);
}

function redrawEvolutionOptionsInternal() {
    const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    if (currentPlayer && GameState.isGamePausedForEvolution()) {
        EvolutionManager.redrawEvolutionOptionsWithShiftState(currentPlayer);
    }
}


function triggerLootChoiceScreenInternal(choices) {
    const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    if (!currentPlayer || choices.length === 0) {
        GameState.setPostPopupImmunityTimer(CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.5);
        if (currentPlayer) UIManager.updateActiveBuffIndicator(currentPlayer, GameState.getPostPopupImmunityTimer(), GameState.getPostDamageImmunityTimer());
        if (GameState.isGameRunning() && !GameState.isGameOver() && !GameState.isAnyPauseActive() && gameLogicUpdateFunc && gameLogicDrawFunc) {
            startGameLoop(gameLogicUpdateFunc, gameLogicDrawFunc);
        }
        return;
    }

    const lootDependencies = {
        UIManager: UIManager,
        playSound: playSound,
        onLootSelectedCallback: lootSelectionConcludedCallback,
        audioLootPickupSound: audioLootPickupSound,
        activeBuffNotificationsArray: gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : []
    };

    LootManager.presentLootUI(choices, currentPlayer, lootDependencies, false);
    orchestrateScreenChange(lootChoiceScreen);
}

function triggerFirstBossLootScreenInternal() {
    const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    if (!currentPlayer) return;

    const pathChoices = LootManager.getFirstPathChoices();
    if (pathChoices.length === 0) {
        pathSelectionConcludedCallback(null, currentPlayer, { activeBuffNotificationsArray: gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [] });
        return;
    }

    const lootDependencies = {
        UIManager: UIManager,
        playSound: playSound,
        onPathSelectedCallback: pathSelectionConcludedCallback,
        audioLootPickupSound: audioLootPickupSound,
        activeBuffNotificationsArray: gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : []
    };

    LootManager.presentLootUI(pathChoices, currentPlayer, lootDependencies, true);
    orchestrateScreenChange(lootChoiceScreen);
}


function initFreeUpgradeChoicesInternal() {
    freeUpgradeChoicesData = [
        {id:'fasterSurvival',text:"Faster automatic points!",isMaxed:(p)=> GameState.getSurvivalUpgrades()>=CONSTANTS.MAX_SURVIVAL_UPGRADES,apply:()=>{GameState.incrementSurvivalUpgrades(); GameState.setCurrentSurvivalPointsInterval(Math.max(CONSTANTS.MIN_SURVIVAL_POINTS_INTERVAL,CONSTANTS.BASE_SURVIVAL_POINTS_INTERVAL-(GameState.getSurvivalUpgrades()*CONSTANTS.SURVIVAL_POINTS_INTERVAL_REDUCTION_PER_UPGRADE)));UIManager.updateSurvivalBonusIndicator(GameState.getSurvivalUpgrades(), CONSTANTS.MAX_SURVIVAL_UPGRADES);return"Passive scoring increased!";}},
        {id:'quickShield',text:"Brief invulnerability!",isMaxed:(p)=>!p || (GameState.getPostPopupImmunityTimer() > 0 && GameState.getPostDamageImmunityTimer() > 0),apply:()=>{GameState.setPostPopupImmunityTimer(CONSTANTS.POST_POPUP_IMMUNITY_DURATION*1.5);return"Temporary shield activated!";}},
        {id:'minorScoreBoost',text:"Small score boost!",isMaxed:(p)=>false,apply:()=>{GameState.incrementScore(25); UIManager.updateScoreDisplay(GameState.getScore()); checkForNewColorUnlock(); return"+25 Points!";}}
    ];
}
function handleFreeUpgradeCloseInternal(chosenUpgrade) {
    const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    if(chosenUpgrade && chosenUpgrade.id!=='noMoreFreeUpgrades') chosenUpgrade.apply(currentPlayer);
    GameState.setGamePausedForFreeUpgrade(false); GameState.setPostPopupImmunityTimer(CONSTANTS.POST_POPUP_IMMUNITY_DURATION);
    if(currentPlayer) { currentPlayer.isBlockModeActive = false; currentPlayer.isFreezeModeActive = false;}
    orchestrateScreenChange(null);
    if(currentPlayer) UIManager.updateActiveBuffIndicator(currentPlayer, GameState.getPostPopupImmunityTimer(), GameState.getPostDamageImmunityTimer());
    AchievementManager.checkAllAchievements(getGameContextForAchievements());
}

function handleFullHealthHeartPickupInternal(playerInstance) {
    if (!playerInstance) return;
    const activeBuffs = gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [];
    let chosenUpg;
    if (freeUpgradeChoicesData.length === 0) initFreeUpgradeChoicesInternal();

    eventFlagsForAchievements.heart_pickup_full_hp = true;
    AchievementManager.checkAllAchievements(getGameContextForAchievements());

    const avail = freeUpgradeChoicesData.filter(c => !c.isMaxed(playerInstance));
    if (avail.length > 0) {
        chosenUpg = avail[Math.floor(Math.random() * avail.length)];
        if (chosenUpg) {
            chosenUpg.apply(playerInstance);
            if (activeBuffs) activeBuffs.push({ text: "Max HP Bonus: " + chosenUpg.text.replace(/!$/, "") + "!", timer: CONSTANTS.BUFF_NOTIFICATION_DURATION});
            playSound(audioUpgradeSound);
        }
    } else {
        if (activeBuffs) activeBuffs.push({ text: "Max HP! +10 Score!", timer: CONSTANTS.BUFF_NOTIFICATION_DURATION});
        GameState.incrementScore(10); UIManager.updateScoreDisplay(GameState.getScore());
    }
}


function checkForNewColorUnlock() {
    const activeBuffs = gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [];
    if (GameState.getScore() >= GameState.getNextColorUnlockScore() && GameState.getNextUnlockableColorIndex() < CONSTANTS.UNLOCKABLE_RAY_COLORS_LIST.length) {
        const newColor = CONSTANTS.UNLOCKABLE_RAY_COLORS_LIST[GameState.getNextUnlockableColorIndex()];
        if (!GameState.getCurrentRayColors().includes(newColor)) {
            GameState.addCurrentRayColor(newColor);
            const colorName = getReadableColorNameFromUtils(newColor);
            if (activeBuffs) activeBuffs.push({ text: `New Ray Color: ${colorName}!`, timer: CONSTANTS.BUFF_NOTIFICATION_DURATION * 1.5 });
            playSound(newColorSound);
        }
        GameState.incrementNextUnlockableColorIndex();
        GameState.setNextColorUnlockScore(GameState.getNextColorUnlockScore() + CONSTANTS.NEW_COLOR_UNLOCK_INTERVAL);
        AchievementManager.checkAllAchievements(getGameContextForAchievements());
    }
}

function updateShootIntervalAndGameState() {
    const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
    if (!currentPlayer || GameState.isGameOver() || GameState.isAnyPauseActive()) return;
    let timeBasedReduction = CONSTANTS.SHOOT_INTERVAL_TIME_INITIAL_REDUCTION + (GameState.getGameplayTimeElapsed() * CONSTANTS.SHOOT_INTERVAL_TIME_SCALE_FACTOR);
    GameState.setCurrentShootInterval(Math.max(CONSTANTS.MIN_RAY_SHOOT_INTERVAL_BASE, CONSTANTS.BASE_RAY_SHOOT_INTERVAL - timeBasedReduction));
    GameState.setLastSetShootInterval(GameState.getCurrentShootInterval());
}

function orchestrateScreenChange(screenToShow) {
    currentActiveScreenMain = screenToShow;
    let shouldStopCoreGameLoop = false;

    if (screenToShow === evolutionScreen) GameState.setGamePausedForEvolution(true);
    else if (screenToShow === freeUpgradeScreen) GameState.setGamePausedForFreeUpgrade(true);
    else if (screenToShow === lootChoiceScreen) GameState.setGamePausedForLootChoice(true);
    else if (screenToShow === pauseScreen) GameState.setGamePausedByEsc(true);
    else if (screenToShow === startScreen || screenToShow === settingsScreen || screenToShow === gameOverScreen || screenToShow === detailedHighScoresScreen || screenToShow === uiAchievementsScreen) { 
        shouldStopCoreGameLoop = true;
    } else if (screenToShow === null) {
        GameState.setGamePausedForEvolution(false); GameState.setGamePausedForFreeUpgrade(false);
        GameState.setGamePausedForLootChoice(false);
    }

    if (shouldStopCoreGameLoop && GameState.isGameRunning() && !GameState.isGameOver()) {
        stopGameLoop();
    }
    else if (!shouldStopCoreGameLoop && GameState.isGameRunning() && !GameState.isGameOver() && gameLogicUpdateFunc && gameLogicDrawFunc) {
        startGameLoop(gameLogicUpdateFunc, gameLogicDrawFunc);
    }

    UIManager.showScreen(screenToShow);
    applyMusicPlayStateWrapper();
}


function initGame() {
    GameState.resetCoreGameState();
    AchievementManager.resetNewAchievementsThisSession();
    eventFlagsForAchievements = {};
    initialEvoScreenCharges = { evolutionReRolls: 0, evolutionBlocks: 0, evolutionFreezes: 0 };


    EvolutionManager.initializeEvolutionMasterList();
    EvolutionManager.resetEvolutionLevels();
    currentPlayerNameForHighScores = "CHAMPION";
    currentRunId = Date.now();


    const mainCallbacksForLogic = {
        endGameInternal: endGameInternal,
        triggerEvolutionInternal: triggerEvolutionInternal,
        triggerFirstBossLootScreenInternal: triggerFirstBossLootScreenInternal,
        triggerLootChoiceScreenInternal: triggerLootChoiceScreenInternal,
        checkForNewColorUnlock: checkForNewColorUnlock,
        getGameContextForBossManager: (lootMgrRef) => getGameContextForBossManager(lootMgrRef || LootManager),
        updateLastEvolutionScore: (score) => { lastEvolutionScore = score; },
        getLastEvolutionScore: () => lastEvolutionScore,
        getAbilityContextForPlayer: getAbilityContextForPlayerFuncFromGameLogic,
        updateShootInterval: updateShootIntervalAndGameState,
        handleFullHealthHeartPickup: handleFullHealthHeartPickupInternal,
        signalAchievementEvent: (eventName, eventData = {}) => { 
            eventFlagsForAchievements[eventName] = true;
            if (eventData && Object.keys(eventData).length > 0) {
                eventFlagsForAchievements[eventName + "_data"] = eventData;
            }
            // Per-frame check now handles this, so this call can be removed if desired, but is harmless.
            AchievementManager.checkAllAchievements(getGameContextForAchievements());
        }
    };

    if (initializeGameLogicFunc) {
        initializeGameLogicFunc(gameCanvasElement, inputState, mainCallbacksForLogic, CONSTANTS.PLAYER_SPEED_BASE);
    } else {
    }

    GameState.setGameRunning(true);

    UIManager.updateScoreDisplay(GameState.getScore());
    lastEvolutionScore = 0;
    wasLastEvolutionScoreBased = true;

    initFreeUpgradeChoicesInternal();


    const currentPlayer = gameLogicGetPlayerFunc();
    if (currentPlayer) {
        UIManager.updateHealthDisplay(currentPlayer.hp, currentPlayer.maxHp);
        UIManager.updateBuffIndicator(currentPlayer.immuneColorsList);
        UIManager.updateKineticChargeUI(currentPlayer.kineticCharge, currentPlayer.kineticChargeConsumption,
            currentPlayer.initialKineticDamageBonus + (Math.max(0, currentPlayer.kineticConversionLevel - 1) * currentPlayer.effectiveKineticAdditionalDamageBonusPerLevel),
            currentPlayer.kineticConversionLevel > 0
        );
         UIManager.updateBerserkerRageUI(currentPlayer.berserkerRagePercentage, currentPlayer);
        UIManager.updateAbilityCooldownUI(currentPlayer);
        UIManager.updateActiveBuffIndicator(currentPlayer, GameState.getPostPopupImmunityTimer(), GameState.getPostDamageImmunityTimer());
    }
    UIManager.updateSurvivalBonusIndicator(GameState.getSurvivalUpgrades(), CONSTANTS.MAX_SURVIVAL_UPGRADES);


    if (uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'none';

    setCanvasDimensions();

    orchestrateScreenChange(null);
    AchievementManager.checkAllAchievements(getGameContextForAchievements());

    UIManager.updateAllHighScoreDisplays(getHighScores());
}


function getOrdinalSuffix(i) {
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
}

function endGameInternal() {
    GameState.setGameOver(true); GameState.setGameRunning(false);
    stopGameLoop(); applyMusicPlayStateWrapper(); playSound(gameOverSoundFX);
    const currentPlayer = gameLogicGetPlayerFunc();
    if (currentPlayer && currentPlayer.isFiringOmegaLaser) stopSound(omegaLaserSound);

    const currentBossManager = gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null;
    const finalStatsSnapshot = createFinalStatsSnapshot(currentPlayer, currentBossManager ? currentBossManager.bossTiers : {}, LootManager.getBossLootPoolReference(), LootManager);
    AchievementManager.checkAllAchievements(getGameContextForAchievements());


    prepareAndShowPauseStats("Game Over - Final Stats");
    if (uiPausePlayerStatsPanel) {
        if (uiPausePlayerStatsPanel.parentElement !== document.body && UIManager.getCurrentActiveScreen() !== detailedHighScoresScreen) {
             document.body.appendChild(uiPausePlayerStatsPanel);
        }
        if (UIManager.getCurrentActiveScreen() === gameOverScreen) {
            const highScoreContainerRect = uiHighScoreContainer.getBoundingClientRect();
            if (uiHighScoreContainer && highScoreContainerRect.height > 0 && highScoreContainerRect.bottom < (gameCanvasElement.height - uiPausePlayerStatsPanel.offsetHeight - 20)) {
                uiPausePlayerStatsPanel.style.top = (highScoreContainerRect.bottom + 10) + 'px';
            } else {
                const gameOverRect = gameOverScreen.getBoundingClientRect();
                let panelTop = (gameOverRect.height > 0 && gameOverScreen.style.display === 'flex') ? gameOverRect.top - uiPausePlayerStatsPanel.offsetHeight - 10 : (gameCanvasElement.height / 2 - uiPausePlayerStatsPanel.offsetHeight / 2);
                 if (panelTop + uiPausePlayerStatsPanel.offsetHeight > gameCanvasElement.height - 20) panelTop = Math.max(20, gameCanvasElement.height - 20 - uiPausePlayerStatsPanel.offsetHeight);
                 if (panelTop < 20) panelTop = 20;
                 uiPausePlayerStatsPanel.style.top = `${panelTop}px`;
            }
            uiPausePlayerStatsPanel.style.display = 'block';
        }
    }

    const achievedPlacements = [];
    const allScores = getHighScores();
    const currentSurvivalScore = GameState.getScore();

    if (currentSurvivalScore > 0) {
        const survivalScores = allScores.survival || [];
        let tempSurvivalScores = [...survivalScores, { name: "TEMP_PLAYER_FOR_RANK_CHECK", value: currentSurvivalScore, runId: currentRunId }];
        tempSurvivalScores.sort((a, b) => b.value - a.value);
        const survivalRank = tempSurvivalScores.findIndex(s => s.runId === currentRunId);
        if (survivalRank !== -1 && survivalRank < CONSTANTS.MAX_ENTRIES_PER_CATEGORY) {
            achievedPlacements.push(`Survival: ${survivalRank + 1}${getOrdinalSuffix(survivalRank + 1)}`);
        }
    }

    const tierCategories = [
        { key: "nexusWeaverTier1Time", label: "Nexus T1" },
        { key: "nexusWeaverTier2Time", label: "Nexus T2" },
        { key: "nexusWeaverTier3Time", label: "Nexus T3" },
        { key: "nexusWeaverTier4Time", label: "Nexus T4" },
        { key: "nexusWeaverTier5Time", label: "Nexus T5" },
    ];

    tierCategories.forEach(catInfo => {
        const pendingEntryForThisRun = (allScores[catInfo.key] || []).find(entry => entry.runId === currentRunId && entry.name === "PENDING...");
        if (pendingEntryForThisRun) {
            const tierTimeValue = pendingEntryForThisRun.value;
            let tempTierScores = [...(allScores[catInfo.key] || [])];
            tempTierScores = tempTierScores.filter(s => !(s.runId === currentRunId && s.name === "PENDING..."));
            tempTierScores.push({ name: "TEMP_PLAYER_FOR_RANK_CHECK", value: tierTimeValue, runId: currentRunId });
            tempTierScores.sort((a, b) => a.value - b.value);

            const tierRank = tempTierScores.findIndex(s => s.runId === currentRunId);
            if (tierRank !== -1 && tierRank < CONSTANTS.MAX_ENTRIES_PER_CATEGORY) {
                achievedPlacements.push(`${catInfo.label}: ${tierRank + 1}${getOrdinalSuffix(tierRank + 1)}`);
            }
        }
    });

    const showNameInput = GameState.getScore() > 0;

    UIManager.displayGameOverScreenContent(
        currentSurvivalScore,
        showNameInput,
        achievedPlacements,
        (name) => {
            currentPlayerNameForHighScores = name || "CHAMPION";

            if (currentSurvivalScore > 0) {
                 addHighScore("survival", currentPlayerNameForHighScores, currentSurvivalScore, finalStatsSnapshot, currentRunId);
            }

            if (typeof updatePendingTierRecordNames === 'function') {
                updatePendingTierRecordNames(currentRunId, currentPlayerNameForHighScores);
            }
            UIManager.updateAllHighScoreDisplays(getHighScores());
        },
        () => { if(uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'none'; initGame(); },
        () => { if(uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'none'; showStartScreenWithUpdatesInternal(); }
    );
    orchestrateScreenChange(gameOverScreen);
}

function togglePauseMenu() {
    if (GameState.isGameOver() || GameState.getIsCountingDownToResume() || GameState.isGamePausedForEvolution() || GameState.isGamePausedForFreeUpgrade() || GameState.isGamePausedForLootChoice()) {
        return;
    }

    const currentPlayer = gameLogicGetPlayerFunc();
    if (!currentPlayer && !GameState.isGamePausedByEsc()) {
        return;
    }


    if (!GameState.isGamePausedByEsc()) {
        GameState.setGamePausedForEvolution(false);
        GameState.setGamePausedForFreeUpgrade(false);
        GameState.setGamePausedForLootChoice(false);

        if(currentPlayer) {
             currentPlayer.isBlockModeActive = false;
             currentPlayer.isFreezeModeActive = false;
        }
        prepareAndShowPauseStats("Paused");
        orchestrateScreenChange(pauseScreen);
        if(uiPausePlayerStatsPanel) {
            if (uiPausePlayerStatsPanel.parentElement !== document.body && UIManager.getCurrentActiveScreen() !== detailedHighScoresScreen) document.body.appendChild(uiPausePlayerStatsPanel);
            if (UIManager.getCurrentActiveScreen() === pauseScreen) {
                if (uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null) { const r = uiHighScoreContainer.getBoundingClientRect(); uiPausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px';}
                else uiPausePlayerStatsPanel.style.top = '20px';
                uiPausePlayerStatsPanel.style.display = 'block';
            }
        }
    } else {
        if(uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'none';
        startResumeCountdownInternal();
    }
}

function startResumeCountdownInternal() {
    if(uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'none';
    const currentPlayer = gameLogicGetPlayerFunc();
    GameState.setGamePausedByEsc(true); GameState.setIsCountingDownToResume(true);
    orchestrateScreenChange(countdownOverlay);
    let countVal = 3;
    if(currentPlayer) { currentPlayer.isBlockModeActive = false; currentPlayer.isFreezeModeActive = false;}
    if(countdownOverlay) countdownOverlay.textContent = countVal.toString();
    if (GameState.getResumeCountdownTimerId()) clearInterval(GameState.getResumeCountdownTimerId());
    GameState.setResumeCountdownTimerId(setInterval(() => {
        countVal--; if (countdownOverlay) countdownOverlay.textContent = countVal > 0 ? countVal.toString() : '';
        if (countVal <= 0) {
            clearInterval(GameState.getResumeCountdownTimerId()); GameState.setResumeCountdownTimerId(null);
            GameState.setIsCountingDownToResume(false); GameState.setGamePausedByEsc(false);
            orchestrateScreenChange(null);
        }
    }, 1000));
}


function prepareAndShowPauseStats(contextualTitle) {
    const currentPlayer = gameLogicGetPlayerFunc();
    const currentBossManager = gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null;
    const statsSnapshot = createFinalStatsSnapshot(currentPlayer, currentBossManager ? currentBossManager.bossTiers : {}, LootManager.getBossLootPoolReference(), LootManager);
    UIManager.updatePauseScreenStatsDisplay(statsSnapshot, contextualTitle);
}

function showDetailedHighScores() {
    const highScoresData = getHighScores();
    orchestrateScreenChange(detailedHighScoresScreen);
    UIManager.displayDetailedHighScoresScreenUI(
        highScoresData,
        (statsSnapshotFromStorage, entryName, category) => {
            let titleForStatsPanel = `Stats for ${entryName}`;
            if(category && category.toLowerCase().includes("time")){
                const tierMatch = category.match(/\d+/);
                if(tierMatch) titleForStatsPanel += ` (Nexus T${tierMatch[0]} Kill)`;
                else titleForStatsPanel += ` (Time Trial)`;
            } else if (category === "survival") {
                titleForStatsPanel += " (Survival)";
            }
            UIManager.updatePauseScreenStatsDisplay(statsSnapshotFromStorage, titleForStatsPanel);
            if (uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'block';
        },
        () => {
            if (uiPausePlayerStatsPanel && uiPausePlayerStatsPanel.parentElement !== document.body) document.body.appendChild(uiPausePlayerStatsPanel);
            if (uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'none';
            showStartScreenWithUpdatesInternal();
        }
    );
}

function showAchievementsScreen() {
    const achievementsData = AchievementManager.getAllAchievementsWithStatus();
    orchestrateScreenChange(uiAchievementsScreen); 
    UIManager.displayAchievementsScreenUI(
        achievementsData,
        () => {
            showStartScreenWithUpdatesInternal();
        }
    );
}

function applyMusicPlayStateWrapper() {
    const isPausedForPopupLocal = GameState.isGamePausedForEvolution() || GameState.isGamePausedForFreeUpgrade() || GameState.isGamePausedForLootChoice();
    applyMusicPlayState(GameState.isGameOver(), GameState.isGameRunning(), GameState.isGamePausedByEsc() || GameState.getIsCountingDownToResume(), isPausedForPopupLocal, UIManager.getCurrentActiveScreen());
}

function showStartScreenWithUpdatesInternal() {
    GameState.setGameRunning(false); GameState.setGameOver(false); GameState.setGamePausedByEsc(false); GameState.setIsCountingDownToResume(false);
    GameState.setGamePausedForEvolution(false); GameState.setGamePausedForFreeUpgrade(false); GameState.setGamePausedForLootChoice(false);
    GameState.setEvolutionPendingAfterBoss(false); GameState.setFirstBossDefeatedThisRun(false);
    stopGameLoop();
    const currentPlayer = gameLogicGetPlayerFunc();
    if (currentPlayer && currentPlayer.isFiringOmegaLaser) stopSound(omegaLaserSound);
    if (resetGameLogicStateFunc) {
        resetGameLogicStateFunc();
    }
    if (uiPausePlayerStatsPanel) {
        if (uiPausePlayerStatsPanel.parentElement !== document.body) document.body.appendChild(uiPausePlayerStatsPanel);
        uiPausePlayerStatsPanel.style.display = 'none';
    }
    UIManager.updateAllHighScoreDisplays(getHighScores());
    setCanvasDimensions();
    orchestrateScreenChange(startScreen);
}

function getGameContextForBossManager(lootManagerInstance) {
    return {
        dt: 16, canvasWidth: gameCanvasElement.width, canvasHeight: gameCanvasElement.height,
        isAnyPauseActive: GameState.isAnyPauseActive,
        allRays: gameLogicGetRaysFunc ? gameLogicGetRaysFunc() : [],
        screenShakeParams: gameLogicGetScreenShakeParamsFunc ? gameLogicGetScreenShakeParamsFunc() : {},
        bossDefeatEffectsArray: gameLogicGetBossDefeatEffectsFunc ? gameLogicGetBossDefeatEffectsFunc() : [],
        lootDropsArray: gameLogicGetLootDropsFunc ? gameLogicGetLootDropsFunc() : [],
        bossLootPool: lootManagerInstance ? lootManagerInstance.getBossLootPoolReference() : [],
        firstBossDefeatedThisRunRef: { get: GameState.isFirstBossDefeatedThisRun, set: GameState.setFirstBossDefeatedThisRun },
        score: GameState.getScore(),
        evolutionPendingAfterBossRef: { get: GameState.isEvolutionPendingAfterBoss, set: GameState.setEvolutionPendingAfterBoss },
        playerPostDamageImmunityTimer: GameState.getPostDamageImmunityTimer(),
        activeBuffNotificationsArray: gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [],
        callbacks: gameContextForEventListeners.callbacks,
        CONSTANTS, getPooledRay,
        currentRunId: currentRunId,
        player: gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null
    };
};


const gameContextForEventListeners = {
    inputState,
    getPlayerInstance: () => gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null,
    isGameRunning: GameState.isGameRunning,
    isGameOver: GameState.isGameOver,
    isAnyPauseActiveExceptEsc: GameState.isAnyPauseActiveExceptEsc,
    isGamePausedByEsc: GameState.isGamePausedByEsc,
    getBossManager: () => gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null,
    getForPlayerAbilityContext: () => getAbilityContextForPlayerFuncFromGameLogic ? getAbilityContextForPlayerFuncFromGameLogic() : {},
    getActiveBuffNotificationsArray: () => gameLogicGetActiveBuffsFunc ? gameLogicGetActiveBuffsFunc() : [],
    getCurrentActiveScreen: UIManager.getCurrentActiveScreen,
    getSettingsScreenElement: () => settingsScreen,
    getDetailedHighScoresScreenElement: () => detailedHighScoresScreen,
    getAchievementsScreenElement: () => uiAchievementsScreen, 
    isEvolutionScreenActive: () => UIManager.getCurrentActiveScreen() === evolutionScreen,
    isFreezeModeActive: () => { const currentPlayer = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null; return (currentPlayer ? currentPlayer.isFreezeModeActive : false);},
    callbacks: {
        startGame: initGame,
        showSettingsScreenFromStart: () => { UIManager.setPreviousScreenForSettings(startScreen); orchestrateScreenChange(settingsScreen); },
        viewDetailedHighScores: () => { showDetailedHighScores(); },
        viewAchievements: () => { showAchievementsScreen(); },
        toggleSound: () => { toggleSoundEnabled(); applyMusicPlayStateWrapper(); },
        updateMusicVolume, updateSfxVolume: updateSpecificSfxVolume,
        goBackFromSettings: () => {
            const targetScreenElement = UIManager.getPreviousScreenForSettings() || startScreen;
            orchestrateScreenChange(targetScreenElement);
            if (targetScreenElement === pauseScreen && uiPausePlayerStatsPanel) {
                prepareAndShowPauseStats("Paused");
                if (uiPausePlayerStatsPanel.parentElement !== document.body && UIManager.getCurrentActiveScreen() !== detailedHighScoresScreen) document.body.appendChild(uiPausePlayerStatsPanel);
                if (UIManager.getCurrentActiveScreen() === pauseScreen) {
                     if (uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null) { const r = uiHighScoreContainer.getBoundingClientRect(); uiPausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px';}
                     else uiPausePlayerStatsPanel.style.top = '20px';
                    uiPausePlayerStatsPanel.style.display = 'block';
                }
            } else if(uiPausePlayerStatsPanel && targetScreenElement !== detailedHighScoresScreen) {
                uiPausePlayerStatsPanel.style.display = 'none';
            }
        },
        goBackFromDetailedHighScores: () => {
            if (uiPausePlayerStatsPanel && uiPausePlayerStatsPanel.parentElement !== document.body) document.body.appendChild(uiPausePlayerStatsPanel);
            if (uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'none';
            showStartScreenWithUpdatesInternal();
        },
        goBackFromAchievements: () => { 
            showStartScreenWithUpdatesInternal();
        },
        resumeGameFromPause: togglePauseMenu, togglePauseMenu: togglePauseMenu,
        showSettingsScreenFromPause: () => { UIManager.setPreviousScreenForSettings(pauseScreen); orchestrateScreenChange(settingsScreen); if (uiPausePlayerStatsPanel) uiPausePlayerStatsPanel.style.display = 'none'; },
        goToMainMenuFromPause: showStartScreenWithUpdatesInternal,
        onWindowResize: setCanvasDimensions,
        debugSpawnBoss: (tier) => {
            const bm = gameLogicGetBossManagerFunc ? gameLogicGetBossManagerFunc() : null;
            const cp = gameLogicGetPlayerFunc ? gameLogicGetPlayerFunc() : null;
            if (bm && cp) bm.debugSpawnBoss(tier, 'nexusWeaver', cp);
        },
        handleEvolutionReRoll: () => {
            const cp = gameLogicGetPlayerFunc();
            if (cp && GameState.isGamePausedForEvolution()) {
                EvolutionManager.handleEvolutionReRoll(cp);
            }
        },
        toggleBlockMode: () => {
            const cp = gameLogicGetPlayerFunc();
             if (cp && GameState.isGamePausedForEvolution()) {
                EvolutionManager.toggleBlockMode(cp);
            }
        },
        toggleFreezeMode: () => {
            const cp = gameLogicGetPlayerFunc();
            if (cp && GameState.isGamePausedForEvolution()) {
                EvolutionManager.toggleFreezeMode(cp);
            }
        },
        redrawEvolutionOptions: redrawEvolutionOptionsInternal,
        onPlayerBossCollision: (collisionData) => { // collisionData = { boss: bossThatHit, type: "aegisOffensiveRam" | "standardPlayerDamage" }
            const cp = gameLogicGetPlayerFunc();
            if (!cp) return;
        
            const bossThatHit = collisionData.boss;
        
            if (collisionData.type === "aegisOffensiveRam") {
                if (cp.hasAegisPathHelm && typeof cp.handleAegisCollisionWithBoss === 'function') {
                    cp.handleAegisCollisionWithBoss(bossThatHit, getGameContextForPlayerUpdate());
                }
                // Aegis player takes no body damage from a successful offensive ram signal
            } else if (collisionData.type === "standardPlayerDamage") {
                if (!cp.isShieldOvercharging && (!cp.teleporting || cp.teleportEffectTimer <= 0) && GameState.getPostDamageImmunityTimer() <= 0) {
                    let damageAmount = bossThatHit.tier * 5; // Example base damage
                    
                    const dmgDealt = cp.takeDamage(
                        damageAmount,
                        { // gameContext for takeDamage
                            postPopupImmunityTimer: GameState.getPostPopupImmunityTimer(), 
                            postDamageImmunityTimer: GameState.getPostDamageImmunityTimer(), 
                            score: GameState.getScore(), 
                            updateHealthDisplayCallback: UIManager.updateHealthDisplay, 
                            endGameCallback: endGameInternal, 
                            updateScoreCallback: (amt) => { GameState.incrementScore(amt); UIManager.updateScoreDisplay(GameState.getScore()); if (gameContextForEventListeners.callbacks.checkForNewColorUnlock) gameContextForEventListeners.callbacks.checkForNewColorUnlock(); },
                            signalAchievementEvent: gameContextForEventListeners.callbacks.signalAchievementEvent,
                            getBossManager: gameLogicGetBossManagerFunc
                        },
                        { screenShakeParams: gameLogicGetScreenShakeParamsFunc ? gameLogicGetScreenShakeParamsFunc() : {} }
                    );
                    if (dmgDealt > 0) {
                        GameState.setPostDamageImmunityTimer(CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION);
                        // Standard player bounce back
                        const collisionAnglePlayer = Math.atan2(cp.y - bossThatHit.y, cp.x - bossThatHit.x);
                        cp.velX = Math.cos(collisionAnglePlayer) * CONSTANTS.PLAYER_BOUNCE_FORCE_FROM_BOSS;
                        cp.velY = Math.sin(collisionAnglePlayer) * CONSTANTS.PLAYER_BOUNCE_FORCE_FROM_BOSS;
                    }
                }
            }
            // If player is Aegis and ram is on cooldown, the boss script handles minor recoil,
            // and this callback isn't invoked with a type that causes player damage from body collision.
        },
        onPlayerMinionCollision: (minionThatHit) => {
            const cp = gameLogicGetPlayerFunc();
             if (cp && !cp.isShieldOvercharging && (!cp.teleporting || cp.teleportEffectTimer <= 0) && GameState.getPostDamageImmunityTimer() <= 0) {
                const dmgDealt = cp.takeDamage(minionThatHit.damage, 
                    { /* gameContext for takeDamage */ 
                        postPopupImmunityTimer: GameState.getPostPopupImmunityTimer(), postDamageImmunityTimer: GameState.getPostDamageImmunityTimer(), score: GameState.getScore(), updateHealthDisplayCallback:UIManager.updateHealthDisplay, endGameCallback:endGameInternal, updateScoreCallback: (amt) => { GameState.incrementScore(amt); UIManager.updateScoreDisplay(GameState.getScore()); if(gameContextForEventListeners.callbacks.checkForNewColorUnlock) gameContextForEventListeners.callbacks.checkForNewColorUnlock(); }, signalAchievementEvent: gameContextForEventListeners.callbacks.signalAchievementEvent, getBossManager: gameLogicGetBossManagerFunc
                    }, 
                    { screenShakeParams: gameLogicGetScreenShakeParamsFunc ? gameLogicGetScreenShakeParamsFunc() : {} });
                if (dmgDealt > 0) GameState.setPostDamageImmunityTimer(CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION);
            }
        },
        onPlayerBossAttackCollision: (attackData) => {
            const cp = gameLogicGetPlayerFunc();
             if (cp && !cp.isShieldOvercharging && (!cp.teleporting || cp.teleportEffectTimer <= 0) && GameState.getPostDamageImmunityTimer() <= 0) {
                const dmgDealt = cp.takeDamage(attackData.damage, 
                    { /* gameContext for takeDamage */ 
                        postPopupImmunityTimer: GameState.getPostPopupImmunityTimer(), postDamageImmunityTimer: GameState.getPostDamageImmunityTimer(), score: GameState.getScore(), updateHealthDisplayCallback:UIManager.updateHealthDisplay, endGameCallback:endGameInternal, updateScoreCallback: (amt) => { GameState.incrementScore(amt); UIManager.updateScoreDisplay(GameState.getScore()); if(gameContextForEventListeners.callbacks.checkForNewColorUnlock) gameContextForEventListeners.callbacks.checkForNewColorUnlock(); }, signalAchievementEvent: gameContextForEventListeners.callbacks.signalAchievementEvent, getBossManager: gameLogicGetBossManagerFunc
                    }, 
                    { screenShakeParams: gameLogicGetScreenShakeParamsFunc ? gameLogicGetScreenShakeParamsFunc() : {} });
                if (dmgDealt > 0) GameState.setPostDamageImmunityTimer(CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION);
            }
        },
        updateScore: (amount) => { GameState.incrementScore(amount); UIManager.updateScoreDisplay(GameState.getScore()); checkForNewColorUnlock(); AchievementManager.checkAllAchievements(getGameContextForAchievements()); },
        applyMusicPlayState: applyMusicPlayStateWrapper,
        checkEvolutionEligibility: (canTriggerWithoutLoot) => {
            const cp = gameLogicGetPlayerFunc();
            const currentEvoThreshold = lastEvolutionScore + (CONSTANTS.EVOLUTION_SCORE_INTERVAL * (cp ? cp.evolutionIntervalModifier : 1.0));
            if (cp && GameState.getScore() >= currentEvoThreshold) {
                if (canTriggerWithoutLoot) { triggerEvolutionInternal(true); return true; }
                else { GameState.setEvolutionPendingAfterBoss(true); return false; }
            } return false;
        },
        requestFirstBossLoot: (x,y) => { triggerFirstBossLootScreenInternal(); },
        nexusWeaverShootsOrbiterProjectile: (orbiterMinion, playerTarget) => {
            const allGameRays = gameLogicGetRaysFunc ? gameLogicGetRaysFunc() : [];
            if (!orbiterMinion || !playerTarget || !allGameRays) return;
            let proj = getPooledRay();
            if (proj) {
                const angleToPlayer = Math.atan2(playerTarget.y - orbiterMinion.y, playerTarget.x - orbiterMinion.x);
                const speedMultiplier = CONSTANTS.ORBITER_PROJECTILE_SPEED / CONSTANTS.BASE_RAY_SPEED;
                proj.reset(orbiterMinion.x, orbiterMinion.y, CONSTANTS.ORBITER_PROJECTILE_COLOR, Math.cos(angleToPlayer), Math.sin(angleToPlayer), speedMultiplier, null, CONSTANTS.ORBITER_PROJECTILE_LIFETIME, true, false, CONSTANTS.ORBITER_PROJECTILE_RADIUS, false );
                proj.damageValue = CONSTANTS.ORBITER_PROJECTILE_DAMAGE; allGameRays.push(proj);
            }
        },
        hasNexusWeaverTierTimeBeenRecordedThisRun: GameState.hasNexusWeaverTierTimeBeenRecordedThisRun,
        markNexusWeaverTierTimeRecordedThisRun: GameState.recordNexusWeaverTiersDefeatedThisRun,
        getGameplayTimeElapsed: GameState.getGameplayTimeElapsed,
        createStatsSnapshotForBossKill: (playerInst, currentOverallBossTiers) => {
            return createFinalStatsSnapshot(playerInst, currentOverallBossTiers, LootManager.getBossLootPoolReference(), LootManager);
        },
        getSpecificHighScores: (category) => {
            const allScores = getHighScores();
            return allScores[category] || [];
        },
        recordBossKillTime: (category, nameFromBossManager, time, stats, runIdToUse) => {
            addHighScore(category, nameFromBossManager, time, stats, runIdToUse);
            UIManager.updateAllHighScoreDisplays(getHighScores());
        },
        playSound: playSound,
        CONSTANTS: CONSTANTS,
        signalAchievementEvent: (eventName, eventData = {}) => {
            eventFlagsForAchievements[eventName] = true;
            if (eventData && Object.keys(eventData).length > 0) {
                eventFlagsForAchievements[eventName + "_data"] = eventData;
            }
            // Per-frame check now handles this, so this call is less critical but harmless.
            AchievementManager.checkAllAchievements(getGameContextForAchievements());
        }
    }
};

const audioDomElementsForInit = {
    bgMusic: document.getElementById('bgMusic'), soundToggleButton: document.getElementById('soundToggleButton'),
    musicVolumeSlider: document.getElementById('musicVolumeSlider'), musicVolumeValue: document.getElementById('musicVolumeValue'),
    shootVolumeSlider: document.getElementById('shootVolumeSlider'), shootVolumeValue: document.getElementById('shootVolumeValue'),
    hitVolumeSlider: document.getElementById('hitVolumeSlider'), hitVolumeValue: document.getElementById('hitVolumeValue'),
    pickupVolumeSlider: document.getElementById('pickupVolumeSlider'), pickupVolumeValue: document.getElementById('pickupVolumeValue'),
    uiVolumeSlider: document.getElementById('uiVolumeSlider'), uiVolumeValue: document.getElementById('uiVolumeValue'),
};

initializeAudio(audioDomElementsForInit);

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const gameLogicModule = await import('./gameLogic.js');
        initializeGameLogicFunc = gameLogicModule.initializeGameLogic;
        gameLogicUpdateFunc = gameLogicModule.updateGame;
        gameLogicDrawFunc = gameLogicModule.drawGame;
        resetGameLogicStateFunc = gameLogicModule.resetGameLogicState;
        gameLogicGetPlayerFunc = gameLogicModule.getPlayerInstance;
        gameLogicGetActiveBuffsFunc = gameLogicModule.getActiveBuffNotificationsArray;
        gameLogicGetRaysFunc = gameLogicModule.getRays;
        gameLogicGetDecoysFunc = gameLogicModule.getDecoys;
        gameLogicGetBossDefeatEffectsFunc = gameLogicModule.getBossDefeatEffects;
        gameLogicGetBossManagerFunc = gameLogicModule.getBossManagerInstance;
        gameLogicGetLootDropsFunc = gameLogicModule.getLootDrops;
        getAbilityContextForPlayerFuncFromGameLogic = gameLogicModule.getAbilityContextForPlayerLogic;
        gameLogicGetScreenShakeParamsFunc = gameLogicModule.getScreenShakeParams;
        gameLogicUpdateCanvasDimensionsFunc = gameLogicModule.updateCanvasDimensionsLogic;

    } catch (e) {
        document.body.innerHTML = `<div style="color: white; text-align: center; padding-top: 50px;"><h1>Error Loading Game</h1><p>Could not load critical game components. Please check the console for details.</p></div>`;
        return;
    }
    AchievementManager.initializeAchievements();

    setupEventListeners(gameCanvasElement, gameContextForEventListeners);
    // <<< MODIFIED: Pass the achievement checker to the game loop initializer >>>
    initGameLoop(
        GameState.isGameOver, 
        GameState.isGameRunning, 
        GameState.isAnyPauseActive,
        () => AchievementManager.checkAllAchievements(getGameContextForAchievements()) // The new callback
    );
    setCanvasDimensions();

    const viewHighScoresBtn = document.getElementById('viewHighScoresButton');
    if (viewHighScoresBtn) {
        const newBtn = viewHighScoresBtn.cloneNode(true);
        viewHighScoresBtn.parentNode.replaceChild(newBtn, viewHighScoresBtn);
        newBtn.addEventListener('click', () => gameContextForEventListeners.callbacks.viewDetailedHighScores());
    }

    const viewAchievementsBtn = document.getElementById('viewAchievementsButton');
    if (viewAchievementsBtn && gameContextForEventListeners.callbacks.viewAchievements) {
        viewAchievementsBtn.addEventListener('click', gameContextForEventListeners.callbacks.viewAchievements);
    }

    const backButtonAchievements = document.getElementById('backToMainMenuFromAchievementsButton');
    if (backButtonAchievements && gameContextForEventListeners.callbacks.goBackFromAchievements) {
        backButtonAchievements.addEventListener('click', gameContextForEventListeners.callbacks.goBackFromAchievements);
    }


    showStartScreenWithUpdatesInternal();
});