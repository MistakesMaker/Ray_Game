// js/gravityWellBoss.js
import { BossNPC } from './bossBase.js';
import { getPooledRay, checkCollision } from './utils.js';
import {
    GRAVITY_RAY_PROJECTILE_COLOR, GRAVITY_RAY_SPAWN_ANIM_DURATION,
    GRAVITY_RAY_EXPLOSION_BASE_RADIUS, GRAVITY_RAY_EXPLOSION_RADIUS_PER_RAY,
    GRAVITY_RAY_EXPLOSION_DURATION, GRAVITY_RAY_DETONATION_EXPLOSION_COLOR,
    GRAVITY_RAY_NEW_PROJECTILES_PER_ABSORBED_RAY, GRAVITY_WELL_SCATTER_RAY_LIFETIME,
    BOSS_PROJECTILE_COLOR_DEFAULT, RAY_RADIUS, BASE_RAY_SPEED,
    PLAYER_BOUNCE_FORCE_FROM_BOSS, SCATTERED_ABSORBED_RAY_COLOR
} from './constants.js';
import { playSound, stopSound, gravityWellChargeSound, gravityWellExplodeSound } from './audio.js';


export class GravityWellBoss extends BossNPC {
    constructor(x, y, tier) {
        super(x, y, tier, Math.floor(68 * 1.5), 0.4, 30 + tier * 2, '#20B2AA');
        this.gravityRay = null;
        this.shootCooldown = Math.max(4000, 7000 - tier * 350);
        this.shootCooldownTimer = Math.random() * this.shootCooldown * 0.5;
        this.baseSpeed = 0.45 + tier * 0.035;
        this.speed = this.baseSpeed;
        this.hitStunSlowFactor = 0.2;
        this.activeDetonationEffect = null;
        this.isInitiatingSpawn = false;
        this.initiationTimer = 0;
        this.intendedSpawnAngle = 0;
        this.recoilVelX = 0;
        this.recoilVelY = 0;
        this.playerCollisionStunTimer = 0;
        this.PLAYER_COLLISION_STUN_DURATION = 300;
        this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE = 1.0; 
        this.AEGIS_PASSIVE_BOSS_STUN_DURATION = 50;
    }

    draw(ctx) {
        if (!ctx) return;
        let effectiveColor = this.color;

        if (this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer / this.HIT_FLASH_BLINK_INTERVAL) % 2 === 0) {
            effectiveColor = '#FFFFFF'; 
        } else if (this.isFeared) {
            effectiveColor = 'rgba(255, 0, 255, 0.6)'; 
        } else if (this.bleedTimer > 0 && Math.floor(this.bleedTimer / 100) % 2 === 0) {
            effectiveColor = '#10605A'; 
        } else if (this.hitStunTimer > 0 || this.playerCollisionStunTimer > 0) {
            effectiveColor = `rgba(100, 100, 200, 0.8)`; 
        }


        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = effectiveColor;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF'; 
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        super.draw(ctx); 

        if (this.activeDetonationEffect) {
            const effect = this.activeDetonationEffect;
            const progress = (effect.duration - effect.timer) / effect.duration;
            const currentRadius = effect.maxRadius * progress;
            let opacity = 1 - progress;
            opacity = opacity * opacity * opacity; 
            ctx.beginPath();
            ctx.arc(effect.x, effect.y, currentRadius, 0, Math.PI * 2);
            ctx.fillStyle = GRAVITY_RAY_DETONATION_EXPLOSION_COLOR.replace('opacity', (opacity * 0.8).toString());
            ctx.fill();
        }
    }

    update(playerInstance, gameContext) {
        const { dt, allRays, canvasWidth, canvasHeight, postDamageImmunityTimer, isPlayerShieldOvercharging, getPooledRay } = gameContext;

        super.update(dt, playerInstance, canvasWidth, canvasHeight); 
        if (this.health <= 0) {
            if (this.gravityRay && this.gravityRay.isActive) {
                if(stopSound && gravityWellChargeSound) stopSound(gravityWellChargeSound);
                this.gravityRay.isActive = false; 
            }
            this.gravityRay = null;
            return;
        }

        const normalizedDtFactor = (dt / (1000 / 60)) || 1;
        const angleToPlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);

        if (this.isFeared) {
            if (this.isInitiatingSpawn) {
                this.isInitiatingSpawn = false;
                this.initiationTimer = 0;
                if(stopSound && gravityWellChargeSound) stopSound(gravityWellChargeSound); 
            }
        } else if (this.playerCollisionStunTimer > 0) {
            this.playerCollisionStunTimer -= dt;
            this.x += this.recoilVelX * normalizedDtFactor;
            this.y += this.recoilVelY * normalizedDtFactor;
            this.recoilVelX *= 0.90;
            this.recoilVelY *= 0.90;
            if (Math.abs(this.recoilVelX) < 0.01) this.recoilVelX = 0;
            if (Math.abs(this.recoilVelY) < 0.01) this.recoilVelY = 0;
            if (this.playerCollisionStunTimer <= 0) {
                this.speed = this.baseSpeed;
            }
        } else if (this.hitStunTimer <= 0) { 
            if (this.isInitiatingSpawn) {
                this.x -= Math.cos(this.intendedSpawnAngle) * this.speed * 0.2 * normalizedDtFactor;
                this.y -= Math.sin(this.intendedSpawnAngle) * this.speed * 0.2 * normalizedDtFactor;
            } else {
                this.x += Math.cos(angleToPlayer) * this.speed * normalizedDtFactor;
                this.y += Math.sin(angleToPlayer) * this.speed * normalizedDtFactor;
            }
        } 

        if (!this.isFeared) {
            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
        }


        if (this.isInitiatingSpawn && !this.isFeared) { 
            this.initiationTimer -= dt;
            if (this.initiationTimer <= 0) {
                this.isInitiatingSpawn = false;
                let gravRayInstance = getPooledRay();
                if (gravRayInstance && allRays) {
                    const gravRayFinalRadius = 25 + this.tier * 3;
                    const spawnOffsetDist = this.radius + gravRayFinalRadius + 5;
                    const actualSpawnX = this.x + Math.cos(this.intendedSpawnAngle) * spawnOffsetDist;
                    const actualSpawnY = this.y + Math.sin(this.intendedSpawnAngle) * spawnOffsetDist;
                    
                    gravRayInstance.reset(
                        actualSpawnX, actualSpawnY, GRAVITY_RAY_PROJECTILE_COLOR,
                        Math.cos(this.intendedSpawnAngle), Math.sin(this.intendedSpawnAngle),
                        0.3, null, 7000, 
                        true, false, gravRayFinalRadius, true
                    );

                    gravRayInstance.gravityWellTarget = this;
                    
                    let calculatedGravityRadius = gravRayFinalRadius * 4 + 100 + this.tier * 40;
                    const maxScreenDimension = Math.max(canvasWidth || 800, canvasHeight || 600); 
                    gravRayInstance.gravityRadius = Math.min(calculatedGravityRadius, maxScreenDimension * 0.75); 
                                        
                    gravRayInstance.gravityStrength = 0.15 + this.tier * 0.02;
                    gravRayInstance.corruptionRadius = gravRayFinalRadius; 
                    gravRayInstance.absorbedRays = [];
                    this.gravityRay = gravRayInstance;
                    allRays.push(gravRayInstance);
                }
            }
        } else if (!this.isFeared) { 
            this.shootCooldownTimer -= dt;
            if (this.shootCooldownTimer <= 0 && !this.gravityRay && this.hitStunTimer <= 0 && !this.isInitiatingSpawn && this.playerCollisionStunTimer <= 0) {
                this.shootCooldownTimer = this.shootCooldown;
                this.isInitiatingSpawn = true;
                this.initiationTimer = GRAVITY_RAY_SPAWN_ANIM_DURATION;
                this.intendedSpawnAngle = angleToPlayer;
            }
        }

        if (this.gravityRay && this.gravityRay.isActive && !this.gravityRay.isForming && allRays) {
            this.gravityRay.absorbedRays = this.gravityRay.absorbedRays.filter(r => r && r.isActive);
            const isNearDetonation = this.gravityRay.lifeTimer < 2000;

            allRays.forEach(ray => {
                if (!ray.isActive || ray === this.gravityRay || ray.isBossProjectile || ray.isCorruptedByPlayerWell || ray.state !== 'moving') return;
                const distToWellCenter = Math.sqrt((ray.x - this.gravityRay.x) ** 2 + (ray.y - this.gravityRay.y) ** 2);

                if (ray.isCorruptedByGravityWell) {
                     if (isNearDetonation) {
                        const timeFactor = (2000 - this.gravityRay.lifeTimer) / 2000;
                        ray.speed += (0.02 + 0.03 * timeFactor) * normalizedDtFactor;
                    } else {
                        ray.speed += 0.015 * normalizedDtFactor;
                    }
                    ray.speed = Math.min(ray.speed, BASE_RAY_SPEED * 2.5);
                    const angleRayToWell = Math.atan2(this.gravityRay.y - ray.y, this.gravityRay.x - ray.x);
                    const targetOrbitR = ray.targetOrbitDist;
                    const tangentialAngle = angleRayToWell + (ray.orbitDir * Math.PI / 2);
                    let desiredDx = 0, desiredDy = 0;
                    if (distToWellCenter < targetOrbitR * 0.75) {
                        const pushOutStrength = 0.25 * ray.speed * (dt / (1000/60));
                        desiredDx = -Math.cos(angleRayToWell) * pushOutStrength + Math.cos(tangentialAngle) * ray.speed * 0.1;
                        desiredDy = -Math.sin(angleRayToWell) * pushOutStrength + Math.sin(tangentialAngle) * ray.speed * 0.1;
                    } else {
                        let tDx = Math.cos(tangentialAngle) * ray.speed;
                        let tDy = Math.sin(tangentialAngle) * ray.speed;
                        const radialError = distToWellCenter - targetOrbitR;
                        const radialCorrectionStrength = 0.1 * (dt / (1000 / 60));
                        let rDx = 0, rDy = 0;
                        if (Math.abs(radialError) > 0.5) {
                            rDx = -Math.cos(angleRayToWell) * radialError * radialCorrectionStrength;
                            rDy = -Math.sin(angleRayToWell) * radialError * radialCorrectionStrength;
                        }
                        desiredDx = tDx + rDx; desiredDy = tDy + rDy;
                    }
                    const blend = 0.4;
                    ray.dx = ray.dx * (1-blend) + desiredDx * blend;
                    ray.dy = ray.dy * (1-blend) + desiredDy * blend;
                    const currentSpeedMag = Math.sqrt(ray.dx**2 + ray.dy**2) || 1;
                    ray.dx = (ray.dx / currentSpeedMag) * ray.speed;
                    ray.dy = (ray.dy / currentSpeedMag) * ray.speed;
                    const containmentRadius = this.gravityRay.gravityRadius * 0.98;
                    if (distToWellCenter > containmentRadius) {
                        const angleWellToRay = Math.atan2(ray.y - this.gravityRay.y, ray.x - this.gravityRay.x);
                        ray.x = this.gravityRay.x + Math.cos(angleWellToRay) * containmentRadius;
                        ray.y = this.gravityRay.y + Math.sin(angleWellToRay) * containmentRadius;
                        const clampedTangentialAngle = angleWellToRay + (ray.orbitDir * Math.PI/2);
                        ray.dx = Math.cos(clampedTangentialAngle) * ray.speed;
                        ray.dy = Math.sin(clampedTangentialAngle) * ray.speed;
                        const inwardNudge = 0.02;
                        ray.dx -= Math.cos(angleWellToRay) * ray.speed * inwardNudge;
                        ray.dy -= Math.sin(angleWellToRay) * ray.speed * inwardNudge;
                        const clampedSpeedMag = Math.sqrt(ray.dx**2 + ray.dy**2) || 1;
                        if(clampedSpeedMag > 0.01) {
                            ray.dx = (ray.dx/clampedSpeedMag) * ray.speed;
                            ray.dy = (ray.dy/clampedSpeedMag) * ray.speed;
                        }
                    }
                } else if (distToWellCenter < this.gravityRay.gravityRadius) {
                    const pullAngle = Math.atan2(this.gravityRay.y - ray.y, this.gravityRay.x - ray.x);
                    const pullFactor = this.gravityRay.gravityStrength * ((this.gravityRay.gravityRadius - distToWellCenter) / this.gravityRay.gravityRadius);
                    ray.dx += Math.cos(pullAngle) * pullFactor * (dt / (1000 / 60));
                    ray.dy += Math.sin(pullAngle) * pullFactor * (dt / (1000 / 60));
                    const speedMag = Math.sqrt(ray.dx ** 2 + ray.dy ** 2);
                    let maxPullInfluence = ray.initialSpeedMultiplier * BASE_RAY_SPEED * 1.8;
                    if(speedMag > maxPullInfluence) { ray.dx = (ray.dx / speedMag) * maxPullInfluence; ray.dy = (ray.dy / speedMag) * maxPullInfluence; }

                    if (checkCollision(ray, this.gravityRay)) {
                        if (!this.gravityRay.absorbedRays.includes(ray)) this.gravityRay.absorbedRays.push(ray);
                        if (!ray.isCorruptedByGravityWell) {
                            ray.isCorruptedByGravityWell = true;
                            ray.color = GRAVITY_RAY_PROJECTILE_COLOR;
                            ray.speed = Math.max(ray.speed * 0.6, BASE_RAY_SPEED * 0.4);
                            ray.targetOrbitDist = this.gravityRay.customRadius * (0.80 + Math.random() * 0.15);
                            ray.orbitDir = (Math.random() < 0.5 ? 1 : -1);
                            const angleToCenter = Math.atan2(this.gravityRay.y - ray.y, this.gravityRay.x - ray.x);
                            const initTangentialAngle = angleToCenter + (ray.orbitDir * Math.PI / 2);
                            const tangentWeight = 0.95;
                            ray.dx = (Math.cos(initTangentialAngle) * tangentWeight + Math.cos(angleToCenter) * (1-tangentWeight));
                            ray.dy = (Math.sin(initTangentialAngle) * tangentWeight + Math.sin(angleToCenter) * (1-tangentWeight));
                            const norm = Math.sqrt(ray.dx ** 2 + ray.dy ** 2) || 1;
                            ray.dx = ray.dx / norm * ray.speed;
                            ray.dy = ray.dy / norm * ray.speed;
                        }
                    }
                }
            });
         } else if (this.gravityRay && !this.gravityRay.isActive) {
            this.gravityRay = null;
            if(stopSound && gravityWellChargeSound) stopSound(gravityWellChargeSound);
        }

        if (this.activeDetonationEffect) { this.activeDetonationEffect.timer -= dt; if (this.activeDetonationEffect.timer <= 0) this.activeDetonationEffect = null; }

        if (checkCollision(this, playerInstance)) {
            const playerIsTeleporting = (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0);
            const playerIsCurrentlyShieldOvercharging = isPlayerShieldOvercharging;
            const playerIsDamageImmuneFromRecentHit = (postDamageImmunityTimer !== undefined && postDamageImmunityTimer > 0);
            const canPlayerPhysicallyInteract = !playerIsTeleporting && !playerIsCurrentlyShieldOvercharging;

            if (canPlayerPhysicallyInteract) {
                if (playerInstance.hasAegisPathHelm) {
                    // <<< BUG FIX: Reverted to the simpler, correct logic >>>
                    if (playerInstance.aegisRamCooldownTimer <= 0) {
                        if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                            gameContext.playerCollidedWithBoss = { boss: this, type: "aegisOffensiveRam" };
                        }
                    } else {
                        // This part handles the passive knockback when ram is on cooldown
                        const pushAngleBoss = Math.atan2(this.y - playerInstance.y, this.x - playerInstance.x);
                        this.recoilVelX += Math.cos(pushAngleBoss) * this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE;
                        this.recoilVelY += Math.sin(pushAngleBoss) * this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE;
                        this.playerCollisionStunTimer = Math.max(this.playerCollisionStunTimer, this.AEGIS_PASSIVE_BOSS_STUN_DURATION);
                        this.speed = 0; 
                        const playerPushAngle = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
                        playerInstance.velX += Math.cos(playerPushAngle) * this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE * 0.6;
                        playerInstance.velY += Math.sin(playerPushAngle) * this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE * 0.6;
                    }
                } else {
                    // Player is NOT Aegis Path - Standard collision damage & knockback logic
                    if (!playerIsDamageImmuneFromRecentHit && this.playerCollisionStunTimer <= 0 && !this.isFeared) {
                        if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                             gameContext.playerCollidedWithBoss = { boss: this, type: "standardPlayerDamage" };
                        }
                        const pushAngleBoss = Math.atan2(this.y - playerInstance.y, this.x - playerInstance.x);
                        this.recoilVelX = Math.cos(pushAngleBoss) * PLAYER_BOUNCE_FORCE_FROM_BOSS * 0.2; 
                        this.recoilVelY = Math.sin(pushAngleBoss) * PLAYER_BOUNCE_FORCE_FROM_BOSS * 0.2;
                        this.playerCollisionStunTimer = this.PLAYER_COLLISION_STUN_DURATION;
                        this.speed = 0;
                    }
                }
            }
        }
    }

    detonate(gravityRayInstance, gameContext) {
        if (!gravityRayInstance || !gravityRayInstance.isActive) return;
        const { allRays, screenShakeParams, bossDefeatEffectsArray, getPooledRay, CONSTANTS } = gameContext;

        if(stopSound && gravityWellChargeSound) stopSound(gravityWellChargeSound);

        if (gravityRayInstance.absorbedRays.length === 0 && gravityRayInstance.gravityWellTarget === this) {
            gravityRayInstance.isActive = false;
            if (this.gravityRay === gravityRayInstance) this.gravityRay = null;
            return;
        }

        playSound(gravityWellExplodeSound);
        if (screenShakeParams) {
            screenShakeParams.isScreenShaking = true;
            screenShakeParams.screenShakeTimer = 1500;
            screenShakeParams.currentShakeMagnitude = 12;
            screenShakeParams.currentShakeType = 'playerHit';
        }

        let absorbedForDetonation = [...gravityRayInstance.absorbedRays];
        let countOfActuallyScatteredOriginals = 0;

        absorbedForDetonation.forEach(absorbedRay => {
            if (absorbedRay && absorbedRay.isActive) {
                absorbedRay.isCorruptedByGravityWell = false; 
                absorbedRay.color = SCATTERED_ABSORBED_RAY_COLOR; 
                absorbedRay.isBossProjectile = true; 
                const scatterAngle = Math.random() * Math.PI * 2;
                absorbedRay.dx = Math.cos(scatterAngle);
                absorbedRay.dy = Math.sin(scatterAngle);
                absorbedRay.speed *= (1.25 + Math.random() * 0.5);
                absorbedRay.lifeTimer = GRAVITY_WELL_SCATTER_RAY_LIFETIME * 0.8;
                absorbedRay.maxLifetime = absorbedRay.lifeTimer;
                absorbedRay.wallBounceCount = 0;
                absorbedRay.spawnGraceTimer = 100; 
                countOfActuallyScatteredOriginals++;
            } else if (absorbedRay) {
                absorbedRay.isActive = false; 
            }
        });
        gravityRayInstance.absorbedRays = [];

        const numNewAdditionalRays = countOfActuallyScatteredOriginals * GRAVITY_RAY_NEW_PROJECTILES_PER_ABSORBED_RAY;
        for (let i = 0; i < numNewAdditionalRays; i++) {
            let newRay = getPooledRay();
            if (newRay && allRays) {
                const angle = Math.random() * Math.PI * 2;
                const speedMult = 1.1 + Math.random() * 0.5 + this.tier * 0.06;
                newRay.reset(
                    gravityRayInstance.x, gravityRayInstance.y,
                    BOSS_PROJECTILE_COLOR_DEFAULT,
                    Math.cos(angle), Math.sin(angle),
                    speedMult, null, GRAVITY_WELL_SCATTER_RAY_LIFETIME, 
                    true,  false, RAY_RADIUS, false
                );
                allRays.push(newRay);
            }
        }
        if (bossDefeatEffectsArray) { 
            bossDefeatEffectsArray.push({
                x: gravityRayInstance.x, y: gravityRayInstance.y,
                maxRadius: GRAVITY_RAY_EXPLOSION_BASE_RADIUS + (countOfActuallyScatteredOriginals * GRAVITY_RAY_EXPLOSION_RADIUS_PER_RAY),
                timer: GRAVITY_RAY_EXPLOSION_DURATION, duration: GRAVITY_RAY_EXPLOSION_DURATION,
                radius: 0, initialRadius: 0, 
                color: GRAVITY_RAY_DETONATION_EXPLOSION_COLOR 
            });
        }

        if (this.gravityRay === gravityRayInstance) this.gravityRay = null;
        gravityRayInstance.isActive = false;
    }
}