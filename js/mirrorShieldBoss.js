// js/mirrorShieldBoss.js
import { BossNPC } from './bossBase.js';
import { PLAYER_BOUNCE_FORCE_FROM_BOSS, BASE_RAY_SPEED, REFLECTED_RAY_SPEED_MULTIPLIER, REFLECTED_RAY_COLOR, REFLECTED_RAY_LIFETIME_AFTER_REFLECTION } from './constants.js';
import { checkCollision } from './utils.js';

export class MirrorShieldBoss extends BossNPC { 
    constructor(x, y, tier) {
        super(x, y, tier, 40, 0.35, 45 + tier * 2.5, '#6A5ACD');
        this.shieldAngle = Math.random() * Math.PI * 2;
        this.shieldWidthAngle = Math.PI; // Shield covers half the boss
        this.rotationSpeed = 0.008 + tier * 0.0015;
        this.hitBodyFlash = false;
        this.baseSpeed = 0.35 + tier * 0.025;
        this.speed = this.baseSpeed;
        this.hitStunSlowFactor = 0.05; // Very slow when body is hit
        this.driftAngle = Math.random() * Math.PI * 2;
        this.driftAngleChangeTimer = 0;
        this.driftAngleChangeInterval = 2500 + Math.random() * 1500;

        this.playerCollisionStunTimer = 0;
        this.PLAYER_COLLISION_STUN_DURATION_MIRROR = 200; 
        this.recoilVelX = 0;
        this.recoilVelY = 0;
    }

    draw(ctx) {
        if (!ctx) return;
        let bodyEffectiveColor = this.color;
        let shieldEffectiveColor = 'rgba(180, 180, 255, 0.7)';

        if (this.isFeared) {
            bodyEffectiveColor = 'rgba(255, 0, 255, 0.6)'; // Magenta when feared
            shieldEffectiveColor = 'rgba(255, 100, 255, 0.4)';
        } else if (this.hitBodyFlash) {
            bodyEffectiveColor = `rgba(255, 165, 0, ${0.6 + 0.4 * Math.sin(this.hitFlashTimer * 0.15)})`;
        } else if (this.hitFlashTimer > 0 && !this.hitBodyFlash) { 
            shieldEffectiveColor = `rgba(220, 220, 255, ${0.6 + 0.4 * Math.sin(this.hitFlashTimer * 0.15)})`;
        }


        if (this.bleedTimer > 0 && Math.floor(this.bleedTimer / 100) % 2 === 0) {
            bodyEffectiveColor = '#483D8B';
        }
        if (this.playerCollisionStunTimer > 0 && !this.isFeared) { // Don't show stun color if feared
            bodyEffectiveColor = `rgba(100, 100, 200, 0.8)`; 
        }


        ctx.save();
        ctx.translate(this.x, this.y);

        // Draw body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyEffectiveColor;
        ctx.fill();

        // Draw shield
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.radius + 3, this.shieldAngle - this.shieldWidthAngle / 2, this.shieldAngle + this.shieldWidthAngle / 2);
        ctx.closePath();
        ctx.fillStyle = shieldEffectiveColor.replace('0.7)', '0.2)'); // More transparent fill for shield area
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = shieldEffectiveColor;
        ctx.stroke();

        ctx.restore();
        super.draw(ctx); // Health bar and base fear visual
        this.hitBodyFlash = false; 
    }

    update(playerInstance, gameContext) {
        const { dt, canvasWidth, canvasHeight, postDamageImmunityTimer, isPlayerShieldOvercharging } = gameContext;

        super.update(dt, playerInstance, canvasWidth, canvasHeight); // Pass canvas dimensions
        if (this.health <= 0) return;

        const normalizedDtFactor = (dt / (1000 / 60)) || 1;

        // If feared, base class update handles movement. Skip normal MirrorShield logic.
        if (this.isFeared) {
            // Specific reactions to fear for MirrorShield can go here if needed
        } else if (this.playerCollisionStunTimer > 0) {
            this.playerCollisionStunTimer -= dt;
            this.x += this.recoilVelX * normalizedDtFactor;
            this.y += this.recoilVelY * normalizedDtFactor;
            this.recoilVelX *= 0.92; 
            this.recoilVelY *= 0.92;
            if (Math.abs(this.recoilVelX) < 0.01) this.recoilVelX = 0;
            if (Math.abs(this.recoilVelY) < 0.01) this.recoilVelY = 0;

            if (this.playerCollisionStunTimer <= 0) {
                this.speed = this.baseSpeed; 
            }
        } else if (this.hitStunTimer <= 0) { 
            // Normal AI: Rotate shield towards player and drift
            const angleToPlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
            let diff = angleToPlayer - this.shieldAngle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.shieldAngle += diff * this.rotationSpeed * normalizedDtFactor;
            this.shieldAngle %= (Math.PI * 2);

            this.driftAngleChangeTimer -= dt;
            if (this.driftAngleChangeTimer <= 0) {
                this.driftAngle = Math.random() * Math.PI * 2;
                this.driftAngleChangeTimer = this.driftAngleChangeInterval;
            }
            this.x += Math.cos(this.driftAngle) * this.speed * normalizedDtFactor;
            this.y += Math.sin(this.driftAngle) * this.speed * normalizedDtFactor;
        } else { 
            // Minimal movement when hitStunned (body hit)
            this.x += Math.cos(this.driftAngle) * this.speed * 0.1 * normalizedDtFactor; // Very slow drift
            this.y += Math.sin(this.driftAngle) * this.speed * 0.1 * normalizedDtFactor;
        }

        // Boundary check is now handled in super.update if feared, otherwise here
        if (!this.isFeared) {
            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
        }


        if (checkCollision(this, playerInstance)) {
            const playerIsTeleporting = (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0);
            const playerIsCurrentlyShieldOvercharging = isPlayerShieldOvercharging; 
            const playerIsDamageImmuneFromRecentHit = (postDamageImmunityTimer !== undefined && postDamageImmunityTimer > 0);

            const playerCanTakeDamage = !playerIsDamageImmuneFromRecentHit &&
                                        !playerIsTeleporting &&
                                        !playerIsCurrentlyShieldOvercharging;
            
            if (playerCanTakeDamage && this.playerCollisionStunTimer <= 0 && !this.isFeared) { // Don't collide if feared
                if(gameContext) gameContext.playerCollidedWithBoss = this; 

                const dist = Math.sqrt((this.x - playerInstance.x) ** 2 + (this.y - playerInstance.y) ** 2);
                const overlap = (this.radius + playerInstance.radius) - dist;

                if (overlap > 0) {
                    const pushAngleBoss = Math.atan2(this.y - playerInstance.y, this.x - playerInstance.x);
                    const immediatePush = overlap * 0.3;
                    this.x += Math.cos(pushAngleBoss) * immediatePush;
                    this.y += Math.sin(pushAngleBoss) * immediatePush;

                    const recoilForce = PLAYER_BOUNCE_FORCE_FROM_BOSS * 0.3; 
                    this.recoilVelX = Math.cos(pushAngleBoss) * recoilForce;
                    this.recoilVelY = Math.sin(pushAngleBoss) * recoilForce;
                    this.playerCollisionStunTimer = this.PLAYER_COLLISION_STUN_DURATION_MIRROR;
                }
            }
        }
    }

    takeDamage(amount, ray, playerInstance, bossTakeDamageContext = {}) {
        if (this.health <= 0) return 0; 

        if (!ray) { 
            this.hitBodyFlash = true;
            return super.takeDamage(amount, null, playerInstance, bossTakeDamageContext);
        }

        let angleToRay = Math.atan2(ray.y - this.y, ray.x - this.x);
        let normalizedShieldAngle = this.shieldAngle;
        while (angleToRay < normalizedShieldAngle - Math.PI) angleToRay += 2 * Math.PI;
        while (angleToRay > normalizedShieldAngle + Math.PI) angleToRay -= 2 * Math.PI;
        const distanceToCenter = Math.sqrt((ray.x - this.x) ** 2 + (ray.y - this.y) ** 2);

        if (Math.abs(angleToRay - normalizedShieldAngle) <= this.shieldWidthAngle / 2 && distanceToCenter > this.radius * 0.8) {
            this.hitFlashTimer = this.HIT_FLASH_DURATION;
            this.hitBodyFlash = false; 

            const normalAngle = this.shieldAngle; 
            const incomingVec = { x: ray.dx, y: ray.dy };
            const normalVec = { x: Math.cos(normalAngle), y: Math.sin(normalAngle) };
            const dotIncomingNormal = (-incomingVec.x * normalVec.x) + (-incomingVec.y * normalVec.y);

            if (dotIncomingNormal > 0.1) { 
                const dotReflection = incomingVec.x * normalVec.x + incomingVec.y * normalVec.y;
                ray.dx = incomingVec.x - 2 * dotReflection * normalVec.x;
                ray.dy = incomingVec.y - 2 * dotReflection * normalVec.y;
                const reflectedMagnitude = Math.sqrt(ray.dx ** 2 + ray.dy ** 2) || 1;
                ray.dx = (ray.dx / reflectedMagnitude); 
                ray.dy = (ray.dy / reflectedMagnitude); 

                ray.speed = BASE_RAY_SPEED * REFLECTED_RAY_SPEED_MULTIPLIER;
                ray.initialSpeedMultiplier = REFLECTED_RAY_SPEED_MULTIPLIER; 
                ray.color = REFLECTED_RAY_COLOR;
                ray.isBossProjectile = true; 
                ray.spawnGraceTimer = 50; 
                ray.maxLifetime = REFLECTED_RAY_LIFETIME_AFTER_REFLECTION;
                ray.lifeTimer = ray.maxLifetime;
                ray.wallBounceCount = 0; 
                ray.uniqueWallsHitCount = 0;
                ray.wallsHit = { top: false, bottom: false, left: false, right: false };
                ray.isCorruptedByGravityWell = false; 
                ray.isCorruptedByPlayerWell = false;
                return 0; 
            } else { 
                ray.isActive = false;
                return 0; 
            }
        } else { 
            this.hitBodyFlash = true;
            const damageDealt = super.takeDamage(amount, ray, playerInstance, bossTakeDamageContext); 
            ray.isActive = false; 
            return damageDealt; 
        }
    }
}