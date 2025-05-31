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

    // --- Process Path-Specific Mouse Abilities ---
    if (playerInstance.currentPath === 'mage') {
        if (playerInstance.hasOmegaLaser) {
            let baseCooldown = CONSTANTS.OMEGA_LASER_COOLDOWN;
            let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
            effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);
            let damagePerTick = CONSTANTS.OMEGA_LASER_DAMAGE_PER_TICK * (playerInstance.abilityDamageMultiplier || 1.0);
            if (playerInstance.hasUltimateConfigurationHelm) damagePerTick *= 2;

            mouseAbilities.push({
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
            mouseAbilities.push({
                name: "Shield Overcharge (RMB)",
                description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s, Dur: ${(CONSTANTS.SHIELD_OVERCHARGE_DURATION / 1000).toFixed(1)}s`,
                damage: `Heal: ${CONSTANTS.SHIELD_OVERCHARGE_HEAL_PER_RAY}/ray`,
                isMouseAbility: true
            });
        }
    } else if (playerInstance.currentPath === 'aegis') {
        if (playerInstance.hasAegisCharge) {
            let baseCooldown = CONSTANTS.AEGIS_CHARGE_COOLDOWN;
            let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
            effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);
            mouseAbilities.push({
                name: "Aegis Charge (LMB)",
                description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s, Max Charge: ${(CONSTANTS.AEGIS_CHARGE_MAX_CHARGE_TIME / 1000).toFixed(1)}s`,
                damage: `Impact AoE`, // Damage scales, complex to show simply
                isMouseAbility: true
            });
        }
        if (playerInstance.hasSeismicSlam) {
            let baseCooldown = CONSTANTS.SEISMIC_SLAM_COOLDOWN;
            let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
            effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);
             let damage = CONSTANTS.SEISMIC_SLAM_DAMAGE_BASE + (playerInstance.maxHp * CONSTANTS.SEISMIC_SLAM_DAMAGE_MAXHP_SCALE) + (playerInstance.radius * CONSTANTS.SEISMIC_SLAM_DAMAGE_RADIUS_SCALE);
            damage = Math.round(damage * (playerInstance.abilityDamageMultiplier || 1.0));

            mouseAbilities.push({
                name: "Seismic Slam (RMB)",
                description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s`,
                damage: `AoE ${damage.toFixed(0)}`,
                isMouseAbility: true
            });
        }
    } else if (playerInstance.currentPath === 'berserker') {
        if (playerInstance.hasBloodpact) {
            let baseCooldown = CONSTANTS.BLOODPACT_COOLDOWN;
            let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
            effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);
            mouseAbilities.push({
                name: "Bloodpact (LMB)",
                description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s, Dur: ${(CONSTANTS.BLOODPACT_DURATION / 1000).toFixed(1)}s`,
                damage: `${(CONSTANTS.BLOODPACT_LIFESTEAL_PERCENT * 100).toFixed(0)}% Lifesteal`,
                isMouseAbility: true
            });
        }
        if (playerInstance.hasSavageHowl) {
            let baseCooldown = CONSTANTS.SAVAGE_HOWL_COOLDOWN;
            let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
            effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);
            mouseAbilities.push({
                name: "Savage Howl (RMB)",
                description: `CD: ${(effectiveCooldown / 1000).toFixed(1)}s, Buff Dur: ${(CONSTANTS.SAVAGE_HOWL_ATTACK_SPEED_BUFF_DURATION / 1000).toFixed(1)}s`,
                damage: `Fear & +${(CONSTANTS.SAVAGE_HOWL_ATTACK_SPEED_BUFF_PERCENT * 100).toFixed(0)}% Atk Spd`,
                isMouseAbility: true
            });
        }
    }


    // --- Process Numeric Key Abilities ---
    if (playerInstance.activeAbilities) {
        const slotOrder = ['1', '2', '3'];
        for (const slotKey of slotOrder) {
            const abilityData = playerInstance.activeAbilities[slotKey];
            if (abilityData && abilityData.id) {
                const definition = bossLootPoolRef.find(l => l.id === abilityData.id && l.type === 'ability');
                if (definition) {
                    let baseCooldown = definition.cooldown;
                    let currentEffectDescription = "";

                    // Mage path Ultimate Configuration increases cooldowns of numeric abilities
                    if (playerInstance.currentPath === 'mage') {
                        baseCooldown *= 1.5;
                    }
                    let effectiveCooldown = baseCooldown * (1.0 - (playerInstance.globalCooldownReduction || 0));
                    effectiveCooldown = Math.max(baseCooldown * 0.1, effectiveCooldown);

                    let desc = `CD: ${(effectiveCooldown / 1000).toFixed(1)}s`;

                    if (definition.id === "empBurst") currentEffectDescription = "";
                    else if (definition.id === "teleport") currentEffectDescription = "";
                    else if (definition.id === "miniGravityWell") currentEffectDescription = "";

                    numericAbilities.push({
                        name: `${definition.name} (Slot ${slotKey})`,
                        description: desc,
                        damage: currentEffectDescription,
                        isMouseAbility: false
                    });
                }
            }
        }
    }
    return [...mouseAbilities, ...numericAbilities];
}


function prepareGearForStats(playerInstance, bossLootPoolRef, lootManagerRef) {
    if (!playerInstance || !bossLootPoolRef || !lootManagerRef) return [];
    let gearList = [];

    let chosenPathName = null;
    if (playerInstance.currentPath === 'aegis') chosenPathName = "Aegis Path";
    else if (playerInstance.currentPath === 'berserker') chosenPathName = "Path of Fury";
    else if (playerInstance.currentPath === 'mage') chosenPathName = "Path of Power";


    if (chosenPathName) {
        gearList.push({ name: chosenPathName, description: "(Path Buff)" });
    }

    if (playerInstance.acquiredBossUpgrades) {
        playerInstance.acquiredBossUpgrades.forEach(id => {
            const upg = bossLootPoolRef.find(u => u.id === id && u.type === 'gear');
            if (upg) {
                let desc = upg.description.split('.')[0];
                if (upg.id === 'adaptiveShield') desc = `Immune to ${playerInstance.immuneColorsList ? playerInstance.immuneColorsList.length : 0} colors`;
                gearList.push({ name: upg.name, description: desc });
            }
        });
    }
    return gearList;
}

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
        const defaultPlayerDataForPreview = {
             finalRadius: PLAYER_BASE_RADIUS, immuneColorsList: [], visualModifiers: {}, helmType: null,
             ablativeAnimTimer: Date.now(), momentumAnimTimer: Date.now(), naniteAnimTimer: Date.now(), aegisAnimTimer: Date.now(),
             hp: PLAYER_MAX_HP, maxHp: PLAYER_MAX_HP
        };

        return {
            runStats: defaultRunStats,
            playerCoreStats: defaultPlayerCoreStats,
            playerDataForPreview: defaultPlayerDataForPreview,
            immunities: [],
            gear: [],
            abilities: [],
            blockedEvolutions: [],
            bossTierData: bossTiers || { chaser: 0, reflector: 0, singularity: 0, nexusWeaver: 0 },
        };
    }

    const masterEvolutionListWithFunctions = EvolutionManager.getEvolutionMasterList();
    const runStats = {
        timesHit: playerInstance.timesHit,
        totalDamageDealt: playerInstance.totalDamageDealt,
        gameplayTime: GameState.getGameplayTimeElapsed()
    };
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
        if (evo.id === 'smallerPlayer') {
            if (evo.level > 0) {
                playerCoreStats.evolutions[evo.text] = evo.level;
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

    const immunities = [...playerInstance.immuneColorsList];
    const gear = prepareGearForStats(playerInstance, bossLootPoolRef, lootManagerRef);
    const abilities = getFormattedAbilitiesForStats(playerInstance, bossLootPoolRef);
    const blockedEvolutions = playerInstance.blockedEvolutionIds.map(id => {
        const evoDetail = masterEvolutionListWithFunctions.find(e => e.id === id);
        return evoDetail ? evoDetail.text : id.replace(/([A-Z])/g, ' $1').trim();
    });

    let currentHelmTypeForPreview = null;
    if (playerInstance.currentPath === 'aegis') currentHelmTypeForPreview = "aegisPath";
    else if (playerInstance.currentPath === 'berserker') currentHelmTypeForPreview = "berserkersEcho";
    else if (playerInstance.currentPath === 'mage') currentHelmTypeForPreview = "ultimateConfiguration";


    const playerDataForPreview = {
        finalRadius: playerInstance.radius,
        immuneColorsList: [...playerInstance.immuneColorsList],
        visualModifiers: JSON.parse(JSON.stringify(playerInstance.visualModifiers || {})),
        helmType: currentHelmTypeForPreview,
        ablativeAnimTimer: playerInstance.ablativeAnimTimer,
        momentumAnimTimer: playerInstance.momentumAnimTimer,
        naniteAnimTimer: playerInstance.naniteAnimTimer,
        aegisAnimTimer: playerInstance.aegisAnimTimer, 
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