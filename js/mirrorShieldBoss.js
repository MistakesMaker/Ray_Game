// js/mirrorShieldBoss.js
import { BossNPC } from './bossBase.js';
import { PLAYER_BOUNCE_FORCE_FROM_BOSS, BASE_RAY_SPEED, REFLECTED_RAY_SPEED_MULTIPLIER, REFLECTED_RAY_COLOR, REFLECTED_RAY_LIFETIME_AFTER_REFLECTION } from './constants.js';
import { checkCollision } from './utils.js';

export class MirrorShieldBoss extends BossNPC { // <<< MAKE SURE 'export' IS HERE
    constructor(x, y, tier) {
        super(x, y, tier, 40, 0.35, 45 + tier * 2.5, '#6A5ACD');
        this.shieldAngle = Math.random() * Math.PI * 2;
        this.shieldWidthAngle = Math.PI;
        this.rotationSpeed = 0.008 + tier * 0.0015;
        this.hitBodyFlash = false;
        this.baseSpeed = 0.35 + tier * 0.025;
        this.speed = this.baseSpeed;
        this.hitStunSlowFactor = 0.05;
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

        if (this.hitBodyFlash) {
            bodyEffectiveColor = `rgba(255, 165, 0, ${0.6 + 0.4 * Math.sin(this.hitFlashTimer * 0.15)})`;
        } else if (this.hitFlashTimer > 0 && !this.hitBodyFlash) { 
            shieldEffectiveColor = `rgba(220, 220, 255, ${0.6 + 0.4 * Math.sin(this.hitFlashTimer * 0.15)})`;
        }


        if (this.bleedTimer > 0 && Math.floor(this.bleedTimer / 100) % 2 === 0) {
            bodyEffectiveColor = '#483D8B';
        }
        if (this.playerCollisionStunTimer > 0) {
            bodyEffectiveColor = `rgba(100, 100, 200, 0.8)`; 
        }


        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = bodyEffectiveColor;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.radius + 3, this.shieldAngle - this.shieldWidthAngle / 2, this.shieldAngle + this.shieldWidthAngle / 2);
        ctx.closePath();
        ctx.fillStyle = shieldEffectiveColor.replace('0.7)', '0.2)');
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = shieldEffectiveColor;
        ctx.stroke();

        ctx.restore();
        super.draw(ctx);
        this.hitBodyFlash = false; 
    }

    update(playerInstance, gameContext) {
        const { dt, canvasWidth, canvasHeight, postDamageImmunityTimer, isPlayerShieldOvercharging } = gameContext;

        super.update(dt, playerInstance); 
        if (this.health <= 0) return;

        const normalizedDtFactor = (dt / (1000 / 60)) || 1;

        if (this.playerCollisionStunTimer > 0) {
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
            this.x += Math.cos(this.driftAngle) * this.speed * 0.1 * normalizedDtFactor; 
            this.y += Math.sin(this.driftAngle) * this.speed * 0.1 * normalizedDtFactor;
        }

        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

        if (checkCollision(this, playerInstance)) {
            const playerIsTeleporting = (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0);
            const playerIsCurrentlyShieldOvercharging = isPlayerShieldOvercharging; 
            const playerIsDamageImmuneFromRecentHit = (postDamageImmunityTimer !== undefined && postDamageImmunityTimer > 0);

            const playerCanTakeDamage = !playerIsDamageImmuneFromRecentHit &&
                                        !playerIsTeleporting &&
                                        !playerIsCurrentlyShieldOvercharging;
            
            if (playerCanTakeDamage && this.playerCollisionStunTimer <= 0) {
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
        if (this.health <= 0) return false;

        if (!ray) { // For non-ray damage, e.g. direct collision already handled or future ability
            this.hitBodyFlash = true;
            return super.takeDamage(amount, null, playerInstance); // Pass null for ray
        }

        let angleToRay = Math.atan2(ray.y - this.y, ray.x - this.x);
        let normalizedShieldAngle = this.shieldAngle;
        // Normalize angleToRay to be within -PI to PI relative to shieldAngle
        while (angleToRay < normalizedShieldAngle - Math.PI) angleToRay += 2 * Math.PI;
        while (angleToRay > normalizedShieldAngle + Math.PI) angleToRay -= 2 * Math.PI;
        const distanceToCenter = Math.sqrt((ray.x - this.x) ** 2 + (ray.y - this.y) ** 2);

        // Check if the ray hits the shield area
        if (Math.abs(angleToRay - normalizedShieldAngle) <= this.shieldWidthAngle / 2 && distanceToCenter > this.radius * 0.8) { // Ray is within shield arc and not too close to center
            this.hitFlashTimer = this.HIT_FLASH_DURATION;
            this.hitBodyFlash = false; // It hit the shield, not the body

            // Reflection Logic (simplified dot product check for "front" hit)
            const normalAngle = this.shieldAngle; // Shield's outward normal
            const incomingVec = { x: ray.dx, y: ray.dy };
            const normalVec = { x: Math.cos(normalAngle), y: Math.sin(normalAngle) };

            // Dot product to see if ray is coming towards the shield face
            // (-incoming . normal) > 0 means it's hitting the front face
            const dotIncomingNormal = (-incomingVec.x * normalVec.x) + (-incomingVec.y * normalVec.y);

            if (dotIncomingNormal > 0.1) { // Ray is hitting the shield's front
                const dotReflection = incomingVec.x * normalVec.x + incomingVec.y * normalVec.y;
                ray.dx = incomingVec.x - 2 * dotReflection * normalVec.x;
                ray.dy = incomingVec.y - 2 * dotReflection * normalVec.y;
                const reflectedMagnitude = Math.sqrt(ray.dx ** 2 + ray.dy ** 2) || 1;
                ray.dx = (ray.dx / reflectedMagnitude); // Normalize
                ray.dy = (ray.dy / reflectedMagnitude); // Normalize

                ray.speed = BASE_RAY_SPEED * REFLECTED_RAY_SPEED_MULTIPLIER;
                ray.initialSpeedMultiplier = REFLECTED_RAY_SPEED_MULTIPLIER; // Update for new speed base
                ray.color = REFLECTED_RAY_COLOR;
                ray.isBossProjectile = true; // Now it's a boss projectile
                ray.spawnGraceTimer = 50; // Short grace period to avoid immediate self-collision if reflected back at boss
                ray.maxLifetime = REFLECTED_RAY_LIFETIME_AFTER_REFLECTION;
                ray.lifeTimer = ray.maxLifetime;
                ray.wallBounceCount = 0; // Reset bounces
                ray.uniqueWallsHitCount = 0;
                ray.wallsHit = { top: false, bottom: false, left: false, right: false };
                ray.isCorruptedByGravityWell = false; // Clear corruption states
                ray.isCorruptedByPlayerWell = false;
                return false; // Damage not applied to boss, ray was reflected
            } else { // Ray hit shield from behind or tangentially, absorb it
                ray.isActive = false;
                return false; // No damage taken
            }
        } else { // Ray hit the body (not the shield)
            this.hitBodyFlash = true;
            super.takeDamage(amount, ray, playerInstance); // Use the base class's takeDamage
            ray.isActive = false; // Ray is consumed
            return true; // Damage applied
        }
    }
}