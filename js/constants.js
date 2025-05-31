// js/constants.js

// Player Constants
export const PLAYER_BASE_RADIUS = 12;
export const MIN_PLAYER_BASE_RADIUS = 5;
export const PLAYER_BASE_COLOR = '#FFFFFF';
export const PLAYER_MAX_HP = 100;
export const RAY_DAMAGE_TO_PLAYER = 10; // Base damage from a generic enemy ray
export const HP_REGEN_PER_PICKUP = 25;
export const HP_REGEN_NO_DAMAGE_THRESHOLD = 10000;
export const HP_REGEN_INTERVAL = 5000;
export let PLAYER_SPEED_BASE = 3.5;
export const PLAYER_AIM_INDICATOR_LENGTH = 25;
export const PLAYER_RAY_INACCURACY_DURING_SHAKE = 0.2;
export const PLAYER_BOUNCE_FORCE_FROM_BOSS = 18;
export const PLAYER_BOUNCE_FORCE_FROM_GRAVITY_BALL = 12;
export const DEFAULT_PLAYER_RADIUS_GROWTH_FACTOR = 0.025;

// Ray Constants
export const RAY_RADIUS = 6;
export const BASE_RAY_SPEED = 1.6;
export const SLOW_RAYS_REDUCTION_FACTOR = 0.97;
export const MIN_RAY_SPEED_MULTIPLIER_AFTER_SLOW = 0.25;
export const REFLECTED_RAY_SPEED_MULTIPLIER = 1.5;
export const GRAVITY_RAY_TURN_RATE = 0.025;
export const PLAYER_GRAVITY_WELL_PULL_STRENGTH = 0.9;
export const PLAYER_GRAVITY_WELL_PULL_RADIUS = 200;
export const PLAYER_GRAVITY_WELL_VISUAL_RADIUS = 20;
export const PLAYER_GRAVITY_WELL_ABSORBED_RAY_COLOR = '#ADD8E6';
export const INITIAL_RAY_COLORS = ['#FF00FF', '#00FF00', '#FFFF00', '#1E90FF'];
export const UNLOCKABLE_RAY_COLORS_LIST = [ '#FF69B4', '#FFA500', '#7FFF00', '#FF4500', '#DA70D6', '#FF1493', '#00CED1', '#BA55D3', '#FF7F50', '#ADFF2F', '#FA8072', '#20B2AA', '#8A2BE2', '#32CD32', '#F0E68C'];
export const NEW_COLOR_UNLOCK_INTERVAL = 200;
export const BASE_RAY_SHOOT_INTERVAL = 550;
export const MIN_RAY_SHOOT_INTERVAL_BASE = 100;
export const SHOOT_INTERVAL_TIME_SCALE_FACTOR = 0.001;
export const SHOOT_INTERVAL_TIME_INITIAL_REDUCTION = 150;
export const RAY_STATIONARY_DURATION_BASE = 0;
export const RAY_FADE_DURATION_BASE = 1000;
export const RAY_SPAWN_GRACE_PERIOD = 700;
export const RAY_SPAWN_FORWARD_OFFSET = 6;
export const MAX_RAY_BOUNCES = 5;
export const ABSOLUTE_MAX_RAY_LIFETIME = 40000;
export const TRAIL_LENGTH = 15;
export const MIN_EFFECTIVE_TRAIL_LENGTH = 2;
export const TRAIL_SPEED_SCALING_FACTOR = 0.6;
export const MAX_EFFECTIVE_TRAIL_LENGTH = 25;
export const BOSS_TRAIL_LENGTH_FACTOR = 0.1;
export const GRAVITY_RAY_TRAIL_LENGTH_FACTOR = 0.3;
export const BASE_RAY_MAX_LIFETIME = 40000;
export const MIN_RAY_MAX_LIFETIME = 10000;
export const RAY_LIFETIME_REDUCTION_PERCENTAGE = 0.20;
export const BASE_BOSS_RAY_LIFETIME = 2000;
export const REFLECTED_RAY_LIFETIME_AFTER_REFLECTION = 4500;
export const GRAVITY_RAY_PROJECTILE_COLOR = '#B22222';
export const GRAVITY_RAY_EXPLOSION_BASE_RADIUS = 30;
export const GRAVITY_RAY_EXPLOSION_RADIUS_PER_RAY = 4;
export const GRAVITY_RAY_EXPLOSION_DURATION = 800;
export const GRAVITY_RAY_DETONATION_EXPLOSION_COLOR = 'rgba(200, 30, 30, opacity)';
export const GRAVITY_RAY_NEW_PROJECTILES_PER_ABSORBED_RAY = 2;
export const GRAVITY_WELL_SCATTER_RAY_LIFETIME = 3000;
export const TELEPORT_IMMUNITY_DURATION = 500;
export const GRAVITY_RAY_SPAWN_ANIM_DURATION = 750;

// Score & UI Constants
export const EVOLUTION_SCORE_INTERVAL = 100;
export const BOSS_REWARD_BASE_SCORE_PER_TIER = 100;
export const POST_POPUP_IMMUNITY_DURATION = 2000;
export const POST_DAMAGE_IMMUNITY_DURATION = 250;
export const SHOOT_INTERVAL_UPDATE_FREQUENCY = 1000;
export const BASE_SURVIVAL_POINTS_INTERVAL = 1250;
export const MIN_SURVIVAL_POINTS_INTERVAL = 400;
export const SURVIVAL_POINTS_INTERVAL_REDUCTION_PER_UPGRADE = 125;
export const SURVIVAL_POINTS_AMOUNT = 1;
export const MAX_SURVIVAL_POINTS_PER_EVOLUTION_CYCLE = 30;
export const MAX_SURVIVAL_UPGRADES = Math.floor((BASE_SURVIVAL_POINTS_INTERVAL - MIN_SURVIVAL_POINTS_INTERVAL) / SURVIVAL_POINTS_INTERVAL_REDUCTION_PER_UPGRADE);
export const SCORE_MULTIPLIER_DURATION = 15000;
export const SCORE_MULTIPLIER_VALUE = 2;
export const BUFF_NOTIFICATION_DURATION = 3000;
export const BUFF_NOTIFICATION_FADE_OUT_START_TIME = 2000;


// Target, Heart, Bonus Point Constants
export const TARGET_RADIUS = 18;
export const TARGET_COLOR = '#FF3333';
export const TARGET_SPAWN_INTERVAL_MS = 2500;
export const HEART_VISUAL_RADIUS = TARGET_RADIUS;
export const HEART_COLLISION_RADIUS = HEART_VISUAL_RADIUS * 0.7;
export const HEART_COLOR = '#FF1493';
export const HEART_SPAWN_INTERVAL_MS = 15000;
export const HEART_LIFESPAN = 10000;
export const BONUS_POINT_RADIUS = 10;
export const BONUS_POINT_COLOR = '#FFD700';
export const BONUS_POINT_VALUE = 50;
export const BONUS_POINT_SPAWN_INTERVAL_MS = 8000;
export const BONUS_POINT_LIFESPAN = 20000;

// Screen Shake Constants
export const SCREEN_SHAKE_DURATION_PLAYER_HIT = 1000;
export const SCREEN_SHAKE_MAGNITUDE_PLAYER_HIT = 8;
export const SCREEN_SHAKE_DURATION_BONUS = 8000;
export const SCREEN_SHAKE_MAGNITUDE_BONUS = 6;
export const SHAKE_DECAY_FACTOR_BASE = 0.93;

// Boss Constants (General)
export const BOSS_PROJECTILE_COLOR_DEFAULT = '#AA0000';
export const REFLECTED_RAY_COLOR = '#A0A0FF';
export const SCATTERED_ABSORBED_RAY_COLOR = '#FF8C00';
export const BOSS_HEALTH_BAR_WIDTH = 100;
export const BOSS_HEALTH_BAR_HEIGHT = 10;
export const BOSS_HEALTH_BAR_COLOR_BG = '#555';
export const BOSS_HEALTH_BAR_COLOR_FG = '#FF0000';
export const BOSS_HEALTH_BAR_OFFSET_Y = 30;
export const BOSS_WARNING_DURATION = 2500;
export const BOSS_SPAWN_START_SCORE = 300;
export const BOSS_SPAWN_SCORE_INTERVAL = 300;
export const MAX_TOTAL_ACTIVE_RAYS_BEFORE_BOSS_THROTTLE = 75;
export const MAX_BOSSES_IN_WAVE_CAP = 1000; // Max bosses that can spawn *within a single wave event*

// ---- Nexus Weaver Boss Constants ----
export const NEXUS_WEAVER_BASE_HP = 100;
export const NEXUS_WEAVER_HP_PER_TIER_FACTOR = 0.45;
export const NEXUS_WEAVER_RADIUS_BASE = 35;
export const NEXUS_WEAVER_RADIUS_PER_TIER = 2;
export const NEXUS_WEAVER_COLOR = '#4B0082'; // Indigo
export const NEXUS_WEAVER_BASE_SPEED = 0.3;
export const NEXUS_WEAVER_SPEED_PER_TIER = 0.02;
export const NEXUS_WEAVER_MAX_MINIONS_BASE = 5;
export const NEXUS_WEAVER_MAX_MINIONS_PER_TIER = 2;
export const NEXUS_WEAVER_SPAWN_COOLDOWN_BASE = 5500; // ms
export const NEXUS_WEAVER_SPAWN_COOLDOWN_REDUCTION_PER_TIER = 200; // ms
export const NEXUS_WEAVER_SPAWN_TELL_DURATION = 1000; // ms
// Pulse Nova (Nexus Weaver Attack)
export const PULSE_NOVA_DAMAGE = 10;
export const PULSE_NOVA_RADIUS_FACTOR = 4; // Multiplier of boss's current radius
export const PULSE_NOVA_DURATION = 600; // ms for expansion
export const PULSE_NOVA_COOLDOWN = 8000; // ms
export const PULSE_NOVA_CLOSE_RANGE_THRESHOLD_FACTOR = 2.5; // Player closer than boss.radius * this
export const PULSE_NOVA_CLOSE_RANGE_DURATION_TRIGGER = 2000; // Player must be close for this long

// ---- Minion Constants (for Nexus Weaver) ----
// Drone Minion
export const DRONE_HP = 30;
export const DRONE_DAMAGE = 25; // Damage dealt to player on contact
export const DRONE_BASE_SPEED = 3;
export const DRONE_SPEED_PER_TIER = 0.1;
export const DRONE_RADIUS = 10;
export const DRONE_COLOR = '#C71585'; // MediumVioletRed
// Lancer Minion
export const LANCER_HP = 30;
export const LANCER_DAMAGE = 20; // Damage dealt to player on contact
export const LANCER_BASE_SPEED = 2; // Roaming speed
export const LANCER_SPEED_PER_TIER = 0.25;
export const LANCER_DASH_SPEED_BASE = 6;
export const LANCER_DASH_SPEED_PER_TIER = 0.25;
export const LANCER_RADIUS = 11;
export const LANCER_COLOR = '#8A2BE2'; // BlueViolet
export const LANCER_AIM_TIME = 800; // ms
export const LANCER_DASH_DURATION = 600; // ms
export const LANCER_POST_DASH_COOLDOWN = 1000; // ms
// Orbiter Minion
export const ORBITER_HP = 15;
export const ORBITER_RADIUS = 12;
export const ORBITER_COLOR = '#DA70D6'; // Orchid
export const ORBITER_ORBIT_DISTANCE_BASE = 120;
export const ORBITER_ORBIT_DISTANCE_PER_TIER = 15;
export const ORBITER_ORBIT_SPEED = 0.0015; // Radians per ms
export const ORBITER_SHOOT_COOLDOWN_BASE = 3500; // ms
export const ORBITER_SHOOT_COOLDOWN_REDUCTION_PER_TIER = 150; // ms
export const ORBITER_PROJECTILE_RADIUS = 5;
export const ORBITER_PROJECTILE_SPEED = 2.8; // Absolute speed, will be converted to multiplier in main.js
export const ORBITER_PROJECTILE_DAMAGE = 10;
export const ORBITER_PROJECTILE_COLOR = '#FF00FF'; // Magenta
export const ORBITER_PROJECTILE_LIFETIME = 2500; // ms


// Evolution Upgrade Constants
export const BASE_PICKUP_ATTRACTION_RADIUS = 0;
export const ATTRACTION_RADIUS_PER_LEVEL = 30;
export const MAX_PICKUP_ATTRACTION_LEVELS = 3;
export const MAX_SCATTER_SHOT_LEVELS = 2;
export const SCATTER_SHOT_ANGLE_OFFSET = 0.20;
export const MAX_OWN_RAY_SPEED_MULTIPLIER = 2.0;
export const OWN_RAY_SPEED_INCREMENT = 0.20;
export const CHAIN_REACTION_RADIUS = 80;
export const CHAIN_REACTION_EXPLOSION_DURATION = 300;
export const CHAIN_REACTION_EXPLOSION_COLOR = 'rgba(255, 165, 0, opacity)';
export const MAX_HP_PICKUP_BONUS = 15;
export const HP_PICKUP_BONUS_PER_LEVEL = 10;
// ---- NEW EVOLUTION INTERACTION CONSTANTS ----
export const MAX_EVOLUTION_REROLLS = 5;
export const MAX_EVOLUTION_BLOCKS = 3;
export const MAX_EVOLUTION_FREEZES_PER_RUN = 3;


// ---- Tiered Evolution Values ----
export const REINFORCED_HULL_TIER_EFFECTIVENESS = {
    common: 0.07,
    rare: 0.10,
    epic: 0.14,
    legendary: 0.20
};
export const VITALITY_SURGE_TIER_BONUS = {
    common: 0.5,
    rare: 1.0,
    epic: 1.5,
    legendary: 2.0
};
export const FORTIFIED_CORE_TIER_BONUS = {
    common: 5,
    rare: 10,
    epic: 18,
    legendary: 30
};
export const DEFAULT_KINETIC_CHARGE_RATE_PER_LEVEL = 0.25;
export const DEFAULT_KINETIC_ADDITIONAL_DAMAGE_BONUS_PER_LEVEL = 0.20;
export const KINETIC_CONVERSION_TIER_SCALING = {
    common:    { rateBonus: 0,    dmgBonus: 0 },
    rare:      { rateBonus: 0.05, dmgBonus: 0.02 },
    epic:      { rateBonus: 0.12, dmgBonus: 0.05 },
    legendary: { rateBonus: 0.25, dmgBonus: 0.10 }
};
export const TEMPORAL_ECHO_TIER_CHANCE = {
    common: 3,
    rare: 7,
    epic: 15,
    legendary: 25
};
export const STREAMLINED_SYSTEMS_TIER_REDUCTION = {
    common: 3,
    rare: 5,
    epic: 7,
    legendary: 10
};
export const FOCUSED_BEAM_TIER_DAMAGE = {
    common: 0.5,
    rare: 1.0,
    epic: 1.75,
    legendary: 3.0
};
export const UNSTABLE_CORE_TIER_CHANCE = {
    common: 3,
    rare: 5,
    epic: 8,
    legendary: 12
};
export const ABILITY_POTENCY_TIER_MULTIPLIER = {
    common: 1.07,
    rare: 1.10,
    epic: 1.15,
    legendary: 1.22
};
export const RAY_CRIT_CHANCE_TIER_BONUS = { common: 0.02, rare: 0.04, epic: 0.08, legendary: 0.15 };
export const RAY_CRIT_DAMAGE_TIER_BONUS = { common: 0.10, rare: 0.15, epic: 0.25, legendary: 0.40 };
export const ABILITY_CRIT_CHANCE_TIER_BONUS = { common: 0.02, rare: 0.04, epic: 0.08, legendary: 0.15 };
export const ABILITY_CRIT_DAMAGE_TIER_BONUS = { common: 0.10, rare: 0.15, epic: 0.25, legendary: 0.40 };
// ---- End Tiered Evolution Values ----


// ---- Unique Path Buff Constants ----
export const PERFECT_HARMONY_NO_DAMAGE_DURATION_THRESHOLD = 5000; // Was Path of Harmony

export const BERSERKERS_ECHO_DAMAGE_PER_10_HP = 0.09;
export const BERSERKERS_ECHO_SPEED_PER_10_HP = 0.03;

// Kinetic Conversion - Base values (player object holds these)
export const KINETIC_INITIAL_DAMAGE_BONUS = 0.30;
export const KINETIC_BASE_CHARGE_RATE = 1.0;

// ---- NEW: Aegis Path (Juggernaut) Constants ----
export const AEGIS_PATH_BASE_COLLISION_DAMAGE = 1; // Flat damage per collision
export const AEGIS_PATH_MAX_HP_SCALING_FACTOR = 0.05; // Damage = base + (maxHP * factor)
export const AEGIS_PATH_RADIUS_SCALING_FACTOR = 0.1; // Damage += (radius * factor)
export const AEGIS_PATH_BOSS_KNOCKBACK_FORCE = 30; // Base knockback force on boss
export const AEGIS_PATH_PLAYER_SELF_KNOCKBACK_FACTOR = 0.3; // Player gets knocked back a bit too
// ---- END Unique Path Buff Constants ----

// ---- Path-Specific Mouse Abilities Constants ----

// -- Aegis Path (Tank) --
// LMB: Aegis Charge
export const AEGIS_CHARGE_MAX_CHARGE_TIME = 5000; // ms
export const AEGIS_CHARGE_MIN_DAMAGE = 20;
export const AEGIS_CHARGE_MAX_DAMAGE_SCALE_PER_SECOND_CHARGED = 0.25; // e.g., 0.5 means +50% max damage per second charged
export const AEGIS_CHARGE_AOE_RADIUS = 60;
export const AEGIS_CHARGE_DR_DURING_DASH = 0.50; // 50% damage reduction
export const AEGIS_CHARGE_COOLDOWN = 15000; // ms
export const AEGIS_CHARGE_DASH_SPEED_FACTOR = 8; // Multiplier of base player speed

// RMB: Seismic Slam
export const SEISMIC_SLAM_DAMAGE_BASE = 10;
export const SEISMIC_SLAM_DAMAGE_MAXHP_SCALE = 0.05; // 5% of MaxHP added to damage
export const SEISMIC_SLAM_DAMAGE_RADIUS_SCALE = 0.1; // 0.5 damage per unit of player radius
export const SEISMIC_SLAM_AOE_RADIUS = 350;
export const SEISMIC_SLAM_KNOCKBACK_FORCE_NON_BOSS = 15;
export const SEISMIC_SLAM_BOSS_STAGGER_DURATION = 2000; // ms
export const SEISMIC_SLAM_BOSS_KNOCKBACK_MINOR = 5;
export const SEISMIC_SLAM_COOLDOWN = 18000; // ms

// -- Berserker's Echo Path (Fury) --
// LMB: Bloodpact
export const BLOODPACT_DURATION = 5000; // ms
export const BLOODPACT_LIFESTEAL_PERCENT = 0.10; // 10% lifesteal on auto-fired rays
export const BLOODPACT_COOLDOWN = 15000; // ms

// RMB: Savage Howl
export const SAVAGE_HOWL_FEAR_RADIUS = 350;
export const SAVAGE_HOWL_FEAR_DURATION = 3000; // ms
export const SAVAGE_HOWL_ATTACK_SPEED_BUFF_PERCENT = 0.30; // 30% faster auto-fire
export const SAVAGE_HOWL_ATTACK_SPEED_BUFF_DURATION = 7000; // ms
export const SAVAGE_HOWL_COOLDOWN = 22000; // ms

// -- Ultimate Configuration Path (Mage) --
// LMB: Omega Laser (Existing constants)
export const OMEGA_LASER_DURATION = 2500;
export const OMEGA_LASER_COOLDOWN = 20000;
export const OMEGA_LASER_DAMAGE_PER_TICK = 3;
export const OMEGA_LASER_TICK_INTERVAL = 100;
export const OMEGA_LASER_RANGE = 2000;
export const OMEGA_LASER_WIDTH = 15;

// RMB: Shield Overcharge (Existing constants)
export const SHIELD_OVERCHARGE_DURATION = 5000;
export const SHIELD_OVERCHARGE_COOLDOWN = 25000;
export const SHIELD_OVERCHARGE_HEAL_PER_RAY = 2;
// ---- END Path-Specific Mouse Abilities Constants ----

// Misc
export const INITIAL_RAY_POOL_SIZE = 300;