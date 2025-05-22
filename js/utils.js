// js/utils.js
import { REFLECTED_RAY_COLOR, GRAVITY_RAY_PROJECTILE_COLOR, BOSS_PROJECTILE_COLOR_DEFAULT, INITIAL_RAY_POOL_SIZE } from './constants.js';
// We'll need to import Ray class later when it's defined for getPooledRay if we create new ones here.
// For now, initializeRayPool will take it as an argument.

let rayPool = [];
let RayClassConstructor = null; // To store the Ray class constructor

export function initializeRayPool(RCtor) {
    RayClassConstructor = RCtor;
    rayPool = [];
    for (let i = 0; i < INITIAL_RAY_POOL_SIZE; i++) {
        if (RayClassConstructor) {
            rayPool.push(new RayClassConstructor());
        } else {
            console.error("RayClassConstructor not set in initializeRayPool!");
            break;
        }
    }
}

export function getPooledRay() {
    for (let i = 0; i < rayPool.length; i++) {
        if (rayPool[i] && !rayPool[i].isActive) {
            // console.log("Reusing ray from pool");
            return rayPool.splice(i, 1)[0];
        }
    }
    // console.warn("Ray pool exhausted or RayClassConstructor not set, creating new Ray.");
    if (RayClassConstructor) {
        return new RayClassConstructor();
    }
    console.error("Cannot create new Ray: RayClassConstructor not available in getPooledRay.");
    return null; // Or throw an error
}


export function checkCollision(o1, o2) {
    if (!o1 || !o2) return false;
    const dx = o1.x - o2.x;
    const dy = o1.y - o2.y;
    let r1 = o1.customRadius && (o1.isBossProjectile || o1.isGravityWellRay) ? o1.customRadius : o1.radius;
    let r2 = o2.customRadius && (o2.isBossProjectile || o2.isGravityWellRay) ? o2.customRadius : o2.radius;

    // Ensure radius is a number. If it's undefined (e.g. from a simple {x,y,radius} object passed for player collision), use a default or handle.
    if (r1 === undefined && o1.radius !== undefined) r1 = o1.radius;
    if (r2 === undefined && o2.radius !== undefined) r2 = o2.radius;


    if (r1 === undefined || r2 === undefined || isNaN(r1) || isNaN(r2)) {
        // console.warn("Collision check with invalid or undefined radius:", o1, o2, "r1:", r1, "r2:", r2);
        // Provide a fallback or simply return false if essential radius info is missing
        if (isNaN(r1) && o1.radius) r1 = o1.radius; // Try to recover if .radius exists but was not picked up
        if (isNaN(r2) && o2.radius) r2 = o2.radius;

        if (isNaN(r1) || isNaN(r2)) { // If still NaN after recovery attempt
            // console.error("CRITICAL: Collision check with NaN radius after recovery attempt.");
            return false;
        }
    }
    return Math.sqrt(dx * dx + dy * dy) < r1 + r2;
}

export function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (!hex) return null;
    if (hex.length === 4) {
        r = "0x" + hex[1] + hex[1];
        g = "0x" + hex[2] + hex[2];
        b = "0x" + hex[3] + hex[3];
    } else if (hex.length === 7) {
        r = "0x" + hex[1] + hex[2];
        g = "0x" + hex[3] + hex[4];
        b = "0x" + hex[5] + hex[6];
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

export function getReadableColorName(hC) {
    const cM = {
        '#FF00FF': 'Magenta', '#00FF00': 'Green', '#FFFF00': 'Yellow', '#1E90FF': 'Dodger Blue',
        '#FF69B4': 'Hot Pink', '#FFA500': 'Orange', '#7FFF00': 'Chartreuse', '#FF4500': 'Orange-Red',
        '#DA70D6': 'Orchid', '#FF1493': 'Deep Pink', '#00CED1': 'Dark Turquoise', '#BA55D3': 'Medium Orchid',
        '#FF7F50': 'Coral', '#ADFF2F': 'GreenYellow', '#FA8072': 'Salmon', '#20B2AA': 'LightSeaGreen',
        '#8A2BE2': 'BlueViolet', '#32CD32': 'LimeGreen', '#F0E68C': 'Khaki',
        [REFLECTED_RAY_COLOR]: 'Reflected Ray', // Using imported constant
        [GRAVITY_RAY_PROJECTILE_COLOR]: 'Corrupted Ray', // Using imported constant
        [BOSS_PROJECTILE_COLOR_DEFAULT]: 'Hostile Shard' // Using imported constant
    };
    return cM[hC.toUpperCase()] || hC;
}

export function isLineSegmentIntersectingCircle(x1, y1, x2, y2, cx, cy, cr) {
    // Check if endpoints are inside circle
    if (Math.sqrt((x1 - cx) ** 2 + (y1 - cy) ** 2) < cr) return true;
    if (Math.sqrt((x2 - cx) ** 2 + (y2 - cy) ** 2) < cr) return true;

    // Check distance from circle center to line segment
    const lenSq = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (lenSq === 0) return false; // Line segment is a point

    let t = ((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / lenSq;
    t = Math.max(0, Math.min(1, t)); // Clamp t to the segment

    const closestX = x1 + t * (x2 - x1);
    const closestY = y1 + t * (y2 - y1);

    return Math.sqrt((closestX - cx) ** 2 + (closestY - cy) ** 2) < cr;
}