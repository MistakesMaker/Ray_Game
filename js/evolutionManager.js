// js/evolutionManager.js
import * as CONSTANTS from './constants.js';
import * as GameState from './gameState.js';
import { getReadableColorName as getReadableColorNameFromUtils } from './utils.js';

let evolutionChoicesMasterList = [];
let _currentlyDisplayedEvolutionOffers = []; // To store the full data of currently shown cards
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
    inputState: null // For Shift key
};


// --- Helper Functions ---
function rollTier() {
    const rand = Math.random() * 100;
    if (rand < 5) return 'legendary';
    if (rand < 15) return 'epic';
    if (rand < 50) return 'rare';
    return 'common';
}

// Helper to generate a single new offer, avoiding existing ones and blocked ones
function generateSingleNewOffer(playerInstance, existingOfferBaseIds, additionalExclusionId = null) {
    const exclusionList = [...playerInstance.blockedEvolutionIds, ...existingOfferBaseIds];
    if (additionalExclusionId && !exclusionList.includes(additionalExclusionId)) {
        exclusionList.push(additionalExclusionId);
    }

    const availableChoices = evolutionChoicesMasterList.filter(c => {
        if (exclusionList.includes(c.id)) return false;
        return !(c.isMaxed && c.isMaxed(playerInstance));
    });

    if (availableChoices.length > 0) {
        const baseEvo = availableChoices[Math.floor(Math.random() * availableChoices.length)]; // Pick one randomly
        let rolledTierIfApplicable = baseEvo.isTiered ? rollTier() : 'common';
        const tierSpecificData = baseEvo.isTiered ? baseEvo.tiers[rolledTierIfApplicable] : baseEvo;

        return {
            baseId: baseEvo.id,
            classType: baseEvo.classType,
            rolledTier: baseEvo.isTiered ? rolledTierIfApplicable : null,
            text: baseEvo.text,
            detailedDescription: baseEvo.isTiered && tierSpecificData
                ? (typeof tierSpecificData.description === 'function' ? tierSpecificData.description(playerInstance, rolledTierIfApplicable) : tierSpecificData.description)
                : (typeof baseEvo.detailedDescription === 'function' ? baseEvo.detailedDescription(playerInstance) : baseEvo.detailedDescription),
            applyEffect: baseEvo.isTiered && tierSpecificData ? tierSpecificData.apply : baseEvo.apply,
            cardEffectString: (typeof baseEvo.getCardEffectString === 'function')
                ? baseEvo.getCardEffectString(rolledTierIfApplicable, playerInstance)
                : (baseEvo.getEffectString ? baseEvo.getEffectString(playerInstance) : 'Effect details vary'),
            originalEvolution: baseEvo
        };
    }
    // Fallback if no valid new offer can be generated
    return {
        baseId: `empty_slot_replacement`, classType: 'ability', text:"No More Options", rolledTier: null,
        detailedDescription: "No further upgrades available for this slot.", applyEffect: ()=>{},
        cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_replacement`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }
    };
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
            getEffectString: function(playerInstance) { return `Currently Immune to ${playerInstance?playerInstance.immuneColorsList.length:0} colors`; },
            getCardEffectString: function(tier, playerInstance) { // This is the "front of card" text
                 return `Gain immunity to a new random color.`;
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
            getEffectString: function(p) { return `Shrink Cooldown: ${GameState.getShrinkMeCooldown()} evolutions remaining. Player size is currently ${p ? p.radius.toFixed(1) : 'N/A'}.`; },
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
                return (playerInstance && playerInstance.evolutionIntervalModifier <= 0.70) ? "Acquired" : "Not Acquired";
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
                return `Current Total Dmg Reduction: ${reductionPercent.toFixed(1)}%`;
            },
            getCardEffectString: function(tier) {
                return `Reduce Dmg by ${Math.round(CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS[tier]*100)}%`;
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
            getEffectString: function(playerInstance) {
                const bonus = playerInstance ? playerInstance.hpRegenBonusFromEvolution : 0;
                return bonus > 0 ? `+${bonus.toFixed(1)} HP/tick` : "No Bonus";
            },
            getCardEffectString: function(tier) { return `+${CONSTANTS.VITALITY_SURGE_TIER_BONUS[tier].toFixed(1)} HP/tick Regen`; }
        },
        {
            id: 'maxHpIncrease', classType: 'tank', text: "Fortified Core", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS.common}. Also heals for this amount.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.common; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.common, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                rare:      { description: `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS.rare}. Also heals for this amount.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.rare; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.rare, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                epic:      { description: `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS.epic}. Also heals for this amount.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.epic; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.epic, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                legendary: { description: `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS.legendary}. Also heals for this amount.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.legendary; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.legendary, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }}
            },
            getEffectString: function(playerInstance) { return `Current Max HP: ${playerInstance ? playerInstance.maxHp : CONSTANTS.PLAYER_MAX_HP}`; },
            getCardEffectString: function(tier) { return `+${CONSTANTS.FORTIFIED_CORE_TIER_BONUS[tier]} Max HP & Heal`;}
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
            getEffectString: function(playerInstance) { return `Current Ray Dmg Bonus: +${(playerInstance?playerInstance.rayDamageBonus:0).toFixed(1)}`;},
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
            getEffectString: function(playerInstance) { return `Current AOE Chance: ${Math.round((playerInstance ? playerInstance.chainReactionChance : 0) * 100)}%`; },
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
            getEffectString: function(p) { return `Current Ray Crit Chance: ${( (p && p.rayCritChance !== undefined ? p.rayCritChance:0) * 100).toFixed(0)}%`; },
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
            getEffectString: function(p) { return `Current Ray Crit Damage: x${(p && p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier:1.5).toFixed(2)}`; },
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
                if (!playerInstance) return "Lvl 0: Max Dmg +0%, Rate 0/s";
                const KCL = playerInstance.kineticConversionLevel || 0;
                if (KCL === 0) {
                    return "Not Acquired";
                }
                const maxPotencyBonus = playerInstance.initialKineticDamageBonus + (Math.max(0, KCL - 1) * playerInstance.effectiveKineticAdditionalDamageBonusPerLevel);
                const chargeRate = playerInstance.baseKineticChargeRate + (KCL * playerInstance.effectiveKineticChargeRatePerLevel);
                return `Lvl ${KCL}: Dmg +${(maxPotencyBonus * 100).toFixed(0)}%, Rate ${chargeRate.toFixed(2)}/s`;
            },
            getCardEffectString: function(tier, playerInstance) {
                 const KCL = playerInstance ? (playerInstance.kineticConversionLevel || 0) + 1 : 1;
                 const rateBonusPercent = (CONSTANTS.KINETIC_CONVERSION_TIER_SCALING[tier]?.rateBonus || 0);
                 const dmgBonusPercent = (CONSTANTS.KINETIC_CONVERSION_TIER_SCALING[tier]?.dmgBonus || 0);

                 const nextEffRatePerLvl = CONSTANTS.DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL + rateBonusPercent;
                 const nextEffDmgPerLvl = CONSTANTS.DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL + dmgBonusPercent;

                 const nextMaxPotency = CONSTANTS.KINETIC_INITIAL_DAMAGE_BONUS + (Math.max(0, KCL - 1) * nextEffDmgPerLvl);
                 const nextChargeRate = (playerInstance ? playerInstance.baseKineticChargeRate : CONSTANTS.KINETIC_BASE_CHARGE_RATE) + (KCL * nextEffRatePerLvl);

                 return `To Lvl ${KCL}: Max Dmg +${(nextMaxPotency * 100).toFixed(0)}%, Rate ${nextChargeRate.toFixed(2)}/s`;
            }
        },
        {
            id: 'temporalEcho', classType: 'ability', text: "Temporal Echo", level: 0, maxLevel: 999,
            detailedDescription: function(playerInstance) {
                const chance = playerInstance ? Math.round(playerInstance.temporalEchoChance * 100) : 0;
                return `Grants a ${chance}% chance, when any ability is used, to also reduce the current cooldown of your *other* active abilities and mouse abilities by a fixed ${CONSTANTS.TEMPORAL_ECHO_FIXED_REDUCTION / 1000} seconds. This echo does not affect the ability that triggered it.`;
            },
            isTiered: true,
            isMaxed: function(p) { return p && p.temporalEchoChance >= 1.0; },
            tiers: {
                common:    { description: `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.common}%.`,   apply: function(p) { p.temporalEchoChance = Math.min(1.0, p.temporalEchoChance + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.common / 100); }},
                rare:      { description: `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.rare}%.`,     apply: function(p) { p.temporalEchoChance = Math.min(1.0, p.temporalEchoChance + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.rare / 100); }},
                epic:      { description: `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.epic}%.`,     apply: function(p) { p.temporalEchoChance = Math.min(1.0, p.temporalEchoChance + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.epic / 100); }},
                legendary: { description: `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.legendary}%.`, apply: function(p) { p.temporalEchoChance = Math.min(1.0, p.temporalEchoChance + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.legendary / 100); }}
            },
            getEffectString: function(playerInstance) { return `Current Echo Chance: ${Math.round((playerInstance ? playerInstance.temporalEchoChance : 0) * 100)}%`; },
            getCardEffectString: function(tier) { return `+${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[tier]}% Echo Chance`;}
        },
        {
            id: 'streamlinedSystems', classType: 'ability', text: "Streamlined Systems", level: 0, maxLevel: 999,
            detailedDescription: function(tier) {
                const reduction = tier ? CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[tier] : 0;
                return `Permanently reduces the cooldowns of ALL your current and future abilities by an additional ${reduction}%. Stacks additively.`;
            },
            isTiered: true,
            isMaxed: function(p) { return p && p.globalCooldownReduction >= 0.9; },
            tiers: {
                common:    { description: `Permanently reduce all ability cooldowns by an additional ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.common}%.`, apply: function(p) { p.globalCooldownReduction = Math.min(0.90, (p.globalCooldownReduction || 0) + CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.common / 100); if (_dependencies.UIManager) _dependencies.UIManager.updateAbilityCooldownUI(p); }},
                rare:      { description: `Permanently reduce all ability cooldowns by an additional ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.rare}%.`, apply: function(p) { p.globalCooldownReduction = Math.min(0.90, (p.globalCooldownReduction || 0) + CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.rare / 100); if (_dependencies.UIManager) _dependencies.UIManager.updateAbilityCooldownUI(p); }},
                epic:      { description: `Permanently reduce all ability cooldowns by an additional ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.epic}%.`, apply: function(p) { p.globalCooldownReduction = Math.min(0.90, (p.globalCooldownReduction || 0) + CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.epic / 100); if (_dependencies.UIManager) _dependencies.UIManager.updateAbilityCooldownUI(p); }},
                legendary: { description: `Permanently reduce all ability cooldowns by an additional ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.legendary}%.`, apply: function(p) { p.globalCooldownReduction = Math.min(0.90, (p.globalCooldownReduction || 0) + CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.legendary / 100); if (_dependencies.UIManager) _dependencies.UIManager.updateAbilityCooldownUI(p); }}
            },
            getEffectString: function(playerInstance) {
                return `Current Global CD Reduction: ${( (playerInstance ? playerInstance.globalCooldownReduction : 0) * 100).toFixed(0)}%`;
            },
            getCardEffectString: function(tier) { return `+${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[tier]}% Global CD Reduction`; }
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
            getEffectString: function(playerInstance) { return `Current Ability Dmg Multiplier: x${(playerInstance ? playerInstance.abilityDamageMultiplier : 1).toFixed(2)}`; },
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
            getEffectString: function(p) { return `Current Ability Crit Chance: ${( (p && p.abilityCritChance !== undefined ? p.abilityCritChance:0) * 100).toFixed(0)}%`; },
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
            getEffectString: function(p) { return `Current Ability Crit Dmg: x${(p && p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier:1.5).toFixed(2)}`; },
            getCardEffectString: function(tier) { return `+${(CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS[tier]*100).toFixed(0)}% Ability Crit Dmg`;}
        }
    ];
}

export function resetEvolutionLevels() {
    evolutionChoicesMasterList.forEach(evo => evo.level = 0);
}

export function getEvolutionMasterList() {
    return evolutionChoicesMasterList.map(evo => ({ ...evo }));
}

export function generateEvolutionOffers(playerInstance) {
    if (!playerInstance) {
        console.error("EvolutionManager.generateEvolutionOffers: playerInstance is undefined.");
        return [null, null, null].map((_, i) => ({
            baseId: `empty_slot_${i}_error`, classType: 'ability', text:"Error", rolledTier: null,
            detailedDescription: "Player data unavailable.", applyEffect: ()=>{},
            cardEffectString: "Error", originalEvolution: { id: `empty_slot_${i}_error`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }
        }));
    }

    let offers = [null, null, null];
    let offeredBaseIds = [];
    let filledIndices = [false, false, false];

    if (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData && playerInstance.frozenEvolutionChoice.originalIndex !== undefined) {
        const frozenSnapshot = playerInstance.frozenEvolutionChoice.choiceData;
        const originalMasterEvo = evolutionChoicesMasterList.find(e => e.id === frozenSnapshot.baseId);
        let isValidAndReconstructable = false;

        if (originalMasterEvo) {
            const isMaxed = originalMasterEvo.isMaxed ? originalMasterEvo.isMaxed(playerInstance) : false;
            if (!isMaxed) {
                isValidAndReconstructable = true;
            }
        }

        if (isValidAndReconstructable) {
            let reconstructedHeldOffer = {
                baseId: originalMasterEvo.id,
                classType: originalMasterEvo.classType,
                text: originalMasterEvo.text,
                originalEvolution: originalMasterEvo,
                wasGloballyFrozen: true
            };

            if (originalMasterEvo.isTiered) {
                const heldTier = frozenSnapshot.rolledTier;
                if (heldTier && originalMasterEvo.tiers[heldTier]) {
                    const tierSpecificData = originalMasterEvo.tiers[heldTier];
                    reconstructedHeldOffer.rolledTier = heldTier;
                    const descFunc = typeof tierSpecificData.description === 'function' ? tierSpecificData.description : (typeof originalMasterEvo.detailedDescription === 'function' ? originalMasterEvo.detailedDescription : null);
                    reconstructedHeldOffer.detailedDescription = descFunc ? descFunc(playerInstance, heldTier) : (tierSpecificData.description || originalMasterEvo.detailedDescription);
                    reconstructedHeldOffer.applyEffect = tierSpecificData.apply;
                    reconstructedHeldOffer.cardEffectString = (typeof originalMasterEvo.getCardEffectString === 'function')
                                                                ? originalMasterEvo.getCardEffectString(heldTier, playerInstance)
                                                                : 'Effect details vary';
                } else {
                    isValidAndReconstructable = false;
                }
            } else {
                reconstructedHeldOffer.rolledTier = null;
                reconstructedHeldOffer.detailedDescription = typeof originalMasterEvo.detailedDescription === 'function' ? originalMasterEvo.detailedDescription(playerInstance) : originalMasterEvo.detailedDescription;
                reconstructedHeldOffer.applyEffect = originalMasterEvo.apply;
                reconstructedHeldOffer.cardEffectString = (typeof originalMasterEvo.getCardEffectString === 'function')
                                                            ? originalMasterEvo.getCardEffectString(null, playerInstance)
                                                            : (originalMasterEvo.getEffectString ? originalMasterEvo.getEffectString(playerInstance) : 'Effect details vary');
            }

            if (isValidAndReconstructable) {
                const targetIndex = playerInstance.frozenEvolutionChoice.originalIndex;
                if (targetIndex >= 0 && targetIndex < 3) {
                    offers[targetIndex] = reconstructedHeldOffer;
                    offeredBaseIds.push(reconstructedHeldOffer.baseId);
                    filledIndices[targetIndex] = true;
                } else {
                     console.warn("EvolutionManager: Held choice had invalid originalIndex:", targetIndex, "Clearing hold.");
                     playerInstance.frozenEvolutionChoice = null;
                }
            } else {
                 console.warn("EvolutionManager: Held choice", originalMasterEvo.id, "became invalid. Clearing hold.");
                 playerInstance.frozenEvolutionChoice = null;
            }
        } else {
            playerInstance.frozenEvolutionChoice = null;
        }
    }

    const slotsToFill = 3 - offers.filter(o => o !== null).length;
    if (slotsToFill > 0) {
        const exclusionList = [...playerInstance.blockedEvolutionIds, ...offeredBaseIds];
        const availableChoices = evolutionChoicesMasterList.filter(c => {
            if (exclusionList.includes(c.id)) return false;
            return !(c.isMaxed && c.isMaxed(playerInstance));
        });

        let shuffledAvailable = [...availableChoices].sort(() => 0.5 - Math.random());

        for (let i = 0; i < 3; i++) {
            if (!filledIndices[i]) {
                if (shuffledAvailable.length > 0) {
                    const baseEvo = shuffledAvailable.shift();
                    let rolledTierIfApplicable = baseEvo.isTiered ? rollTier() : 'common';
                    const tierSpecificData = baseEvo.isTiered ? baseEvo.tiers[rolledTierIfApplicable] : baseEvo;

                    const offer = {
                        baseId: baseEvo.id,
                        classType: baseEvo.classType,
                        rolledTier: baseEvo.isTiered ? rolledTierIfApplicable : null,
                        text: baseEvo.text,
                        detailedDescription: baseEvo.isTiered && tierSpecificData
                            ? (typeof tierSpecificData.description === 'function' ? tierSpecificData.description(playerInstance, rolledTierIfApplicable) : tierSpecificData.description)
                            : (typeof baseEvo.detailedDescription === 'function' ? baseEvo.detailedDescription(playerInstance) : baseEvo.detailedDescription),
                        applyEffect: baseEvo.isTiered && tierSpecificData ? tierSpecificData.apply : baseEvo.apply,
                        cardEffectString: (typeof baseEvo.getCardEffectString === 'function')
                            ? baseEvo.getCardEffectString(rolledTierIfApplicable, playerInstance)
                            : (baseEvo.getEffectString ? baseEvo.getEffectString(playerInstance) : 'Effect details vary'),
                        originalEvolution: baseEvo
                    };
                    offers[i] = offer;
                    offeredBaseIds.push(offer.baseId);
                    filledIndices[i] = true;
                } else {
                    offers[i] = {
                        baseId: `empty_slot_${i}`, classType: 'ability', text:"No More Options", rolledTier: null,
                        detailedDescription: "No further upgrades available or other slots took priority.", applyEffect: ()=>{},
                        cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_${i}`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }
                    };
                    filledIndices[i] = true;
                }
            }
        }
    }

    if (offers.every(o => o === null || o.baseId.startsWith('empty_slot_') || o.baseId === 'noMoreEvolutions')) {
         offers[0] = {
            baseId: 'noMoreEvolutions', classType: 'ability',
            text:"All evolutions maxed or no valid options!", rolledTier: null,
            detailedDescription: "No further upgrades available at this time.",
            applyEffect:()=>"No more evolutions!", cardEffectString: "Unavailable",
            originalEvolution: {id:'noMoreEvolutions', isMaxed:()=>true, isTiered: false, getEffectString: (p) => "All Maxed!"}
        };
        if(!offers[1]) offers[1] = { baseId: `empty_slot_1`, classType: 'ability', text:"No More Options", rolledTier: null, detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_1`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }};
        if(!offers[2]) offers[2] = { baseId: `empty_slot_2`, classType: 'ability', text:"No More Options", rolledTier: null, detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_2`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }};
    }
    for(let i=0; i < 3; i++) {
        if (offers[i] === null) {
            offers[i] = { baseId: `empty_slot_${i}_fallback`, classType: 'ability', text:"No More Options", rolledTier: null, detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_${i}_fallback`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }};
        }
    }

    _currentlyDisplayedEvolutionOffers = offers.map(offer => ({...offer}));
    return offers;
}


export function getCurrentlyDisplayedOffers() {
    return _currentlyDisplayedEvolutionOffers;
}


export function presentEvolutionUI(playerInstance, dependencies) {
    if (!playerInstance || !dependencies || !dependencies.UIManager || !dependencies.playSound || !dependencies.onEvolutionCompleteCallback || !dependencies.inputState) {
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
        _currentlyDisplayedEvolutionOffers,
        playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance),
        _dependencies.inputState
    );
}

export function redrawEvolutionOptionsWithShiftState(playerInstance) {
    if (!playerInstance || !_dependencies.UIManager || !_dependencies.inputState) {
        console.warn("Cannot redraw evolution options: missing player or dependencies.");
        return;
    }
     _dependencies.UIManager.populateEvolutionOptionsUI(
        _currentlyDisplayedEvolutionOffers,
        playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance),
        _dependencies.inputState
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

    generateEvolutionOffers(playerInstance);
    _dependencies.UIManager.populateEvolutionOptionsUI(
        _currentlyDisplayedEvolutionOffers, playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance),
        _dependencies.inputState
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
        (choice, index) => handleFreezeSelection(choice, index, playerInstance),
        _dependencies.inputState
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
        (choice, index) => handleFreezeSelection(choice, index, playerInstance),
        _dependencies.inputState
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
            const { originalEvolution, ...restOfChoiceData } = uiSelectedChoiceToFreeze;
            playerInstance.frozenEvolutionChoice = {
                choiceData: { ...restOfChoiceData, baseId: originalEvolution.id },
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
        (choice, index) => handleFreezeSelection(choice, index, playerInstance),
        _dependencies.inputState
    );
}

function handleBlockActionOnCard(baseIdToBlock, playerInstance) {
    if (!playerInstance || playerInstance.evolutionBlocksRemaining <= 0) {
        if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
        _isBlockModeActiveManager = false; playerInstance.isBlockModeActive = false;
        _dependencies.UIManager.populateEvolutionOptionsUI(
            _currentlyDisplayedEvolutionOffers, playerInstance,
            (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
            () => handleEvolutionReRoll(playerInstance), () => toggleBlockMode(playerInstance),
            GameState.getShrinkMeCooldown(), () => toggleFreezeMode(playerInstance),
            (choice, index) => handleFreezeSelection(choice, index, playerInstance),
            _dependencies.inputState
        );
        return;
    }

    if (playerInstance.blockedEvolutionIds.includes(baseIdToBlock)) {
        _isBlockModeActiveManager = false; playerInstance.isBlockModeActive = false;
        _dependencies.UIManager.populateEvolutionOptionsUI(
            _currentlyDisplayedEvolutionOffers, playerInstance,
            (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
            () => handleEvolutionReRoll(playerInstance), () => toggleBlockMode(playerInstance),
            GameState.getShrinkMeCooldown(), () => toggleFreezeMode(playerInstance),
            (choice, index) => handleFreezeSelection(choice, index, playerInstance),
             _dependencies.inputState
        );
        return;
    }

    playerInstance.blockedEvolutionIds.push(baseIdToBlock);
    playerInstance.evolutionBlocksRemaining--;
    _isBlockModeActiveManager = false; playerInstance.isBlockModeActive = false;
    if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioUpgradeSound);

    if (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData.baseId === baseIdToBlock) {
        playerInstance.frozenEvolutionChoice = null;
         if (playerInstance.hasUsedFreezeForCurrentOffers) {
            playerInstance.evolutionFreezesRemaining++;
            playerInstance.hasUsedFreezeForCurrentOffers = false;
        }
    }

    const blockedCardIndex = _currentlyDisplayedEvolutionOffers.findIndex(offer => offer.baseId === baseIdToBlock);

    if (blockedCardIndex !== -1) {
        // Get IDs of other offers to exclude them from the single new roll
        const otherOfferIds = _currentlyDisplayedEvolutionOffers
            .filter((_, idx) => idx !== blockedCardIndex)
            .map(offer => offer.baseId);

        // Generate just one new offer for the blocked slot
        const newSingleOffer = generateSingleNewOffer(playerInstance, otherOfferIds, baseIdToBlock);
        _currentlyDisplayedEvolutionOffers[blockedCardIndex] = newSingleOffer;
    }

    _dependencies.UIManager.populateEvolutionOptionsUI(
        _currentlyDisplayedEvolutionOffers, playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance), () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(), () => toggleFreezeMode(playerInstance),
        (choice, index) => handleFreezeSelection(choice, index, playerInstance),
         _dependencies.inputState
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
         _dependencies.UIManager.populateEvolutionOptionsUI(
            _currentlyDisplayedEvolutionOffers, playerInstance,
            (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
            () => handleEvolutionReRoll(playerInstance), () => toggleBlockMode(playerInstance),
            GameState.getShrinkMeCooldown(), () => toggleFreezeMode(playerInstance),
            (choice, index) => handleFreezeSelection(choice, index, playerInstance),
             _dependencies.inputState
        );
        return;
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

    if ((playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData.baseId === uiSelectedChoice.baseId) ||
        !playerInstance.hasUsedFreezeForCurrentOffers) {
        playerInstance.frozenEvolutionChoice = null;
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