// js/playerDataManager.js

import * as CONSTANTS from './constants.js';
import * as GameState from './gameState.js';
import * as EvolutionManager from './evolutionManager.js';
import { getReadableColorName as getReadableColorNameFromUtils } from './utils.js';

// --- Internal Helper Functions ---

function getFormattedAbilitiesForStats(playerInstance, bossLootPoolRef) {
    if (!playerInstance || !bossLootPoolRef) return [];
    let formattedAbilities = [];

    // Numeric Key Abilities
    if (playerInstance.activeAbilities) {
        for (const slotKey in playerInstance.activeAbilities) {
            const abilityData = playerInstance.activeAbilities[slotKey];
            if (abilityData && abilityData.id) {
                const definition = bossLootPoolRef.find(l => l.id === abilityData.id && l.type === 'ability');
                if (definition) {
                    let baseCooldown = definition.cooldown;
                    let currentDamage = "N/A"; // Default, ability might not do damage

                    // Apply Ultimate Configuration penalty for numeric abilities
                    if (playerInstance.hasUltimateConfigurationHelm) {
                        baseCooldown *= 1.5;
                    }
                     // Apply global percentage reduction
                    let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
                    effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown); // Ensure min 10%

                    let desc = `CD: ${(effectiveCooldown / 1000).toFixed(1)}s`;
                    if (definition.duration) {
                        desc += `, Dur: ${(definition.duration / 1000).toFixed(1)}s`;
                    }
                    // Add damage if applicable (example for EMP, could be extended)
                    if (definition.id === "empBurst") currentDamage = "Clears Rays"; // Special case description
                    // For miniGravityWell, damage comes from launched rays, not direct.

                    formattedAbilities.push({
                        name: `${definition.name} (Slot ${slotKey})`,
                        description: desc,
                        damage: currentDamage, // Store damage/effect
                        isMouseAbility: false
                    });
                }
            }
        }
    }

    // Mouse Abilities
    if (playerInstance.hasOmegaLaser) {
        let baseCooldown = CONSTANTS.OMEGA_LASER_COOLDOWN;
        let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
        effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);
        
        let damagePerTick = CONSTANTS.OMEGA_LASER_DAMAGE_PER_TICK * (playerInstance.abilityDamageMultiplier || 1.0);
        if (playerInstance.hasUltimateConfigurationHelm) damagePerTick *= 2;

        formattedAbilities.push({
            name: "Omega Laser (LMB)",
            description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s`,
            damage: `${damagePerTick.toFixed(1)}/tick`,
            isMouseAbility: true
        });
    }
    if (playerInstance.hasShieldOvercharge) {
        let baseCooldown = CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN;
        let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
        effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);

        formattedAbilities.push({
            name: "Shield Overcharge (RMB)",
            description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s, Heal: ${CONSTANTS.SHIELD_OVERCHARGE_HEAL_PER_RAY}/ray`,
            damage: "Invulnerability", // Or "Heals on absorb"
            isMouseAbility: true
        });
    }
    return formattedAbilities;
}


function prepareGearForStats(playerInstance, bossLootPoolRef) {
    if (!playerInstance || !bossLootPoolRef) return [];
    let gearList = [];

    // Path Buffs (Helms)
    let chosenPathName = null;
    let pathDescription = "(Chosen Path)";
    if (playerInstance.hasPerfectHarmonyHelm) chosenPathName = "Path of Harmony";
    else if (playerInstance.hasBerserkersEchoHelm) chosenPathName = "Path of Fury";
    else if (playerInstance.hasUltimateConfigurationHelm) chosenPathName = "Path of Power (Offense)";
    
    if (chosenPathName) {
        const pathDef = LootManager.getFirstPathChoices().find(p => p.name === chosenPathName);
        if(pathDef) pathDescription = pathDef.description.split('.')[0]; // First sentence as short desc
        gearList.push({ name: chosenPathName, description: pathDescription });
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
 * @returns {Object} A comprehensive statistics snapshot.
 */
export function createFinalStatsSnapshot(playerInstance, bossTiers, bossLootPoolRef) {
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
        // Sizing details (could be added if needed for deeper analysis, but finalRadius is key for display)
        // baseRadius: playerInstance.initialBaseRadius + playerInstance.bonusBaseRadius,
        // scoreSizeFactor: determinedScoreSizeFactor,
        // scoreOffsetForSizing: playerInstance.scoreOffsetForSizing,
        // scoreBasedSizeActual: playerInstance.scoreBasedSize,
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
        
        // Add evolution effects to core stats
        evolutions: {} // Store textual descriptions from getEffectString
    };
    
    masterEvolutionListWithFunctions.forEach(evo => {
        if (evo.level > 0 || 
            (evo.id === 'systemOvercharge' && playerInstance.evolutionIntervalModifier < 1.0) ||
            (evo.id === 'colorImmunity')) { // Always include color immunity to show count even if 0 initially
            if (typeof evo.getEffectString === 'function') {
                 // For evolutions that directly modify core stats, we'll rely on playerInstance already having the final value.
                 // For things like "Color Immunity", "System Overcharge", "Smaller Player Cooldown" we store the descriptive string.
                if (evo.id === 'colorImmunity' || evo.id === 'systemOvercharge' || evo.id === 'smallerPlayer' || evo.id === 'vitalitySurge' || evo.id === 'kineticConversion') {
                     playerCoreStats.evolutions[evo.text] = evo.getEffectString(playerInstance);
                }
            }
        }
    });


    // --- IMMUNITIES ---
    const immunities = [...playerInstance.immuneColorsList];

    // --- GEAR ---
    const gear = prepareGearForStats(playerInstance, bossLootPoolRef);
    
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
        hp: playerInstance.hp, // For Berserker helm visual
        maxHp: playerInstance.maxHp // For Berserker helm visual
    };


    return {
        runStats,
        playerCoreStats,
        playerDataForPreview, // This is what Player.drawFromSnapshot will use
        immunities,
        gear,
        abilities,
        blockedEvolutions,
        bossTierData: bossTiers || { chaser: 0, reflector: 0, singularity: 0, nexusWeaver: 0 },
        // Note: We are not explicitly passing the full `playerDataSnapshot` from the old structure.
        // Instead, UIManager will build its display from these more organized categories.
        // The `playerDataForPreview` is specifically for the visual rendering of the player.
    };
}