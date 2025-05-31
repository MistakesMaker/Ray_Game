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
        this.HIT_FLASH_BLINK_INTERVAL_MINION = 40; 

        this.isFeared = false;
        this.fearTimer = 0;
        this.fearSourceX = 0;
        this.fearSourceY = 0;
        this.FEAR_SPEED_MULTIPLIER_MINION = 1.3; 
        this.baseSpeed = 1; 
        this.speed = 1;     
    }

    applyFear(duration, sourceX, sourceY) {
        this.isFeared = true;
        this.fearTimer = duration;
        this.fearSourceX = sourceX;
        this.fearSourceY = sourceY;
        if (this.state && this.state !== 'roaming') { 
            this.state = 'roaming'; 
            this.aimTimer = 0;
            this.dashTimer = 0;
        }
    }

    draw(ctx) {
        if (!this.isActive || !ctx) return;
        let effectiveColor = this.color;
        
        if (this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer / this.HIT_FLASH_BLINK_INTERVAL_MINION) % 2 === 0) {
            effectiveColor = '#FFFFFF'; 
        } else if (this.isFeared) {
            effectiveColor = 'rgba(255, 0, 255, 0.9)'; // Slightly more opaque fear for minions
        }


        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = effectiveColor;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        if (this.isFeared) {
            ctx.fillStyle = 'rgba(255, 0, 255, 0.9)';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText("!", this.x, this.y - this.radius - 5);
        }
    }

    takeDamage(amount, playerInstance, mainBoss) {
        if (!this.isActive || this.hp <= 0) return 0;

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
        if (this.isFeared) { 
            this.fearTimer -= amount * 15;
        }
        return amount; 
    }

    updateBase(dt, canvasWidth, canvasHeight) { 
        if (this.hitFlashTimer > 0) {
            this.hitFlashTimer -= dt;
            if (this.hitFlashTimer < 0) this.hitFlashTimer = 0;
        }

        if (this.isFeared) {
            this.fearTimer -= dt;
            if (this.fearTimer <= 0) {
                this.isFeared = false;
                this.fearTimer = 0;
                this.speed = this.baseSpeed; 
            } else {
                const angleAwayFromSource = Math.atan2(this.y - this.fearSourceY, this.x - this.fearSourceX);
                const currentFearSpeed = (this.baseSpeed || 1) * this.FEAR_SPEED_MULTIPLIER_MINION;
                const normalizedDtFactor = dt / (1000 / 60) || 1;

                this.x += Math.cos(angleAwayFromSource) * currentFearSpeed * normalizedDtFactor;
                this.y += Math.sin(angleAwayFromSource) * currentFearSpeed * normalizedDtFactor;

                if(canvasWidth && canvasHeight){
                    this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
                    this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
                }
                return true; 
            }
        }
        return false; 
    }
}

class DroneMinion extends MinionBase {
    constructor(x, y, bossTier) {
        super(x, y, CONSTANTS.DRONE_RADIUS, CONSTANTS.DRONE_HP, CONSTANTS.DRONE_COLOR, bossTier);
        this.baseSpeed = CONSTANTS.DRONE_BASE_SPEED + bossTier * CONSTANTS.DRONE_SPEED_PER_TIER;
        this.speed = this.baseSpeed;
        this.damage = CONSTANTS.DRONE_DAMAGE;
    }

    update(dt, playerInstance, canvasWidth, canvasHeight, gameContext) { 
        if (this.updateBase(dt, canvasWidth, canvasHeight)) return; 
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
        this.baseSpeed = CONSTANTS.LANCER_BASE_SPEED + bossTier * CONSTANTS.LANCER_SPEED_PER_TIER;
        this.speed = this.baseSpeed;
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
        if (this.updateBase(dt, canvasWidth, canvasHeight)) { 
            if (this.isFeared) this.state = 'roaming'; 
            return;
        }
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
        if (!this.isActive || !ctx || this.isFeared) return; 

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
        this.baseSpeed = this.orbitSpeed; 
        this.shootCooldown = CONSTANTS.ORBITER_SHOOT_COOLDOWN_BASE - bossTier * CONSTANTS.ORBITER_SHOOT_COOLDOWN_REDUCTION_PER_TIER;
        this.shootTimer = Math.random() * this.shootCooldown;
        this.damage = CONSTANTS.DRONE_DAMAGE; 
    }

    update(dt, playerInstance, canvasWidth, canvasHeight, gameContext) { 
        if (this.updateBase(dt, canvasWidth, canvasHeight)) return; 
        if (!this.isActive || !playerInstance || !this.nexusWeaver || !this.nexusWeaver.isActive) { 
            if (!this.nexusWeaver || !this.nexusWeaver.isActive) this.isActive = false; 
            return;
        }

        const normalizedDtFactor = dt; 

        this.currentOrbitAngle += this.orbitSpeed * normalizedDtFactor;
        this.x = this.nexusWeaver.x + Math.cos(this.currentOrbitAngle) * this.orbitDistance;
        this.y = this.nexusWeaver.y + Math.sin(this.currentOrbitAngle) * this.orbitDistance;

        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));


        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && !this.isFeared) { 
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
        if (!this.isActive || !ctx || this.isFeared) return; 

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
            CONSTANTS.NEXUS_WEAVER_COLOR // This should be a solid color string e.g., '#4B0082'
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
        let mainBodyFillColor = this.color; // Start with base color
        let mainBodyStrokeColor = 'rgba(200, 100, 255, 0.7)'; // Default stroke
        let facetFillColor = '#FF00FF'; // Default highlight for facets

        // State-based color changes
        if (this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer / this.HIT_FLASH_BLINK_INTERVAL) % 2 === 0) {
            mainBodyFillColor = '#FFFFFF'; // White flash for body
            facetFillColor = '#FFFFFF';    // Facets also flash white
        } else if (this.isFeared) {
            mainBodyFillColor = 'rgba(200, 0, 200, 0.85)'; // Darker, solid magenta for feared body
            facetFillColor = 'rgba(255, 100, 255, 0.9)';   // Lighter magenta for feared facets
            mainBodyStrokeColor = 'rgba(255, 0, 255, 0.9)';
        } else if (this.bleedTimer > 0 && Math.floor(this.bleedTimer / 100) % 2 === 0) {
            mainBodyFillColor = '#300052'; // Darker purple for bleed
        } else if (this.hitStunTimer > 0 || this.playerCollisionStunTimer > 0) {
            mainBodyFillColor = `rgba(100, 100, 200, 0.9)`; // Solid-ish stun color
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Spawn Tell Glow (this is an additive effect, so semi-transparent is okay here)
        if (this.isSpawning && this.spawnTellTimer > 0 && !this.isFeared) { 
            const spawnProgress = 1 - (this.spawnTellTimer / this.spawnTellDuration);
            const glowRadius = this.radius + 10 + spawnProgress * 20;
            const glowAlpha = 0.15 + spawnProgress * 0.35; // Make it a bit more subtle
            ctx.beginPath();
            ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 0, 255, ${glowAlpha})`; 
            ctx.fill();
        }

        // Main Body - Ensure this is drawn with a solid color mostly
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = mainBodyFillColor; 
        ctx.fill();

        // Facets
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
            // Use the determined facetFillColor, if spawning and not feared, make it more vibrant pink
            ctx.fillStyle = (this.isSpawning && !this.isFeared && !(this.hitFlashTimer > 0)) ? `rgba(255,100,255,0.95)` : facetFillColor;
            ctx.fillRect(-facetSize / 2, -facetSize / 2, facetSize, facetSize);
            ctx.restore();
        }
        // Main body stroke
        ctx.strokeStyle = mainBodyStrokeColor;
        ctx.lineWidth = 2 + this.tier * 0.5;
        ctx.stroke(); 
        ctx.restore();

        super.draw(ctx); // Draws health bar and base fear visual (which is a STROKED circle)

        // Pulse Nova visual (only stroked)
        if (this.pulseNovaActive && !this.isFeared) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.pulseNovaCurrentRadius, 0, Math.PI * 2);

            let alphaProgress = this.pulseNovaTimer / CONSTANTS.PULSE_NOVA_DURATION; 
            alphaProgress = Math.max(0, Math.min(1, alphaProgress)); 
            
            ctx.strokeStyle = `rgba(255, 100, 255, ${alphaProgress * 0.9})`; // Make stroke quite visible
            
            const expansionProgress = 1 - alphaProgress; 
            let lineWidth;
            if (expansionProgress < 0.85) { 
                lineWidth = Math.max(1.5, 12 - (expansionProgress * 12)); 
            } else { 
                lineWidth = 1.5 + (expansionProgress - 0.85) * 15; 
            }
            ctx.lineWidth = lineWidth; 
            ctx.stroke(); // Only stroke, no fill for the nova wave
        }
        this.activeMinions.forEach(minion => minion.draw(ctx));
    }

    spawnMinions() {
        this.isSpawning = false;
        if (this.isFeared) return; 

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
        if (this.isFeared || this.tier < 3 || this.pulseNovaActive || this.pulseNovaCooldownTimer > 0) {
            if (this.pulseNovaCooldownTimer > 0 && !this.isFeared) this.pulseNovaCooldownTimer -= dt; 
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
            this.pulseNovaCurrentRadius = this.radius * 0.1; 
            this.pulseNovaCooldownTimer = CONSTANTS.PULSE_NOVA_COOLDOWN + Math.random() * 2000;
            this.playerCloseTimer = 0;
        } else if (this.pulseNovaCooldownTimer > 0) {
            this.pulseNovaCooldownTimer -= dt;
        }
    }

    update(playerInstance, gameContext) {
        const { dt, canvasWidth, canvasHeight, postDamageImmunityTimer, isPlayerShieldOvercharging, allRays } = gameContext;

        super.update(dt, playerInstance, canvasWidth, canvasHeight); 
        if (this.health <= 0) {
            this.activeMinions.forEach(m => m.isActive = false);
            this.activeMinions = [];
            return;
        }

        if (this.isFeared) {
            this.isSpawning = false;
            this.spawnTellTimer = 0;
            this.pulseNovaActive = false;
            this.pulseNovaTimer = 0;
        } else {
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
                    const novaEdgeOuter = this.pulseNovaCurrentRadius + effectivePlayerRadiusForNova;
                    const expansionProgress = 1 - (this.pulseNovaTimer / CONSTANTS.PULSE_NOVA_DURATION);
                    let currentNovaWaveThickness = Math.max(1, 12 - (expansionProgress * 12));
                     if (expansionProgress >= 0.85) {
                         currentNovaWaveThickness = 1.5 + (expansionProgress - 0.85) * 15;
                     }
                    const novaEdgeInner = this.pulseNovaCurrentRadius - effectivePlayerRadiusForNova - (currentNovaWaveThickness * 0.5); 
                    
                    if (distToPlayerNova < novaEdgeOuter && distToPlayerNova > novaEdgeInner) {
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
        } 

        const safeCallbacks = gameContext && gameContext.callbacks ? gameContext.callbacks : {};
        const minionGameContext = { 
            playerCollidedWithMinion: safeCallbacks.onPlayerMinionCollision,
            nexusWeaverShootsOrbiterProjectile: safeCallbacks.nexusWeaverShootsOrbiterProjectile,
             dt: gameContext.dt, 
             canvasWidth: gameContext.canvasWidth, 
             canvasHeight: gameContext.canvasHeight
        };

        for (let i = this.activeMinions.length - 1; i >= 0; i--) {
            const minion = this.activeMinions[i];
            minion.update(dt, playerInstance, canvasWidth, canvasHeight, minionGameContext); 
            if (!minion.isActive) {
                this.activeMinions.splice(i, 1);
            }
        }

        if (checkCollision(this, playerInstance)) {
            const playerIsTeleporting = (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0);
            const playerIsCurrentlyShieldOvercharging = isPlayerShieldOvercharging;
            const playerIsDamageImmuneFromRecentHit = (postDamageImmunityTimer !== undefined && postDamageImmunityTimer > 0);
            const canPlayerInteract = !playerIsTeleporting && !playerIsCurrentlyShieldOvercharging;
            
            if (canPlayerInteract) {
                if (playerInstance.hasAegisPathHelm && playerInstance.aegisRamCooldownTimer <= 0) {
                    if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                        gameContext.playerCollidedWithBoss = this;
                    }
                } else {
                    // Player is NOT Aegis OR Aegis Ram IS ON COOLDOWN
                    // Standard collision damage & knockback logic for the player
                    if (!playerIsDamageImmuneFromRecentHit && this.playerCollisionStunTimer <= 0 && !this.isFeared) {
                        if(gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                            gameContext.playerCollidedWithBoss = this;
                        }
                        // Nexus Weaver itself doesn't have a strong recoil/stun from player collision
                        // like Chaser or Mirror Shield, its defense is minions and nova.
                        // Player will take damage via gameLogic's handling of playerCollidedWithBoss.
                    }
                }
            }
        }
    }

    takeDamage(amount, ray, playerInstance, context = {}) { 
        const damageTaken = super.takeDamage(amount, ray, playerInstance, context); 
        if (damageTaken > 0 && (ray || (context && (context.isAegisCollision || context.isSeismicSlam || context.isAegisChargeImpact)))) {
             this.lastDamageSourcePlayer();
        }
        return damageTaken; 
    }
}