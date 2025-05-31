// js/nexusWeaverBoss.js
import { BossNPC } from './bossBase.js';
import { PLAYER_BOUNCE_FORCE_FROM_BOSS, RAY_RADIUS } from './constants.js';
import * as CONSTANTS from './constants.js';
import { checkCollision, getPooledRay } from './utils.js';

class MinionBase {
    constructor(x, y, radius, hp, color, bossTier) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.hp = hp;
        this.color = color;
        this.bossTier = bossTier;
        this.isActive = true;
        this.hitFlashTimer = 0;
        this.HIT_FLASH_DURATION_MINION = 80;
    }

    draw(ctx) {
        if (!this.isActive || !ctx) return;
        let effectiveColor = this.color;
        if (this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer / 40) % 2 === 0) {
            effectiveColor = '#FFFFFF';
        }

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = effectiveColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    takeDamage(amount, playerInstance, mainBoss) {
        if (!this.isActive || this.hp <= 0) return 0; // No damage if not active or already dead

        this.hp -= amount;
        this.hitFlashTimer = this.HIT_FLASH_DURATION_MINION;

        if (playerInstance && typeof playerInstance.totalDamageDealt === 'number') {
             playerInstance.totalDamageDealt += amount;
        }
        if (mainBoss && typeof mainBoss.lastDamageSourcePlayer === 'function') {
            mainBoss.lastDamageSourcePlayer();
        }
        if (this.hp <= 0) {
            this.isActive = false;
        }
        return amount; // Return damage dealt
    }

    updateBase(dt) {
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
        }
    }
}

class DroneMinion extends MinionBase {
    constructor(x, y, bossTier) {
        super(x, y, CONSTANTS.DRONE_RADIUS, CONSTANTS.DRONE_HP, CONSTANTS.DRONE_COLOR, bossTier);
        this.speed = CONSTANTS.DRONE_BASE_SPEED + bossTier * CONSTANTS.DRONE_SPEED_PER_TIER;
        this.damage = CONSTANTS.DRONE_DAMAGE;
    }

    update(dt, playerInstance, canvasWidth, canvasHeight, gameContext) { 
        this.updateBase(dt);
        if (!this.isActive || !playerInstance) return;

        const normalizedDtFactor = dt / (1000 / 60) || 1;
        const angleToPlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
        this.x += Math.cos(angleToPlayer) * this.speed * normalizedDtFactor;
        this.y += Math.sin(angleToPlayer) * this.speed * normalizedDtFactor;

        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

        if (checkCollision(this, playerInstance)) {
            if (gameContext && gameContext.playerCollidedWithMinion) { 
                gameContext.playerCollidedWithMinion(this);
            }
            this.isActive = false;
        }
    }
}

class LancerMinion extends MinionBase {
    constructor(x, y, bossTier) {
        super(x, y, CONSTANTS.LANCER_RADIUS, CONSTANTS.LANCER_HP, CONSTANTS.LANCER_COLOR, bossTier);
        this.speed = CONSTANTS.LANCER_BASE_SPEED + bossTier * CONSTANTS.LANCER_SPEED_PER_TIER;
        this.dashSpeed = CONSTANTS.LANCER_DASH_SPEED_BASE + bossTier * CONSTANTS.LANCER_DASH_SPEED_PER_TIER;
        this.damage = CONSTANTS.LANCER_DAMAGE;
        this.state = 'roaming';
        this.aimTimer = 0;
        this.dashTimer = 0;
        this.postDashCooldownTimer = 0;
        this.dashAngle = 0;
        this.targetX = 0; this.targetY = 0;
        this.roamTargetTimer = 0;
    }

    update(dt, playerInstance, canvasWidth, canvasHeight, gameContext) { 
        this.updateBase(dt);
        if (!this.isActive || !playerInstance) return;

        const normalizedDtFactor = dt / (1000 / 60) || 1;

        if (this.state === 'roaming') {
            this.roamTargetTimer -= dt;
            if (this.roamTargetTimer <= 0) {
                this.targetX = playerInstance.x + (Math.random() - 0.5) * 300;
                this.targetY = playerInstance.y + (Math.random() - 0.5) * 300;
                this.roamTargetTimer = 1500 + Math.random() * 1000;
            }
            const angleToTarget = Math.atan2(this.targetY - this.y, this.targetX - this.x);
            this.x += Math.cos(angleToTarget) * this.speed * normalizedDtFactor;
            this.y += Math.sin(angleToTarget) * this.speed * normalizedDtFactor;

            const distToPlayer = Math.hypot(playerInstance.x - this.x, playerInstance.y - this.y);
            if (distToPlayer < 300 + this.bossTier * 20) {
                this.state = 'aiming';
                this.aimTimer = CONSTANTS.LANCER_AIM_TIME;
            }
        } else if (this.state === 'aiming') {
            this.aimTimer -= dt;
            const angleToPlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
            this.x += Math.cos(angleToPlayer) * this.speed * 0.2 * normalizedDtFactor;
            this.y += Math.sin(angleToPlayer) * this.speed * 0.2 * normalizedDtFactor;

            if (this.aimTimer <= 0) {
                this.state = 'dashing';
                this.dashAngle = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
                this.dashTimer = CONSTANTS.LANCER_DASH_DURATION;
            }
        } else if (this.state === 'dashing') {
            this.dashTimer -= dt;
            this.x += Math.cos(this.dashAngle) * this.dashSpeed * normalizedDtFactor;
            this.y += Math.sin(this.dashAngle) * this.dashSpeed * normalizedDtFactor;

            if (this.dashTimer <= 0 || this.x < -this.radius || this.x > canvasWidth + this.radius || this.y < -this.radius || this.y > canvasHeight + this.radius) {
                this.state = 'cooldown';
                this.postDashCooldownTimer = CONSTANTS.LANCER_POST_DASH_COOLDOWN;
            }
        } else if (this.state === 'cooldown') {
            this.postDashCooldownTimer -= dt;
            this.x += (Math.random() - 0.5) * this.speed * 0.1 * normalizedDtFactor;
            this.y += (Math.random() - 0.5) * this.speed * 0.1 * normalizedDtFactor;
            if (this.postDashCooldownTimer <= 0) {
                this.state = 'roaming';
                this.roamTargetTimer = 0;
            }
        }

        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

        if (checkCollision(this, playerInstance)) {
            if (gameContext && gameContext.playerCollidedWithMinion) { 
                gameContext.playerCollidedWithMinion(this);
            }
            this.isActive = false;
        }
    }

    draw(ctx) {
        super.draw(ctx);
        if (!this.isActive || !ctx) return;

        if (this.state === 'aiming') {
            ctx.save();
            ctx.translate(this.x, this.y);
            const aimProgress = 1 - (this.aimTimer / CONSTANTS.LANCER_AIM_TIME);
            ctx.strokeStyle = `rgba(255, 100, 100, ${0.2 + aimProgress * 0.6})`;
            ctx.lineWidth = 1 + aimProgress * 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 2 + aimProgress * 5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }
}

class OrbiterMinion extends MinionBase {
    constructor(x, y, bossTier, nexusWeaverInstance) {
        super(x, y, CONSTANTS.ORBITER_RADIUS, CONSTANTS.ORBITER_HP, CONSTANTS.ORBITER_COLOR, bossTier);
        this.nexusWeaver = nexusWeaverInstance;
        this.orbitDistance = CONSTANTS.ORBITER_ORBIT_DISTANCE_BASE + bossTier * CONSTANTS.ORBITER_ORBIT_DISTANCE_PER_TIER;
        this.currentOrbitAngle = Math.random() * Math.PI * 2;
        this.orbitSpeed = CONSTANTS.ORBITER_ORBIT_SPEED * (Math.random() < 0.5 ? 1 : -1);
        this.shootCooldown = CONSTANTS.ORBITER_SHOOT_COOLDOWN_BASE - bossTier * CONSTANTS.ORBITER_SHOOT_COOLDOWN_REDUCTION_PER_TIER;
        this.shootTimer = Math.random() * this.shootCooldown;
        this.damage = CONSTANTS.DRONE_DAMAGE; 
    }

    update(dt, playerInstance, canvasWidth, canvasHeight, gameContext) { 
        this.updateBase(dt);
        if (!this.isActive || !playerInstance || !this.nexusWeaver) return;

        const normalizedDtFactor = dt;

        this.currentOrbitAngle += this.orbitSpeed * normalizedDtFactor;
        this.x = this.nexusWeaver.x + Math.cos(this.currentOrbitAngle) * this.orbitDistance;
        this.y = this.nexusWeaver.y + Math.sin(this.currentOrbitAngle) * this.orbitDistance;

        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
            this.shootTimer = this.shootCooldown;
            if (gameContext && gameContext.nexusWeaverShootsOrbiterProjectile) { 
                gameContext.nexusWeaverShootsOrbiterProjectile(this, playerInstance);
            }
        }
         if (checkCollision(this, playerInstance)) {
            if (gameContext && gameContext.playerCollidedWithMinion) { 
                gameContext.playerCollidedWithMinion(this); 
            }
            this.isActive = false;
        }
    }

    draw(ctx) {
        super.draw(ctx);
        if (!this.isActive || !ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.currentOrbitAngle * 2 + Date.now() * 0.001);
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const wingX = Math.cos(angle) * (this.radius * 0.7);
            const wingY = Math.sin(angle) * (this.radius * 0.7);
            ctx.fillStyle = `rgba(220, 150, 255, 0.7)`;
            ctx.beginPath();
            ctx.arc(wingX, wingY, this.radius * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}


export class NexusWeaverBoss extends BossNPC {
    constructor(x, y, tier) {
        super(x, y, tier,
            CONSTANTS.NEXUS_WEAVER_BASE_HP,
            CONSTANTS.NEXUS_WEAVER_HP_PER_TIER_FACTOR,
            CONSTANTS.NEXUS_WEAVER_RADIUS_BASE + tier * CONSTANTS.NEXUS_WEAVER_RADIUS_PER_TIER,
            CONSTANTS.NEXUS_WEAVER_COLOR
        );
        this.baseSpeed = CONSTANTS.NEXUS_WEAVER_BASE_SPEED + tier * CONSTANTS.NEXUS_WEAVER_SPEED_PER_TIER;
        this.speed = this.baseSpeed;
        this.hitStunSlowFactor = 0.1;

        this.activeMinions = [];
        this.spawnCooldown = Math.max(2000, CONSTANTS.NEXUS_WEAVER_SPAWN_COOLDOWN_BASE - tier * CONSTANTS.NEXUS_WEAVER_SPAWN_COOLDOWN_REDUCTION_PER_TIER);
        this.spawnTimer = this.spawnCooldown * 0.5;
        this.spawnTellDuration = CONSTANTS.NEXUS_WEAVER_SPAWN_TELL_DURATION;
        this.isSpawning = false;
        this.spawnTellTimer = 0;

        this.pulseNovaActive = false;
        this.pulseNovaTimer = 0;
        this.pulseNovaMaxRadius = 0;
        this.pulseNovaCurrentRadius = 0;
        this.pulseNovaCooldownTimer = CONSTANTS.PULSE_NOVA_COOLDOWN / 2;
        this.playerCloseTimer = 0;

        this._lastDamageSourcePlayer = false;
        this._lastDamageTimestamp = 0;
    }

    lastDamageSourcePlayer() {
        this._lastDamageSourcePlayer = true;
        this._lastDamageTimestamp = Date.now();
    }

    draw(ctx) {
        if (!ctx) return;
        let effectiveColor = this.color;
        let highlightColor = '#FF00FF';

        if (this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer / 50) % 2 === 0) {
            effectiveColor = '#FFFFFF';
        } else if (this.bleedTimer > 0 && Math.floor(this.bleedTimer / 100) % 2 === 0) {
            effectiveColor = '#300052';
        } else if (this.hitStunTimer > 0 || this.playerCollisionStunTimer > 0) {
            effectiveColor = `rgba(100, 100, 200, 0.8)`;
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.isSpawning && this.spawnTellTimer > 0) {
            const spawnProgress = 1 - (this.spawnTellTimer / this.spawnTellDuration);
            const glowRadius = this.radius + 10 + spawnProgress * 20;
            const glowAlpha = 0.2 + spawnProgress * 0.5;
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 255, ${glowAlpha})`;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = effectiveColor;
        ctx.fill();

        const numFacets = 5 + this.tier;
        for (let i = 0; i < numFacets; i++) {
            const angle = (i / numFacets) * Math.PI * 2 + (Date.now() * 0.0001 * (i % 2 === 0 ? 1 : -1));
            const dist = this.radius * (0.6 + Math.random() * 0.3);
            const facetSize = this.radius * (0.15 + Math.random() * 0.1);
            const facetX = Math.cos(angle) * dist;
            const facetY = Math.sin(angle) * dist;
            ctx.save();
            ctx.translate(facetX, facetY);
            ctx.rotate(angle + Math.PI / 4);
            ctx.fillStyle = this.isSpawning ? `rgba(255,100,255,0.8)` : highlightColor;
            ctx.fillRect(-facetSize / 2, -facetSize / 2, facetSize, facetSize);
            ctx.restore();
        }
        ctx.strokeStyle = 'rgba(200, 100, 255, 0.7)';
        ctx.lineWidth = 2 + this.tier * 0.5;
        ctx.stroke();
        ctx.restore();

        super.draw(ctx);

        if (this.pulseNovaActive) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.pulseNovaCurrentRadius, 0, Math.PI * 2);
            const novaAlpha = 0.8 * (this.pulseNovaTimer / CONSTANTS.PULSE_NOVA_DURATION);
            ctx.fillStyle = `rgba(200, 50, 255, ${novaAlpha * 0.5})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 150, 255, ${novaAlpha})`;
            ctx.lineWidth = 4 + (1 - (this.pulseNovaTimer / CONSTANTS.PULSE_NOVA_DURATION)) * 8;
            ctx.stroke();
        }
        this.activeMinions.forEach(minion => minion.draw(ctx));
    }

    spawnMinions() {
        this.isSpawning = false;
        let dronesToSpawn = 2 + Math.floor(this.tier * 0.8);
        let lancersToSpawn = (this.tier >= 2) ? 1 + Math.floor((this.tier - 1) * 0.5) : 0;
        let orbitersToSpawn = (this.tier >= 3) ? 1 + Math.floor((this.tier - 2) * 0.4) : 0;

        const spawnTypes = [];
        for(let i=0; i<dronesToSpawn; i++) spawnTypes.push('drone');
        for(let i=0; i<lancersToSpawn; i++) spawnTypes.push('lancer');
        for(let i=0; i<orbitersToSpawn; i++) spawnTypes.push('orbiter');
        spawnTypes.sort(() => Math.random() - 0.5);

        for (const type of spawnTypes) {
            const spawnAngle = Math.random() * Math.PI * 2;
            const spawnDist = this.radius + 20;
            const sx = this.x + Math.cos(spawnAngle) * spawnDist;
            const sy = this.y + Math.sin(spawnAngle) * spawnDist;
            let minion;
            if (type === 'drone') minion = new DroneMinion(sx, sy, this.tier);
            else if (type === 'lancer') minion = new LancerMinion(sx, sy, this.tier);
            else if (type === 'orbiter') minion = new OrbiterMinion(sx, sy, this.tier, this);
            if (minion) this.activeMinions.push(minion);
        }
    }

    tryPulseNova(playerInstance, dt, gameContext) {
        if (this.tier < 3 || this.pulseNovaActive || this.pulseNovaCooldownTimer > 0) {
            if (this.pulseNovaCooldownTimer > 0) this.pulseNovaCooldownTimer -= dt;
            return;
        }
        const distToPlayer = Math.hypot(playerInstance.x - this.x, playerInstance.y - this.y);
        let triggerNova = false;
        if (distToPlayer < this.radius * CONSTANTS.PULSE_NOVA_CLOSE_RANGE_THRESHOLD_FACTOR) {
            this.playerCloseTimer += dt;
            if (this.playerCloseTimer >= CONSTANTS.PULSE_NOVA_CLOSE_RANGE_DURATION_TRIGGER) {
                triggerNova = true;
            }
        } else {
            this.playerCloseTimer = 0;
        }
        if (!triggerNova && Math.random() < (0.0005 * (dt / 16.67)) * this.tier) {
             triggerNova = true;
        }
        if (triggerNova) {
            this.pulseNovaActive = true;
            this.pulseNovaTimer = CONSTANTS.PULSE_NOVA_DURATION;
            this.pulseNovaMaxRadius = this.radius * CONSTANTS.PULSE_NOVA_RADIUS_FACTOR;
            this.pulseNovaCurrentRadius = this.radius * 0.5;
            this.pulseNovaCooldownTimer = CONSTANTS.PULSE_NOVA_COOLDOWN + Math.random() * 2000;
            this.playerCloseTimer = 0;
        } else if (this.pulseNovaCooldownTimer > 0) {
            this.pulseNovaCooldownTimer -= dt;
        }
    }

    update(playerInstance, gameContext) {
        const { dt, canvasWidth, canvasHeight, postDamageImmunityTimer, isPlayerShieldOvercharging, allRays } = gameContext;

        super.update(dt, playerInstance);
        if (this.health <= 0) {
            this.activeMinions.forEach(m => m.isActive = false);
            this.activeMinions = [];
            return;
        }
        const normalizedDtFactor = dt / (1000 / 60) || 1;
        if (this.hitStunTimer <= 0 && this.playerCollisionStunTimer <= 0) {
            const angleToPlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
            const distToPlayer = Math.hypot(playerInstance.x - this.x, playerInstance.y - this.y);
            let targetSpeed = this.speed;
            if (distToPlayer < this.radius * 3) {
                this.x -= Math.cos(angleToPlayer) * targetSpeed * 0.5 * normalizedDtFactor;
                this.y -= Math.sin(angleToPlayer) * targetSpeed * 0.5 * normalizedDtFactor;
            } else if (distToPlayer > this.radius * 6) {
                this.x += Math.cos(angleToPlayer) * targetSpeed * normalizedDtFactor;
                this.y += Math.sin(angleToPlayer) * targetSpeed * normalizedDtFactor;
            } else {
                 this.x += (Math.random() - 0.5) * targetSpeed * 0.3 * normalizedDtFactor;
                 this.y += (Math.random() - 0.5) * targetSpeed * 0.3 * normalizedDtFactor;
            }
        }
        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

        if (!this.isSpawning) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) { 
                this.isSpawning = true;
                this.spawnTellTimer = this.spawnTellDuration;
            }
        } else {
            this.spawnTellTimer -= dt;
            if (this.spawnTellTimer <= 0) {
                this.spawnMinions();
                this.spawnTimer = this.spawnCooldown;
            }
        }
        this.tryPulseNova(playerInstance, dt, gameContext);
        if (this.pulseNovaActive) {
            this.pulseNovaTimer -= dt;
            const novaProgress = 1 - (this.pulseNovaTimer / CONSTANTS.PULSE_NOVA_DURATION);
            this.pulseNovaCurrentRadius = this.pulseNovaMaxRadius * Math.sqrt(novaProgress);
            if (this.pulseNovaTimer <= 0) {
                this.pulseNovaActive = false;
            } else {
                const distToPlayerNova = Math.hypot(playerInstance.x - this.x, playerInstance.y - this.y);
                const effectivePlayerRadiusForNova = playerInstance.radius * 0.8;
                if (distToPlayerNova < this.pulseNovaCurrentRadius + effectivePlayerRadiusForNova &&
                    distToPlayerNova > this.pulseNovaCurrentRadius - effectivePlayerRadiusForNova - (this.pulseNovaCurrentRadius * 0.1) ) {
                    if (gameContext && gameContext.callbacks && gameContext.callbacks.onPlayerBossAttackCollision) {
                        gameContext.callbacks.onPlayerBossAttackCollision({
                            damage: CONSTANTS.PULSE_NOVA_DAMAGE,
                            sourceBoss: this,
                            type: 'pulse_nova'
                        });
                    }
                }
            }
        }

        const safeCallbacks = gameContext && gameContext.callbacks ? gameContext.callbacks : {};
        const minionGameContext = {
            playerCollidedWithMinion: safeCallbacks.onPlayerMinionCollision,
            nexusWeaverShootsOrbiterProjectile: safeCallbacks.nexusWeaverShootsOrbiterProjectile
        };

        for (let i = this.activeMinions.length - 1; i >= 0; i--) {
            const minion = this.activeMinions[i];
            minion.update(dt, playerInstance, canvasWidth, canvasHeight, minionGameContext);
            if (!minion.isActive) {
                this.activeMinions.splice(i, 1);
            }
        }

        if (checkCollision(this, playerInstance)) {
            const playerCanTakeDamage = (postDamageImmunityTimer === undefined || postDamageImmunityTimer <= 0) &&
                                        !(playerInstance.teleporting && playerInstance.teleportEffectTimer > 0) &&
                                        !isPlayerShieldOvercharging;
            if (playerCanTakeDamage && this.playerCollisionStunTimer <= 0) {
                 if(gameContext && gameContext.playerCollidedWithBoss !== undefined) gameContext.playerCollidedWithBoss = this;
            }
        }
    }

    takeDamage(amount, ray, playerInstance, context = {}) { // Added context
        const damageTaken = super.takeDamage(amount, ray, playerInstance, context); // Use the base class logic
        if (damageTaken > 0 && (ray || (context && (context.isAegisCollision || context.isSeismicSlam || context.isAegisChargeImpact)))) {
             this.lastDamageSourcePlayer();
        }
        return damageTaken; // Return actual damage dealt by base method
    }
}