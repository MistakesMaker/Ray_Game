// js/utils.js
import { INITIAL_RAY_POOL_SIZE } from './constants.js';
import * as CONSTANTS from './constants.js'; // For color name lookups that use constants

let rayPool = [];
let RayClassConstructor = null;

export function setRayConstructorForPool(RCtor) {
    if (typeof RCtor !== 'function') {
        console.error("setRayConstructorForPool: Provided constructor is not a function.");
        return;
    }
    RayClassConstructor = RCtor;
}

export function initializeRayPool() {
    if (!RayClassConstructor) {
        console.error("RayClassConstructor not set in initializeRayPool. Call setRayConstructorForPool first.");
        return;
    }
    rayPool = [];
    for (let i = 0; i < INITIAL_RAY_POOL_SIZE; i++) {
        rayPool.push(new RayClassConstructor());
    }
    // console.log("Ray pool initialized in utils.js with size:", rayPool.length);
}

export function getPooledRay() {
    for (let i = 0; i < rayPool.length; i++) {
        if (rayPool[i] && !rayPool[i].isActive) { // Check if ray is available
            const ray = rayPool.splice(i, 1)[0]; // Remove from available pool
            // console.log("Reusing ray from pool. Pool size now:", rayPool.length);
            return ray;
        }
    }
    // If pool is empty or all are active, create a new one
    if (RayClassConstructor) {
        // console.warn("Ray pool depleted or no inactive rays found, creating new Ray instance.");
        return new RayClassConstructor();
    }
    console.error("Cannot create new Ray: RayClassConstructor not available in getPooledRay.");
    return null;
}

// Function to return a ray to the pool
export function returnRayToPool(rayInstance) {
    if (rayInstance && rayPool.length < INITIAL_RAY_POOL_SIZE * 1.5) { // Prevent pool from growing indefinitely beyond a cap
        rayInstance.isActive = false; // Ensure it's marked inactive
        // Potentially reset other properties if not done in Ray.reset or if needed before reuse
        rayPool.push(rayInstance);
        // console.log("Returned ray to pool. Pool size now:", rayPool.length);
    } else if (rayPool.length >= INITIAL_RAY_POOL_SIZE * 1.5) {
        // console.warn("Ray pool is full, not adding ray back:", rayInstance);
    }
}


export function checkCollision(o1, o2) {
    if (!o1 || !o2) return false;
    const dx = o1.x - o2.x;
    const dy = o1.y - o2.y;

    let r1 = o1.radius;
    if (o1.customRadius !== undefined && (o1.isBossProjectile || o1.isGravityWellRay || o1.isPlayerAbilityRay)) {
        if (o1.customRadius > 0) r1 = o1.customRadius;
    }

    let r2 = o2.radius;
    if (o2.customRadius !== undefined && (o2.isBossProjectile || o2.isGravityWellRay || o2.isPlayerAbilityRay)) {
        if (o2.customRadius > 0) r2 = o2.customRadius;
    }

    if (r1 === undefined || r2 === undefined || isNaN(r1) || isNaN(r2)) {
        return false;
    }
    return Math.sqrt(dx * dx + dy * dy) < r1 + r2;
}

export function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (!hex || typeof hex !== 'string') return null;
    hex = hex.startsWith('#') ? hex.slice(1) : hex;

    if (hex.length === 3) {
        r = "0x" + hex[0] + hex[0];
        g = "0x" + hex[1] + hex[1];
        b = "0x" + hex[2] + hex[2];
    } else if (hex.length === 6) {
        r = "0x" + hex[0] + hex[1];
        g = "0x" + hex[2] + hex[3];
        b = "0x" + hex[4] + hex[5];
    } else {
        return null;
    }
    return { r: +r, g: +g, b: +b };
}

export function lightenColor(hex, percent) {
    if (!hex) return 'rgb(255,255,255)';
    const rgb = hexToRgb(hex);
    if (!rgb) return 'rgb(255,255,255)';
    const factor = 1 + (percent / 100);
    const r_new = Math.min(255, Math.round(rgb.r * factor));
    const g_new = Math.min(255, Math.round(rgb.g * factor));
    const b_new = Math.min(255, Math.round(rgb.b * factor));
    return `rgb(${r_new},${g_new},${b_new})`;
}

export function isLineSegmentIntersectingCircle(x1, y1, x2, y2, cx, cy, cr) {
    if (Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2) < cr) return true;
    if (Math.sqrt((x2 - cx) ** 2 + (y2 - cy) ** 2) < cr) return true;

    const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (lenSq === 0) return false;

    let t = ((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);

    return Math.sqrt((closestX - cx) ** 2 + (closestY - cy) ** 2) < cr;
}

export function getReadableColorName(hC) {
    if (!hC || typeof hC !== 'string') return 'Unknown Color';
    const upperHC = hC.toUpperCase();
    const cM = {
        '#FF00FF': 'Magenta', '#00FF00': 'Green', '#FFFF00': 'Yellow', '#1E90FF': 'Dodger Blue',
        '#FF69B4': 'Hot Pink', '#FFA500': 'Orange', '#7FFF00': 'Chartreuse', '#FF4500': 'Orange-Red',
        '#DA70D6': 'Orchid', '#FF1493': 'Deep Pink', '#00CED1': 'Dark Turquoise', '#BA55D3': 'Medium Orchid',
        '#FF7F50': 'Coral', '#ADFF2F': 'GreenYellow', '#FA8072': 'Salmon', '#20B2AA': 'LightSeaGreen',
        '#8A2BE2': 'BlueViolet', '#32CD32': 'LimeGreen', '#F0E68C': 'Khaki',
        [CONSTANTS.REFLECTED_RAY_COLOR ? CONSTANTS.REFLECTED_RAY_COLOR.toUpperCase() : '']: 'Reflected Ray',
        [CONSTANTS.GRAVITY_RAY_PROJECTILE_COLOR ? CONSTANTS.GRAVITY_RAY_PROJECTILE_COLOR.toUpperCase() : '']: 'Corrupted Ray',
        [CONSTANTS.BOSS_PROJECTILE_COLOR_DEFAULT ? CONSTANTS.BOSS_PROJECTILE_COLOR_DEFAULT.toUpperCase() : '']: 'Hostile Shard',
        [CONSTANTS.PLAYER_GRAVITY_WELL_ABSORBED_RAY_COLOR ? CONSTANTS.PLAYER_GRAVITY_WELL_ABSORBED_RAY_COLOR.toUpperCase() : '']: 'Absorbed Ray'
    };
    if (cM[''] !== undefined) delete cM[''];

    return cM[upperHC] || hC;
}