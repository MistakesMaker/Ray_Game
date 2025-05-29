// js/playerDataManager.js

import * as CONSTANTS from './constants.js';
import * as GameState from './gameState.js';
import * as EvolutionManager from './evolutionManager.js';
import { getReadableColorName as getReadableColorNameFromUtils } from './utils.js';
// LootManager is NOT directly imported here, it's passed into createFinalStatsSnapshot

// --- Internal Helper Functions ---

function getFormattedAbilitiesForStats(playerInstance, bossLootPoolRef) {
    if (!playerInstance || !bossLootPoolRef) return [];
    let mouseAbilities = [];
    let numericAbilities = [];

    // --- Process Mouse Abilities First ---
    if (playerInstance.hasOmegaLaser) {
        let baseCooldown = CONSTANTS.OMEGA_LASER_COOLDOWN;
        let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
        effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);

        let damagePerTick = CONSTANTS.OMEGA_LASER_DAMAGE_PER_TICK * (playerInstance.abilityDamageMultiplier || 1.0);
        if (playerInstance.hasUltimateConfigurationHelm) damagePerTick *= 2;

        mouseAbilities.push({
            name: "Omega Laser (LMB)",
            description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s`,
            damage: `${damagePerTick.toFixed(1)}/tick`, // Damage is key here
            isMouseAbility: true
        });
    }
    if (playerInstance.hasShieldOvercharge) {
        let baseCooldown = CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN;
        let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
        effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);

        mouseAbilities.push({
            name: "Shield Overcharge (RMB)",
            description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s, Dur: ${(CONSTANTS.SHIELD_OVERCHARGE_DURATION / 1000).toFixed(1)}s`, // Duration is important for this buff
            damage: `Heal: ${CONSTANTS.SHIELD_OVERCHARGE_HEAL_PER_RAY}/ray`, // Keep Heal, remove (Invulnerability)
            isMouseAbility: true
        });
    }

    // --- Process Numeric Key Abilities ---
    if (playerInstance.activeAbilities) {
        const slotOrder = ['1', '2', '3']; // Ensure consistent order
        for (const slotKey of slotOrder) {
            const abilityData = playerInstance.activeAbilities[slotKey];
            if (abilityData && abilityData.id) {
                const definition = bossLootPoolRef.find(l => l.id === abilityData.id && l.type === 'ability');
                if (definition) {
                    let baseCooldown = definition.cooldown;
                    let currentEffectDescription = ""; // Changed from currentDamage

                    if (playerInstance.hasUltimateConfigurationHelm) {
                        baseCooldown *= 1.5;
                    }
                    let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
                    effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);

                    let desc = `CD: ${(effectiveCooldown / 1000).toFixed(1)}s`;

                    // Specific effect descriptions, removing what's not needed
                    if (definition.id === "empBurst") currentEffectDescription = ""; // No extra text
                    else if (definition.id === "teleport") currentEffectDescription = ""; // No extra text, duration removed
                    else if (definition.id === "miniGravityWell") currentEffectDescription = ""; // No extra text, duration removed

                    numericAbilities.push({
                        name: `${definition.name} (Slot ${slotKey})`,
                        description: desc,
                        damage: currentEffectDescription, // Use this for the concise effect note if any
                        isMouseAbility: false
                    });
                }
            }
        }
    }
    // Combine in the desired order: LMB, RMB, 1, 2, 3
    return [...mouseAbilities, ...numericAbilities];
}


function prepareGearForStats(playerInstance, bossLootPoolRef, lootManagerRef) {
    if (!playerInstance || !bossLootPoolRef || !lootManagerRef) return [];
    let gearList = [];

    // Path Buffs (Helms)
    let chosenPathName = null;
    if (playerInstance.hasPerfectHarmonyHelm) chosenPathName = "Path of Harmony";
    else if (playerInstance.hasBerserkersEchoHelm) chosenPathName = "Path of Fury";
    else if (playerInstance.hasUltimateConfigurationHelm) chosenPathName = "Path of Power (Offense)";

    if (chosenPathName) {
        gearList.push({ name: chosenPathName, description: "(Path Buff)" });
    }

    // Acquired Boss Gear
    if (playerInstance.acquiredBossUpgrades) {
        playerInstance.acquiredBossUpgrades.forEach(id => {
            const upg = bossLootPoolRef.find(u => u.id === id && u.type === 'gear');
            if (upg) {
                let desc = upg.description.split('.')[0]; // First sentence
                if (upg.id === 'adaptiveShield') desc = `Immune to ${playerInstance.immuneColorsList ? playerInstance.immuneColorsList.length : 0} colors`;
                gearList.push({ name: upg.name, description: desc });
            }
        });
    }
    return gearList;
}


/**
 * Creates a snapshot of all relevant player and game statistics.
 * @param {Object} playerInstance - The current player object.
 * @param {Object} bossTiers - An object containing boss tiers (e.g., from BossManager).
 * @param {Array} bossLootPoolRef - Reference to the bossLootPool array.
 * @param {Object} lootManagerRef - Reference to the LootManager module/object.
 * @returns {Object} A comprehensive statistics snapshot.
 */
export function createFinalStatsSnapshot(playerInstance, bossTiers, bossLootPoolRef, lootManagerRef) {
    if (!playerInstance) {
        const defaultRunStats = { timesHit: 0, totalDamageDealt: 0, gameplayTime: 0 };
        const defaultPlayerCoreStats = {
            hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP, finalRadius: PLAYER_BASE_RADIUS,
            damageTakenMultiplier: 1.0,
            rayDamageBonus: 0, chainReactionChance: 0,
            rayCritChance: 0, rayCritDamageMultiplier: 1.5,
            abilityDamageMultiplier: 1.0, abilityCritChance: 0, abilityCritDamageMultiplier: 1.5,
            temporalEchoChance: 0, globalCooldownReduction: 0,
            kineticConversionLevel: 0,
            initialKineticDamageBonus: CONSTANTS.KINETIC_INITIAL_DAMAGE_BONUS,
            effectiveKineticAdditionalDamageBonusPerLevel: CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL,
            baseKineticChargeRate: CONSTANTS.KINETIC_BASE_CHARGE_RATE,
            effectiveKineticChargeRatePerLevel: CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL,
        };
        const defaultPlayerDataForPreview = { // For playerPreviewCanvas
             finalRadius: PLAYER_BASE_RADIUS, immuneColorsList: [], visualModifiers: {}, helmType: null,
             ablativeAnimTimer: Date.now(), momentumAnimTimer: Date.now(), naniteAnimTimer: Date.now(),
             hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP // Needed for Berserker helm preview
        };

        return {
            runStats: defaultRunStats,
            playerCoreStats: defaultPlayerCoreStats,
            playerDataForPreview: defaultPlayerDataForPreview, // For Player.drawFromSnapshot
            immunities: [],
            gear: [],
            abilities: [],
            blockedEvolutions: [],
            bossTierData: bossTiers || { chaser: 0, reflector: 0, singularity: 0, nexusWeaver: 0 },
        };
    }

    // Get evolution definitions which include getEffectString
    const masterEvolutionListWithFunctions = EvolutionManager.getEvolutionMasterList();

    // --- RUN STATS ---
    const runStats = {
        timesHit: playerInstance.timesHit,
        totalDamageDealt: playerInstance.totalDamageDealt,
        gameplayTime: GameState.getGameplayTimeElapsed()
    };

    // --- PLAYER CORE STATS (derived from player props and evolutions) ---
    const playerCoreStats = {
        hp: playerInstance.hp,
        maxHp: playerInstance.maxHp,
        finalRadius: playerInstance.radius,
        damageTakenMultiplier: playerInstance.damageTakenMultiplier,
        rayDamageBonus: playerInstance.rayDamageBonus || 0,
        chainReactionChance: playerInstance.chainReactionChance || 0,
        rayCritChance: playerInstance.rayCritChance || 0,
        rayCritDamageMultiplier: playerInstance.rayCritDamageMultiplier || 1.5,
        abilityDamageMultiplier: playerInstance.abilityDamageMultiplier || 1.0,
        abilityCritChance: playerInstance.abilityCritChance || 0,
        abilityCritDamageMultiplier: playerInstance.abilityCritDamageMultiplier || 1.5,
        temporalEchoChance: playerInstance.temporalEchoChance || 0,
        globalCooldownReduction: playerInstance.globalCooldownReduction || 0,

        kineticConversionLevel: playerInstance.kineticConversionLevel || 0,
        initialKineticDamageBonus: playerInstance.initialKineticDamageBonus || CONSTANTS.KINETIC_INITIAL_DAMAGE_BONUS,
        effectiveKineticAdditionalDamageBonusPerLevel: playerInstance.effectiveKineticAdditionalDamageBonusPerLevel || CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL,
        baseKineticChargeRate: playerInstance.baseKineticChargeRate || CONSTANTS.KINETIC_BASE_CHARGE_RATE,
        effectiveKineticChargeRatePerLevel: playerInstance.effectiveKineticChargeRatePerLevel || CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL,

        evolutions: {}
    };

    masterEvolutionListWithFunctions.forEach(evo => {
        if (evo.id === 'smallerPlayer') { // <<< MODIFICATION: Handle smallerPlayer (Evasive Maneuver) differently
            if (evo.level > 0) {
                playerCoreStats.evolutions[evo.text] = evo.level; // Store the level (times taken)
            }
        } else if (evo.level > 0 ||
            (evo.id === 'systemOvercharge' && playerInstance.evolutionIntervalModifier < 1.0) ||
            (evo.id === 'colorImmunity')) {
            if (typeof evo.getEffectString === 'function') {
                if (evo.id === 'colorImmunity' || evo.id === 'systemOvercharge' || evo.id === 'vitalitySurge' || evo.id === 'kineticConversion') {
                     playerCoreStats.evolutions[evo.text] = evo.getEffectString(playerInstance);
                }
            }
        }
    });


    // --- IMMUNITIES ---
    const immunities = [...playerInstance.immuneColorsList];

    // --- GEAR ---
    const gear = prepareGearForStats(playerInstance, bossLootPoolRef, lootManagerRef);

    // --- ABILITIES ---
    const abilities = getFormattedAbilitiesForStats(playerInstance, bossLootPoolRef);

    // --- BLOCKED EVOLUTIONS ---
    const blockedEvolutions = playerInstance.blockedEvolutionIds.map(id => {
        const evoDetail = masterEvolutionListWithFunctions.find(e => e.id === id);
        return evoDetail ? evoDetail.text : id.replace(/([A-Z])/g, ' $1').trim();
    });

    // --- PLAYER DATA FOR PREVIEW CANVAS ---
    let currentHelmTypeForPreview = null;
    if (playerInstance.hasPerfectHarmonyHelm) currentHelmTypeForPreview = "perfectHarmony";
    else if (playerInstance.hasBerserkersEchoHelm) currentHelmTypeForPreview = "berserkersEcho";
    else if (playerInstance.hasUltimateConfigurationHelm) currentHelmTypeForPreview = "ultimateConfiguration";

    const playerDataForPreview = {
        finalRadius: playerInstance.radius,
        immuneColorsList: [...playerInstance.immuneColorsList],
        visualModifiers: JSON.parse(JSON.stringify(playerInstance.visualModifiers || {})),
        helmType: currentHelmTypeForPreview,
        ablativeAnimTimer: playerInstance.ablativeAnimTimer,
        momentumAnimTimer: playerInstance.momentumAnimTimer,
        naniteAnimTimer: playerInstance.naniteAnimTimer,
        hp: playerInstance.hp,
        maxHp: playerInstance.maxHp
    };


    return {
        runStats,
        playerCoreStats,
        playerDataForPreview,
        immunities,
        gear,
        abilities,
        blockedEvolutions,
        bossTierData: bossTiers || { chaser: 0, reflector: 0, singularity: 0, nexusWeaver: 0 },
    };
}