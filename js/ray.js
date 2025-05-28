// js/ray.js
import {
    RAY_RADIUS,
    BASE_RAY_SPEED,
    RAY_SPAWN_GRACE_PERIOD,
    ABSOLUTE_MAX_RAY_LIFETIME,
    TRAIL_LENGTH,
    MIN_EFFECTIVE_TRAIL_LENGTH,
    MAX_EFFECTIVE_TRAIL_LENGTH,
    TRAIL_SPEED_SCALING_FACTOR,
    BOSS_TRAIL_LENGTH_FACTOR,
    GRAVITY_RAY_TRAIL_LENGTH_FACTOR,
    RAY_FADE_DURATION_BASE,
    MAX_RAY_BOUNCES,
    GRAVITY_RAY_PROJECTILE_COLOR,
    GRAVITY_RAY_SPAWN_ANIM_DURATION,
    REFLECTED_RAY_LIFETIME_AFTER_REFLECTION,
    REFLECTED_RAY_COLOR,
    BASE_BOSS_RAY_LIFETIME,
    PLAYER_GRAVITY_WELL_VISUAL_RADIUS,
    PLAYER_GRAVITY_WELL_PULL_RADIUS,
    PLAYER_GRAVITY_WELL_PULL_STRENGTH,
    PLAYER_GRAVITY_WELL_ABSORBED_RAY_COLOR,
    GRAVITY_RAY_TURN_RATE,
    PLAYER_BOUNCE_FORCE_FROM_GRAVITY_BALL,
    RAY_DAMAGE_TO_PLAYER,
    POST_DAMAGE_IMMUNITY_DURATION,
    SCREEN_SHAKE_DURATION_PLAYER_HIT,
    SCREEN_SHAKE_MAGNITUDE_PLAYER_HIT
} from './constants.js';
import { checkCollision, hexToRgb } from './utils.js';
import { playSound, stopSound, playerWellDeploySound, playerWellDetonateSound, gravityWellChargeSound } from './audio.js';


export class Ray {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.radius = RAY_RADIUS;
        this.color = '#FFFFFF';
        this.originalColor = '#FFFFFF';
        this.dx = 0;
        this.dy = 0;
        this.state = 'moving';
        this.maxLifetime = 0;
        this.lifeTimer = 0;
        this.stationaryTimer = 0;
        this.fadeTimer = 0;
        this.opacity = 1;
        this.spawnGraceTimer = 0;
        this.wallBounceCount = 0;
        this.trail = [];
        this.speed = 0;
        this.initialSpeedMultiplier = 1.0;
        this.isActive = false; // Initialized to false
        this.absoluteAgeTimer = 0;
        this.wallsHit = { top: false, bottom: false, left: false, right: false };
        this.uniqueWallsHitCount = 0;
        this.isBossProjectile = false;
        this.isJuggernautProjectile = false;
        this.isGravityWellRay = false;
        this.isPlayerAbilityRay = false;
        this.customRadius = 0;
        this.gravityWellTarget = null;
        this.gravityRadius = 0;
        this.gravityStrength = 0;
        this.corruptionRadius = 0;
        this.absorbedRays = [];
        this.isCorruptedByGravityWell = false;
        this.isCorruptedByPlayerWell = false;
        this.pierceUsesLeft = 0;
        this.momentumDamageBonusValue = 0;
        this.targetOrbitDist = 0;
        this.orbitDir = 1;
        this.targetOrbitDistPlayerWell = 0;
        this.orbitDirPlayerWell = 1;
        this.isForming = false;
        this.formingDuration = 0;
        this.formingTimer = 0;
        this.targetCustomRadius = 0;
        this.selfCollisionGraceTimer = 0;
        this.damageValue = RAY_DAMAGE_TO_PLAYER; // Default damage value
        this.sourceAbility = null; // For player ability rays
    }

    reset(x, y, color, dx, dy, globalSpeedMultiplier, playerInstance, maxLifetimeForThisRay,
          isBoss = false, isJuggernaut = false, customRad = 0, isGravityRay = false) {

        this.x = x; this.y = y; this.radius = RAY_RADIUS; this.color = color; this.originalColor = color; this.dx = dx; this.dy = dy;
        this.state = 'moving'; this.isBossProjectile = isBoss; this.isJuggernautProjectile = isJuggernaut; this.isGravityWellRay = isGravityRay;
        this.isPlayerAbilityRay = false;
        this.isForming = false; this.formingDuration = 0; this.formingTimer = 0; this.targetCustomRadius = 0;
        this.selfCollisionGraceTimer = 0;
        this.damageValue = RAY_DAMAGE_TO_PLAYER; // Reset damage value
        this.sourceAbility = null; // Reset source ability


        const ownRaySpeedMult = (playerInstance && !isBoss && !isGravityRay) ? playerInstance.ownRaySpeedMultiplier : 1.0;

        if (isGravityRay && isBoss) {
            this.isForming = true;
            this.formingDuration = GRAVITY_RAY_SPAWN_ANIM_DURATION;
            this.formingTimer = this.formingDuration;
            this.speed = 0;
            this.targetCustomRadius = customRad;
            this.customRadius = 0;
            this.maxLifetime = 7000;
            this.selfCollisionGraceTimer = GRAVITY_RAY_SPAWN_ANIM_DURATION + 300;
        } else if (this.isBossProjectile) {
            if (this.color === REFLECTED_RAY_COLOR) {
                this.maxLifetime = REFLECTED_RAY_LIFETIME_AFTER_REFLECTION;
                this.speed = BASE_RAY_SPEED * REFLECTED_RAY_SPEED_MULTIPLIER;
            } else {
                this.maxLifetime = maxLifetimeForThisRay;
                this.speed = BASE_RAY_SPEED * globalSpeedMultiplier;
            }
        } else { // Player's own ray
            this.maxLifetime = maxLifetimeForThisRay;
            this.speed = BASE_RAY_SPEED * globalSpeedMultiplier * ownRaySpeedMult;
        }
        this.customRadius = customRad === 0 ? RAY_RADIUS : customRad;

        this.lifeTimer = this.maxLifetime;
        this.stationaryTimer = 0; this.fadeTimer = 0; this.opacity = 1;
        this.spawnGraceTimer = RAY_SPAWN_GRACE_PERIOD; this.wallBounceCount = 0; this.trail.length = 0;
        this.initialSpeedMultiplier = globalSpeedMultiplier * ownRaySpeedMult;
        this.isActive = true; // <<< CRITICAL: SET TO TRUE ON RESET
        this.absoluteAgeTimer = 0;
        this.wallsHit = { top: false, bottom: false, left: false, right: false };
        this.uniqueWallsHitCount = 0; this.momentumDamageBonusValue = 0;
        this.gravityWellTarget = null; this.gravityRadius = 0;
        this.gravityStrength = 0;
        this.absorbedRays = [];
        this.isCorruptedByGravityWell = false;
        this.isCorruptedByPlayerWell = false;
        this.pierceUsesLeft = (playerInstance && playerInstance.hasTargetPierce && !isBoss && !isGravityRay) ? 1 : 0;
        this.targetOrbitDist = 0; this.orbitDir = 1;
        this.targetOrbitDistPlayerWell = 0; this.orbitDirPlayerWell = 1;
    }

    draw(ctx) {
        if (!this.isActive || !ctx) return;
        ctx.save();
        let currentDisplayRadius = this.customRadius || this.radius;
        let currentOpacity = this.opacity;

        if (this.isForming && this.formingTimer > 0) {
            const formProgress = Math.min(1, 1 - (this.formingTimer / this.formingDuration));
            currentDisplayRadius = this.targetCustomRadius * (formProgress * formProgress);
            currentOpacity = formProgress * this.opacity;
            currentOpacity = Math.max(0, Math.min(1, currentOpacity));
        }

        const trailLen = this.trail.length;
        if (trailLen > 0 && !this.isForming) {
            let headRadius = currentDisplayRadius;
            for (let i = 0; i < trailLen; i++) {
                const p = this.trail[i];
                const progress = i / trailLen;
                const particleRadius = headRadius * (0.15 + progress * 0.45);
                const particleOpacity = (progress * progress * 0.5) * currentOpacity;
                if (particleRadius < 0.5 || particleOpacity < 0.01) continue;
                ctx.beginPath(); ctx.arc(p.x, p.y, particleRadius, 0, Math.PI * 2);
                ctx.globalAlpha = particleOpacity; ctx.fillStyle = this.color; ctx.fill();
            }
        }
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = currentOpacity;
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentDisplayRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        if (this.isGravityWellRay && !this.isForming) {
            const chargeProgress = Math.min(1, (this.maxLifetime - this.lifeTimer) / (this.maxLifetime * 0.8));
            ctx.beginPath(); const glowSize = currentDisplayRadius + chargeProgress * 35 + Math.sin(Date.now() / 70) * 10;
            let glowColorRgb = hexToRgb(GRAVITY_RAY_PROJECTILE_COLOR);
            let rgbaColor = `rgba(200, 0, 0, ${chargeProgress * 0.95 + Math.abs(Math.sin(Date.now() / 100)) * 0.05})`;
            if (glowColorRgb) rgbaColor = `rgba(${glowColorRgb.r}, ${glowColorRgb.g}, ${glowColorRgb.b}, ${chargeProgress * 0.95 + Math.abs(Math.sin(Date.now() / 100)) * 0.05})`;
            ctx.strokeStyle = rgbaColor; ctx.lineWidth = 7 + chargeProgress * 20; ctx.shadowColor = GRAVITY_RAY_PROJECTILE_COLOR; ctx.shadowBlur = 30 + chargeProgress * 35; ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2); ctx.stroke(); ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
        } else if (this.isCorruptedByGravityWell || this.isCorruptedByPlayerWell) {
            ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();
    }


    update(gameContext) {
        if (!this.isActive) return;
        const { dt, player, decoys, canvasWidth, canvasHeight, CONSTANTS, detonateGravityWell, stopSound, gravityWellChargeSound, playerPostDamageImmunityTimer, playerPostPopupImmunityTimer, screenShakeParams, playerTakeDamageFromRayCallback } = gameContext;

        const isThisAScatteredRay = this.isBossProjectile && this.color === CONSTANTS.BOSS_PROJECTILE_COLOR_DEFAULT && !this.isGravityWellRay;

        if (this.isGravityWellRay && this.gravityWellTarget && this.selfCollisionGraceTimer > 0) {
            this.selfCollisionGraceTimer -= dt;
            if (this.selfCollisionGraceTimer < 0) this.selfCollisionGraceTimer = 0;
        } else if (this.spawnGraceTimer > 0) {
            this.spawnGraceTimer -= dt;
        }


        if (this.isForming && this.formingTimer > 0) {
            this.formingTimer -= dt;
            if (this.formingTimer <= 0) {
                this.isForming = false;
                this.formingTimer = 0;
                this.customRadius = this.targetCustomRadius;
                this.speed = BASE_RAY_SPEED * 0.3;
                this.corruptionRadius = this.customRadius;
                if (this.isGravityWellRay && this.gravityWellTarget) {
                    if(playSound && gravityWellChargeSound) playSound(gravityWellChargeSound, true);
                }
            }
            return; // Do not update further if forming
        }

        this.absoluteAgeTimer += dt;

        this.trail.push({ x: this.x, y: this.y });
        let effectiveTrailLength = TRAIL_LENGTH;
        if (this.isGravityWellRay) effectiveTrailLength *= GRAVITY_RAY_TRAIL_LENGTH_FACTOR;
        else if (this.isBossProjectile) effectiveTrailLength *= BOSS_TRAIL_LENGTH_FACTOR;
        else if (this.state === 'moving') {
            effectiveTrailLength = Math.round(effectiveTrailLength * (this.initialSpeedMultiplier * TRAIL_SPEED_SCALING_FACTOR));
            effectiveTrailLength = Math.max(MIN_EFFECTIVE_TRAIL_LENGTH, Math.min(MAX_EFFECTIVE_TRAIL_LENGTH, effectiveTrailLength));
        }
        while (this.trail.length > effectiveTrailLength) { this.trail.shift(); }

        if (this.state === 'moving') {
            this.lifeTimer -= dt;
            if (this.isGravityWellRay && this.gravityWellTarget && player && !this.isCorruptedByGravityWell && !this.isCorruptedByPlayerWell) {
                let targetX = player.x; let targetY = player.y;
                if (decoys && decoys.length > 0) {
                    const activeDecoy = decoys.find(d => d.isActive && d instanceof PlayerGravityWell);
                    if (activeDecoy) { targetX = activeDecoy.x; targetY = activeDecoy.y; }
                }

                const angleToTarget = Math.atan2(targetY - this.y, targetX - this.x);
                let currentAngle = Math.atan2(this.dy, this.dx);
                let angleDiff = angleToTarget - currentAngle;
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                const turnThisFrame = Math.max(-GRAVITY_RAY_TURN_RATE, Math.min(GRAVITY_RAY_TURN_RATE, angleDiff)) * (dt / (1000 / 60));
                currentAngle += turnThisFrame;
                this.dx = Math.cos(currentAngle);
                this.dy = Math.sin(currentAngle);

                if (this.selfCollisionGraceTimer <= 0) {
                    const boss = this.gravityWellTarget;
                    const distToBoss = Math.sqrt((this.x - boss.x)**2 + (this.y - boss.y)**2);
                    const combinedRadii = (this.customRadius || this.radius) + boss.radius;
                    if (distToBoss < combinedRadii + 5) {
                        const pushAngle = Math.atan2(this.y - boss.y, this.x - boss.x);
                        const nudgeStrength = (combinedRadii - distToBoss + 5) * 0.1;
                        this.x += Math.cos(pushAngle) * nudgeStrength;
                        this.y += Math.sin(pushAngle) * nudgeStrength;

                        const dotProduct = this.dx * Math.cos(pushAngle) + this.dy * Math.sin(pushAngle);
                        if (dotProduct < 0) { // Moving towards the boss
                            const tangentAngle1 = pushAngle + Math.PI / 2;
                            const tangentAngle2 = pushAngle - Math.PI / 2;
                            const currentMoveAngle = Math.atan2(this.dy, this.dx);
                            const diff1 = Math.abs(currentMoveAngle - tangentAngle1);
                            const diff2 = Math.abs(currentMoveAngle - tangentAngle2);
                            const finalTangentAngle = (diff1 < diff2) ? tangentAngle1 : tangentAngle2; // Choose closest tangent
                            this.dx = Math.cos(finalTangentAngle) * 0.5 + this.dx * 0.5; // Blend
                            this.dy = Math.sin(finalTangentAngle) * 0.5 + this.dy * 0.5;
                            const newMag = Math.sqrt(this.dx**2 + this.dy**2) || 1;
                            this.dx /= newMag; this.dy /= newMag;
                        }
                    }
                }
            }

            this.x += this.dx * this.speed;
            this.y += this.dy * this.speed;

            const N = 0.5; let currentCollisionRadius = this.customRadius || this.radius; let didBounce = false; let passedThroughWall = false;
             if (player && player.visualModifiers && player.visualModifiers.phaseStabilizers && !this.isBossProjectile && !this.isGravityWellRay && !this.isCorruptedByGravityWell && !this.isCorruptedByPlayerWell) {
                const nearLeft = this.x - currentCollisionRadius < N;
                const nearRight = this.x + currentCollisionRadius > canvasWidth - N;
                const nearTop = this.y - currentCollisionRadius < N;
                const nearBottom = this.y + currentCollisionRadius > canvasHeight - N;
                if (nearLeft || nearRight || nearTop || nearBottom) {
                    if (Math.random() < 0.15) passedThroughWall = true; // 15% chance to phase
                }
            }

            if (!passedThroughWall && !this.isCorruptedByGravityWell && !this.isCorruptedByPlayerWell) { // Only bounce if not phased and not corrupted
                const maxBouncesForThisRay = this.isGravityWellRay && this.gravityWellTarget ? 2 : MAX_RAY_BOUNCES;
                if (this.x - currentCollisionRadius < 0) { this.x = currentCollisionRadius + N; this.dx *= -1; this.wallBounceCount++; didBounce = true; }
                else if (this.x + currentCollisionRadius > canvasWidth) { this.x = canvasWidth - currentCollisionRadius - N; this.dx *= -1; this.wallBounceCount++; didBounce = true; }
                if (this.y - currentCollisionRadius < 0) { this.y = currentCollisionRadius + N; this.dy *= -1; this.wallBounceCount++; didBounce = true; }
                else if (this.y + currentCollisionRadius > canvasHeight) { this.y = canvasHeight - currentCollisionRadius - N; this.dy *= -1; this.wallBounceCount++; didBounce = true; }

                if (this.wallBounceCount > maxBouncesForThisRay) {
                    if (this.isGravityWellRay && this.gravityWellTarget) {
                        this.isActive = false;
                        if(stopSound && gravityWellChargeSound && this.gravityWellTarget.gravityRay === this) stopSound(gravityWellChargeSound);
                        if(this.gravityWellTarget.gravityRay === this) this.gravityWellTarget.gravityRay = null;
                        return;
                    }
                    // For other rays, hitting max bounces makes them fade (handled below)
                }
            }
            if (didBounce && player && player.visualModifiers && player.visualModifiers.momentumInjectors && !this.isBossProjectile && !this.isGravityWellRay) {const maxBonus = 0.25; this.momentumDamageBonusValue = Math.min(maxBonus, (this.momentumDamageBonusValue || 0) + (player.momentumDamageBonus || 0));}
            if (!this.isActive) return; // Check if isActive changed during bounce logic (e.g. gravity well ray deactivation)


            if (this.isGravityWellRay && player && this.gravityWellTarget && this.selfCollisionGraceTimer <= 0 && !this.isForming) {
                const playerCanBeHit = (!playerPostDamageImmunityTimer || playerPostDamageImmunityTimer <= 0) &&
                                     (!playerPostPopupImmunityTimer || playerPostPopupImmunityTimer <= 0) &&
                                     !(player.teleporting && player.teleportEffectTimer > 0) &&
                                     !player.isShieldOvercharging;

                if (playerCanBeHit && checkCollision(player, this)) {
                    if (playerTakeDamageFromRayCallback) {
                         playerTakeDamageFromRayCallback(this); // Callback will handle damage and immunity
                    }
                }
            }


            let shouldStartFading = false;
            if (this.absoluteAgeTimer >= ABSOLUTE_MAX_RAY_LIFETIME) { shouldStartFading = true; }
            else if (this.lifeTimer <= 0 && !this.isGravityWellRay) { shouldStartFading = true; } // Gravity well has its own detonation logic
            else if (this.wallBounceCount >= MAX_RAY_BOUNCES && !(this.isGravityWellRay && this.gravityWellTarget)) { shouldStartFading = true; } // Gravity well doesn't fade on bounce count


            if (this.isGravityWellRay && this.lifeTimer <= 0 && this.gravityWellTarget) { // Gravity Well specific detonation
                if (detonateGravityWell) detonateGravityWell(this); // Call the provided detonate function
                this.isActive = false; return; // Should be handled by detonate setting isActive=false
            }
            if (shouldStartFading) {
                if (!(this.isGravityWellRay && this.gravityWellTarget) || isThisAScatteredRay ) { // Don't auto-fade active boss gravity wells, they detonate
                    this.state = 'fading'; this.fadeTimer = RAY_FADE_DURATION_BASE; this.dx = 0; this.dy = 0;
                }
            }
        } else if (this.state === 'fading') {
            this.fadeTimer -= dt; this.opacity = Math.max(0, this.fadeTimer / RAY_FADE_DURATION_BASE);
            if (this.trail.length > 0 && Math.random() < .35) this.trail.shift(); // Reduce trail faster
            if (this.opacity <= 0) { this.isActive = false; }
        }
    }
    bounce() { const nA = Math.random() * Math.PI * 2; this.dx = Math.cos(nA); this.dy = Math.sin(nA); } // Basic random bounce, might need more context
}


export class PlayerGravityWell {
    constructor(x, y, duration) {
        this.x = x; this.y = y; this.radius = PLAYER_GRAVITY_WELL_VISUAL_RADIUS;
        this.pullRadius = PLAYER_GRAVITY_WELL_PULL_RADIUS;
        this.pullStrengthFactor = PLAYER_GRAVITY_WELL_PULL_STRENGTH;
        this.lifeTimer = duration; this.maxLife = duration;
        this.absorbedRays = []; this.isActive = true; this.pulseTimer = 0;
        this.isPendingDetonation = false;
        this.playerWellDeploySound = playerWellDeploySound;
        this.playerWellDetonateSound = playerWellDetonateSound;
    }

    update(gameContext) {
        if (!this.isActive) return;
        const { dt, allRays, activeBosses, player } = gameContext;

        this.lifeTimer -= dt;
        if (this.lifeTimer <= 0 && !this.isPendingDetonation) {
            this.isPendingDetonation = true; // Mark for detonation
        }
        this.pulseTimer += dt;
        this.absorbedRays = this.absorbedRays.filter(r => r && r.isActive); // Clean up absorbed rays

        // Check collision with bosses to auto-detonate
        if (activeBosses && activeBosses.length > 0) {
            for (const boss of activeBosses) {
                if (checkCollision(this, boss)) { this.isPendingDetonation = true; return; } // Detonate on boss collision
            }
        }


        if (allRays) {
            allRays.forEach(ray => {
                if (!ray.isActive || ray.isGravityWellRay || ray.state !== 'moving') return; // Skip self, boss gravity wells, non-moving rays

                const distToWellCenter = Math.sqrt((ray.x - this.x) ** 2 + (ray.y - this.y) ** 2);

                if (ray.isCorruptedByPlayerWell) {
                    // Orbital mechanics for rays already corrupted by THIS well
                    const angleRayToWell = Math.atan2(this.y - ray.y, this.x - ray.x);
                    const targetOrbitR = ray.targetOrbitDistPlayerWell; // Each ray might have a slightly different orbit
                    const tangentialAngle = angleRayToWell + (ray.orbitDirPlayerWell * Math.PI / 2);
                    let desiredDx = 0; let desiredDy = 0;

                    if (distToWellCenter < targetOrbitR * 0.75 ) { // Too close, push out slightly while trying to orbit
                        const pushOutStrength = 0.25 * ray.speed * (dt / (1000/60));
                        desiredDx = -Math.cos(angleRayToWell) * pushOutStrength + Math.cos(tangentialAngle) * ray.speed * 0.1;
                        desiredDy = -Math.sin(angleRayToWell) * pushOutStrength + Math.sin(tangentialAngle) * ray.speed * 0.1;
                    } else { // Attempt to maintain orbit
                        let tDx = Math.cos(tangentialAngle) * ray.speed;
                        let tDy = Math.sin(tangentialAngle) * ray.speed;
                        const radialError = distToWellCenter - targetOrbitR;
                        const radialCorrectionStrength = 0.1 * (dt / (1000 / 60)); // How strongly it corrects to the orbit radius
                        let rDx = 0, rDy = 0;
                        if (Math.abs(radialError) > 0.5) { // If significantly off orbit
                            rDx = -Math.cos(angleRayToWell) * radialError * radialCorrectionStrength;
                            rDy = -Math.sin(angleRayToWell) * radialError * radialCorrectionStrength;
                        }
                        desiredDx = tDx + rDx; desiredDy = tDy + rDy;
                    }
                    const blend = 0.4; // How much the desired velocity influences current velocity
                    ray.dx = ray.dx * (1 - blend) + desiredDx * blend;
                    ray.dy = ray.dy * (1 - blend) + desiredDy * blend;
                    const currentSpeedMag = Math.sqrt(ray.dx ** 2 + ray.dy ** 2) || 1;
                    ray.dx = (ray.dx / currentSpeedMag) * ray.speed; // Renormalize to maintain speed
                    ray.dy = (ray.dy / currentSpeedMag) * ray.speed;

                    // Keep rays within the pull radius (soft boundary)
                    const containmentRadius = this.pullRadius * 0.98;
                    if (distToWellCenter > containmentRadius) {
                        const angleWellToRay = Math.atan2(ray.y - this.y, ray.x - this.x);
                        ray.x = this.x + Math.cos(angleWellToRay) * containmentRadius;
                        ray.y = this.y + Math.sin(angleWellToRay) * containmentRadius;
                        // Redirect to orbit tangentially at the boundary
                        const clampedTangentialAngle = angleWellToRay + (ray.orbitDirPlayerWell * Math.PI / 2);
                        ray.dx = Math.cos(clampedTangentialAngle) * ray.speed;
                        ray.dy = Math.sin(clampedTangentialAngle) * ray.speed;
                        // Add a slight inward nudge to help recapture
                        const inwardNudgeFactor = 0.02;
                        ray.dx -= Math.cos(angleWellToRay) * ray.speed * inwardNudgeFactor;
                        ray.dy -= Math.sin(angleWellToRay) * ray.speed * inwardNudgeFactor;
                        const clampedSpeedMag = Math.sqrt(ray.dx**2 + ray.dy**2) || 1;
                        if (clampedSpeedMag > 0.01) { ray.dx = (ray.dx / clampedSpeedMag) * ray.speed; ray.dy = (ray.dy / clampedSpeedMag) * ray.speed; }
                    }

                } else if (distToWellCenter < this.pullRadius) { // Ray is in pull range, but not yet corrupted
                    const pullAngle = Math.atan2(this.y - ray.y, this.x - ray.x);
                    const pullFactor = this.pullStrengthFactor * ((this.pullRadius - distToWellCenter) / this.pullRadius); // Stronger pull closer to center
                    ray.dx += Math.cos(pullAngle) * pullFactor * (dt / (1000 / 60));
                    ray.dy += Math.sin(pullAngle) * pullFactor * (dt / (1000 / 60));
                    const speedMag = Math.sqrt(ray.dx ** 2 + ray.dy ** 2);
                    let maxPullInfluence = ray.initialSpeedMultiplier * BASE_RAY_SPEED * (ray.isBossProjectile ? 1.2 : 1.8); // Limit how much pull can alter speed quickly
                    if (speedMag > maxPullInfluence) { ray.dx = (ray.dx / speedMag) * maxPullInfluence; ray.dy = (ray.dy / speedMag) * maxPullInfluence; }

                    if (checkCollision(ray, this)) { // Ray has reached the visual core of the well
                        if (!this.absorbedRays.includes(ray)) { this.absorbedRays.push(ray); }
                        if (!ray.isCorruptedByPlayerWell) {
                            ray.isCorruptedByPlayerWell = true;
                            ray.isCorruptedByGravityWell = false; // Ensure it's not corrupted by a boss well
                            ray.color = PLAYER_GRAVITY_WELL_ABSORBED_RAY_COLOR;
                            let currentRaySpeed = Math.sqrt(ray.dx ** 2 + ray.dy ** 2) || ray.speed;
                            ray.speed = Math.max(currentRaySpeed * 0.6, BASE_RAY_SPEED * 0.5); // Slow down a bit
                            ray.targetOrbitDistPlayerWell = this.radius + (this.pullRadius - this.radius) * (0.65 + Math.random() * 0.30); // Assign random orbit within well
                            ray.orbitDirPlayerWell = (Math.random() < 0.5 ? 1 : -1); // Random orbit direction
                            // Initialize tangential velocity for orbit
                            const angleToCenter = Math.atan2(this.y - ray.y, this.x - ray.x);
                            const initTangentialAngle = angleToCenter + (ray.orbitDirPlayerWell * Math.PI / 2);
                            const tangentWeight = 0.95; // Mostly tangential, slight pull inward
                            ray.dx = (Math.cos(initTangentialAngle) * tangentWeight + Math.cos(angleToCenter) * (1 - tangentWeight));
                            ray.dy = (Math.sin(initTangentialAngle) * tangentWeight + Math.sin(angleToCenter) * (1 - tangentWeight));
                            const norm = Math.sqrt(ray.dx ** 2 + ray.dy ** 2) || 1;
                            ray.dx = ray.dx / norm * ray.speed;
                            ray.dy = ray.dy / norm * ray.speed;
                        }
                    }
                }
            });
        }
    }

    draw(ctx) {
        if (!ctx || (!this.isActive && !this.isPendingDetonation)) return; // Don't draw if fully inactive
        ctx.save();
        const pulseFactor = 0.8 + Math.abs(Math.sin(this.pulseTimer / 200)) * 0.2;
        const currentVisualRadius = this.radius * pulseFactor;
        const currentPullRadiusDisplay = this.pullRadius * pulseFactor * 0.8; // Visual representation of pull, slightly smaller
        const alpha = 0.3 + (this.lifeTimer / this.maxLife) * 0.4; // Fade as it expires

        // Draw outer pull radius hint
        ctx.beginPath(); ctx.arc(this.x, this.y, currentPullRadiusDisplay, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(173, 216, 230, ${alpha * 0.2})`; ctx.lineWidth = 1; ctx.stroke();

        // Draw core visual
        ctx.beginPath(); ctx.arc(this.x, this.y, currentVisualRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(this.x, this.y, currentVisualRadius * 0.1, this.x, this.y, currentVisualRadius);
        gradient.addColorStop(0, `rgba(200, 220, 255, ${alpha * 0.8})`);
        gradient.addColorStop(0.7, `rgba(173, 216, 230, ${alpha * 0.5})`);
        gradient.addColorStop(1, `rgba(100, 150, 200, ${alpha * 0.3})`);
        ctx.fillStyle = gradient; ctx.fill();

        // Inner particle effects
        for (let i = 0; i < 5; i++) {
            const angle = (this.pulseTimer / (300 + i * 50)) + (i * Math.PI * 2 / 5);
            const dist = currentVisualRadius * 0.6 * Math.sin(this.pulseTimer / (400 + i * 60)); // Oscillating distance
            const px = this.x + Math.cos(angle) * dist;
            const py = this.y + Math.sin(angle) * dist;
            ctx.fillStyle = `rgba(220, 230, 255, ${alpha * 0.7})`;
            ctx.fillRect(px - 1, py - 1, 2, 2); // Small square particles
        }
        ctx.restore();
    }

    detonate(detonateContext) {
        if (!this.isActive) return; // Can't detonate if not active
        this.isActive = false; this.isPendingDetonation = false; // Mark as detonated and inactive
        const { targetX, targetY, player } = detonateContext;

        playSound(this.playerWellDetonateSound);
        this.absorbedRays.forEach(ray => {
            if (ray && ray.isActive) { // Only redirect active absorbed rays
                const angleToCursor = Math.atan2(targetY - ray.y, targetX - ray.x);
                ray.dx = Math.cos(angleToCursor);
                ray.dy = Math.sin(angleToCursor);
                // Apply kinetic boost to ray speed if player has it
                let boostedSpeed = (ray.initialSpeedMultiplier * BASE_RAY_SPEED) * 2.0; // Base boost
                if (player && typeof player.currentGravityWellKineticBoost === 'number' && player.currentGravityWellKineticBoost > 1.0) {
                    boostedSpeed *= player.currentGravityWellKineticBoost;
                }
                ray.speed = boostedSpeed;
                ray.initialSpeedMultiplier = boostedSpeed / BASE_RAY_SPEED; // Update for consistency if needed later

                ray.isBossProjectile = false; // No longer a boss projectile, if it was
                ray.isGravityWellRay = false; // No longer a (boss) gravity well
                ray.isCorruptedByPlayerWell = false; // No longer corrupted by this player well
                ray.isCorruptedByGravityWell = false; // Clear other corruption
                ray.color = PLAYER_GRAVITY_WELL_ABSORBED_RAY_COLOR; // distinct color for launched rays
                ray.spawnGraceTimer = 50; // Brief grace period
                ray.pierceUsesLeft = (player && player.hasTargetPierce) ? 1 : 0;
                ray.momentumDamageBonusValue = 0; // Reset momentum
                ray.isPlayerAbilityRay = true; // Mark as launched by player ability
                ray.sourceAbility = 'miniGravityWell'; // Identify the source
            }
        });
        this.absorbedRays = []; // Clear absorbed rays
        if(player && player.activeMiniWell === this) player.activeMiniWell = null; // Clear player's reference
    }
}