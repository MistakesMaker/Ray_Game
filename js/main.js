// js/main.js

// --- Module Imports ---
import * as CONSTANTS from './constants.js'; 
import { initializeRayPool, getPooledRay, checkCollision, getReadableColorName as getReadableColorNameFromUtils, isLineSegmentIntersectingCircle, hexToRgb, lightenColor } from './utils.js';
import {
    initializeAudio, playSound, stopSound, toggleSoundEnabled, applyMusicPlayState,
    updateMusicVolume, updateSpecificSfxVolume,
    newColorSound, gameOverSoundFX, lootPickupSound, shootSound, evolutionSound, upgradeSound,
    heartSound, bonusPickupSound, screenShakeSound, playerHitSound, targetHitSound,
    chainReactionSound, bossHitSound, omegaLaserSound, shieldOverchargeSound,
    playerWellDeploySound, playerWellDetonateSound, teleportSound, empBurstSound,
    gravityWellChargeSound, gravityWellExplodeSound,
    chaserSpawnSound as audioChaserSpawnSound,
    reflectorSpawnSound as audioReflectorSpawnSound,
    singularitySpawnSound as audioSingularitySpawnSound,
} from './audio.js';
import { 
    canvas as gameCanvasElement,
    scoreDisplayElem, healthDisplayElem, highScoreListDisplay, startScreenHighScoresDiv,
    startScreen, settingsScreen, gameOverScreen, evolutionScreen, evolutionOptionsContainer,
    freeUpgradeScreen, freeUpgradeOptionContainer, closeFreeUpgradeButton,
    lootChoiceScreen, lootOptionsContainer, abilityCooldownUI, evolutionTooltip,
    countdownOverlay, pauseScreen, pausePlayerStatsPanel,
    detailedHighScoresScreen, kineticChargeUIElement, 
    updateScoreDisplay, updateHealthDisplay as uiUpdateHealthDisplay,
    updateBuffIndicator as uiUpdateBuffIndicator,
    updateSurvivalBonusIndicator as uiUpdateSurvivalBonusIndicator,
    updateActiveBuffIndicator as uiUpdateActiveBuffIndicator,
    displayHighScores,
    updateAbilityCooldownUI as uiUpdateAbilityCooldownUI,
    updateKineticChargeUI, 
    showScreen, getPreviousScreenForSettings, setPreviousScreenForSettings,
    populateEvolutionOptionsUI, displayGameOverScreenContent,
    updatePauseScreenStatsDisplay, 
    populateFreeUpgradeOptionUI, populateLootOptionsUI,
    uiHighScoreContainer,
    displayDetailedHighScoresScreenUI
} from './ui.js';
import { setupEventListeners } from './eventListeners.js';
import { Player } from './player.js';
import { Ray, PlayerGravityWell } from './ray.js';
import { Target, Heart, BonusPoint, LootDrop } from './entities.js';
import { BossManager } from './bossManager.js';
import { GravityWellBoss } from './gravityWellBoss.js';
import { MirrorShieldBoss } from './mirrorShieldBoss.js';


// --- Canvas and Context ---
const canvas = gameCanvasElement;
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


// --- Core Game State Variables ---
let player = null;
let rays = []; let targets = []; let hearts = []; let bonusPoints = [];
let lootDrops = []; 
let decoys = []; let bossManager = null;
let bossDefeatEffects = [];
let score = 0; let gameOver = false; let gameRunning = false;
let gamePausedForEvolution = false; let gamePausedForFreeUpgrade = false;
let gamePausedByEsc = false; let gamePausedForLootChoice = false;
let isCountingDownToResume = false;
let animationFrameId = null;
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;
let lastTime = 0;
let lastEvolutionScore = 0; let evolutionPendingAfterBoss = false; let shrinkMeCooldown = 0;
let gameplayTimeElapsed = 0; let shootIntervalUpdateTimer = 0;
let currentSurvivalPointsInterval = CONSTANTS.BASE_SURVIVAL_POINTS_INTERVAL;
let survivalPointsTimer = 0; let survivalScoreThisCycle = 0; let survivalUpgrades = 0;
let currentEffectiveDefaultGrowthFactor = CONSTANTS.DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR;
let currentPlayerRadiusGrowthFactor = CONSTANTS.DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR;
let currentRaySpeedMultiplier = 1.0;
let ALL_POSSIBLE_RAY_COLORS = [];
let currentRayColors = [];
let nextColorUnlockScore = CONSTANTS.NEW_COLOR_UNLOCK_INTERVAL;
let nextUnlockableColorIndex = 0;
let _currentRayMaxLifetime = CONSTANTS.BASE_RAY_MAX_LIFETIME;
let currentShootInterval = CONSTANTS.BASE_RAY_SHOOT_INTERVAL;
let lastSetShootInterval = CONSTANTS.BASE_RAY_SHOOT_INTERVAL;
let isScreenShaking = false; let screenShakeTimer = 0; let currentShakeMagnitude = 0;
let currentShakeType = null; let shakeDecayFactor = CONSTANTS.SHAKE_DECAY_FACTOR_BASE;
let hitShakeDx = 0; let hitShakeDy = 0;
let shootIntervalId = null; let targetSpawnIntervalId = null;
let heartSpawnIntervalId = null; let bonusPointSpawnIntervalId = null;
let resumeCountdownTimerId = null;
let activeBuffNotifications = [];
let postPopupImmunityTimer = 0; let postDamageImmunityTimer = 0;
const HIGH_SCORES_KEY = 'lightBlasterOmegaHighScoresII_Modular_Detailed';
const inputState = {
    keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false },
    mouseX: canvas.width / 2,
    mouseY: canvas.height / 2,
};
let evolutionChoices = [];
let bossLootPool = [];
let freeUpgradeChoicesData = [];
let currentActiveScreenElement = null;
let firstBossDefeatedThisRun = false; 


// --- Helper Functions & Initialization Data Logic ---
function getHighScores() { const scoresJson = localStorage.getItem(HIGH_SCORES_KEY); return scoresJson ? JSON.parse(scoresJson) : []; }
function addHighScore(name, scoreValue, finalStatsSnapshot) {
    const scores = getHighScores();
    const newScoreEntry = { name: name, score: scoreValue, timestamp: Date.now(), stats: finalStatsSnapshot };
    scores.push(newScoreEntry);
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 10);
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(topScores));
    return topScores;
}
function updateAllHighScoreDisplays() { const currentHighScores = getHighScores(); if (highScoreListDisplay) displayHighScores(highScoreListDisplay, currentHighScores.slice(0,5)); if (startScreenHighScoresDiv) displayHighScores(startScreenHighScoresDiv, currentHighScores.slice(0,5)); }
function initializeAllPossibleRayColors() { if (CONSTANTS.INITIAL_RAY_COLORS && CONSTANTS.UNLOCKABLE_RAY_COLORS_LIST) { ALL_POSSIBLE_RAY_COLORS = [...CONSTANTS.INITIAL_RAY_COLORS, ...CONSTANTS.UNLOCKABLE_RAY_COLORS_LIST]; } else { console.error("ERROR: Ray color constants not available!"); ALL_POSSIBLE_RAY_COLORS = []; }}

function pausePickupSpawners() {
    if (targetSpawnIntervalId) clearInterval(targetSpawnIntervalId); targetSpawnIntervalId = null;
    if (heartSpawnIntervalId) clearInterval(heartSpawnIntervalId); heartSpawnIntervalId = null;
    if (bonusPointSpawnIntervalId) clearInterval(bonusPointSpawnIntervalId); bonusPointSpawnIntervalId = null;
}

function pauseAllGameIntervals() {
    if (shootIntervalId) clearInterval(shootIntervalId); shootIntervalId = null;
    pausePickupSpawners();
}

function resumePickupSpawners() {
    if (gameRunning && !isAnyPauseActiveInternal() && !gameOver) {
        if (!bossManager || !bossManager.isBossSequenceActive()) {
            if (!targetSpawnIntervalId) targetSpawnIntervalId = setInterval(spawnTarget, CONSTANTS.TARGET_SPAWN_INTERVAL_MS);
            if (!heartSpawnIntervalId) heartSpawnIntervalId = setInterval(spawnHeart, CONSTANTS.HEART_SPAWN_INTERVAL_MS);
            if (!bonusPointSpawnIntervalId) bonusPointSpawnIntervalId = setInterval(spawnBonusPointObject, CONSTANTS.BONUS_POINT_SPAWN_INTERVAL_MS);
        }
    }
}

function resumeAllGameIntervals() {
    if (gameRunning && !isAnyPauseActiveInternal() && !gameOver) {
        resumePickupSpawners();
        if (!shootIntervalId && player) {
            updateShootInterval();
        }
    }
}

function initEvolutionChoicesInternal() {
    evolutionChoices = [
        {id:'colorImmunity', classType: 'tank', text:"Chameleon Plating", level:0, maxLevel: ALL_POSSIBLE_RAY_COLORS.length - CONSTANTS.INITIAL_RAY_COLORS.length, detailedDescription: "Gain immunity to a new random ray color each time this is chosen. Protects against rays of that specific color.", isMaxed:function(p){return !p||p.immuneColorsList.length>=ALL_POSSIBLE_RAY_COLORS.length || this.level >= this.maxLevel;}, apply:function(){if(!player)return"";const a=ALL_POSSIBLE_RAY_COLORS.filter(c=>!player.immuneColorsList.includes(c));if(a.length>0){const r=a[Math.floor(Math.random()*a.length)];player.immuneColorsList.push(r);uiUpdateBuffIndicator(player.immuneColorsList, getReadableColorNameFromUtils); this.level++; return`Now immune to <span style="color:${r};text-shadow:0 0 3px black;font-weight:bold;">${getReadableColorNameFromUtils(r)}</span> rays!`;}return"No new colors left!";}, getEffectString: function() { return `Immune to ${player?player.immuneColorsList.length:0} colors`;}},
        {
            id: 'smallerPlayer',
            classType: 'tank',
            text: "Evasive Maneuver",
            level: 0,
            detailedDescription: "Your effective size from score gain is halved! Growth from score is paused for this evolution cycle. Resumes normally afterwards.",
            isMaxed: function(p) {
                if (!p) return true;
                return shrinkMeCooldown > 0;
            },
            apply: function() {
                if (!player) return "";
                let effectiveScoreBeforeThisPick = Math.max(0, score - player.scoreOffsetForSizing);
                let currentScoreBasedSize = effectiveScoreBeforeThisPick * currentEffectiveDefaultGrowthFactor;
                let halvedNewScoreBasedSize = currentScoreBasedSize / 2;
                player.scoreBasedSize = halvedNewScoreBasedSize;
                if (currentEffectiveDefaultGrowthFactor > 0) {
                    let newEffectiveScoreToAchieveHalvedSize = halvedNewScoreBasedSize / currentEffectiveDefaultGrowthFactor;
                    newEffectiveScoreToAchieveHalvedSize = Math.max(0, newEffectiveScoreToAchieveHalvedSize);
                    let scoreValueToDiscard = effectiveScoreBeforeThisPick - newEffectiveScoreToAchieveHalvedSize;
                    player.scoreOffsetForSizing += scoreValueToDiscard;
                    player.scoreOffsetForSizing = Math.max(0, player.scoreOffsetForSizing);
                }
                currentPlayerRadiusGrowthFactor = 0;
                player.baseRadius = player.initialBaseRadius + player.bonusBaseRadius;
                player.radius = player.baseRadius + player.scoreBasedSize;
                player.radius = Math.max(CONSTANTS.MIN_PLAYER_BASE_RADIUS, player.radius);
                shrinkMeCooldown = 3;
                this.level++;
                return `Effective size reduced! Growth paused this cycle. (Cooldown: ${shrinkMeCooldown} evos)`;
            },
            getEffectString: function() { return `Effective size reduced (this cycle)!`; }
        },
        {
            id:'reinforcedHull', 
            classType: 'tank', 
            text:"Reinforced Hull", 
            level:0, 
            maxLevel: 999, 
            detailedDescription: `Each level reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_EFFECTIVENESS_PER_LEVEL*100}%. Diminishing returns apply.`, 
            isMaxed: function(p){ 
                return p && p.damageTakenMultiplier < 0.01; 
            }, 
            apply:function(){
                if(!player) return ""; 
                player.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_EFFECTIVENESS_PER_LEVEL);
                player.damageTakenMultiplier = Math.max(0.001, player.damageTakenMultiplier); 
                this.level++; 
                const currentReductionPercent = (1 - player.damageTakenMultiplier) * 100;
                return `Total damage reduction now ${currentReductionPercent.toFixed(1)}%!`;
            }, 
            getEffectString: function() { 
                const reductionPercent = player ? (1 - player.damageTakenMultiplier) * 100 : 0;
                return `${reductionPercent.toFixed(1)}% Dmg Reduction`;
            }
        },
        {id:'vitalitySurge', classType: 'tank', text:"Vitality Surge", level:0, maxLevel: 999, detailedDescription: `Increases passive health regeneration by ${CONSTANTS.HP_REGEN_BONUS_PER_LEVEL_EVOLUTION} HP per tick.`, isMaxed:function(p){return false;}, apply:function(){if(!player) return""; player.hpRegenBonusFromEvolution += CONSTANTS.HP_REGEN_BONUS_PER_LEVEL_EVOLUTION; this.level++; return `Passive HP regen now +${player.hpRegenBonusFromEvolution} HP per tick!`;}, getEffectString: function() { return `+${player?player.hpRegenBonusFromEvolution:0} HP/tick Regen`;}},
        {
            id: 'kineticConversion',
            classType: 'utility',
            text: "Kinetic Conversion",
            level: 0, 
            maxLevel: 999,
            detailedDescription: "Sustained high-speed movement builds Kinetic Charge (up to 100). Using Omega Laser or launching Mini Gravity Well rays consumes Charge to boost their damage for that use (starts at +30% damage at full charge, +20% more max damage per evolution level). Each level also increases Charge generation rate.",
            isMaxed: function(p) { return false; }, 
            apply: function() {
                if (!player) return "";
                player.kineticConversionLevel = (player.kineticConversionLevel || 0) + 1;
                this.level = player.kineticConversionLevel; 
                let maxPotencyBonusAtFullCharge = 0; 
                if (player.kineticConversionLevel > 0) {
                     maxPotencyBonusAtFullCharge = player.initialKineticDamageBonus + (Math.max(0, player.kineticConversionLevel - 1) * player.additionalKineticDamageBonusPerLevel);
                }
                if (kineticChargeUIElement) { 
                    updateKineticChargeUI(player.kineticCharge, player.kineticChargeConsumption, maxPotencyBonusAtFullCharge, true);
                }
                const currentMaxPotencyBonusForReturnString = player.initialKineticDamageBonus + (Math.max(0, player.kineticConversionLevel - 1) * player.additionalKineticDamageBonusPerLevel);
                return `Kinetic Conversion Lvl ${player.kineticConversionLevel}! Max Dmg Boost: +${(currentMaxPotencyBonusForReturnString * 100).toFixed(0)}%`;
            },
            getEffectString: function() {
                if (!player) return "Charge Rate/Potency Up";
                const evoLevelOnPlayer = player.kineticConversionLevel || 0;
                let maxPotencyBonus = 0;
                 if (evoLevelOnPlayer > 0) { 
                    maxPotencyBonus = player.initialKineticDamageBonus + (Math.max(0, evoLevelOnPlayer - 1) * player.additionalKineticDamageBonusPerLevel);
                }
                const chargeRate = player.baseKineticChargeRate + (evoLevelOnPlayer * player.kineticChargeRatePerLevel);
                return `Max Dmg: +${(maxPotencyBonus * 100).toFixed(0)}%, Rate: ${chargeRate.toFixed(2)}/s`;
            }
        },
        {
            id:'systemOvercharge', 
            classType: 'utility', 
            text:"System Overcharge", 
            level:0, 
            maxLevel: 1, 
            detailedDescription: "Reduces the score needed between evolutions by a massive 30% (one-time upgrade).", 
            isMaxed: function(p){ 
                return (p && p.evolutionIntervalModifier <= 0.70) || this.level >= this.maxLevel;
            }, 
            apply: function(){
                if(!player) return""; 
                player.evolutionIntervalModifier = 0.70; 
                this.level++; 
                return `Evolution interval permanently reduced by 30%! (Now 70%)`;
            }, 
            getEffectString: function() { 
                return `Evo Interval: ${ (player && player.evolutionIntervalModifier <= 0.70) ? '70%' : '100%' }`;
            }
        },
        {
            id: 'temporalEcho',
            classType: 'utility',
            text: "Temporal Echo",
            level: 0,
            maxLevel: 999,
            detailedDescription: "When you use an ability (numbered or mouse-based), there's a [10]% chance per level for ALL other abilities on cooldown to have their remaining cooldown reduced by 2 seconds. Caps at 100% chance.",
            isMaxed: function(p) {
                if (!p) return true;
                return p.temporalEchoChance >= 1.0;
            },
            apply: function() {
                if (!player) return "";
                player.temporalEchoChance = Math.min(1.0, parseFloat((player.temporalEchoChance + 0.10).toFixed(2)));
                this.level++;
                return `Temporal Echo: Now ${Math.round(player.temporalEchoChance * 100)}% chance to reduce other ability cooldowns!`;
            },
            getEffectString: function() { return `Cooldown Echo: ${Math.round((player ? player.temporalEchoChance : 0) * 100)}%`; }
        },
        {id:'focusedBeam', classType: 'attack', text:"Focused Beam", level:0, maxLevel: 999 , detailedDescription: "Increases the damage of your rays by +1 per level.", isMaxed:function(p){return false;}, apply:function(){if(!player) return""; player.rayDamageBonus++; this.level++; return `Ray damage now +${player.rayDamageBonus}!`;}, getEffectString: function() { return `+${player?player.rayDamageBonus:0} Ray Damage`;}},
        {
            id: 'unstableCore',
            classType: 'attack',
            text: "Unstable Core",
            level: 0,
            maxLevel: 20,
            detailedDescription: `Gives your rays a 5% chance per level to cause an AOE explosion on hit. Caps at 100%.`,
            isMaxed: function(p) {
                if (!p) return true;
                return p.chainReactionChance >= 1.0;
            },
            apply: function() {
                if (!player) return "";
                player.chainReactionChance = Math.min(1.0, player.chainReactionChance + 0.05);
                this.level++;
                return `Unstable Core: ${Math.round(player.chainReactionChance * 100)}% chance for AOE on hit!`;
            },
            getEffectString: function() { return `${Math.round((player ? player.chainReactionChance : 0) * 100)}% AOE Chance`; }
        },
        {
            id: 'abilityPotency',
            classType: 'attack',
            text: "Empowered Abilities",
            level: 0,
            maxLevel: 999,
            detailedDescription: "Increases the damage of your Omega Laser and launched Mini Gravity Well rays by 10% (multiplicative).",
            isMaxed: function(p) { return false; },
            apply: function() {
                if (!player) return "";
                player.abilityDamageMultiplier = parseFloat((player.abilityDamageMultiplier * 1.1).toFixed(3));
                this.level++;
                return `Ability damage now ${Math.round(player.abilityDamageMultiplier * 100)}% of base!`;
            },
            getEffectString: function() { return `Ability Dmg: ${Math.round((player ? player.abilityDamageMultiplier : 1) * 100)}%`; }
        },
        {
            id: 'maxHpIncrease', classType: 'tank', text: "Fortified Core", level: 0, maxLevel: 999,
            detailedDescription: "Permanently increases your Maximum HP by 10.",
            isMaxed: function(p) { return false; },
            apply: function() {
                if (!player) return "";
                player.maxHp += 10;
                player.gainHealth(10, (hp, maxHp) => uiUpdateHealthDisplay(hp,maxHp));
                this.level++;
                return `Maximum HP increased by 10! (Now ${player.maxHp})`;
            },
            getEffectString: function() { return `Max HP: ${player ? player.maxHp : CONSTANTS.PLAYER_MAX_HP}`; }
        },
        {
            id: 'abilityCooldownReduction', classType: 'utility', text: "Streamlined Systems", level: 0, maxLevel: 999,
            detailedDescription: "Reduces the cooldown of all currently acquired abilities by 5% of their current cooldown.",
            isMaxed: function(p) { if (!p || Object.keys(p.activeAbilities).length === 0) return true; let allMin = true; for (const slot in p.activeAbilities) { if(p.activeAbilities[slot] && p.activeAbilities[slot].cooldownDuration > 1000) { allMin = false; break; } } return allMin; },
            apply: function() { if (!player) return ""; let reductionApplied = false; for (const slot in player.activeAbilities) { if(player.activeAbilities[slot]) { const ability = player.activeAbilities[slot]; const reductionAmount = ability.cooldownDuration * 0.05; if (ability.cooldownDuration - reductionAmount >= 500) { ability.cooldownDuration -= reductionAmount; reductionApplied = true; } else if (ability.cooldownDuration > 500) { ability.cooldownDuration = 500; reductionApplied = true; } } } this.level++; uiUpdateAbilityCooldownUI(player); return reductionApplied ? "Ability cooldowns reduced by 5%!" : "No abilities eligible for further cooldown reduction."; },
            getEffectString: function() { return `Ability CDs reduced ${this.level} time(s)`; }
        }
    ];
}

function populateBossLootPoolInternal() {
    bossLootPool = [
         { id: 'momentumInjectors', type: 'gear', name: 'Momentum Injectors', description: 'Your rays deal +5% damage per wall bounce (max +25%).', apply: () => { if(player) { player.momentumDamageBonus = (player.momentumDamageBonus || 0) + 0.05; player.visualModifiers.momentumInjectors = true;} } },
         { id: 'ablativeSublayer', type: 'gear', name: 'Ablative Sub-layer', description: 'Take 15% less damage from Boss projectiles. Enhances armor visual.', apply: () => { if(player) { player.bossDamageReduction = (player.bossDamageReduction || 0) + 0.15; player.visualModifiers.ablativeSublayer = true;} } },
         { id: 'adaptiveShield', type: 'gear', name: 'Adaptive Shield Array', description: 'Gain permanent immunity to up to 4 new random ray colors.',
            apply: (chosenColorsArray) => {
                if (player && chosenColorsArray && Array.isArray(chosenColorsArray)) {
                    let appliedCount = 0;
                    chosenColorsArray.forEach(color => {
                        if (!player.immuneColorsList.includes(color)) { player.immuneColorsList.push(color); appliedCount++; }
                    });
                    if(appliedCount > 0) player.visualModifiers.adaptiveShield = true; 
                    uiUpdateBuffIndicator(player.immuneColorsList, getReadableColorNameFromUtils);
                }
            }
        },
         { id: 'empBurst',        type: 'ability', slot: '1', name: 'EMP Burst',        description: 'Activate [1]: Destroy ALL non-boss rays on screen.', cooldown: 25000, radius: canvas.width, apply: ()=>{} },
         { id: 'miniGravityWell', type: 'ability', slot: '2', name: 'Mini Gravity Well',description: 'Activate [2]: Deploy a well that pulls rays. Activate again to launch them.', cooldown: 25000, duration: 7000, apply: ()=>{} },
         { id: 'teleport',        type: 'ability', slot: '3', name: 'Teleport',         description: 'Activate [3]: Instantly move to cursor. Brief immunity on arrival.', cooldown: 20000, duration: CONSTANTS.TELEPORT_IMMUNITY_DURATION, apply: ()=>{} },
         { id: 'omegaLaser', type: 'ability_mouse', name: 'Omega Laser', description: 'Hold Left Mouse: Fire a continuous damaging beam. Slows movement. Significant cooldown.', cooldown: CONSTANTS.OMEGA_LASER_COOLDOWN, duration: CONSTANTS.OMEGA_LASER_DURATION, apply: () => { if(player) player.hasOmegaLaser = true; } },
         {
            id: 'shieldOvercharge',
            type: 'ability_mouse',
            name: 'Shield Overcharge',
            description: `Hold Right Mouse: Become invulnerable for ${CONSTANTS.SHIELD_OVERCHARGE_DURATION / 1000}s and absorb ANY ray to heal ${CONSTANTS.SHIELD_OVERCHARGE_HEAL_PER_RAY} HP per ray.`,
            cooldown: CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN,
            duration: CONSTANTS.SHIELD_OVERCHARGE_DURATION,
            apply: () => { if(player) player.hasShieldOvercharge = true; }
         }
    ];
}
function initFreeUpgradeChoicesInternal() {
    freeUpgradeChoicesData = [
        {id:'fasterSurvival',text:"Faster automatic points!",isMaxed:(p)=> p.survivalUpgrades>=CONSTANTS.MAX_SURVIVAL_UPGRADES,apply:()=>{survivalUpgrades++;currentSurvivalPointsInterval=Math.max(CONSTANTS.MIN_SURVIVAL_POINTS_INTERVAL,CONSTANTS.BASE_SURVIVAL_POINTS_INTERVAL-(survivalUpgrades*CONSTANTS.SURVIVAL_POINTS_INTERVAL_REDUCTION_PER_UPGRADE));uiUpdateSurvivalBonusIndicator(survivalUpgrades, CONSTANTS.MAX_SURVIVAL_UPGRADES);return"Passive scoring increased!";}},
        {id:'quickShield',text:"Brief invulnerability!",isMaxed:(p)=>!p || (postPopupImmunityTimer > 0 && postDamageImmunityTimer > 0),apply:()=>{postPopupImmunityTimer=CONSTANTS.POST_POPUP_IMMUNITY_DURATION*1.5;return"Temporary shield activated!";}},
        {id:'minorScoreBoost',text:"Small score boost!",isMaxed:(p)=>false,apply:()=>{score+=25; updateScoreDisplay(score); checkForNewColorUnlock(); return"+25 Points!";}}
    ];
}
function checkForNewColorUnlock() { if (score >= nextColorUnlockScore && nextUnlockableColorIndex < CONSTANTS.UNLOCKABLE_RAY_COLORS_LIST.length) { const newColor = CONSTANTS.UNLOCKABLE_RAY_COLORS_LIST[nextUnlockableColorIndex]; if (!currentRayColors.includes(newColor)) { currentRayColors.push(newColor); const colorName = getReadableColorNameFromUtils(newColor); activeBuffNotifications.push({ text: `New Ray Color: ${colorName}!`, timer: CONSTANTS.BUFF_NOTIFICATION_DURATION * 1.5 }); playSound(newColorSound); } nextUnlockableColorIndex++; nextColorUnlockScore += CONSTANTS.NEW_COLOR_UNLOCK_INTERVAL; }}

function updateShootInterval() {
    if (!player || gameOver || isAnyPauseActiveInternal()) {
        if(shootIntervalId) clearInterval(shootIntervalId);
        shootIntervalId = null;
        return;
    }
    let timeBasedReduction = CONSTANTS.SHOOT_INTERVAL_TIME_INITIAL_REDUCTION + (gameplayTimeElapsed * CONSTANTS.SHOOT_INTERVAL_TIME_SCALE_FACTOR);
    currentShootInterval = Math.max(CONSTANTS.MIN_RAY_SHOOT_INTERVAL_BASE, CONSTANTS.BASE_RAY_SHOOT_INTERVAL - timeBasedReduction);
    if (Math.abs(currentShootInterval - lastSetShootInterval) > 10 || (!shootIntervalId)) {
        if (shootIntervalId) clearInterval(shootIntervalId);
        shootIntervalId = setInterval(spawnRay, currentShootInterval);
        lastSetShootInterval = currentShootInterval;
    }
}
function spawnRay(){
    if(!player||gameOver||isAnyPauseActiveInternal() || player.isFiringOmegaLaser ){ return; }
    const baseAimAngle = player.aimAngle;
    const numRaysToSpawn = 1 + player.scatterShotLevel;
    const angleBetweenRays = (numRaysToSpawn > 1 && numRaysToSpawn <= 2) ? CONSTANTS.SCATTER_SHOT_ANGLE_OFFSET : (numRaysToSpawn > 2) ? CONSTANTS.SCATTER_SHOT_ANGLE_OFFSET / (numRaysToSpawn -1) : 0;
    for (let k = 0; k < numRaysToSpawn; k++) {
        let currentAimAngle = baseAimAngle;
        if (numRaysToSpawn > 1) { const spreadFactor = (k - (numRaysToSpawn - 1) / 2.0); currentAimAngle += spreadFactor * angleBetweenRays; }
        if (isScreenShaking && currentShakeType === 'bonus') { const inaccuracy = (Math.random() - 0.5) * CONSTANTS.PLAYER_RAY_INACCURACY_DURING_SHAKE * 2; currentAimAngle += inaccuracy; }
        let rayToSpawn = getPooledRay();
        if (!rayToSpawn) { console.warn("Ray pool exhausted in spawnRay"); continue; }
        const dx=Math.cos(currentAimAngle),dy=Math.sin(currentAimAngle);
        const c=currentRayColors[Math.floor(Math.random()*currentRayColors.length)];
        const sD=player.radius+CONSTANTS.RAY_RADIUS+CONSTANTS.RAY_SPAWN_FORWARD_OFFSET;
        const sX=player.x+dx*sD,sY=player.y+dy*sD;
        rayToSpawn.reset( sX, sY, c, dx, dy, currentRaySpeedMultiplier, player, _currentRayMaxLifetime, false, false, 0, false );
        rays.push(rayToSpawn);
    }
    playSound(shootSound);
}
function spawnTarget(){
    if(gameOver || isAnyPauseActiveInternal() || (bossManager && bossManager.isBossSequenceActive()))return;
    const r=CONSTANTS.TARGET_RADIUS;
    let validPosition = false; let sX, sY; let attempts = 0;
    while(!validPosition && attempts < 50) { sX=Math.random()*(canvas.width-2*r)+r; sY=Math.random()*(canvas.height-2*r)+r; if (player) { const distToPlayer = Math.sqrt((sX - player.x)**2 + (sY - player.y)**2); if (distToPlayer > player.radius + r + 75) validPosition = true; } else validPosition = true; attempts++; }
    if(validPosition) targets.push(new Target(sX,sY,r,CONSTANTS.TARGET_COLOR));
}
function spawnHeart(){
    if(gameOver || isAnyPauseActiveInternal() || hearts.length>0 || (bossManager && bossManager.isBossSequenceActive()))return;
    const x=Math.random()*(canvas.width-2*CONSTANTS.HEART_VISUAL_RADIUS)+CONSTANTS.HEART_VISUAL_RADIUS; const y=Math.random()*(canvas.height-2*CONSTANTS.HEART_VISUAL_RADIUS)+CONSTANTS.HEART_VISUAL_RADIUS;
    hearts.push(new Heart(x,y,CONSTANTS.HEART_VISUAL_RADIUS,CONSTANTS.HEART_COLLISION_RADIUS,CONSTANTS.HEART_COLOR));
}
function spawnBonusPointObject(){
    if(gameOver || isAnyPauseActiveInternal() || (bonusPoints.length > 0) || (bossManager && bossManager.isBossSequenceActive())) return;
    const r=CONSTANTS.BONUS_POINT_RADIUS;
    let validPosition = false; let sX, sY; let attempts = 0;
    while(!validPosition && attempts < 50) { sX=Math.random()*(canvas.width-2*r)+r;sY=Math.random()*(canvas.height-2*r)+r; if (player) {const distToPlayer = Math.sqrt((sX - player.x)**2 + (sY - player.y)**2); if (distToPlayer > player.radius + r + 75) validPosition = true;} else validPosition = true; attempts++;}
    if (validPosition) bonusPoints.push(new BonusPoint(sX,sY,r,CONSTANTS.BONUS_POINT_COLOR));
}

function initGame() {
    gameRunning = true; gameOver = false;
    currentActiveScreenElement = null;
    showScreen(null, false, gameScreenCallbacks);
    score = 0; updateScoreDisplay(score);
    lastEvolutionScore = 0;

    firstBossDefeatedThisRun = false; 

    gamePausedForEvolution = false; gamePausedForFreeUpgrade = false; gamePausedByEsc = false;
    isCountingDownToResume = false; gamePausedForLootChoice = false; evolutionPendingAfterBoss = false;
    shrinkMeCooldown = 0;
    lootDrops = []; decoys = []; bossDefeatEffects = [];
    rays = [];

    gameplayTimeElapsed = 0;
    shootIntervalUpdateTimer = 0;
    currentShootInterval = CONSTANTS.BASE_RAY_SHOOT_INTERVAL;
    lastSetShootInterval = CONSTANTS.BASE_RAY_SHOOT_INTERVAL;
    if (shootIntervalId) clearInterval(shootIntervalId);
    shootIntervalId = null;

    currentRaySpeedMultiplier = 1.0;
    currentEffectiveDefaultGrowthFactor = CONSTANTS.DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR;
    currentPlayerRadiusGrowthFactor = currentEffectiveDefaultGrowthFactor;
    _currentRayMaxLifetime = CONSTANTS.BASE_RAY_MAX_LIFETIME;

    currentRayColors = [...CONSTANTS.INITIAL_RAY_COLORS];
    nextColorUnlockScore = CONSTANTS.NEW_COLOR_UNLOCK_INTERVAL;
    nextUnlockableColorIndex = 0;

    postPopupImmunityTimer = 0; postDamageImmunityTimer = 0;
    targets = []; hearts = []; bonusPoints = []; activeBuffNotifications = [];

    survivalUpgrades = 0;
    currentSurvivalPointsInterval = CONSTANTS.BASE_SURVIVAL_POINTS_INTERVAL;
    survivalScoreThisCycle = 0;
    survivalPointsTimer = 0;

    player = new Player(canvas.width / 2, canvas.height / 2, CONSTANTS.PLAYER_SPEED_BASE);

    initializeAllPossibleRayColors();
    initializeRayPool(Ray);
    initEvolutionChoicesInternal();
    populateBossLootPoolInternal(); 
    initFreeUpgradeChoicesInternal();

    uiUpdateHealthDisplay(player.hp, player.maxHp);
    uiUpdateBuffIndicator(player.immuneColorsList, getReadableColorNameFromUtils);
    uiUpdateSurvivalBonusIndicator(survivalUpgrades, CONSTANTS.MAX_SURVIVAL_UPGRADES);
    uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer);
    uiUpdateAbilityCooldownUI(player);

    if (kineticChargeUIElement && player) {
        let maxPotencyBonusAtFullCharge = 0;
        if (player.kineticConversionLevel > 0) {
             maxPotencyBonusAtFullCharge = player.initialKineticDamageBonus + (Math.max(0, player.kineticConversionLevel - 1) * player.additionalKineticDamageBonusPerLevel);
        }
        updateKineticChargeUI(player.kineticCharge, player.kineticChargeConsumption, maxPotencyBonusAtFullCharge, player.kineticConversionLevel > 0);
    }

    if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';
    const bossManagerAudioContext = { playSound, audioChaserSpawnSound, audioReflectorSpawnSound, audioSingularitySpawnSound };
    bossManager = new BossManager(CONSTANTS.BOSS_SPAWN_START_SCORE, CONSTANTS.BOSS_SPAWN_SCORE_INTERVAL, bossManagerAudioContext);

    pauseAllGameIntervals();
    resumeAllGameIntervals();

    applyMusicPlayStateWrapper();
    spawnTarget();
    lastTime = performance.now();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    updateAllHighScoreDisplays();
}

function gameLoop(timestamp) {
    if (gameOver) { if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; return; }
    if (!gameRunning) { if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null; return; }
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    updateGame(deltaTime || (1000 / 60));
    drawGame();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function updateGame(deltaTime) {
    if (deltaTime <= 0 || deltaTime > 500) deltaTime = 1000 / 60;

    mouseX = inputState.mouseX;
    mouseY = inputState.mouseY;

    if (!isAnyPauseActiveInternal()) {
        gameplayTimeElapsed += deltaTime;
        shootIntervalUpdateTimer += deltaTime;
        if (shootIntervalUpdateTimer >= CONSTANTS.SHOOT_INTERVAL_UPDATE_FREQUENCY) {
            updateShootInterval(); shootIntervalUpdateTimer = 0;
        }
        survivalPointsTimer+=deltaTime;
        if(survivalPointsTimer>=currentSurvivalPointsInterval){
            survivalPointsTimer-=currentSurvivalPointsInterval;
            if(survivalScoreThisCycle<CONSTANTS.MAX_SURVIVAL_POINTS_PER_EVOLUTION_CYCLE){
                score+=CONSTANTS.SURVIVAL_POINTS_AMOUNT;survivalScoreThisCycle+=CONSTANTS.SURVIVAL_POINTS_AMOUNT;
                updateScoreDisplay(score);checkForNewColorUnlock();
            }
        }
    }

    if(postPopupImmunityTimer>0)postPopupImmunityTimer-=deltaTime; if(postPopupImmunityTimer<0)postPopupImmunityTimer=0;
    if(postDamageImmunityTimer>0)postDamageImmunityTimer-=deltaTime; if(postDamageImmunityTimer<0)postDamageImmunityTimer=0;
    uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer);

    if (isScreenShaking) {
        screenShakeTimer -= deltaTime;
        if (currentShakeType === 'playerHit') { currentShakeMagnitude *= CONSTANTS.SHAKE_DECAY_FACTOR_BASE; if (currentShakeMagnitude < 1) currentShakeMagnitude = 0;}
        if (screenShakeTimer <= 0) { isScreenShaking = false;screenShakeTimer = 0;currentShakeType = null;currentShakeMagnitude = 0;}
    }

    for (let i = lootDrops.length - 1; i >= 0; i--) {
        const loot = lootDrops[i]; loot.update(deltaTime);
        if (loot.remove) { lootDrops.splice(i, 1); continue; }
        if (player && checkCollision(player, loot)) { 
            const choices = loot.upgradeChoices; 
            lootDrops.splice(i, 1); 
            playSound(lootPickupSound); 
            if (loot.isFirstBossLoot) { 
                triggerFirstBossLootChoiceInternal(); 
            } else {
                triggerLootChoiceInternal(choices); 
            }
            break; 
        }
    }

    if (bossManager && !gameOver) bossManager.trySpawnBoss(score);

    if (!isAnyPauseActiveInternal()) {
        let wellsToDetonate = [];
        for (let i = decoys.length - 1; i >= 0; i--) {
            const well = decoys[i];
            if(well && well instanceof PlayerGravityWell) {
                const wellUpdateContext = { dt: deltaTime, allRays: rays, activeBosses: bossManager ? bossManager.activeBosses : [], player };
                well.update(wellUpdateContext);
                if (well.isPendingDetonation && well.isActive) wellsToDetonate.push(well);
                if (!well.isActive && !well.isPendingDetonation) { if(player && player.activeMiniWell === well) player.activeMiniWell = null; decoys.splice(i, 1);}
            } else { decoys.splice(i,1); }
        }
        wellsToDetonate.forEach(well => {
            if (well && well.isActive) {
                well.detonate({ targetX: mouseX, targetY: mouseY, player: player });
                if (player && player.activeAbilities && player.activeAbilities['2'] && player.activeMiniWell === null) {
                }
            }
        });
        for (let i = decoys.length - 1; i >= 0; i--) { if(decoys[i] && !decoys[i].isActive) { if(player && player.activeMiniWell === decoys[i]) player.activeMiniWell = null; decoys.splice(i, 1);}}

        const currentEvolutionThreshold = lastEvolutionScore + (CONSTANTS.EVOLUTION_SCORE_INTERVAL * (player ? player.evolutionIntervalModifier : 1.0));
        if (player && score >= currentEvolutionThreshold && !evolutionPendingAfterBoss) {
            if (bossManager && (bossManager.isBossSequenceActive() || bossManager.isBossWarningActiveProp()) ) evolutionPendingAfterBoss = true;
            else if (lootDrops.length > 0) evolutionPendingAfterBoss = true;
            else triggerEvolutionInternal();
        }
        for (let i = activeBuffNotifications.length - 1; i >= 0; i--) {const n = activeBuffNotifications[i];n.timer -= deltaTime;if (n.timer <= 0) activeBuffNotifications.splice(i, 1);}

        if (player) {
            const playerUpdateContext = {
                dt: deltaTime, keys: inputState.keys, mouseX: mouseX, mouseY: mouseY, canvasWidth: canvas.width, canvasHeight: canvas.height,
                targets: targets, activeBosses: bossManager ? bossManager.activeBosses : [], currentGrowthFactor: currentPlayerRadiusGrowthFactor,
                currentEffectiveDefaultGrowthFactor: currentEffectiveDefaultGrowthFactor, score: score, evolutionChoices: evolutionChoices, 
                ui: { updateKineticChargeUI },    
                updateHealthDisplayCallback: (currentHp, maxHp) => uiUpdateHealthDisplay(currentHp, maxHp),
                updateAbilityCooldownCallback: (pInst) => uiUpdateAbilityCooldownUI(pInst),
                isAnyPauseActiveCallback: isAnyPauseActiveInternal, decoysArray: decoys, bossDefeatEffectsArray: bossDefeatEffects, allRays: rays,
                screenShakeParams: {isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy},
                activeBuffNotificationsArray: activeBuffNotifications, CONSTANTS, endGameCallback: endGameInternal,
                updateScoreCallback: (amount) => { score += amount; updateScoreDisplay(score); checkForNewColorUnlock(); }, forceAbilityUIUpdate: false
            };
            player.update(playerUpdateContext);
        }

        if (bossManager && !gameOver) {
            const contextForBossMan = {
                dt: deltaTime, canvasWidth: canvas.width, canvasHeight: canvas.height, isAnyPauseActive: isAnyPauseActiveInternal, allRays: rays,
                screenShakeParams: { isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy },
                bossDefeatEffectsArray: bossDefeatEffects, lootDropsArray: lootDrops, bossLootPool, 
                firstBossDefeatedThisRunRef: { get: () => firstBossDefeatedThisRun, set: (val) => firstBossDefeatedThisRun = val }, 
                score, evolutionPendingAfterBossRef: { get: () => evolutionPendingAfterBoss, set: (val) => evolutionPendingAfterBoss = val },
                playerPostDamageImmunityTimer: postDamageImmunityTimer,
                callbacks: {
                    updateScore: (amount) => { score += amount; updateScoreDisplay(score); checkForNewColorUnlock(); },
                    checkEvolutionEligibility: (canTriggerImmediately) => {
                        const currentEvoThresh = lastEvolutionScore + (CONSTANTS.EVOLUTION_SCORE_INTERVAL * (player ? player.evolutionIntervalModifier : 1.0));
                        if (score >= currentEvoThresh) {
                            if (!canTriggerImmediately) { evolutionPendingAfterBoss = true; return false; }
                            if (bossManager && (bossManager.isBossSequenceActive() || bossManager.isBossWarningActiveProp())) { evolutionPendingAfterBoss = true; return false; }
                            triggerEvolutionInternal(); return true;
                        }
                        return false;
                    },
                    pausePickups: (pauseCmd) => { if (pauseCmd) pausePickupSpawners(); else resumePickupSpawners(); },
                    applyMusicPlayState: applyMusicPlayStateWrapper,
                    onPlayerBossCollision: (collidedBoss) => {
                        if (player && typeof player.takeDamage === 'function') {
                            const currentTakeDamageGameContext = {
                                postPopupImmunityTimer: postPopupImmunityTimer, postDamageImmunityTimer: postDamageImmunityTimer, score: score,
                                updateScoreCallback: (amt) => { score += amt; updateScoreDisplay(score); checkForNewColorUnlock(); },
                                checkForNewColorCallback: checkForNewColorUnlock, endGameCallback: endGameInternal,
                                updateHealthDisplayCallback: (hp, maxHp) => uiUpdateHealthDisplay(hp, maxHp),
                                activeBuffNotificationsArray: activeBuffNotifications 
                            };
                            const currentTakeDamageDamageContext = {
                                screenShakeParams: { isScreenShaking: isScreenShaking, screenShakeTimer: screenShakeTimer, currentShakeMagnitude: currentShakeMagnitude, currentShakeType: currentShakeType, hitShakeDx: hitShakeDx, hitShakeDy: hitShakeDy }
                            };
                            const damageTaken = player.takeDamage( null,  currentTakeDamageGameContext, currentTakeDamageDamageContext );
                            if (damageTaken > 0) {
                                postDamageImmunityTimer = CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION;
                                const bounceAngle = Math.atan2(player.y - collidedBoss.y, player.x - collidedBoss.x);
                                player.velX = Math.cos(bounceAngle) * CONSTANTS.PLAYER_BOUNCE_FORCE_FROM_BOSS;
                                player.velY = Math.sin(bounceAngle) * CONSTANTS.PLAYER_BOUNCE_FORCE_FROM_BOSS;
                            }
                        }
                    },
                    // ---- MODIFIED requestFirstBossLoot ----
                    requestFirstBossLoot: (bossX, bossY) => { 
                        const uniqueBuffChoices = [ 
                            { 
                                id: 'perfectHarmony', type: 'path_buff', name: 'Path of Harmony', 
                                description: `If no damage is taken for ${CONSTANTS.PERFECT_HARMONY_NO_DAMAGE_DURATION_THRESHOLD/1000}s: +${CONSTANTS.PERFECT_HARMONY_RAY_DAMAGE_BONUS*100}% all ray damage, +${CONSTANTS.PERFECT_HARMONY_SPEED_BONUS*100}% speed, abilities cool ${CONSTANTS.PERFECT_HARMONY_COOLDOWN_REDUCTION*100}% faster. Broken on damage. Grants the Priest's Circlet.` 
                            },
                            { 
                                id: 'berserkersEcho', type: 'path_buff', name: 'Path of Fury', 
                                description: `Per 10% missing Max HP: +${CONSTANTS.BERSERKERS_ECHO_DAMAGE_PER_10_HP*100}% normal ray damage & +${CONSTANTS.BERSERKERS_ECHO_SPEED_PER_10_HP*100}% speed. Grants the Berserker's Helm.`
                            },
                            { 
                                id: 'ultimateConfiguration', type: 'path_buff', name: 'Path of Power (Offense)', 
                                description: `Omega Laser Dmg x2, Mini-Well Launched Rays +100% Dmg. Numbered Ability Cooldowns +50%. Grants the Wizard's Hat.`
                            }
                        ];
                        const firstLoot = new LootDrop(bossX, bossY, uniqueBuffChoices);
                        firstLoot.isFirstBossLoot = true; 
                        lootDrops.push(firstLoot); // Use global lootDrops array from main.js
                    }
                },
                CONSTANTS, getPooledRay,
            };
            bossManager.update(player, contextForBossMan);
        }

        for (let i = rays.length - 1; i >= 0; i--) {
            const r = rays[i];
            if (r.isActive) {
                const rayUpdateContext = {
                    dt: deltaTime, player, decoys, canvasWidth: canvas.width, canvasHeight: canvas.height, stopSound, gravityWellChargeSound, CONSTANTS,
                    detonateGravityWell: (gRayInst) => {
                        if (gRayInst.gravityWellTarget && typeof gRayInst.gravityWellTarget.detonate === 'function') {
                            const detonateCtx = { allRays: rays, screenShakeParams: {isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy}, bossDefeatEffectsArray: bossDefeatEffects, CONSTANTS, getPooledRay };
                            gRayInst.gravityWellTarget.detonate(gRayInst, detonateCtx);
                        }
                    },
                    playerPostDamageImmunityTimer: postDamageImmunityTimer, playerPostPopupImmunityTimer: postPopupImmunityTimer,
                    screenShakeParams: {isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy},
                    playerTakeDamageFromRayCallback: (rayThatHitPlayer) => {
                        if (player && rayThatHitPlayer.isGravityWellRay) {
                            const ptdGameCtxForGravityBall = {
                                postPopupImmunityTimer: postPopupImmunityTimer, postDamageImmunityTimer: postDamageImmunityTimer, score: score,
                                updateHealthDisplayCallback: (hp, maxHp) => uiUpdateHealthDisplay(hp, maxHp), endGameCallback: endGameInternal,
                                updateScoreCallback: (amt) => { score += amt; updateScoreDisplay(score); checkForNewColorUnlock(); },
                                checkForNewColorCallback: checkForNewColorUnlock, activeBuffNotificationsArray: activeBuffNotifications
                            };
                            const ptdDamageCtxForGravityBall = { screenShakeParams:{isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy} };
                            const damageActuallyDealt = player.takeDamage(rayThatHitPlayer, ptdGameCtxForGravityBall, ptdDamageCtxForGravityBall);
                            if (damageActuallyDealt > 0) {
                                postDamageImmunityTimer = CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION;
                                const bounceAngle = Math.atan2(player.y - rayThatHitPlayer.y, player.x - rayThatHitPlayer.x);
                                player.velX = Math.cos(bounceAngle) * CONSTANTS.PLAYER_BOUNCE_FORCE_FROM_GRAVITY_BALL;
                                player.velY = Math.sin(bounceAngle) * CONSTANTS.PLAYER_BOUNCE_FORCE_FROM_GRAVITY_BALL;
                            }
                        }
                    }
                };
                r.update(rayUpdateContext);

                if (r.isActive && !r.isBossProjectile && !r.isGravityWellRay && !r.isCorruptedByGravityWell && !r.isCorruptedByPlayerWell && r.state==='moving' && !r.isForming) {
                    let baseRayDmg = 1 + (player ? player.rayDamageBonus : 0);
                    let finalDamage = baseRayDmg;

                    if (player) {
                        if (player.isHarmonized && player.hasPerfectHarmonyHelm) {
                            finalDamage *= (1 + CONSTANTS.PERFECT_HARMONY_RAY_DAMAGE_BONUS);
                        }
                        if (!r.isPlayerAbilityRay && player.hasBerserkersEchoHelm) { 
                            const missingHpPercentage = (player.maxHp - player.hp) / player.maxHp;
                            const tenPercentIncrements = Math.floor(missingHpPercentage * 10);
                            if (tenPercentIncrements > 0) {
                                const berserkDamageBonus = tenPercentIncrements * CONSTANTS.BERSERKERS_ECHO_DAMAGE_PER_10_HP;
                                finalDamage *= (1 + berserkDamageBonus);
                            }
                        }
                        if (r.isPlayerAbilityRay) { 
                            let abilityBaseDamage = 1 + player.rayDamageBonus; 
                            if (typeof player.abilityDamageMultiplier === 'number') {
                                 abilityBaseDamage *= player.abilityDamageMultiplier;
                            }
                            if (player.hasUltimateConfigurationHelm) { 
                                abilityBaseDamage *= 2; 
                            }
                            if (player.isHarmonized && player.hasPerfectHarmonyHelm) {
                                abilityBaseDamage *= (1 + CONSTANTS.PERFECT_HARMONY_RAY_DAMAGE_BONUS);
                            }
                            finalDamage = abilityBaseDamage; 
                        }
                    }
                    if (r.isPlayerAbilityRay && r.customKineticDamageBoost && typeof r.customKineticDamageBoost === 'number' && r.customKineticDamageBoost > 1.0) {
                        finalDamage *= r.customKineticDamageBoost;
                    }
                    finalDamage *= (1 + (r.momentumDamageBonusValue || 0));
                    let currentRayDamage = Math.round(Math.max(1, finalDamage));

                    for(let j=targets.length-1;j>=0;j--){
                        const t=targets[j];
                        if(checkCollision(r,t)){
                            let aoeTriggeredOnHit = false;
                            if (player && player.chainReactionChance > 0 && Math.random() < player.chainReactionChance) {
                                playSound(chainReactionSound);
                                bossDefeatEffects.push({
                                    x: t.x, y: t.y, radius: CONSTANTS.CHAIN_REACTION_RADIUS * 0.1, opacity: 1,
                                    timer: CONSTANTS.CHAIN_REACTION_EXPLOSION_DURATION, duration: CONSTANTS.CHAIN_REACTION_EXPLOSION_DURATION,
                                    color: CONSTANTS.CHAIN_REACTION_EXPLOSION_COLOR,
                                    maxRadius: CONSTANTS.CHAIN_REACTION_RADIUS, initialRadius: CONSTANTS.CHAIN_REACTION_RADIUS * 0.1,
                                    isAOEDamage: true, damage: currentRayDamage * 0.5 
                                });
                                aoeTriggeredOnHit = true;
                            }
                            targets.splice(j,1); score+=10; updateScoreDisplay(score); checkForNewColorUnlock();
                            if (!aoeTriggeredOnHit) playSound(targetHitSound);
                            if (r.pierceUsesLeft > 0) r.pierceUsesLeft--; else r.isActive = false;
                            if (!r.isActive) break;
                        }
                    }
                    if (!r.isActive) continue; 
                    if (bossManager && bossManager.activeBosses.length > 0) {
                        for(const boss of bossManager.activeBosses) {
                             if (checkCollision(r, boss)) {
                                let consumedByShield = false; let damageAppliedToBoss = false;
                                const bossTakeDmgCtx = {CONSTANTS, playerInstance: player};
                                if (boss instanceof MirrorShieldBoss) {
                                    damageAppliedToBoss = boss.takeDamage(currentRayDamage, r, player, bossTakeDmgCtx);
                                    consumedByShield = !r.isActive || damageAppliedToBoss;
                                } else {
                                    damageAppliedToBoss = boss.takeDamage(currentRayDamage, r, player, bossTakeDmgCtx);
                                    consumedByShield = true;
                                }
                                if(damageAppliedToBoss) {
                                    playSound(bossHitSound);
                                    if (player && player.bleedOnHit) { 
                                        const bleed = currentRayDamage * 0.05; 
                                        if (typeof boss.applyBleed === 'function') boss.applyBleed(bleed, 3000);
                                    }
                                }
                                if (player && player.chainReactionChance > 0 && Math.random() < player.chainReactionChance) {
                                    playSound(chainReactionSound);
                                    bossDefeatEffects.push({
                                        x: r.x, y: r.y, radius: CONSTANTS.CHAIN_REACTION_RADIUS * 0.1, opacity: 1,
                                        timer: CONSTANTS.CHAIN_REACTION_EXPLOSION_DURATION, duration: CONSTANTS.CHAIN_REACTION_EXPLOSION_DURATION,
                                        color: CONSTANTS.CHAIN_REACTION_EXPLOSION_COLOR,
                                        maxRadius: CONSTANTS.CHAIN_REACTION_RADIUS, initialRadius: CONSTANTS.CHAIN_REACTION_RADIUS * 0.1,
                                        isAOEDamage: true, damage: currentRayDamage * 0.5
                                    });
                                }
                                if(consumedByShield && r.isActive) r.isActive = false;
                                if(!r.isActive) break; 
                            }
                        }
                    }
                } 
            } 
            if(!r.isActive) { 
                if (r.isGravityWellRay && r.gravityWellTarget instanceof GravityWellBoss && r.gravityWellTarget.gravityRay === r) {
                    stopSound(gravityWellChargeSound);
                    r.gravityWellTarget.gravityRay = null;
                }
                rays.splice(i, 1);
            }
        } 

         for(let i=rays.length-1;i>=0;i--){
             const r=rays[i];
             if (!r || !r.isActive || !player) continue;
             if (r.isGravityWellRay) continue; 
             const skipRayPlayerCollision = r.spawnGraceTimer > 0 || r.state !== 'moving' || (player.teleporting && player.teleportEffectTimer > 0) || r.isForming;
             if (skipRayPlayerCollision) continue;

             if (checkCollision(player, r)) {
                const isHostile = r.isBossProjectile || r.isCorruptedByGravityWell || r.isCorruptedByPlayerWell;
                let isImmuneToThisColor = player.immuneColorsList.includes(r.color);
                const isUnblockableType = r.color === CONSTANTS.REFLECTED_RAY_COLOR;
                let damageDealt = 0;
                const ptdGameCtxForRay = {
                    postPopupImmunityTimer: postPopupImmunityTimer, postDamageImmunityTimer: postDamageImmunityTimer, score: score,
                    updateHealthDisplayCallback:(hp,maxHp)=>uiUpdateHealthDisplay(hp,maxHp), endGameCallback:endGameInternal,
                    updateScoreCallback: (amt) => { score += amt; updateScoreDisplay(score); checkForNewColorUnlock(); },
                    checkForNewColorCallback: checkForNewColorUnlock, activeBuffNotificationsArray: activeBuffNotifications
                };
                const ptdDamageCtxForRay = { screenShakeParams:{isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy} };
                if (isHostile) {
                    if (!isImmuneToThisColor || isUnblockableType) {
                        damageDealt = player.takeDamage(r, ptdGameCtxForRay, ptdDamageCtxForRay);
                        r.isActive = false;
                    } else { r.isActive = false; }
                } else { 
                    if (!isImmuneToThisColor) { damageDealt = player.takeDamage(r, ptdGameCtxForRay, ptdDamageCtxForRay); }
                    r.isActive = false;
                }
                if (damageDealt > 0) { postDamageImmunityTimer = CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION; }
             }
             if(!r.isActive) { rays.splice(i,1); } 
         }

         if (player && !(player.teleporting && player.teleportEffectTimer > 0) && !player.isShieldOvercharging) {
             for(let i=hearts.length-1;i>=0;i--){
                 const h=hearts[i];
                 if(checkCollision(player,h)){
                     hearts.splice(i,1); player.gainHealth(CONSTANTS.HP_REGEN_PER_PICKUP + player.hpPickupBonus, (hp,maxHp)=>uiUpdateHealthDisplay(hp,maxHp)); playSound(heartSound);
                     if (player.hp === player.maxHp) {
                         let chosenUpg; const avail = freeUpgradeChoicesData.filter(c => !c.isMaxed(player));
                         if (avail.length > 0) { chosenUpg = avail[Math.floor(Math.random() * avail.length)]; if (chosenUpg) { chosenUpg.apply(); activeBuffNotifications.push({ text: "Max HP Bonus: " + chosenUpg.text.replace(/!$/, "") + "!", timer: CONSTANTS.BUFF_NOTIFICATION_DURATION}); playSound(upgradeSound); }}
                         else { activeBuffNotifications.push({ text: "Max HP! +10 Score!", timer: CONSTANTS.BUFF_NOTIFICATION_DURATION}); score += 10; updateScoreDisplay(score); }
                     }
                     postPopupImmunityTimer = CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.75;
                 }
             }
             for(let i=bonusPoints.length - 1; i >= 0; i--){
                 const bp = bonusPoints[i];
                 if(checkCollision(player, bp)){
                     bonusPoints.splice(i,1); score += CONSTANTS.BONUS_POINT_VALUE; updateScoreDisplay(score);checkForNewColorUnlock(); playSound(bonusPickupSound);
                     isScreenShaking = true;screenShakeTimer = CONSTANTS.SCREEN_SHAKE_DURATION_BONUS; currentShakeMagnitude = CONSTANTS.SCREEN_SHAKE_MAGNITUDE_BONUS; currentShakeType = 'bonus'; playSound(screenShakeSound);
                 }
             }
         }
    } 

    for (let i = bossDefeatEffects.length - 1; i >= 0; i--) {
        const effect = bossDefeatEffects[i];
        if (effect.isAOEDamage && effect.timer === effect.duration) { 
            for (let tIdx = targets.length - 1; tIdx >= 0; tIdx--) {
                const target = targets[tIdx];
                const dist = Math.sqrt((effect.x - target.x) ** 2 + (effect.y - target.y) ** 2);
                if (dist < effect.maxRadius + target.radius) {
                    targets.splice(tIdx, 1);
                    score += 5;
                    updateScoreDisplay(score);
                }
            }
            if (bossManager && bossManager.activeBosses) {
                bossManager.activeBosses.forEach(boss => {
                    const dist = Math.sqrt((effect.x - boss.x) ** 2 + (effect.y - boss.y) ** 2);
                    if (dist < effect.maxRadius + boss.radius) {
                        if (typeof boss.takeDamage === 'function') {
                            boss.takeDamage(effect.damage, null, player);
                        }
                    }
                });
            }
        }
    }
}

function drawGame(){
    ctx.save();
    if (isScreenShaking && screenShakeTimer > 0 && !isAnyPauseActiveInternal() && !gameOver) {
        let shakeX = 0, shakeY = 0;
        if (currentShakeType === 'playerHit' && currentShakeMagnitude > 0) { shakeX = hitShakeDx * currentShakeMagnitude * (Math.random() * 0.6 + 0.4); shakeY = hitShakeDy * currentShakeMagnitude * (Math.random() * 0.6 + 0.4); }
        else if (currentShakeType === 'bonus') { shakeX = (Math.random() - 0.5) * currentShakeMagnitude * 2; shakeY = (Math.random() - 0.5) * currentShakeMagnitude * 2; }
        ctx.translate(shakeX, shakeY);
    }
    ctx.fillStyle='rgba(0,0,0,0.20)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    targets.forEach(t=>t.draw(ctx)); hearts.forEach(h=>h.draw(ctx)); bonusPoints.forEach(bp=>bp.draw(ctx)); lootDrops.forEach(l => l.draw(ctx));
    decoys.forEach(d => { if(d && typeof d.draw === 'function') d.draw(ctx); });
    rays.forEach(r => { if (r && r.isActive) r.draw(ctx); });
    if (bossManager) bossManager.draw(ctx, { canvasWidth: canvas.width, canvasHeight: canvas.height });
    for (let i = bossDefeatEffects.length - 1; i >= 0; i--) {
        const e = bossDefeatEffects[i]; e.timer -= (16.67); if (e.timer <= 0) { bossDefeatEffects.splice(i, 1); continue; } e.opacity = e.timer / e.duration;
       if(e.maxRadius && e.initialRadius !== undefined) { let p = e.shrink ? (e.timer / e.duration) : (1 - (e.timer / e.duration)); e.radius = e.initialRadius + (e.maxRadius - e.initialRadius) * p;}
       else e.radius += 1.5;
       ctx.beginPath(); ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
       ctx.fillStyle = e.color ? e.color.replace('opacity', (e.opacity * 0.6).toString()) : `rgba(255, 255, 180, ${e.opacity * 0.6})`; ctx.fill();
   }
    if(player && gameRunning && !gameOver){
        const playerDrawContext = { isCountingDownToResume, postPopupImmunityTimer, postDamageImmunityTimer, CONSTANTS };
        player.draw(ctx, playerDrawContext);
    }
    ctx.restore();
    ctx.save(); ctx.textAlign = 'center'; let notificationY = 60;
    const FADE_OUT_ACTUAL = CONSTANTS.BUFF_NOTIFICATION_DURATION - CONSTANTS.BUFF_NOTIFICATION_FADE_OUT_START_TIME;
    activeBuffNotifications.forEach(n => {
        ctx.font = 'bold 26px Arial'; let baseOp = 0.75, currentOp = baseOp;
        if (n.timer < FADE_OUT_ACTUAL) currentOp = (n.timer / FADE_OUT_ACTUAL) * baseOp;
        currentOp = Math.max(0, currentOp); ctx.fillStyle = `rgba(200, 220, 255, ${currentOp})`;
        ctx.shadowColor = `rgba(0, 0, 0, ${currentOp * 0.6})`; ctx.shadowBlur = 6;
        ctx.fillText(n.text, canvas.width / 2, notificationY); notificationY += 35;
    });
    ctx.restore();
}

function endGameInternal() {
    gameOver = true; gameRunning = false; pauseAllGameIntervals();
    currentActiveScreenElement = gameOverScreen;
    applyMusicPlayStateWrapper();
    playSound(gameOverSoundFX);
    if (player && player.isFiringOmegaLaser) stopSound(omegaLaserSound);
    const finalStatsSnapshot = createFinalStatsSnapshot();
    prepareAndShowPauseStats("Game Over - Final Stats");
    if (pausePlayerStatsPanel) {
        if (pausePlayerStatsPanel.parentElement !== document.body) document.body.appendChild(pausePlayerStatsPanel);
        const highScoreContainerRect = uiHighScoreContainer.getBoundingClientRect();
        if (uiHighScoreContainer && highScoreContainerRect.height > 0 && highScoreContainerRect.bottom < (canvas.height - pausePlayerStatsPanel.offsetHeight - 20)) {
            pausePlayerStatsPanel.style.top = (highScoreContainerRect.bottom + 10) + 'px';
        } else {
            const gameOverRect = gameOverScreen.getBoundingClientRect();
            let panelTop = (gameOverRect.height > 0 && gameOverScreen.style.display === 'flex') ? gameOverRect.top - pausePlayerStatsPanel.offsetHeight - 10 : (canvas.height / 2 - pausePlayerStatsPanel.offsetHeight / 2);
             if (panelTop + pausePlayerStatsPanel.offsetHeight > canvas.height - 20) panelTop = Math.max(20, canvas.height - 20 - pausePlayerStatsPanel.offsetHeight);
             if (panelTop < 20) panelTop = 20;
            pausePlayerStatsPanel.style.top = `${panelTop}px`;
        }
        pausePlayerStatsPanel.style.display = 'block';
    }
    const hs = getHighScores(); const lowTop = hs.length < 5 ? 0 : (hs[hs.length-1]?.score || 0);
    const isNewHS = score > 0 && (score > lowTop || hs.length < 5);
    displayGameOverScreenContent( score, isNewHS,
        (name) => { addHighScore(name, score, finalStatsSnapshot); updateAllHighScoreDisplays(); },
        () => { if(pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none'; initGame(); },
        () => { if(pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none'; showStartScreenWithUpdatesInternal(); }
    );
    showScreen(gameOverScreen, false, gameScreenCallbacks);
}

function togglePauseMenu() { 
    if (gameOver || isCountingDownToResume || gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedForLootChoice) return;
    gamePausedByEsc = !gamePausedByEsc;
    if (gamePausedByEsc) {
        pauseAllGameIntervals();
        prepareAndShowPauseStats("Paused - Current Status");
        currentActiveScreenElement = pauseScreen;
        showScreen(pauseScreen, true, gameScreenCallbacks);
        if(pausePlayerStatsPanel) {
            if (pausePlayerStatsPanel.parentElement !== document.body) document.body.appendChild(pausePlayerStatsPanel);
            if (uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null) {
                const r = uiHighScoreContainer.getBoundingClientRect(); pausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px';
            } else pausePlayerStatsPanel.style.top = '20px';
            pausePlayerStatsPanel.style.display = 'block';
        }
    } else {
        if(pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';
        currentActiveScreenElement = countdownOverlay;
        startResumeCountdownInternal();
    }
}

function startResumeCountdownInternal() {
    if (pauseScreen.style.display === 'flex') pauseScreen.style.display = 'none'; if(pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';
    gamePausedByEsc = true; isCountingDownToResume = true; let countVal = 3;
    currentActiveScreenElement = countdownOverlay;
    if(countdownOverlay) { countdownOverlay.textContent = countVal.toString(); countdownOverlay.style.display = 'flex'; }
    if (resumeCountdownTimerId) clearInterval(resumeCountdownTimerId);
    resumeCountdownTimerId = setInterval(() => {
        countVal--; if (countdownOverlay) countdownOverlay.textContent = countVal > 0 ? countVal.toString() : '';
        if (countVal <= 0) {
            if(countdownOverlay) countdownOverlay.style.display = 'none'; clearInterval(resumeCountdownTimerId); resumeCountdownTimerId = null;
            isCountingDownToResume = false; gamePausedByEsc = false;
            currentActiveScreenElement = null;
            resumeAllGameIntervals(); applyMusicPlayStateWrapper();
            lastTime = performance.now(); if (!animationFrameId && !gameOver && gameRunning) animationFrameId = requestAnimationFrame(gameLoop);
        }
    }, 1000);
}
function triggerEvolutionInternal() {
    if(!player || isAnyPauseActiveInternal() || (bossManager && bossManager.isBossSequenceActive())) return;
    if (shrinkMeCooldown > 0) shrinkMeCooldown--;
    pauseAllGameIntervals(); gamePausedForEvolution = true;
    currentActiveScreenElement = evolutionScreen;
    applyMusicPlayStateWrapper(); playSound(evolutionSound);
    const available = evolutionChoices.filter(c => !c.isMaxed(player));
    let choices = [];
    if(available.length > 0){ let shuf = [...available].sort(() => 0.5 - Math.random()); choices = shuf.slice(0, 3); }
    else choices.push({id:'noMoreEvolutions', classType: 'utility', text:"All evolutions maxed! Good luck!", apply:()=>"No more evolutions!", isMaxed: ()=> true, level: 0});
    populateEvolutionOptionsUI( choices, player, selectEvolutionInternal, shrinkMeCooldown, getReadableColorNameFromUtils );
    showScreen(evolutionScreen, true, gameScreenCallbacks);
}

function selectEvolutionInternal(choice) {
    if(!player) {console.error("Player not defined"); return;}
    if(choice.id==='noMoreEvolutions'){
        gamePausedForEvolution=false; postPopupImmunityTimer=CONSTANTS.POST_POPUP_IMMUNITY_DURATION;
        currentActiveScreenElement = null;
        showScreen(null, false, gameScreenCallbacks);
        applyMusicPlayStateWrapper(); lastTime=performance.now(); if(!gameOver&&!animationFrameId && gameRunning)animationFrameId=requestAnimationFrame(gameLoop);
        uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer); resumeAllGameIntervals();
        return;
    }

    choice.apply();

    lastEvolutionScore = player.evolutionIntervalModifier > 0 ? Math.floor(score / (CONSTANTS.EVOLUTION_SCORE_INTERVAL * player.evolutionIntervalModifier)) * (CONSTANTS.EVOLUTION_SCORE_INTERVAL * player.evolutionIntervalModifier) : score;
    survivalScoreThisCycle = 0;

    if (choice.id !== 'smallerPlayer') { 
        currentPlayerRadiusGrowthFactor = currentEffectiveDefaultGrowthFactor;
    }
    
    gamePausedForEvolution = false; evolutionPendingAfterBoss = false; postPopupImmunityTimer = CONSTANTS.POST_POPUP_IMMUNITY_DURATION;
    currentActiveScreenElement = null;
    showScreen(null, false, gameScreenCallbacks);
    applyMusicPlayStateWrapper();
    lastTime = performance.now();
    if(!gameOver&&!animationFrameId && gameRunning) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer);
    resumeAllGameIntervals();
    if (bossManager && bossManager.isBossInQueue() && !bossManager.isBossWarningActiveProp() && !isAnyPauseActiveInternal()) bossManager.triggerNextBossWarning({isAnyPauseActive: isAnyPauseActiveInternal});
}

function triggerFreeUpgradeInternal() {
    if(!player || isAnyPauseActiveInternal() || (bossManager && bossManager.isBossSequenceActive()))return;
    pauseAllGameIntervals(); gamePausedForFreeUpgrade = true;
    currentActiveScreenElement = freeUpgradeScreen;
    applyMusicPlayStateWrapper(); playSound(upgradeSound);
    let upg; const avail = freeUpgradeChoicesData.filter(c=>!c.isMaxed(player));
    if(avail.length>0) upg=avail[Math.floor(Math.random()*avail.length)]; else upg={id:'noMoreFreeUpgrades',text:"All free bonuses maxed!",apply:()=>"No more free bonuses!"};
    populateFreeUpgradeOptionUI(upg, handleFreeUpgradeCloseInternal);
    showScreen(freeUpgradeScreen, true, gameScreenCallbacks);
}

function handleFreeUpgradeCloseInternal(chosenUpgrade) {
    if(chosenUpgrade && chosenUpgrade.id!=='noMoreFreeUpgrades') chosenUpgrade.apply();
    gamePausedForFreeUpgrade = false; postPopupImmunityTimer=CONSTANTS.POST_POPUP_IMMUNITY_DURATION;
    currentActiveScreenElement = null;
    showScreen(null, false, gameScreenCallbacks);
    applyMusicPlayStateWrapper(); lastTime=performance.now(); if(!gameOver&&!animationFrameId && gameRunning)animationFrameId=requestAnimationFrame(gameLoop);
    uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer); resumeAllGameIntervals();
}

function triggerLootChoiceInternal(choices) { 
    if (!player || choices.length === 0) { 
        postPopupImmunityTimer = CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.5; 
        uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer); 
        resumeAllGameIntervals(); return; 
    }
    pauseAllGameIntervals(); gamePausedForLootChoice = true;
    currentActiveScreenElement = lootChoiceScreen;
    applyMusicPlayStateWrapper();
    lootChoiceScreen.querySelector('h2').textContent = "Salvaged Technology!"; 
    lootChoiceScreen.querySelector('p').textContent = "Choose one permanent upgrade:";
    populateLootOptionsUI( choices, player, selectLootUpgradeInternal, ALL_POSSIBLE_RAY_COLORS, getReadableColorNameFromUtils );
    showScreen(lootChoiceScreen, true, gameScreenCallbacks);
}

function selectLootUpgradeInternal(chosenUpgrade) { 
    if (!player || !chosenUpgrade) return;
     if (chosenUpgrade.apply) chosenUpgrade.apply(chosenUpgrade.chosenColors || chosenUpgrade.chosenColor);
     if (player && chosenUpgrade.id) {
        if(chosenUpgrade.type === 'ability_mouse') {
            if (chosenUpgrade.id === 'omegaLaser') player.hasOmegaLaser = true;
            if (chosenUpgrade.id === 'shieldOvercharge') player.hasShieldOvercharge = true;
        } else if (chosenUpgrade.type === 'ability' && chosenUpgrade.slot) {
            const slotStr = chosenUpgrade.slot;
            if (player.activeAbilities.hasOwnProperty(slotStr) && player.activeAbilities[slotStr] === null) {
                player.activeAbilities[slotStr] = {
                    id: chosenUpgrade.id,
                    cooldownTimer: 0,
                    cooldownDuration: chosenUpgrade.cooldown,
                    duration: chosenUpgrade.duration,
                    radius: chosenUpgrade.radius,
                    justBecameReady: true
                };
            } else {
                console.warn(`Slot ${slotStr} for ability ${chosenUpgrade.id} already taken or invalid.`);
            }
        } else if (chosenUpgrade.type !== 'ability') { 
             player.acquiredBossUpgrades.push(chosenUpgrade.id);
        }
     }

     gamePausedForLootChoice = false; 
     postPopupImmunityTimer = CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.75;
     currentActiveScreenElement = null;
     showScreen(null, false, gameScreenCallbacks);
     applyMusicPlayStateWrapper(); 
     lastTime = performance.now(); 
     if (!gameOver && !animationFrameId && gameRunning) animationFrameId = requestAnimationFrame(gameLoop);
     uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer);
     uiUpdateAbilityCooldownUI(player);

    if (evolutionPendingAfterBoss && (!bossManager || !bossManager.isBossInQueue())) {
        triggerEvolutionInternal();
    } else {
        resumeAllGameIntervals();
        if (bossManager && bossManager.isBossInQueue() && !bossManager.isBossWarningActiveProp() && !isAnyPauseActiveInternal()) {
            bossManager.triggerNextBossWarning({isAnyPauseActive: isAnyPauseActiveInternal});
        }
    }
}

function triggerFirstBossLootChoiceInternal() {
    if (!player) return;
    pauseAllGameIntervals(); gamePausedForLootChoice = true; 
    currentActiveScreenElement = lootChoiceScreen; 
    applyMusicPlayStateWrapper();

    const firstBossChoices = [
        { 
            id: 'perfectHarmony', type: 'path_buff', name: 'Path of Harmony', 
            description: `If no damage is taken for ${CONSTANTS.PERFECT_HARMONY_NO_DAMAGE_DURATION_THRESHOLD/1000}s: +${CONSTANTS.PERFECT_HARMONY_RAY_DAMAGE_BONUS*100}% all ray damage, +${CONSTANTS.PERFECT_HARMONY_SPEED_BONUS*100}% speed, abilities cool ${CONSTANTS.PERFECT_HARMONY_COOLDOWN_REDUCTION*100}% faster. Broken on damage. Grants the Priest's Circlet.` 
        },
        { 
            id: 'berserkersEcho', type: 'path_buff', name: 'Path of Fury', 
            description: `Per 10% missing Max HP: +${CONSTANTS.BERSERKERS_ECHO_DAMAGE_PER_10_HP*100}% normal ray damage & +${CONSTANTS.BERSERKERS_ECHO_SPEED_PER_10_HP*100}% speed. Grants the Berserker's Helm.`
        },
        { 
            id: 'ultimateConfiguration', type: 'path_buff', name: 'Path of Power (Offense)', 
            description: `Omega Laser Dmg x2, Mini-Well Launched Rays +100% Dmg. Numbered Ability Cooldowns +50%. Grants the Wizard's Hat.`
        }
    ];

    lootChoiceScreen.querySelector('h2').textContent = "Forge Your Path!";
    lootChoiceScreen.querySelector('p').textContent = "The first trial overcome. Choose a defining power for this journey (this choice is permanent):";
    populateLootOptionsUI( firstBossChoices, player, selectFirstPathBuffInternal, ALL_POSSIBLE_RAY_COLORS, getReadableColorNameFromUtils );
    showScreen(lootChoiceScreen, true, gameScreenCallbacks);
}

function selectFirstPathBuffInternal(chosenPathBuff) {
    if (!player || !chosenPathBuff) return;
    
    if (chosenPathBuff.id === 'perfectHarmony') {
        player.hasPerfectHarmonyHelm = true;
        activeBuffNotifications.push({ text: "Path of Harmony Chosen!", timer: CONSTANTS.BUFF_NOTIFICATION_DURATION });
    } else if (chosenPathBuff.id === 'berserkersEcho') {
        player.hasBerserkersEchoHelm = true;
        activeBuffNotifications.push({ text: "Path of Fury Chosen!", timer: CONSTANTS.BUFF_NOTIFICATION_DURATION });
    } else if (chosenPathBuff.id === 'ultimateConfiguration') {
        player.hasUltimateConfigurationHelm = true; 
        activeBuffNotifications.push({ text: "Path of Power (Offense) Chosen!", timer: CONSTANTS.BUFF_NOTIFICATION_DURATION });
    }

    gamePausedForLootChoice = false; 
    postPopupImmunityTimer = CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.75;
    currentActiveScreenElement = null;
    showScreen(null, false, gameScreenCallbacks);
    applyMusicPlayStateWrapper(); 
    lastTime = performance.now(); 
    if (!gameOver && !animationFrameId && gameRunning) animationFrameId = requestAnimationFrame(gameLoop);
    uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer);
    uiUpdateAbilityCooldownUI(player); 

    if (evolutionPendingAfterBoss && (!bossManager || !bossManager.isBossInQueue())) {
        triggerEvolutionInternal();
    } else {
        resumeAllGameIntervals();
        if (bossManager && bossManager.isBossInQueue() && !bossManager.isBossWarningActiveProp() && !isAnyPauseActiveInternal()) {
            bossManager.triggerNextBossWarning({isAnyPauseActive: isAnyPauseActiveInternal});
        }
    }
}

function createFinalStatsSnapshot() {
    if (!player) {
        return { playerData: { damageTakenMultiplier: 1.0, baseRadius: CONSTANTS.PLAYER_BASE_RADIUS, finalRadius: CONSTANTS.PLAYER_BASE_RADIUS, scoreSizeFactor: currentEffectiveDefaultGrowthFactor, scoreOffsetForSizing: 0, scoreBasedSizeActual: 0, kineticConversionLevelSnapshot: 0, maxHp: CONSTANTS.PLAYER_MAX_HP, currentSpeed: CONSTANTS.PLAYER_SPEED_BASE, timesHit:0, totalDamageDealt:0, immuneColorsList:[], activeAbilities:{}, formattedActiveAbilities:[], formattedMouseAbilities:[], displayedUpgrades:[], pathBuff: null }, bossTierData: { chaser: 0, reflector: 0, singularity: 0 }, gameplayTimeData: gameplayTimeElapsed };
    }

    player.baseRadius = player.initialBaseRadius + player.bonusBaseRadius;
    let determinedScoreSizeFactor = (typeof currentPlayerRadiusGrowthFactor === 'number' && !isNaN(currentPlayerRadiusGrowthFactor)) ? currentPlayerRadiusGrowthFactor : currentEffectiveDefaultGrowthFactor;
    if (determinedScoreSizeFactor === 0 && player.scoreBasedSize > 0) determinedScoreSizeFactor = currentEffectiveDefaultGrowthFactor;
    else if (determinedScoreSizeFactor === 0 && player.scoreBasedSize === 0) determinedScoreSizeFactor = 0;
    if (typeof determinedScoreSizeFactor !== 'number' || isNaN(determinedScoreSizeFactor)) determinedScoreSizeFactor = 0.000;

    let pathBuffName = null;
    if(player.hasPerfectHarmonyHelm) pathBuffName = "Path of Harmony";
    else if(player.hasBerserkersEchoHelm) pathBuffName = "Path of Fury";
    else if(player.hasUltimateConfigurationHelm) pathBuffName = "Path of Power (Offense)";

    const playerDataSnapshot = {
        baseRadius: player.baseRadius,
        finalRadius: player.radius,
        scoreSizeFactor: determinedScoreSizeFactor,
        scoreOffsetForSizing: player.scoreOffsetForSizing,
        scoreBasedSizeActual: player.scoreBasedSize,
        kineticConversionLevelSnapshot: player.kineticConversionLevel,
        damageTakenMultiplier: player.damageTakenMultiplier, 
        pathBuff: pathBuffName, 

        maxHp: player.maxHp, currentSpeed: player.currentSpeed,
        timesHit: player.timesHit, totalDamageDealt: player.totalDamageDealt,
        immuneColorsList: [...player.immuneColorsList],
        activeAbilities: JSON.parse(JSON.stringify(player.activeAbilities)),
        hasOmegaLaser: player.hasOmegaLaser, hasShieldOvercharge: player.hasShieldOvercharge,
        formattedActiveAbilities: getFormattedActiveAbilitiesForStats(player),
        formattedMouseAbilities: getFormattedMouseAbilitiesForStats(player),
        displayedUpgrades: prepareDisplayedUpgradesForStats(player) 
    };

    const bossTierSnapshot = bossManager ? { ...bossManager.bossTiers } : { chaser: 0, reflector: 0, singularity: 0 };
    return {
        playerData: playerDataSnapshot,
        bossTierData: bossTierSnapshot,
        gameplayTimeData: gameplayTimeElapsed,
    };
}

function getFormattedActiveAbilitiesForStats(p) { 
    if (!p || !p.activeAbilities) return []; 
    let fmt = []; 
    for (const s in p.activeAbilities) { 
        const a = p.activeAbilities[s]; 
        if (a) { 
            const d = bossLootPool.find(l => l.id === a.id && l.type === 'ability'); 
            if (d) { 
                let cdValue = a.cooldownDuration;
                if (p.hasUltimateConfigurationHelm) { 
                    cdValue *= 1.5;
                }
                let cd = (cdValue / 1000).toFixed(1) + 's'; 
                if (p.hasUltimateConfigurationHelm) cd += ' (Ult.Cfg)';
                if (a.duration) cd += ` (Dur: ${(a.duration / 1000).toFixed(1)}s)`; 
                fmt.push({name: d.name, slot: s, desc: cd});
            }
        }
    } 
    return fmt; 
}

function getFormattedMouseAbilitiesForStats(p) { if(!p) return []; let abs = []; if (p.hasOmegaLaser) abs.push({name: "Omega Laser", desc: `${(CONSTANTS.OMEGA_LASER_COOLDOWN/1000)}s CD`}); if (p.hasShieldOvercharge) abs.push({name: "Shield Overcharge", desc: `${(CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN/1000)}s CD`}); return abs; }

function prepareDisplayedUpgradesForStats(p) { 
    if (!p) return []; let list = [];

    const pathBuffToDisplay = p.pathBuff || (p.hasPerfectHarmonyHelm ? "Path of Harmony" : p.hasBerserkersEchoHelm ? "Path of Fury" : p.hasUltimateConfigurationHelm ? "Path of Power (Offense)" : null);
    if (pathBuffToDisplay) {
        list.push({ name: pathBuffToDisplay, description: "(Chosen Path)"});
    }

    evolutionChoices.forEach(e => {
        let currentEvoLevel = e.level || 0; 
        let displayThisUpgrade = false;
        let desc = "";

        if (e.id === 'kineticConversion') {
            currentEvoLevel = p.kineticConversionLevelSnapshot !== undefined ? p.kineticConversionLevelSnapshot : (p.kineticConversionLevel || 0);
            if (currentEvoLevel > 0) displayThisUpgrade = true;
        } else if (e.id === 'reinforcedHull') {
            const multiplier = p.damageTakenMultiplier !== undefined ? p.damageTakenMultiplier : (p.damageTakenMultiplierSnapshot !== undefined ? p.damageTakenMultiplierSnapshot : 1.0);
            if (multiplier < 1.0) { 
                desc = `${((1 - multiplier) * 100).toFixed(1)}%`; 
                displayThisUpgrade = true; 
            }
        } else if (currentEvoLevel > 0) { 
            displayThisUpgrade = true;
        }

        if (displayThisUpgrade) {
            if (!desc) { 
                if (e.id === 'colorImmunity') desc = `${(p.immuneColorsList || []).length} colors`;
                else if (e.id === 'smallerPlayer') desc = `Lvl ${currentEvoLevel} (Effective Size)`;
                else if (e.id === 'vitalitySurge') desc = `+${p.hpRegenBonusFromEvolution || 0} HP/tick`;
                else if (e.id === 'kineticConversion') {
                    const KCL = currentEvoLevel; 
                    const initialBonus = p.initialKineticDamageBonus !== undefined ? p.initialKineticDamageBonus : CONSTANTS.KINETIC_INITIAL_DAMAGE_BONUS;
                    const additionalPerLevel = p.additionalKineticDamageBonusPerLevel !== undefined ? p.additionalKineticDamageBonusPerLevel : CONSTANTS.KINETIC_ADDITIONAL_DAMAGE_PER_LEVEL;
                    const baseRate = p.baseKineticChargeRate !== undefined ? p.baseKineticChargeRate : CONSTANTS.KINETIC_BASE_CHARGE_RATE;
                    const ratePerLevel = p.kineticChargeRatePerLevel !== undefined ? p.kineticChargeRatePerLevel : CONSTANTS.KINETIC_CHARGE_RATE_PER_LEVEL;

                    const maxPotency = initialBonus + (Math.max(0, KCL - 1) * additionalPerLevel);
                    const chargeRate = baseRate + (KCL * ratePerLevel);
                    desc = `Max Dmg +${(maxPotency*100).toFixed(0)}%, Rate ${chargeRate.toFixed(2)}/s`;
                }
                else if (e.id === 'systemOvercharge') desc = `${Math.round((p.evolutionIntervalModifier || 1.0)*100)}% Interval`;
                else if (e.id === 'temporalEcho') desc = `${Math.round((p.temporalEchoChance || 0)*100)}% Echo`;
                else if (e.id === 'focusedBeam') desc = `+${p.rayDamageBonus || 0} Dmg`;
                else if (e.id === 'unstableCore') desc = `${Math.round((p.chainReactionChance || 0) * 100)}% AOE Chance`;
                else if (e.id === 'abilityPotency') desc = `${Math.round((p.abilityDamageMultiplier || 1.0)*100)}% Dmg`;
                else if (e.id === 'maxHpIncrease') desc = `+${currentEvoLevel * 10} Max HP`; 
                else if (e.id === 'abilityCooldownReduction') desc = `Applied ${currentEvoLevel}x`;
            }
            
            if (desc) {
                let nameToDisplay = e.text.replace(/\s\(Lvl.*/, ''); 
                list.push({ name: nameToDisplay, description: desc });
            }
        }
    });
    
    if (p.acquiredBossUpgrades) {
        p.acquiredBossUpgrades.forEach(id => { 
            const upg = bossLootPool.find(u => u.id === id); 
            if (upg) { 
                let d = `(${upg.type.charAt(0).toUpperCase() + upg.type.slice(1)})`; 
                if (upg.id === 'adaptiveShield') d = "(Color Immunities)"; 
                else if (upg.type === 'ability' || upg.type === 'ability_mouse') return; 
                list.push({ name: upg.name, description: d });
            }
        });
    }
    if (p.pickupAttractionRadius > 0) list.push({name: "Pickup Attraction", description: `Radius ${p.pickupAttractionRadius.toFixed(0)}`});
    if (p.scatterShotLevel > 0) list.push({name: "Scatter Shot", description: `Lvl ${p.scatterShotLevel +1}`});
    if (p.ownRaySpeedMultiplier > 1.0) list.push({name: "Ray Velocity", description: `${p.ownRaySpeedMultiplier.toFixed(1)}x`});
    if (p.hasTargetPierce) list.push({name: "Target Pierce", description: "Active"});
    return list;
}

function prepareAndShowPauseStats(title) {
    const statsSnapshot = createFinalStatsSnapshot();
    updatePauseScreenStatsDisplay( 
        statsSnapshot,
        getReadableColorNameFromUtils,
        title
    );
}

function showDetailedHighScores() {
    const highScoresData = getHighScores();
    pauseAllGameIntervals();
    currentActiveScreenElement = detailedHighScoresScreen;
    applyMusicPlayStateWrapper();
    displayDetailedHighScoresScreenUI(
        highScoresData,
        (statsSnapshotFromStorage, entryName) => {
            if (statsSnapshotFromStorage && pausePlayerStatsPanel && detailedHighScoresScreen.querySelector('#detailedStatsDisplayContainer')) {
                updatePauseScreenStatsDisplay(
                    statsSnapshotFromStorage,
                    getReadableColorNameFromUtils,
                    `Stats for ${entryName}`
                );
                const container = detailedHighScoresScreen.querySelector('#detailedStatsDisplayContainer');
                if (container && pausePlayerStatsPanel.parentElement !== container) {
                    container.innerHTML = '';
                    container.appendChild(pausePlayerStatsPanel);
                }
                if(pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'block';
                if(pausePlayerStatsPanel) pausePlayerStatsPanel.scrollTop = 0;
            } else {
                if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';
            }
        },
        () => {
            if (pausePlayerStatsPanel && pausePlayerStatsPanel.parentElement !== document.body) {
                 document.body.appendChild(pausePlayerStatsPanel);
            }
            if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';
            showStartScreenWithUpdatesInternal();
        }
    );
    showScreen(detailedHighScoresScreen, false, gameScreenCallbacks);
}

const gameScreenCallbacks = {
    onPauseGame: (screenElem) => {
        currentActiveScreenElement = screenElem;
        pauseAllGameIntervals();
        if(screenElem === evolutionScreen) gamePausedForEvolution = true;
        else if(screenElem === freeUpgradeScreen) gamePausedForFreeUpgrade = true;
        else if(screenElem === lootChoiceScreen) gamePausedForLootChoice = true;
        else if(screenElem === pauseScreen) gamePausedByEsc = true;
        else if (screenElem === detailedHighScoresScreen) { /* Handled */ }
        applyMusicPlayStateWrapper();
    },
    onResumeGame: (screenElem) => {
        currentActiveScreenElement = screenElem;
        gamePausedForEvolution = false;
        gamePausedForFreeUpgrade = false;
        gamePausedForLootChoice = false;
        if (!gamePausedByEsc && !isCountingDownToResume) resumeAllGameIntervals();
        lastTime = performance.now();
        applyMusicPlayStateWrapper();
    },
    onApplyMusicPlayState: (screenElem) => {
        currentActiveScreenElement = screenElem;
        applyMusicPlayStateWrapper();
    }
};
function isAnyPauseActiveInternal() { return gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedByEsc || isCountingDownToResume || gamePausedForLootChoice; }
function applyMusicPlayStateWrapper() {
    const isPausedForPopupLocal = gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedForLootChoice;
    applyMusicPlayState(
        gameOver,
        gameRunning,
        gamePausedByEsc || isCountingDownToResume,
        isPausedForPopupLocal,
        currentActiveScreenElement
    );
}

function showStartScreenWithUpdatesInternal() {
    gameRunning = false; gameOver = false; gamePausedByEsc = false; isCountingDownToResume = false;
    gamePausedForEvolution = false; gamePausedForFreeUpgrade = false; gamePausedForLootChoice = false;
    evolutionPendingAfterBoss = false;
    firstBossDefeatedThisRun = false; 
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    pauseAllGameIntervals();
    if (player && player.isFiringOmegaLaser) stopSound(omegaLaserSound);
    if (bossManager) bossManager.reset();

    if (pausePlayerStatsPanel) {
        if (pausePlayerStatsPanel.parentElement !== document.body) {
            document.body.appendChild(pausePlayerStatsPanel);
        }
        pausePlayerStatsPanel.style.display = 'none';
    }
    currentActiveScreenElement = startScreen;
    updateAllHighScoreDisplays();
    showScreen(startScreen, false, gameScreenCallbacks);
}

const audioDomElementsForInit = {
    bgMusic: document.getElementById('bgMusic'), soundToggleButton: document.getElementById('soundToggleButton'),
    musicVolumeSlider: document.getElementById('musicVolumeSlider'), musicVolumeValue: document.getElementById('musicVolumeValue'),
    shootVolumeSlider: document.getElementById('shootVolumeSlider'), shootVolumeValue: document.getElementById('shootVolumeValue'),
    hitVolumeSlider: document.getElementById('hitVolumeSlider'), hitVolumeValue: document.getElementById('hitVolumeValue'),
    pickupVolumeSlider: document.getElementById('pickupVolumeSlider'), pickupVolumeValue: document.getElementById('pickupVolumeValue'), 
    uiVolumeSlider: document.getElementById('uiVolumeSlider'), uiVolumeValue: document.getElementById('uiVolumeValue'),
};

// ---- MOVED getAbilityContextForPlayer to be defined before gameContextForEventListeners ----
const getAbilityContextForPlayer = () => {
    return {
        isAnyPauseActiveCallback: isAnyPauseActiveInternal,
        updateAbilityCooldownCallback: (p) => uiUpdateAbilityCooldownUI(p),
        decoysArray: decoys,
        bossDefeatEffectsArray: bossDefeatEffects,
        mouseX: mouseX,
        mouseY: mouseY,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        allRays: rays,
        screenShakeParams: {isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy},
        CONSTANTS: CONSTANTS,
        activeBuffNotificationsArray: activeBuffNotifications,
        evolutionChoices: evolutionChoices, 
        ui: { updateKineticChargeUI } 
    };
};

function debugForceSpawnBoss(bossIndexToForce = 0) {
    if (!gameRunning || isAnyPauseActiveInternal() || !bossManager || bossManager.activeBosses.length > 0 || bossManager.isBossWarningActiveProp()) {
        return;
    }
    if (score < (bossManager.bossSpawnStartScore || CONSTANTS.BOSS_SPAWN_START_SCORE) ) {
        score = (bossManager.bossSpawnStartScore || CONSTANTS.BOSS_SPAWN_START_SCORE);
        updateScoreDisplay(score);
    }
    bossManager.trySpawnBoss(score);
}

const gameContextForEventListeners = {
    inputState, getPlayerInstance: () => player, isGameRunning: () => gameRunning, isGameOver: () => gameOver,
    isAnyPauseActiveExceptEsc: () => gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedForLootChoice || isCountingDownToResume,
    isGamePausedByEsc: () => gamePausedByEsc, getBossManager: () => bossManager,
    getForPlayerAbilityContext: getAbilityContextForPlayer, 
    getActiveBuffNotificationsArray: () => activeBuffNotifications,
    callbacks: {
        startGame: initGame,
        showSettingsScreenFromStart: () => { setPreviousScreenForSettings(startScreen); currentActiveScreenElement = settingsScreen; showScreen(settingsScreen, false, gameScreenCallbacks); },
        viewDetailedHighScores: () => { currentActiveScreenElement = detailedHighScoresScreen; showDetailedHighScores(); },
        toggleSound: () => { toggleSoundEnabled(); applyMusicPlayStateWrapper(); },
        updateMusicVolume, updateSfxVolume: updateSpecificSfxVolume,
        goBackFromSettings: () => { const target = getPreviousScreenForSettings() || startScreen; currentActiveScreenElement = target; showScreen(target, target === pauseScreen, gameScreenCallbacks); if (target === pauseScreen && pausePlayerStatsPanel) { prepareAndShowPauseStats("Paused - Current Status"); if (pausePlayerStatsPanel.parentElement !== document.body) document.body.appendChild(pausePlayerStatsPanel); if (uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null) { const r = uiHighScoreContainer.getBoundingClientRect(); pausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px';} else pausePlayerStatsPanel.style.top = '20px'; pausePlayerStatsPanel.style.display = 'block';} else if(pausePlayerStatsPanel && target !== detailedHighScoresScreen) pausePlayerStatsPanel.style.display = 'none';},
        resumeGameFromPause: togglePauseMenu, 
        togglePauseMenu: togglePauseMenu,     
        showSettingsScreenFromPause: () => { setPreviousScreenForSettings(pauseScreen); currentActiveScreenElement = settingsScreen; showScreen(settingsScreen, true, gameScreenCallbacks); if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none'; },
        goToMainMenuFromPause: showStartScreenWithUpdatesInternal,
        onWindowResize: () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; inputState.mouseX = canvas.width / 2; inputState.mouseY = canvas.height / 2; mouseX = inputState.mouseX; mouseY = inputState.mouseY; if(player&&gameRunning){player.x=Math.max(player.radius,Math.min(player.x,canvas.width-player.radius));player.y=Math.max(player.radius,Math.min(player.y,canvas.height-player.radius));} if(gameRunning && !gameOver && !isAnyPauseActiveInternal()) drawGame(); if ((gamePausedByEsc || gameOver || (detailedHighScoresScreen && detailedHighScoresScreen.style.display === 'flex')) && pausePlayerStatsPanel && pausePlayerStatsPanel.style.display === 'block') { if (pausePlayerStatsPanel.parentElement === document.body && uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null && detailedHighScoresScreen.style.display !== 'flex') { const r = uiHighScoreContainer.getBoundingClientRect(); pausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px'; }  else if (pausePlayerStatsPanel.parentElement === document.body && detailedHighScoresScreen.style.display !== 'flex') { pausePlayerStatsPanel.style.top = '20px';}}},
        debugSpawnBoss: debugForceSpawnBoss
    }
};

initializeAudio(audioDomElementsForInit); 
setupEventListeners(canvas, gameContextForEventListeners);

document.addEventListener('DOMContentLoaded', () => {
    const viewHighScoresBtn = document.getElementById('viewHighScoresButton');
    if (viewHighScoresBtn) {
        const newBtn = viewHighScoresBtn.cloneNode(true);
        viewHighScoresBtn.parentNode.replaceChild(newBtn, viewHighScoresBtn);
        newBtn.addEventListener('click', () => gameContextForEventListeners.callbacks.viewDetailedHighScores());
    }
    showStartScreenWithUpdatesInternal();
});