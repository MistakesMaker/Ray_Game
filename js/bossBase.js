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
        this.originalSpeed = 0; // Stores speed before hitStun
        this.speed = 0; // Actual current speed, will be set by subclasses
        this.baseSpeed = 0; // Base speed for the boss, set by subclasses
        this.hitStunSlowFactor = 0.3;

        this.bleedDamagePerTick = 0;
        this.bleedTimer = 0;
        this.playerCollisionStunTimer = 0; 

        // Fear related properties
        this.isFeared = false;
        this.fearTimer = 0;
        this.fearSourceX = 0;
        this.fearSourceY = 0;
        this.FEAR_SPEED_MULTIPLIER = 1.2; // How much faster they run when feared
    }

    applyBleed(dpt, duration) {
        const maxBleedDPT = 10;
        this.bleedDamagePerTick = Math.min(maxBleedDPT, (this.bleedDamagePerTick || 0) + dpt);
        this.bleedTimer = Math.max(this.bleedTimer, duration);
    }
    
    applyFear(duration, sourceX, sourceY) {
        this.isFeared = true;
        this.fearTimer = duration;
        this.fearSourceX = sourceX;
        this.fearSourceY = sourceY;
        // Optionally interrupt current actions
        if (this.hitStunTimer > 0) { // If stunned by hit, fear might override or be less effective
            this.hitStunTimer = Math.min(this.hitStunTimer, duration / 2); // Fear might shorten hit stun
        }
        if (this.playerCollisionStunTimer > 0) {
            this.playerCollisionStunTimer = Math.min(this.playerCollisionStunTimer, duration / 2);
        }
        // For specific boss actions, they'd need to check this.isFeared in their update
    }


    takeDamage(amount, ray, playerInstance, context = {}) { 
        if (this.health <= 0) return 0; 

        let actualDamageTaken = amount; 
        this.health -= actualDamageTaken;
        this.hitFlashTimer = this.HIT_FLASH_DURATION;
        if (this.health < 0) this.health = 0;

        if (this.isFeared) { // Fear might make them more susceptible or interrupt stun application
            this.fearTimer -= actualDamageTaken * 10; // Taking damage reduces fear timer slightly
        }

        if (ray && typeof this.speed !== 'undefined' && this.hitStunTimer <= 0 && !this.isFeared && 
            (typeof this.playerCollisionStunTimer === 'undefined' || this.playerCollisionStunTimer <= 0)) {
            if (this.speed > 0 && this.originalSpeed === 0) { 
                 this.originalSpeed = this.speed;
                 this.speed *= this.hitStunSlowFactor;
                 this.hitStunTimer = this.HIT_STUN_DURATION;
            }
        }
        return actualDamageTaken; 
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
         // Add a visual indicator for fear
        if (this.isFeared) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.7)'; // Magenta for fear
            ctx.lineWidth = 2;
            ctx.beginPath();
            const fearRadius = this.radius + 5 + Math.sin(Date.now() / 100) * 2;
            ctx.arc(this.x, this.y, fearRadius, 0, Math.PI * 2);
            ctx.stroke();
            // Small "!!!" above head
            ctx.fillStyle = 'rgba(255, 0, 255, 0.9)';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("!!!", this.x, this.y - this.radius - 15);
            ctx.restore();
        }
        this.drawHealthBar(ctx);
    }

    update(dt, playerInstance, canvasWidth, canvasHeight) { // Added canvasWidth/Height for boundary checks during fear
        // Handle Fear State first
        if (this.isFeared) {
            this.fearTimer -= dt;
            if (this.fearTimer <= 0) {
                this.isFeared = false;
                this.speed = this.baseSpeed; // Restore normal speed
            } else {
                const angleAwayFromSource = Math.atan2(this.y - this.fearSourceY, this.x - this.fearSourceX);
                // If too close to source, ensure it tries to move directly away
                // let distanceToSource = Math.hypot(this.x - this.fearSourceX, this.y - this.fearSourceY);
                // if (distanceToSource < this.radius) { 
                //     // angleAwayFromSource is already correct
                // }

                const currentSpeed = (this.baseSpeed || this.speed || 1) * this.FEAR_SPEED_MULTIPLIER; // Use baseSpeed if available, else current speed, fallback to 1
                const normalizedDtFactor = dt / (1000 / 60) || 1;

                this.x += Math.cos(angleAwayFromSource) * currentSpeed * normalizedDtFactor;
                this.y += Math.sin(angleAwayFromSource) * currentSpeed * normalizedDtFactor;

                // Keep within bounds while feared
                if(canvasWidth && canvasHeight){ // check if dimensions are passed
                    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
                    this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
                }
                // Most other logic (like shooting) should be skipped or modified in subclasses when feared.
                // For base class, we just handle movement.
            }
        }


        // Bleed and Hitstun timers (can still tick down even if feared, movement is just overridden)
        if (this.bleedTimer > 0) {
            this.bleedTimer -= dt;
            const ticks = Math.floor(dt / 100); 
            if (ticks > 0) {
                const damageThisFrame = this.bleedDamagePerTick * ticks;
                this.health -= damageThisFrame; 
                if (playerInstance && typeof playerInstance.totalDamageDealt === 'number') {
                     // playerInstance.totalDamageDealt += damageThisFrame; 
                }
                if (this.health < 0) this.health = 0;
            }
            if (this.bleedTimer <= 0) {
                this.bleedDamagePerTick = 0;
                this.bleedTimer = 0;
            }
        }

        if (this.hitStunTimer > 0) {
            this.hitStunTimer -= dt;
            if (this.hitStunTimer <= 0 && this.originalSpeed > 0 && typeof this.speed !== 'undefined' && !this.isFeared) { // Don't restore speed if feared
                this.speed = this.originalSpeed;
                this.originalSpeed = 0; 
            }
        }
        // Player collision stun timer is typically handled by specific boss logic
    }
}