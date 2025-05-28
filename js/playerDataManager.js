// js/playerDataManager.js

import * as CONSTANTS from './constants.js';
import * as GameState from './gameState.js';
import * as EvolutionManager from './evolutionManager.js';
import { getReadableColorName as getReadableColorNameFromUtils } from './utils.js';

// --- Internal Helper Functions ---

function getFormattedActiveAbilitiesForStats(playerInstance, bossLootPoolRef) {
    if (!playerInstance || !playerInstance.activeAbilities || !bossLootPoolRef) return [];
    let fmt = [];
    for (const s in playerInstance.activeAbilities) {
        const a = playerInstance.activeAbilities[s];
        if (a) {
            const d = bossLootPoolRef.find(l => l.id === a.id && l.type === 'ability');
            if (d) {
                let cdValue = a.cooldownDuration; // This is the base cooldown from lootManager
                
                // Apply Ultimate Configuration penalty first if applicable
                if (playerInstance.hasUltimateConfigurationHelm) {
                    cdValue *= 1.5;
                }

                // Then apply global percentage reduction
                cdValue *= (1.0 - (playerInstance.globalCooldownReduction || 0));
                
                // Ensure cooldown doesn't go below a minimum (e.g., 10% of original base before any mods)
                // or a very small flat minimum to prevent zero/negative cooldowns from extreme stacking.
                let minCooldown = (a.cooldownDuration || CONSTANTS.OMEGA_LASER_COOLDOWN) * 0.1; // Use original base for min
                cdValue = Math.max(minCooldown, cdValue);


                let cd = (cdValue / 1000).toFixed(1) + 's';
                if (playerInstance.hasUltimateConfigurationHelm) cd += ' (Ult.Cfg)';
                if (a.duration) cd += ` (Dur: ${(a.duration / 1000).toFixed(1)}s)`;
                fmt.push({ name: d.name, slot: s, desc: cd });
            }
        }
    }
    return fmt;
}

function getFormattedMouseAbilitiesForStats(playerInstance) {
    if (!playerInstance) return [];
    let abs = [];
    if (playerInstance.hasOmegaLaser) {
        let cdValue = CONSTANTS.OMEGA_LASER_COOLDOWN * (1.0 - (playerInstance.globalCooldownReduction || 0));
        cdValue = Math.max(CONSTANTS.OMEGA_LASER_COOLDOWN * 0.1, cdValue);
        abs.push({ name: "Omega Laser", desc: `${(cdValue / 1000).toFixed(1)}s CD` });
    }
    if (playerInstance.hasShieldOvercharge) {
        let cdValue = CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN * (1.0 - (playerInstance.globalCooldownReduction || 0));
        cdValue = Math.max(CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN * 0.1, cdValue);
        abs.push({ name: "Shield Overcharge", desc: `${(cdValue / 1000).toFixed(1)}s CD` });
    }
    return abs;
}

function prepareDisplayedUpgradesForStats(playerInstance, masterEvolutionListSnapshot, bossLootPoolRef) {
    if (!playerInstance || !masterEvolutionListSnapshot || !bossLootPoolRef) return [];
    let list = [];

    let chosenPathName = null;
    if (playerInstance.hasPerfectHarmonyHelm) chosenPathName = "Path of Harmony";
    else if (playerInstance.hasBerserkersEchoHelm) chosenPathName = "Path of Fury";
    else if (playerInstance.hasUltimateConfigurationHelm) chosenPathName = "Path of Power (Offense)";

    if (chosenPathName) {
        list.push({ name: chosenPathName, description: "(Chosen Path)" });
    }

    masterEvolutionListSnapshot.forEach(e => {
        let displayThisUpgrade = false;
        let desc = "";
        const currentEvoLevel = e.level || 0; 

        if (currentEvoLevel > 0) {
            displayThisUpgrade = true;
        } else { 
            if (e.id === 'rayCritChance' && playerInstance.rayCritChance > 0) displayThisUpgrade = true;
            else if (e.id === 'rayCritDamage' && playerInstance.rayCritDamageMultiplier > 1.5) displayThisUpgrade = true;
            else if (e.id === 'abilityCritChance' && playerInstance.abilityCritChance > 0) displayThisUpgrade = true;
            else if (e.id === 'abilityCritDamage' && playerInstance.abilityCritDamageMultiplier > 1.5) displayThisUpgrade = true;
            else if (e.id === 'systemOvercharge' && playerInstance.evolutionIntervalModifier < 1.0) displayThisUpgrade = true;
            else if (e.id === 'unstableCore' && (playerInstance.chainReactionChance || 0) > 0) displayThisUpgrade = true; 
            else if (e.id === 'streamlinedSystems' && (playerInstance.globalCooldownReduction || 0) > 0) displayThisUpgrade = true;
        }

        if (displayThisUpgrade) {
            if (typeof e.getEffectString === 'function') {
                desc = e.getEffectString(playerInstance, currentEvoLevel); 
            } else {
                // Only fallback to Level if currentEvoLevel is > 0, otherwise it means it's a base stat effect
                desc = currentEvoLevel > 0 ? `Level ${currentEvoLevel}` : "Base Effect"; 
            }

            // If getEffectString returned something like "Not Acquired" or an empty string for a level 0 that *is* active
            // (e.g. base crit chance before picking the evolution), or if the fallback resulted in "Level 0"
            // for such cases, try to get a more meaningful string or default to "Active".
            if ((desc === "Not Acquired" || desc === "" || desc === "Level 0" || desc === "Base Effect") && currentEvoLevel === 0) {
                let isActiveDueToBase = false;
                if (e.id === 'rayCritChance' && playerInstance.rayCritChance > 0) isActiveDueToBase = true;
                else if (e.id === 'rayCritDamage' && playerInstance.rayCritDamageMultiplier > 1.5) isActiveDueToBase = true;
                else if (e.id === 'abilityCritChance' && playerInstance.abilityCritChance > 0) isActiveDueToBase = true;
                else if (e.id === 'abilityCritDamage' && playerInstance.abilityCritDamageMultiplier > 1.5) isActiveDueToBase = true;
                else if (e.id === 'unstableCore' && (playerInstance.chainReactionChance || 0) > 0) isActiveDueToBase = true;
                else if (e.id === 'streamlinedSystems' && (playerInstance.globalCooldownReduction || 0) > 0) isActiveDueToBase = true;
                
                if(isActiveDueToBase && typeof e.getEffectString === 'function') {
                    desc = e.getEffectString(playerInstance, 0); // Get effect string for level 0 state
                } else if (isActiveDueToBase) {
                    desc = "Active (Base)";
                }
            }


            if (desc) {
                let nameToDisplay = e.text;
                if (e.id === 'colorImmunity' && playerInstance.immuneColorsList) {
                    nameToDisplay = `${e.text} (${playerInstance.immuneColorsList.length})`;
                }
                list.push({ name: nameToDisplay, description: desc });
            }
        }
    });

    if (playerInstance.acquiredBossUpgrades) {
        playerInstance.acquiredBossUpgrades.forEach(id => {
            const upg = bossLootPoolRef.find(u => u.id === id);
            if (upg) {
                if (upg.type === 'gear') {
                    let d = `(${upg.type.charAt(0).toUpperCase() + upg.type.slice(1)})`;
                     if (upg.id === 'adaptiveShield') d = `(Colors: ${playerInstance.immuneColorsList ? playerInstance.immuneColorsList.length : 0})`;
                    list.push({ name: upg.name, description: d });
                }
            }
        });
    }

    if (playerInstance.pickupAttractionRadius > 0) list.push({ name: "Pickup Attraction", description: `Radius ${playerInstance.pickupAttractionRadius.toFixed(0)}` });

    return list;
}

/**
 * Creates a snapshot of all relevant player and game statistics.
 * @param {Object} playerInstance - The current player object.
 * @param {Object} bossTiers - An object containing boss tiers (e.g., from BossManager).
 * @param {Array} bossLootPoolRef - Reference to the bossLootPool array.
 * @returns {Object} A comprehensive statistics snapshot.
 */
export function createFinalStatsSnapshot(playerInstance, bossTiers, bossLootPoolRef) {
    if (!playerInstance) { 
        return {
            playerData: {
                hp: PLAYER_MAX_HP,
                maxHp: PLAYER_MAX_HP,
                finalRadius: PLAYER_BASE_RADIUS,
                currentSpeed: PLAYER_SPEED_BASE,
                timesHit: 0, 
                totalDamageDealt: 0,
                baseRadius: PLAYER_BASE_RADIUS,
                scoreSizeFactor: GameState.getCurrentEffectiveDefaultGrowthFactor(), 
                scoreOffsetForSizing: 0, 
                scoreBasedSizeActual: 0,
                damageTakenMultiplier: 1.0, 
                immuneColorsList: [], 
                rayDamageBonus: 0,
                chainReactionChance: 0, 
                rayCritChance: 0, 
                rayCritDamageMultiplier: 1.5,
                abilityDamageMultiplier: 1.0,
                abilityCritChance: 0, 
                abilityCritDamageMultiplier: 1.5,
                temporalEchoChance: 0,
                globalCooldownReduction: 0,
                kineticConversionLevelSnapshot: 0, 
                initialKineticDamageBonus: CONSTANTS.KINETIC_INITIAL_DAMAGE_BONUS,
                effectiveKineticAdditionalDamageBonusPerLevel: CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL,
                baseKineticChargeRate: CONSTANTS.KINETIC_BASE_CHARGE_RATE,
                effectiveKineticChargeRatePerLevel: CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL,
                activeAbilities: {}, 
                hasOmegaLaser: false, 
                hasShieldOvercharge: false,
                evolutionReRollsRemaining: CONSTANTS.MAX_EVOLUTION_REROLLS,
                evolutionBlocksRemaining: CONSTANTS.MAX_EVOLUTION_BLOCKS,
                blockedEvolutionIds: [],
                isBlockModeActive: false,
                evolutionFreezesRemaining: CONSTANTS.MAX_EVOLUTION_FREEZES_PER_RUN,
                frozenEvolutionChoice: null,
                visualModifiers: {}, 
                helmType: null,
                ablativeAnimTimer: Date.now(), momentumAnimTimer: Date.now(), naniteAnimTimer: Date.now(),
                formattedActiveAbilities: [], formattedMouseAbilities: [], displayedUpgrades: []
            },
            bossTierData: bossTiers || { chaser: 0, reflector: 0, singularity: 0, nexusWeaver: 0 },
            gameplayTimeData: GameState.getGameplayTimeElapsed()
        };
    }

    const masterEvolutionListSnapshot = EvolutionManager.getEvolutionMasterList();

    playerInstance.baseRadius = playerInstance.initialBaseRadius + playerInstance.bonusBaseRadius;
    let determinedScoreSizeFactor = (typeof GameState.getCurrentPlayerRadiusGrowthFactor() === 'number' && !isNaN(GameState.getCurrentPlayerRadiusGrowthFactor()))
                                    ? GameState.getCurrentPlayerRadiusGrowthFactor()
                                    : GameState.getCurrentEffectiveDefaultGrowthFactor();
    if (determinedScoreSizeFactor === 0 && playerInstance.scoreBasedSize > 0) determinedScoreSizeFactor = GameState.getCurrentEffectiveDefaultGrowthFactor();
    else if (determinedScoreSizeFactor === 0 && playerInstance.scoreBasedSize === 0) determinedScoreSizeFactor = 0;
    if (typeof determinedScoreSizeFactor !== 'number' || isNaN(determinedScoreSizeFactor)) determinedScoreSizeFactor = 0.000;

    let currentHelmType = null;
    if (playerInstance.hasPerfectHarmonyHelm) currentHelmType = "perfectHarmony";
    else if (playerInstance.hasBerserkersEchoHelm) currentHelmType = "berserkersEcho";
    else if (playerInstance.hasUltimateConfigurationHelm) currentHelmType = "ultimateConfiguration";

    const playerDataSnapshot = {
        // Core Stats
        hp: playerInstance.hp, 
        maxHp: playerInstance.maxHp,
        finalRadius: playerInstance.radius,
        currentSpeed: playerInstance.currentSpeed,
        timesHit: playerInstance.timesHit,
        totalDamageDealt: playerInstance.totalDamageDealt,
        
        // Sizing and Growth
        baseRadius: playerInstance.baseRadius,
        scoreSizeFactor: determinedScoreSizeFactor,
        scoreOffsetForSizing: playerInstance.scoreOffsetForSizing,
        scoreBasedSizeActual: playerInstance.scoreBasedSize,

        // Defensive Stats
        damageTakenMultiplier: playerInstance.damageTakenMultiplier,
        immuneColorsList: [...playerInstance.immuneColorsList],
        
        // Offensive Stats
        rayDamageBonus: playerInstance.rayDamageBonus,
        chainReactionChance: playerInstance.chainReactionChance || 0,
        rayCritChance: playerInstance.rayCritChance || 0,
        rayCritDamageMultiplier: playerInstance.rayCritDamageMultiplier || 1.5,
        
        // Ability Stats
        abilityDamageMultiplier: playerInstance.abilityDamageMultiplier || 1.0,
        abilityCritChance: playerInstance.abilityCritChance || 0,
        abilityCritDamageMultiplier: playerInstance.abilityCritDamageMultiplier || 1.5,
        temporalEchoChance: playerInstance.temporalEchoChance || 0,
        globalCooldownReduction: playerInstance.globalCooldownReduction || 0,

        // Kinetic Conversion
        kineticConversionLevelSnapshot: playerInstance.kineticConversionLevel || 0,
        initialKineticDamageBonus: playerInstance.initialKineticDamageBonus,
        effectiveKineticAdditionalDamageBonusPerLevel: playerInstance.effectiveKineticAdditionalDamageBonusPerLevel,
        baseKineticChargeRate: playerInstance.baseKineticChargeRate,
        effectiveKineticChargeRatePerLevel: playerInstance.effectiveKineticChargeRatePerLevel,

        // Active Abilities (state for UI, not full objects)
        activeAbilities: JSON.parse(JSON.stringify(playerInstance.activeAbilities)),
        hasOmegaLaser: playerInstance.hasOmegaLaser,
        hasShieldOvercharge: playerInstance.hasShieldOvercharge,
        
        // Evolution Interaction State
        evolutionReRollsRemaining: playerInstance.evolutionReRollsRemaining,
        evolutionBlocksRemaining: playerInstance.evolutionBlocksRemaining,
        blockedEvolutionIds: [...playerInstance.blockedEvolutionIds],
        isBlockModeActive: playerInstance.isBlockModeActive, 
        evolutionFreezesRemaining: playerInstance.evolutionFreezesRemaining,
        frozenEvolutionChoice: playerInstance.frozenEvolutionChoice ? JSON.parse(JSON.stringify(playerInstance.frozenEvolutionChoice)) : null,

        // Visuals and Path
        visualModifiers: JSON.parse(JSON.stringify(playerInstance.visualModifiers || {})),
        helmType: currentHelmType,
        ablativeAnimTimer: playerInstance.ablativeAnimTimer,
        momentumAnimTimer: playerInstance.momentumAnimTimer,
        naniteAnimTimer: playerInstance.naniteAnimTimer,

        // Formatted for direct display
        formattedActiveAbilities: getFormattedActiveAbilitiesForStats(playerInstance, bossLootPoolRef),
        formattedMouseAbilities: getFormattedMouseAbilitiesForStats(playerInstance),
        displayedUpgrades: prepareDisplayedUpgradesForStats(playerInstance, masterEvolutionListSnapshot, bossLootPoolRef) 
    };

    const bossTierSnapshot = bossTiers || { chaser: 0, reflector: 0, singularity: 0, nexusWeaver: 0 };
    return {
        playerData: playerDataSnapshot,
        bossTierData: bossTierSnapshot,
        gameplayTimeData: GameState.getGameplayTimeElapsed(),
    };
}