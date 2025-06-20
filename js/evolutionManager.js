// js/evolutionManager.js
import * as CONSTANTS from './constants.js';
import * as GameState from './gameState.js';
import { getReadableColorName as getReadableColorNameFromUtils } from './utils.js';
import { getUnlockedAchievementCount } from './achievementManager.js';

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
    inputState: null
};


// --- Helper Functions ---
function rollTier(unlockedAchievementCount = 0) {
    const ACHIEVEMENT_BRACKET_SIZE = 15;
    
    // Determine how many reward brackets the player has unlocked
    const bracketsUnlocked = Math.floor(unlockedAchievementCount / ACHIEVEMENT_BRACKET_SIZE);

    // Define the bonus percentage per bracket to reach the final targets
    const legendaryBonusPerBracket = 2.5; // (15% - 5%) / 4 brackets
    const epicBonusPerBracket = 5;      // (30% - 10%) / 4 brackets
    const rareBonusPerBracket = 5;      // (55% - 35%) / 4 brackets

    // Calculate the current chances based on unlocked brackets
    let legendaryChance = 5 + (bracketsUnlocked * legendaryBonusPerBracket);
    let epicChance = 10 + (bracketsUnlocked * epicBonusPerBracket);
    let rareChance = 35 + (bracketsUnlocked * rareBonusPerBracket);
    
    const rand = Math.random() * 100;

    if (rand < legendaryChance) return 'legendary';
    if (rand < legendaryChance + epicChance) return 'epic';
    if (rand < legendaryChance + epicChance + rareChance) return 'rare';
    return 'common';
}

function generateSingleNewOffer(playerInstance, existingOfferBaseIds, additionalExclusionId = null) {
    const exclusionList = [...playerInstance.blockedEvolutionIds, ...existingOfferBaseIds];
    if (additionalExclusionId && !exclusionList.includes(additionalExclusionId)) {
        exclusionList.push(additionalExclusionId);
    }

    const availableChoices = evolutionChoicesMasterList.filter(c => {
        if (exclusionList.includes(c.id)) return false;
        if (c.requiresPath && playerInstance.currentPath !== c.requiresPath) {
            return false;
        }
        return !(c.isMaxed && c.isMaxed(playerInstance));
    });

    if (availableChoices.length > 0) {
        const baseEvo = availableChoices[Math.floor(Math.random() * availableChoices.length)];
        const unlockedCount = getUnlockedAchievementCount();
        
        let rolledTierIfApplicable;
        // <<< CORE ABILITY LOGIC >>>
        // If the evolution is not tiered (i.e., it's a Core ability), assign it the 'rare' tier.
        // This ensures it always appears, even when common drops are 0%.
        if (!baseEvo.isTiered) {
            rolledTierIfApplicable = 'rare'; 
        } else {
            rolledTierIfApplicable = rollTier(unlockedCount);
        }
        
        const tierSpecificData = baseEvo.isTiered ? baseEvo.tiers[rolledTierIfApplicable] : baseEvo;

        return {
            baseId: baseEvo.id,
            classType: baseEvo.classType,
            // If it's a Core ability, we set its rolledTier to null internally so it doesn't try to find tier data.
            // The 'rare' roll was just to determine its visual display tier.
            rolledTier: baseEvo.isTiered ? rolledTierIfApplicable : null,
            // We pass the "visual tier" separately for styling purposes.
            visualTier: rolledTierIfApplicable,
            text: baseEvo.text,
            detailedDescription: baseEvo.isTiered && tierSpecificData
                ? (typeof baseEvo.detailedDescription === 'function' ? baseEvo.detailedDescription(playerInstance, rolledTierIfApplicable, rolledTierIfApplicable) : (typeof tierSpecificData.description === 'function' ? tierSpecificData.description(playerInstance, rolledTierIfApplicable) : tierSpecificData.description) )
                : (typeof baseEvo.detailedDescription === 'function' ? baseEvo.detailedDescription(playerInstance, baseEvo.id, null) : baseEvo.detailedDescription),
            applyEffect: baseEvo.isTiered && tierSpecificData ? tierSpecificData.apply : baseEvo.apply,
            cardEffectString: (typeof baseEvo.getCardEffectString === 'function')
                ? baseEvo.getCardEffectString(rolledTierIfApplicable, playerInstance)
                : (baseEvo.getEffectString ? baseEvo.getEffectString(playerInstance) : 'Effect details vary'),
            originalEvolution: baseEvo
        };
    }
    return {
        baseId: `empty_slot_replacement`, classType: 'ability', text:"No More Options", rolledTier: null, visualTier: 'disabled',
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
            getCardEffectString: function(tier, playerInstance) {
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
                common:    { description: (p, tier) => `Reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS[tier]*100}%. Stacks multiplicatively.`,    apply: function(p) { p.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.common); p.damageTakenMultiplier = Math.max(0.001, p.damageTakenMultiplier); }},
                rare:      { description: (p, tier) => `Reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS[tier]*100}%. Stacks multiplicatively.`,      apply: function(p) { p.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.rare); p.damageTakenMultiplier = Math.max(0.001, p.damageTakenMultiplier); }},
                epic:      { description: (p, tier) => `Reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS[tier]*100}%. Stacks multiplicatively.`,      apply: function(p) { p.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.epic); p.damageTakenMultiplier = Math.max(0.001, p.damageTakenMultiplier); }},
                legendary: { description: (p, tier) => `Reduces damage taken by a further ${CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS[tier]*100}%. Stacks multiplicatively.`, apply: function(p) { p.damageTakenMultiplier *= (1 - CONSTANTS.REINFORCED_HULL_TIER_EFFECTIVENESS.legendary); p.damageTakenMultiplier = Math.max(0.001, p.damageTakenMultiplier); }}
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
                common:    { description: (p, tier) => `Increases HP regen by ${CONSTANTS.VITALITY_SURGE_TIER_BONUS[tier]} HP/tick.`, apply: function(p) { p.hpRegenBonusFromEvolution += CONSTANTS.VITALITY_SURGE_TIER_BONUS.common; }},
                rare:      { description: (p, tier) => `Increases HP regen by ${CONSTANTS.VITALITY_SURGE_TIER_BONUS[tier]} HP/tick.`, apply: function(p) { p.hpRegenBonusFromEvolution += CONSTANTS.VITALITY_SURGE_TIER_BONUS.rare; }},
                epic:      { description: (p, tier) => `Increases HP regen by ${CONSTANTS.VITALITY_SURGE_TIER_BONUS[tier]} HP/tick.`, apply: function(p) { p.hpRegenBonusFromEvolution += CONSTANTS.VITALITY_SURGE_TIER_BONUS.epic; }},
                legendary: { description: (p, tier) => `Increases HP regen by ${CONSTANTS.VITALITY_SURGE_TIER_BONUS[tier]} HP/tick.`, apply: function(p) { p.hpRegenBonusFromEvolution += CONSTANTS.VITALITY_SURGE_TIER_BONUS.legendary; }}
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
                common:    { description: (p, tier) => `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS[tier]}. Also heals for this amount.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.common; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.common, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                rare:      { description: (p, tier) => `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS[tier]}. Also heals for this amount.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.rare; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.rare, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                epic:      { description: (p, tier) => `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS[tier]}. Also heals for this amount.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.epic; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.epic, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }},
                legendary: { description: (p, tier) => `Increases Max HP by ${CONSTANTS.FORTIFIED_CORE_TIER_BONUS[tier]}. Also heals for this amount.`, apply: function(p, deps) { p.maxHp += CONSTANTS.FORTIFIED_CORE_TIER_BONUS.legendary; p.gainHealth(CONSTANTS.FORTIFIED_CORE_TIER_BONUS.legendary, deps && deps.UIManager ? deps.UIManager.updateHealthDisplay : null); }}
            },
            getEffectString: function(playerInstance) { return `Current Max HP: ${playerInstance ? playerInstance.maxHp : CONSTANTS.PLAYER_MAX_HP}`; },
            getCardEffectString: function(tier) { return `+${CONSTANTS.FORTIFIED_CORE_TIER_BONUS[tier]} Max HP & Heal`;}
        },
        {
            id:'focusedBeam', classType: 'attack', text:"Focused Beam", level:0, maxLevel: 999 ,
            isTiered: true,
            isMaxed:function(p){return false;},
            tiers: {
                common:    { description: (p, tier) => `Increases ray damage by ${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE[tier]}.`, apply: function(p) { p.rayDamageBonus += CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.common; }},
                rare:      { description: (p, tier) => `Increases ray damage by ${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE[tier]}.`, apply: function(p) { p.rayDamageBonus += CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.rare; }},
                epic:      { description: (p, tier) => `Increases ray damage by ${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE[tier]}.`, apply: function(p) { p.rayDamageBonus += CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.epic; }},
                legendary: { description: (p, tier) => `Increases ray damage by ${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE[tier]}.`, apply: function(p) { p.rayDamageBonus += CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE.legendary; }}
            },
            getEffectString: function(playerInstance) { return `Current Ray Dmg Bonus: +${(playerInstance?playerInstance.rayDamageBonus:0).toFixed(1)}`;},
            getCardEffectString: function(tier) { return `+${CONSTANTS.FOCUSED_BEAM_TIER_DAMAGE[tier].toFixed(1)} Ray Damage`;}
        },
        {
            id: 'unstableCore', classType: 'attack', text: "Unstable Core", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return p && p.chainReactionChance >= 1.0; },
            tiers: {
                common:    { description: (p, tier) => `Increases AOE chance by ${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE[tier]}%.`,   apply: function(p) { p.chainReactionChance = Math.min(1.0, p.chainReactionChance + CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.common / 100); }},
                rare:      { description: (p, tier) => `Increases AOE chance by ${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE[tier]}%.`,     apply: function(p) { p.chainReactionChance = Math.min(1.0, p.chainReactionChance + CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.rare / 100); }},
                epic:      { description: (p, tier) => `Increases AOE chance by ${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE[tier]}%.`,     apply: function(p) { p.chainReactionChance = Math.min(1.0, p.chainReactionChance + CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.epic / 100); }},
                legendary: { description: (p, tier) => `Increases AOE chance by ${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE[tier]}%.`, apply: function(p) { p.chainReactionChance = Math.min(1.0, p.chainReactionChance + CONSTANTS.UNSTABLE_CORE_TIER_CHANCE.legendary / 100); }}
            },
            getEffectString: function(playerInstance) { return `Current AOE Chance: ${Math.round((playerInstance ? playerInstance.chainReactionChance : 0) * 100)}%`; },
            getCardEffectString: function(tier) { return `+${CONSTANTS.UNSTABLE_CORE_TIER_CHANCE[tier]}% AOE Chance`;}
        },
        {
            id: 'rayCritChance', classType: 'attack', text: "Critical Array", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return p && (p.rayCritChance !== undefined ? p.rayCritChance >= 1.0 : false); },
            tiers: {
                common:    { description: (p, tier) => `Increases ray critical hit chance by ${CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS[tier]*100}%.`, apply: function(p) { p.rayCritChance = Math.min(1.0, (p.rayCritChance || 0) + CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.common); }},
                rare:      { description: (p, tier) => `Increases ray critical hit chance by ${CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS[tier]*100}%.`,   apply: function(p) { p.rayCritChance = Math.min(1.0, (p.rayCritChance || 0) + CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.rare);   }},
                epic:      { description: (p, tier) => `Increases ray critical hit chance by ${CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS[tier]*100}%.`,   apply: function(p) { p.rayCritChance = Math.min(1.0, (p.rayCritChance || 0) + CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.epic);   }},
                legendary: { description: (p, tier) => `Increases ray critical hit chance by ${CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS[tier]*100}%.`,apply: function(p) { p.rayCritChance = Math.min(1.0, (p.rayCritChance || 0) + CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS.legendary);}}
            },
            getEffectString: function(p) { return `Current Ray Crit Chance: ${( (p && p.rayCritChance !== undefined ? p.rayCritChance:0) * 100).toFixed(0)}%`; },
            getCardEffectString: function(tier) { return `+${(CONSTANTS.RAY_CRIT_CHANCE_TIER_BONUS[tier]*100).toFixed(0)}% Ray Crit Chance`;}
        },
        {
            id: 'rayCritDamage', classType: 'attack', text: "Amplified Output", level: 0, maxLevel: 999,
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: (p, tier) => `Increases ray critical damage multiplier by +${CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS[tier]*100}%.`, apply: function(p) { p.rayCritDamageMultiplier = (p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier : 1.5) + CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.common; }},
                rare:      { description: (p, tier) => `Increases ray critical damage multiplier by +${CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS[tier]*100}%.`,   apply: function(p) { p.rayCritDamageMultiplier = (p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier : 1.5) + CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.rare;   }},
                epic:      { description: (p, tier) => `Increases ray critical damage multiplier by +${CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS[tier]*100}%.`,   apply: function(p) { p.rayCritDamageMultiplier = (p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier : 1.5) + CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.epic;   }},
                legendary: { description: (p, tier) => `Increases ray critical damage multiplier by +${CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS[tier]*100}%.`,apply: function(p) { p.rayCritDamageMultiplier = (p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier : 1.5) + CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS.legendary;}}
            },
            getEffectString: function(p) { return `Current Ray Crit Damage: x${(p && p.rayCritDamageMultiplier !== undefined ? p.rayCritDamageMultiplier:1.5).toFixed(2)}`; },
            getCardEffectString: function(tier) { return `+${(CONSTANTS.RAY_CRIT_DAMAGE_TIER_BONUS[tier]*100).toFixed(0)}% Ray Crit Damage`;}
        },
        {
            id: 'temporalEcho', classType: 'ability', text: "Temporal Echo", level: 0, maxLevel: 999,
            detailedDescription: function(playerInstance, evolutionIdOrTier, actualTierIfDifferent) {
                const currentChance = playerInstance ? Math.round(playerInstance.temporalEchoChance * 100) : 0;
                const reductionAmount = CONSTANTS.TEMPORAL_ECHO_FIXED_REDUCTION; 
                const reductionSeconds = reductionAmount ? (reductionAmount / 1000).toFixed(1) : 'N/A';
                
                let tierDesc = "";
                if (typeof evolutionIdOrTier === 'string' && CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE && CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[evolutionIdOrTier]) { 
                    tierDesc = `This upgrade adds +${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[evolutionIdOrTier]}% Echo Chance.`;
                }
                return `${tierDesc}<br>Current Total: ${currentChance}% chance on ability use to reduce other cooldowns by ${reductionSeconds}s. (Does not affect the used ability).`;
            },
            isTiered: true,
            isMaxed: function(p) { return p && p.temporalEchoChance >= 1.0; },
            tiers: { 
                common:    { description: (p, tier) => `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[tier]}%. (Current: ${Math.round((p?p.temporalEchoChance:0)*100)}%)`,   apply: function(p) { p.temporalEchoChance = Math.min(1.0, (p.temporalEchoChance || 0) + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.common / 100); }},
                rare:      { description: (p, tier) => `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[tier]}%. (Current: ${Math.round((p?p.temporalEchoChance:0)*100)}%)`,     apply: function(p) { p.temporalEchoChance = Math.min(1.0, (p.temporalEchoChance || 0) + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.rare / 100); }},
                epic:      { description: (p, tier) => `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[tier]}%. (Current: ${Math.round((p?p.temporalEchoChance:0)*100)}%)`,     apply: function(p) { p.temporalEchoChance = Math.min(1.0, (p.temporalEchoChance || 0) + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.epic / 100); }},
                legendary: { description: (p, tier) => `Increases echo chance by ${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[tier]}%. (Current: ${Math.round((p?p.temporalEchoChance:0)*100)}%)`, apply: function(p) { p.temporalEchoChance = Math.min(1.0, (p.temporalEchoChance || 0) + CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE.legendary / 100); }}
            },
            getEffectString: function(playerInstance) { return `Current Echo Chance: ${Math.round((playerInstance ? playerInstance.temporalEchoChance : 0) * 100)}%`; },
            getCardEffectString: function(tier) { 
                const reductionSeconds = (CONSTANTS.TEMPORAL_ECHO_FIXED_REDUCTION / 1000).toFixed(1);
                return `+${CONSTANTS.TEMPORAL_ECHO_TIER_CHANCE[tier]}% chance: ability use reduces other CDs by ${reductionSeconds}s.`;
            }
        },
        {
            id: 'streamlinedSystems', classType: 'ability', text: "Streamlined Systems", level: 0, maxLevel: 999,
            detailedDescription: function(playerInstance, evolutionIdOrTier, actualTierIfDifferent) { 
                const currentReduction = playerInstance ? (playerInstance.globalCooldownReduction || 0) * 100 : 0;
                let tierDesc = "";
                 if (typeof evolutionIdOrTier === 'string' && CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[evolutionIdOrTier]) {
                    tierDesc = `This upgrade adds +${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[evolutionIdOrTier]}% Global CD Reduction.`;
                }
                return `${tierDesc}<br>Permanently reduces all ability cooldowns. Current Total: ${currentReduction.toFixed(0)}%.`;
            },
            isTiered: true,
            isMaxed: function(p) { return p && p.globalCooldownReduction >= 0.9; },
            tiers: {
                common:    { description: (p, tier) => `Reduce all ability cooldowns by an additional ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[tier]}%.`, apply: function(p) { p.globalCooldownReduction = Math.min(0.90, (p.globalCooldownReduction || 0) + CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.common / 100); if (_dependencies.UIManager) _dependencies.UIManager.updateAbilityCooldownUI(p); }},
                rare:      { description: (p, tier) => `Reduce all ability cooldowns by an additional ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[tier]}%.`, apply: function(p) { p.globalCooldownReduction = Math.min(0.90, (p.globalCooldownReduction || 0) + CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.rare / 100); if (_dependencies.UIManager) _dependencies.UIManager.updateAbilityCooldownUI(p); }},
                epic:      { description: (p, tier) => `Reduce all ability cooldowns by an additional ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[tier]}%.`, apply: function(p) { p.globalCooldownReduction = Math.min(0.90, (p.globalCooldownReduction || 0) + CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.epic / 100); if (_dependencies.UIManager) _dependencies.UIManager.updateAbilityCooldownUI(p); }},
                legendary: { description: (p, tier) => `Reduce all ability cooldowns by an additional ${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[tier]}%.`, apply: function(p) { p.globalCooldownReduction = Math.min(0.90, (p.globalCooldownReduction || 0) + CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION.legendary / 100); if (_dependencies.UIManager) _dependencies.UIManager.updateAbilityCooldownUI(p); }}
            },
            getEffectString: function(playerInstance) {
                return `Current Global CD Reduction: ${( (playerInstance ? playerInstance.globalCooldownReduction : 0) * 100).toFixed(0)}%`;
            },
            getCardEffectString: function(tier) { return `+${CONSTANTS.STREAMLINED_SYSTEMS_TIER_REDUCTION[tier]}% Global CD Reduction`; }
        },
        {
            id: 'abilityPotency', classType: 'ability', text: "Empowered Abilities", level: 0, maxLevel: 999,
            requiresPath: 'mage',
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: (p, tier) => `Multiplies ability damage by ${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER[tier].toFixed(2)}x.`, apply: function(p) { p.abilityDamageMultiplier *= CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.common; }},
                rare:      { description: (p, tier) => `Multiplies ability damage by ${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER[tier].toFixed(2)}x.`, apply: function(p) { p.abilityDamageMultiplier *= CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.rare; }},
                epic:      { description: (p, tier) => `Multiplies ability damage by ${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER[tier].toFixed(2)}x.`, apply: function(p) { p.abilityDamageMultiplier *= CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.epic; }},
                legendary: { description: (p, tier) => `Multiplies ability damage by ${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER[tier].toFixed(2)}x.`, apply: function(p) { p.abilityDamageMultiplier *= CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER.legendary; }}
            },
            getEffectString: function(playerInstance) { return `Current Ability Dmg Multiplier: x${(playerInstance ? playerInstance.abilityDamageMultiplier : 1).toFixed(2)}`; },
            getCardEffectString: function(tier) { return `Ability Dmg x${CONSTANTS.ABILITY_POTENCY_TIER_MULTIPLIER[tier].toFixed(2)}`;}
        },
        {
            id: 'abilityCritChance', classType: 'ability', text: "Unstable Energies", level: 0, maxLevel: 999,
            requiresPath: 'mage',
            isTiered: true,
            isMaxed: function(p) { return p && (p.abilityCritChance !== undefined ? p.abilityCritChance >= 1.0 : false); },
            tiers: {
                common:    { description: (p, tier) => `Increases ability critical hit chance by ${CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS[tier]*100}%.`, apply: function(p) { p.abilityCritChance = Math.min(1.0, (p.abilityCritChance || 0) + CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.common); }},
                rare:      { description: (p, tier) => `Increases ability critical hit chance by ${CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS[tier]*100}%.`,   apply: function(p) { p.abilityCritChance = Math.min(1.0, (p.abilityCritChance || 0) + CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.rare);   }},
                epic:      { description: (p, tier) => `Increases ability critical hit chance by ${CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS[tier]*100}%.`,   apply: function(p) { p.abilityCritChance = Math.min(1.0, (p.abilityCritChance || 0) + CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.epic);   }},
                legendary: { description: (p, tier) => `Increases ability critical hit chance by ${CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS[tier]*100}%.`,apply: function(p) { p.abilityCritChance = Math.min(1.0, (p.abilityCritChance || 0) + CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS.legendary);}}
            },
            getEffectString: function(p) { return `Current Ability Crit Chance: ${( (p && p.abilityCritChance !== undefined ? p.abilityCritChance:0) * 100).toFixed(0)}%`; },
            getCardEffectString: function(tier) { return `+${(CONSTANTS.ABILITY_CRIT_CHANCE_TIER_BONUS[tier]*100).toFixed(0)}% Ability Crit Chance`;}
        },
        {
            id: 'abilityCritDamage', classType: 'ability', text: "Focused Overload", level: 0, maxLevel: 999,
            requiresPath: 'mage',
            isTiered: true,
            isMaxed: function(p) { return false; },
            tiers: {
                common:    { description: (p, tier) => `Increases ability critical damage multiplier by +${CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS[tier]*100}%.`, apply: function(p) { p.abilityCritDamageMultiplier = (p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier : 1.5) + CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.common; }},
                rare:      { description: (p, tier) => `Increases ability critical damage multiplier by +${CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS[tier]*100}%.`,   apply: function(p) { p.abilityCritDamageMultiplier = (p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier : 1.5) + CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.rare;   }},
                epic:      { description: (p, tier) => `Increases ability critical damage multiplier by +${CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS[tier]*100}%.`,   apply: function(p) { p.abilityCritDamageMultiplier = (p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier : 1.5) + CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.epic;   }},
                legendary: { description: (p, tier) => `Increases ability critical damage multiplier by +${CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS[tier]*100}%.`,apply: function(p) { p.abilityCritDamageMultiplier = (p.abilityCritDamageMultiplier !== undefined ? p.abilityCritDamageMultiplier : 1.5) + CONSTANTS.ABILITY_CRIT_DAMAGE_TIER_BONUS.legendary;}}
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
            let pathRequirementMet = true;
            if (originalMasterEvo.requiresPath && playerInstance.currentPath !== originalMasterEvo.requiresPath) {
                pathRequirementMet = false;
            }
            const isMaxed = originalMasterEvo.isMaxed ? originalMasterEvo.isMaxed(playerInstance) : false;
            if (!isMaxed && pathRequirementMet) {
                isValidAndReconstructable = true;
            }
        }

        if (isValidAndReconstructable) {
            let reconstructedHeldOffer = {
                baseId: originalMasterEvo.id,
                classType: originalMasterEvo.classType,
                text: originalMasterEvo.text,
                originalEvolution: originalMasterEvo,
            };

            if (originalMasterEvo.isTiered) {
                const heldTier = frozenSnapshot.rolledTier; 
                if (heldTier && originalMasterEvo.tiers[heldTier]) {
                    const tierSpecificData = originalMasterEvo.tiers[heldTier];
                    reconstructedHeldOffer.rolledTier = heldTier;
                    reconstructedHeldOffer.visualTier = heldTier;
                    reconstructedHeldOffer.detailedDescription = (typeof originalMasterEvo.detailedDescription === 'function')
                        ? originalMasterEvo.detailedDescription(playerInstance, heldTier, heldTier)
                        : (typeof tierSpecificData.description === 'function' ? tierSpecificData.description(playerInstance, heldTier) : tierSpecificData.description);

                    reconstructedHeldOffer.applyEffect = tierSpecificData.apply;
                    reconstructedHeldOffer.cardEffectString = (typeof originalMasterEvo.getCardEffectString === 'function')
                                                                ? originalMasterEvo.getCardEffectString(heldTier, playerInstance)
                                                                : 'Effect details vary';
                } else {
                    isValidAndReconstructable = false; 
                }
            } else { 
                reconstructedHeldOffer.rolledTier = null;
                reconstructedHeldOffer.visualTier = 'rare'; // Core abilities are visually rare
                reconstructedHeldOffer.detailedDescription = typeof originalMasterEvo.detailedDescription === 'function'
                    ? originalMasterEvo.detailedDescription(playerInstance, originalMasterEvo.id, null)
                    : originalMasterEvo.detailedDescription;
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
                     playerInstance.frozenEvolutionChoice = null;
                }
            } else {
                 playerInstance.frozenEvolutionChoice = null;
            }
        } else {
            playerInstance.frozenEvolutionChoice = null;
        }
    }

    const exclusionListForNewRolls = [...playerInstance.blockedEvolutionIds, ...offeredBaseIds];
    const availableChoicesForNewRolls = evolutionChoicesMasterList.filter(c => {
        if (exclusionListForNewRolls.includes(c.id)) return false;
        if (c.requiresPath && playerInstance.currentPath !== c.requiresPath) {
            return false;
        }
        return !(c.isMaxed && c.isMaxed(playerInstance));
    });

    let shuffledAvailableForNewRolls = [...availableChoicesForNewRolls].sort(() => 0.5 - Math.random());
    
    const unlockedCount = getUnlockedAchievementCount();

    for (let i = 0; i < 3; i++) {
        if (!filledIndices[i]) {
            if (shuffledAvailableForNewRolls.length > 0) {
                const baseEvo = shuffledAvailableForNewRolls.shift();
                
                let rolledTierIfApplicable;
                if (!baseEvo.isTiered) {
                    rolledTierIfApplicable = 'rare';
                } else {
                    rolledTierIfApplicable = rollTier(unlockedCount);
                }
                
                const tierSpecificData = baseEvo.isTiered ? baseEvo.tiers[rolledTierIfApplicable] : baseEvo;

                const offer = {
                    baseId: baseEvo.id,
                    classType: baseEvo.classType,
                    rolledTier: baseEvo.isTiered ? rolledTierIfApplicable : null,
                    visualTier: rolledTierIfApplicable,
                    text: baseEvo.text,
                    detailedDescription: baseEvo.isTiered && tierSpecificData
                        ? (typeof baseEvo.detailedDescription === 'function' ? baseEvo.detailedDescription(playerInstance, rolledTierIfApplicable, rolledTierIfApplicable) : (typeof tierSpecificData.description === 'function' ? tierSpecificData.description(playerInstance, rolledTierIfApplicable) : tierSpecificData.description) )
                        : (typeof baseEvo.detailedDescription === 'function' ? baseEvo.detailedDescription(playerInstance, baseEvo.id, null) : baseEvo.detailedDescription),
                    applyEffect: baseEvo.isTiered && tierSpecificData ? tierSpecificData.apply : baseEvo.apply,
                    cardEffectString: (typeof baseEvo.getCardEffectString === 'function')
                        ? baseEvo.getCardEffectString(rolledTierIfApplicable, playerInstance)
                        : (baseEvo.getEffectString ? baseEvo.getEffectString(playerInstance) : 'Effect details vary'),
                    originalEvolution: baseEvo
                };
                offers[i] = offer;
                filledIndices[i] = true;
                 if (!offeredBaseIds.includes(offer.baseId)) { 
                    offeredBaseIds.push(offer.baseId);
                }
            } else {
                offers[i] = {
                    baseId: `empty_slot_${i}`, classType: 'ability', text:"No More Options", rolledTier: null, visualTier: 'disabled',
                    detailedDescription: "No further upgrades available or other slots took priority.", applyEffect: ()=>{},
                    cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_${i}`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }
                };
                filledIndices[i] = true;
            }
        }
    }

    if (offers.every(o => o === null || o.baseId.startsWith('empty_slot_') || o.baseId === 'noMoreEvolutions')) {
         offers[0] = {
            baseId: 'noMoreEvolutions', classType: 'ability',
            text:"All evolutions maxed or no valid options!", rolledTier: null, visualTier: 'disabled',
            detailedDescription: "No further upgrades available at this time.",
            applyEffect:()=>"No more evolutions!", cardEffectString: "Unavailable",
            originalEvolution: {id:'noMoreEvolutions', isMaxed:()=>true, isTiered: false, getEffectString: (p) => "All Maxed!"}
        };
        if(!offers[1]) offers[1] = { baseId: `empty_slot_1`, classType: 'ability', text:"No More Options", rolledTier: null, visualTier: 'disabled', detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_1`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }};
        if(!offers[2]) offers[2] = { baseId: `empty_slot_2`, classType: 'ability', text:"No More Options", rolledTier: null, visualTier: 'disabled', detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_2`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }};
    }
    for(let i=0; i < 3; i++) {
        if (offers[i] === null) {
            offers[i] = { baseId: `empty_slot_${i}_fallback`, classType: 'ability', text:"No More Options", rolledTier: null, visualTier: 'disabled', detailedDescription: "N/A", applyEffect: ()=>{}, cardEffectString: "Unavailable", originalEvolution: { id: `empty_slot_${i}_fallback`, isMaxed: ()=>true, isTiered: false, getEffectString: (p) => "N/A" }};
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
        if (dependencies && dependencies.onEvolutionCompleteCallback) dependencies.onEvolutionCompleteCallback(null, playerInstance);
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


export function handleEvolutionReRoll(playerInstance) {
    if (!playerInstance || playerInstance.evolutionReRollsRemaining <= 0 || playerInstance.isFreezeModeActive || _isBlockModeActiveManager) {
        if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
        return;
    }
    playerInstance.evolutionReRollsRemaining--;
    playerInstance.rerollsUsedThisRun = true; // Track usage for achievement
    if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioEvolutionSound);

    if (playerInstance.frozenEvolutionChoice && playerInstance.hasUsedFreezeForCurrentOffers) {
        playerInstance.hasUsedFreezeForCurrentOffers = false;
    } else if (playerInstance.frozenEvolutionChoice && !playerInstance.hasUsedFreezeForCurrentOffers) {
        playerInstance.frozenEvolutionChoice = null;
    }


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

export function toggleBlockMode(playerInstance) {
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

export function toggleFreezeMode(playerInstance) {
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

    const newFreezeTargetBaseId = uiSelectedChoiceToFreeze.baseId;
    const oldFrozenChoiceData = playerInstance.frozenEvolutionChoice;

    if (oldFrozenChoiceData && oldFrozenChoiceData.choiceData.baseId === newFreezeTargetBaseId) {
        if (playerInstance.hasUsedFreezeForCurrentOffers) {
            playerInstance.frozenEvolutionChoice = null;
            playerInstance.evolutionFreezesRemaining++;
            playerInstance.hasUsedFreezeForCurrentOffers = false;
            if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioUpgradeSound);
        } else {
            if (playerInstance.evolutionFreezesRemaining > 0) {
                playerInstance.evolutionFreezesRemaining--;
                playerInstance.hasUsedFreezeForCurrentOffers = true;
                playerInstance.freezesUsedThisRun = true; // Track usage
                if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioEvolutionSound);
            } else {
                 if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioTargetHitSound);
            }
        }
    }
    else {
        if (playerInstance.evolutionFreezesRemaining > 0) {
            if (oldFrozenChoiceData && playerInstance.hasUsedFreezeForCurrentOffers) {
                 playerInstance.evolutionFreezesRemaining++;
            }

            playerInstance.evolutionFreezesRemaining--;
            playerInstance.freezesUsedThisRun = true; // Track usage
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

    playerInstance.isFreezeModeActive = false;
    _dependencies.UIManager.populateEvolutionOptionsUI(
        _currentlyDisplayedEvolutionOffers, playerInstance,
        (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
        () => handleEvolutionReRoll(playerInstance),
        () => toggleBlockMode(playerInstance),
        GameState.getShrinkMeCooldown(),
        () => toggleFreezeMode(playerInstance),
        handleFreezeSelection,
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
    playerInstance.blocksUsedThisRun = true; // Track usage
    _isBlockModeActiveManager = false; playerInstance.isBlockModeActive = false;
    if (_dependencies.playSound) _dependencies.playSound(_dependencies.audioUpgradeSound);

    if (playerInstance.frozenEvolutionChoice && playerInstance.frozenEvolutionChoice.choiceData.baseId === baseIdToBlock) {
        if (playerInstance.hasUsedFreezeForCurrentOffers) {
            playerInstance.evolutionFreezesRemaining++;
        }
        playerInstance.frozenEvolutionChoice = null;
        playerInstance.hasUsedFreezeForCurrentOffers = false;
    }

    const blockedCardIndex = _currentlyDisplayedEvolutionOffers.findIndex(offer => offer.baseId === baseIdToBlock);

    if (blockedCardIndex !== -1) {
        const otherOfferIds = _currentlyDisplayedEvolutionOffers
            .filter((_, idx) => idx !== blockedCardIndex)
            .map(offer => offer.baseId);

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

    if (_isBlockModeActiveManager || playerInstance.isBlockModeActive) {
        if (uiSelectedChoice.baseId !== 'noMoreEvolutions' && !uiSelectedChoice.baseId.startsWith('empty_slot_')) {
            handleBlockActionOnCard(uiSelectedChoice.baseId, playerInstance);
        } else {
            _isBlockModeActiveManager = false; playerInstance.isBlockModeActive = false;
            _dependencies.UIManager.populateEvolutionOptionsUI(
                 _currentlyDisplayedEvolutionOffers, playerInstance,
                (choice, index) => confirmEvolutionChoice(choice, index, playerInstance),
                () => handleEvolutionReRoll(playerInstance), () => toggleBlockMode(playerInstance),
                GameState.getShrinkMeCooldown(), () => toggleFreezeMode(playerInstance),
                (choice, index) => handleFreezeSelection(choice, index, playerInstance),
                _dependencies.inputState
            );
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
            if (!playerInstance.acquiredEvolutions) {
                playerInstance.acquiredEvolutions = [];
            }
            // <<< BUG FIX: Store 'isTiered' property for better filtering later >>>
            playerInstance.acquiredEvolutions.push({
                id: originalEvo.id,
                isTiered: originalEvo.isTiered, // <-- This is the important part
                rolledTier: uiSelectedChoice.rolledTier, 
                classType: originalEvo.classType 
            });
        }
    }

    if (playerInstance.frozenEvolutionChoice) {
        if (playerInstance.frozenEvolutionChoice.choiceData.baseId === uiSelectedChoice.baseId) {
            playerInstance.frozenEvolutionChoice = null;
        } else {
            if (!playerInstance.hasUsedFreezeForCurrentOffers) {
                playerInstance.frozenEvolutionChoice = null;
            }
        }
    }

    playerInstance.hasUsedFreezeForCurrentOffers = false;
    _isBlockModeActiveManager = false;
    playerInstance.isBlockModeActive = false;
    playerInstance.isFreezeModeActive = false;

    if (_dependencies.onEvolutionCompleteCallback) {
        _dependencies.onEvolutionCompleteCallback(uiSelectedChoice, playerInstance);
    } else {
        console.error("[EvoManager] onEvolutionCompleteCallback is not defined in _dependencies!");
    }
}