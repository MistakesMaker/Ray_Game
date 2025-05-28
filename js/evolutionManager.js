// js/evolutionManager.js
import * as CONSTANTS from './constants.js';
import * as GameState from './gameState.js';
import { getReadableColorName as getReadableColorNameFromUtils } from './utils.js';

let evolutionChoicesMasterList = [];
let _currentlyDisplayedEvolutionOffers = [];
let _isBlockModeActiveManager = false;

let _dependencies = {
    UIManager: null,
    playSound: null,
    onEvolutionCompleteCallback: null,
    audioTargetHitSound: null,
    audioEvolutionSound: null,
    audioUpgradeSound: null,
    updateLastEvolutionScore: null,
    triggerBossSpawnCheck: null,
};


// --- Helper Functions ---
function reduceAllAbilityCooldowns(playerInstance, reductionFactor) {
    if (!playerInstance) return false;
    let reductionApplied = false;
    for (const slot in playerInstance.activeAbilities) {
        if (playerInstance.activeAbilities[slot] && playerInstance.activeAbilities[slot].cooldownTimer > 0) {
            const ability = playerInstance.activeAbilities[slot];
            const currentReductionAmount = ability.cooldownTimer * reductionFactor;
            ability.cooldownTimer -= currentReductionAmount;
            if(ability.cooldownTimer < 0) ability.cooldownTimer = 0;
            reductionApplied = true;
        }
    }
    if (playerInstance.hasOmegaLaser && playerInstance.omegaLaserCooldownTimer > 0) {
        const currentReductionAmount = playerInstance.omegaLaserCooldownTimer * reductionFactor;
        if(currentReductionAmount > 0) {
            playerInstance.omegaLaserCooldownTimer -= currentReductionAmount;
            if(playerInstance.omegaLaserCooldownTimer < 0) playerInstance.omegaLaserCooldownTimer = 0;
            reductionApplied = true;
        }
    }
    if (playerInstance.hasShieldOvercharge && playerInstance.shieldOverchargeCooldownTimer > 0) {
         const currentReductionAmount = playerInstance.shieldOverchargeCooldownTimer * reductionFactor;
         if(currentReductionAmount > 0) {
            playerInstance.shieldOverchargeCooldownTimer -= currentReductionAmount;
            if(playerInstance.shieldOverchargeCooldownTimer < 0) playerInstance.shieldOverchargeCooldownTimer = 0;
            reductionApplied = true;
         }
    }
    if (reductionApplied && _dependencies.UIManager && _dependencies.UIManager.updateAbilityCooldownUI) {
        _dependencies.UIManager.updateAbilityCooldownUI(playerInstance);
    }
    return reductionApplied;
}

function rollTier() {
    const rand = Math.random() * 100;
    if (rand < 5) return 'legendary';
    if (rand < 15) return 'epic';
    if (rand < 50) return 'rare';
    return 'common';
}

export function initializeEvolutionMasterList() {
    const allColors = GameState.getAllPossibleRayColors();
    if (!allColors || allColors.length === 0) {
        console.error("EvolutionManager: Cannot initialize colorImmunity, GameState.getAllPossibleRayColors() is empty or undefined.");
    }
    const maxColorImmunities = allColors ? allColors.length - CONSTANTS.INITIAL_RAY_COLORS.length : 0;

    evolutionChoicesMasterList = [
        {
            id:'colorImmunity', classType: 'tank', text:"Chameleon Plating", level:0,
            maxLevel: maxColorImmunities,
            detailedDescription: "Gain immunity to a new random ray color. Protects against rays of that specific color.",
            isTiered: false,
            isMaxed:function(p){return !p||p.immuneColorsList.length>=GameState.getAllPossibleRayColors().length || this.level >= this.maxLevel;},
            apply:function(playerInstance, dependencies){
                if(!playerInstance)return"";
                const a=GameState.getAllPossibleRayColors().filter(c=>!playerInstance.immuneColorsList.includes(c));
                if(a.length>0){
                    const r=a[Math.floor(Math.random()*a.length)];
                    playerInstance.immuneColorsList.push(r);
                    if (dependencies && dependencies.UIManager && dependencies.UIManager.updateBuffIndicator) {
                        dependencies.UIManager.updateBuffIndicator(playerInstance.immuneColorsList);
                    }
                    return`Now immune to <span style="color:${r};text-shadow:0 0 3px black;font-weight:bold;">${getReadableColorNameFromUtils(r)}</span> rays!`;
                }
                return"No new colors left!";
            },
            getEffectString: function(playerInstance) { return `Immune to ${playerInstance?playerInstance.immuneColorsList.length:0} colors`; },
            getCardEffectString: function(tier, playerInstance) {
                 return `Immune to ${playerInstance ? playerInstance.immuneColorsList.length + 1 : 1} colors`;
            }
        },
        {
            id: 'smallerPlayer', classType: 'tank', text: "Evasive Maneuver", level: 0,
            detailedDescription: "Your effective size from score gain is halved! Growth from score is paused for this evolution cycle. Resumes normally afterwards.",
            isTiered: false,
            isMaxed: function(p) { return GameState.getShrinkMeCooldown() > 0; },
            apply: function(playerInstance){
                if (!playerInstance) return "";
                let effectiveScoreBeforeThisPick = Math.max(0, GameState.getScore() - playerInstance.scoreOffsetForSizing);
                let currentScoreBasedSize = effectiveScoreBeforeThisPick * GameState.getCurrentEffectiveDefaultGrowthFactor();
                let halvedNewScoreBasedSize = currentScoreBasedSize / 2;
                playerInstance.scoreBasedSize = halvedNewScoreBasedSize;
                if (GameState.getCurrentEffectiveDefaultGrowthFactor() > 0) {
                    let newEffectiveScoreToAchieveHalvedSize = halvedNewScoreBasedSize / GameState.getCurrentEffectiveDefaultGrowthFactor();
                    newEffectiveScoreToAchieveHalvedSize = Math.max(0, newEffectiveScoreToAchieveHalvedSize);
                    let scoreValueToDiscard = effectiveScoreBeforeThisPick - newEffectiveScoreToAchieveHalvedSize;
                    playerInstance.scoreOffsetForSizing += scoreValueToDiscard;
                    playerInstance.scoreOffsetForSizing = Math.max(0, playerInstance.scoreOffsetForSizing);
                }
                GameState.setCurrentPlayerRadiusGrowthFactor(0);
                playerInstance.baseRadius = playerInstance.initialBaseRadius + playerInstance.bonusBaseRadius;
                playerInstance.radius = playerInstance.baseRadius + playerInstance.scoreBasedSize;
                playerInstance.radius = Math.max(CONSTANTS.MIN_PLAYER_BASE_RADIUS, playerInstance.radius);
                GameState.setShrinkMeCooldown(3);
                return `Effective size reduced! Growth paused this cycle. (Cooldown: ${GameState.getShrinkMeCooldown()} evos)`;
            },
            getEffectString: function() { return `Effective size reduced (this cycle)!`; },
            getCardEffectString: function() { return `Reduce size, pause growth`; }
        },
        {
            id:'systemOvercharge', classType: 'ability', text:"System Overcharge", level:0, maxLevel: 1,
            detailedDescription: "Reduces the score needed between evolutions by a massive 30% (one-time upgrade).",
            isTiered: false,
            isMaxed: function(p){ return (p && p.evolutionIntervalModifier <= 0.70) || this.level >= this.maxLevel; },
            apply: function(playerInstance){
                if(!playerInstance) return"";
                playerInstance.evolutionIntervalModifier = 0.70;
                return `Evolution interval permanently reduced by 30%! (Now 70%)`;
            },
            getEffectString: function(playerInstance) {
                return `Evo Interval: ${ (playerInstance && playerInstance.evolutionIntervalModifier <= 0.70) ? '70%' : '100%' }`;
            },
            getCardEffectString: function() { return `Evo Interval: 70%`;}
        },
        {
            id:'reinforcedHull', classType: 'tank', text:"Reinforced Hull", level:0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p){ return p && p.damageTakenMultiplier < 0.01; },
            tiers: {
                common:    { description: `Reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.common*100}%. Stacks multiplicatively.`,    apply: function(p) { p.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.common); p.damageTakenMultiplier = Math.max(0.001, p.damageTakenMultiplier); }},
                rare:      { description: `Reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.rare*100}%. Stacks multiplicatively.`,      apply: function(p) { p.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.rare); p.damageTakenMultiplier = Math.max(0.001, p.damageTakenMultiplier); }},
                epic:      { description: `Reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.epic*100}%. Stacks multiplicatively.`,      apply: function(p) { p.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.epic); p.damageTakenMultiplier = Math.max(0.001, p.damageTakenMultiplier); }},
                legendary: { description: `Reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.legendary*100}%. Stacks multiplicatively.`, apply: function(p) { p.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.legendary); p.damageTakenMultiplier = Math.max(0.001, p.damageTakenMultiplier); }}
            },
            getEffectString: function(playerInstance) {
                const reductionPercent = playerInstance ? (1 - playerInstance.damageTakenMultiplier) * 100 : 0;
                return `${reductionPercent.toFixed(1)}% Total Dmg Reduction`;
            },
            getCardEffectString: function(tier) {
                return `Reduce Dmg by ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS[tier]*100}%`;
            }
        },
        {
            id:'vitalitySurge', classType: 'tank', text:"Vitality Surge", level:0, maxLevel: 999,
            isTiered: true,
            isMaxed:function(p){return false;},
            tiers: {
                common:    { description: `Increases HP regen by ${CONSTANTS.VITALITY_SURGE_TIER_BONUS.common} HP/tick.`, apply: function(p) { p.hpRegenBonusFromEvolution += CONSTANTS.VITALITY_SURGE_TIER_BONUS.common; }},
                rare:      { description: `Increases HP regen by ${CONSTANTS.VITALITY_SURGE_TIER_BONUS.rare} HP/tick.`, apply: function(p) { p.hpRegenBonusFromEvolution += CONSTANTS.VITALITY_SURGE_TIER_BONUS.rare; }},
                epic:      { description: `Increases HP regen by ${CONSTANTS.VITALITY_SURGE_TIER_BONUS.epic} HP/tick.`, apply: function(p) { p.hpRegenBonusFromEvolution += CONSTANTS.VITALITY_SURGE_TIER_BONUS.epic; }},
                legendary: { description: `Increases HP regen by ${CONSTANTS.VITALITY_SURGE_TIER_BONUS.legendary} HP/tick.`, apply: function(p) { p.hpRegenBonusFromEvolution += CONSTANTS.VITALITY_SURGE_TIER_BONUS.legendary; }}
            },
            getEffectString: function(playerInstance) { return `Total +${(playerInstance?playerInstance.hpRegenBonusFromEvolution:0).toFixed(1)} HP/tick Regen`; },
            getCardEffectString: function(tier) { return `+${CONSTANTS.VITALITY_SURGE_TIER_BONUS[tier].toFixed(1)} HP/tick Regen`; }
        },
        {
            id: 'maxHpIncrease', classType: 'tank', text: "Fortified Core", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS.common}.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.common; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.common, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                rare:      { description: `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS.rare}.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.rare; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.rare, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                epic:      { description: `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS.epic}.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.epic; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.epic, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                legendary: { description: `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS.legendary}.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.legendary; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.legendary, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }}
            },
            getEffectString: function(playerInstance) { return `Current Max HP: ${playerInstance ? playerInstance.maxHp : CONSTANTS.PLAYER_MAX_HP}`; },
            getCardEffectString: function(tier) { return `+${CONSTANTS.FORTIFIED_CORE_TIER_BONUS[tier]} Max HP`;}
        },
        {
            id:'focusedBeam', classType: 'attack', text:"Focused Beam", level:0, maxLevel: 999 ,
            isTiered: true,
            isMaxed:function(p){return false;},
            tiers: {
                common:    { description: `Increases ray damage by ${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.common}.`, apply: function(p) { p.rayDamageBonus += CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.common; }},
                rare:      { description: `Increases ray damage by ${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.rare}.`, apply: function(p) { p.rayDamageBonus += CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.rare; }},
                epic:      { description: `Increases ray damage by ${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.epic}.`, apply: function(p) { p.rayDamageBonus += CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.epic; }},
                legendary: { description: `Increases ray damage by ${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.legendary}.`, apply: function(p) { p.rayDamageBonus += CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.legendary; }}
            },
            getEffectString: function(playerInstance) { return `Total +${(playerInstance?playerInstance.rayDamageBonus:0).toFixed(1)} Ray Damage`;},
            getCardEffectString: function(tier) { return `+${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE[tier].toFixed(1)} Ray Damage`;}
        },
        {
            id: 'unstableCore', classType: 'attack', text: "Unstable Core", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return p && p.chainReactionChance >= 1.0; },
            tiers: {
                common:    { description: `Increases AOE chance by ${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.common}%.`,   apply: function(p) { p.chainReactionChance = Math.min(1.0, p.chainReactionChance + CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.common / 100); }},
                rare:      { description: `Increases AOE chance by ${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.rare}%.`,     apply: function(p) { p.chainReactionChance = Math.min(1.0, p.chainReactionChance + CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.rare / 100); }},
                epic:      { description: `Increases AOE chance by ${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.epic}%.`,     apply: function(p) { p.chainReactionChance = Math.min(1.0, p.chainReactionChance + CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.epic / 100); }},
                legendary: { description: `Increases AOE chance by ${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.legendary}%.`, apply: function(p) { p.chainReactionChance = Math.min(1.0, p.chainReactionChance + CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.legendary / 100); }}
            },
            getEffectString: function(playerInstance) { return `Total ${Math.round((playerInstance ? playerInstance.chainReactionChance : 0) * 100)}% AOE Chance`; },
            getCardEffectString: function(tier) { return `+${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE[tier]}% AOE Chance`;}
        },
        {
            id: 'rayCritChance', classType: 'attack', text: "Critical Array", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return p && (p.rayCritChance !== undefined ? p.rayCritChance >= 1.0 : false); },
            tiers: {
                common:    { description: `Increases ray critical hit chance by ${CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.common*100}%.`, apply: function(p) { p.rayCritChance = Math.min(1.0, (p.rayCritChance || 0) + CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.common); }},
                rare:      { description: `Increases ray critical hit chance by ${CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.rare*100}%.`,   apply: function(p) { p.rayCritChance = Math.min(1.0, (p.rayCritChance || 0) + CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.rare);   }},
                epic:      { description: `Increases ray critical hit chance by ${CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.epic*100}%.`,   apply: function(p) { p.rayCritChance = Math.min(1.0, (p.rayCritChance || 0) + CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.epic);   }},
                legendary: { description: `Increases ray critical hit chance by ${CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.legendary*100}%.`,apply: function(p) { p.rayCritChance = Math.min(1.0, (p.rayCritChance || 0) + CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.legendary);}}
            },
            getEffectString: function(p) { return `Total ${( (p && p.rayCritChance !== undefined ? p.rayCritChance:0) * 100).toFixed(0)}% Ray Crit Chance`; },
            getCardEffectString: function(tier) { return `+${(CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS[tier]*100).toFixed(0)}% Ray Crit Chance`;}
        },
        {
            id: 'rayCritDamage', classType: 'attack', text: "Amplified Output", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: `Increases ray critical damage multiplier by +${CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.common*100}%.`, apply: function(p) { p.rayCritDamageMultiplier = (p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier : 1.5) + CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.common; }},
                rare:      { description: `Increases ray critical damage multiplier by +${CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.rare*100}%.`,   apply: function(p) { p.rayCritDamageMultiplier = (p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier : 1.5) + CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.rare;   }},
                epic:      { description: `Increases ray critical damage multiplier by +${CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.epic*100}%.`,   apply: function(p) { p.rayCritDamageMultiplier = (p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier : 1.5) + CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.epic;   }},
                legendary: { description: `Increases ray critical damage multiplier by +${CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.legendary*100}%.`,apply: function(p) { p.rayCritDamageMultiplier = (p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier : 1.5) + CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.legendary;}}
            },
            getEffectString: function(p) { return `Total x${(p && p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier:1.5).toFixed(2)} Ray Crit Damage`; },
            getCardEffectString: function(tier) { return `+${(CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS[tier]*100).toFixed(0)}% Ray Crit Damage`;}
        },
        {
            id: 'kineticConversion', classType: 'ability', text: "Kinetic Conversion", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: "Increases Kinetic Conversion level. Standard per-level scaling for charge rate and damage potential.", apply: function(p) { p.kineticConversionLevel++; p.effectiveKineticChargeRatePerLevel = Math.max(p.effectiveKineticChargeRatePerLevel, CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL + CONSTANTS.KINETIC_CONVERSION_TIER_SCALING.common.rateBonus); p.effectiveKineticAdditionalDamageBonusPerLevel = Math.max(p.effectiveKineticAdditionalDamageBonusPerLevel, CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL + CONSTANTS.KINETIC_CONVERSION_TIER_SCALING.common.dmgBonus); }},
                rare:      { description: "Increases Kinetic Conversion level. Slightly enhances its per-level scaling.", apply: function(p) { p.kineticConversionLevel++; p.effectiveKineticChargeRatePerLevel = Math.max(p.effectiveKineticChargeRatePerLevel, CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL + CONSTANTS.KINETIC_CONVERSION_TIER_SCALING.rare.rateBonus); p.effectiveKineticAdditionalDamageBonusPerLevel = Math.max(p.effectiveKineticAdditionalDamageBonusPerLevel, CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL + CONSTANTS.KINETIC_CONVERSION_TIER_SCALING.rare.dmgBonus); }},
                epic:      { description: "Increases Kinetic Conversion level. Moderately enhances its per-level scaling.", apply: function(p) { p.kineticConversionLevel++; p.effectiveKineticChargeRatePerLevel = Math.max(p.effectiveKineticChargeRatePerLevel, CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL + CONSTANTS.KINETIC_CONVERSION_TIER_SCALING.epic.rateBonus); p.effectiveKineticAdditionalDamageBonusPerLevel = Math.max(p.effectiveKineticAdditionalDamageBonusPerLevel, CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL + CONSTANTS.KINETIC_CONVERSION_TIER_SCALING.epic.dmgBonus); }},
                legendary: { description: "Increases Kinetic Conversion level. Greatly enhances its per-level scaling.", apply: function(p) { p.kineticConversionLevel++; p.effectiveKineticChargeRatePerLevel = Math.max(p.effectiveKineticChargeRatePerLevel, CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL + CONSTANTS.KINETIC_CONVERSION_TIER_SCALING.legendary.rateBonus); p.effectiveKineticAdditionalDamageBonusPerLevel = Math.max(p.effectiveKineticAdditionalDamageBonusPerLevel, CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL + CONSTANTS.KINETIC_CONVERSION_TIER_SCALING.legendary.dmgBonus); }}
            },
            getEffectString: function(playerInstance) {
                const KCL = playerInstance.kineticConversionLevel || 0;
                const maxPotencyBonus = playerInstance.initialKineticDamageBonus + (Math.max(0, KCL - 1) * playerInstance.effectiveKineticAdditionalDamageBonusPerLevel);
                const chargeRate = playerInstance.baseKineticChargeRate + (KCL * playerInstance.effectiveKineticChargeRatePerLevel);
                if (KCL > 0) {
                    return `Lvl ${KCL}: Max Dmg +${(maxPotencyBonus * 100).toFixed(0)}%, Rate ${chargeRate.toFixed(2)}/s`;
                }
                const previewRate = playerInstance.baseKineticChargeRate + (1 * (playerInstance.effectiveKineticChargeRatePerLevel || CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL));
                const previewDmg = playerInstance.initialKineticDamageBonus;
                return `Next Lvl Max Dmg: +${(previewDmg * 100).toFixed(0)}%, Rate: ${previewRate.toFixed(2)}/s`;
            },
            getCardEffectString: function(tier) {
                 const rateBonusPercent = (CONSTANTS.KINETIC_CONVERSION_TIER_SCALING[tier]?.rateBonus || 0) * 100;
                 const dmgBonusPercent = (CONSTANTS.KINETIC_CONVERSION_TIER_SCALING[tier]?.dmgBonus || 0) * 100;
                 return `Tier Bonus: +${rateBonusPercent.toFixed(0)}% Rate, +${dmgBonusPercent.toFixed(0)}% Dmg`;
            }
        },
        {
            id: 'temporalEcho', classType: 'ability', text: "Temporal Echo", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return p && p.temporalEchoChance >= 1.0; },
            tiers: {
                common:    { description: `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.common}%.`,   apply: function(p) { p.temporalEchoChance = Math.min(1.0, p.temporalEchoChance + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.common / 100); }},
                rare:      { description: `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.rare}%.`,     apply: function(p) { p.temporalEchoChance = Math.min(1.0, p.temporalEchoChance + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.rare / 100); }},
                epic:      { description: `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.epic}%.`,     apply: function(p) { p.temporalEchoChance = Math.min(1.0, p.temporalEchoChance + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.epic / 100); }},
                legendary: { description: `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.legendary}%.`, apply: function(p) { p.temporalEchoChance = Math.min(1.0, p.temporalEchoChance + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.legendary / 100); }}
            },
            getEffectString: function(playerInstance) { return `Total Echo Chance: ${Math.round((playerInstance ? playerInstance.temporalEchoChance : 0) * 100)}%`; },
            getCardEffectString: function(tier) { return `+${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[tier]}% Echo Chance`;}
        },
        {
            id: 'streamlinedSystems', classType: 'ability', text: "Streamlined Systems", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: `Reduces current ability cooldowns by ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.common}%.`, apply: function(p) { reduceAllAbilityCooldowns(p, CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.common / 100); }},
                rare:      { description: `Reduces current ability cooldowns by ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.rare}%.`, apply: function(p) { reduceAllAbilityCooldowns(p, CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.rare / 100); }},
                epic:      { description: `Reduces current ability cooldowns by ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.epic}%.`, apply: function(p) { reduceAllAbilityCooldowns(p, CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.epic / 100); }},
                legendary: { description: `Reduces current ability cooldowns by ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.legendary}%.`, apply: function(p) { reduceAllAbilityCooldowns(p, CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.legendary / 100); }}
            },
            getEffectString: function(playerInstance, currentChoiceLevel) { return `Applied ${currentChoiceLevel || 0} time(s)`; },
            getCardEffectString: function(tier) { return `Reduce current CDs by ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[tier]}%`; }
        },
        {
            id: 'abilityPotency', classType: 'ability', text: "Empowered Abilities", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: `Multiplies ability damage by ${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.common.toFixed(2)}x.`, apply: function(p) { p.abilityDamageMultiplier *= CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.common; }},
                rare:      { description: `Multiplies ability damage by ${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.rare.toFixed(2)}x.`, apply: function(p) { p.abilityDamageMultiplier *= CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.rare; }},
                epic:      { description: `Multiplies ability damage by ${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.epic.toFixed(2)}x.`, apply: function(p) { p.abilityDamageMultiplier *= CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.epic; }},
                legendary: { description: `Multiplies ability damage by ${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.legendary.toFixed(2)}x.`, apply: function(p) { p.abilityDamageMultiplier *= CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.legendary; }}
            },
            getEffectString: function(playerInstance) { return `Total Ability Dmg: ${Math.round((playerInstance ? playerInstance.abilityDamageMultiplier : 1) * 100)}%`; },
            getCardEffectString: function(tier) { return `Ability Dmg x${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER[tier].toFixed(2)}`;}
        },
        {
            id: 'abilityCritChance', classType: 'ability', text: "Unstable Energies", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return p && (p.abilityCritChance !== undefined ? p.abilityCritChance >= 1.0 : false); },
            tiers: {
                common:    { description: `Increases ability critical hit chance by ${CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.common*100}%.`, apply: function(p) { p.abilityCritChance = Math.min(1.0, (p.abilityCritChance || 0) + CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.common); }},
                rare:      { description: `Increases ability critical hit chance by ${CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.rare*100}%.`,   apply: function(p) { p.abilityCritChance = Math.min(1.0, (p.abilityCritChance || 0) + CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.rare);   }},
                epic:      { description: `Increases ability critical hit chance by ${CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.epic*100}%.`,   apply: function(p) { p.abilityCritChance = Math.min(1.0, (p.abilityCritChance || 0) + CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.epic);   }},
                legendary: { description: `Increases ability critical hit chance by ${CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.legendary*100}%.`,apply: function(p) { p.abilityCritChance = Math.min(1.0, (p.abilityCritChance || 0) + CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.legendary);}}
            },
            getEffectString: function(p) { return `Total ${( (p && p.abilityCritChance !== undefined ? p.abilityCritChance:0) * 100).toFixed(0)}% Ability Crit Chance`; },
            getCardEffectString: function(tier) { return `+${(CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS[tier]*100).toFixed(0)}% Ability Crit Chance`;}
        },
        {
            id: 'abilityCritDamage', classType: 'ability', text: "Focused Overload", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: `Increases ability critical damage multiplier by +${CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.common*100}%.`, apply: function(p) { p.abilityCritDamageMultiplier = (p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier : 1.5) + CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.common; }},
                rare:      { description: `Increases ability critical damage multiplier by +${CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.rare*100}%.`,   apply: function(p) { p.abilityCritDamageMultiplier = (p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier : 1.5) + CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.rare;   }},
                epic:      { description: `Increases ability critical damage multiplier by +${CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.epic*100}%.`,   apply: function(p) { p.abilityCritDamageMultiplier = (p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier : 1.5) + CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.epic;   }},
                legendary: { description: `Increases ability critical damage multiplier by +${CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.legendary*100}%.`,apply: function(p) { p.abilityCritDamageMultiplier = (p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier : 1.5) + CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.legendary;}}
            },
            getEffectString: function(p) { return `Total x${(p && p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier:1.5).toFixed(2)} Ability Crit Dmg`; },
            getCardEffectString: function(tier) { return `+${(CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS[tier]*100).toFixed(0)}% Ability Crit Dmg`;}
        }
    ];
}

export function resetEvolutionLevels() {
    evolutionChoicesMasterList.forEach(evo => evo.level = 0);
}

export function getEvolutionMasterList() {
    return JSON.parse(JSON.stringify(evolutionChoicesMasterList));
}

export function generateEvolutionOffers(playerInstance) {
    if (!playerInstance) {
        console.error("EvolutionManager.generateEvolutionOffers: playerInstance is undefined.");
        return [null, null, null].map((_, i) => ({
            baseId: `empty_slot_${i}_error`, classType: 'ability', text:"Error", rolledTier: null,
            detailedDescription: "Player data unavailable.", applyEffect: ()=>{},
            cardEffectString: "Error", originalEvolution: { id: `empty_slot_${i}_error`, isMaxed: ()=>true, isTiered: false }
        }));
    }

    let offers = [null, null, null];
    let offeredBaseIds = []; // Keeps track of baseIds already offered in *this specific set of 3*
    let filledIndices = [false, false, false]; // To know which slots are filled

    // 1. Handle globally frozen/held choice first
    if (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData && playerInstance.frozenEvolutionChoice.originalIndex !== undefined) {
        const frozenSnapshot = playerInstance.frozenEvolutionChoice.choiceData;
        const originalMasterEvo = evolutionChoicesMasterList.find(e => e.id === frozenSnapshot.baseId);
        let isValidAndReconstructable = false;

        if (originalMasterEvo) {
            const isMaxed = originalMasterEvo.isMaxed ? originalMasterEvo.isMaxed(playerInstance) : false;
            // For a held card, we don't check if it's in blockedEvolutionIds *again* here,
            // because it wouldn't have been allowed to be frozen if it was already blocked.
            // If it got blocked *after* being frozen, the block action should clear the freeze.
            if (!isMaxed) { // Still check if it became maxed since it was frozen
                isValidAndReconstructable = true;
            }
        }

        if (isValidAndReconstructable) {
            let reconstructedHeldOffer = {
                baseId: originalMasterEvo.id,
                classType: originalMasterEvo.classType,
                text: originalMasterEvo.text,
                originalEvolution: originalMasterEvo,
                wasGloballyFrozen: true // Indicate this was the held card (for UI styling if needed, e.g., no "icy" border)
            };

            if (originalMasterEvo.isTiered) {
                const heldTier = frozenSnapshot.rolledTier; // Use the tier from the held snapshot
                if (heldTier && originalMasterEvo.tiers[heldTier]) {
                    const tierSpecificData = originalMasterEvo.tiers[heldTier];
                    reconstructedHeldOffer.rolledTier = heldTier;
                    reconstructedHeldOffer.detailedDescription = tierSpecificData.description;
                    reconstructedHeldOffer.applyEffect = tierSpecificData.apply;
                    reconstructedHeldOffer.cardEffectString = (typeof originalMasterEvo.getCardEffectString === 'function')
                                                                ? originalMasterEvo.getCardEffectString(heldTier, playerInstance)
                                                                : 'Effect details vary';
                } else {
                    isValidAndReconstructable = false; // Tier data inconsistency
                }
            } else { // Not tiered
                reconstructedHeldOffer.rolledTier = null;
                reconstructedHeldOffer.detailedDescription = originalMasterEvo.detailedDescription;
                reconstructedHeldOffer.applyEffect = originalMasterEvo.apply;
                reconstructedHeldOffer.cardEffectString = (typeof originalMasterEvo.getCardEffectString === 'function')
                                                            ? originalMasterEvo.getCardEffectString(null, playerInstance)
                                                            : (originalMasterEvo.getEffectString ? originalMasterEvo.getEffectString(playerInstance, originalMasterEvo.level) : 'Effect details vary');
            }

            if (isValidAndReconstructable) {
                const targetIndex = playerInstance.frozenEvolutionChoice.originalIndex;
                if (targetIndex >= 0 && targetIndex < 3) {
                    offers[targetIndex] = reconstructedHeldOffer;
                    offeredBaseIds.push(reconstructedHeldOffer.baseId);
                    filledIndices[targetIndex] = true;
                } else {
                     console.warn("EvolutionManager: Held choice had invalid originalIndex:", targetIndex, "Clearing hold.");
                     playerInstance.frozenEvolutionChoice = null; // Clear invalid hold
                }
            } else {
                 console.warn("EvolutionManager: Held choice", originalMasterEvo.id, "became invalid (e.g., maxed). Clearing hold.");
                 playerInstance.frozenEvolutionChoice = null; // Clear invalid hold
            }
        } else {
            // If the frozen choice became invalid (e.g., maxed out or somehow blocked externally)
            playerInstance.frozenEvolutionChoice = null;
        }
    }

    // 2. Fill remaining slots
    const slotsToFill = 3 - offers.filter(o => o !== null).length;
    if (slotsToFill > 0) {
        const exclusionList = [...playerInstance.blockedEvolutionIds, ...offeredBaseIds];
        const availableChoices = evolutionChoicesMasterList.filter(c => {
            if (exclusionList.includes(c.id)) return false;
            return !(c.isMaxed && c.isMaxed(playerInstance));
        });

        let shuffledAvailable = [...availableChoices].sort(() => 0.5 - Math.random());

        for (let i = 0; i < 3; i++) {
            if (!filledIndices[i]) { // If this slot wasn't filled by the held choice
                if (shuffledAvailable.length > 0) {
                    const baseEvo = shuffledAvailable.shift();
                    let rolledTierIfApplicable = baseEvo.isTiered ? rollTier() : 'common';
                    const tierSpecificData = baseEvo.isTiered ? baseEvo.tiers[rolledTierIfApplicable] : baseEvo;

                    const offer = {
                        baseId: baseEvo.id,
                        classType: baseEvo.classType,
                        rolledTier: baseEvo.isTiered ? rolledTierIfApplicable : null,
                        text: baseEvo.text,
                        detailedDescription: baseEvo.isTiered && tierSpecificData ? tierSpecificData.description : baseEvo.detailedDescription,
                        applyEffect: baseEvo.isTiered && tierSpecificData ? tierSpecificData.apply : baseEvo.apply,
                        cardEffectString: (typeof baseEvo.getCardEffectString === 'function')
                            ? baseEvo.getCardEffectString(rolledTierIfApplicable, playerInstance)
                            : (baseEvo.getEffectString ? baseEvo.getEffectString(playerInstance, baseEvo.level) : 'Effect details vary'),
                        originalEvolution: baseEvo
                    };
                    offers[i] = offer;
                    offeredBaseIds.push(offer.baseId); // Add to offered IDs to prevent duplication in *this set*
                    filledIndices[i] = true;
                } else {
                    offers[i] = {
                        baseId: `empty_slot_${i}`, classType: 'ability', text:"No More Options", rolledTier: null,
                        detailedDescription: "No further upgrades available or other slots took priority.", applyEffect: ()=>{},
                        cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_${i}`, isMaxed: ()=>true, isTiered: false }
                    };
                    filledIndices[i] = true;
                }
            }
        }
    }

    // Fallback for empty slots if logic above somehow fails to fill all
    if (offers.every(o => o === null || o.baseId.startsWith('empty_slot_') || o.baseId === 'noMoreEvolutions')) {
         offers[0] = {
            baseId: 'noMoreEvolutions', classType: 'ability',
            text:"All evolutions maxed or no valid options!", rolledTier: null,
            detailedDescription: "No further upgrades available at this time.",
            applyEffect:()=>"No more evolutions!", cardEffectString: "Unavailable",
            originalEvolution: {id:'noMoreEvolutions', isMaxed:()=>true, isTiered: false}
        };
        if(!offers[1]) offers[1] = { baseId: `empty_slot_1`, classType: 'ability', text:"No More Options", rolledTier: null, detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_1`, isMaxed: ()=>true, isTiered: false }};
        if(!offers[2]) offers[2] = { baseId: `empty_slot_2`, classType: 'ability', text:"No More Options", rolledTier: null, detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_2`, isMaxed: ()=>true, isTiered: false }};
    }
    for(let i=0; i < 3; i++) {
        if (offers[i] === null) {
            offers[i] = { baseId: `empty_slot_${i}_fallback`, classType: 'ability', text:"No More Options", rolledTier: null, detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_${i}_fallback`, isMaxed: ()=>true, isTiered: false }};
        }
    }

    _currentlyDisplayedEvolutionOffers = [...offers];
    return offers;
}

export function getCurrentlyDisplayedOffers() {
    return _currentlyDisplayedEvolutionOffers;
}


export function presentEvolutionUI(playerInstance, dependencies) {
    if (!playerInstance || !dependencies || !dependencies.UIManager || !dependencies.playSound || !dependencies.onEvolutionCompleteCallback) {
        console.error("EvolutionManager.presentEvolutionUI: Missing playerInstance or critical dependencies.", {playerInstance, dependencies});
        if (dependencies && dependencies.onEvolutionCompleteCallback) dependencies.onEvolutionCompleteCallback(null);
        return;
    }

    _dependencies = dependencies;

    if (GameState.getShrinkMeCooldown() > 0) GameState.decrementShrinkMeCooldown();
    _dependencies.playSound(_dependencies.audioEvolutionSound);

    playerInstance.isFreezeModeActive = false;
    _isBlockModeActiveManager = false;
    playerInstance.isBlockModeActive = false;

    const offers = generateEvolutionOffers(playerInstance);

    _dependencies.UIManager.populateEvolutionOptionsUI(
        offers,
        playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance)
    );
}


function handleEvolutionReRoll(playerInstance) {
    if (!playerInstance || playerInstance.evolutionReRollsRemaining <= 0 || playerInstance.isFreezeModeActive || _isBlockModeActiveManager) {
        if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
        return;
    }
    playerInstance.evolutionReRollsRemaining--;
    if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioEvolutionSound);

    playerInstance.frozenEvolutionChoice = null;
    playerInstance.hasUsedFreezeForCurrentOffers = false;

    const newOffers = generateEvolutionOffers(playerInstance);
    _dependencies.UIManager.populateEvolutionOptionsUI(
        newOffers, playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance)
    );
}

function toggleBlockMode(playerInstance) {
    if (!playerInstance || playerInstance.isFreezeModeActive) {
        if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
        return;
    }
    if (_isBlockModeActiveManager) {
        _isBlockModeActiveManager = false;
        playerInstance.isBlockModeActive = false;
    } else {
        if (playerInstance.evolutionBlocksRemaining > 0) {
            _isBlockModeActiveManager = true;
            playerInstance.isBlockModeActive = true;
        } else {
            if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
            return;
        }
    }
    if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioUpgradeSound);
    _dependencies.UIManager.populateEvolutionOptionsUI(
        _currentlyDisplayedEvolutionOffers, playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance)
    );
}

function toggleFreezeMode(playerInstance) {
    if (!playerInstance || _isBlockModeActiveManager) {
        if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
        return;
    }
    if (playerInstance.isFreezeModeActive) {
        playerInstance.isFreezeModeActive = false;
    } else {
        if (playerInstance.evolutionFreezesRemaining > 0 || playerInstance.frozenEvolutionChoice) {
            playerInstance.isFreezeModeActive = true;
        } else {
            if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
            return;
        }
    }
    if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioUpgradeSound);
    _dependencies.UIManager.populateEvolutionOptionsUI(
        _currentlyDisplayedEvolutionOffers, playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance)
    );
}

function handleFreezeSelection(uiSelectedChoiceToFreeze, indexOfCardInOffer, playerInstance) {
    if (!playerInstance || !GameState.isGamePausedForEvolution() || !playerInstance.isFreezeModeActive) return;

    if (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData.baseId === uiSelectedChoiceToFreeze.baseId) {
        playerInstance.frozenEvolutionChoice = null;
        playerInstance.evolutionFreezesRemaining++;
        playerInstance.hasUsedFreezeForCurrentOffers = false;
        if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioUpgradeSound);
    } else if (playerInstance.evolutionFreezesRemaining > 0 || playerInstance.frozenEvolutionChoice) {
        if (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData.baseId !== uiSelectedChoiceToFreeze.baseId) {
            playerInstance.frozenEvolutionChoice = null;
            playerInstance.evolutionFreezesRemaining++;
        }
        if (playerInstance.evolutionFreezesRemaining > 0) {
            playerInstance.evolutionFreezesRemaining--;
            playerInstance.frozenEvolutionChoice = {
                choiceData: JSON.parse(JSON.stringify(uiSelectedChoiceToFreeze)),
                originalIndex: indexOfCardInOffer
            };
            playerInstance.hasUsedFreezeForCurrentOffers = true;
            if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioEvolutionSound);
        } else {
             if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
        }
    }
    else {
        if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
    }

    playerInstance.isFreezeModeActive = false;
    _dependencies.UIManager.populateEvolutionOptionsUI(
        _currentlyDisplayedEvolutionOffers, playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance)
    );
}

function handleBlockActionOnCard(baseIdToBlock, playerInstance) {
    if (!playerInstance || playerInstance.evolutionBlocksRemaining <= 0) {
        if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
        _isBlockModeActiveManager = false; playerInstance.isBlockModeActive = false;
        // No full UI refresh here, just turn off block mode.
        _dependencies.UIManager.populateEvolutionOptionsUI(
            _currentlyDisplayedEvolutionOffers, playerInstance,
            (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
            () => handleEvolutionReRoll(playerInstance), () => toggleBlockMode(playerInstance),
            GameState.getShrinkMeCooldown(), () => toggleFreezeMode(playerInstance),
            (choice, index) => handleFreezeSelection(choice, index, playerInstance)
        );
        return;
    }

    if (playerInstance.blockedEvolutionIds.includes(baseIdToBlock)) { // Should not happen if UI is correct
        _isBlockModeActiveManager = false; playerInstance.isBlockModeActive = false;
        _dependencies.UIManager.populateEvolutionOptionsUI(
            _currentlyDisplayedEvolutionOffers, playerInstance,
            (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
            () => handleEvolutionReRoll(playerInstance), () => toggleBlockMode(playerInstance),
            GameState.getShrinkMeCooldown(), () => toggleFreezeMode(playerInstance),
            (choice, index) => handleFreezeSelection(choice, index, playerInstance)
        );
        return;
    }

    playerInstance.blockedEvolutionIds.push(baseIdToBlock);
    playerInstance.evolutionBlocksRemaining--;
    _isBlockModeActiveManager = false; playerInstance.isBlockModeActive = false;
    if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioUpgradeSound);

    // If the blocked card was the globally frozen/held one, clear the hold.
    if (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData.baseId === baseIdToBlock) {
        playerInstance.frozenEvolutionChoice = null;
        // No freeze charge refund here, the block action consumes the slot.
    }

    // Find the index of the card that was just blocked
    const blockedCardIndex = _currentlyDisplayedEvolutionOffers.findIndex(offer => offer.baseId === baseIdToBlock);

    if (blockedCardIndex !== -1) {
        // Generate a *single* new offer to replace the blocked one.
        // Ensure this new offer is not already present in other slots and not blocked.
        const currentOfferIds = _currentlyDisplayedEvolutionOffers
            .filter((_, idx) => idx !== blockedCardIndex) // Exclude the slot being replaced
            .map(offer => offer.baseId);
        const exclusionListForNewCard = [...playerInstance.blockedEvolutionIds, ...currentOfferIds];
         if (playerInstance.frozenEvolutionChoice) { // Also exclude the currently held card if it's not the one being replaced
            if (_currentlyDisplayedEvolutionOffers[blockedCardIndex]?.baseId !== playerInstance.frozenEvolutionChoice.choiceData.baseId) {
                 exclusionListForNewCard.push(playerInstance.frozenEvolutionChoice.choiceData.baseId);
            }
        }


        const availableChoicesForSlot = evolutionChoicesMasterList.filter(c => {
            if (exclusionListForNewCard.includes(c.id)) return false;
            return !(c.isMaxed && c.isMaxed(playerInstance));
        });

        let newOfferForSlot;
        if (availableChoicesForSlot.length > 0) {
            const baseEvo = availableChoicesForSlot[Math.floor(Math.random() * availableChoicesForSlot.length)];
            const rolledTierIfApplicable = baseEvo.isTiered ? rollTier() : 'common';
            const tierSpecificData = baseEvo.isTiered ? baseEvo.tiers[rolledTierIfApplicable] : baseEvo;
            newOfferForSlot = {
                baseId: baseEvo.id, classType: baseEvo.classType,
                rolledTier: baseEvo.isTiered ? rolledTierIfApplicable : null,
                text: baseEvo.text,
                detailedDescription: baseEvo.isTiered && tierSpecificData ? tierSpecificData.description : baseEvo.detailedDescription,
                applyEffect: baseEvo.isTiered && tierSpecificData ? tierSpecificData.apply : baseEvo.apply,
                cardEffectString: (typeof baseEvo.getCardEffectString === 'function')
                    ? baseEvo.getCardEffectString(rolledTierIfApplicable, playerInstance)
                    : (baseEvo.getEffectString ? baseEvo.getEffectString(playerInstance, baseEvo.level) : 'Effect details vary'),
                originalEvolution: baseEvo
            };
        } else {
            newOfferForSlot = {
                baseId: `empty_slot_blocked_${blockedCardIndex}`, classType: 'ability', text:"No More Options", rolledTier: null,
                detailedDescription: "No further upgrades available for this slot.", applyEffect: ()=>{},
                cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_blocked_${blockedCardIndex}`, isMaxed: ()=>true, isTiered: false }
            };
        }
        _currentlyDisplayedEvolutionOffers[blockedCardIndex] = newOfferForSlot;
    }

    // Refresh UI with the (mostly) same offers, but one slot updated.
    _dependencies.UIManager.populateEvolutionOptionsUI(
        _currentlyDisplayedEvolutionOffers, playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance), () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(), () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance)
    );
}


function confirmEvolutionChoice(uiSelectedChoice, indexOfCardInOffer, playerInstance) {
    if (!playerInstance) { console.error("Player not defined for confirmEvolutionChoice"); return; }
    if (!_dependencies || !_dependencies.UIManager || !_dependencies.onEvolutionCompleteCallback) {
        console.error("Dependencies missing for confirmEvolutionChoice");
        if (_dependencies && _dependencies.onEvolutionCompleteCallback) {
            _dependencies.onEvolutionCompleteCallback(null, playerInstance);
        }
        return;
    }

    if (_isBlockModeActiveManager) {
        if (uiSelectedChoice.baseId !== 'noMoreEvolutions' && !uiSelectedChoice.baseId.startsWith('empty_slot_')) {
            handleBlockActionOnCard(uiSelectedChoice.baseId, playerInstance);
        } else {
            toggleBlockMode(playerInstance);
        }
        return;
    }

    if (playerInstance.isFreezeModeActive) {
        playerInstance.isFreezeModeActive = false;
    }


    if (uiSelectedChoice.baseId !== 'noMoreEvolutions' && !uiSelectedChoice.baseId.startsWith('empty_slot_')) {
        if (uiSelectedChoice.applyEffect && typeof uiSelectedChoice.applyEffect === 'function') {
            uiSelectedChoice.applyEffect(playerInstance, _dependencies);
        } else {
            console.error("[EvoManager] Error: applyEffect not found or not a function for choice:", uiSelectedChoice);
        }
        const originalEvo = evolutionChoicesMasterList.find(e => e.id === uiSelectedChoice.baseId);
        if (originalEvo) {
            originalEvo.level = (originalEvo.level || 0) + 1;
        }
    }

    if (playerInstance.hasUsedFreezeForCurrentOffers) {
        // If a freeze was used this session, playerInstance.frozenEvolutionChoice points to the card
        // the player *wants to hold*. We keep this regardless of what they picked.
        console.log("[EvoManager] Freeze used this session. Card in 'frozenEvolutionChoice' will be held.");
    } else {
        // No freeze was used in this session. If they picked their previously held card,
        // the hold is now "used up". Otherwise, any old hold is also cleared.
        playerInstance.frozenEvolutionChoice = null;
        console.log("[EvoManager] No freeze used this session or picked previously held card. Global freeze cleared.");
    }

    playerInstance.hasUsedFreezeForCurrentOffers = false;
    _isBlockModeActiveManager = false;
    playerInstance.isBlockModeActive = false;

    if (_dependencies.onEvolutionCompleteCallback) {
        _dependencies.onEvolutionCompleteCallback(uiSelectedChoice, playerInstance);
    } else {
        console.error("[EvoManager] onEvolutionCompleteCallback is not defined in _dependencies!");
    }
}