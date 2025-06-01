// js/achievementManager.js
import { allAchievements as achievementDefinitions } from './achievementsData.js';
import * as UIManager from './uiManager.js';
import * as CONSTANTS_MODULE from './constants.js'; // Import all constants for dynamic access

const UNLOCKED_ACHIEVEMENTS_STORAGE_KEY = 'lightBlasterOmega_unlockedAchievements_v1';

let processedAchievements = [];
let newAchievementsThisSession = new Set();

export function initializeAchievements() {
    let unlockedIds = [];
    try {
        const stored = localStorage.getItem(UNLOCKED_ACHIEVEMENTS_STORAGE_KEY);
        if (stored) {
            unlockedIds = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Error parsing unlocked achievements from localStorage:", e);
        unlockedIds = [];
    }

    processedAchievements = achievementDefinitions.map(def => ({
        ...def,
        isUnlocked: unlockedIds.includes(def.id)
    }));
    newAchievementsThisSession.clear();
}

export function isAchievementUnlocked(achievementId) {
    const achievement = processedAchievements.find(ach => ach.id === achievementId);
    return achievement ? achievement.isUnlocked : false;
}

export function getAllAchievementsWithStatus() {
    return processedAchievements.map(ach => ({ ...ach }));
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
            const notificationText = `🏆 Achievement Unlocked: ${achievement.name}!`;
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

    switch (conditions.type) {
        case "player_stat_gte":
            const statPartsGTE = conditions.stat.split('.');
            let currentValueGTE = player;
            for (const part of statPartsGTE) {
                if (currentValueGTE && typeof currentValueGTE === 'object' && part in currentValueGTE) {
                    currentValueGTE = currentValueGTE[part];
                } else { return false; }
            }
            if (typeof currentValueGTE === 'number' || (Array.isArray(currentValueGTE) && conditions.stat.endsWith('.length'))) {
                 let valueToCheckGTE = Array.isArray(currentValueGTE) && conditions.stat.endsWith('.length') ? currentValueGTE.length : currentValueGTE;
                 if (conditions.path && player.currentPath !== conditions.path) return false;
                 return valueToCheckGTE >= conditions.value;
            }
            break;

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

                if (eventData.noAbilitiesUsedFromBossManager !== conditions.noAbilitiesUsed) {
                    return false;
                }
                if (eventData.bossTier !== conditions.bossTier) {
                    return false;
                }
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

            if (initialCountForThisScreen >= maxPossibleForInteraction &&
                usedThisScreen === maxPossibleForInteraction &&
                currentRunTotalRemaining === expectedValueAfterUse) {
                return true;
            }
            break;

        case "event_teleport_kill_target": // <<< NEW
            return !!(gameContext.eventFlags && gameContext.eventFlags.teleport_kill_target);

        case "path_ability_specific_count": // <<< NEW
            if (player.currentPath === conditions.path) {
                if (conditions.ability === "shieldOvercharge" && conditions.countType === "rays_absorbed_single_activation") {
                    return !!(gameContext.eventFlags && gameContext.eventFlags.shield_siphon_mage); // Event flag set by player.js
                }
            }
            break;

        case "path_event_first_time": // <<< NEW
             if (player.currentPath === conditions.path) {
                if (conditions.eventName === "passive_collision_damage_boss") {
                    return !!(gameContext.eventFlags && gameContext.eventFlags.aegis_passive_collision_damage_boss); // Event flag set by player.js
                }
            }
            break;
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

    // Reset one-time event flags after checking all achievements for this frame/event
    if (gameContext.eventFlags) {
        for (const flag in gameContext.eventFlags) {
            // Only reset flags that are simple booleans and not data objects
            if (typeof gameContext.eventFlags[flag] === 'boolean' && !flag.endsWith("_data")) {
                gameContext.eventFlags[flag] = false;
            }
        }
    }
}

export function resetNewAchievementsThisSession() {
    newAchievementsThisSession.clear();
}