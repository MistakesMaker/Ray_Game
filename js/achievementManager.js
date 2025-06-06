// js/achievementManager.js
import { allAchievements as achievementDefinitions } from './achievementsData.js';
import * as UIManager from './uiManager.js';
import * as CONSTANTS_MODULE from './constants.js'; 

const UNLOCKED_ACHIEVEMENTS_STORAGE_KEY = 'lightBlasterOmega_unlockedAchievements_v1';
const MAX_BOSS_TIERS_DEFEATED_KEY = 'lightBlasterOmega_maxBossTiersDefeated_v1'; 

let processedAchievements = [];
let newAchievementsThisSession = new Set();
let maxBossTiersDefeated = { 
    chaser: 0,
    reflector: 0,
    singularity: 0
};

export function initializeAchievements() {
    let unlockedIds = [];
    try {
        const storedUnlocked = localStorage.getItem(UNLOCKED_ACHIEVEMENTS_STORAGE_KEY);
        if (storedUnlocked) {
            unlockedIds = JSON.parse(storedUnlocked);
        }
        const storedMaxTiers = localStorage.getItem(MAX_BOSS_TIERS_DEFEATED_KEY);
        if (storedMaxTiers) {
            const parsedTiers = JSON.parse(storedMaxTiers);
            if (parsedTiers.chaser && typeof parsedTiers.chaser === 'number') maxBossTiersDefeated.chaser = parsedTiers.chaser;
            if (parsedTiers.reflector && typeof parsedTiers.reflector === 'number') maxBossTiersDefeated.reflector = parsedTiers.reflector;
            if (parsedTiers.singularity && typeof parsedTiers.singularity === 'number') maxBossTiersDefeated.singularity = parsedTiers.singularity;
        }
    } catch (e) {
        console.error("Error parsing achievements/boss tiers from localStorage:", e);
        unlockedIds = [];
        maxBossTiersDefeated = { chaser: 0, reflector: 0, singularity: 0 };
    }

    processedAchievements = achievementDefinitions.map(def => ({
        ...def,
        isUnlocked: unlockedIds.includes(def.id)
    }));
    newAchievementsThisSession.clear();
}

function updateMaxBossTierDefeated(bossKey, tier) {
    if (maxBossTiersDefeated.hasOwnProperty(bossKey)) {
        if (tier > maxBossTiersDefeated[bossKey]) {
            maxBossTiersDefeated[bossKey] = tier;
            try {
                localStorage.setItem(MAX_BOSS_TIERS_DEFEATED_KEY, JSON.stringify(maxBossTiersDefeated));
            } catch (e) {
                console.error("Error saving max boss tiers to localStorage:", e);
            }
        }
    }
}


export function isAchievementUnlocked(achievementId) {
    const achievement = processedAchievements.find(ach => ach.id === achievementId);
    return achievement ? achievement.isUnlocked : false;
}

export function getAllAchievementsWithStatus() {
    return processedAchievements.map(ach => ({ ...ach }));
}

export function getUnlockedAchievementCount() {
    if (!processedAchievements || processedAchievements.length === 0) {
        return 0;
    }
    return processedAchievements.filter(ach => ach.isUnlocked).length;
}

function unlockAchievement(achievementId, gameContext) {
    const achievement = processedAchievements.find(ach => ach.id === achievementId);
    if (achievement && !achievement.isUnlocked) {
        achievement.isUnlocked = true;
        newAchievementsThisSession.add(achievementId);

        const unlockedIds = processedAchievements.filter(ach => ach.isUnlocked).map(ach => ach.id);
        try {
            localStorage.setItem(UNLOCKED_ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(unlockedIds));
        } catch (e) {
            console.error("Error saving unlocked achievements to localStorage:", e);
        }

        if (gameContext && gameContext.activeBuffNotificationsArray && UIManager) {
            const notificationText = `🏆 Achievement Unlocked: ${achievement.name} (${achievement.tier})!`;
            gameContext.activeBuffNotificationsArray.push({
                text: notificationText,
                timer: CONSTANTS_MODULE.BUFF_NOTIFICATION_DURATION * 1.5
            });
            if(gameContext.playSound && gameContext.audioSystem && gameContext.audioSystem.upgradeSound) {
                gameContext.playSound(gameContext.audioSystem.upgradeSound);
            }
            console.log(`[ACHIEVEMENT] Unlocked: ${achievement.name}`);
        }
    }
}

function evaluateCondition(achievement, gameContext) {
    if (!achievement.unlockConditions || !gameContext || !gameContext.player || !gameContext.GameState) {
        return false;
    }

    const player = gameContext.player;
    const gameState = gameContext.GameState;
    const conditions = achievement.unlockConditions;
    const initialCharges = gameContext.initialEvoScreenCharges || { rerolls: -1, blocks: -1, freezes: -1 };
    const constants = gameContext.CONSTANTS || CONSTANTS_MODULE; 
    const bossManager = gameContext.bossManager;

    switch (conditions.type) {
        case "player_stat_gte":
            if (conditions.path && player.currentPath !== conditions.path) return false;
            const statPartsGTE = conditions.stat.split('.');
            let currentValueGTE = player;
            for (const part of statPartsGTE) {
                if (currentValueGTE && typeof currentValueGTE === 'object' && part in currentValueGTE) {
                    currentValueGTE = currentValueGTE[part];
                } else { return false; }
            }
            if (typeof currentValueGTE === 'number' || (Array.isArray(currentValueGTE) && conditions.stat.endsWith('.length'))) {
                 let valueToCheckGTE = Array.isArray(currentValueGTE) && conditions.stat.endsWith('.length') ? currentValueGTE.length : currentValueGTE;
                 return valueToCheckGTE >= conditions.value;
            }
            break;

        case "gamestate_score_gte":
            return gameState.getScore() >= conditions.value;

        case "player_stat_not_null":
            const statPartsNotNull = conditions.stat.split('.');
            let currentValueNotNull = player;
            for (const part of statPartsNotNull) {
                if (currentValueNotNull && typeof currentValueNotNull === 'object' && part in currentValueNotNull) {
                    currentValueNotNull = currentValueNotNull[part];
                } else { return false; }
            }
            return currentValueNotNull !== null && currentValueNotNull !== undefined;

        case "event_heart_pickup_full_hp":
            return !!(gameContext.eventFlags && gameContext.eventFlags.heart_pickup_full_hp);

        case "event_player_hp_critical_after_hit":
            return !!(gameContext.eventFlags && gameContext.eventFlags.player_hp_critical_after_hit);

        case "event_ray_hit_boss_after_bounces":
            if (gameContext.eventFlags && gameContext.eventFlags.ray_hit_boss_after_bounces) {
                const eventData = gameContext.eventFlags.ray_hit_boss_after_bounces_data || {};
                return eventData.rayBounces >= conditions.minBounces;
            }
            break;

        case "boss_defeat_condition":
            if (gameContext.eventFlags && gameContext.eventFlags.boss_defeat_no_abilities) {
                const eventData = gameContext.eventFlags.boss_defeat_no_abilities_data || {};
                if (eventData.noAbilitiesUsedFromBossManager !== conditions.noAbilitiesUsed) return false;
                if (eventData.bossTier !== conditions.bossTier) return false;
                if (conditions.bossKey === "any_standard") {
                    const standardKeys = ["chaser", "reflector", "singularity"];
                    return standardKeys.includes(eventData.bossKey);
                } else return conditions.bossKey === eventData.bossKey;
            }
            break;

        case "evo_interaction_depleted_on_screen":
            const resourceKeyForInitial = conditions.resourceStat.replace("Remaining", "");
            if (!(player.hasOwnProperty(conditions.resourceStat))) return false;
            if (!(initialCharges.hasOwnProperty(resourceKeyForInitial))) return false;
            if (!(conditions.maxResourceConstKey in constants)) return false;
            const initialCountForThisScreen = initialCharges[resourceKeyForInitial];
            const currentRunTotalRemaining = player[conditions.resourceStat];
            const maxPossibleForInteraction = constants[conditions.maxResourceConstKey];
            const expectedValueAfterUse = conditions.targetValueAfterUse;
            const usedThisScreen = initialCountForThisScreen - currentRunTotalRemaining;
            return initialCountForThisScreen >= maxPossibleForInteraction &&
                   usedThisScreen === maxPossibleForInteraction &&
                   currentRunTotalRemaining === expectedValueAfterUse;

        case "event_aegis_teleport_impact_kill": // For "Warp Slam"
            if (gameContext.eventFlags && gameContext.eventFlags.event_aegis_teleport_impact_kill) {
                return player.currentPath === conditions.path; 
            }
            return false;

        case "path_ability_specific_count":
            if (player.currentPath === conditions.path) {
                if (conditions.ability === "shieldOvercharge" && conditions.countType === "rays_absorbed_single_activation") {
                    return !!(gameContext.eventFlags && gameContext.eventFlags.shield_siphon_mage);
                }
            }
            break;

        case "path_event_first_time":
             if (player.currentPath === conditions.path) {
                if (conditions.eventName === "passive_collision_damage_boss") {
                    return !!(gameContext.eventFlags && gameContext.eventFlags.aegis_passive_collision_damage_boss);
                }
            }
            break;

        case "event_nexus_weaver_defeated_first_time_run":
            return !!(gameContext.eventFlags && gameContext.eventFlags.nexus_weaver_defeated_first_time_run);
        
        case "event_nexus_weaver_defeated": 
            if (gameContext.eventFlags && gameContext.eventFlags.event_nexus_weaver_defeated) { 
                const eventData = gameContext.eventFlags.event_nexus_weaver_defeated_data || {};
                return eventData.bossTier === conditions.bossTier;
            }
            return false;

        case "event_boss_defeated_flawless":
            return !!(gameContext.eventFlags && gameContext.eventFlags.boss_defeated_flawless);

        case "player_core_evolutions_gte":
            if (player.acquiredEvolutions && Array.isArray(player.acquiredEvolutions)) {
                const coreEvoCount = player.acquiredEvolutions.filter(evo => evo.isTiered === false).length;
                return coreEvoCount >= conditions.value;
            }
            return false;

        case "event_rapid_relocation_success":
            return !!(gameContext.eventFlags && gameContext.eventFlags.rapid_relocation_success);

        case "event_player_well_detonated_mage_min_rays":
            if (player.currentPath === 'mage' && gameContext.eventFlags && gameContext.eventFlags.player_well_detonated) {
                const eventData = gameContext.eventFlags.player_well_detonated_data || {};
                return eventData.launchedRays >= conditions.minRays;
            }
            return false;

        case "event_bloodpact_heal_amount":
            if (player.currentPath === conditions.path && gameContext.eventFlags && gameContext.eventFlags.bloodpact_heal_amount) {
                const eventData = gameContext.eventFlags.bloodpact_heal_amount_data || {};
                return eventData.healedThisActivation >= conditions.minHeal;
            }
            return false;

        case "event_savage_howl_fear_count":
            if (player.currentPath === conditions.path && gameContext.eventFlags && gameContext.eventFlags.savage_howl_fear_count) {
                const eventData = gameContext.eventFlags.savage_howl_fear_count_data || {};
                return eventData.enemiesFeared >= conditions.minFeared;
            }
            return false;

        case "event_momentum_ray_hit_high_damage":
            if (gameContext.eventFlags && gameContext.eventFlags.momentum_ray_hit_high_damage) {
                const eventData = gameContext.eventFlags.momentum_ray_hit_high_damage_data || {};
                let requiredDamage = conditions.minDamage;
                if (achievement.id === "one_shot_wonder_gm") { 
                    requiredDamage = 50; 
                }
                return eventData.damageDealt >= requiredDamage && eventData.momentumBonus > 0;
            }
            return false;

        case "event_nexus_tX_defeated_within_time":
            if (gameContext.eventFlags && gameContext.eventFlags.nexus_tX_defeated_within_time) {
                const eventData = gameContext.eventFlags.nexus_tX_defeated_within_time_data || {};
                return eventData.bossTier === conditions.bossTier && eventData.timeTakenMs <= conditions.timeLimitMs;
            }
            return false;

        case "event_tX_boss_defeated_high_hp":
             if (gameContext.eventFlags && gameContext.eventFlags.tX_boss_defeated_high_hp) {
                const eventData = gameContext.eventFlags.tX_boss_defeated_high_hp_data || {};
                return eventData.bossTier === conditions.bossTier && eventData.playerHpPercent >= conditions.minHpPercent;
            }
            return false;

        case "event_nexus_weaver_defeated_no_abilities_strict":
            return !!(gameContext.eventFlags && gameContext.eventFlags.nexus_weaver_defeated_no_abilities_strict);

        case "event_standard_boss_tX_defeated_no_class_evo":
            if (gameContext.eventFlags && gameContext.eventFlags.standard_boss_tX_defeated_no_class_evo) {
                const eventData = gameContext.eventFlags.standard_boss_tX_defeated_no_class_evo_data || {};
                if (eventData.bossTier === conditions.bossTier && player.acquiredEvolutions && Array.isArray(player.acquiredEvolutions)) {
                    return !player.acquiredEvolutions.some(evo => evo.classType === conditions.excludedClass);
                }
            }
            return false;

        // <<< BUG FIX: This now checks the persistent bossManager set and the player's run-long flawless streak >>>
        case "event_multi_unique_standard_boss_flawless":
             if (bossManager && bossManager.flawlessUniqueStandardBossTypesDefeatedThisRun && player.flawlessStreakActive) {
                return bossManager.flawlessUniqueStandardBossTypesDefeatedThisRun.size >= conditions.count;
            }
            return false;
        
        // <<< BUG FIX: This now checks the persistent bossManager set >>>
        case "event_multi_unique_boss_flawless_any_type":
            if (bossManager && bossManager.flawlessUniqueBossTypesDefeatedThisRun) {
                return bossManager.flawlessUniqueBossTypesDefeatedThisRun.size >= conditions.count;
            }
            return false;

        case "player_unique_legendary_evolutions_gte":
            if (player.acquiredEvolutions && Array.isArray(player.acquiredEvolutions)) {
                const legendaryEvos = player.acquiredEvolutions.filter(evo => evo.isTiered === true && evo.rolledTier === 'legendary');
                const uniqueLegendaryIds = new Set(legendaryEvos.map(evo => evo.id));
                return uniqueLegendaryIds.size >= conditions.value;
            }
            return false;

        case "event_nexus_t3_defeated_no_minions_killed":
            return !!(gameContext.eventFlags && gameContext.eventFlags.nexus_t3_defeated_no_minions_killed);

        case "path_boss_ability_only_kill":
            if (gameContext.eventFlags && gameContext.eventFlags.path_boss_ability_only_kill) {
                const eventData = gameContext.eventFlags.path_boss_ability_only_kill_data || {};
                const sources = eventData.damageSources || {};

                // Basic validation
                if (eventData.bossKey !== conditions.bossKey || eventData.bossTier !== conditions.bossTier) {
                    return false;
                }
                if (conditions.path !== 'any' && player.currentPath !== conditions.path) {
                    return false;
                }

                // Handle "Primary Discipline" Omega achievement
                if (achievement.id === 'primary_discipline_omega') {
                    return sources.primary > 0 &&
                           (sources.omegaLaser || 0) === 0 &&
                           (sources.miniGravityWell || 0) === 0 &&
                           (sources.aegisCharge || 0) === 0 &&
                           (sources.seismicSlam || 0) === 0 &&
                           (sources.aegisPassive || 0) === 0 &&
                           (sources.otherAbility || 0) === 0;
                }

                // Handle other ability-only achievements
                const allowedAbilities = conditions.allowedAbilities || [];
                let totalDamageFromAllowedSources = 0;
                let totalDamageFromOtherSources = 0;

                const damageSourceKeys = ['primary', 'omegaLaser', 'miniGravityWell', 'aegisCharge', 'seismicSlam', 'aegisPassive', 'otherAbility'];
                damageSourceKeys.forEach(key => {
                    if (allowedAbilities.includes(key)) {
                        totalDamageFromAllowedSources += (sources[key] || 0);
                    } else {
                        totalDamageFromOtherSources += (sources[key] || 0);
                    }
                });
                
                return totalDamageFromAllowedSources > 0 && totalDamageFromOtherSources === 0;
            }
            return false;

        case "path_boss_buffed_kill": 
            if (player.currentPath === conditions.path && gameContext.eventFlags && gameContext.eventFlags.path_boss_buffed_kill) {
                const eventData = gameContext.eventFlags.path_boss_buffed_kill_data || {};
                if (eventData.bossKey === conditions.bossKey && eventData.bossTier === conditions.bossTier) {
                    return conditions.requiredBuffs.every(buffName => {
                        if (buffName === "bloodpact") return eventData.bloodpactActive === true;
                        if (buffName === "savageHowl") return eventData.savageHowlActive === true;
                        return false;
                    });
                }
            }
            return false;
        
        case "event_berserker_boss_high_rage_kill": 
            if (player.currentPath === 'berserker' && gameContext.eventFlags && gameContext.eventFlags.event_berserker_boss_high_rage_kill) {
                const eventData = gameContext.eventFlags.event_berserker_boss_high_rage_kill_data || {};
                return eventData.bossKey === conditions.bossKey && 
                       eventData.bossTier === conditions.bossTier &&
                       eventData.maintainedHighRageEntireFight === true; 
            }
            return false;

        case "event_nexus_t3_defeated_no_pickups":
            if (gameContext.eventFlags && gameContext.eventFlags.nexus_t3_defeated_no_pickups) {
                return player.heartsCollectedThisRun === 0 && player.bonusPointsCollectedThisRun === 0;
            }
            return false;

        case "player_stat_duration_gte":
            if (conditions.path && player.currentPath !== conditions.path) return false;
            
            // Check if timer value is sufficient
            if (!player.hasOwnProperty(conditions.stat) || typeof player[conditions.stat] !== 'number' || player[conditions.stat] < conditions.durationMs) {
                return false;
            }

            // If a stat threshold is defined, check it as well
            if (conditions.statThreshold !== undefined) {
                if (conditions.stat === "berserkerRageHighDurationTimer") {
                    if (player.berserkerRagePercentage <= conditions.statThreshold) return false;
                } else if (conditions.stat === "berserkerUnstoppableFuryTimer") {
                     if (player.berserkerRagePercentage < conditions.statThreshold) return false;
                }
            }
            
            return true;

        case "event_kinetic_cascade_mage":
            return !!(gameContext.eventFlags && gameContext.eventFlags.kinetic_cascade_mage);

        case "event_nexus_tX_defeated_flawless_run":
            if (gameContext.eventFlags && gameContext.eventFlags.event_nexus_tX_defeated_flawless_run) {
                const eventData = gameContext.eventFlags.event_nexus_tX_defeated_flawless_run_data || {};
                return eventData.bossTier === conditions.bossTier && player.timesHit === 0;
            }
            return false;

        case "event_nexus_tX_defeated_no_evo_interaction_use":
            if (gameContext.eventFlags && gameContext.eventFlags.event_nexus_tX_defeated_no_evo_interaction_use) {
                const eventData = gameContext.eventFlags.event_nexus_tX_defeated_no_evo_interaction_use_data || {};
                return eventData.bossTier === conditions.bossTier &&
                       !player.rerollsUsedThisRun &&
                       !player.blocksUsedThisRun &&
                       !player.freezesUsedThisRun;
            }
            return false;
        
        case "event_any_standard_boss_tier_X_defeated": 
            if (gameContext.eventFlags && gameContext.eventFlags.event_any_standard_boss_tier_X_defeated) {
                const eventData = gameContext.eventFlags.event_any_standard_boss_tier_X_defeated_data || {};
                return eventData.bossTier >= conditions.minTier;
            }
            return false;

    }
    return false;
}

export function checkAllAchievements(gameContext) {
    if (!processedAchievements || processedAchievements.length === 0) return;
    if (!gameContext || !gameContext.player || !gameContext.GameState) return;
    
    processedAchievements.forEach(achievement => {
        if (!achievement.isUnlocked) {
            if (evaluateCondition(achievement, gameContext)) {
                unlockAchievement(achievement.id, gameContext);
            }
        }
    });

    if (gameContext.eventFlags) {
        const flagsToReset = [
            "heart_pickup_full_hp",
            "player_hp_critical_after_hit",
            "event_aegis_teleport_impact_kill", 
            "shield_siphon_mage",
            "aegis_passive_collision_damage_boss",
            "nexus_weaver_defeated_first_time_run",
            "event_nexus_weaver_defeated", 
            "boss_defeat_no_abilities",
            "ray_hit_boss_after_bounces",
            "boss_defeated_flawless",
            "rapid_relocation_success",
            "player_well_detonated",
            "bloodpact_heal_amount",
            "savage_howl_fear_count",
            "momentum_ray_hit_high_damage",
            "nexus_tX_defeated_within_time",
            "tX_boss_defeated_high_hp",
            "nexus_weaver_defeated_no_abilities_strict",
            "standard_boss_tX_defeated_no_class_evo",
            // DO NOT RESET the multi-boss flags here, as they need to persist
            // "multi_unique_standard_boss_flawless", 
            // "multi_unique_boss_flawless_any_type",
            "nexus_t3_defeated_no_minions_killed", 
            "path_boss_ability_only_kill",
            "path_boss_buffed_kill",
            "event_berserker_boss_high_rage_kill", 
            "nexus_t3_defeated_no_pickups",        
            "kinetic_cascade_mage",    
            "event_nexus_tX_defeated_flawless_run", 
            "event_nexus_tX_defeated_no_evo_interaction_use", 
            "event_any_standard_boss_tier_X_defeated" 
        ];

        flagsToReset.forEach(flagName => {
            if (gameContext.eventFlags.hasOwnProperty(flagName)) {
                gameContext.eventFlags[flagName] = false;
            }
            if (gameContext.eventFlags.hasOwnProperty(flagName + "_data")) {
                delete gameContext.eventFlags[flagName + "_data"];
            }
        });
    }
}

export function resetNewAchievementsThisSession() {
    newAchievementsThisSession.clear();
}