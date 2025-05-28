// js/gameState.js
import * as CONSTANTS from './constants.js'; // Import constants if needed for initial values

// --- Core Game State Variables ---
let score = 0;
let gameOver = false;
let gameRunning = false;

let gamePausedForEvolution = false;
let gamePausedForFreeUpgrade = false;
let gamePausedByEsc = false;
let gamePausedForLootChoice = false;
let isCountingDownToResume = false;

let gameplayTimeElapsed = 0;
let shootIntervalUpdateTimer = 0; // For timing when to recalculate shoot interval

let currentSurvivalPointsInterval = CONSTANTS.BASE_SURVIVAL_POINTS_INTERVAL;
let survivalPointsTimer = 0;
let survivalScoreThisCycle = 0;
let survivalUpgrades = 0;

let currentEffectiveDefaultGrowthFactor = CONSTANTS.DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR;
let currentPlayerRadiusGrowthFactor = CONSTANTS.DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR;
let currentRaySpeedMultiplier = 1.0;

let currentRayColors = []; // Initialized in gameState.reset
let nextColorUnlockScore = CONSTANTS.NEW_COLOR_UNLOCK_INTERVAL;
let nextUnlockableColorIndex = 0;

let currentRayMaxLifetime = CONSTANTS.BASE_RAY_MAX_LIFETIME;
let currentShootInterval = CONSTANTS.BASE_RAY_SHOOT_INTERVAL;
let lastSetShootInterval = CONSTANTS.BASE_RAY_SHOOT_INTERVAL;

let postPopupImmunityTimer = 0;
let postDamageImmunityTimer = 0;

let firstBossDefeatedThisRun = false;
let evolutionPendingAfterBoss = false;
let shrinkMeCooldown = 0;

// Interval IDs
let shootIntervalId = null;
let targetSpawnIntervalId = null;
let heartSpawnIntervalId = null;
let bonusPointSpawnIntervalId = null;
let resumeCountdownTimerId = null;

// Ray Colors State
let ALL_POSSIBLE_RAY_COLORS = []; // Will be initialized

// --- NEW: Boss Kill Time Tracking for Current Run ---
let nexusWeaverTiersDefeatedThisRun = {};


// --- Getter and Setter Functions ---

// Score
export const getScore = () => score;
export const setScore = (value) => { score = value; };
export const incrementScore = (amount) => { score += amount; };

// Game Over
export const isGameOver = () => gameOver;
export const setGameOver = (value) => { gameOver = value; };

// Game Running
export const isGameRunning = () => gameRunning;
export const setGameRunning = (value) => { gameRunning = value; };

// Pause States
export const isGamePausedForEvolution = () => gamePausedForEvolution;
export const setGamePausedForEvolution = (value) => { gamePausedForEvolution = value; };

export const isGamePausedForFreeUpgrade = () => gamePausedForFreeUpgrade;
export const setGamePausedForFreeUpgrade = (value) => { gamePausedForFreeUpgrade = value; };

export const isGamePausedByEsc = () => gamePausedByEsc;
export const setGamePausedByEsc = (value) => { gamePausedByEsc = value; };

export const isGamePausedForLootChoice = () => gamePausedForLootChoice;
export const setGamePausedForLootChoice = (value) => { gamePausedForLootChoice = value; };

export const getIsCountingDownToResume = () => isCountingDownToResume;
export const setIsCountingDownToResume = (value) => { isCountingDownToResume = value; };

// Gameplay Time
export const getGameplayTimeElapsed = () => gameplayTimeElapsed;
export const setGameplayTimeElapsed = (value) => { gameplayTimeElapsed = value; };
export const incrementGameplayTimeElapsed = (amount) => { gameplayTimeElapsed += amount; };

// Shoot Interval Timer
export const getShootIntervalUpdateTimer = () => shootIntervalUpdateTimer;
export const setShootIntervalUpdateTimer = (value) => { shootIntervalUpdateTimer = value; };
export const incrementShootIntervalUpdateTimer = (amount) => { shootIntervalUpdateTimer += amount; };

// Survival Points
export const getCurrentSurvivalPointsInterval = () => currentSurvivalPointsInterval;
export const setCurrentSurvivalPointsInterval = (value) => { currentSurvivalPointsInterval = value; };

export const getSurvivalPointsTimer = () => survivalPointsTimer;
export const setSurvivalPointsTimer = (value) => { survivalPointsTimer = value; };
export const incrementSurvivalPointsTimer = (amount) => { survivalPointsTimer += amount; };

export const getSurvivalScoreThisCycle = () => survivalScoreThisCycle;
export const setSurvivalScoreThisCycle = (value) => { survivalScoreThisCycle = value; };
export const incrementSurvivalScoreThisCycle = (amount) => { survivalScoreThisCycle += amount; };

export const getSurvivalUpgrades = () => survivalUpgrades;
export const setSurvivalUpgrades = (value) => { survivalUpgrades = value; };
export const incrementSurvivalUpgrades = () => { survivalUpgrades++; };

// Growth Factors
export const getCurrentEffectiveDefaultGrowthFactor = () => currentEffectiveDefaultGrowthFactor;
export const setCurrentEffectiveDefaultGrowthFactor = (value) => { currentEffectiveDefaultGrowthFactor = value; };

export const getCurrentPlayerRadiusGrowthFactor = () => currentPlayerRadiusGrowthFactor;
export const setCurrentPlayerRadiusGrowthFactor = (value) => { currentPlayerRadiusGrowthFactor = value; };

// Ray Speed
export const getCurrentRaySpeedMultiplier = () => currentRaySpeedMultiplier;
export const setCurrentRaySpeedMultiplier = (value) => { currentRaySpeedMultiplier = value; };

// Ray Colors (current in play)
export const getCurrentRayColors = () => currentRayColors;
export const setCurrentRayColors = (colors) => { currentRayColors = [...colors]; };
export const addCurrentRayColor = (color) => { if (!currentRayColors.includes(color)) currentRayColors.push(color); };

export const getNextColorUnlockScore = () => nextColorUnlockScore;
export const setNextColorUnlockScore = (value) => { nextColorUnlockScore = value; };

export const getNextUnlockableColorIndex = () => nextUnlockableColorIndex;
export const setNextUnlockableColorIndex = (value) => { nextUnlockableColorIndex = value; };
export const incrementNextUnlockableColorIndex = () => { nextUnlockableColorIndex++; };

// All Possible Ray Colors (master list)
export const getAllPossibleRayColors = () => ALL_POSSIBLE_RAY_COLORS;
// No direct setter for ALL_POSSIBLE_RAY_COLORS, it's initialized internally.

// Ray Lifetime
export const getCurrentRayMaxLifetime = () => currentRayMaxLifetime;
export const setCurrentRayMaxLifetime = (value) => { currentRayMaxLifetime = value; };

// Shoot Interval
export const getCurrentShootInterval = () => currentShootInterval;
export const setCurrentShootInterval = (value) => { currentShootInterval = value; };

export const getLastSetShootInterval = () => lastSetShootInterval;
export const setLastSetShootInterval = (value) => { lastSetShootInterval = value; };

// Immunity Timers
export const getPostPopupImmunityTimer = () => postPopupImmunityTimer;
export const setPostPopupImmunityTimer = (value) => { postPopupImmunityTimer = value; };
export const decrementPostPopupImmunityTimer = (amount) => { postPopupImmunityTimer = Math.max(0, postPopupImmunityTimer - amount); };

export const getPostDamageImmunityTimer = () => postDamageImmunityTimer;
export const setPostDamageImmunityTimer = (value) => { postDamageImmunityTimer = value; };
export const decrementPostDamageImmunityTimer = (amount) => { postDamageImmunityTimer = Math.max(0, postDamageImmunityTimer - amount); };

// Boss/Evolution Flow
export const isFirstBossDefeatedThisRun = () => firstBossDefeatedThisRun;
export const setFirstBossDefeatedThisRun = (value) => { firstBossDefeatedThisRun = value; };

export const isEvolutionPendingAfterBoss = () => evolutionPendingAfterBoss;
export const setEvolutionPendingAfterBoss = (value) => { evolutionPendingAfterBoss = value; };

export const getShrinkMeCooldown = () => shrinkMeCooldown;
export const setShrinkMeCooldown = (value) => { shrinkMeCooldown = value; };
export const decrementShrinkMeCooldown = () => { if (shrinkMeCooldown > 0) shrinkMeCooldown--; };

// Interval IDs
export const getShootIntervalId = () => shootIntervalId;
export const setShootIntervalId = (id) => { shootIntervalId = id; };

export const getTargetSpawnIntervalId = () => targetSpawnIntervalId;
export const setTargetSpawnIntervalId = (id) => { targetSpawnIntervalId = id; };

export const getHeartSpawnIntervalId = () => heartSpawnIntervalId;
export const setHeartSpawnIntervalId = (id) => { heartSpawnIntervalId = id; };

export const getBonusPointSpawnIntervalId = () => bonusPointSpawnIntervalId;
export const setBonusPointSpawnIntervalId = (id) => { bonusPointSpawnIntervalId = id; };

export const getResumeCountdownTimerId = () => resumeCountdownTimerId;
export const setResumeCountdownTimerId = (id) => { resumeCountdownTimerId = id; };

// --- NEW: Boss Kill Time Tracking Getters/Setters ---
export const hasNexusWeaverTierTimeBeenRecordedThisRun = (tier) => nexusWeaverTiersDefeatedThisRun[tier] === true;
export const recordNexusWeaverTierTimeThisRun = (tier) => { nexusWeaverTiersDefeatedThisRun[tier] = true; };
export const resetNexusWeaverTiersDefeatedThisRun = () => { nexusWeaverTiersDefeatedThisRun = {}; };


// --- Helper for Ray Color Initialization ---
function initializeAllPossibleRayColorsInternal() {
    if (CONSTANTS.INITIAL_RAY_COLORS && CONSTANTS.UNLOCKABLE_RAY_COLORS_LIST) {
        ALL_POSSIBLE_RAY_COLORS = [...CONSTANTS.INITIAL_RAY_COLORS, ...CONSTANTS.UNLOCKABLE_RAY_COLORS_LIST];
    } else {
        console.error("ERROR: Ray color constants not available in gameState.js!");
        ALL_POSSIBLE_RAY_COLORS = [];
    }
}

// --- Composite State Functions ---
export function isAnyPauseActive() {
    return gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedByEsc || isCountingDownToResume || gamePausedForLootChoice;
}

export function isAnyPauseActiveExceptEsc() {
    return gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedForLootChoice || isCountingDownToResume;
}

// --- Reset Function ---
export function resetCoreGameState() {
    setScore(0);
    setGameOver(false);
    setGameRunning(false);

    setGamePausedForEvolution(false);
    setGamePausedForFreeUpgrade(false);
    setGamePausedByEsc(false);
    setGamePausedForLootChoice(false);
    setIsCountingDownToResume(false);

    setGameplayTimeElapsed(0);
    setShootIntervalUpdateTimer(0);

    setCurrentSurvivalPointsInterval(CONSTANTS.BASE_SURVIVAL_POINTS_INTERVAL);
    setSurvivalPointsTimer(0);
    setSurvivalScoreThisCycle(0);
    setSurvivalUpgrades(0);

    setCurrentEffectiveDefaultGrowthFactor(CONSTANTS.DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR);
    setCurrentPlayerRadiusGrowthFactor(CONSTANTS.DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR);
    setCurrentRaySpeedMultiplier(1.0);

    initializeAllPossibleRayColorsInternal(); 

    setCurrentRayColors([...CONSTANTS.INITIAL_RAY_COLORS]);
    setNextColorUnlockScore(CONSTANTS.NEW_COLOR_UNLOCK_INTERVAL);
    setNextUnlockableColorIndex(0);

    setCurrentRayMaxLifetime(CONSTANTS.BASE_RAY_MAX_LIFETIME);
    setCurrentShootInterval(CONSTANTS.BASE_RAY_SHOOT_INTERVAL);
    setLastSetShootInterval(CONSTANTS.BASE_RAY_SHOOT_INTERVAL);

    setPostPopupImmunityTimer(0);
    setPostDamageImmunityTimer(0);

    setFirstBossDefeatedThisRun(false);
    setEvolutionPendingAfterBoss(false);
    setShrinkMeCooldown(0);

    resetNexusWeaverTiersDefeatedThisRun(); // <<< ADDED: Reset this for the new run

    if (getShootIntervalId()) clearInterval(getShootIntervalId());
    setShootIntervalId(null);
    if (getTargetSpawnIntervalId()) clearInterval(getTargetSpawnIntervalId());
    setTargetSpawnIntervalId(null);
    if (getHeartSpawnIntervalId()) clearInterval(getHeartSpawnIntervalId());
    setHeartSpawnIntervalId(null);
    if (getBonusPointSpawnIntervalId()) clearInterval(getBonusPointSpawnIntervalId());
    setBonusPointSpawnIntervalId(null);
    if (getResumeCountdownTimerId()) clearInterval(getResumeCountdownTimerId());
    setResumeCountdownTimerId(null);
}