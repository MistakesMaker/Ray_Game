// js/entitySpawner.js

import * as CONSTANTS from './constants.js';
import { Target, Heart, BonusPoint } from './entities.js'; // Assuming entities.js exports these classes

class EntitySpawner {
    constructor(gameContextCallbacks) {
        // Callbacks to main.js or entity manager to add entities to the game arrays
        this.addEntityCallback = gameContextCallbacks.addEntityCallback; // e.g., (entity, type) => {}

        this.targetSpawnTimer = CONSTANTS.TARGET_SPAWN_INTERVAL_MS / 2; // Start with a partial timer for variety
        this.heartSpawnTimer = CONSTANTS.HEART_SPAWN_INTERVAL_MS / 2;
        this.bonusPointSpawnTimer = CONSTANTS.BONUS_POINT_SPAWN_INTERVAL_MS / 2;

        // Store references if needed, or get them dynamically via gameContext in update
        this.canvasWidth = 0;
        this.canvasHeight = 0;
        this.uiExclusionZones = []; // To store rectangles of UI elements
    }

    updateCanvasDimensions(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    updateUIExclusionZones(zones) {
        this.uiExclusionZones = zones || [];
    }

    reset() {
        this.targetSpawnTimer = CONSTANTS.TARGET_SPAWN_INTERVAL_MS / 2;
        this.heartSpawnTimer = CONSTANTS.HEART_SPAWN_INTERVAL_MS / 2;
        this.bonusPointSpawnTimer = CONSTANTS.BONUS_POINT_SPAWN_INTERVAL_MS / 2;
    }

    _canSpawn(gameContext) {
        if (!gameContext || !this.addEntityCallback) {
            console.error("EntitySpawner: Missing gameContext or addEntityCallback.");
            return false;
        }
        if (gameContext.isGameOver()) return false;
        if (gameContext.isAnyPauseActive && gameContext.isAnyPauseActive()) return false;
        if (gameContext.isBossSequenceActive && gameContext.isBossSequenceActive()) return false;
        return true;
    }

    _validateSpawnPosition(x, y, radius, player, entityType) {
        if (!player) return true; // If no player context, assume valid (e.g., initial spawn)
        const distToPlayer = Math.sqrt((x - player.x)**2 + (y - player.y)**2);
        
        // Check distance from player
        if (distToPlayer <= player.radius + radius + 75) {
            return false;
        }

        // Check against UI exclusion zones for ALL entity types now.
        for (const zone of this.uiExclusionZones) {
            if (x > zone.left && x < zone.right && y > zone.top && y < zone.bottom) {
                return false; // Invalid position
            }
        }

        return true; // All checks passed, position is valid
    }

    spawnTarget(gameContext) {
        const r = CONSTANTS.TARGET_RADIUS;
        let sX, sY, attempts = 0;
        let validPosition = false;
        
        do {
            sX = Math.random() * (this.canvasWidth - 2 * r) + r;
            sY = Math.random() * (this.canvasHeight - 2 * r) + r;
            validPosition = this._validateSpawnPosition(sX, sY, r, gameContext.player, 'target');
            attempts++;
        } while (!validPosition && attempts < 50);

        if (validPosition) {
            this.addEntityCallback(new Target(sX, sY, r, CONSTANTS.TARGET_COLOR), 'target');
        }
    }

    spawnHeart(gameContext) {
        if (gameContext.heartsArray && gameContext.heartsArray.length > 0) return; // Only one heart at a time

        const vR = CONSTANTS.HEART_VISUAL_RADIUS; // Visual radius for spawning bounds
        const cR = CONSTANTS.HEART_COLLISION_RADIUS;
        let sX, sY, attempts = 0;
        let validPosition = false;

        do {
            sX = Math.random() * (this.canvasWidth - 2 * vR) + vR;
            sY = Math.random() * (this.canvasHeight - 2 * vR) + vR;
            validPosition = this._validateSpawnPosition(sX, sY, cR, gameContext.player, 'heart');
            attempts++;
        } while (!validPosition && attempts < 50);
        
        if (validPosition) {
            this.addEntityCallback(new Heart(sX, sY, vR, cR, CONSTANTS.HEART_COLOR), 'heart');
        }
    }

    spawnBonusPoint(gameContext) {
        if (gameContext.bonusPointsArray && gameContext.bonusPointsArray.length > 0) return; // Only one bonus point at a time

        const r = CONSTANTS.BONUS_POINT_RADIUS;
        let sX, sY, attempts = 0;
        let validPosition = false;
        
        do {
            sX = Math.random() * (this.canvasWidth - 2 * r) + r;
            sY = Math.random() * (this.canvasHeight - 2 * r) + r;
            validPosition = this._validateSpawnPosition(sX, sY, r, gameContext.player, 'bonusPoint');
            attempts++;
        } while (!validPosition && attempts < 50);

        if (validPosition) {
            this.addEntityCallback(new BonusPoint(sX, sY, r, CONSTANTS.BONUS_POINT_COLOR), 'bonusPoint');
        }
    }

    update(dt, gameContext) {
        if (!this.canvasWidth || !this.canvasHeight) {
            // console.warn("EntitySpawner: Canvas dimensions not set. Call updateCanvasDimensions.");
            if (gameContext.canvasWidth && gameContext.canvasHeight) {
                this.updateCanvasDimensions(gameContext.canvasWidth, gameContext.canvasHeight);
            } else {
                return; // Cannot spawn without dimensions
            }
        }

        if (!this._canSpawn(gameContext)) {
            return;
        }

        // Target Spawning
        this.targetSpawnTimer -= dt;
        if (this.targetSpawnTimer <= 0) {
            this.spawnTarget(gameContext);
            this.targetSpawnTimer = CONSTANTS.TARGET_SPAWN_INTERVAL_MS;
        }

        // Heart Spawning
        this.heartSpawnTimer -= dt;
        if (this.heartSpawnTimer <= 0) {
            this.spawnHeart(gameContext);
            this.heartSpawnTimer = CONSTANTS.HEART_SPAWN_INTERVAL_MS;
        }

        // Bonus Point Spawning
        this.bonusPointSpawnTimer -= dt;
        if (this.bonusPointSpawnTimer <= 0) {
            this.spawnBonusPoint(gameContext);
            // <<< THIS IS THE FIX >>>
            this.bonusPointSpawnTimer = CONSTANTS.BONUS_POINT_SPAWN_INTERVAL_MS;
        }
    }
}

export { EntitySpawner };