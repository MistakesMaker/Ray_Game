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
        this.HIT_FLASH_BLINK_INTERVAL = 50;

        this.hitStunTimer = 0;
        this.HIT_STUN_DURATION = 200;
        this.originalSpeed = 0;
        this.speed = 0;
        this.baseSpeed = 0;
        this.hitStunSlowFactor = 0.3;

        this.bleedDamagePerTick = 0;
        this.bleedTimer = 0;
        this.playerCollisionStunTimer = 0;

        this.isFeared = false;
        this.fearTimer = 0;
        this.fearSourceX = 0;
        this.fearSourceY = 0;
        this.FEAR_SPEED_MULTIPLIER = 1.2;

        // <<< NEW: For tracking damage sources for achievements >>>
        this.damageSourcesThisFight = {
            primary: 0,          // Player's normal ray attacks
            omegaLaser: 0,       // Mage path
            miniGravityWell: 0,  // Mage path (launched rays) / or general ability if applicable
            aegisCharge: 0,      // Aegis path (LMB impact)
            seismicSlam: 0,      // Aegis path (RMB)
            // Bloodpact and Savage Howl are buffs/debuffs, not direct damage dealers in the same way.
            // Other direct damage numeric abilities could be added if needed for other achievements.
            otherAbility: 0,     // Damage from other player abilities (e.g. EMP, future abilities)
            aegisPassive: 0,     // Aegis path (passive ram)
        };
        // <<< END NEW >>>
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
        if (this.hitStunTimer > 0) {
            this.hitStunTimer = Math.min(this.hitStunTimer, duration / 2);
        }
        if (this.playerCollisionStunTimer > 0) {
            this.playerCollisionStunTimer = Math.min(this.playerCollisionStunTimer, duration / 2);
        }
    }


    takeDamage(amount, ray, playerInstance, context = {}) {
        if (this.health <= 0) return 0;

        let actualDamageTaken = amount;
        this.health -= actualDamageTaken;
        this.hitFlashTimer = this.HIT_FLASH_DURATION;
        if (this.health < 0) this.health = 0;


        // <<< NEW: Track damage source >>>
        if (playerInstance) { // Only track if damage is from the player
            if (context.isAegisCollision) {
                this.damageSourcesThisFight.aegisPassive += actualDamageTaken;
            } else if (context.isAbility) {
                if (context.abilityType === 'omegaLaser') {
                    this.damageSourcesThisFight.omegaLaser += actualDamageTaken;
                } else if (context.abilityType === 'aegisCharge') {
                    this.damageSourcesThisFight.aegisCharge += actualDamageTaken;
                } else if (context.abilityType === 'seismicSlam') {
                    this.damageSourcesThisFight.seismicSlam += actualDamageTaken;
                } else {
                    this.damageSourcesThisFight.otherAbility += actualDamageTaken;
                }
            } else if (ray) {
                if (ray.isPlayerAbilityRay && ray.sourceAbility === 'miniGravityWell') {
                    this.damageSourcesThisFight.miniGravityWell += actualDamageTaken;
                } else if (!ray.isBossProjectile && !ray.isGravityWellRay) { // Player's primary ray
                    this.damageSourcesThisFight.primary += actualDamageTaken;
                }
            }
            // console.log("Boss Damage Sources Updated:", this.damageSourcesThisFight); // For debugging
        }
        // <<< END NEW >>>


        if (this.isFeared) {
            this.fearTimer -= actualDamageTaken * 10;
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
        this.drawHealthBar(ctx);

        if (this.isFeared) {
            ctx.save();
            const fearPulseProgress = Math.abs(Math.sin(this.fearTimer * 0.01));
            const fearCircleRadius = this.radius + 3 + fearPulseProgress * 3;
            const fearCircleAlpha = 0.3 + fearPulseProgress * 0.3;

            ctx.strokeStyle = `rgba(255, 0, 255, ${fearCircleAlpha})`;
            ctx.lineWidth = 1 + fearPulseProgress * 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, fearCircleRadius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 0, 255, 0.9)';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("!!!", this.x, this.y - this.radius - BOSS_HEALTH_BAR_OFFSET_Y - 20);
            ctx.restore();
        }
    }

    update(dt, playerInstance, canvasWidth, canvasHeight) {
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            if (this.hitFlashTimer < 0) {
                this.hitFlashTimer = 0;
            }
        }

        if (this.isFeared) {
            this.fearTimer -= dt;
            if (this.fearTimer <= 0) {
                this.isFeared = false;
                this.fearTimer = 0;
                if(this.hitStunTimer <=0) {
                   this.speed = this.baseSpeed;
                }
            } else {
                const angleAwayFromSource = Math.atan2(this.y - this.fearSourceY, this.x - this.fearSourceX);
                const currentFearSpeed = (this.baseSpeed || this.speed || 1) * this.FEAR_SPEED_MULTIPLIER;
                const normalizedDtFactor = dt / (1000 / 60) || 1;

                this.x += Math.cos(angleAwayFromSource) * currentFearSpeed * normalizedDtFactor;
                this.y += Math.sin(angleAwayFromSource) * currentFearSpeed * normalizedDtFactor;

                if(canvasWidth && canvasHeight){
                    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
                    this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
                }
            }
        }


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

        if (this.hitStunTimer > 0) {
            this.hitStunTimer -= dt;
            if (this.hitStunTimer <= 0) {
                this.hitStunTimer = 0;
                if (this.originalSpeed > 0 && typeof this.speed !== 'undefined' && !this.isFeared) {
                    this.speed = this.originalSpeed;
                    this.originalSpeed = 0;
                } else if (!this.isFeared) {
                    this.speed = this.baseSpeed;
                }
            }
        }
    }
}