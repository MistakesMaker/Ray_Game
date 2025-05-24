// js/constants.js

// Player Constants
export const PLAYER_BASE_RADIUS = 12;
export const MIN_PLAYER_BASE_RADIUS = 5;
export const PLAYER_BASE_COLOR = '#FFFFFF';
export const PLAYER_MAX_HP = 100;
export const RAY_DAMAGE_TO_PLAYER = 10;
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

// Boss Constants
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
export const MAX_BOSSES_IN_WAVE_CAP = 1000; 

// Evolution Upgrade Constants (Base values for non-tiered or default)
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
// ---- NEW CRITICAL HIT CONSTANTS ----
export const RAY_CRIT_CHANCE_TIER_BONUS = { common: 0.02, rare: 0.04, epic: 0.08, legendary: 0.15 };
export const RAY_CRIT_DAMAGE_TIER_BONUS = { common: 0.10, rare: 0.15, epic: 0.25, legendary: 0.40 };
export const ABILITY_CRIT_CHANCE_TIER_BONUS = { common: 0.02, rare: 0.04, epic: 0.08, legendary: 0.15 };
export const ABILITY_CRIT_DAMAGE_TIER_BONUS = { common: 0.10, rare: 0.15, epic: 0.25, legendary: 0.40 };
// ---- End Tiered Evolution Values ----


// ---- Unique Path Buff Constants ----
export const PERFECT_HARMONY_NO_DAMAGE_DURATION_THRESHOLD = 5000; 
export const PERFECT_HARMONY_RAY_DAMAGE_BONUS = 0.20;   
export const PERFECT_HARMONY_SPEED_BONUS = 0.15;      
export const PERFECT_HARMONY_COOLDOWN_REDUCTION = 0.20; 

export const BERSERKERS_ECHO_DAMAGE_PER_10_HP = 0.09; 
export const BERSERKERS_ECHO_SPEED_PER_10_HP = 0.03;  

// Kinetic Conversion - Base values (player object holds these)
export const KINETIC_INITIAL_DAMAGE_BONUS = 0.30;
export const KINETIC_BASE_CHARGE_RATE = 1.0; 
// ---- END Unique Path Buff Constants ----

// Mouse Abilities Constants
export const OMEGA_LASER_DURATION = 2500;
export const OMEGA_LASER_COOLDOWN = 20000;
export const OMEGA_LASER_DAMAGE_PER_TICK = 3;
export const OMEGA_LASER_TICK_INTERVAL = 100;
export const OMEGA_LASER_RANGE = 2000;
export const OMEGA_LASER_WIDTH = 15;
export const SHIELD_OVERCHARGE_DURATION = 5000;
export const SHIELD_OVERCHARGE_COOLDOWN = 25000;
export const SHIELD_OVERCHARGE_HEAL_PER_RAY = 2; 

// Misc
export const INITIAL_RAY_POOL_SIZE = 300;