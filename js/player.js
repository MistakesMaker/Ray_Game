// js/player.js
import {
    PLAYER_BASE_RADIUS, MIN_PLAYER_BASE_RADIUS, PLAYER_BASE_COLOR, PLAYER_MAX_HP,
    RAY_DAMAGE_TO_PLAYER, HP_REGEN_PER_PICKUP, HP_REGEN_NO_DAMAGE_THRESHOLD, HP_REGEN_INTERVAL, PLAYER_SPEED_BASE,
    PLAYER_AIM_INDICATOR_LENGTH, TELEPORT_IMMUNITY_DURATION,
    OMEGA_LASER_DURATION, OMEGA_LASER_COOLDOWN, OMEGA_LASER_TICK_INTERVAL, OMEGA_LASER_DAMAGE_PER_TICK,
    OMEGA_LASER_RANGE, OMEGA_LASER_WIDTH,
    SHIELD_OVERCHARGE_DURATION, SHIELD_OVERCHARGE_COOLDOWN, SHIELD_OVERCHARGE_HEAL_PER_RAY,
    SCREEN_SHAKE_DURATION_PLAYER_HIT, SCREEN_SHAKE_MAGNITUDE_PLAYER_HIT,
    POST_POPUP_IMMUNITY_DURATION,
    POST_DAMAGE_IMMUNITY_DURATION,
    PLAYER_BOUNCE_FORCE_FROM_GRAVITY_BALL,
    RAY_SPAWN_GRACE_PERIOD,
    BERSERKERS_ECHO_DAMAGE_PER_10_HP,
    BERSERKERS_ECHO_SPEED_PER_10_HP,
    KINETIC_INITIAL_DAMAGE_BONUS, KINETIC_BASE_CHARGE_RATE,
    MAX_EVOLUTION_REROLLS,
    MAX_EVOLUTION_BLOCKS,
    MAX_EVOLUTION_FREEZES_PER_RUN,
    RAY_RADIUS,
    RAY_SPAWN_FORWARD_OFFSET,
    SCATTER_SHOT_ANGLE_OFFSET,
    AEGIS_PATH_BASE_COLLISION_DAMAGE,
    AEGIS_PATH_MAX_HP_SCALING_FACTOR,
    AEGIS_PATH_RADIUS_SCALING_FACTOR,
    AEGIS_PATH_BOSS_KNOCKBACK_FORCE,
    AEGIS_PATH_PLAYER_SELF_KNOCKBACK_FACTOR,

    AEGIS_CHARGE_MAX_CHARGE_TIME, AEGIS_CHARGE_MIN_DAMAGE, AEGIS_CHARGE_MAX_DAMAGE_SCALE_PER_SECOND_CHARGED,
    AEGIS_CHARGE_AOE_RADIUS, AEGIS_CHARGE_DR_DURING_DASH, AEGIS_CHARGE_COOLDOWN, AEGIS_CHARGE_DASH_SPEED_FACTOR,
    SEISMIC_SLAM_DAMAGE_BASE, SEISMIC_SLAM_DAMAGE_MAXHP_SCALE, SEISMIC_SLAM_DAMAGE_RADIUS_SCALE,
    SEISMIC_SLAM_AOE_RADIUS, SEISMIC_SLAM_KNOCKBACK_FORCE_NON_BOSS, SEISMIC_SLAM_BOSS_STAGGER_DURATION,
    SEISMIC_SLAM_BOSS_KNOCKBACK_MINOR, SEISMIC_SLAM_COOLDOWN,
    BLOODPACT_DURATION, BLOODPACT_LIFESTEAL_PERCENT, BLOODPACT_COOLDOWN,
    SAVAGE_HOWL_FEAR_RADIUS, SAVAGE_HOWL_FEAR_DURATION, SAVAGE_HOWL_ATTACK_SPEED_BUFF_PERCENT,
    SAVAGE_HOWL_ATTACK_SPEED_BUFF_DURATION, SAVAGE_HOWL_COOLDOWN,
    BUFF_NOTIFICATION_DURATION,
    PLAYER_GRAVITY_WELL_ABSORBED_RAY_COLOR,
    CLOSE_SHAVE_HP_THRESHOLD
} from './constants.js';
import * as GameState from './gameState.js';
import { checkCollision, hexToRgb, lightenColor, isLineSegmentIntersectingCircle, getPooledRay } from './utils.js';
import {
    playSound, stopSound,
    playerHitSound, shieldOverchargeSound, omegaLaserSound, teleportSound, empBurstSound,
    playerWellDeploySound, playerWellDetonateSound,
    shootSound,
    bossHitSound as audioBossHitSound,
    savageHowlSound,
    upgradeSound as audioUpgradeSound,
} from './audio.js';
import { PlayerGravityWell, Ray } from './ray.js';
import { NexusWeaverBoss } from './nexusWeaverBoss.js'; 
import { BossNPC } from './bossBase.js'; 

const AEGIS_RAM_COOLDOWN = 300; 

// Aegis Charge Visual Constants
const AEGIS_CHARGE_INDICATOR_RADIUS_OFFSET = 8;
const AEGIS_CHARGE_INDICATOR_LINE_WIDTH = 5;
const AEGIS_CHARGE_INDICATOR_COLOR_CHARGING = 'rgba(100, 180, 255, 0.7)'; 
const AEGIS_CHARGE_INDICATOR_COLOR_FULL = 'rgba(255, 215, 0, 0.9)';
const AEGIS_CHARGE_READY_PULSE_COLOR = 'rgba(100, 180, 255, 0.3)';


export class Player {
    constructor(x, y, initialPlayerSpeed) {
        this.x = x; this.y = y;
        this.initialBaseRadius = PLAYER_BASE_RADIUS;
        this.bonusBaseRadius = 0;
        this.baseRadius = this.initialBaseRadius + this.bonusBaseRadius;
        this.scoreBasedSize = 0;
        this.scoreOffsetForSizing = 0;
        this.radius = this.baseRadius;

        this.hp = PLAYER_MAX_HP; this.maxHp = PLAYER_MAX_HP; this.aimAngle = 0;
        this.shootCooldownTimer = 0;

        this.immuneColorsList = [];
        this.velX = 0; this.velY = 0;
        this.pickupAttractionLevel = 0;
        this.pickupAttractionRadius = 0;
        this.evolutionIntervalModifier = 1.0; this.rayDamageBonus = 0;
        this.hasTargetPierce = false; this.chainReactionChance = 0.0;
        this.scatterShotLevel = 0; this.ownRaySpeedMultiplier = 1.0;

        this.damageTakenMultiplier = 1.0;

        this.hpPickupBonus = 0;
        this.abilityDamageMultiplier = 1.0;
        this.temporalEchoChance = 0.0;
        this.temporalEchoFixedReduction = 2000;

        this.globalCooldownReduction = 0.0;

        this.rayCritChance = 0.0;
        this.rayCritDamageMultiplier = 1.5;
        this.abilityCritChance = 0.0;
        this.abilityCritDamageMultiplier = 1.5;

        this.kineticCharge = 0;
        this.baseKineticChargeRate = 0;
        this.kineticConversionLevel = 0;
        this.initialKineticDamageBonus = 0;
        this.kineticChargeConsumption = 100;
        this.magePathTimeElapsed = 0;
        this.kineticConversionScaleTimer = 0;
        this.kineticConversionScaleInterval = 60000;
        // <<< THIS IS THE FIX >>>
        this.kineticConversionScalingFactor = 1.3;

        this.currentOmegaLaserKineticBoost = 1.0;
        this.currentGravityWellKineticBoost = 1.0;

        this.timeSinceLastHit = Number.MAX_SAFE_INTEGER;
        this.hpRegenTimer = 0; this.baseHpRegenAmount = 1;
        this.hpRegenBonusFromEvolution = 0;
        this.hpRegenPathMultiplier = 1.0; 
        this.acquiredBossUpgrades = [];
        this.acquiredEvolutions = [];

        this.currentPath = null;
        this.hasBerserkersEchoHelm = false;
        this.hasUltimateConfigurationHelm = false;
        this.hasAegisPathHelm = false;
        this.berserkerPermanentRayDamageMultiplier = 1.0;
        this.berserkerRagePercentage = 0;
        this.berserkerRageHighDurationTimer = 0; 
        this.berserkerUnstoppableFuryTimer = 0;
        this.totalTimeInBossFight = 0;       
        this.timeWithHighRageInBossFight = 0;  
        this.highValueMaintainedForAchievement = null; 
        this.aegisRamCooldownTimer = 0;

        this.activeAbilities = {
            '1': null,
            '2': null,
            '3': null
        };
        this.visualModifiers = {};
        this.bleedOnHit = false;
        this.momentumDamageBonus = 0;
        this.bossDamageReduction = 0.0;
        this.teleporting = false; this.teleportEffectTimer = 0;
        this.activeMiniWell = null;
        this.phaseStabilizerAnimTimer = Math.random() * 5000;
        this.naniteAnimTimer = Math.random() * 5000;
        this.momentumAnimTimer = Math.random() * 5000;
        this.ablativeAnimTimer = Math.random() * 5000;
        this.aegisAnimTimer = Math.random() * 5000;
        this.timesHit = 0; 
        this.flawlessStreakActive = true; 
        this.totalDamageDealt = 0;
        this.targetsDestroyedThisRun = 0;
        this.originalPlayerSpeed = initialPlayerSpeed;
        this.currentSpeed = initialPlayerSpeed;

        this.hasOmegaLaser = false;
        this.isFiringOmegaLaser = false;
        this.omegaLaserTimer = 0;
        this.omegaLaserDuration = OMEGA_LASER_DURATION;
        this.omegaLaserCooldownTimer = 0;
        this.omegaLaserCooldown = OMEGA_LASER_COOLDOWN;
        this.omegaLaserAngle = 0;
        this.omegaLaserDamagePerTick = OMEGA_LASER_DAMAGE_PER_TICK;
        this.omegaLaserTickInterval = OMEGA_LASER_TICK_INTERVAL;
        this.omegaLaserCurrentTickTimer = 0;
        this.omegaLaserRange = OMEGA_LASER_RANGE;
        this.omegaLaserWidth = OMEGA_LASER_WIDTH;

        this.hasShieldOvercharge = false;
        this.isShieldOvercharging = false;
        this.shieldOverchargeTimer = 0;
        this.shieldOverchargeDuration = SHIELD_OVERCHARGE_DURATION;
        this.shieldOverchargeCooldownTimer = 0;
        this.shieldOverchargeCooldown = SHIELD_OVERCHARGE_COOLDOWN;
        this.raysAbsorbedThisShieldOvercharge = 0;


        this.hasAegisCharge = false;
        this.isChargingAegisCharge = false;
        this.aegisChargeCurrentChargeTime = 0;
        this.aegisChargeCooldownTimer = 0;
        this.isAegisChargingDash = false;
        this.aegisChargeDashTargetX = 0;
        this.aegisChargeDashTargetY = 0;
        this.aegisChargeDashTimer = 0;
        this.currentChargeRotation = 0;
        this.aegisChargeBossDamageDealtThisRun = 0;

        this.hasSeismicSlam = false;
        this.seismicSlamCooldownTimer = 0;

        this.hasBloodpact = false;
        this.isBloodpactActive = false;
        this.bloodpactTimer = 0;
        this.bloodpactCooldownTimer = 0;
        this.healingThisBloodpact = 0;

        this.hasSavageHowl = false;
        this.savageHowlCooldownTimer = 0;
        this.isSavageHowlAttackSpeedBuffActive = false;
        this.savageHowlAttackSpeedBuffTimer = 0;

        this.evolutionReRollsRemaining = MAX_EVOLUTION_REROLLS;
        this.blockedEvolutionIds = [];
        this.evolutionBlocksRemaining = MAX_EVOLUTION_BLOCKS;
        this.evolutionFreezesRemaining = MAX_EVOLUTION_FREEZES_PER_RUN;
        this.frozenEvolutionChoice = null;
        this.isFreezeModeActive = false;
        this.hasUsedFreezeForCurrentOffers = false;

        this.rerollsUsedThisRun = false; 
        this.blocksUsedThisRun = false;  
        this.freezesUsedThisRun = false; 

        this.usedAbilityInCurrentBossFight = false;
        this.hasTriggeredAegisPassiveBossDamageThisRun = false;
        this.isAegisTeleportImpactPending = false; 
        this.aegisTeleportImpactTimer = 0; 

        this.damageTakenThisBossFight = 0;
        this.teleportTimestamps = [];
        this.eventDataForNextSignal = {};
        this.heartsCollectedThisRun = 0; 
        this.bonusPointsCollectedThisRun = 0; 
        this.nexusMinionsKilledThisNexusT3Fight = 0; 
        this.mageFullChargeUses = {};

        this.update = (gameContext) => {
            const { dt, keys, mouseX, mouseY, canvasWidth, canvasHeight, targets, activeBosses,
                    currentGrowthFactor,
                    currentEffectiveDefaultGrowthFactor,
                    updateHealthDisplayCallback, updateAbilityCooldownCallback,
                    isAnyPauseActiveCallback, getBossManager,
                    decoysArray, bossDefeatEffectsArray, allRays,
                    screenShakeParams, activeBuffNotificationsArray, score,
                    evolutionChoices,
                    ui, CONSTANTS: gameConstants,
                    endGameCallback, updateScoreCallback,
                    signalAchievementEvent
                  } = gameContext;


            this.timeSinceLastHit += dt;
            this.aegisAnimTimer += dt;

            if (this.aegisRamCooldownTimer > 0) {
                this.aegisRamCooldownTimer -= dt;
                if (this.aegisRamCooldownTimer < 0) this.aegisRamCooldownTimer = 0;
            }

            if (this.teleporting && this.teleportEffectTimer > 0) {
                this.teleportEffectTimer -= dt;
                if (this.teleportEffectTimer <= 0) {
                    this.teleporting = false; this.teleportEffectTimer = 0;
                }
            }

            if (this.isAegisTeleportImpactPending && this.aegisTeleportImpactTimer > 0) {
                this.aegisTeleportImpactTimer -= dt;
                if (this.aegisTeleportImpactTimer <= 0) {
                    this.isAegisTeleportImpactPending = false;
                    this.aegisTeleportImpactTimer = 0;
                }
            }


            if (this.currentPath === 'aegis' && this.isChargingAegisCharge) {
                const chargeProgress = Math.min(1, this.aegisChargeCurrentChargeTime / AEGIS_CHARGE_MAX_CHARGE_TIME);
                const maxSpinSpeed = Math.PI / 15;
                const currentSpinSpeed = chargeProgress * maxSpinSpeed;
                this.currentChargeRotation += currentSpinSpeed * (dt / (1000/60));
                this.currentChargeRotation %= (Math.PI * 2);
            } else if (this.currentPath === 'aegis' && !this.isChargingAegisCharge && !this.isAegisChargingDash) {
                 if (this.currentChargeRotation !== 0) {
                    this.currentChargeRotation *= 0.9;
                    if (Math.abs(this.currentChargeRotation) < 0.01) this.currentChargeRotation = 0;
                }
            } else if (this.currentPath !== 'aegis' && this.currentChargeRotation !== 0) {
                this.currentChargeRotation = 0;
            }


            let numericAbilityUIUpdateNeeded = false;
            for (const slot in this.activeAbilities) {
                 if (this.activeAbilities[slot]) {
                    let effectiveCooldownMultiplier = 1.0 - this.globalCooldownReduction;
                    effectiveCooldownMultiplier = Math.max(0.1, effectiveCooldownMultiplier);

                    if (this.activeAbilities[slot].cooldownTimer > 0) {
                        this.activeAbilities[slot].cooldownTimer -= dt / effectiveCooldownMultiplier;
                        numericAbilityUIUpdateNeeded = true;
                        if (this.activeAbilities[slot].cooldownTimer <= 0) {
                            this.activeAbilities[slot].cooldownTimer = 0;
                            this.activeAbilities[slot].justBecameReady = true;
                        } else {
                            this.activeAbilities[slot].justBecameReady = false;
                        }
                    } else if (this.activeAbilities[slot].cooldownTimer <= 0 && !this.activeAbilities[slot].justBecameReady) {
                         this.activeAbilities[slot].justBecameReady = true;
                         numericAbilityUIUpdateNeeded = true;
                    }
                }
            }

            let mouseAbilityUIUpdateNeeded = false;
            const updateGenericMouseAbility_local = (abilityActiveProp, abilityTimerProp, abilityCooldownTimerProp, abilityCooldownConst, abilityDurationConst = 0) => {
                let effectiveCooldownMultiplier = 1.0 - this.globalCooldownReduction;
                effectiveCooldownMultiplier = Math.max(0.1, effectiveCooldownMultiplier);
                let justFinished = false;

                if (this[abilityActiveProp]) {
                    this[abilityTimerProp] -= dt;
                    mouseAbilityUIUpdateNeeded = true;
                    if (this[abilityTimerProp] <= 0) {
                        this[abilityActiveProp] = false;
                        justFinished = true;
                        let cd = abilityCooldownConst * (1.0 - this.globalCooldownReduction);
                        this[abilityCooldownTimerProp] = Math.max(abilityCooldownConst * 0.1, cd);
                    }
                } else if (this[abilityCooldownTimerProp] > 0) {
                    this[abilityCooldownTimerProp] -= dt / effectiveCooldownMultiplier;
                    mouseAbilityUIUpdateNeeded = true;
                    if (this[abilityCooldownTimerProp] < 0) this[abilityCooldownTimerProp] = 0;
                }
                return justFinished;
            };

            if (this.currentPath === 'mage') {
                if (this.hasOmegaLaser) {
                    if (this.isFiringOmegaLaser) {
                        if (isAnyPauseActiveCallback && !isAnyPauseActiveCallback()) this.omegaLaserAngle = Math.atan2(mouseY - this.y, mouseX - this.x);
                        this.omegaLaserTimer -= dt; this.omegaLaserCurrentTickTimer -= dt; mouseAbilityUIUpdateNeeded = true;
                        if (this.omegaLaserCurrentTickTimer <= 0) { this.dealOmegaLaserDamage(targets, activeBosses, { updateScoreCallback }); this.omegaLaserCurrentTickTimer = gameConstants.OMEGA_LASER_TICK_INTERVAL; }
                        if (this.omegaLaserTimer <= 0) {
                            this.isFiringOmegaLaser = false; stopSound(omegaLaserSound);
                            let cd = gameConstants.OMEGA_LASER_COOLDOWN * (1.0 - this.globalCooldownReduction); this.omegaLaserCooldownTimer = Math.max(gameConstants.OMEGA_LASER_COOLDOWN * 0.1, cd);
                            this.currentOmegaLaserKineticBoost = 1.0;
                        }
                    } else if (this.omegaLaserCooldownTimer > 0) { let ecm = Math.max(0.1, 1.0 - this.globalCooldownReduction); this.omegaLaserCooldownTimer -= dt/ecm; mouseAbilityUIUpdateNeeded = true; if(this.omegaLaserCooldownTimer < 0) this.omegaLaserCooldownTimer=0;}
                }
                if (this.hasShieldOvercharge) {
                    const shieldFinished = updateGenericMouseAbility_local('isShieldOvercharging', 'shieldOverchargeTimer', 'shieldOverchargeCooldownTimer', gameConstants.SHIELD_OVERCHARGE_COOLDOWN, gameConstants.SHIELD_OVERCHARGE_DURATION);
                    if (shieldFinished && signalAchievementEvent && this.raysAbsorbedThisShieldOvercharge >= 5) {
                        signalAchievementEvent("shield_siphon_mage");
                    }
                    if (shieldFinished || !this.isShieldOvercharging) {
                        this.raysAbsorbedThisShieldOvercharge = 0;
                    }
                }


                if (this.kineticConversionLevel > 0) {
                    this.magePathTimeElapsed += dt;
                    this.kineticConversionScaleTimer += dt;
                    if (this.kineticConversionScaleTimer >= this.kineticConversionScaleInterval) {
                        this.initialKineticDamageBonus *= this.kineticConversionScalingFactor;
                        this.baseKineticChargeRate *= this.kineticConversionScalingFactor;
                        this.kineticConversionScaleTimer -= this.kineticConversionScaleInterval;
                        if(activeBuffNotificationsArray) activeBuffNotificationsArray.push({ text: `Kinetic Power Amplified!`, timer: BUFF_NOTIFICATION_DURATION });
                        playSound(audioUpgradeSound);
                    }
                }

            } else if (this.currentPath === 'aegis') {
                if (this.hasAegisCharge) {
                    if(this.isChargingAegisCharge) {
                         this.aegisChargeCurrentChargeTime += dt;
                         if (this.aegisChargeCurrentChargeTime > AEGIS_CHARGE_MAX_CHARGE_TIME) {
                            this.aegisChargeCurrentChargeTime = AEGIS_CHARGE_MAX_CHARGE_TIME;
                         }
                    }
                    if(this.isAegisChargingDash) {
                        this.aegisChargeDashTimer -= dt;
                        const dashSpeed = this.originalPlayerSpeed * gameConstants.AEGIS_CHARGE_DASH_SPEED_FACTOR;
                        const angle = Math.atan2(this.aegisChargeDashTargetY - this.y, this.aegisChargeDashTargetX - this.x);
                        const dxDash = Math.cos(angle) * dashSpeed;
                        const dyDash = Math.sin(angle) * dashSpeed;
                        this.x += dxDash * (dt / (1000/60)); this.y += dyDash * (dt / (1000/60));
                        if (Math.hypot(this.x - this.aegisChargeDashTargetX, this.y - this.aegisChargeDashTargetY) < dashSpeed * 0.5 || this.aegisChargeDashTimer <= 0) {
                            this.isAegisChargingDash = false; this.aegisChargeDashTimer = 0;
                            this.currentChargeRotation = 0;
                            this.dealAegisChargeImpactDamage(activeBosses, targets, {updateScoreCallback, signalAchievementEvent}); 
                            let cd = gameConstants.AEGIS_CHARGE_COOLDOWN * (1.0 - this.globalCooldownReduction); this.aegisChargeCooldownTimer = Math.max(gameConstants.AEGIS_CHARGE_COOLDOWN * 0.1, cd);
                        }
                         mouseAbilityUIUpdateNeeded = true;
                    } else if (this.aegisChargeCooldownTimer > 0) { let ecm = Math.max(0.1, 1.0 - this.globalCooldownReduction); this.aegisChargeCooldownTimer -= dt/ecm; mouseAbilityUIUpdateNeeded = true; if(this.aegisChargeCooldownTimer < 0) this.aegisChargeCooldownTimer=0;}
                }
                if (this.hasSeismicSlam && this.seismicSlamCooldownTimer > 0) {let ecm = Math.max(0.1, 1.0 - this.globalCooldownReduction); this.seismicSlamCooldownTimer -= dt/ecm; mouseAbilityUIUpdateNeeded = true; if(this.seismicSlamCooldownTimer < 0) this.seismicSlamCooldownTimer=0;}
            } else if (this.currentPath === 'berserker') {
                const bloodpactFinished = updateGenericMouseAbility_local('isBloodpactActive', 'bloodpactTimer', 'bloodpactCooldownTimer', gameConstants.BLOODPACT_COOLDOWN, gameConstants.BLOODPACT_DURATION);
                if (bloodpactFinished && signalAchievementEvent && this.healingThisBloodpact >= 50) {
                    signalAchievementEvent("bloodpact_heal_amount", { healedThisActivation: this.healingThisBloodpact });
                }
                if (bloodpactFinished || !this.isBloodpactActive) {
                    this.healingThisBloodpact = 0;
                }

                if (this.hasSavageHowl) {
                     if (this.savageHowlAttackSpeedBuffTimer > 0) { this.savageHowlAttackSpeedBuffTimer -= dt; mouseAbilityUIUpdateNeeded = true; if (this.savageHowlAttackSpeedBuffTimer <= 0) this.isSavageHowlAttackSpeedBuffActive = false;}
                     if (this.savageHowlCooldownTimer > 0) {let ecm = Math.max(0.1, 1.0 - this.globalCooldownReduction); this.savageHowlCooldownTimer -= dt/ecm; mouseAbilityUIUpdateNeeded = true; if(this.savageHowlCooldownTimer < 0) this.savageHowlCooldownTimer=0;}
                }
            }


            const forceUIUpdate = gameContext && gameContext.forceAbilityUIUpdate;
            if (numericAbilityUIUpdateNeeded || mouseAbilityUIUpdateNeeded || forceUIUpdate) {
                if (updateAbilityCooldownCallback) updateAbilityCooldownCallback(this);
                if(forceUIUpdate && gameContext) gameContext.forceAbilityUIUpdate = false;
            }


            this.x += this.velX; this.y += this.velY;
            this.velX *= 0.95; this.velY *= 0.95;
            if (Math.abs(this.velX) < 0.1) this.velX = 0;
            if (Math.abs(this.velY) < 0.1) this.velY = 0;

            let dxMovement = 0, dyMovement = 0;
            if (!this.isAegisChargingDash) {
                if (keys.ArrowUp || keys.w) dyMovement -= 1;
                if (keys.ArrowDown || keys.s) dyMovement += 1;
                if (keys.ArrowLeft || keys.a) dxMovement -= 1;
                if (keys.ArrowRight || keys.d) dxMovement += 1;
            }


            let actualCurrentSpeed = this.originalPlayerSpeed;
            if (this.isFiringOmegaLaser && this.currentPath === 'mage') actualCurrentSpeed = this.originalPlayerSpeed / 2;
            else {
                let speedMultiplier = 1.0;
                if (this.hasBerserkersEchoHelm) {
                    const missingHpPercentage = (this.maxHp - this.hp) / this.maxHp;
                    const tenPercentIncrements = Math.floor(missingHpPercentage * 10);
                    if (tenPercentIncrements > 0) speedMultiplier *= (1 + (tenPercentIncrements * BERSERKERS_ECHO_SPEED_PER_10_HP));
                }
                actualCurrentSpeed *= speedMultiplier;
            }
            this.currentSpeed = actualCurrentSpeed;


            let playerIsActuallyMoving = false;
            if (dxMovement !== 0 || dyMovement !== 0) {
                playerIsActuallyMoving = true;
                if (dxMovement !== 0 && dyMovement !== 0) {
                    const m = Math.sqrt(2);
                    dxMovement = (dxMovement / m) * this.currentSpeed;
                    dyMovement = (dyMovement / m) * this.currentSpeed;
                } else {
                    dxMovement *= this.currentSpeed;
                    dyMovement *= this.currentSpeed;
                }
            }

            if (this.kineticConversionLevel > 0) {
                if (playerIsActuallyMoving) {
                    this.kineticCharge = Math.min(100, this.kineticCharge + this.baseKineticChargeRate * (dt / 1000));
                }
            }

            if (this.currentPath === 'berserker') {
                const missingHpPercentage = Math.max(0, (this.maxHp - this.hp) / this.maxHp);
                const tenPercentIncrements = Math.floor(missingHpPercentage * 10);
                this.berserkerRagePercentage = tenPercentIncrements * BERSERKERS_ECHO_DAMAGE_PER_10_HP * 100;
                // Logic for "Unstoppable Fury" (Easy achievement, >=70% rage)
                if (this.berserkerRagePercentage >= 70) {
                    this.berserkerUnstoppableFuryTimer = (this.berserkerUnstoppableFuryTimer || 0) + dt;
                } else {
                    this.berserkerUnstoppableFuryTimer = 0;
                }
                // Logic for "Sustained Fury" (Master achievement, >50% rage)
                if (this.berserkerRagePercentage > 50) {
                    this.berserkerRageHighDurationTimer = (this.berserkerRageHighDurationTimer || 0) + dt;
                } else {
                    this.berserkerRageHighDurationTimer = 0;
                }
            } else { // if not berserker, reset timers
                 this.berserkerRagePercentage = 0;
                 this.berserkerUnstoppableFuryTimer = 0;
                 this.berserkerRageHighDurationTimer = 0;
            }


            let nX = this.x + dxMovement; let nY = this.y + dyMovement;
            if(targets && targets.length > 0){
                for (const t of targets) { if (checkCollision({ x: nX, y: this.y, radius: this.radius }, t)) { nX = this.x; break; } }
                for (const t of targets) { if (checkCollision({ x: this.x, y: nY, radius: this.radius }, t)) { nY = this.y; break; } }
            }
            if (activeBosses && activeBosses.length > 0) {
                if (!(this.teleporting && this.teleportEffectTimer > 0)) {
                    for (const boss of activeBosses) {
                        if (checkCollision({ x: nX, y: this.y, radius: this.radius }, boss)) {
                            nX = this.x; break;
                        }
                    }
                    for (const boss of activeBosses) {
                        if (checkCollision({ x: this.x, y: nY, radius: this.radius }, boss)) {
                            nY = this.y; break;
                        }
                    }
                }
            }


            this.x = nX; this.y = nY;

            this.baseRadius = this.initialBaseRadius + this.bonusBaseRadius;
            let effectiveScoreForSizing = Math.max(0, score - this.scoreOffsetForSizing);

            if (currentGrowthFactor > 0) this.scoreBasedSize = effectiveScoreForSizing * currentGrowthFactor;
            this.radius = this.baseRadius + this.scoreBasedSize;
            this.radius = Math.max(MIN_PLAYER_BASE_RADIUS, this.radius);

            this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
            this.y = Math.max(this.radius, Math.min(this.y, canvasHeight - this.radius));

            if (isAnyPauseActiveCallback && !isAnyPauseActiveCallback()) {
                if (!this.isFiringOmegaLaser && !this.isChargingAegisCharge && !this.isAegisChargingDash) {
                    this.aimAngle = Math.atan2(mouseY - this.y, mouseX - this.x);
                }
            }


            if (!isAnyPauseActiveCallback || !isAnyPauseActiveCallback()) {
                this.shootCooldownTimer -= dt;
                if (this.currentPath === 'aegis' && (this.isChargingAegisCharge || this.isAegisChargingDash)) {
                     this.shootCooldownTimer = GameState.getCurrentShootInterval();
                } else if (this.shootCooldownTimer <= 0 && !this.isFiringOmegaLaser) {

                    let currentShootIntervalModified = GameState.getCurrentShootInterval();
                    if (this.isSavageHowlAttackSpeedBuffActive && this.currentPath === 'berserker') {
                        currentShootIntervalModified /= (1 + SAVAGE_HOWL_ATTACK_SPEED_BUFF_PERCENT);
                    }
                    this.shootCooldownTimer = currentShootIntervalModified;


                    const baseRaySpeedMultiplier = GameState.getCurrentRaySpeedMultiplier();
                    const rayColors = GameState.getCurrentRayColors();
                    const selectedColor = rayColors[Math.floor(Math.random() * rayColors.length)];

                    let numRaysToShoot = 1;
                    if (this.scatterShotLevel > 0) numRaysToShoot += this.scatterShotLevel * 2;

                    for (let i = 0; i < numRaysToShoot; i++) {
                        let currentAimAngle = this.aimAngle;
                        if (numRaysToShoot > 1) {
                            const angleSpread = SCATTER_SHOT_ANGLE_OFFSET * (this.scatterShotLevel +1);
                            const rayIndexOffset = i - Math.floor(numRaysToShoot / 2);
                            currentAimAngle += rayIndexOffset * (angleSpread / (numRaysToShoot > 1 ? numRaysToShoot -1 : 1)) * 0.5 ;
                        }

                        let ray = getPooledRay();
                        if (ray) {
                            const spawnOffset = this.radius + RAY_RADIUS + RAY_SPAWN_FORWARD_OFFSET;
                            const raySpawnX = this.x + Math.cos(currentAimAngle) * spawnOffset;
                            const raySpawnY = this.y + Math.sin(currentAimAngle) * spawnOffset;

                            ray.reset(
                                raySpawnX, raySpawnY, selectedColor,
                                Math.cos(currentAimAngle), Math.sin(currentAimAngle),
                                baseRaySpeedMultiplier,
                                this,
                                GameState.getCurrentRayMaxLifetime(),
                                false, false, 0, false
                            );

                            if (this.kineticConversionLevel > 0 && this.kineticCharge >= this.kineticChargeConsumption) {
                                const damageMultiplier = this.consumeKineticChargeForDamageBoost('primary_fire'); 
                                ray.momentumDamageBonusValue = (ray.momentumDamageBonusValue || 0) + (damageMultiplier - 1);
                                 if (ui && ui.updateKineticChargeUI) {
                                    let maxPotencyBonusAtFullCharge = this.initialKineticDamageBonus;
                                    ui.updateKineticChargeUI(this.kineticCharge, this.kineticChargeConsumption, maxPotencyBonusAtFullCharge, this.kineticConversionLevel > 0);
                                }
                            }
                            if (this.isBloodpactActive && this.currentPath === 'berserker') ray.lifestealPercent = BLOODPACT_LIFESTEAL_PERCENT;
                            else ray.lifestealPercent = 0;

                            if (allRays && Array.isArray(allRays)) allRays.push(ray);
                            else console.error("Player.update: allRays is not available or not an array for pushing new ray.");
                            playSound(shootSound);
                        }
                    }
                }
            }


            if (this.hp > 0 && this.hp < this.maxHp) {
                this.hpRegenTimer += dt;
                if (this.hpRegenTimer >= HP_REGEN_INTERVAL) {
                    this.hpRegenTimer -= HP_REGEN_INTERVAL;
                    const regenAmount = (this.baseHpRegenAmount + this.hpRegenBonusFromEvolution) * this.hpRegenPathMultiplier;
                    this.gainHealth(regenAmount, updateHealthDisplayCallback);
                }
            }
        }; // End of update method

        this.handleAegisCollisionWithBoss = (boss, gameContext) => {
            if (!this.hasAegisPathHelm || !boss || boss.health <= 0 || this.currentPath !== 'aegis') return;

            this.aegisRamCooldownTimer = AEGIS_RAM_COOLDOWN;

            if (boss.lastHitByAegisTimer && (Date.now() - boss.lastHitByAegisTimer < 200) ) return false;

            let collisionDamage = AEGIS_PATH_BASE_COLLISION_DAMAGE;
            collisionDamage += (this.maxHp * AEGIS_PATH_MAX_HP_SCALING_FACTOR);
            collisionDamage += (this.radius * AEGIS_PATH_RADIUS_SCALING_FACTOR);
            collisionDamage = Math.round(collisionDamage);

            if (typeof boss.takeDamage === 'function') {
                const damageApplied = boss.takeDamage(collisionDamage, null, this, { isAegisCollision: true });
                if (damageApplied > 0) {
                    playSound(audioBossHitSound);
                    this.totalDamageDealt += damageApplied;
                    boss.lastHitByAegisTimer = Date.now();
                     if (gameContext.screenShakeParams) {
                        gameContext.screenShakeParams.isScreenShaking = true;
                        gameContext.screenShakeParams.screenShakeTimer = 200;
                        gameContext.screenShakeParams.currentShakeMagnitude = 4;
                        gameContext.screenShakeParams.currentShakeType = 'playerHit';
                     }
                    if (!this.hasTriggeredAegisPassiveBossDamageThisRun && gameContext.signalAchievementEvent) {
                        gameContext.signalAchievementEvent("aegis_passive_collision_damage_boss");
                        this.hasTriggeredAegisPassiveBossDamageThisRun = true;
                    }
                }
            }

            if (typeof boss.x !== 'undefined' && typeof boss.y !== 'undefined') {
                const angleToBoss = Math.atan2(boss.y - this.y, boss.x - this.x);
                const knockbackForce = AEGIS_PATH_BOSS_KNOCKBACK_FORCE;
                if (typeof boss.recoilVelX === 'number' && typeof boss.recoilVelY === 'number') {
                    boss.recoilVelX += Math.cos(angleToBoss) * knockbackForce;
                    boss.recoilVelY += Math.sin(angleToBoss) * knockbackForce;
                    const stunDuration = boss.PLAYER_COLLISION_STUN_DURATION || boss.AEGIS_PASSIVE_BOSS_STUN_DURATION || 200;
                    if (typeof boss.playerCollisionStunTimer === 'number') {
                         boss.playerCollisionStunTimer = Math.max(boss.playerCollisionStunTimer, stunDuration * 0.5); 
                         if(typeof boss.speed === 'number') boss.speed = 0;
                    }
                } else {
                    boss.x += Math.cos(angleToBoss) * knockbackForce * 0.1;
                    boss.y += Math.sin(angleToBoss) * knockbackForce * 0.1;
                }
            }

            const angleFromBoss = Math.atan2(this.y - boss.y, this.x - boss.x);
            this.velX += Math.cos(angleFromBoss) * AEGIS_PATH_BOSS_KNOCKBACK_FORCE * AEGIS_PATH_PLAYER_SELF_KNOCKBACK_FACTOR;
            this.velY += Math.sin(angleFromBoss) * AEGIS_PATH_BOSS_KNOCKBACK_FORCE * AEGIS_PATH_PLAYER_SELF_KNOCKBACK_FACTOR;
            return true; 
        };
    } // End of constructor

    reset(canvasWidth, canvasHeight) {
        this.x = canvasWidth ? canvasWidth / 2 : PLAYER_BASE_RADIUS * 5;
        this.y = canvasHeight ? canvasHeight / 2 : PLAYER_BASE_RADIUS * 5;
        this.initialBaseRadius = PLAYER_BASE_RADIUS;
        this.bonusBaseRadius = 0;
        this.baseRadius = this.initialBaseRadius + this.bonusBaseRadius;
        this.scoreBasedSize = 0;
        this.scoreOffsetForSizing = 0;
        this.radius = this.baseRadius;
        this.hp = PLAYER_MAX_HP;
        this.maxHp = PLAYER_MAX_HP;
        this.aimAngle = 0;
        this.shootCooldownTimer = 0;
        this.immuneColorsList = [];
        this.velX = 0; this.velY = 0;
        this.pickupAttractionLevel = 0;
        this.pickupAttractionRadius = 0;
        this.evolutionIntervalModifier = 1.0;
        this.rayDamageBonus = 0;
        this.hasTargetPierce = false;
        this.chainReactionChance = 0.0;
        this.scatterShotLevel = 0;
        this.ownRaySpeedMultiplier = 1.0;
        this.damageTakenMultiplier = 1.0;
        this.hpPickupBonus = 0;
        this.abilityDamageMultiplier = 1.0;
        this.temporalEchoChance = 0.0;
        this.globalCooldownReduction = 0.0;
        this.rayCritChance = 0.0;
        this.rayCritDamageMultiplier = 1.5;
        this.abilityCritChance = 0.0;
        this.abilityCritDamageMultiplier = 1.5;
        this.acquiredEvolutions = [];

        this.kineticCharge = 0;
        this.baseKineticChargeRate = 0;
        this.kineticConversionLevel = 0;
        this.initialKineticDamageBonus = 0;
        this.magePathTimeElapsed = 0;
        this.kineticConversionScaleTimer = 0;

        this.timeSinceLastHit = Number.MAX_SAFE_INTEGER;
        this.hpRegenTimer = 0;
        this.hpRegenBonusFromEvolution = 0;
        this.hpRegenPathMultiplier = 1.0; 
        this.acquiredBossUpgrades = [];

        this.currentPath = null;
        this.hasBerserkersEchoHelm = false;
        this.hasUltimateConfigurationHelm = false;
        this.hasAegisPathHelm = false;
        this.berserkerPermanentRayDamageMultiplier = 1.0;
        this.berserkerRagePercentage = 0;
        this.berserkerRageHighDurationTimer = 0;
        this.berserkerUnstoppableFuryTimer = 0;
        this.totalTimeInBossFight = 0;       
        this.timeWithHighRageInBossFight = 0;  
        this.highValueMaintainedForAchievement = null;
        this.aegisRamCooldownTimer = 0;

        this.activeAbilities = { '1': null, '2': null, '3': null };
        this.visualModifiers = {};
        this.bleedOnHit = false;
        this.momentumDamageBonus = 0;
        this.bossDamageReduction = 0.0;
        this.teleporting = false;
        this.teleportEffectTimer = 0;
        this.activeMiniWell = null;
        this.timesHit = 0; 
        this.flawlessStreakActive = true; 
        this.totalDamageDealt = 0;
        this.targetsDestroyedThisRun = 0;
        this.usedAbilityInCurrentBossFight = false;
        this.currentSpeed = this.originalPlayerSpeed;

        this.hasOmegaLaser = false; this.isFiringOmegaLaser = false; this.omegaLaserTimer = 0; this.omegaLaserCooldownTimer = 0;
        this.hasShieldOvercharge = false; this.isShieldOvercharging = false; this.shieldOverchargeTimer = 0; this.shieldOverchargeCooldownTimer = 0;
        this.raysAbsorbedThisShieldOvercharge = 0;

        this.hasAegisCharge = false; this.isChargingAegisCharge = false; this.aegisChargeCurrentChargeTime = 0; this.aegisChargeCooldownTimer = 0;
        this.isAegisChargingDash = false; this.aegisChargeDashTimer = 0;
        this.currentChargeRotation = 0;
        this.aegisChargeBossDamageDealtThisRun = 0;

        this.hasSeismicSlam = false; this.seismicSlamCooldownTimer = 0;

        this.hasBloodpact = false; this.isBloodpactActive = false; this.bloodpactTimer = 0; this.bloodpactCooldownTimer = 0;
        this.healingThisBloodpact = 0;

        this.hasSavageHowl = false;
        this.savageHowlCooldownTimer = 0;
        this.isSavageHowlAttackSpeedBuffActive = false;
        this.savageHowlAttackSpeedBuffTimer = 0;

        this.evolutionReRollsRemaining = MAX_EVOLUTION_REROLLS;
        this.blockedEvolutionIds = [];
        this.evolutionBlocksRemaining = MAX_EVOLUTION_BLOCKS;
        this.evolutionFreezesRemaining = MAX_EVOLUTION_FREEZES_PER_RUN;
        this.frozenEvolutionChoice = null;
        this.isFreezeModeActive = false;
        this.hasUsedFreezeForCurrentOffers = false;

        this.rerollsUsedThisRun = false; 
        this.blocksUsedThisRun = false;  
        this.freezesUsedThisRun = false; 

        this.hasTriggeredAegisPassiveBossDamageThisRun = false;
        this.isAegisTeleportImpactPending = false; 
        this.aegisTeleportImpactTimer = 0;

        this.damageTakenThisBossFight = 0;
        this.teleportTimestamps = [];
        this.eventDataForNextSignal = {};
        this.heartsCollectedThisRun = 0;
        this.bonusPointsCollectedThisRun = 0;
        this.nexusMinionsKilledThisNexusT3Fight = 0;
        this.mageFullChargeUses = {};
    }

    incrementNexusMinionsKilledThisFight() { 
        this.nexusMinionsKilledThisNexusT3Fight = (this.nexusMinionsKilledThisNexusT3Fight || 0) + 1;
    }

    drawHpBar(ctx) {
        if (!this || typeof this.hp === 'undefined' || typeof this.maxHp === 'undefined' || typeof this.radius === 'undefined' || isNaN(this.radius)) {
            return;
        }
        if (this.hp <= 0 || !ctx) return;
        const barWidth = this.radius * 2.5; const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 18;
        const healthPercentage = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(100,100,100,0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        const hpColor = healthPercentage > 0.6 ? '#00FF00' : healthPercentage > 0.3 ? '#FFFF00' : '#FF0000';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    draw(ctx, gameContext = {}) {
        if (!ctx) return;
        const { isCountingDownToResume = false,
                postPopupImmunityTimer: postPopupTimerFromCtx = 0,
                postDamageImmunityTimer: postDamageTimerFromCtx = 0,
                CONSTANTS: gameDrawConstants = CONSTANTS
              } = gameContext;
        const now = Date.now(); 
        this.naniteAnimTimer = this.naniteAnimTimer || now;
        this.momentumAnimTimer = this.momentumAnimTimer || now;
        this.ablativeAnimTimer = this.ablativeAnimTimer || now;
        this.aegisAnimTimer = this.aegisAnimTimer || now;


        this.drawHpBar(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.currentPath === 'aegis' && this.isChargingAegisCharge && this.currentChargeRotation !== 0) {
            ctx.rotate(this.currentChargeRotation);
        }

        ctx.save();
        if (this.hasAegisPathHelm) {
            ctx.fillStyle = "rgba(100, 150, 100, 0.7)";
            ctx.strokeStyle = "rgba(50, 100, 50, 0.9)";
            ctx.lineWidth = 2.0;

            const numSpikes = 7;
            const spikeAnimSpeed = 0.0015;
            const baseSpikeLength = this.radius * 0.35;
            const animSpikeLength = this.radius * 0.10 * Math.sin(this.aegisAnimTimer * spikeAnimSpeed);
            const spikeBaseWidth = this.radius * 0.15;

            for (let i = 0; i < numSpikes; i++) {
                const angle = (i / numSpikes) * Math.PI * 2 + (this.aegisAnimTimer * spikeAnimSpeed * 0.5);
                ctx.save();
                ctx.rotate(angle);
                const gradX = this.radius + baseSpikeLength / 2;
                const gradient = ctx.createLinearGradient(this.radius, 0, this.radius + baseSpikeLength + animSpikeLength, 0);
                gradient.addColorStop(0, "rgba(120, 180, 120, 0.8)");
                gradient.addColorStop(0.5, "rgba(80, 140, 80, 0.9)");
                gradient.addColorStop(1, "rgba(40, 90, 40, 0.8)");
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(this.radius - spikeBaseWidth * 0.2, -spikeBaseWidth / 2);
                ctx.lineTo(this.radius - spikeBaseWidth * 0.2, spikeBaseWidth / 2);
                ctx.lineTo(this.radius + baseSpikeLength + animSpikeLength, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        } else if (this.hasBerserkersEchoHelm) {
            ctx.fillStyle = "rgb(120, 20, 20)";
            ctx.strokeStyle = "rgb(50, 0, 0)";
            ctx.lineWidth = 1.5;
            const currentHp = typeof this.hp === 'number' ? this.hp : PLAYER_MAX_HP;
            const currentMaxHp = typeof this.maxHp === 'number' ? this.maxHp : PLAYER_MAX_HP;
            const missingHpFactor = currentMaxHp > 0 ? Math.max(0, (currentMaxHp - currentHp) / currentMaxHp) : 0;
            if (missingHpFactor > 0.05) {
                const helmGlowRadius = 5 + missingHpFactor * 20;
                const glowIntensity = 0.3 + missingHpFactor * 0.6;
                const helmGlowColor = `rgba(255, 0, 0, ${glowIntensity})`;
                ctx.shadowBlur = helmGlowRadius;
                ctx.shadowColor = helmGlowColor;
            }
            const hornBaseOffsetY = -this.radius * 0.5;
            const hornSideOffsetX = this.radius * 0.45;
            const hornTipOffsetY = -this.radius * 1.1;
            const hornTipSideOffsetX = this.radius * 0.7;
            ctx.beginPath();
            ctx.moveTo(-hornSideOffsetX, hornBaseOffsetY);
            ctx.quadraticCurveTo(-hornTipSideOffsetX * 0.8, hornTipOffsetY * 0.9, -hornTipSideOffsetX, hornTipOffsetY);
            ctx.quadraticCurveTo(-hornTipSideOffsetX * 0.6, hornTipOffsetY * 1.1, -hornSideOffsetX + this.radius * 0.15, hornBaseOffsetY + this.radius * 0.1);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(hornSideOffsetX, hornBaseOffsetY);
            ctx.quadraticCurveTo(hornTipSideOffsetX * 0.8, hornTipOffsetY * 0.9, hornTipSideOffsetX, hornTipOffsetY);
            ctx.quadraticCurveTo(hornTipSideOffsetX * 0.6, hornTipOffsetY * 1.1, hornSideOffsetX - this.radius * 0.15, hornBaseOffsetY + this.radius * 0.1);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
        } else if (this.hasUltimateConfigurationHelm) {
            ctx.fillStyle = "rgba(80, 0, 120, 0.85)";
            ctx.strokeStyle = "rgba(180, 120, 255, 0.9)";
            ctx.lineWidth = 2;
            const helmGlowRadius = 8 + Math.sin(now / 350) * 3;
            const helmGlowColor = "rgba(150, 100, 220, 0.4)";
            ctx.shadowBlur = helmGlowRadius;
            ctx.shadowColor = helmGlowColor;
            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 1.8);
            ctx.lineTo(-this.radius * 0.8, -this.radius * 0.5);
            ctx.quadraticCurveTo(0, -this.radius * 0.1, this.radius * 0.8, -this.radius * 0.5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.shadowColor = "transparent";
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(0, -this.radius * 1.5, this.radius * 0.15, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        if (this.currentPath === 'aegis' && this.hasAegisCharge) {
            const indicatorVisualRadius = this.radius + AEGIS_CHARGE_INDICATOR_RADIUS_OFFSET;
            ctx.lineWidth = AEGIS_CHARGE_INDICATOR_LINE_WIDTH;

            if (this.isChargingAegisCharge) { 
                const chargeProgress = Math.min(1, this.aegisChargeCurrentChargeTime / AEGIS_CHARGE_MAX_CHARGE_TIME);
                const endAngleProgress = -Math.PI / 2 + (chargeProgress * Math.PI * 2); 
                
                if (this.immuneColorsList.length > 0) {
                    const numColors = this.immuneColorsList.length;
                    const segmentAngleTotal = endAngleProgress - (-Math.PI / 2); 
                    const segmentAnglePerColor = segmentAngleTotal / numColors;
                    let currentSegmentStartAngle = -Math.PI / 2; 

                    for (let i = 0; i < numColors; i++) {
                        const color = this.immuneColorsList[i];
                        const segmentEnd = currentSegmentStartAngle + segmentAnglePerColor;
                        
                        if (segmentEnd > currentSegmentStartAngle) {
                            ctx.beginPath();
                            ctx.arc(0, 0, indicatorVisualRadius, currentSegmentStartAngle, Math.min(endAngleProgress, segmentEnd));
                            ctx.strokeStyle = chargeProgress >= 1 ? AEGIS_CHARGE_INDICATOR_COLOR_FULL : color;
                            ctx.stroke();
                        }
                        currentSegmentStartAngle = segmentEnd; 
                         if (currentSegmentStartAngle >= endAngleProgress - 0.001) break; 
                    }
                    
                    if (chargeProgress < 1 && currentSegmentStartAngle < endAngleProgress - 0.001) { 
                        ctx.beginPath();
                        ctx.arc(0, 0, indicatorVisualRadius, currentSegmentStartAngle, endAngleProgress); 
                        ctx.strokeStyle = AEGIS_CHARGE_INDICATOR_COLOR_CHARGING;
                        ctx.stroke();
                    }

                } else { 
                    ctx.beginPath();
                    ctx.arc(0, 0, indicatorVisualRadius, -Math.PI / 2, endAngleProgress); 
                    ctx.strokeStyle = chargeProgress >= 1 ? AEGIS_CHARGE_INDICATOR_COLOR_FULL : AEGIS_CHARGE_INDICATOR_COLOR_CHARGING;
                    ctx.stroke();
                }

                if (chargeProgress >= 1) { 
                    ctx.beginPath();
                    ctx.arc(0, 0, indicatorVisualRadius, 0, Math.PI * 2);
                    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + Math.abs(Math.sin(now / 150)) * 0.4})`;
                    ctx.lineWidth = AEGIS_CHARGE_INDICATOR_LINE_WIDTH + 2; 
                    ctx.stroke();
                }
            } else if (this.aegisChargeCooldownTimer <= 0 && !this.isAegisChargingDash) { 
                ctx.beginPath();
                ctx.arc(0, 0, indicatorVisualRadius, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(100, 180, 255, ${0.15 + Math.abs(Math.sin(now / 300)) * 0.15})`; 
                ctx.lineWidth = AEGIS_CHARGE_INDICATOR_LINE_WIDTH -1;
                ctx.stroke();
            }
        }


        if (this.teleporting && this.teleportEffectTimer > 0) {
            const effectProgress = 1 - (this.teleportEffectTimer / TELEPORT_IMMUNITY_DURATION);
            const alpha = 0.5 * (1 - effectProgress) + Math.abs(Math.sin(now / 80)) * 0.3;
            ctx.globalAlpha = alpha;
        }

        const isImmuneActiveForShield = postPopupTimerFromCtx > 0 || postDamageTimerFromCtx > 0 || this.isShieldOvercharging || (this.isAegisChargingDash && this.currentPath === 'aegis');
        if (isImmuneActiveForShield && !(this.teleporting && this.teleportEffectTimer > 0)) {
            ctx.beginPath();
            let shieldRadius = this.radius + 5;
            let shieldAlpha = 0.3;
            let shieldLineWidth = 3;
            let shieldColor = `rgba(150,150,255,${shieldAlpha})`;

            if (this.isShieldOvercharging && this.currentPath === 'mage') {
                shieldRadius = this.radius + 8;
                shieldAlpha = 0.6 + Math.abs(Math.sin(now / 80)) * 0.3;
                shieldLineWidth = 5;
                const r = 180 + Math.floor(Math.sin(now / 100) * 50);
                const g = 180 + Math.floor(Math.sin(now / 120) * 50);
                const b = 255;
                shieldColor = `rgba(${r},${g},${b},${shieldAlpha})`;
                ctx.save();
                ctx.globalAlpha = shieldAlpha * 0.5;
                const innerGlowRadius = this.radius + 2;
                const innerGradient = ctx.createRadialGradient(0,0, 0, 0,0, innerGlowRadius);
                innerGradient.addColorStop(0, `rgba(${r},${g},${b}, 0.6)`);
                innerGradient.addColorStop(1, `rgba(${r},${g},${b}, 0)`);
                ctx.fillStyle = innerGradient;
                ctx.arc(0,0, innerGlowRadius, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();
            } else if (this.isAegisChargingDash && this.currentPath === 'aegis') {
                shieldRadius = this.radius + 6;
                shieldAlpha = 0.4 + Math.abs(Math.sin(now / 100)) * 0.2;
                shieldLineWidth = 4;
                shieldColor = `rgba(200, 200, 220, ${shieldAlpha})`;
            }
             else {
                shieldAlpha = Math.max(
                    (postPopupTimerFromCtx / POST_POPUP_IMMUNITY_DURATION) * 0.4,
                    (postDamageTimerFromCtx / POST_DAMAGE_IMMUNITY_DURATION) * 0.6
                ) + 0.3;
                shieldColor = `rgba(200,200,255,${shieldAlpha})`;
            }
            ctx.strokeStyle = shieldColor;
            ctx.lineWidth = shieldLineWidth;
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;

        if (this.isBloodpactActive && this.currentPath === 'berserker') {
            const bloodpactProgress = this.bloodpactTimer / BLOODPACT_DURATION;
            const bloodAlpha = 0.3 + Math.sin(now / 100) * 0.2 * bloodpactProgress;
            ctx.fillStyle = `rgba(255, 0, 0, ${bloodAlpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 3 + (1 - bloodpactProgress) * 5, 0, Math.PI * 2);
            ctx.fill();
        }


        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = PLAYER_BASE_COLOR;
        ctx.fill();

        if (this.immuneColorsList.length > 0) {
            const sliceAngle = (Math.PI * 2) / this.immuneColorsList.length;
            for (let i = 0; i < this.immuneColorsList.length; i++) {
                ctx.beginPath(); ctx.moveTo(0, 0);
                const startAngle = i * sliceAngle; const endAngle = (i + 1) * sliceAngle;
                ctx.arc(0, 0, this.radius, startAngle, endAngle); ctx.closePath();
                const color = this.immuneColorsList[i]; ctx.fillStyle = color;
                if (this.visualModifiers.adaptiveShield && this.visualModifiers.adaptiveHarmonicColor === color) {
                    ctx.fillStyle = lightenColor(color, 30); ctx.fill();
                    ctx.beginPath(); ctx.arc(0, 0, this.radius, startAngle, endAngle); ctx.closePath();
                    ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
                } else { ctx.fill(); }
            }
        }
        
        ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2);
        const isAbl = this.visualModifiers.ablativeSublayer;
        ctx.lineWidth = isAbl ? 3 : 2; ctx.strokeStyle = isAbl ? '#B0C0FF' : '#FFFFFF'; ctx.stroke();
        if(isAbl){ctx.beginPath();ctx.arc(0,0,this.radius-2,0,Math.PI*2);ctx.strokeStyle='rgba(160,180,255,0.3)';ctx.lineWidth=1;ctx.stroke();}
        ctx.closePath();
        
        if (this.visualModifiers.ablativeSublayer) {
            ctx.save();
            ctx.clip();
            const pS = 10;
            const pA = 0.08+Math.abs(Math.sin(this.ablativeAnimTimer/800))*0.04;
            ctx.lineWidth=1;
            ctx.strokeStyle=`rgba(160,160,255,${pA})`;
            for(let i=-this.radius*2;i<this.radius*2;i+=pS){ctx.beginPath();ctx.moveTo(i,-this.radius*2);ctx.lineTo(i+this.radius*2,this.radius*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-this.radius*2,i);ctx.lineTo(this.radius*2,i+this.radius*2);ctx.stroke();}
            ctx.restore();
        }

        if (this.visualModifiers.momentumInjectors) {
            const nV=2; const vAO=Math.PI/2.5; const vL=this.radius*0.4; const vW=this.radius*0.15; ctx.fillStyle='#AAAAAA'; for(let i=0;i<nV;i++){const a=-Math.PI+(i===0?-vAO:vAO); ctx.save();ctx.rotate(a);ctx.fillRect(-this.radius*0.9,-vW/2,vL,vW);ctx.restore();}}

        if (this.visualModifiers.serratedNanites) {
            const nG=3; const oR=this.radius+9; const gS=1/600; ctx.fillStyle='rgba(255,50,50,0.95)'; ctx.strokeStyle='rgba(255,100,100,0.5)'; ctx.lineWidth=1; for(let i=0;i<nG;i++){const a=(this.naniteAnimTimer*gS+(i*Math.PI*2/nG))%(Math.PI*2); const gx=Math.cos(a)*oR; const gy=Math.sin(a)*oR; const gSize=3.5; ctx.save();ctx.translate(gx,gy);ctx.rotate(a+Math.PI/2); ctx.beginPath();ctx.moveTo(0,-gSize*0.6);ctx.lineTo(-gSize*0.5,gSize*0.4);ctx.lineTo(gSize*0.5,gSize*0.4);ctx.closePath();ctx.fill(); const pA=a-gS*50;const pX=Math.cos(pA)*oR;const pY=Math.sin(pA)*oR; ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(pX-gx,pY-gy);ctx.stroke(); ctx.restore();}}

        if (this.isFiringOmegaLaser && this.currentPath === 'mage') {
            ctx.save(); ctx.rotate(this.omegaLaserAngle);
            ctx.beginPath(); ctx.moveTo(this.radius, -this.omegaLaserWidth / 2);
            ctx.lineTo(this.radius + this.omegaLaserRange, -this.omegaLaserWidth / 2);
            ctx.lineTo(this.radius + this.omegaLaserRange, this.omegaLaserWidth / 2);
            ctx.lineTo(this.radius, this.omegaLaserWidth / 2); ctx.closePath();
            const laserIntensity = 0.7 + Math.abs(Math.sin(Date.now() / 50)) * 0.3;
            ctx.fillStyle = `rgba(255, 0, 0, ${laserIntensity * 0.8})`; ctx.fill();
            ctx.strokeStyle = `rgba(255, 100, 100, ${laserIntensity})`; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        } else if (this.isChargingAegisCharge && this.currentPath === 'aegis') {
            // Aim indicator is not drawn during charge, body is spinning
        }
         else {
             ctx.save();
             if (!(this.currentPath === 'aegis' && this.isChargingAegisCharge)) {
                ctx.rotate(this.aimAngle);
             }
             if (this.visualModifiers.momentumInjectors) {
                ctx.beginPath(); ctx.moveTo(this.radius*0.8,0); ctx.lineTo(this.radius+PLAYER_AIM_INDICATOR_LENGTH+5,0); const pW=1+Math.sin(this.momentumAnimTimer/150)*0.5; ctx.strokeStyle='rgba(255,225,50,0.8)'; ctx.lineWidth=3+pW; ctx.stroke();
             } else {
                ctx.beginPath(); ctx.moveTo(this.radius*0.8,0); ctx.lineTo(this.radius+PLAYER_AIM_INDICATOR_LENGTH,0); ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=3; ctx.stroke();
             }
             ctx.restore();
        }

        let abilityIndicatorAngle = -Math.PI/2 - 0.3; const angleStep = 0.3;
        for(const slot in this.activeAbilities){
            const ability=this.activeAbilities[slot];
            if (ability) {
                ctx.beginPath(); const ix=Math.cos(abilityIndicatorAngle)*(this.radius+4); const iy=Math.sin(abilityIndicatorAngle)*(this.radius+4);
                ctx.arc(ix,iy,4,0,Math.PI*2); ctx.fillStyle=ability.cooldownTimer<=0?'#80FF80':'#FF8080'; ctx.fill();
                ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke(); abilityIndicatorAngle-=angleStep;
            }
        }

        if (isCountingDownToResume) {
            ctx.save(); const pA=Math.abs(Math.sin(now/200))*5; const gR=this.radius+8+pA; const gLW=3+Math.abs(Math.sin(now/150))*2; const bGA=0.5+Math.abs(Math.sin(now/200))*0.4; ctx.shadowBlur=15+Math.abs(Math.sin(now/200))*10; ctx.lineWidth=gLW;
            if(this.immuneColorsList.length===0){ ctx.beginPath();ctx.arc(0,0,gR,0,Math.PI*2); ctx.strokeStyle=`rgba(200,200,220,${bGA})`; ctx.shadowColor=`rgba(200,200,255,0.7)`; ctx.stroke();}
            else{const sA=(Math.PI*2)/this.immuneColorsList.length; for(let i=0;i<this.immuneColorsList.length;i++){ ctx.beginPath();const stAG=i*sA;const eAG=(i+1)*sA; ctx.arc(0,0,gR,stAG,eAG,false); let iC=this.immuneColorsList[i];let gSC=iC;let sC=iC; if(iC.startsWith('#')){const rgb=hexToRgb(iC);if(rgb)gSC=`rgba(${rgb.r},${rgb.g},${rgb.b},${bGA*0.8})`;else gSC=`rgba(200,200,220,${bGA*0.8})`;}else if(iC.startsWith('rgb(')){gSC=iC.replace('rgb(','rgba(').replace(')',`,${bGA*0.8})`);}else{gSC=`rgba(200,200,220,${bGA*0.8})`;sC=`rgba(200,200,255,0.7)`;} ctx.strokeStyle=gSC;ctx.shadowColor=sC;ctx.stroke();}}
            ctx.restore();
        }

        ctx.restore();
    }

    static drawFromSnapshot(ctx, snapshotPlayerData, centerX, centerY, aimAngle = 0) {
        if (!ctx || !snapshotPlayerData) return;

        const now = Date.now();
        const PREVIEW_MAX_RADIUS = 100;

        const data = snapshotPlayerData.finalRadius !== undefined ? snapshotPlayerData : (snapshotPlayerData.playerDataForPreview || snapshotPlayerData.playerData || {});

        const actualRadius = data.finalRadius || PLAYER_BASE_RADIUS;
        let displayScale = 1;
        if (actualRadius > PREVIEW_MAX_RADIUS) {
            displayScale = PREVIEW_MAX_RADIUS / actualRadius;
        }
        const radius = actualRadius * displayScale;


        const immuneColorsList = data.immuneColorsList || [];
        const visualModifiers = data.visualModifiers || {};

        let inferredHelmType = data.helmType || null;
        if (!inferredHelmType && data.displayedUpgrades) {
            if (data.displayedUpgrades.some(u => u.id === 'juggernautPath' || u.name === 'Path of the Juggernaut' || u.id === 'aegisPath' || u.name === "Aegis Path")) {
                 inferredHelmType = 'aegisPath';
            } else if (data.displayedUpgrades.some(u => u.id === 'berserkersEcho' || u.name === "Path of Fury")) {
                inferredHelmType = 'berserkersEcho';
            } else if (data.displayedUpgrades.some(u => u.id === 'ultimateConfiguration' || u.name === "Path of Power")) {
                inferredHelmType = 'ultimateConfiguration';
            }
        }


        const ablativeAnimTimer = data.ablativeAnimTimer !== undefined ? data.ablativeAnimTimer : now;
        const momentumAnimTimer = data.momentumAnimTimer !== undefined ? data.momentumAnimTimer : now;
        const naniteAnimTimer = data.naniteAnimTimer !== undefined ? data.naniteAnimTimer : now;
        const aegisAnimTimer = data.aegisAnimTimer !== undefined ? data.aegisAnimTimer : (data.naniteAnimTimer || now);


        ctx.save();
        ctx.translate(centerX, centerY);

        ctx.save();

        if (inferredHelmType === "aegisPath") {
            ctx.fillStyle = "rgba(100, 150, 100, 0.7)";
            ctx.strokeStyle = "rgba(50, 100, 50, 0.9)";
            ctx.lineWidth = 2.0 * displayScale;

            const numSpikes = 7;
            const spikeAnimSpeed = 0.0015;
            const baseSpikeLength = radius * 0.35;
            const animSpikeLength = radius * 0.10 * Math.sin(aegisAnimTimer * spikeAnimSpeed);
            const spikeBaseWidth = radius * 0.15;

            for (let i = 0; i < numSpikes; i++) {
                const angle = (i / numSpikes) * Math.PI * 2 + (aegisAnimTimer * spikeAnimSpeed * 0.5);
                ctx.save();
                ctx.rotate(angle);
                const gradX = radius + baseSpikeLength / 2;
                const gradient = ctx.createLinearGradient(radius, 0, radius + baseSpikeLength + animSpikeLength, 0);
                gradient.addColorStop(0, "rgba(120, 180, 120, 0.8)");
                gradient.addColorStop(0.5, "rgba(80, 140, 80, 0.9)");
                gradient.addColorStop(1, "rgba(40, 90, 40, 0.8)");
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(radius - spikeBaseWidth * 0.2, -spikeBaseWidth / 2);
                ctx.lineTo(radius - spikeBaseWidth * 0.2, spikeBaseWidth / 2);
                ctx.lineTo(radius + baseSpikeLength + animSpikeLength, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        } else if (inferredHelmType === "berserkersEcho") {
            ctx.fillStyle = "rgb(120, 20, 20)"; ctx.strokeStyle = "rgb(50, 0, 0)"; ctx.lineWidth = 1.5 * displayScale;
            const currentHpSnapshot = typeof data.hp === 'number' ? data.hp : PLAYER_MAX_HP;
            const maxHpSnapshot = typeof data.maxHp === 'number' ? data.maxHp : PLAYER_MAX_HP;
            const missingHpFactorSnapshot = maxHpSnapshot > 0 ? Math.max(0, (maxHpSnapshot - currentHpSnapshot) / maxHpSnapshot) : 0;
            if (missingHpFactorSnapshot > 0.05) {
                const helmGlowRadius_ = (5 + missingHpFactorSnapshot * 20) * displayScale;
                const glowIntensity = 0.3 + missingHpFactorSnapshot * 0.6;
                const helmGlowColor_ = `rgba(255, 0, 0, ${glowIntensity})`;
                ctx.shadowBlur = helmGlowRadius_; ctx.shadowColor = helmGlowColor_;
            }
            const hornBaseOffsetY = -radius * 0.5; const hornSideOffsetX = radius * 0.45;
            const hornTipOffsetY = -radius * 1.1; const hornTipSideOffsetX = radius * 0.7;
            ctx.beginPath();
            ctx.moveTo(-hornSideOffsetX, hornBaseOffsetY);
            ctx.quadraticCurveTo(-hornTipSideOffsetX*0.8, hornTipOffsetY*0.9, -hornTipSideOffsetX, hornTipOffsetY);
            ctx.quadraticCurveTo(-hornTipSideOffsetX*0.6, hornTipOffsetY*1.1, -hornSideOffsetX + radius*0.15, hornBaseOffsetY + radius*0.1);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(hornSideOffsetX, hornBaseOffsetY);
            ctx.quadraticCurveTo(hornTipSideOffsetX*0.8, hornTipOffsetY*0.9, hornTipSideOffsetX, hornTipOffsetY);
            ctx.quadraticCurveTo(hornTipSideOffsetX*0.6, hornTipOffsetY*1.1, hornSideOffsetX - radius*0.15, hornBaseOffsetY + radius*0.1);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
        } else if (inferredHelmType === "ultimateConfiguration") {
            ctx.fillStyle = "rgba(80, 0, 120, 0.85)"; ctx.strokeStyle = "rgba(180, 120, 255, 0.9)"; ctx.lineWidth = 2 * displayScale;
            const helmGlowRadius_ = (8 + Math.sin(now / 350) * 3) * displayScale;
            const helmGlowColor_ = "rgba(150, 100, 220, 0.4)";
            ctx.shadowBlur = helmGlowRadius_; ctx.shadowColor = helmGlowColor_;
            ctx.beginPath(); ctx.moveTo(0, -radius * 1.8);
            ctx.lineTo(-radius * 0.8, -radius * 0.5);
            ctx.quadraticCurveTo(0, -radius * 0.1, radius * 0.8, -this.radius * 0.5);
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
            ctx.fillStyle = "yellow"; ctx.beginPath(); ctx.arc(0, -radius * 1.5, radius * 0.15, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();


        ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = PLAYER_BASE_COLOR; ctx.fill();

        if (immuneColorsList.length > 0) {
            const sliceAngle = (Math.PI * 2) / immuneColorsList.length;
            for (let i = 0; i < immuneColorsList.length; i++) {
                ctx.beginPath(); ctx.moveTo(0, 0);
                const startAngle = i * sliceAngle; const endAngle = (i + 1) * sliceAngle;
                ctx.arc(0, 0, radius, startAngle, endAngle); ctx.closePath();
                ctx.fillStyle = immuneColorsList[i]; ctx.fill();
            }
        }
        
        ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2);
        const isAbl = visualModifiers.ablativeSublayer;
        ctx.lineWidth = (isAbl ? 3 : 2) * displayScale; ctx.strokeStyle = isAbl ? '#B0C0FF' : '#FFFFFF'; ctx.stroke();
        if(isAbl){ctx.beginPath();ctx.arc(0,0,radius-2 * displayScale,0,Math.PI*2);ctx.strokeStyle='rgba(160,180,255,0.3)';ctx.lineWidth=1*displayScale;ctx.stroke();}
        ctx.closePath();
        
        if (visualModifiers.ablativeSublayer) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.clip(); 
            const pS = 10 * displayScale; 
            const pA = 0.08 + Math.abs(Math.sin(ablativeAnimTimer / 800)) * 0.04;
            ctx.lineWidth = 1 * displayScale; 
            ctx.strokeStyle = `rgba(160,160,255,${pA})`;
            for(let i = -radius * 2; i < radius * 2; i += pS){
                ctx.beginPath(); ctx.moveTo(i, -radius * 2); ctx.lineTo(i + radius * 2, radius * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-radius * 2, i); ctx.lineTo(radius * 2, i + radius * 2); ctx.stroke();
            }
            ctx.restore();
        }

        if (visualModifiers.momentumInjectors) {
            const nV=2; const vAO=Math.PI/2.5; const vL=radius*0.4; const vW=radius*0.15; ctx.fillStyle='#AAAAAA';
            for(let i=0;i<nV;i++){const a=-Math.PI+(i===0?-vAO:vAO); ctx.save();ctx.rotate(a);ctx.fillRect(-radius*0.9,-vW/2,vL,vW);ctx.restore();}}

        if (visualModifiers.serratedNanites) {
            const nG=3; const oR=radius+9*displayScale; const gS=1/600; ctx.fillStyle='rgba(255,50,50,0.95)'; ctx.strokeStyle='rgba(255,100,100,0.5)'; ctx.lineWidth=1*displayScale; for(let i=0;i<nG;i++){const a=(naniteAnimTimer*gS+(i*Math.PI*2/nG))%(Math.PI*2); const gx=Math.cos(a)*oR; const gy=Math.sin(a)*oR; const gSize=3.5*displayScale; ctx.save();ctx.translate(gx,gy);ctx.rotate(a+Math.PI/2); ctx.beginPath();ctx.moveTo(0,-gSize*0.6);ctx.lineTo(-gSize*0.5,gSize*0.4);ctx.lineTo(gSize*0.5,gSize*0.4);ctx.closePath();ctx.fill(); const pA=a-gS*50;const pX=Math.cos(pA)*oR;const pY=Math.sin(pA)*oR; ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(pX-gx,pY-gy);ctx.stroke(); ctx.restore();}}

        ctx.save();
        ctx.rotate(aimAngle);
        const aimIndicatorLength = PLAYER_AIM_INDICATOR_LENGTH * displayScale;
        if (visualModifiers.momentumInjectors) {
            ctx.beginPath(); ctx.moveTo(radius*0.8,0); ctx.lineTo(radius + aimIndicatorLength + (5 * displayScale),0);
            const pW=1+Math.sin(momentumAnimTimer/150)*0.5; ctx.strokeStyle='rgba(255,225,50,0.8)'; ctx.lineWidth=(3+pW)*displayScale; ctx.stroke();
        } else {
            ctx.beginPath(); ctx.moveTo(radius*0.8,0); ctx.lineTo(radius + aimIndicatorLength,0);
            ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=3*displayScale; ctx.stroke();
        }
        ctx.restore();

        ctx.restore();
    }

    takeDamage(hittingRayOrAmount, gameContext, damageContext) {
        const postPopupTimerFromCtx = gameContext.postPopupImmunityTimer || 0;
        const postDamageTimerFromCtx = gameContext.postDamageImmunityTimer || 0;
        const bossManager = gameContext.getBossManager ? gameContext.getBossManager() : null;

        const isTrueDamage = damageContext && damageContext.isTrueDamage;

        let effectiveDamageTakenMultiplier = this.damageTakenMultiplier;
        if (this.isAegisChargingDash && this.currentPath === 'aegis') {
            effectiveDamageTakenMultiplier *= (1 - AEGIS_CHARGE_DR_DURING_DASH);
        }

        if (this.hasAegisPathHelm && this.currentPath === 'aegis' &&
            typeof hittingRayOrAmount === 'object' &&
            hittingRayOrAmount !== null &&
            !(hittingRayOrAmount instanceof Ray) && 
            typeof hittingRayOrAmount.tier === 'number' && 
            typeof hittingRayOrAmount.dx === 'undefined')
        {
            return 0; 
        }

        if (this.isShieldOvercharging && this.currentPath === 'mage') {
            if (typeof hittingRayOrAmount === 'object' && hittingRayOrAmount !== null && hittingRayOrAmount instanceof Ray) {
                const hittingRay = hittingRayOrAmount;
                const isOwnFreshRay = !hittingRay.isBossProjectile && !hittingRay.isCorruptedByGravityWell && !hittingRay.isCorruptedByPlayerWell && hittingRay.spawnGraceTimer > (RAY_SPAWN_GRACE_PERIOD - 100);
                if (!isOwnFreshRay) {
                    hittingRay.isActive = false;
                    this.gainHealth(SHIELD_OVERCHARGE_HEAL_PER_RAY, gameContext.updateHealthDisplayCallback);
                    this.raysAbsorbedThisShieldOvercharge = (this.raysAbsorbedThisShieldOvercharge || 0) + 1;
                }
                else { hittingRay.isActive = false; }
            }
            return 0;
        }


        if (postPopupTimerFromCtx > 0 || postDamageTimerFromCtx > 0 || (this.teleporting && this.teleportEffectTimer > 0)) {
            if (typeof hittingRayOrAmount === 'object' && hittingRayOrAmount !== null && hittingRayOrAmount instanceof Ray) {
                const hittingRay = hittingRayOrAmount;
                if (!hittingRay.isBossProjectile && !hittingRay.isCorruptedByGravityWell && !hittingRay.isCorruptedByPlayerWell) hittingRay.isActive = false;
            }
            return 0;
        }

        this.timeSinceLastHit = 0; 
        this.timesHit++;
        this.flawlessStreakActive = false;
        let damageToTake; let hittingRayObject = null;

        if (typeof hittingRayOrAmount === 'object' && hittingRayOrAmount !== null && hittingRayOrAmount instanceof Ray) {
            hittingRayObject = hittingRayOrAmount;
            damageToTake = hittingRayObject.damageValue !== undefined ? hittingRayObject.damageValue : RAY_DAMAGE_TO_PLAYER;
        } else if (typeof hittingRayOrAmount === 'number') { 
            damageToTake = hittingRayOrAmount;
        } else if (typeof hittingRayOrAmount === 'object' && hittingRayOrAmount !== null && typeof hittingRayOrAmount.damage === 'number'){ 
             damageToTake = hittingRayOrAmount.damage;
        }
        else { 
            damageToTake = RAY_DAMAGE_TO_PLAYER; 
        }

        if (!isTrueDamage) {
            damageToTake *= effectiveDamageTakenMultiplier;
            if (hittingRayObject && hittingRayObject.isBossProjectile && this.visualModifiers.ablativeSublayer) {
                damageToTake *= (1 - (this.bossDamageReduction || 0));
            }
        }

        damageToTake = Math.max(1, Math.round(damageToTake));

        this.hp -= damageToTake;
        if (this.hp < 0) this.hp = 0;

        if (bossManager && bossManager.activeBosses.length > 0) {
            this.damageTakenThisBossFight += damageToTake;
        }


        if (gameContext.updateHealthDisplayCallback) gameContext.updateHealthDisplayCallback(this.hp, this.maxHp);

        const threshold = (gameContext.CONSTANTS && gameContext.CONSTANTS.CLOSE_SHAVE_HP_THRESHOLD !== undefined)
                            ? gameContext.CONSTANTS.CLOSE_SHAVE_HP_THRESHOLD
                            : CLOSE_SHAVE_HP_THRESHOLD;

        if (this.hp > 0 && this.hp < threshold) {
            if (gameContext.signalAchievementEvent) {
                gameContext.signalAchievementEvent("player_hp_critical_after_hit", { currentHp: this.hp });
            }
        }


        const { screenShakeParams } = damageContext;
        if (screenShakeParams) {
            screenShakeParams.isScreenShaking = true; screenShakeParams.screenShakeTimer = SCREEN_SHAKE_DURATION_PLAYER_HIT;
            screenShakeParams.currentShakeMagnitude = SCREEN_SHAKE_MAGNITUDE_PLAYER_HIT; screenShakeParams.currentShakeType = 'playerHit';
            if (hittingRayObject && hittingRayObject.dx !== undefined) { const impactAngle = Math.atan2(hittingRayObject.dy, hittingRayObject.dx); screenShakeParams.hitShakeDx = -Math.cos(impactAngle); screenShakeParams.hitShakeDy = -Math.sin(impactAngle); }
            else { screenShakeParams.hitShakeDx = (Math.random() - 0.5) * 2; screenShakeParams.hitShakeDy = (Math.random() - 0.5) * 2; const mag = Math.sqrt(screenShakeParams.hitShakeDx**2 + screenShakeParams.hitShakeDy**2); if (mag > 0) { screenShakeParams.hitShakeDx /= mag; screenShakeParams.hitShakeDy /= mag; } else { screenShakeParams.hitShakeDx = 1; screenShakeParams.hitShakeDy = 0;}}
        }
        playSound(playerHitSound);
        if (this.hp <= 0) { if (gameContext.endGameCallback) gameContext.endGameCallback(); }
        return damageToTake;
    }

    applyLifesteal(damageDealt, updateHealthDisplayCallback) {
        if (this.isBloodpactActive && this.currentPath === 'berserker' && damageDealt > 0) {
            const healAmount = Math.max(1, Math.floor(damageDealt * BLOODPACT_LIFESTEAL_PERCENT));
            this.gainHealth(healAmount, updateHealthDisplayCallback);
            this.healingThisBloodpact += healAmount;
        }
    }

    gainHealth(amount, updateHealthDisplayCallback) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        if (updateHealthDisplayCallback) updateHealthDisplayCallback(this.hp, this.maxHp);
    }

    consumeKineticChargeForDamageBoost(abilityType = 'unknown') {
        if (this.kineticCharge <= 0 || this.kineticConversionLevel <= 0) return 1.0;
        let chargeToConsume = Math.min(this.kineticCharge, this.kineticChargeConsumption);
        let effectScale = chargeToConsume / this.kineticChargeConsumption;

        let maxPossiblePotencyBonus = this.initialKineticDamageBonus;

        let currentPotencyBonus = effectScale * maxPossiblePotencyBonus;
        let finalDamageMultiplier = 1.0 + currentPotencyBonus;

        this.kineticCharge -= chargeToConsume;
        
        return finalDamageMultiplier;
    }


    procTemporalEcho(abilityIdJustUsed, abilityContext) {
        if (this.temporalEchoChance > 0 && Math.random() < this.temporalEchoChance) {
            let echoApplied = false;
            const { updateAbilityCooldownCallback } = abilityContext || {};

            for (const otherSlotKey in this.activeAbilities) {
                const otherAbility = this.activeAbilities[otherSlotKey];
                if (otherAbility && otherAbility.id !== abilityIdJustUsed && otherAbility.cooldownTimer > 0) {
                    otherAbility.cooldownTimer = Math.max(0, otherAbility.cooldownTimer - this.temporalEchoFixedReduction);
                    if (otherAbility.cooldownTimer === 0 && !otherAbility.justBecameReady) otherAbility.justBecameReady = true;
                    echoApplied = true;
                }
            }
            if (this.currentPath === 'mage') {
                if (this.hasOmegaLaser && abilityIdJustUsed !== 'omegaLaser_LMB_Mage' && this.omegaLaserCooldownTimer > 0) { this.omegaLaserCooldownTimer = Math.max(0, this.omegaLaserCooldownTimer - this.temporalEchoFixedReduction); echoApplied = true; }
                if (this.hasShieldOvercharge && abilityIdJustUsed !== 'shieldOvercharge_RMB_Mage' && this.shieldOverchargeCooldownTimer > 0) { this.shieldOverchargeCooldownTimer = Math.max(0, this.shieldOverchargeCooldownTimer - this.temporalEchoFixedReduction); echoApplied = true; }
            } else if (this.currentPath === 'aegis') {
                if (this.hasAegisCharge && abilityIdJustUsed !== 'aegisCharge_LMB_Aegis' && this.aegisChargeCooldownTimer > 0) { this.aegisChargeCooldownTimer = Math.max(0, this.aegisChargeCooldownTimer - this.temporalEchoFixedReduction); echoApplied = true; }
                if (this.hasSeismicSlam && abilityIdJustUsed !== 'seismicSlam_RMB_Aegis' && this.seismicSlamCooldownTimer > 0) { this.seismicSlamCooldownTimer = Math.max(0, this.seismicSlamCooldownTimer - this.temporalEchoFixedReduction); echoApplied = true; }
            } else if (this.currentPath === 'berserker') {
                 if (this.hasBloodpact && abilityIdJustUsed !== 'bloodpact_LMB_Berserker' && this.bloodpactCooldownTimer > 0) { this.bloodpactCooldownTimer = Math.max(0, this.bloodpactCooldownTimer - this.temporalEchoFixedReduction); echoApplied = true; }
                 if (this.hasSavageHowl && abilityIdJustUsed !== 'savageHowl_RMB_Berserker' && this.savageHowlCooldownTimer > 0) { this.savageHowlCooldownTimer = Math.max(0, this.savageHowlCooldownTimer - this.temporalEchoFixedReduction); echoApplied = true; }
            }

            if (echoApplied && updateAbilityCooldownCallback) updateAbilityCooldownCallback(this);
        }
    }


    activateAbility(slot, abilityContext) {
        const { isAnyPauseActiveCallback, updateAbilityCooldownCallback, activeBosses, getBossManager, targets, signalAchievementEvent } = abilityContext;
        if (isAnyPauseActiveCallback && isAnyPauseActiveCallback()) return;

        const slotStr = String(slot);
        const ability = this.activeAbilities[slotStr];
        if (!ability) return;

        const currentBossManager = getBossManager ? getBossManager() : null;
        if (currentBossManager && currentBossManager.isBossSequenceActive()) {
            this.usedAbilityInCurrentBossFight = true;
        }


        let abilityUsedSuccessfully = false;
        let baseCooldownForThisAbility = ability.cooldownDuration;

        let effectiveCooldownToSet = baseCooldownForThisAbility * (1.0 - this.globalCooldownReduction);
        effectiveCooldownToSet = Math.max(baseCooldownForThisAbility * 0.1, effectiveCooldownToSet);


        if (ability.id === 'miniGravityWell') {
            if (this.activeMiniWell && this.activeMiniWell.isActive) {
                this.currentGravityWellKineticBoost = this.consumeKineticChargeForDamageBoost(`numeric_${ability.id}_detonate`);
                const launchedRayCount = this.activeMiniWell.detonate({ targetX: abilityContext.mouseX, targetY: abilityContext.mouseY, player: this });
                ability.cooldownTimer = effectiveCooldownToSet; ability.justBecameReady = false; abilityUsedSuccessfully = true;

                if (signalAchievementEvent && launchedRayCount > 0) {
                    signalAchievementEvent("player_well_detonated", { launchedRays: launchedRayCount });
                }

            } else if (ability.cooldownTimer <= 0) {
                this.deployMiniGravityWell(ability.duration, abilityContext.decoysArray, abilityContext.mouseX, abilityContext.mouseY);
                if (this.activeMiniWell) { abilityUsedSuccessfully = true; ability.cooldownTimer = effectiveCooldownToSet; ability.justBecameReady = false; }
                if (abilityUsedSuccessfully && this.kineticCharge >= this.kineticChargeConsumption) this.consumeKineticChargeForDamageBoost(`numeric_${ability.id}_deploy`);
            }
        } else if (ability.cooldownTimer <= 0) {
            switch (ability.id) {
                case 'teleport':
                    if (this.currentPath === 'aegis' && (this.isChargingAegisCharge || this.isAegisChargingDash)) {
                        this.isAegisTeleportImpactPending = true;
                        this.aegisTeleportImpactTimer = 300; 
                    } else {
                        this.isAegisTeleportImpactPending = false; 
                    }

                    this.doTeleport(
                        abilityContext.bossDefeatEffectsArray, 
                        abilityContext.mouseX, abilityContext.mouseY, 
                        abilityContext.canvasWidth, abilityContext.canvasHeight, 
                        activeBosses, 
                        signalAchievementEvent
                    );
                    ability.cooldownTimer = effectiveCooldownToSet; abilityUsedSuccessfully = true;
                     if (abilityUsedSuccessfully && this.kineticCharge >= this.kineticChargeConsumption) this.consumeKineticChargeForDamageBoost(`numeric_${ability.id}`);
                    break;
                case 'empBurst':
                    this.triggerEmpBurst(abilityContext.bossDefeatEffectsArray, abilityContext.allRays, abilityContext.screenShakeParams, abilityContext.canvasWidth, abilityContext.canvasHeight, activeBosses);
                    ability.cooldownTimer = effectiveCooldownToSet; abilityUsedSuccessfully = true;
                    if (abilityUsedSuccessfully && this.kineticCharge >= this.kineticChargeConsumption) this.consumeKineticChargeForDamageBoost(`numeric_${ability.id}`);
                    break;
            }
             if(abilityUsedSuccessfully) ability.justBecameReady = false;
        }
        if (abilityUsedSuccessfully) this.procTemporalEcho(ability.id, abilityContext);
        if (updateAbilityCooldownCallback) updateAbilityCooldownCallback(this);
    }


    deployMiniGravityWell(duration, decoysArray, mouseX, mouseY) {
        if (this.activeMiniWell && this.activeMiniWell.isActive) return;
        this.currentGravityWellKineticBoost = 1.0;
        this.activeMiniWell = new PlayerGravityWell(mouseX, mouseY, duration);
        if (decoysArray) decoysArray.push(this.activeMiniWell);
        playSound(playerWellDeploySound);
    }


    doTeleport(bossDefeatEffectsArray, mouseX, mouseY, canvasWidth, canvasHeight, activeBossesArray, signalAchievementEventCallback) {
        if (this.teleporting && this.teleportEffectTimer > 0) return; 
        const oldX = this.x; const oldY = this.y;

        if (signalAchievementEventCallback) {
            this.teleportTimestamps.push(Date.now());
            if (this.teleportTimestamps.length > 10) { 
                this.teleportTimestamps.splice(0, this.teleportTimestamps.length - 10);
            }
        }

        this.x = mouseX; this.y = mouseY;
        this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
        this.y = Math.max(this.radius, Math.min(this.y, canvasHeight - this.radius));
        this.teleporting = true; this.teleportEffectTimer = TELEPORT_IMMUNITY_DURATION;

        if (bossDefeatEffectsArray) {
            bossDefeatEffectsArray.push({ x: oldX, y: oldY, radius: this.radius * 2.5, maxRadius: this.radius * 0.5, opacity: 0.8, timer: 200, duration: 200, color: 'rgba(180, 180, 255, opacity)', initialRadius: this.radius * 2.5, shrink: true });
            bossDefeatEffectsArray.push({ x: this.x, y: this.y, radius: this.radius * 0.2, maxRadius: this.radius * 1.8, opacity: 0.8, timer: 350, duration: 350, color: 'rgba(200, 200, 255, opacity)', initialRadius: this.radius * 0.2 });
        }
        playSound(teleportSound);
        
        // The "Tele-Frag" for small red targets is removed.
        // "Warp Slam" (Aegis Teleport Impact) is handled in dealAegisChargeImpactDamage.
        
        if (signalAchievementEventCallback && this.teleportTimestamps.length >= 5) {
            const requiredCount = 5;
            const timeWindow = 60000; 
            if (this.teleportTimestamps.length >= requiredCount) {
                 const recentTimestamps = this.teleportTimestamps.slice(-requiredCount);
                 if ((recentTimestamps[requiredCount - 1] - recentTimestamps[0]) <= timeWindow) {
                    signalAchievementEventCallback("rapid_relocation_success");
                    this.teleportTimestamps = []; 
                }
            }
        }
    }

    triggerEmpBurst(bossDefeatEffectsArray, allRays, screenShakeParams, canvasWidth, canvasHeight, activeBosses) {
        if (bossDefeatEffectsArray) bossDefeatEffectsArray.push({ x: this.x, y: this.y, radius: 10, maxRadius: Math.max(canvasWidth, canvasHeight) * 0.75, opacity: 0.8, timer: 400, duration: 400, color: 'rgba(100, 150, 255, opacity)', initialRadius: 10 });

        if (allRays) {
            for (let i = allRays.length - 1; i >= 0; i--) {
                const entity = allRays[i];
                if (entity && entity instanceof Ray) {
                    if (!entity.isGravityWellRay &&
                        !entity.isCorruptedByPlayerWell &&
                        !(entity.sourceAbility === 'miniGravityWell' && entity.color === PLAYER_GRAVITY_WELL_ABSORBED_RAY_COLOR)
                       ) {
                        entity.isActive = false;
                    }
                }
            }
        }

        if (screenShakeParams) { screenShakeParams.isScreenShaking = true; screenShakeParams.screenShakeTimer = 400; screenShakeParams.currentShakeMagnitude = 8; screenShakeParams.currentShakeType = 'playerHit'; screenShakeParams.hitShakeDx = 0; screenShakeParams.hitShakeDy = 0; }
        playSound(empBurstSound);
    }


    activateLMB(abilityContext, isRelease = false) {
        const currentBossManager = abilityContext.getBossManager ? abilityContext.getBossManager() : null;
        if (currentBossManager && currentBossManager.isBossSequenceActive()) {
            this.usedAbilityInCurrentBossFight = true;
        }
        if (this.currentPath === 'mage') this.activateOmegaLaser_LMB_Mage(abilityContext);
        else if (this.currentPath === 'aegis') this.activateAegisCharge_LMB_Aegis(abilityContext, isRelease);
        else if (this.currentPath === 'berserker') this.activateBloodpact_LMB_Berserker(abilityContext);
    }
    activateRMB(abilityContext) {
        const currentBossManager = abilityContext.getBossManager ? abilityContext.getBossManager() : null;
        if (currentBossManager && currentBossManager.isBossSequenceActive()) {
            this.usedAbilityInCurrentBossFight = true;
        }
        if (this.currentPath === 'mage') this.activateShieldOvercharge_RMB_Mage(abilityContext);
        else if (this.currentPath === 'aegis') this.activateSeismicSlam_RMB_Aegis(abilityContext);
        else if (this.currentPath === 'berserker') this.activateSavageHowl_RMB_Berserker(abilityContext);
    }

    activateOmegaLaser_LMB_Mage(abilityContext) {
        if (this.hasOmegaLaser && !this.isFiringOmegaLaser && this.omegaLaserCooldownTimer <= 0) {
            if (abilityContext.signalAchievementEvent) {
                abilityContext.signalAchievementEvent("mage_omega_laser_used", {
                    charge: this.kineticCharge
                });
            }

            this.isFiringOmegaLaser = true; this.omegaLaserTimer = this.omegaLaserDuration; this.omegaLaserCurrentTickTimer = 0;
            playSound(omegaLaserSound, true);
            if(abilityContext.activeBuffNotificationsArray) abilityContext.activeBuffNotificationsArray.push({ text: `Omega Laser Firing!`, timer: this.omegaLaserDuration });
            this.currentOmegaLaserKineticBoost = this.consumeKineticChargeForDamageBoost('omegaLaser_LMB_Mage');
            this.procTemporalEcho('omegaLaser_LMB_Mage', abilityContext);
            if (abilityContext && abilityContext.updateAbilityCooldownCallback) abilityContext.updateAbilityCooldownCallback(this);
        }
    }
    activateShieldOvercharge_RMB_Mage(abilityContext) {
        if (this.hasShieldOvercharge && !this.isShieldOvercharging && this.shieldOverchargeCooldownTimer <= 0) {
            this.isShieldOvercharging = true; this.shieldOverchargeTimer = SHIELD_OVERCHARGE_DURATION;
            this.raysAbsorbedThisShieldOvercharge = 0;
            playSound(shieldOverchargeSound);
            if(abilityContext.activeBuffNotificationsArray) abilityContext.activeBuffNotificationsArray.push({ text: `Shield Overcharge Active! Healing!`, timer: SHIELD_OVERCHARGE_DURATION });
            this.procTemporalEcho('shieldOvercharge_RMB_Mage', abilityContext);
            if (abilityContext && abilityContext.updateAbilityCooldownCallback) abilityContext.updateAbilityCooldownCallback(this);
        }
    }

    activateAegisCharge_LMB_Aegis(abilityContext, isRelease = false) {
        if (!this.hasAegisCharge) return;

        if (!isRelease) { 
            if (this.aegisChargeCooldownTimer <= 0 && !this.isChargingAegisCharge && !this.isAegisChargingDash) {
                this.isChargingAegisCharge = true;
                this.aegisChargeCurrentChargeTime = 0;
            }
        } else { 
            if (this.isChargingAegisCharge) {
                this.isChargingAegisCharge = false;
                this.isAegisChargingDash = true;
                this.aegisChargeDashTargetX = abilityContext.mouseX;
                this.aegisChargeDashTargetY = abilityContext.mouseY;
                const dist = Math.hypot(this.aegisChargeDashTargetX - this.x, this.aegisChargeDashTargetY - this.y);
                const dashSpeed = this.originalPlayerSpeed * AEGIS_CHARGE_DASH_SPEED_FACTOR;
                let dashDurationMs = (dist / dashSpeed) * (1000/60) * 1.5; 
                dashDurationMs = Math.max(200, Math.min(dashDurationMs, 1000)); 
                this.aegisChargeDashTimer = dashDurationMs;

                this.procTemporalEcho('aegisCharge_LMB_Aegis', abilityContext);
            }
        }
        if (abilityContext && abilityContext.updateAbilityCooldownCallback) abilityContext.updateAbilityCooldownCallback(this);
    }
    
    activateSeismicSlam_RMB_Aegis(abilityContext) {
        if (this.hasSeismicSlam && this.seismicSlamCooldownTimer <= 0) {
            if(abilityContext.activeBuffNotificationsArray) abilityContext.activeBuffNotificationsArray.push({ text: `Seismic Slam!`, timer: BUFF_NOTIFICATION_DURATION });

            let damage = SEISMIC_SLAM_DAMAGE_BASE + (this.maxHp * SEISMIC_SLAM_DAMAGE_MAXHP_SCALE) + (this.radius * SEISMIC_SLAM_DAMAGE_RADIUS_SCALE);
            damage = Math.round(damage * (this.abilityDamageMultiplier || 1.0));
             if (this.abilityCritChance > 0 && Math.random() < this.abilityCritChance) damage *= this.abilityCritDamageMultiplier;

            const slamEffectX = this.x;
            const slamEffectY = this.y;

            if (abilityContext.activeBosses) {
                abilityContext.activeBosses.forEach(boss => {
                    if (Math.hypot(slamEffectX - boss.x, slamEffectY - boss.y) < SEISMIC_SLAM_AOE_RADIUS + boss.radius) {
                        if (boss.takeDamage) {
                            const dmgDone = boss.takeDamage(damage, null, this, {isAbility: true, abilityType: 'seismicSlam'});
                            if(dmgDone > 0) this.totalDamageDealt += dmgDone;
                        }
                        if (boss.recoilVelX !== undefined) {
                            const angleToBoss = Math.atan2(boss.y - slamEffectY, boss.x - slamEffectX);
                            boss.recoilVelX += Math.cos(angleToBoss) * SEISMIC_SLAM_BOSS_KNOCKBACK_MINOR;
                            boss.recoilVelY += Math.sin(angleToBoss) * SEISMIC_SLAM_BOSS_KNOCKBACK_MINOR;
                            if (boss.playerCollisionStunTimer !== undefined) boss.playerCollisionStunTimer = Math.max(boss.playerCollisionStunTimer, SEISMIC_SLAM_BOSS_STAGGER_DURATION);
                        }
                    }
                });
            }

            if (abilityContext.bossDefeatEffectsArray) {
                 abilityContext.bossDefeatEffectsArray.push({
                    x: slamEffectX, y: slamEffectY, radius: 10,
                    maxRadius: SEISMIC_SLAM_AOE_RADIUS, opacity: 0.8, timer: 400,
                    duration: 400, color: 'rgba(200, 150, 100, opacity)', initialRadius: 10
                });
            }
             if (abilityContext.screenShakeParams) {
                abilityContext.screenShakeParams.isScreenShaking = true;
                abilityContext.screenShakeParams.screenShakeTimer = 300;
                abilityContext.screenShakeParams.currentShakeMagnitude = 7;
                abilityContext.screenShakeParams.currentShakeType = 'bonus';
            }

            let cd = SEISMIC_SLAM_COOLDOWN * (1.0 - this.globalCooldownReduction);
            this.seismicSlamCooldownTimer = Math.max(SEISMIC_SLAM_COOLDOWN * 0.1, cd);
            this.procTemporalEcho('seismicSlam_RMB_Aegis', abilityContext);
            if (abilityContext && abilityContext.updateAbilityCooldownCallback) abilityContext.updateAbilityCooldownCallback(this);
        }
    }

    activateBloodpact_LMB_Berserker(abilityContext) {
        if (this.hasBloodpact && !this.isBloodpactActive && this.bloodpactCooldownTimer <= 0) {
            this.isBloodpactActive = true;
            this.bloodpactTimer = BLOODPACT_DURATION;
            this.healingThisBloodpact = 0;
            if(abilityContext.activeBuffNotificationsArray) abilityContext.activeBuffNotificationsArray.push({ text: `Bloodpact Active! Lifesteal!`, timer: BLOODPACT_DURATION });

            let cd = BLOODPACT_COOLDOWN * (1.0 - this.globalCooldownReduction);
            this.bloodpactCooldownTimer = Math.max(BLOODPACT_COOLDOWN * 0.1, cd);
            this.procTemporalEcho('bloodpact_LMB_Berserker', abilityContext);
            if (abilityContext && abilityContext.updateAbilityCooldownCallback) abilityContext.updateAbilityCooldownCallback(this);
        }
    }
    activateSavageHowl_RMB_Berserker(abilityContext) {
        if (this.hasSavageHowl && this.savageHowlCooldownTimer <= 0) {
            playSound(savageHowlSound);
            if(abilityContext.activeBuffNotificationsArray) abilityContext.activeBuffNotificationsArray.push({ text: `Savage Howl! Fear & Frenzy!`, timer: SAVAGE_HOWL_ATTACK_SPEED_BUFF_DURATION });

            this.isSavageHowlAttackSpeedBuffActive = true;
            this.savageHowlAttackSpeedBuffTimer = SAVAGE_HOWL_ATTACK_SPEED_BUFF_DURATION;

            if (abilityContext.bossDefeatEffectsArray) {
                abilityContext.bossDefeatEffectsArray.push({
                    x: this.x, y: this.y, radius: 10,
                    maxRadius: SAVAGE_HOWL_FEAR_RADIUS,
                    opacity: 0.6, timer: 500,
                    duration: 500, color: 'rgba(180, 0, 0, opacity)',
                    initialRadius: 10
                });
            }
            if (abilityContext.screenShakeParams) {
                abilityContext.screenShakeParams.isScreenShaking = true;
                abilityContext.screenShakeParams.screenShakeTimer = 250;
                abilityContext.screenShakeParams.currentShakeMagnitude = 4;
                abilityContext.screenShakeParams.currentShakeType = 'bonus';
            }

            let enemiesFearedCount = 0;
            if (abilityContext.activeBosses) {
                abilityContext.activeBosses.forEach(boss => {
                    if (Math.hypot(this.x - boss.x, this.y - boss.y) < SAVAGE_HOWL_FEAR_RADIUS + boss.radius) {
                        if (typeof boss.applyFear === 'function') {
                            boss.applyFear(SAVAGE_HOWL_FEAR_DURATION, this.x, this.y);
                            enemiesFearedCount++;
                        }
                        if (boss instanceof NexusWeaverBoss && boss.activeMinions) {
                            boss.activeMinions.forEach(minion => {
                                if (minion.isActive && Math.hypot(this.x - minion.x, this.y - minion.y) < SAVAGE_HOWL_FEAR_RADIUS + minion.radius) {
                                    if (typeof minion.applyFear === 'function') {
                                        minion.applyFear(SAVAGE_HOWL_FEAR_DURATION, this.x, this.y);
                                        enemiesFearedCount++;
                                    }
                                }
                            });
                        }
                    }
                });
            }
            if (abilityContext.signalAchievementEvent && enemiesFearedCount >= 2) {
                 abilityContext.signalAchievementEvent("savage_howl_fear_count", { enemiesFeared: enemiesFearedCount });
            }


            let cd = SAVAGE_HOWL_COOLDOWN * (1.0 - this.globalCooldownReduction);
            this.savageHowlCooldownTimer = Math.max(SAVAGE_HOWL_COOLDOWN * 0.1, cd);
            this.procTemporalEcho('savageHowl_RMB_Berserker', abilityContext);
            if (abilityContext && abilityContext.updateAbilityCooldownCallback) abilityContext.updateAbilityCooldownCallback(this);
        }
    }


    dealOmegaLaserDamage(targetsArray, activeBossesArray, laserDamageContext) {
        const beamStartX = this.x + Math.cos(this.omegaLaserAngle) * this.radius;
        const beamStartY = this.y + Math.sin(this.omegaLaserAngle) * this.radius;
        const beamEndX = this.x + Math.cos(this.omegaLaserAngle) * (this.radius + this.omegaLaserRange);
        const beamEndY = this.y + Math.sin(this.omegaLaserAngle) * (this.radius + this.omegaLaserRange);

        let damagePerTickForCalc = this.omegaLaserDamagePerTick;
        damagePerTickForCalc *= (this.abilityDamageMultiplier || 1.0);
        if (this.currentPath === 'mage') damagePerTickForCalc *= 2;
        damagePerTickForCalc *= this.currentOmegaLaserKineticBoost;
        if (this.abilityCritChance > 0 && Math.random() < this.abilityCritChance) damagePerTickForCalc *= this.abilityCritDamageMultiplier;

        const finalDamagePerTick = Math.round(Math.max(1, damagePerTickForCalc));

        if (targetsArray) {
            for (let i = targetsArray.length - 1; i >= 0; i--) {
                const target = targetsArray[i];
                if (target && isLineSegmentIntersectingCircle(beamStartX, beamStartY, beamEndX, beamEndY, target.x, target.y, target.radius + this.omegaLaserWidth / 2)) {
                    targetsArray.splice(i, 1); this.totalDamageDealt += 10;
                    if (laserDamageContext && laserDamageContext.updateScoreCallback) laserDamageContext.updateScoreCallback(10);
                }
            }
        }
        if (activeBossesArray) {
            activeBossesArray.forEach(boss => {
                if (boss && boss.health > 0 && isLineSegmentIntersectingCircle(beamStartX, beamStartY, beamEndX, beamEndY, boss.x, boss.y, boss.radius + this.omegaLaserWidth / 2)) {
                    if (typeof boss.takeDamage === 'function') {
                        const dmgDone = boss.takeDamage(finalDamagePerTick, null, this, {isAbility: true, abilityType: 'omegaLaser'});
                        if(dmgDone > 0) this.totalDamageDealt += dmgDone;
                    }
                }
            });
        }
    }

    dealAegisChargeImpactDamage(activeBossesArray, targetsArray, impactContext) {
        const chargeLevel = Math.min(1, this.aegisChargeCurrentChargeTime / AEGIS_CHARGE_MAX_CHARGE_TIME);
        const damageScaleFromCharge = chargeLevel * AEGIS_CHARGE_MAX_DAMAGE_SCALE_PER_SECOND_CHARGED * (AEGIS_CHARGE_MAX_CHARGE_TIME / 1000);
        let baseDamage = AEGIS_CHARGE_MIN_DAMAGE * (1 + damageScaleFromCharge);

        baseDamage = Math.round(baseDamage * (this.abilityDamageMultiplier || 1.0));
        if (this.abilityCritChance > 0 && Math.random() < this.abilityCritChance) baseDamage *= this.abilityCritDamageMultiplier;

        const { signalAchievementEvent } = impactContext || {};

        if (activeBossesArray) {
            activeBossesArray.forEach(boss => {
                if (Math.hypot(this.x - boss.x, this.y - boss.y) < AEGIS_CHARGE_AOE_RADIUS + boss.radius) {
                    if (boss.takeDamage) {
                        const bossHpBeforeImpact = boss.health;
                        const dmgDone = boss.takeDamage(baseDamage, null, this, {isAbility: true, abilityType: 'aegisCharge'});
                        if (dmgDone > 0) {
                             this.totalDamageDealt += dmgDone;
                             this.aegisChargeBossDamageDealtThisRun += dmgDone;

                            if (this.isAegisTeleportImpactPending && 
                                this.aegisTeleportImpactTimer > 0 && 
                                bossHpBeforeImpact > 0 && 
                                boss.health <= 0 && 
                                signalAchievementEvent) {
                                signalAchievementEvent("event_aegis_teleport_impact_kill");
                            }
                        }
                    }
                }
            });
        }
        if (targetsArray) { 
            for (let i = targetsArray.length - 1; i >= 0; i--) {
                const target = targetsArray[i];
                if (Math.hypot(this.x - target.x, this.y - target.y) < AEGIS_CHARGE_AOE_RADIUS + target.radius) {
                    targetsArray.splice(i, 1);
                    if (impactContext && impactContext.updateScoreCallback) impactContext.updateScoreCallback(10);
                    this.totalDamageDealt += 10;
                }
            }
        }
        this.aegisChargeCurrentChargeTime = 0;
        this.isAegisTeleportImpactPending = false; 
        this.aegisTeleportImpactTimer = 0;
    }

}