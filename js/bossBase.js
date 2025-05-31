// js/bossBase.js
import {
    BOSS_HEALTH_BAR_WIDTH, BOSS_HEALTH_BAR_HEIGHT,
    BOSS_HEALTH_BAR_COLOR_BG, BOSS_HEALTH_BAR_COLOR_FG,
    BOSS_HEALTH_BAR_OFFSET_Y
} from './constants.js';


export class BossNPC {
    constructor(x, y, tier, baseHp, hpPerTierFactor, radius, color) {
        this.x = x; this.y = y; this.tier = tier;
        this.baseHp = baseHp; this.hpPerTierFactor = hpPerTierFactor;
        this.maxHealth = Math.floor(this.baseHp * (1 + (this.tier - 1) * this.hpPerTierFactor));
        this.health = this.maxHealth;
        this.radius = radius; this.color = color;

        this.hitFlashTimer = 0;
        this.HIT_FLASH_DURATION = 120;
        this.hitStunTimer = 0;
        this.HIT_STUN_DURATION = 200;
        this.originalSpeed = 0;
        this.hitStunSlowFactor = 0.3;

        this.bleedDamagePerTick = 0;
        this.bleedTimer = 0;
        this.playerCollisionStunTimer = 0; // Generic, can be overridden by specific bosses
    }

    applyBleed(dpt, duration) {
        const maxBleedDPT = 10;
        this.bleedDamagePerTick = Math.min(maxBleedDPT, (this.bleedDamagePerTick || 0) + dpt);
        this.bleedTimer = Math.max(this.bleedTimer, duration);
    }

    takeDamage(amount, ray, playerInstance, context = {}) { // Added context
        if (this.health <= 0) return 0; // Return 0 if no damage taken

        // Context specific handling (e.g. Aegis path might have special interactions)
        // For Aegis Charge ability, context might be empty or have specific flags.
        // For Aegis Path passive collision, context.isAegisCollision might be true.

        let actualDamageTaken = amount; // Start with the proposed amount

        // Future: Apply boss-specific resistances or vulnerabilities here if needed
        // based on `ray`, `playerInstance`, or `context`.
        // For example: if (context.isFireDamage && this.isWeakToFire) actualDamageTaken *= 1.5;

        this.health -= actualDamageTaken;
        this.hitFlashTimer = this.HIT_FLASH_DURATION;
        if (this.health < 0) this.health = 0;

        if (ray && typeof this.speed !== 'undefined' && this.hitStunTimer <= 0 && (typeof this.playerCollisionStunTimer === 'undefined' || this.playerCollisionStunTimer <= 0)) {
            if (this.speed > 0 && this.originalSpeed === 0) { 
                 this.originalSpeed = this.speed;
                 this.speed *= this.hitStunSlowFactor;
                 this.hitStunTimer = this.HIT_STUN_DURATION;
            }
        }
        return actualDamageTaken; // Return the actual damage amount dealt
    }

    drawHealthBar(ctx) {
        if (!ctx) return;
        const barX = this.x - BOSS_HEALTH_BAR_WIDTH / 2;
        const barY = this.y - this.radius - BOSS_HEALTH_BAR_OFFSET_Y - 10;
        const healthPercentage = this.health / this.maxHealth;

        ctx.fillStyle = BOSS_HEALTH_BAR_COLOR_BG;
        ctx.fillRect(barX, barY, BOSS_HEALTH_BAR_WIDTH, BOSS_HEALTH_BAR_HEIGHT);

        ctx.fillStyle = BOSS_HEALTH_BAR_COLOR_FG;
        ctx.fillRect(barX, barY, BOSS_HEALTH_BAR_WIDTH * healthPercentage, BOSS_HEALTH_BAR_HEIGHT);

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, BOSS_HEALTH_BAR_WIDTH, BOSS_HEALTH_BAR_HEIGHT);
    }

    draw(ctx) {
        if (!ctx) return;
        this.drawHealthBar(ctx);
    }

    update(dt, playerInstance) {
        if (this.bleedTimer > 0) {
            this.bleedTimer -= dt;
            const ticks = Math.floor(dt / 100); // Assuming bleed ticks every 100ms
            if (ticks > 0) {
                const damageThisFrame = this.bleedDamagePerTick * ticks;
                this.health -= damageThisFrame; // Bleed damage bypasses takeDamage resistances for now
                if (playerInstance && typeof playerInstance.totalDamageDealt === 'number') {
                     // playerInstance.totalDamageDealt += damageThisFrame; // Optional: track bleed as player damage
                }
                if (this.health < 0) this.health = 0;
            }
            if (this.bleedTimer <= 0) {
                this.bleedDamagePerTick = 0;
                this.bleedTimer = 0;
            }
        }

        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
        }

        if (this.hitStunTimer > 0) {
            this.hitStunTimer -= dt;
            if (this.hitStunTimer <= 0 && this.originalSpeed > 0 && typeof this.speed !== 'undefined') {
                this.speed = this.originalSpeed;
                this.originalSpeed = 0; 
            }
        }
    }
}