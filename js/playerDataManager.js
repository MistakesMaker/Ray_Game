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
                let cdValue = a.cooldownDuration;
                if (playerInstance.hasUltimateConfigurationHelm) {
                    cdValue *= 1.5;
                }
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
    if (playerInstance.hasOmegaLaser) abs.push({ name: "Omega Laser", desc: `${(CONSTANTS.OMEGA_LASER_COOLDOWN / 1000)}s CD` });
    if (playerInstance.hasShieldOvercharge) abs.push({ name: "Shield Overcharge", desc: `${(CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN / 1000)}s CD` });
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
        }

        if (displayThisUpgrade) {
            if (typeof e.getEffectString === 'function') {
                desc = e.getEffectString(playerInstance);
            } else {
                desc = `Level ${currentEvoLevel}`;
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
                damageTakenMultiplier: 1.0, baseRadius: CONSTANTS.PLAYER_BASE_RADIUS, finalRadius: CONSTANTS.PLAYER_BASE_RADIUS,
                scoreSizeFactor: GameState.getCurrentEffectiveDefaultGrowthFactor(), scoreOffsetForSizing: 0, scoreBasedSizeActual: 0,
                kineticConversionLevelSnapshot: 0, maxHp: CONSTANTS.PLAYER_MAX_HP, currentSpeed: CONSTANTS.PLAYER_SPEED_BASE,
                timesHit: 0, totalDamageDealt: 0, immuneColorsList: [], activeAbilities: {},
                visualModifiers: {}, helmType: null,
                ablativeAnimTimer: Date.now(), momentumAnimTimer: Date.now(), naniteAnimTimer: Date.now(), // Default animation timers
                formattedActiveAbilities: [], formattedMouseAbilities: [], displayedUpgrades: [],
                rayCritChance: 0, rayCritDamageMultiplier: 1.5, abilityCritChance: 0, abilityCritDamageMultiplier: 1.5,
                evolutionReRollsRemaining: CONSTANTS.MAX_EVOLUTION_REROLLS,
                evolutionBlocksRemaining: CONSTANTS.MAX_EVOLUTION_BLOCKS,
                blockedEvolutionIds: [],
                isBlockModeActive: false,
                evolutionFreezesRemaining: CONSTANTS.MAX_EVOLUTION_FREEZES_PER_RUN,
                frozenEvolutionChoice: null
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
        baseRadius: playerInstance.baseRadius,
        finalRadius: playerInstance.radius,
        scoreSizeFactor: determinedScoreSizeFactor,
        scoreOffsetForSizing: playerInstance.scoreOffsetForSizing,
        scoreBasedSizeActual: playerInstance.scoreBasedSize,
        kineticConversionLevelSnapshot: playerInstance.kineticConversionLevel,
        damageTakenMultiplier: playerInstance.damageTakenMultiplier,
        maxHp: playerInstance.maxHp, currentSpeed: playerInstance.currentSpeed,
        timesHit: playerInstance.timesHit, totalDamageDealt: playerInstance.totalDamageDealt,
        immuneColorsList: [...playerInstance.immuneColorsList],
        activeAbilities: JSON.parse(JSON.stringify(playerInstance.activeAbilities)),
        hasOmegaLaser: playerInstance.hasOmegaLaser, hasShieldOvercharge: playerInstance.hasShieldOvercharge,
        rayCritChance: playerInstance.rayCritChance,
        rayCritDamageMultiplier: playerInstance.rayCritDamageMultiplier,
        abilityCritChance: playerInstance.abilityCritChance,
        abilityCritDamageMultiplier: playerInstance.abilityCritDamageMultiplier,
        evolutionReRollsRemaining: playerInstance.evolutionReRollsRemaining,
        evolutionBlocksRemaining: playerInstance.evolutionBlocksRemaining,
        blockedEvolutionIds: [...playerInstance.blockedEvolutionIds],
        isBlockModeActive: playerInstance.isBlockModeActive,
        evolutionFreezesRemaining: playerInstance.evolutionFreezesRemaining,
        frozenEvolutionChoice: playerInstance.frozenEvolutionChoice ? JSON.parse(JSON.stringify(playerInstance.frozenEvolutionChoice)) : null,

        visualModifiers: JSON.parse(JSON.stringify(playerInstance.visualModifiers || {})),
        helmType: currentHelmType,
        // Capture live animation timers from the player instance
        ablativeAnimTimer: playerInstance.ablativeAnimTimer,
        momentumAnimTimer: playerInstance.momentumAnimTimer,
        naniteAnimTimer: playerInstance.naniteAnimTimer, // Will be undefined if player doesn't have it, which is fine

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