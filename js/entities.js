// js/entities.js
import {
    TARGET_RADIUS, TARGET_COLOR,
    HEART_VISUAL_RADIUS, HEART_COLLISION_RADIUS, HEART_COLOR, HEART_LIFESPAN,
    BONUS_POINT_RADIUS, BONUS_POINT_COLOR, BONUS_POINT_LIFESPAN
    // LOOT_DROP_RADIUS is not explicitly defined, using 18 directly in LootDrop
} from './constants.js';
// No direct utility or audio imports needed for these specific classes as written

export class Target {
    constructor(x, y, r = TARGET_RADIUS, c = TARGET_COLOR) { // Default params from constants
        this.x = x; this.y = y; this.radius = r; this.color = c;
    }
    draw(ctx) { // Expect ctx
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#FFF'; // Consider making this a constant
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.closePath();
    }
}

export class Heart {
    constructor(x, y, vR = HEART_VISUAL_RADIUS, cR = HEART_COLLISION_RADIUS, c = HEART_COLOR) {
        this.x = x; this.y = y;
        this.visualRadius = vR;
        this.radius = cR; // This is the collision radius
        this.color = c;
        this.lifeTimer = HEART_LIFESPAN;
        this.remove = false;
    }
    draw(ctx) { // Expect ctx
        if (!ctx) return;
        ctx.save();
        const s = 1 + Math.sin(Date.now() / 200) * 0.1; // Simple pulse
        ctx.translate(this.x, this.y);
        ctx.scale(s, s);
        ctx.beginPath();
        // Heart shape drawing logic (from original)
        ctx.moveTo(0, this.visualRadius * .4);
        ctx.bezierCurveTo(this.visualRadius * -.3, this.visualRadius * -.5, this.visualRadius * -1, this.visualRadius * -.3, 0, this.visualRadius * .7);
        ctx.bezierCurveTo(this.visualRadius * 1, this.visualRadius * -.3, this.visualRadius * .3, this.visualRadius * -.5, 0, this.visualRadius * .4);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'white'; // Consider making this a constant
        ctx.lineWidth = (1 / s) * (this.visualRadius / TARGET_RADIUS); // Maintain stroke width relative to original target radius for consistency
        ctx.stroke();
        ctx.restore();
    }
    update(dt, playerInstance) { // playerInstance for attraction
        this.lifeTimer -= dt;
        if (this.lifeTimer <= 0) {
            this.remove = true;
        }
        if (playerInstance && playerInstance.pickupAttractionRadius > 0) {
            const distToPlayer = Math.sqrt((this.x - playerInstance.x) ** 2 + (this.y - playerInstance.y) ** 2);
            if (distToPlayer < playerInstance.pickupAttractionRadius && distToPlayer > playerInstance.radius + this.radius) {
                const angle = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
                this.x += Math.cos(angle) * 1.5; // Attraction speed, could be a constant
                this.y += Math.sin(angle) * 1.5;
            }
        }
    }
}

export class BonusPoint {
    constructor(x, y, r = BONUS_POINT_RADIUS, c = BONUS_POINT_COLOR) {
        this.x = x; this.y = y; this.radius = r; this.color = c;
        this.lifeTimer = BONUS_POINT_LIFESPAN;
        this.remove = false;
    }
    draw(ctx) { // Expect ctx
        if (!ctx) return;
        ctx.save();
        const scale = 1 + Math.sin(Date.now() / 200 * (0.1 + Math.random() * 0.1)) * 0.15;
        const rotation = (Date.now() / 1000 * ((Math.random() - 0.5) * 0.02)) % (Math.PI * 2);
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        ctx.rotate(rotation);
        ctx.beginPath();
        for (let i = 0; i < 5; i++) { // Star shape
            ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.radius, Math.sin((18 + i * 72) * Math.PI / 180) * this.radius);
            ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * this.radius / 2, Math.sin((54 + i * 72) * Math.PI / 180) * this.radius / 2);
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFF88'; // Star outline color, could be constant
        ctx.lineWidth = 1 / scale;
        ctx.stroke();
        ctx.restore();
    }
    update(dt, playerInstance) { // playerInstance for attraction
        this.lifeTimer -= dt;
        if (this.lifeTimer <= 0) {
            this.remove = true;
        }
        if (playerInstance && playerInstance.pickupAttractionRadius > 0) {
            const distToPlayer = Math.sqrt((this.x - playerInstance.x) ** 2 + (this.y - playerInstance.y) ** 2);
            if (distToPlayer < playerInstance.pickupAttractionRadius && distToPlayer > playerInstance.radius + this.radius) {
                const angle = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
                this.x += Math.cos(angle) * 1.5; // Attraction speed
                this.y += Math.sin(angle) * 1.5;
            }
        }
    }
}

export class LootDrop {
    constructor(x, y, upgradeChoices) {
        this.x = x; this.y = y;
        this.radius = 18; // Default radius if not from constants
        this.upgradeChoices = upgradeChoices;
        this.pulseTimer = Math.random() * 1000;
        this.bobOffset = 0;
        this.bobTimer = Math.random() * 1000;
        this.lifeTimer = 30000; // Could be a constant LOOT_DROP_LIFESPAN
        this.remove = false;
    }
    draw(ctx) { // Expect ctx
        if (!ctx) return;
        this.pulseTimer += 16.67; // Assuming roughly 60fps for timing
        this.bobTimer += 16.67;
        this.bobOffset = Math.sin(this.bobTimer / 400) * 3;

        const baseRadius = this.radius;
        const pulseAmount = Math.sin(this.pulseTimer / 250) * 3;
        const currentRadius = baseRadius + pulseAmount;

        ctx.save();
        ctx.translate(this.x, this.y + this.bobOffset);

        // Outer Glow
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius + 8 + pulseAmount, 0, Math.PI * 2);
        const gradientGlow = ctx.createRadialGradient(0, 0, currentRadius * 0.5, 0, 0, currentRadius + 8 + pulseAmount);
        gradientGlow.addColorStop(0, 'rgba(255, 223, 100, 0.7)');
        gradientGlow.addColorStop(0.6, 'rgba(255, 215, 0, 0.4)');
        gradientGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = gradientGlow;
        ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
        ctx.shadowBlur = 20 + pulseAmount * 3;
        ctx.fill();
        ctx.shadowColor = 'transparent'; // Reset shadow for next draws
        ctx.shadowBlur = 0;

        // Core
        ctx.beginPath();
        ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
        const gradientCore = ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius);
        gradientCore.addColorStop(0, 'rgba(255, 255, 220, 1)');
        gradientCore.addColorStop(0.6, 'rgba(255, 215, 0, 1)');
        gradientCore.addColorStop(1, 'rgba(255, 190, 0, 1)');
        ctx.fillStyle = gradientCore;
        ctx.fill();

        // Glints
        const numGlints = 4;
        for (let i = 0; i < numGlints; i++) {
            const angle = (this.pulseTimer / 600 + (i * Math.PI * 2 / numGlints)) % (Math.PI * 2);
            const dist = currentRadius * 0.7;
            const gx = Math.cos(angle) * dist;
            const gy = Math.sin(angle) * dist;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(gx - 1, gy - 1, 2, 2);
        }
        ctx.restore();
    }
    update(dt) { // playerInstance not needed for LootDrop attraction (it's pickup on collision)
        this.lifeTimer -= dt;
        if (this.lifeTimer <= 0) {
            this.remove = true;
        }
        // LootDrop attraction is typically handled by player collision check in main game loop, not by moving itself.
    }
}