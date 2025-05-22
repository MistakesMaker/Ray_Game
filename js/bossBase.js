// js/bossBase.js
import {
    BOSS_HEALTH_BAR_WIDTH, BOSS_HEALTH_BAR_HEIGHT,
    BOSS_HEALTH_BAR_COLOR_BG, BOSS_HEALTH_BAR_COLOR_FG,
    BOSS_HEALTH_BAR_OFFSET_Y, BASE_BOSS_STUN_CHANCE
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
        this.playerCollisionStunTimer = 0;
    }

    applyBleed(dpt, duration) {
        const maxBleedDPT = 10;
        this.bleedDamagePerTick = Math.min(maxBleedDPT, (this.bleedDamagePerTick || 0) + dpt);
        this.bleedTimer = Math.max(this.bleedTimer, duration);
    }

    takeDamage(amount, ray, playerInstance) { // playerInstance can be used for stun chance, etc.
        if (this.health <= 0) return false;

        this.health -= amount;
        this.hitFlashTimer = this.HIT_FLASH_DURATION;
        if (this.health < 0) this.health = 0;

        // Stun logic using playerInstance's properties
        if (ray && playerInstance && typeof this.speed !== 'undefined' && this.hitStunTimer <= 0 && (typeof this.playerCollisionStunTimer === 'undefined' || this.playerCollisionStunTimer <= 0)) {
            let stunChance = BASE_BOSS_STUN_CHANCE + (playerInstance.bossStunChanceBonus || 0);
            if (Math.random() < stunChance) {
                this.originalSpeed = this.speed;
                this.speed *= this.hitStunSlowFactor;
                this.hitStunTimer = this.HIT_STUN_DURATION;
            }
        }
        return true;
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

    // Base update expects dt as first argument
    update(dt, playerInstance) {
        if (this.bleedTimer > 0) {
            this.bleedTimer -= dt;
            const ticks = Math.floor(dt / 100);
            if (ticks > 0) {
                const damageThisFrame = this.bleedDamagePerTick * ticks;
                this.health -= damageThisFrame;
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