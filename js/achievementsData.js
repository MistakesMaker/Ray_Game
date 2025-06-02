// js/achievementsData.js

export const achievementTiers = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
    MASTER: "Master",
    GRANDMASTER: "Grandmaster"
};

export const allAchievements = [
    // --- Easy Tier ---
    {
        id: "color_connoisseur_easy",
        name: "Color Connoisseur",
        description: "Gain immunity to 4 different ray colors in a single run.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_color_connoisseur.png",
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
            scope: "event_first_boss_loot"
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
            bossKey: "any_standard",
            noAbilitiesUsed: true
        }
    },
    {
        id: "tele_frag_easy",
        name: "Tele-Frag",
        description: "Teleport directly onto an enemy Target, destroying it.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_tele_frag.png",
        unlockConditions: {
            type: "event_teleport_kill_target"
        }
    },
    {
        id: "shield_siphon_easy",
        name: "Shield Siphon",
        description: "Absorb 5 enemy rays with Shield Overcharge in a single activation (Mage Path).",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_shield_siphon.png",
        unlockConditions: {
            type: "path_ability_specific_count",
            path: "mage",
            ability: "shieldOvercharge",
            countType: "rays_absorbed_single_activation",
            value: 5
        }
    },
    {
        id: "impact_initiated_easy",
        name: "Impact Initiated",
        description: "Damage a boss using the Aegis Path's passive collision for the first time.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_ramming.png",
        unlockConditions: {
            type: "path_event_first_time",
            path: "aegis",
            eventName: "passive_collision_damage_boss"
        }
    },
    {
        id: "unstoppable_fury_easy",
        name: "Unstoppable Fury",
        description: "Reach 90% bonus damage from the Berserker's Echo low HP effect (Berserker Path).",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_rage.png",
        unlockConditions: {
            type: "player_stat_gte",
            path: "berserker",
            stat: "berserkerRagePercentage",
            value: 90,
            scope: "run"
        }
    },

    // --- Medium Tier ---
    {
        id: "nexus_vanquisher_medium",
        name: "Nexus Vanquisher",
        description: "Defeat the Nexus Weaver boss for the first time.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_nexus_vanquisher.png", // Placeholder
        unlockConditions: {
            type: "event_nexus_weaver_defeated_first_time_run"
        }
    },
    {
        id: "specialized_defense_medium",
        name: "Specialized Defense",
        description: "Gain immunity to 8 different ray colors.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_specialized_defense_medium.png", // Placeholder
        unlockConditions: {
            type: "player_stat_gte",
            stat: "immuneColorsList.length",
            value: 8,
            scope: "run"
        }
    },
    {
        id: "untouchable_streak_medium",
        name: "Untouchable Streak",
        description: "Defeat a boss without taking any damage during the fight.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_untouchable_streak.png", // Placeholder
        unlockConditions: {
            type: "event_boss_defeated_flawless"
        }
    },
    {
        id: "synergist_medium",
        name: "Synergist",
        description: "Have at least 3 \"Core\" evolution upgrades active.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_synergist.png", // Placeholder
        unlockConditions: {
            type: "player_core_evolutions_gte",
            value: 3
        }
    },
    {
        id: "rapid_relocation_medium",
        name: "Rapid Relocation",
        description: "Use the Teleport ability 5 times within 60 seconds.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_rapid_relocation.png", // Placeholder
        unlockConditions: {
            type: "event_rapid_relocation_success"
        }
    },
    {
        id: "well_master_medium",
        name: "Well Master",
        description: "Launch 10+ rays with a single Mini Gravity Well detonation.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_well_master.png", // Placeholder
        unlockConditions: {
            type: "event_player_well_detonated_mage_min_rays", // New specific event type
            minRays: 10
        }
    },
    {
        id: "battering_ram_medium",
        name: "Battering Ram",
        description: "As an Aegis, deal 200 total damage to bosses using Aegis Charge impact.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_battering_ram.png", // Placeholder
        unlockConditions: {
            type: "player_stat_gte",
            stat: "aegisChargeBossDamageDealtThisRun",
            value: 200,
            path: "aegis" // Ensure player is Aegis
        }
    },
    {
        id: "vampiric_thirst_medium",
        name: "Vampiric Thirst",
        description: "As a Berserker, heal for 50+ HP from a single Bloodpact activation.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_vampiric_thirst.png", // Placeholder
        unlockConditions: {
            type: "event_bloodpact_heal_amount", // Event will carry data.healedThisActivation
            minHeal: 50,
            path: "berserker" // Ensure player is Berserker
        }
    },
    {
        id: "war_cry_medium",
        name: "War Cry",
        description: "As a Berserker, fear 2+ enemies with a single Savage Howl.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_war_cry.png", // Placeholder
        unlockConditions: {
            type: "event_savage_howl_fear_count", // Event will carry data.enemiesFeared
            minFeared: 2,
            path: "berserker" // Ensure player is Berserker
        }
    },
    {
        id: "momentum_master_medium",
        name: "Momentum Master",
        description: "Deal over 30 damage with a single ray hit.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_momentum_master.png", // Placeholder
        unlockConditions: {
            type: "event_momentum_ray_hit_high_damage", // Event will carry data.damageDealt and data.momentumBonus
            minDamage: 30
        }
    }
];