// js/achievementsData.js

export const achievementTiers = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
    MASTER: "Master",
    GRANDMASTER: "Grandmaster"
};

export const allAchievements = [
    // --- Easy Tier (from the provided image) ---
    {
        id: "color_connoisseur_easy",
        name: "Color Connoisseur",
        description: "Gain immunity to 4 different ray colors in a single run.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_color_connoisseur.png", // Placeholder
        unlockConditions: {
            type: "player_stat_gte",
            stat: "immuneColorsList.length",
            value: 4,
            scope: "run"
        }
    },
    {
        id: "pathfinder_easy",
        name: "Pathfinder",
        description: "Choose any of the 3 Paths (Aegis, Fury, or Power) after the first boss.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_pathfinder.png",
        unlockConditions: {
            type: "player_stat_not_null",
            stat: "currentPath",
            scope: "event_first_boss_loot" // This scope implies it's checked when the path is chosen
        }
    },
    {
        id: "second_thoughts_easy",
        name: "Second Thoughts",
        description: "Use all 5 re-rolls during a single evolution choice screen.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_reroll.png",
        unlockConditions: {
            type: "evo_interaction_depleted_on_screen",
            resourceStat: "evolutionReRollsRemaining",
            maxResourceConstKey: "MAX_EVOLUTION_REROLLS",
            targetValueAfterUse: 0
        }
    },
    {
        id: "no_thank_you_easy",
        name: "No, Thank You",
        description: "Use all 3 blocks during a single evolution choice screen.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_block.png",
        unlockConditions: {
            type: "evo_interaction_depleted_on_screen",
            resourceStat: "evolutionBlocksRemaining",
            maxResourceConstKey: "MAX_EVOLUTION_BLOCKS",
            targetValueAfterUse: 0
        }
    },
    {
        id: "chill_out_easy",
        name: "Chill Out",
        description: "Use all 3 freezes during a single evolution choice screen.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_freeze.png",
        unlockConditions: {
            type: "evo_interaction_depleted_on_screen",
            resourceStat: "evolutionFreezesRemaining",
            maxResourceConstKey: "MAX_EVOLUTION_FREEZES_PER_RUN",
            targetValueAfterUse: 0
        }
    },
    {
        id: "topped_off_easy",
        name: "Topped Off",
        description: "Pick up a Heart pickup while already at full HP.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_topped_off.png",
        unlockConditions: {
            type: "event_heart_pickup_full_hp"
        }
    },
    {
        id: "close_shave_easy",
        name: "Close Shave",
        description: "Survive an enemy hit that leaves you with less than 10 HP (but more than 0).",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_close_shave.png",
        unlockConditions: {
            type: "event_player_hp_critical_after_hit",
            // The threshold is implicitly handled by the event flag's data if needed,
            // or by the logic that sets the flag in player.js.
            // For this specific achievement, the player.js logic for CLOSE_SHAVE_HP_THRESHOLD is enough.
        }
    },
    {
        id: "ricochet_ace_easy",
        name: "Ricochet Ace",
        description: "Have one of your rays bounce off a wall at least 3 times and then hit any Boss.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_bouncer.png",
        unlockConditions: {
            type: "event_ray_hit_boss_after_bounces",
            minBounces: 3
        }
    },
    {
        id: "resourceful_fighter_easy",
        name: "Resourceful Fighter",
        description: "Defeat a Tier 2 Boss using only your primary fire (no active abilities).",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_resourceful.png",
        unlockConditions: {
            type: "boss_defeat_condition",
            bossTier: 2,
            bossKey: "any_standard", // Implies Chaser, Reflector, or Singularity
            noAbilitiesUsed: true
        }
    },
    {
        id: "tele_frag_easy",
        name: "Tele-Frag",
        description: "Teleport directly onto an enemy Target, destroying it.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_tele_frag.png", // Placeholder
        unlockConditions: {
            type: "event_teleport_kill_target" // Relies on flag from player.js
        }
    },
    {
        id: "shield_siphon_easy",
        name: "Shield Siphon",
        description: "Absorb 5 enemy rays with Shield Overcharge in a single activation (Mage Path).",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_shield_siphon.png", // Placeholder
        unlockConditions: {
            type: "path_ability_specific_count",
            path: "mage",
            ability: "shieldOvercharge",
            countType: "rays_absorbed_single_activation", // This is a conceptual type for the achievement condition
            // The actual check in achievementManager relies on the 'shield_siphon_mage' event flag.
            value: 5 // This value is implicit in the event flag logic
        }
    },
    {
        id: "impact_initiated_easy",
        name: "Impact Initiated",
        description: "Damage a boss using the Aegis Path's passive collision for the first time.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_ramming.png", // Placeholder
        unlockConditions: {
            type: "path_event_first_time",
            path: "aegis",
            eventName: "passive_collision_damage_boss" // Relies on flag from player.js
        }
    },
    {
        id: "unstoppable_fury_easy",
        name: "Unstoppable Fury",
        description: "Reach 90% bonus damage from the Berserker's Echo low HP effect (Berserker Path).",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_rage.png", // Placeholder
        unlockConditions: {
            type: "player_stat_gte",
            path: "berserker", // Ensures it's for the Berserker path
            stat: "berserkerRagePercentage",
            value: 90, // The Berserker's Echo effect grants 9% per 10% missing HP, so 90% bonus implies 10 * 9% = 90% missing HP.
            scope: "run"
        }
    }
];