// js/achievementsData.js

export const achievementTiers = {
    EASY: "Easy",
    MEDIUM: "Medium",
    HARD: "Hard",
    MASTER: "Master",
    GRANDMASTER: "Grandmaster",
    OMEGA: "Omega"
};

export const allAchievements = [
    // --- Easy Tier ---
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
        iconPath: "assets/icons/ach_pathfinder.png", // Placeholder
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
        iconPath: "assets/icons/ach_reroll.png", // Placeholder
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
        iconPath: "assets/icons/ach_block.png", // Placeholder
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
        iconPath: "assets/icons/ach_freeze.png", // Placeholder
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
        iconPath: "assets/icons/ach_topped_off.png", // Placeholder
        unlockConditions: {
            type: "event_heart_pickup_full_hp"
        }
    },
    {
        id: "close_shave_easy",
        name: "Close Shave",
        description: "Survive an enemy hit that leaves you with less than 10 HP (but more than 0).",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_close_shave.png", // Placeholder
        unlockConditions: {
            type: "event_player_hp_critical_after_hit",
        }
    },
    {
        id: "ricochet_ace_easy",
        name: "Ricochet Ace",
        description: "Have one of your rays bounce off a wall at least 3 times and then hit any Boss.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_bouncer.png", // Placeholder
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
        iconPath: "assets/icons/ach_resourceful.png", // Placeholder
        unlockConditions: {
            type: "boss_defeat_condition",
            bossTier: 2,
            bossKey: "any_standard",
            noAbilitiesUsed: true
        }
    },
    { // MODIFIED ACHIEVEMENT
        id: "aegis_warp_slam_easy", // New ID
        name: "Warp Slam",
        description: "As Aegis, defeat a Boss by teleporting onto it for the finishing blow while Aegis Charge is active (charging or dashing).",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_aegis_tele_frag.png", // New placeholder icon
        unlockConditions: {
            type: "event_aegis_teleport_impact_kill", // New event type
            path: "aegis" // Condition to ensure player is Aegis
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
            countType: "rays_absorbed_single_activation",
            value: 5
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
            eventName: "passive_collision_damage_boss"
        }
    },
    {
        id: "unstoppable_fury_easy",
        name: "Unstoppable Fury",
        description: "Maintain 70% or higher bonus damage from the Berserker's Echo low HP effect for 5 consecutive seconds.",
        tier: achievementTiers.EASY,
        iconPath: "assets/icons/ach_rage.png",
        unlockConditions: {
            type: "player_stat_duration_gte",
            path: "berserker",
            stat: "berserkerUnstoppableFuryTimer",
            statThreshold: 70, // <<< NEW THRESHOLD PROPERTY
            durationMs: 5000
        }
    },

    // --- Medium Tier ---
    {
        id: "nexus_vanquisher_medium",
        name: "Nexus Vanquisher",
        description: "Defeat the Nexus Weaver boss for the first time.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_nexus_vanquisher.png", 
        unlockConditions: {
            type: "event_nexus_weaver_defeated_first_time_run"
        }
    },
    {
        id: "specialized_defense_medium",
        name: "Specialized Defense",
        description: "Gain immunity to 8 different ray colors.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_specialized_defense_medium.png", 
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
        iconPath: "assets/icons/ach_untouchable_streak.png", 
        unlockConditions: {
            type: "event_boss_defeated_flawless"
        }
    },
    {
        id: "synergist_medium",
        name: "Synergist",
        description: "Have at least 3 \"Core\" evolution upgrades active.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_synergist.png", 
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
        iconPath: "assets/icons/ach_rapid_relocation.png", 
        unlockConditions: {
            type: "event_rapid_relocation_success"
        }
    },
    {
        id: "well_master_medium",
        name: "Well Master",
        description: "As a Mage, launch 10+ rays with a single Mini Gravity Well detonation.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_well_master.png", 
        unlockConditions: {
            type: "event_player_well_detonated_mage_min_rays",
            minRays: 10
        }
    },
    {
        id: "battering_ram_medium",
        name: "Battering Ram",
        description: "As an Aegis, deal 200 total damage to bosses using Aegis Charge impact.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_battering_ram.png", 
        unlockConditions: {
            type: "player_stat_gte",
            stat: "aegisChargeBossDamageDealtThisRun",
            value: 200,
            path: "aegis"
        }
    },
    {
        id: "vampiric_thirst_medium",
        name: "Vampiric Thirst",
        description: "As a Berserker, heal for 30+ HP from a single Bloodpact activation.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_vampiric_thirst.png", 
        unlockConditions: {
            type: "event_bloodpact_heal_amount",
            minHeal: 30,
            path: "berserker"
        }
    },
    {
        id: "war_cry_medium",
        name: "War Cry",
        description: "As a Berserker, fear 2+ enemies with a single Savage Howl.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_war_cry.png", 
        unlockConditions: {
            type: "event_savage_howl_fear_count",
            minFeared: 2,
            path: "berserker"
        }
    },
    {
        id: "momentum_master_medium",
        name: "Momentum Master",
        description: "Deal over 30 damage with a single ray hit due to Momentum Injectors.",
        tier: achievementTiers.MEDIUM,
        iconPath: "assets/icons/ach_momentum_master.png", 
        unlockConditions: {
            type: "event_momentum_ray_hit_high_damage",
            minDamage: 30
        }
    },

    // --- Hard Tier ---
    {
        id: "nexus_blitz_t1_hard", 
        name: "Nexus Blitz: Tier 1",
        description: "Defeat Nexus Weaver Tier 1 within 2 minutes.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_nexus_blitz_t1_hard.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 1,
            timeLimitMs: 120000 
        }
    },
    {
        id: "nexus_blitz_t2_hard", 
        name: "Nexus Blitz: Tier 2",
        description: "Defeat Nexus Weaver Tier 2 within 3 minutes 15 seconds.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_nexus_blitz_t2_hard.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 2,
            timeLimitMs: 195000 
        }
    },
    {
        id: "nexus_blitz_t3_hard", 
        name: "Nexus Blitz: Tier 3",
        description: "Defeat Nexus Weaver Tier 3 within 4 minutes 30 seconds.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_nexus_blitz_t3_hard.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 3,
            timeLimitMs: 270000 
        }
    },
    {
        id: "nexus_nemesis_hard",
        name: "Nexus Nemesis",
        description: "Defeat the Nexus Weaver without using any abilities.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_nexus_nemesis.png", 
        unlockConditions: {
            type: "event_nexus_weaver_defeated_no_abilities_strict"
        }
    },
    {
        id: "glass_cannon_connoisseur_hard",
        name: "Glass Cannon Connoisseur",
        description: "Defeat a Tier 6 standard boss without acquiring any \"Tank\" class evolution upgrades.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_glass_cannon.png", 
        unlockConditions: {
            type: "event_standard_boss_tX_defeated_no_class_evo",
            bossTier: 6,
            excludedClass: "tank"
        }
    },
    {
        id: "flawless_victory_x3_hard",
        name: "Flawless Victory x3",
        description: "Defeat 3 different bosses flawlessly in a single run.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_flawless_x3.png", 
        unlockConditions: {
            type: "event_multi_unique_boss_flawless_any_type", 
            count: 3
        }
    },
    {
        id: "legendary_hoarder_hard",
        name: "Legendary Hoarder",
        description: "Acquire 3 different Legendary tier evolution upgrades in a single run.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_legendary_hoarder.png", 
        unlockConditions: {
            type: "player_unique_legendary_evolutions_gte",
            value: 3
        }
    },
    {
        id: "true_mage_hard",
        name: "True Mage",
        description: "As Mage, defeat Nexus Weaver Tier 2 using only Omega Laser and Mini Gravity Well for damage.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_true_mage.png", 
        unlockConditions: {
            type: "path_boss_ability_only_kill",
            path: "mage",
            bossKey: "nexusWeaver",
            bossTier: 2,
            allowedAbilities: ["omegaLaser", "miniGravityWell"]
        }
    },
    {
        id: "true_aegis_hard",
        name: "True Aegis",
        description: "As Aegis, defeat Nexus Weaver Tier 2 using only Aegis Charge/Passive and Seismic Slam for damage.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_true_aegis.png", 
        unlockConditions: {
            type: "path_boss_ability_only_kill",
            path: "aegis",
            bossKey: "nexusWeaver",
            bossTier: 2,
            allowedAbilities: ["aegisCharge", "seismicSlam", "aegisPassive"]
        }
    },
    {
        id: "true_berserker_hard",
        name: "True Berserker",
        description: "As Berserker, defeat Nexus Weaver Tier 2 while Bloodpact & Savage Howl buffs are active.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_true_berserker.png", 
        unlockConditions: {
            type: "path_boss_buffed_kill",
            path: "berserker",
            bossKey: "nexusWeaver",
            bossTier: 2,
            requiredBuffs: ["bloodpact", "savageHowl"]
        }
    },
    {
        id: "max_efficiency_hard",
        name: "Max Efficiency",
        description: "Defeat any Tier 5 boss with more than 75% HP remaining.",
        tier: achievementTiers.HARD,
        iconPath: "assets/icons/ach_max_efficiency.png", 
        unlockConditions: {
            type: "event_tX_boss_defeated_high_hp",
            bossTier: 5,
            minHpPercent: 0.75
        }
    },


    // --- Master Tier ---
    {
        id: "omega_survivor_master",
        name: "Omega Survivor",
        description: "Reach a Survival score of 15,000.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_omega_survivor.png", 
        unlockConditions: {
            type: "gamestate_score_gte",
            value: 15000
        }
    },
    {
        id: "nexus_blitz_t1_master",
        name: "Nexus Blitz: Tier 1",
        description: "Defeat Nexus Weaver Tier 1 within 1 minute 30 seconds.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_nexus_blitz_t1_master.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 1,
            timeLimitMs: 90000
        }
    },
    {
        id: "nexus_blitz_t2_master",
        name: "Nexus Blitz: Tier 2",
        description: "Defeat Nexus Weaver Tier 2 within 2 minutes 45 seconds.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_nexus_blitz_t2_master.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 2,
            timeLimitMs: 165000
        }
    },
    {
        id: "nexus_blitz_t3_master",
        name: "Nexus Blitz: Tier 3",
        description: "Defeat Nexus Weaver Tier 3 within 3 minutes 30 seconds.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_nexus_blitz_t3_master.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 3,
            timeLimitMs: 210000
        }
    },
    {
        id: "nexus_blitz_t4_master",
        name: "Nexus Blitz: Tier 4",
        description: "Defeat Nexus Weaver Tier 4 within 4 minutes 30 seconds.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_nexus_blitz_t4_master.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 4,
            timeLimitMs: 270000
        }
    },
    {
        id: "nexus_blitz_t5_master",
        name: "Nexus Blitz: Tier 5",
        description: "Defeat Nexus Weaver Tier 5 within 5 minutes 30 seconds.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_nexus_blitz_t5_master.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 5,
            timeLimitMs: 330000
        }
    },
    {
        id: "pacifist_lord_master",
        name: "The Pacifist Lord",
        description: "Defeat Nexus Weaver Tier 3 without destroying any of its summoned minions during that specific fight.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_pacifist_lord.png", 
        unlockConditions: {
            type: "event_nexus_t3_defeated_no_minions_killed"
        }
    },
    {
        id: "flawless_gauntlet_master",
        name: "Flawless Gauntlet",
        description: "Defeat all 3 different standard boss types (Chaser, Reflector, Singularity) flawlessly in a single run.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_flawless_gauntlet.png", 
        unlockConditions: {
            type: "event_multi_unique_standard_boss_flawless",
            count: 3
        }
    },
    {
        id: "collector_supreme_master",
        name: "Collector Supreme",
        description: "Acquire 5 different Legendary tier evolution upgrades in a single run.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_collector_supreme.png", 
        unlockConditions: {
            type: "player_unique_legendary_evolutions_gte",
            value: 5
        }
    },
    {
        id: "apex_predator_master",
        name: "Apex Predator",
        description: "As Berserker, defeat Nexus Weaver Tier 5 while Bloodpact & Savage Howl are active.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_apex_predator.png", 
        unlockConditions: {
            type: "path_boss_buffed_kill",
            path: "berserker",
            bossKey: "nexusWeaver",
            bossTier: 5,
            requiredBuffs: ["bloodpact", "savageHowl"]
        }
    },
    {
        id: "unpicker_master",
        name: "The Unpicker",
        description: "Defeat Nexus Weaver Tier 3 without picking up any Heart or Bonus Point pickups.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_unpicker.png", 
        unlockConditions: {
            type: "event_nexus_t3_defeated_no_pickups"
        }
    },
    {
        id: "sustained_fury_master",
        name: "Sustained Fury",
        description: "As Berserker, maintain over 50% Berserker Rage bonus for 2 continuous minutes.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_sustained_fury.png", 
        unlockConditions: {
            type: "player_stat_duration_gte",
            stat: "berserkerRageHighDurationTimer",
            statThreshold: 50, 
            durationMs: 120000, 
            path: "berserker"
        }
    },
    {
        id: "kinetic_cascade_master",
        name: "Kinetic Cascade",
        description: "As Mage, have Kinetic Conversion empower 3 different abilities (Omega Laser, Mini Gravity Well, any one numeric ability) within 30s.",
        tier: achievementTiers.MASTER,
        iconPath: "assets/icons/ach_kinetic_cascade.png", 
        unlockConditions: {
            type: "event_kinetic_cascade_mage"
        }
    },
    
    // --- GRANDMASTER Tier ---
    {
        id: "nexus_blitz_t1_gm",
        name: "Nexus Blitz: Tier 1",
        description: "Defeat Nexus Weaver Tier 1 within 1 minute 15 seconds.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_nexus_blitz_t1.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 1,
            timeLimitMs: 75000 
        }
    },
    {
        id: "nexus_blitz_t2_gm",
        name: "Nexus Blitz: Tier 2",
        description: "Defeat Nexus Weaver Tier 2 within 2 minutes 15 seconds.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_nexus_blitz_t2.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 2,
            timeLimitMs: 135000 
        }
    },
    {
        id: "nexus_blitz_t3_gm",
        name: "Nexus Blitz: Tier 3",
        description: "Defeat Nexus Weaver Tier 3 within 3 minutes 15 seconds.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_nexus_blitz_t3.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 3,
            timeLimitMs: 195000 
        }
    },
    {
        id: "nexus_blitz_t4_gm",
        name: "Nexus Blitz: Tier 4",
        description: "Defeat Nexus Weaver Tier 4 within 3 minutes 45 seconds.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_nexus_blitz_t4.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 4,
            timeLimitMs: 225000 
        }
    },
    {
        id: "nexus_blitz_t5_gm",
        name: "Nexus Blitz: Tier 5",
        description: "Defeat Nexus Weaver Tier 5 within 4 minutes 15 seconds.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_nexus_blitz_t5.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 5,
            timeLimitMs: 255000 
        }
    },
    {
        id: "untouchable_god_gm",
        name: "The Untouchable God",
        description: "Defeat Nexus Weaver Tier 1 without taking any damage during the entire run.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_untouchable.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_flawless_run", 
            bossTier: 1 
        }
    },
    {
        id: "one_shot_wonder_gm",
        name: "One Shot Wonder",
        description: "Deal over 50 damage with a single ray hit.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_one_shot.png", 
        unlockConditions: {
            type: "event_momentum_ray_hit_high_damage",
            minDamage: 50 
        }
    },
    {
        id: "rage_eternal_gm",
        name: "Rage Eternal",
        description: "As Berserker, defeat Nexus Weaver Tier 5 while maintaining over 80% Berserker Rage for the entire fight.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_rage_eternal.png", 
        unlockConditions: {
            type: "event_berserker_boss_high_rage_kill", 
            bossKey: "nexusWeaver",
            bossTier: 5,
        }
    },
    {
        id: "collector_mythic_gm",
        name: "The Collector: Mythic",
        description: "Acquire 7 different Legendary tier evolution upgrades in a single run.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_collector_mythic.png", 
        unlockConditions: {
            type: "player_unique_legendary_evolutions_gte",
            value: 7
        }
    },
    {
        id: "score_god_gm",
        name: "Score God",
        description: "Reach a Survival score of 30,000.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_score_god.png", 
        unlockConditions: {
            type: "gamestate_score_gte",
            value: 30000
        }
    },
    {
        id: "archmage_ascendant_gm",
        name: "Archmage Ascendant",
        description: "As Mage, defeat Nexus Weaver Tier 5 using only Omega Laser for all damage to the boss.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_archmage.png", 
        unlockConditions: {
            type: "path_boss_ability_only_kill",
            path: "mage",
            bossKey: "nexusWeaver",
            bossTier: 5,
            allowedAbilities: ["omegaLaser"] 
        }
    },
    {
        id: "no_rerolls_no_regrets_gm",
        name: "No Re-rolls, No Regrets",
        description: "Defeat Nexus Weaver Tier 5 without using any Re-rolls, Blocks, or Freezes during the entire run.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_no_assists.png", 
        unlockConditions: {
            type: "event_nexus_tX_defeated_no_evo_interaction_use", 
            bossTier: 5
        }
    },
    { 
        id: "boss_slayer_supreme_gm",
        name: "Boss Slayer Supreme",
        description: "Defeat any standard boss (Chaser, Reflector, or Singularity) at Tier 20 or higher in a single run.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_boss_slayer.png", 
        unlockConditions: {
            type: "event_any_standard_boss_tier_X_defeated", 
            minTier: 20 
        }
    },
    {
        id: "nexus_obliterator_gm",
        name: "Nexus Obliterator",
        description: "Defeat Nexus Weaver Tier 10.",
        tier: achievementTiers.GRANDMASTER,
        iconPath: "assets/icons/ach_gm_nexus_obliterator.png", 
        unlockConditions: {
            type: "event_nexus_weaver_defeated", 
            bossTier: 10 
        }
    },

    // --- OMEGA Tier ---
    {
        id: "omega_survivor_apex",
        name: "Omega Survivor",
        description: "Reach a Survival score of 50,000.",
        tier: achievementTiers.OMEGA,
        iconPath: "assets/icons/ach_omega_score_apex.png",
        unlockConditions: {
            type: "gamestate_score_gte",
            value: 50000
        }
    },
    {
        id: "nexus_blitz_t1_omega",
        name: "Nexus Blitz: Tier 1",
        description: "Defeat Nexus Weaver Tier 1 within 1 minute.",
        tier: achievementTiers.OMEGA,
        iconPath: "assets/icons/ach_omega_blitz_t1.png",
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 1,
            timeLimitMs: 60000 
        }
    },
    {
        id: "nexus_blitz_t2_omega",
        name: "Nexus Blitz: Tier 2",
        description: "Defeat Nexus Weaver Tier 2 within 2 minutes.",
        tier: achievementTiers.OMEGA,
        iconPath: "assets/icons/ach_omega_blitz_t2.png",
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 2,
            timeLimitMs: 120000 
        }
    },
    {
        id: "nexus_blitz_t3_omega",
        name: "Nexus Blitz: Tier 3",
        description: "Defeat Nexus Weaver Tier 3 within 3 minutes.",
        tier: achievementTiers.OMEGA,
        iconPath: "assets/icons/ach_omega_blitz_t3.png",
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 3,
            timeLimitMs: 180000 
        }
    },
    {
        id: "nexus_blitz_t4_omega",
        name: "Nexus Blitz: Tier 4",
        description: "Defeat Nexus Weaver Tier 4 within 3 minutes 30 seconds.",
        tier: achievementTiers.OMEGA,
        iconPath: "assets/icons/ach_omega_blitz_t4.png",
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 4,
            timeLimitMs: 210000 
        }
    },
    {
        id: "nexus_blitz_t5_omega",
        name: "Nexus Blitz: Tier 5",
        description: "Defeat Nexus Weaver Tier 5 within 4 minutes.",
        tier: achievementTiers.OMEGA,
        iconPath: "assets/icons/ach_omega_blitz_t5.png",
        unlockConditions: {
            type: "event_nexus_tX_defeated_within_time",
            bossTier: 5,
            timeLimitMs: 240000 
        }
    },
    { 
        id: "boss_slayer_supreme_omega",
        name: "Boss Slayer Supreme",
        description: "Defeat any standard boss (Chaser, Reflector, or Singularity) at Tier 30 or higher in a single run.",
        tier: achievementTiers.OMEGA,
        iconPath: "assets/icons/ach_omega_boss_slayer.png", 
        unlockConditions: {
            type: "event_any_standard_boss_tier_X_defeated", 
            minTier: 30 
        }
    },
    {
        id: "nexus_obliterator_omega",
        name: "Nexus Obliterator",
        description: "Defeat Nexus Weaver Tier 15.",
        tier: achievementTiers.OMEGA,
        iconPath: "assets/icons/ach_omega_nexus_obliterator.png", 
        unlockConditions: {
            type: "event_nexus_weaver_defeated", 
            bossTier: 15 
        }
    },
];