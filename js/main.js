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
    detailedHighScoresScreen,
    updateScoreDisplay, updateHealthDisplay as uiUpdateHealthDisplay,
    updateBuffIndicator as uiUpdateBuffIndicator,
    updateSurvivalBonusIndicator as uiUpdateSurvivalBonusIndicator,
    updateActiveBuffIndicator as uiUpdateActiveBuffIndicator,
    displayHighScores,
    updateAbilityCooldownUI as uiUpdateAbilityCooldownUI,
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
let lootDrops = []; let decoys = []; let bossManager = null;
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
let evolutionChoices = []; let bossLootPool = []; let freeUpgradeChoicesData = [];


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
function initEvolutionChoicesInternal() {
    evolutionChoices = [
        {id:'colorImmunity', classType: 'tank', text:"Chameleon Plating", level:0, maxLevel: ALL_POSSIBLE_RAY_COLORS.length - CONSTANTS.INITIAL_RAY_COLORS.length, detailedDescription: "Gain immunity to a new random ray color each time this is chosen. Protects against rays of that specific color.", isMaxed:function(p){return !p||p.immuneColorsList.length>=ALL_POSSIBLE_RAY_COLORS.length || this.level >= this.maxLevel;}, apply:function(){if(!player)return"";const a=ALL_POSSIBLE_RAY_COLORS.filter(c=>!player.immuneColorsList.includes(c));if(a.length>0){const r=a[Math.floor(Math.random()*a.length)];player.immuneColorsList.push(r);uiUpdateBuffIndicator(player.immuneColorsList, getReadableColorNameFromUtils); this.level++; return`Now immune to <span style="color:${r};text-shadow:0 0 3px black;font-weight:bold;">${getReadableColorNameFromUtils(r)}</span> rays!`;}return"No new colors left!";}, getEffectString: function() { return `Immune to ${player?player.immuneColorsList.length:0} colors`;}},
        {id:'smallerPlayer', classType: 'tank', text:"Evasive Maneuver", level:0, detailedDescription: "Become smaller, making you harder to hit. Also reduces how much your size increases with score.", isMaxed:function(p){ if (!p) return true; return shrinkMeCooldown > 0; }, apply:function(){if(!player)return"";player.baseRadius=Math.max(CONSTANTS.MIN_PLAYER_BASE_RADIUS,player.baseRadius/2);player.radius=player.baseRadius;currentPlayerRadiusGrowthFactor=0;currentEffectiveDefaultGrowthFactor=Math.max(0.001,currentEffectiveDefaultGrowthFactor/2);shrinkMeCooldown=3; this.level++;return"Base size & growth halved! (Next 2 Evos CD)";}, getEffectString: function() { return `Size reduced!`;}},
        {id:'reinforcedHull', classType: 'tank', text:"Reinforced Hull", level:0, maxLevel:Math.round(CONSTANTS.MAX_DAMAGE_REDUCTION/CONSTANTS.DAMAGE_REDUCTION_PER_LEVEL), detailedDescription: `Reduces all incoming damage by ${CONSTANTS.DAMAGE_REDUCTION_PER_LEVEL*100}% per level. Max ${CONSTANTS.MAX_DAMAGE_REDUCTION*100}%.`, isMaxed:function(p){return p && p.damageReductionFactor >= CONSTANTS.MAX_DAMAGE_REDUCTION || this.level >= this.maxLevel;}, apply:function(){if(!player) return""; player.damageReductionFactor = Math.min(CONSTANTS.MAX_DAMAGE_REDUCTION, player.damageReductionFactor + CONSTANTS.DAMAGE_REDUCTION_PER_LEVEL); this.level++; return `Damage reduction now ${Math.round(player.damageReductionFactor * 100)}%!`;}, getEffectString: function() { return `${Math.round((player?player.damageReductionFactor:0) * 100)}% Dmg Reduction`;}},
        {id:'vitalitySurge', classType: 'tank', text:"Vitality Surge", level:0, maxLevel:Math.round(CONSTANTS.MAX_HP_REGEN_BONUS_EVOLUTION/CONSTANTS.HP_REGEN_BONUS_PER_LEVEL_EVOLUTION), detailedDescription: `Increases passive health regeneration by ${CONSTANTS.HP_REGEN_BONUS_PER_LEVEL_EVOLUTION} HP per tick when out of combat.`, isMaxed:function(p){return p && p.hpRegenBonusFromEvolution >= CONSTANTS.MAX_HP_REGEN_BONUS_EVOLUTION || this.level >= this.maxLevel;}, apply:function(){if(!player) return""; player.hpRegenBonusFromEvolution += CONSTANTS.HP_REGEN_BONUS_PER_LEVEL_EVOLUTION; this.level++; return `Passive HP regen now +${player.hpRegenBonusFromEvolution} HP per tick!`;}, getEffectString: function() { return `+${player?player.hpRegenBonusFromEvolution:0} HP/tick Regen`;}},
        {id:'slowRays', classType: 'utility', text:"Field Disruption", level:0, detailedDescription: `Permanently slows all environmental rays by an additional ${((1-CONSTANTS.SLOW_RAYS_REDUCTION_FACTOR)*100).toFixed(0)}% of their current speed each level. Diminishing returns apply.`, isMaxed:function(p){ return currentRaySpeedMultiplier <= CONSTANTS.MIN_RAY_SPEED_MULTIPLIER_AFTER_SLOW * 1.01;}, apply:function(){currentRaySpeedMultiplier=Math.max(CONSTANTS.MIN_RAY_SPEED_MULTIPLIER_AFTER_SLOW, currentRaySpeedMultiplier * CONSTANTS.SLOW_RAYS_REDUCTION_FACTOR);this.level++;return `Environmental ray speed multiplier reduced! (${currentRaySpeedMultiplier.toFixed(2)}x)`;}, getEffectString: function() { return `Env. Ray Speed: ${currentRaySpeedMultiplier.toFixed(2)}x`;}},
        {id:'systemOvercharge', classType: 'utility', text:"System Overcharge", level:0, maxLevel:4, detailedDescription: "Reduces the score needed between evolutions by 7.5% per level. Max 30% reduction.", isMaxed:function(p){return p && p.evolutionIntervalModifier <= 0.70 || this.level >= this.maxLevel;}, apply:function(){if(!player) return""; player.evolutionIntervalModifier = Math.max(0.70, player.evolutionIntervalModifier - 0.075); this.level++; return `Evolution interval now ${Math.round(player.evolutionIntervalModifier * 100)}%!`;}, getEffectString: function() { return `Evo Interval: ${player?Math.round(player.evolutionIntervalModifier*100):100}%`;}},
        {id:'enhancedRegen', classType: 'utility', text:"Enhanced Regeneration", level:0, maxLevel:Math.round(CONSTANTS.MAX_HP_PICKUP_BONUS/CONSTANTS.HP_PICKUP_BONUS_PER_LEVEL), detailedDescription: `HP pickups restore an additional ${CONSTANTS.HP_PICKUP_BONUS_PER_LEVEL} health per level.`, isMaxed:function(p){return p && p.hpPickupBonus >= CONSTANTS.MAX_HP_PICKUP_BONUS || this.level >= this.maxLevel;}, apply:function(){if(!player) return""; player.hpPickupBonus += CONSTANTS.HP_PICKUP_BONUS_PER_LEVEL; this.level++; return `HP pickups +${player.hpPickupBonus} HP!`;}, getEffectString: function() { return `HP Pickups +${player?player.hpPickupBonus:0} HP`;}},
        {id:'focusedBeam', classType: 'attack', text:"Focused Beam", level:0, maxLevel: 999 , detailedDescription: "Increases the damage of your rays by +1 per level.", isMaxed:function(p){return false;}, apply:function(){if(!player) return""; player.rayDamageBonus++; this.level++; return `Ray damage now +${player.rayDamageBonus}!`;}, getEffectString: function() { return `+${player?player.rayDamageBonus:0} Ray Damage`;}},
        {id:'unstableCore', classType: 'attack', text:"Unstable Core", level:0, maxLevel:Math.round(CONSTANTS.MAX_CHAIN_REACTION_CHANCE/0.05), detailedDescription: `Gives your rays a 5% chance per level to cause a chain reaction explosion when destroying a target. Max ${CONSTANTS.MAX_CHAIN_REACTION_CHANCE*100}%.`, isMaxed:function(p){return p && p.chainReactionChance >= CONSTANTS.MAX_CHAIN_REACTION_CHANCE || this.level >= this.maxLevel;}, apply:function(){if(!player) return""; player.chainReactionChance = Math.min(CONSTANTS.MAX_CHAIN_REACTION_CHANCE, player.chainReactionChance + 0.05); this.level++; return `Chain reaction ${Math.round(player.chainReactionChance * 100)}%!`;}, getEffectString: function() { return `${Math.round((player?player.chainReactionChance:0) * 100)}% Chain Chance`;}},
        {id:'heavyImpact', classType: 'attack', text:"Heavy Impact", level:0, maxLevel:Math.round(CONSTANTS.MAX_STUN_CHANCE_BONUS/CONSTANTS.STUN_CHANCE_PER_LEVEL), detailedDescription: `Increases the chance for your rays to briefly stun bosses by ${CONSTANTS.STUN_CHANCE_PER_LEVEL*100}% per level. Max +${CONSTANTS.MAX_STUN_CHANCE_BONUS*100}%.`, isMaxed:function(p){return p && p.bossStunChanceBonus >= CONSTANTS.MAX_STUN_CHANCE_BONUS || this.level >= this.maxLevel;}, apply:function(){if(!player) return""; player.bossStunChanceBonus = Math.min(CONSTANTS.MAX_STUN_CHANCE_BONUS, player.bossStunChanceBonus + CONSTANTS.STUN_CHANCE_PER_LEVEL); this.level++; return `Boss stun chance bonus +${Math.round(player.bossStunChanceBonus*100)}%!`;}, getEffectString: function() { return `+${Math.round((player?player.bossStunChanceBonus:0)*100)}% Boss Stun`;}},
        {
            id: 'maxHpIncrease', classType: 'tank', text: "Fortified Core", level: 0, maxLevel: 999,
            detailedDescription: "Permanently increases your Maximum HP by 5.",
            isMaxed: function(p) { return false; },
            apply: function() { if (!player) return ""; player.maxHp += 5; player.gainHealth(5, (hp, maxHp) => uiUpdateHealthDisplay(hp,maxHp)); this.level++; return `Maximum HP increased by 5! (Now ${player.maxHp})`; },
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
         { id: 'phaseStabilizers', type: 'gear', name: 'Dapper Phasing Hat', description: 'A stylish hat! Also, 15% chance for your rays to pass through walls.', apply: () => { if(player) player.visualModifiers.phaseStabilizers = true; } },
         { id: 'serratedNanites', type: 'gear', name: 'Serrated Nanites', description: 'Your rays apply a stacking bleed (5% damage/tick) to Bosses for 3s.', apply: () => { if(player) player.visualModifiers.serratedNanites = true; player.bleedOnHit = true; } },
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


// --- (Interval/Spawning, initGame, gameLoop, updateGame, drawGame, endGameInternal, togglePauseMenuInternal, startResumeCountdownInternal - SAME AS PREVIOUS FULL FILE with the ray.js callback fix) ---
// ... (Interval and Spawning Logic - SAME AS PREVIOUS FULL FILE) ...
function pausePickupSpawners() {
    if (targetSpawnIntervalId) clearInterval(targetSpawnIntervalId); targetSpawnIntervalId = null;
    if (heartSpawnIntervalId) clearInterval(heartSpawnIntervalId); heartSpawnIntervalId = null;
    if (bonusPointSpawnIntervalId) clearInterval(bonusPointSpawnIntervalId); bonusPointSpawnIntervalId = null;
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
function pauseAllGameIntervals() {
    if (shootIntervalId) clearInterval(shootIntervalId); shootIntervalId = null;
    pausePickupSpawners();
}
function resumeAllGameIntervals() {
    if (gameRunning && !isAnyPauseActiveInternal() && !gameOver) {
        resumePickupSpawners();
        if (!shootIntervalId && player) {
            updateShootInterval();
        }
    }
}
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

// --- Game Initialization ---
// js/main.js
// ... (imports and other code remain the same) ...

// --- Game Initialization ---
function initGame() {
    console.log("initGame called"); // DEBUG: Confirm it's being called

    // --- Core Game State Reset ---
    gameRunning = true;
    gameOver = false;
    score = 0;
    updateScoreDisplay(score); // UI update

    gamePausedForEvolution = false;
    gamePausedForFreeUpgrade = false;
    gamePausedByEsc = false;
    isCountingDownToResume = false;
    gamePausedForLootChoice = false;
    evolutionPendingAfterBoss = false;
    shrinkMeCooldown = 0;

    lootDrops = [];
    decoys = [];
    bossDefeatEffects = [];
    rays = []; // Clear existing rays
    targets = [];
    hearts = [];
    bonusPoints = [];
    activeBuffNotifications = [];

    gameplayTimeElapsed = 0;
    shootIntervalUpdateTimer = 0;

    // --- Player Related Resets (needs to happen BEFORE new Player instance if re-using) ---
    // It's often cleaner to always create a new Player instance for a full reset.
    // If you were re-using the 'player' object, you'd reset all its properties here.
    // But since we do `player = new Player(...)`, many are reset by the constructor.

    // --- Ray Speed and Behavior Resets ---
    currentRaySpeedMultiplier = 1.0; // CRITICAL: Reset ray speed multiplier
    _currentRayMaxLifetime = CONSTANTS.BASE_RAY_MAX_LIFETIME; // Reset ray lifetime

    // --- Color Unlocks ---
    currentRayColors = [...CONSTANTS.INITIAL_RAY_COLORS]; // Reset to initial colors
    nextColorUnlockScore = CONSTANTS.NEW_COLOR_UNLOCK_INTERVAL;
    nextUnlockableColorIndex = 0;

    // --- Immunity Timers ---
    postPopupImmunityTimer = 0;
    postDamageImmunityTimer = 0;

    // --- Survival Bonus ---
    survivalUpgrades = 0;
    currentSurvivalPointsInterval = CONSTANTS.BASE_SURVIVAL_POINTS_INTERVAL;
    survivalScoreThisCycle = 0;
    survivalPointsTimer = 0;

    // --- Player Growth ---
    currentEffectiveDefaultGrowthFactor = CONSTANTS.DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR;
    currentPlayerRadiusGrowthFactor = currentEffectiveDefaultGrowthFactor;

    // --- Create or Reset Player ---
    player = new Player(canvas.width / 2, canvas.height / 2, CONSTANTS.PLAYER_SPEED_BASE);
    // Player constructor already sets many defaults, but explicitly reset things that might persist
    // or are configured by evolutions/loot from a previous game.
    player.hp = CONSTANTS.PLAYER_MAX_HP;
    player.maxHp = CONSTANTS.PLAYER_MAX_HP;
    player.immuneColorsList = []; // Already handled by new Player
    player.baseRadius = CONSTANTS.PLAYER_BASE_RADIUS; // Handled by new Player
    player.radius = player.baseRadius; // Handled by new Player
    player.velX = 0; player.velY = 0; // Handled by new Player
    player.pickupAttractionLevel = 0;
    player.pickupAttractionRadius = CONSTANTS.BASE_PICKUP_ATTRACTION_RADIUS;
    player.evolutionIntervalModifier = 1.0; // Reset evolution speed
    player.rayDamageBonus = 0;
    player.hasTargetPierce = false;
    player.chainReactionChance = 0.0;
    player.scatterShotLevel = 0;
    player.ownRaySpeedMultiplier = 1.0; // CRITICAL: Reset player's ray speed bonus
    player.damageReductionFactor = 0.0;
    player.hpPickupBonus = 0;
    player.bossStunChanceBonus = 0.0;
    player.timeSinceLastHit = Number.MAX_SAFE_INTEGER; // To allow immediate regen if conditions met
    player.hpRegenTimer = 0;
    player.hpRegenBonusFromEvolution = 0;
    player.acquiredBossUpgrades = []; // Clear previously acquired boss loot
    player.activeAbilities = { '1': null, '2': null, '3': null }; // Reset fixed slot abilities
    player.visualModifiers = {}; // Clear visual mods
    player.bleedOnHit = false;
    player.momentumDamageBonus = 0;
    player.bossDamageReduction = 0;
    player.teleporting = false; player.teleportEffectTimer = 0;
    player.activeMiniWell = null;
    player.timesHit = 0;
    player.totalDamageDealt = 0;
    player.hasShieldOvercharge = false; // Reset mouse abilities
    player.isShieldOvercharging = false;
    player.shieldOverchargeTimer = 0;
    player.shieldOverchargeCooldownTimer = 0;
    player.hasOmegaLaser = false;
    player.isFiringOmegaLaser = false;
    player.omegaLaserTimer = 0;
    player.omegaLaserCooldownTimer = 0;
    player.currentSpeed = CONSTANTS.PLAYER_SPEED_BASE; // Ensure player speed is reset


    // --- Re-initialize Data Pools & UI ---
    initializeAllPossibleRayColors(); // In case it was modified (though it shouldn't be)
    initializeRayPool(Ray); // Re-initialize the ray pool
    initEvolutionChoicesInternal(); // Reset evolution choice levels/states
    populateBossLootPoolInternal(); // In case descriptions or availability changed (unlikely here but good practice)
    initFreeUpgradeChoicesInternal(); // Reset free upgrade states

    uiUpdateHealthDisplay(player.hp, player.maxHp);
    uiUpdateBuffIndicator(player.immuneColorsList, getReadableColorNameFromUtils);
    uiUpdateSurvivalBonusIndicator(survivalUpgrades, CONSTANTS.MAX_SURVIVAL_UPGRADES);
    uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer);
    uiUpdateAbilityCooldownUI(player); // Update for locked/unlocked states

    if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';

    // --- Boss Manager Reset ---
    const bossManagerAudioContext = { playSound, audioChaserSpawnSound, audioReflectorSpawnSound, audioSingularitySpawnSound };
    bossManager = new BossManager(CONSTANTS.BOSS_SPAWN_START_SCORE, CONSTANTS.BOSS_SPAWN_SCORE_INTERVAL, bossManagerAudioContext);
    // bossManager.reset(); // The constructor effectively resets it, but an explicit reset method is also good.

    // --- Timers and Intervals ---
    lastEvolutionScore = 0; // Reset score tracking for evolutions
    currentShootInterval = CONSTANTS.BASE_RAY_SHOOT_INTERVAL; // Reset shoot interval
    lastSetShootInterval = CONSTANTS.BASE_RAY_SHOOT_INTERVAL;

    pauseAllGameIntervals(); // Clear any lingering intervals
    resumeAllGameIntervals(); // Start new game intervals
    updateShootInterval(); // Set the initial shoot interval correctly

    // --- Final Setup ---
    applyMusicPlayStateWrapper();
    spawnTarget(); // Spawn initial target
    lastTime = performance.now();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
    updateAllHighScoreDisplays(); // Refresh high score display (though not strictly necessary on game start)
    showScreen(null, false, gameScreenCallbacks); // Ensure game canvas is shown
}

// --- Game Loop Core ---
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
        if (player && checkCollision(player, loot)) { const choices = loot.upgradeChoices; lootDrops.splice(i, 1); playSound(lootPickupSound); triggerLootChoiceInternal(choices); break; }
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
                if (player && player.activeAbilities) {
                    for (const slot in player.activeAbilities) { // Check if the detonated well was tied to a numbered ability
                        if (player.activeAbilities[slot] && player.activeAbilities[slot].id === 'miniGravityWell' && player.activeMiniWell === null) { // If it was player's main well
                            player.activeAbilities[slot].cooldownTimer = player.activeAbilities[slot].cooldownDuration;
                             gameContextForEventListeners.callbacks.forceAbilityUIUpdate = true; // Signal UI update
                            break; 
                        }
                    }
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
                dt: deltaTime,
                keys: inputState.keys,
                mouseX: mouseX,
                mouseY: mouseY,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                targets: targets,
                activeBosses: bossManager ? bossManager.activeBosses : [],
                currentGrowthFactor: currentPlayerRadiusGrowthFactor,
                score: score,
                updateHealthDisplayCallback: (currentHp, maxHp) => uiUpdateHealthDisplay(currentHp, maxHp),
                updateAbilityCooldownCallback: (pInst) => uiUpdateAbilityCooldownUI(pInst), // This will now be called more frequently
                isAnyPauseActiveCallback: isAnyPauseActiveInternal,
                decoysArray: decoys,
                bossDefeatEffectsArray: bossDefeatEffects,
                allRays: rays,
                screenShakeParams: {isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy},
                activeBuffNotificationsArray: activeBuffNotifications,
                CONSTANTS, // Pass the whole constants object
                endGameCallback: endGameInternal,
                updateScoreCallback: (amount) => { score += amount; updateScoreDisplay(score); checkForNewColorUnlock(); },
                forceAbilityUIUpdate: false 
            };
            player.update(playerUpdateContext);
        }

        if (bossManager && !gameOver) {
            const contextForBossMan = {
                dt: deltaTime,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                isAnyPauseActive: isAnyPauseActiveInternal,
                allRays: rays,
                screenShakeParams: { isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy },
                bossDefeatEffectsArray: bossDefeatEffects,
                lootDropsArray: lootDrops,
                bossLootPool,
                score,
                evolutionPendingAfterBossRef: { get: () => evolutionPendingAfterBoss, set: (val) => evolutionPendingAfterBoss = val },
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
                                postPopupImmunityTimer: postPopupImmunityTimer,
                                postDamageImmunityTimer: postDamageImmunityTimer,
                                score: score,
                                updateScoreCallback: (amt) => { score += amt; updateScoreDisplay(score); checkForNewColorUnlock(); },
                                checkForNewColorCallback: checkForNewColorUnlock,
                                endGameCallback: endGameInternal,
                                updateHealthDisplayCallback: (hp, maxHp) => uiUpdateHealthDisplay(hp, maxHp)
                            };
                            const currentTakeDamageDamageContext = { 
                                screenShakeParams: { 
                                    isScreenShaking: isScreenShaking,
                                    screenShakeTimer: screenShakeTimer,
                                    currentShakeMagnitude: currentShakeMagnitude,
                                    currentShakeType: currentShakeType,
                                    hitShakeDx: hitShakeDx,
                                    hitShakeDy: hitShakeDy
                                }
                            };
                            const damageTaken = player.takeDamage( null,  currentTakeDamageGameContext, currentTakeDamageDamageContext );
                            if (damageTaken > 0) {
                                postDamageImmunityTimer = CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION;
                                const bounceAngle = Math.atan2(player.y - collidedBoss.y, player.x - collidedBoss.x);
                                player.velX = Math.cos(bounceAngle) * CONSTANTS.PLAYER_BOUNCE_FORCE_FROM_BOSS;
                                player.velY = Math.sin(bounceAngle) * CONSTANTS.PLAYER_BOUNCE_FORCE_FROM_BOSS;
                            }
                        }
                    }
                },
                CONSTANTS, getPooledRay,
            };
            bossManager.update(player, contextForBossMan);
        }

        // Ray updates
        for (let i = rays.length - 1; i >= 0; i--) {
            const r = rays[i];
            if (r.isActive) {
                const rayUpdateContext = {
                    dt: deltaTime,
                    player,
                    decoys,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height,
                    stopSound,
                    gravityWellChargeSound,
                    CONSTANTS,
                    detonateGravityWell: (gRayInst) => {
                        if (gRayInst.gravityWellTarget && typeof gRayInst.gravityWellTarget.detonate === 'function') {
                            const detonateCtx = { allRays: rays, screenShakeParams: {isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy}, bossDefeatEffectsArray: bossDefeatEffects, CONSTANTS, getPooledRay };
                            gRayInst.gravityWellTarget.detonate(gRayInst, detonateCtx);
                        }
                    },
                    playerPostDamageImmunityTimer: postDamageImmunityTimer,
                    playerPostPopupImmunityTimer: postPopupImmunityTimer,
                    screenShakeParams: {isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy},
                    playerTakeDamageFromRayCallback: (rayThatHitPlayer) => { 
                        if (player && rayThatHitPlayer.isGravityWellRay) { 
                            const ptdGameCtxForGravityBall = {
                                postPopupImmunityTimer: postPopupImmunityTimer,
                                postDamageImmunityTimer: postDamageImmunityTimer,
                                score: score,
                                updateHealthDisplayCallback: (hp, maxHp) => uiUpdateHealthDisplay(hp, maxHp),
                                endGameCallback: endGameInternal,
                                updateScoreCallback: (amt) => { score += amt; updateScoreDisplay(score); checkForNewColorUnlock(); },
                                checkForNewColorCallback: checkForNewColorUnlock
                            };
                            const ptdDamageCtxForGravityBall = {
                                screenShakeParams: {isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy}
                            };
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
            }
            if(!r.isActive) {
                if (r.isGravityWellRay && r.gravityWellTarget instanceof GravityWellBoss && r.gravityWellTarget.gravityRay === r) {
                    stopSound(gravityWellChargeSound); 
                    r.gravityWellTarget.gravityRay = null;
                }
                rays.splice(i, 1); 
            }
        }


        hearts=hearts.filter(h=>!h.remove); hearts.forEach(h => h.update(deltaTime, player));
        bonusPoints=bonusPoints.filter(bp=>!bp.remove); bonusPoints.forEach(bp => bp.update(deltaTime, player));

        // --- Player Ray vs Target/Boss Collision ---
        for(let i=rays.length-1;i>=0;i--){
            const r=rays[i];
            if (!r || !r.isActive || r.isBossProjectile || r.isGravityWellRay || r.isCorruptedByGravityWell || r.isCorruptedByPlayerWell || r.state!=='moving' || r.isForming) continue;
            for(let j=targets.length-1;j>=0;j--){
                const t=targets[j];
                if(checkCollision(r,t)){
                    let chainTriggered = false;
                    if (player && player.chainReactionChance > 0 && Math.random() < player.chainReactionChance) {
                        playSound(chainReactionSound);
                        bossDefeatEffects.push({ x: t.x, y: t.y, radius: CONSTANTS.CHAIN_REACTION_RADIUS * 0.1, opacity: 1, timer: CONSTANTS.CHAIN_REACTION_EXPLOSION_DURATION, duration: CONSTANTS.CHAIN_REACTION_EXPLOSION_DURATION, color: CONSTANTS.CHAIN_REACTION_EXPLOSION_COLOR, maxRadius: CONSTANTS.CHAIN_REACTION_RADIUS, initialRadius: CONSTANTS.CHAIN_REACTION_RADIUS * 0.1 });
                        for (let k = targets.length - 1; k >= 0; k--) {
                            if (k === j) continue; const otherT = targets[k];
                            const dist = Math.sqrt((t.x - otherT.x)**2 + (t.y - otherT.y)**2);
                            if (dist < CONSTANTS.CHAIN_REACTION_RADIUS) { targets.splice(k, 1); score += 5; if (j > k) j--; }
                        }
                        chainTriggered = true;
                    }
                    targets.splice(j,1); score+=10; updateScoreDisplay(score); checkForNewColorUnlock();
                    if (!chainTriggered) playSound(targetHitSound);
                    if (r.pierceUsesLeft > 0) r.pierceUsesLeft--; else r.isActive = false;
                    if (!r.isActive) break;
                }
            }
            if (!r || !r.isActive) continue;
            if (bossManager && bossManager.activeBosses.length > 0) {
                for(const boss of bossManager.activeBosses) {
                     if (checkCollision(r, boss)) {
                        let dmg = 1 + (player ? player.rayDamageBonus : 0); dmg *= (1 + (r.momentumDamageBonusValue || 0)); dmg = Math.round(dmg);
                        let consumed = true, tookDmg = false;
                        const bossTakeDmgCtx = {CONSTANTS, playerInstance: player}; 
                        if (boss instanceof MirrorShieldBoss) { const applied = boss.takeDamage(dmg, r, player, bossTakeDmgCtx); if (!applied && r.isActive) consumed = false; tookDmg = applied; }
                        else { tookDmg = boss.takeDamage(dmg, r, player, bossTakeDmgCtx); } 
                        if(tookDmg) { playSound(bossHitSound); if (player && player.visualModifiers.serratedNanites) { const bleed = dmg * 0.05; if (typeof boss.applyBleed === 'function') boss.applyBleed(bleed, 3000);}}
                        if(consumed) r.isActive = false;
                        if(!r || !r.isActive) break;
                    }
                }
            }
        }
        // --- Hostile Ray vs Player Collision (OTHER RAYS) ---
         for(let i=rays.length-1;i>=0;i--){
             const r=rays[i];
             if (!r || !r.isActive || !player) continue;

             if (r.isGravityWellRay) continue; 

             const skipRayPlayerCollision = r.spawnGraceTimer > 0 || r.state !== 'moving' || (player.teleporting && player.teleportEffectTimer > 0) || r.isForming;
             if (skipRayPlayerCollision) continue;

             if (checkCollision(player, r)) {
                const isHostile = r.isBossProjectile || r.isCorruptedByGravityWell; 
                let isImmuneToThisColor = player.immuneColorsList.includes(r.color);
                const isUnblockableType = r.color === CONSTANTS.REFLECTED_RAY_COLOR;
                let damageDealt = 0;

                const ptdGameCtxForRay = {
                    postPopupImmunityTimer: postPopupImmunityTimer,
                    postDamageImmunityTimer: postDamageImmunityTimer,
                    score: score,
                    updateHealthDisplayCallback:(hp,maxHp)=>uiUpdateHealthDisplay(hp,maxHp),
                    endGameCallback:endGameInternal,
                    updateScoreCallback: (amt) => { score += amt; updateScoreDisplay(score); checkForNewColorUnlock(); },
                    checkForNewColorCallback: checkForNewColorUnlock
                };
                const ptdDamageCtxForRay = {
                    screenShakeParams:{isScreenShaking, screenShakeTimer, currentShakeMagnitude, currentShakeType, hitShakeDx, hitShakeDy}
                };

                if (isHostile) {
                    if (!isImmuneToThisColor || isUnblockableType) {
                        damageDealt = player.takeDamage(r, ptdGameCtxForRay, ptdDamageCtxForRay);
                        r.isActive = false;
                    } else { r.isActive = false; }
                } else { 
                    if (!isImmuneToThisColor) { damageDealt = player.takeDamage(r, ptdGameCtxForRay, ptdDamageCtxForRay); }
                    r.isActive = false; 
                }
                if (damageDealt > 0) {
                    postDamageImmunityTimer = CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION;
                }
             }
         }
         // Heart & Bonus Point Collection
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
}

// --- (drawGame, endGameInternal, togglePauseMenuInternal, startResumeCountdownInternal - SAME AS PREVIOUS FULL FILE) ---
// --- (triggerEvolutionInternal, selectEvolutionInternal, triggerFreeUpgradeInternal, handleFreeUpgradeCloseInternal - SAME AS PREVIOUS FULL FILE) ---
// --- (triggerLootChoiceInternal, selectLootUpgradeInternal - SAME AS PREVIOUS FULL FILE) ---
// --- (createFinalStatsSnapshot, getFormattedActiveAbilitiesForStats, getFormattedMouseAbilitiesForStats, prepareDisplayedUpgradesForStats, prepareAndShowPauseStats - SAME AS PREVIOUS FULL FILE) ---
// --- (showDetailedHighScores, gameScreenCallbacks, isAnyPauseActiveInternal, applyMusicPlayStateWrapper, showStartScreenWithUpdatesInternal - SAME AS PREVIOUS FULL FILE) ---
// --- (audioDomElementsForInit, initializeAudio call, getAbilityContextForPlayer, debugForceSpawnBoss, gameContextForEventListeners, setupEventListeners call, DOMContentLoaded listener - SAME AS PREVIOUS FULL FILE) ---
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
    gameOver = true; gameRunning = false; pauseAllGameIntervals(); applyMusicPlayStateWrapper(); playSound(gameOverSoundFX);
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

function togglePauseMenuInternal() {
    if (gameOver || isCountingDownToResume || gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedForLootChoice) return;
    gamePausedByEsc = !gamePausedByEsc;
    if (gamePausedByEsc) {
        pauseAllGameIntervals(); prepareAndShowPauseStats("Paused - Current Status"); showScreen(pauseScreen, true, gameScreenCallbacks); 
        if(pausePlayerStatsPanel) {
            if (pausePlayerStatsPanel.parentElement !== document.body) document.body.appendChild(pausePlayerStatsPanel);
            if (uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null) {
                const r = uiHighScoreContainer.getBoundingClientRect(); pausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px';
            } else pausePlayerStatsPanel.style.top = '20px';
            pausePlayerStatsPanel.style.display = 'block';
        }
    } else {
        if(pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';
        startResumeCountdownInternal();
    }
}

function startResumeCountdownInternal() {
    if (pauseScreen.style.display === 'flex') pauseScreen.style.display = 'none'; if(pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none';
    gamePausedByEsc = true; isCountingDownToResume = true; let countVal = 3;
    if(countdownOverlay) { countdownOverlay.textContent = countVal.toString(); countdownOverlay.style.display = 'flex'; }
    if (resumeCountdownTimerId) clearInterval(resumeCountdownTimerId);
    resumeCountdownTimerId = setInterval(() => {
        countVal--; if (countdownOverlay) countdownOverlay.textContent = countVal > 0 ? countVal.toString() : '';
        if (countVal <= 0) {
            if(countdownOverlay) countdownOverlay.style.display = 'none'; clearInterval(resumeCountdownTimerId); resumeCountdownTimerId = null;
            isCountingDownToResume = false; gamePausedByEsc = false; resumeAllGameIntervals(); applyMusicPlayStateWrapper();
            lastTime = performance.now(); if (!animationFrameId && !gameOver && gameRunning) animationFrameId = requestAnimationFrame(gameLoop);
        }
    }, 1000);
}

function triggerEvolutionInternal() {
    if(!player || isAnyPauseActiveInternal() || (bossManager && bossManager.isBossSequenceActive())) return;
    if (shrinkMeCooldown > 0) shrinkMeCooldown--;
    pauseAllGameIntervals(); gamePausedForEvolution = true; applyMusicPlayStateWrapper(true); playSound(evolutionSound);
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
        gamePausedForEvolution=false; postPopupImmunityTimer=CONSTANTS.POST_POPUP_IMMUNITY_DURATION; showScreen(null, false, gameScreenCallbacks);
        applyMusicPlayStateWrapper(); lastTime=performance.now(); if(!gameOver&&!animationFrameId && gameRunning)animationFrameId=requestAnimationFrame(gameLoop);
        uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer); resumeAllGameIntervals(); return;
    }
    choice.apply();
    lastEvolutionScore = player.evolutionIntervalModifier > 0 ? Math.floor(score / (CONSTANTS.EVOLUTION_SCORE_INTERVAL * player.evolutionIntervalModifier)) * (CONSTANTS.EVOLUTION_SCORE_INTERVAL * player.evolutionIntervalModifier) : score;
    survivalScoreThisCycle=0; if (choice.id !== 'smallerPlayer') currentPlayerRadiusGrowthFactor = currentEffectiveDefaultGrowthFactor;
    gamePausedForEvolution=false; evolutionPendingAfterBoss = false; postPopupImmunityTimer=CONSTANTS.POST_POPUP_IMMUNITY_DURATION;
    showScreen(null, false, gameScreenCallbacks); applyMusicPlayStateWrapper(); lastTime=performance.now();
    if(!gameOver&&!animationFrameId && gameRunning)animationFrameId=requestAnimationFrame(gameLoop);
    uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer); resumeAllGameIntervals();
    if (bossManager && bossManager.isBossInQueue() && !bossManager.isBossWarningActiveProp() && !isAnyPauseActiveInternal()) bossManager.triggerNextBossWarning({isAnyPauseActive: isAnyPauseActiveInternal});
}

function triggerFreeUpgradeInternal() {
    if(!player || isAnyPauseActiveInternal() || (bossManager && bossManager.isBossSequenceActive()))return;
    pauseAllGameIntervals(); gamePausedForFreeUpgrade = true; applyMusicPlayStateWrapper(true); playSound(upgradeSound);
    let upg; const avail = freeUpgradeChoicesData.filter(c=>!c.isMaxed(player));
    if(avail.length>0) upg=avail[Math.floor(Math.random()*avail.length)]; else upg={id:'noMoreFreeUpgrades',text:"All free bonuses maxed!",apply:()=>"No more free bonuses!"};
    populateFreeUpgradeOptionUI(upg, handleFreeUpgradeCloseInternal);
    showScreen(freeUpgradeScreen, true, gameScreenCallbacks);
}

function handleFreeUpgradeCloseInternal(chosenUpgrade) {
    if(chosenUpgrade && chosenUpgrade.id!=='noMoreFreeUpgrades') chosenUpgrade.apply();
    gamePausedForFreeUpgrade = false; postPopupImmunityTimer=CONSTANTS.POST_POPUP_IMMUNITY_DURATION; showScreen(null, false, gameScreenCallbacks);
    applyMusicPlayStateWrapper(); lastTime=performance.now(); if(!gameOver&&!animationFrameId && gameRunning)animationFrameId=requestAnimationFrame(gameLoop);
    uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer); resumeAllGameIntervals();
}

function triggerLootChoiceInternal(choices) {
    if (!player || choices.length === 0) { postPopupImmunityTimer = CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.5; uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer); resumeAllGameIntervals(); return; }
    pauseAllGameIntervals(); gamePausedForLootChoice = true; applyMusicPlayStateWrapper(true);
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

     gamePausedForLootChoice = false; postPopupImmunityTimer = CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.75; showScreen(null, false, gameScreenCallbacks);
     applyMusicPlayStateWrapper(); lastTime = performance.now(); if (!gameOver && !animationFrameId && gameRunning) animationFrameId = requestAnimationFrame(gameLoop);
     uiUpdateActiveBuffIndicator(player, postPopupImmunityTimer, postDamageImmunityTimer); 
     uiUpdateAbilityCooldownUI(player); // Update UI after acquiring ability

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
    if (!player) return null;
    const playerDataSnapshot = {
        maxHp: player.maxHp, currentSpeed: player.currentSpeed, baseRadius: player.baseRadius,
        radius: player.radius, currentGrowthFactor: currentPlayerRadiusGrowthFactor,
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
function getFormattedActiveAbilitiesForStats(p) { if (!p || !p.activeAbilities) return []; let fmt = []; for (const s in p.activeAbilities) { const a = p.activeAbilities[s]; if (a) { /* Check if ability exists in slot */ const d = bossLootPool.find(l => l.id === a.id && l.type === 'ability'); if (d) { let cd = (a.cooldownDuration / 1000).toFixed(1) + 's'; if (a.duration) cd += ` (Dur: ${(a.duration / 1000).toFixed(1)}s)`; fmt.push({name: d.name, slot: s, desc: cd});}}} return fmt; }
function getFormattedMouseAbilitiesForStats(p) { if(!p) return []; let abs = []; if (p.hasOmegaLaser) abs.push({name: "Omega Laser", desc: `${(CONSTANTS.OMEGA_LASER_COOLDOWN/1000)}s CD`}); if (p.hasShieldOvercharge) abs.push({name: "Shield Overcharge", desc: `${(CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN/1000)}s CD`}); return abs; }
function prepareDisplayedUpgradesForStats(p) {
    if (!p) return []; let list = [];
    evolutionChoices.forEach(e => { if (e.level > 0) { let desc = ""; if (e.id === 'colorImmunity') desc = `${p.immuneColorsList.length} colors`; else if (e.id === 'smallerPlayer') desc = `Lvl ${e.level}`; else if (e.id === 'reinforcedHull') desc = `${Math.round(p.damageReductionFactor * 100)}%`; else if (e.id === 'vitalitySurge') desc = `+${p.hpRegenBonusFromEvolution} HP/tick`; else if (e.id === 'slowRays') desc = `${currentRaySpeedMultiplier.toFixed(2)}x Speed`; else if (e.id === 'systemOvercharge') desc = `${Math.round(p.evolutionIntervalModifier*100)}% Interval`; else if (e.id === 'enhancedRegen') desc = `+${p.hpPickupBonus} HP`; else if (e.id === 'focusedBeam') desc = `+${p.rayDamageBonus} Dmg`; else if (e.id === 'unstableCore') desc = `${Math.round(p.chainReactionChance * 100)}% Chance`; else if (e.id === 'heavyImpact') desc = `+${Math.round(p.bossStunChanceBonus*100)}% Stun`; else if (e.id === 'maxHpIncrease') desc = `+${e.level * 5} Max HP`; else if (e.id === 'abilityCooldownReduction') desc = `Applied ${e.level}x`; else if (e.getEffectString) desc = e.getEffectString(); if (desc) list.push({ name: e.text.replace(/\s\(Lvl.*/, ''), description: desc });}});
    p.acquiredBossUpgrades.forEach(id => { const upg = bossLootPool.find(u => u.id === id); if (upg) { let d = `(${upg.type.charAt(0).toUpperCase() + upg.type.slice(1)})`; if (upg.id === 'adaptiveShield') d = "(Color Immunities)"; else if (upg.type === 'ability' || upg.type === 'ability_mouse') return; list.push({ name: upg.name, description: d });}});
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
    onPauseGame: (s) => { pauseAllGameIntervals(); if(s === evolutionScreen) gamePausedForEvolution = true; else if(s === freeUpgradeScreen) gamePausedForFreeUpgrade = true; else if(s === lootChoiceScreen) gamePausedForLootChoice = true; else if(s === pauseScreen) gamePausedByEsc = true; else if (s === detailedHighScoresScreen) { /* Game logic remains paused */ } applyMusicPlayStateWrapper(gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedForLootChoice);},
    onResumeGame: () => { gamePausedForEvolution = false; gamePausedForFreeUpgrade = false; gamePausedForLootChoice = false; if (!gamePausedByEsc && !isCountingDownToResume) resumeAllGameIntervals(); lastTime = performance.now(); applyMusicPlayStateWrapper();},
    onApplyMusicPlayState: () => applyMusicPlayStateWrapper(gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedForLootChoice)
};
function isAnyPauseActiveInternal() { return gamePausedForEvolution || gamePausedForFreeUpgrade || gamePausedByEsc || isCountingDownToResume || gamePausedForLootChoice; }
function applyMusicPlayStateWrapper(isPausedForPopup = false) { applyMusicPlayState(gameOver, gameRunning, isAnyPauseActiveInternal(), isPausedForPopup); }


function showStartScreenWithUpdatesInternal() {
    gameRunning = false; gameOver = false; gamePausedByEsc = false; isCountingDownToResume = false;
    gamePausedForEvolution = false; gamePausedForFreeUpgrade = false; gamePausedForLootChoice = false;
    evolutionPendingAfterBoss = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId); animationFrameId = null;
    pauseAllGameIntervals(); if (bossManager) bossManager.reset();

    if (pausePlayerStatsPanel) {
        if (pausePlayerStatsPanel.parentElement !== document.body) { 
            document.body.appendChild(pausePlayerStatsPanel);
        }
        pausePlayerStatsPanel.style.display = 'none'; 
    }

    updateAllHighScoreDisplays(); showScreen(startScreen, false, gameScreenCallbacks); applyMusicPlayStateWrapper();
}

const audioDomElementsForInit = {
    bgMusic: document.getElementById('bgMusic'), soundToggleButton: document.getElementById('soundToggleButton'),
    musicVolumeSlider: document.getElementById('musicVolumeSlider'), musicVolumeValue: document.getElementById('musicVolumeValue'),
    shootVolumeSlider: document.getElementById('shootVolumeSlider'), shootVolumeValue: document.getElementById('shootVolumeValue'),
    hitVolumeSlider: document.getElementById('hitVolumeSlider'), hitVolumeValue: document.getElementById('hitVolumeValue'),
    pickupVolumeSlider: document.getElementById('pickupVolumeSlider'), pickupVolumeValue: document.getElementById('pickupVolumeValue'),
    uiVolumeSlider: document.getElementById('uiVolumeSlider'), uiVolumeValue: document.getElementById('uiVolumeValue'),
};
initializeAudio(audioDomElementsForInit);

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
        CONSTANTS: CONSTANTS
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
        showSettingsScreenFromStart: () => { setPreviousScreenForSettings(startScreen); showScreen(settingsScreen, false, gameScreenCallbacks); },
        viewDetailedHighScores: showDetailedHighScores,
        toggleSound: toggleSoundEnabled, updateMusicVolume, updateSfxVolume: updateSpecificSfxVolume,
        goBackFromSettings: () => { const target = getPreviousScreenForSettings() || startScreen; showScreen(target, target === pauseScreen, gameScreenCallbacks); if (target === pauseScreen && pausePlayerStatsPanel) { prepareAndShowPauseStats("Paused - Current Status"); if (pausePlayerStatsPanel.parentElement !== document.body) document.body.appendChild(pausePlayerStatsPanel); if (uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null) { const r = uiHighScoreContainer.getBoundingClientRect(); pausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px';} else pausePlayerStatsPanel.style.top = '20px'; pausePlayerStatsPanel.style.display = 'block';} else if(pausePlayerStatsPanel && target !== detailedHighScoresScreen) pausePlayerStatsPanel.style.display = 'none';},
        resumeGameFromPause: togglePauseMenuInternal,
        togglePauseMenu: togglePauseMenuInternal,
        showSettingsScreenFromPause: () => { setPreviousScreenForSettings(pauseScreen); showScreen(settingsScreen, true, gameScreenCallbacks); if (pausePlayerStatsPanel) pausePlayerStatsPanel.style.display = 'none'; },
        goToMainMenuFromPause: showStartScreenWithUpdatesInternal,
        onWindowResize: () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; inputState.mouseX = canvas.width / 2; inputState.mouseY = canvas.height / 2; mouseX = inputState.mouseX; mouseY = inputState.mouseY; if(player&&gameRunning){player.x=Math.max(player.radius,Math.min(player.x,canvas.width-player.radius));player.y=Math.max(player.radius,Math.min(player.y,canvas.height-player.radius));} if(gameRunning && !gameOver && !isAnyPauseActiveInternal()) drawGame(); if ((gamePausedByEsc || gameOver || (detailedHighScoresScreen && detailedHighScoresScreen.style.display === 'flex')) && pausePlayerStatsPanel && pausePlayerStatsPanel.style.display === 'block') { if (pausePlayerStatsPanel.parentElement === document.body && uiHighScoreContainer && uiHighScoreContainer.offsetParent !== null && detailedHighScoresScreen.style.display !== 'flex') { const r = uiHighScoreContainer.getBoundingClientRect(); pausePlayerStatsPanel.style.top = (r.bottom + 10) + 'px'; }  else if (pausePlayerStatsPanel.parentElement === document.body && detailedHighScoresScreen.style.display !== 'flex') { pausePlayerStatsPanel.style.top = '20px';}}},
        debugSpawnBoss: debugForceSpawnBoss
    }
};

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
