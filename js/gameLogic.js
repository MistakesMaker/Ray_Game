// js/gameLogic.js

import * as CONSTANTS from './constants.js';
import * as GameState from './gameState.js';
import * as UIManager from './uiManager.js';
import * as EvolutionManager from './evolutionManager.js';
import * as LootManager from './lootManager.js';
import { EntitySpawner } from './entitySpawner.js';
import { Player } from './player.js';
import { Ray, PlayerGravityWell } from './ray.js';
import { Target, Heart, BonusPoint, LootDrop } from './entities.js';
import { BossManager } from './bossManager.js';
import { GravityWellBoss } from './gravityWellBoss.js';
import { MirrorShieldBoss } from './mirrorShieldBoss.js';
import { NexusWeaverBoss } from './nexusWeaverBoss.js';
import {
    setRayConstructorForPool, initializeRayPool, getPooledRay, returnRayToPool,
    checkCollision, getReadableColorName as getReadableColorNameFromUtils
} from './utils.js';
import {
    playSound, stopSound,
    newColorSound, lootPickupSound as audioLootPickupSound, shootSound,
    targetHitSound as audioTargetHitSound,
    heartSound, bonusPickupSound, screenShakeSound, playerHitSound,
    chainReactionSound,
    bossHitSound,
    gravityWellChargeSound,
    upgradeSound as audioUpgradeSound
} from './audio.js';


// --- Game Entities & State (managed by this module) ---
let player = null;
let rays = [];
let targets = [];
let hearts = [];
let bonusPoints = [];
let lootDrops = [];
let decoys = [];
let bossManager = null;
let entitySpawner = null;
let bossDefeatEffects = [];
let activeBuffNotifications = [];

// --- UI & Input State (passed in or accessed via callbacks) ---
let _canvas = null;
let _ctx = null;
let _inputState = null;

// Screen Shake state
let isScreenShaking = false;
let screenShakeTimer = 0;
let currentShakeMagnitude = 0;
let currentShakeType = null;
let hitShakeDx = 0;
let hitShakeDy = 0;

let _mainCallbacks = {
    endGameInternal: null,
    triggerEvolutionInternal: null,
    triggerFirstBossLootScreenInternal: null,
    triggerLootChoiceScreenInternal: null,
    checkForNewColorUnlock: null,
    getGameContextForBossManager: null,
    updateLastEvolutionScore: null,
    updateShootInterval: null,
    handleFullHealthHeartPickup: null,
    signalAchievementEvent: null,
};

export function getScreenShakeParams() {
    return {
        isScreenShaking,
        screenShakeTimer,
        currentShakeMagnitude,
        currentShakeType,
        hitShakeDx,
        hitShakeDy
    };
}

export function getAbilityContextForPlayerLogic() {
    if (!player || !_inputState || !_canvas) {
        return {
            isAnyPauseActiveCallback: GameState.isAnyPauseActive,
            CONSTANTS: CONSTANTS,
            updateAbilityCooldownCallback: () => {}, decoysArray: [], bossDefeatEffectsArray: [],
            mouseX: 0, mouseY: 0, canvasWidth: 0, canvasHeight: 0, allRays: [],
            screenShakeParams: getScreenShakeParams(),
            activeBuffNotificationsArray: [], evolutionChoices: [], ui: {},
            getBossManager: () => null
        };
    }
    return {
        isAnyPauseActiveCallback: GameState.isAnyPauseActive,
        updateAbilityCooldownCallback: (p) => UIManager.updateAbilityCooldownUI(p),
        decoysArray: decoys,
        bossDefeatEffectsArray: bossDefeatEffects,
        mouseX: _inputState.mouseX,
        mouseY: _inputState.mouseY,
        canvasWidth: _canvas.width,
        canvasHeight: _canvas.height,
        allRays: rays,
        activeBosses: bossManager ? bossManager.activeBosses : [],
        screenShakeParams: getScreenShakeParams(),
        CONSTANTS: CONSTANTS,
        activeBuffNotificationsArray: activeBuffNotifications,
        evolutionChoices: EvolutionManager.getEvolutionMasterList(),
        ui: {
            updateKineticChargeUI: UIManager.updateKineticChargeUI,
            updateBerserkerRageUI: UIManager.updateBerserkerRageUI
        },
        getBossManager: () => bossManager,
        signalAchievementEvent: _mainCallbacks.signalAchievementEvent // Pass through from main
    };
}

export function initializeGameLogic(canvasElement, inputStateRef, mainCallbacksObj, initialPlayerSpeed) {
    _canvas = canvasElement;
    _ctx = _canvas.getContext('2d');
    _inputState = inputStateRef;
    _mainCallbacks = mainCallbacksObj;

    activeBuffNotifications = [];

    try {
        player = new Player(_canvas.width / 2, _canvas.height / 2, initialPlayerSpeed);
        if (!(player instanceof Player)) {
            console.error("CRITICAL: player is NOT an instanceof Player immediately after new Player()!");
        }
    } catch (e) {
        console.error("CRITICAL ERROR creating Player instance:", e);
        player = null;
    }


    LootManager.initializeLootPools(player, UIManager.updateBuffIndicator);

    setRayConstructorForPool(Ray);
    initializeRayPool();

    const spawnerCallbacks = {
        addEntityCallback: (entity, type) => {
            if (type === 'target') targets.push(entity);
            else if (type === 'heart') hearts.push(entity);
            else if (type === 'bonusPoint') bonusPoints.push(entity);
        }
    };
    entitySpawner = new EntitySpawner(spawnerCallbacks);
    if (_canvas) entitySpawner.updateCanvasDimensions(_canvas.width, _canvas.height);


    const bossManagerAudioContext = {
        playSound,
        audioChaserSpawnSound: CONSTANTS.audioChaserSpawnSound,
        audioReflectorSpawnSound: CONSTANTS.audioReflectorSpawnSound,
        audioSingularitySpawnSound: CONSTANTS.audioSingularitySpawnSound,
        audioNexusWeaverSpawnSound: CONSTANTS.audioNexusWeaverSpawnSound
    };
    bossManager = new BossManager(CONSTANTS.BOSS_SPAWN_START_SCORE, CONSTANTS.BOSS_SPAWN_SCORE_INTERVAL, bossManagerAudioContext);

    rays = []; targets = []; hearts = []; bonusPoints = [];
    lootDrops = []; decoys = []; bossDefeatEffects = [];
}

export function resetGameLogicState() {
    if (player) {
        if (typeof player.reset === 'function') {
            player.reset(_canvas ? _canvas.width : window.innerWidth, _canvas ? _canvas.height : window.innerHeight);
        } else {
            console.warn("[GameLogic reset] Player object exists but reset method is missing. Applying basic reset.");
            player.hp = player.maxHp || CONSTANTS.PLAYER_MAX_HP;
            player.x = _canvas ? _canvas.width / 2 : window.innerWidth / 2;
            player.y = _canvas ? _canvas.height / 2 : window.innerHeight / 2;
            if('immuneColorsList' in player) player.immuneColorsList = [];
            if('activeAbilities' in player) player.activeAbilities = {'1':null, '2':null, '3':null};
        }
    }

    if (bossManager) bossManager.reset();
    if (entitySpawner) entitySpawner.reset();

    rays = []; targets = []; hearts = []; bonusPoints = [];
    lootDrops = []; decoys = []; bossDefeatEffects = [];
    activeBuffNotifications = [];

    isScreenShaking = false;
    screenShakeTimer = 0;
    currentShakeMagnitude = 0;
    currentShakeType = null;
    hitShakeDx = 0;
    hitShakeDy = 0;
}

export function getPlayerInstance() {
    if (player && !(player instanceof Player)) {
        console.error("CRITICAL GETTER: gameLogic.player is an object BUT NOT an instanceof Player!", player);
    }
    return player;
}
export function getActiveBuffNotificationsArray() { return activeBuffNotifications; }
export function getRays() { return rays; }
export function getDecoys() { return decoys; }
export function getBossDefeatEffects() { return bossDefeatEffects; }
export function getBossManagerInstance() { return bossManager; }
export function getLootDrops() { return lootDrops; }

export function updateCanvasDimensionsLogic(width, height) {
    if (_canvas) {
        _canvas.width = width;
        _canvas.height = height;
    }

    if (entitySpawner && typeof entitySpawner.updateCanvasDimensions === 'function') {
        entitySpawner.updateCanvasDimensions(width, height);
    }
    const currentPlayer = getPlayerInstance();
    if (currentPlayer && GameState.isGameRunning()) {
         currentPlayer.x = Math.max(currentPlayer.radius, Math.min(currentPlayer.x, width - currentPlayer.radius));
         currentPlayer.y = Math.max(currentPlayer.radius, Math.min(currentPlayer.y, height - currentPlayer.radius));
    }
}


export function updateGame(deltaTime) {
    if (GameState.isGameOver()) return;
    if (!_canvas || !_inputState) return;
    if (!player) {
        return;
    }
    if (typeof player.update !== 'function') {
        console.error("[updateGame] CRITICAL: player.update is NOT a function here!", player);
        return;
    }


    if (deltaTime <= 0 || deltaTime > 500) deltaTime = 1000 / 60;

    if (!GameState.isGamePausedByEsc() && !GameState.getIsCountingDownToResume()) {
        GameState.decrementPostPopupImmunityTimer(deltaTime);
        GameState.decrementPostDamageImmunityTimer(deltaTime);
        if(player) UIManager.updateActiveBuffIndicator(player, GameState.getPostPopupImmunityTimer(), GameState.getPostDamageImmunityTimer());
    }

    const currentShakeParams = getScreenShakeParams();
    if (currentShakeParams.isScreenShaking) {
        screenShakeTimer -= deltaTime;
        if (currentShakeParams.currentShakeType === 'playerHit' && currentShakeParams.currentShakeMagnitude > 0) {
            currentShakeMagnitude *= CONSTANTS.SHAKE_DECAY_FACTOR_BASE;
            if (currentShakeMagnitude < 1) currentShakeMagnitude = 0;
        }
        if (screenShakeTimer <= 0) {
            isScreenShaking = false; screenShakeTimer = 0; currentShakeType = null; currentShakeMagnitude = 0;
        }
    }


    if (!GameState.isAnyPauseActive()) {
        GameState.incrementGameplayTimeElapsed(deltaTime);
        GameState.incrementShootIntervalUpdateTimer(deltaTime);
        if (GameState.getShootIntervalUpdateTimer() >= CONSTANTS.SHOOT_INTERVAL_UPDATE_FREQUENCY) {
            if (_mainCallbacks.updateShootInterval) _mainCallbacks.updateShootInterval();
            GameState.setShootIntervalUpdateTimer(0);
        }
        GameState.incrementSurvivalPointsTimer(deltaTime);
        if(GameState.getSurvivalPointsTimer() >= GameState.getCurrentSurvivalPointsInterval()){
            GameState.setSurvivalPointsTimer(GameState.getSurvivalPointsTimer() - GameState.getCurrentSurvivalPointsInterval());
            if(GameState.getSurvivalScoreThisCycle() < CONSTANTS.MAX_SURVIVAL_POINTS_PER_EVOLUTION_CYCLE){
                GameState.incrementScore(CONSTANTS.SURVIVAL_POINTS_AMOUNT); UIManager.updateScoreDisplay(GameState.getScore()); if (_mainCallbacks.checkForNewColorUnlock) _mainCallbacks.checkForNewColorUnlock();
            }
        }

        if (entitySpawner) {
            const gameContextForSpawner = {
                isGameOver: GameState.isGameOver,
                isAnyPauseActive: GameState.isAnyPauseActive,
                isBossSequenceActive: bossManager ? bossManager.isBossSequenceActive.bind(bossManager) : () => false,
                player: player,
                heartsArray: hearts,
                bonusPointsArray: bonusPoints,
                canvasWidth: _canvas.width,
                canvasHeight: _canvas.height
            };
            entitySpawner.update(deltaTime, gameContextForSpawner);
        }

        for (let i = lootDrops.length - 1; i >= 0; i--) {
            const loot = lootDrops[i]; loot.update(deltaTime);
            if (loot.remove) { lootDrops.splice(i, 1); continue; }
            if (player && checkCollision(player, loot)) {
                const choices = loot.upgradeChoices;
                lootDrops.splice(i, 1);
                playSound(audioLootPickupSound);
                if (loot.isFirstBossLoot) {
                    if(_mainCallbacks.triggerFirstBossLootScreenInternal) _mainCallbacks.triggerFirstBossLootScreenInternal();
                } else {
                    if(_mainCallbacks.triggerLootChoiceScreenInternal) _mainCallbacks.triggerLootChoiceScreenInternal(choices);
                }
                break;
            }
        }

        if (bossManager && !GameState.isGameOver()) {
            bossManager.trySpawnBoss(GameState.getScore(), player);
            if (_mainCallbacks.getGameContextForBossManager) {
                bossManager.update(player, _mainCallbacks.getGameContextForBossManager(LootManager));
            }
        }

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
                // Pass signalAchievementEvent if available and needed by PlayerGravityWell.detonate
                const detonatePayload = { targetX: _inputState.mouseX, targetY: _inputState.mouseY, player: player};
                if (_mainCallbacks.signalAchievementEvent && player && typeof player.signalAchievementEvent === 'function') {
                     // This is a bit indirect. PlayerGravityWell would need a way to call player's signalAchievementEvent
                     // or player.signalAchievementEvent would need to be passed into detonate.
                     // For now, assuming Well Master is checked in PlayerGravityWell or via Player.
                }
                 well.detonate(detonatePayload);
            }
        });
        for (let i = decoys.length - 1; i >= 0; i--) { if(decoys[i] && !decoys[i].isActive) { if(player && player.activeMiniWell === decoys[i]) player.activeMiniWell = null; decoys.splice(i, 1);}}

        const currentEvolutionThreshold = (_mainCallbacks.getLastEvolutionScore ? _mainCallbacks.getLastEvolutionScore() : 0) +
                                          (CONSTANTS.EVOLUTION_SCORE_INTERVAL * (player ? player.evolutionIntervalModifier : 1.0));
        if (player && GameState.getScore() >= currentEvolutionThreshold && !GameState.isEvolutionPendingAfterBoss()) {
            if (bossManager && (bossManager.isBossSequenceActive() || bossManager.isBossWarningActiveProp()) ) GameState.setEvolutionPendingAfterBoss(true);
            else if (lootDrops.length > 0) GameState.setEvolutionPendingAfterBoss(true);
            else if (_mainCallbacks.triggerEvolutionInternal) _mainCallbacks.triggerEvolutionInternal();
        }
        for (let i = activeBuffNotifications.length - 1; i >= 0; i--) {const n = activeBuffNotifications[i];n.timer -= deltaTime;if (n.timer <= 0) activeBuffNotifications.splice(i, 1);}


        const playerUpdateContext = {
            dt: deltaTime,
            keys: _inputState.keys,
            mouseX: _inputState.mouseX,
            mouseY: _inputState.mouseY,
            canvasWidth: _canvas.width, canvasHeight: _canvas.height,
            targets: targets, activeBosses: bossManager ? bossManager.activeBosses : [],
            currentGrowthFactor: GameState.getCurrentPlayerRadiusGrowthFactor(),
            currentEffectiveDefaultGrowthFactor: GameState.getCurrentEffectiveDefaultGrowthFactor(),
            score: GameState.getScore(),
            evolutionChoices: EvolutionManager.getEvolutionMasterList(),
            ui: {
                updateKineticChargeUI: UIManager.updateKineticChargeUI,
                updateBerserkerRageUI: UIManager.updateBerserkerRageUI
            },
            updateHealthDisplayCallback: (currentHp, maxHp) => UIManager.updateHealthDisplay(currentHp, maxHp),
            updateAbilityCooldownCallback: (pInst) => UIManager.updateAbilityCooldownUI(pInst),
            isAnyPauseActiveCallback: GameState.isAnyPauseActive,
            getBossManager: () => bossManager,
            decoysArray: decoys, bossDefeatEffectsArray: bossDefeatEffects, allRays: rays,
            screenShakeParams: getScreenShakeParams(),
            activeBuffNotificationsArray: activeBuffNotifications, CONSTANTS,
            endGameCallback: _mainCallbacks.endGameInternal,
            updateScoreCallback: (amount) => { GameState.incrementScore(amount); UIManager.updateScoreDisplay(GameState.getScore()); if (_mainCallbacks.checkForNewColorUnlock) _mainCallbacks.checkForNewColorUnlock(); },
            forceAbilityUIUpdate: false,
            signalAchievementEvent: _mainCallbacks.signalAchievementEvent
        };
        player.update(playerUpdateContext);

        if (player.currentPath === 'berserker') {
            UIManager.updateBerserkerRageUI(player.berserkerRagePercentage, player);
        } else {
            UIManager.updateBerserkerRageUI(0, player);
        }

        if (player.kineticConversionLevel > 0) {
            let maxPotencyAtFullCharge = player.initialKineticDamageBonus;
            UIManager.updateKineticChargeUI(player.kineticCharge, player.kineticChargeConsumption, maxPotencyAtFullCharge, true);
        } else {
             UIManager.updateKineticChargeUI(0,100,0, false);
        }

        for (let i = rays.length - 1; i >= 0; i--) {
            const r = rays[i];
            if (r.isActive) {
                const rayUpdateContext = {
                    dt: deltaTime, player, decoys, canvasWidth: _canvas.width, canvasHeight: _canvas.height, stopSound, gravityWellChargeSound, CONSTANTS,
                    detonateGravityWell: (gRayInst) => {
                        if (gRayInst.gravityWellTarget && typeof gRayInst.gravityWellTarget.detonate === 'function') {
                            const detonateCtx = { allRays: rays, screenShakeParams: getScreenShakeParams(), bossDefeatEffectsArray: bossDefeatEffects, CONSTANTS, getPooledRay };
                            gRayInst.gravityWellTarget.detonate(gRayInst, detonateCtx);
                        }
                    },
                    playerPostDamageImmunityTimer: GameState.getPostDamageImmunityTimer(), playerPostPopupImmunityTimer: GameState.getPostPopupImmunityTimer(),
                    screenShakeParams: getScreenShakeParams(),
                    signalAchievementEvent: _mainCallbacks.signalAchievementEvent,
                    playerTakeDamageFromRayCallback: (rayThatHitPlayer) => {
                        if (player && rayThatHitPlayer.isGravityWellRay) {
                            const ptdGameCtxForGravityBall = {
                                postPopupImmunityTimer: GameState.getPostPopupImmunityTimer(), postDamageImmunityTimer: GameState.getPostDamageImmunityTimer(), score: GameState.getScore(),
                                updateHealthDisplayCallback: (hp, maxHp) => UIManager.updateHealthDisplay(hp, maxHp), endGameCallback: _mainCallbacks.endGameInternal,
                                updateScoreCallback: (amt) => { GameState.incrementScore(amt); UIManager.updateScoreDisplay(GameState.getScore()); if(_mainCallbacks.checkForNewColorUnlock) _mainCallbacks.checkForNewColorUnlock(); },
                                checkForNewColorCallback: _mainCallbacks.checkForNewColorUnlock, activeBuffNotificationsArray: activeBuffNotifications,
                                signalAchievementEvent: _mainCallbacks.signalAchievementEvent,
                                getBossManager: () => bossManager // Added for takeDamage context
                            };
                            const ptdDamageCtxForGravityBall = { screenShakeParams: getScreenShakeParams() };
                            const damageActuallyDealt = player.takeDamage(rayThatHitPlayer, ptdGameCtxForGravityBall, ptdDamageCtxForGravityBall);
                            if (damageActuallyDealt > 0) {
                                GameState.setPostDamageImmunityTimer(CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION);
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
                        if (!r.isPlayerAbilityRay && player.hasBerserkersEchoHelm) {
                            const missingHpPercentage = (player.maxHp - player.hp) / player.maxHp;
                            const tenPercentIncrements = Math.floor(missingHpPercentage * 10);
                            if (tenPercentIncrements > 0) {
                                const berserkDamageBonus = tenPercentIncrements * CONSTANTS.BERSERKERS_ECHO_DAMAGE_PER_10_HP;
                                finalDamage *= (1 + berserkDamageBonus);
                            }
                        }
                        if (player.currentPath === 'berserker' && !r.isPlayerAbilityRay) {
                           finalDamage *= player.berserkerPermanentRayDamageMultiplier;
                        }

                        if (r.isPlayerAbilityRay) {
                            let abilityBaseDamage = 1 + player.rayDamageBonus;

                            if (typeof player.abilityDamageMultiplier === 'number') {
                                 abilityBaseDamage *= player.abilityDamageMultiplier;
                            }

                            if (typeof r.pathDamageMultiplier === 'number' && r.pathDamageMultiplier > 1.0) {
                                abilityBaseDamage *= r.pathDamageMultiplier;
                            }

                            if (r.sourceAbility === 'miniGravityWell' && player.currentGravityWellKineticBoost > 1.0) {
                                abilityBaseDamage *= player.currentGravityWellKineticBoost;
                            }

                            finalDamage = abilityBaseDamage;
                        }

                        finalDamage *= (1 + (r.momentumDamageBonusValue || 0)); // Apply momentum bonus to the already calculated base/path/kinetic damage

                        if (r.isPlayerAbilityRay) {
                            if (player.abilityCritChance > 0 && Math.random() < player.abilityCritChance) {
                                finalDamage *= player.abilityCritDamageMultiplier;
                            }
                        } else {
                            if (player.rayCritChance > 0 && Math.random() < player.rayCritChance) {
                                finalDamage *= player.rayCritDamageMultiplier;
                            }
                        }
                    }
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
                            targets.splice(j,1); GameState.incrementScore(10); UIManager.updateScoreDisplay(GameState.getScore()); if(_mainCallbacks.checkForNewColorUnlock) _mainCallbacks.checkForNewColorUnlock();
                            if (player) { player.targetsDestroyedThisRun = (player.targetsDestroyedThisRun || 0) + 1; }

                            if (!aoeTriggeredOnHit) playSound(audioTargetHitSound);

                            if (player && typeof r.lifestealPercent === 'number' && r.lifestealPercent > 0) {
                                player.applyLifesteal(currentRayDamage, UIManager.updateHealthDisplay);
                            }

                            // <<< MOMENTUM MASTER (Target Hit) - Not needed for this achievement, which is vs Boss >>>

                            if (r.pierceUsesLeft > 0) r.pierceUsesLeft--; else r.isActive = false;
                            if (!r.isActive) break;
                        }
                    }
                    if (!r.isActive) {
                        returnRayToPool(r);
                        rays.splice(i, 1);
                        continue;
                    }


                    if (bossManager && bossManager.activeBosses.length > 0) {
                        for(const currentBoss of bossManager.activeBosses) {
                             if (checkCollision(r, currentBoss)) {
                                let consumedByShield = false; let damageAppliedToBossValue = 0;
                                const bossTakeDmgCtx = {CONSTANTS, playerInstance: player};

                                const damageDealtByRayToBoss = currentBoss.takeDamage(currentRayDamage, r, player, bossTakeDmgCtx);
                                if (damageDealtByRayToBoss > 0) {
                                    damageAppliedToBossValue = damageDealtByRayToBoss;
                                    // <<< MOMENTUM MASTER (Boss Hit) >>>
                                    if (r.momentumDamageBonusValue > 0 && currentRayDamage >= 30 && _mainCallbacks.signalAchievementEvent) {
                                        _mainCallbacks.signalAchievementEvent("momentum_ray_hit_high_damage", {
                                            damageDealt: currentRayDamage,
                                            momentumBonus: r.momentumDamageBonusValue
                                        });
                                    }
                                    // <<< END MOMENTUM MASTER >>>

                                    if (r.wallBounceCount >= 3 && _mainCallbacks.signalAchievementEvent) {
                                        _mainCallbacks.signalAchievementEvent("ray_hit_boss_after_bounces", {
                                            rayBounces: r.wallBounceCount,
                                            bossType: currentBoss.constructor.name
                                        });
                                    }
                                }
                                consumedByShield = !r.isActive || damageAppliedToBossValue > 0;


                                if(damageAppliedToBossValue > 0) {
                                    playSound(bossHitSound);
                                    if (player && player.bleedOnHit) {
                                        const bleed = currentRayDamage * 0.05;
                                        if (typeof currentBoss.applyBleed === 'function') currentBoss.applyBleed(bleed, 3000);
                                    }
                                    if (player && typeof r.lifestealPercent === 'number' && r.lifestealPercent > 0) {
                                        player.applyLifesteal(damageAppliedToBossValue, UIManager.updateHealthDisplay);
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
                            if (currentBoss instanceof NexusWeaverBoss && currentBoss.activeMinions && currentBoss.activeMinions.length > 0) {
                                for (let mIdx = currentBoss.activeMinions.length - 1; mIdx >=0; mIdx--) {
                                    const minion = currentBoss.activeMinions[mIdx];
                                     if (minion.isActive && checkCollision(r, minion)) {
                                        const damageToMinion = currentRayDamage;
                                        const actualDamageToMinion = minion.takeDamage(damageToMinion, player, currentBoss);
                                        if (player && typeof r.lifestealPercent === 'number' && r.lifestealPercent > 0 && actualDamageToMinion > 0) {
                                            player.applyLifesteal(actualDamageToMinion, UIManager.updateHealthDisplay);
                                        }
                                        r.isActive = false;
                                        break;
                                    }
                                }
                                if (!r.isActive) break;
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
                returnRayToPool(r);
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
                    postPopupImmunityTimer: GameState.getPostPopupImmunityTimer(), postDamageImmunityTimer: GameState.getPostDamageImmunityTimer(), score: GameState.getScore(),
                    updateHealthDisplayCallback:(hp,maxHp)=>UIManager.updateHealthDisplay(hp,maxHp), endGameCallback:_mainCallbacks.endGameInternal,
                    updateScoreCallback: (amt) => { GameState.incrementScore(amt); UIManager.updateScoreDisplay(GameState.getScore()); if (_mainCallbacks.checkForNewColorUnlock) _mainCallbacks.checkForNewColorUnlock(); },
                    checkForNewColorCallback: _mainCallbacks.checkForNewColorUnlock, activeBuffNotificationsArray: activeBuffNotifications,
                    signalAchievementEvent: _mainCallbacks.signalAchievementEvent,
                    getBossManager: () => bossManager
                };
                const ptdDamageCtxForRay = { screenShakeParams: getScreenShakeParams() };

                if (isHostile) {
                    if (!isImmuneToThisColor || isUnblockableType) {
                        damageDealt = player.takeDamage(r, ptdGameCtxForRay, ptdDamageCtxForRay);
                        r.isActive = false;
                    } else { r.isActive = false; }
                } else {
                    if (!isImmuneToThisColor) {
                        damageDealt = player.takeDamage(r, ptdGameCtxForRay, ptdDamageCtxForRay);
                    }
                    r.isActive = false;
                }

                if (damageDealt > 0) {
                    GameState.setPostDamageImmunityTimer(CONSTANTS.POST_DAMAGE_IMMUNITY_DURATION);
                }
             }
             if(!r.isActive) {
                returnRayToPool(r);
                rays.splice(i,1);
             }
         }

         if (player && !(player.teleporting && player.teleportEffectTimer > 0) && !player.isShieldOvercharging) {
             for(let i=hearts.length-1;i>=0;i--){
                 const h=hearts[i];
                 if(checkCollision(player,h)){
                     let wasAtFullHp = (player.hp === player.maxHp);
                     hearts.splice(i,1);
                     player.gainHealth(CONSTANTS.HP_REGEN_PER_PICKUP + player.hpPickupBonus, (hp,maxHp)=>UIManager.updateHealthDisplay(hp,maxHp));
                     playSound(heartSound);
                     if (wasAtFullHp) {
                        if (_mainCallbacks.handleFullHealthHeartPickup) {
                            _mainCallbacks.handleFullHealthHeartPickup(player);
                        } else {
                            activeBuffNotifications.push({ text: "Max HP! +10 Score!", timer: CONSTANTS.BUFF_NOTIFICATION_DURATION});
                            GameState.incrementScore(10);
                            UIManager.updateScoreDisplay(GameState.getScore());
                        }
                     }
                     GameState.setPostPopupImmunityTimer(CONSTANTS.POST_POPUP_IMMUNITY_DURATION * 0.75);
                 }
             }
             for(let i=bonusPoints.length - 1; i >= 0; i--){
                 const bp = bonusPoints[i];
                 if(checkCollision(player, bp)){
                     bonusPoints.splice(i,1); GameState.incrementScore(CONSTANTS.BONUS_POINT_VALUE); UIManager.updateScoreDisplay(GameState.getScore()); if(_mainCallbacks.checkForNewColorUnlock) _mainCallbacks.checkForNewColorUnlock(); playSound(bonusPickupSound);
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
                    GameState.incrementScore(5);
                    UIManager.updateScoreDisplay(GameState.getScore());
                    if (player) { player.targetsDestroyedThisRun = (player.targetsDestroyedThisRun || 0) + 1; }
                }
            }
            if (bossManager && bossManager.activeBosses) {
                bossManager.activeBosses.forEach(currentBoss => {
                    const dist = Math.sqrt((effect.x - currentBoss.x) ** 2 + (effect.y - currentBoss.y) ** 2);
                    if (dist < effect.maxRadius + currentBoss.radius) {
                        if (typeof currentBoss.takeDamage === 'function') {
                            const damageDealtByAoe = currentBoss.takeDamage(effect.damage, null, player);
                             if (player && damageDealtByAoe) player.totalDamageDealt += damageDealtByAoe;
                        }
                    }
                    if (currentBoss instanceof NexusWeaverBoss && currentBoss.activeMinions) {
                        for (let mIdx = currentBoss.activeMinions.length - 1; mIdx >=0; mIdx--) {
                            const minion = currentBoss.activeMinions[mIdx];
                             if (minion.isActive) {
                                const distMinion = Math.sqrt((effect.x - minion.x) ** 2 + (effect.y - minion.y) ** 2);
                                if (distMinion < effect.maxRadius + minion.radius) {
                                    minion.takeDamage(effect.damage, player, currentBoss);
                                     if (player) player.totalDamageDealt += effect.damage;
                                }
                            }
                        }
                    }
                });
            }
        }
    }
}

export function drawGame() {
    if (!_ctx) return;
    _ctx.save();
    const currentShakeParams = getScreenShakeParams();
    if (currentShakeParams.isScreenShaking && currentShakeParams.screenShakeTimer > 0 && !GameState.isAnyPauseActive() && !GameState.isGameOver()) {
        let shakeX = 0, shakeY = 0;
        if (currentShakeParams.currentShakeType === 'playerHit' && currentShakeParams.currentShakeMagnitude > 0) {
            shakeX = currentShakeParams.hitShakeDx * currentShakeParams.currentShakeMagnitude * (Math.random() * 0.6 + 0.4);
            shakeY = currentShakeParams.hitShakeDy * currentShakeParams.currentShakeMagnitude * (Math.random() * 0.6 + 0.4);
        } else if (currentShakeParams.currentShakeType === 'bonus') {
            shakeX = (Math.random() - 0.5) * currentShakeParams.currentShakeMagnitude * 2;
            shakeY = (Math.random() - 0.5) * currentShakeParams.currentShakeMagnitude * 2;
        }
        _ctx.translate(shakeX, shakeY);
    }

    _ctx.fillStyle='rgba(0,0,0,0.20)'; _ctx.fillRect(0,0,_canvas.width,_canvas.height);
    targets.forEach(t=>t.draw(_ctx)); hearts.forEach(h=>h.draw(_ctx)); bonusPoints.forEach(bp=>bp.draw(_ctx)); lootDrops.forEach(l => l.draw(_ctx));
    decoys.forEach(d => { if(d && typeof d.draw === 'function') d.draw(_ctx); });
    rays.forEach(r => { if (r && r.isActive) r.draw(_ctx); });
    if (bossManager) bossManager.draw(_ctx, { canvasWidth: _canvas.width, canvasHeight: _canvas.height });
    for (let i = bossDefeatEffects.length - 1; i >= 0; i--) {
        const e = bossDefeatEffects[i]; e.timer -= (16.67);
        if (e.timer <= 0) { bossDefeatEffects.splice(i, 1); continue; }
        e.opacity = e.timer / e.duration;
       if(e.maxRadius && e.initialRadius !== undefined) {
           let p = e.shrink ? (e.timer / e.duration) : (1 - (e.timer / e.duration));
           e.radius = e.initialRadius + (e.maxRadius - e.initialRadius) * p;
       }
       else e.radius += 1.5;
       _ctx.beginPath(); _ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
       _ctx.fillStyle = e.color ? e.color.replace('opacity', (e.opacity * 0.6).toString()) : `rgba(255, 255, 180, ${e.opacity * 0.6})`; _ctx.fill();
   }

    if(player && typeof player.draw === 'function' && GameState.isGameRunning() && !GameState.isGameOver()){
        const playerDrawContext = {
            isCountingDownToResume: GameState.getIsCountingDownToResume(),
            postPopupImmunityTimer: GameState.getPostPopupImmunityTimer(),
            postDamageImmunityTimer: GameState.getPostDamageImmunityTimer(),
            CONSTANTS
        };
        player.draw(_ctx, playerDrawContext);
    } else if (player && typeof player.draw !== 'function') {
        console.error("[drawGame] ERROR: player object exists, but player.draw is NOT a function!", player);
    } else if (!player) {
    }

    _ctx.restore();
    _ctx.save(); _ctx.textAlign = 'center'; let notificationY = 60;
    const FADE_OUT_ACTUAL = CONSTANTS.BUFF_NOTIFICATION_DURATION - CONSTANTS.BUFF_NOTIFICATION_FADE_OUT_START_TIME;
    activeBuffNotifications.forEach(n => {
        _ctx.font = 'bold 26px Arial'; let baseOp = 0.75, currentOp = baseOp;
        if (n.timer < FADE_OUT_ACTUAL) currentOp = (n.timer / FADE_OUT_ACTUAL) * baseOp;
        currentOp = Math.max(0, currentOp); _ctx.fillStyle = `rgba(200, 220, 255, ${currentOp})`;
        _ctx.shadowColor = `rgba(0, 0, 0, ${currentOp * 0.6})`; _ctx.shadowBlur = 6;
        _ctx.fillText(n.text, _canvas.width / 2, notificationY); notificationY += 35;
    });
    _ctx.restore();
}