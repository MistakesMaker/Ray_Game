// js/chaserBoss.js
import { BossNPC } from './bossBase.js';
import { PLAYER_BOUNCE_FORCE_FROM_BOSS } from './constants.js';
import { checkCollision } from './utils.js';

export class ChaserBoss extends BossNPC {
    constructor(x, y, tier) {
        super(x, y, tier, 25, 0.3, 20 + tier * 1.0, '#E50000');
        this.baseSpeed = 0.9 + tier * 0.07;
        this.speed = this.baseSpeed;
        this.PLAYER_COLLISION_STUN_DURATION = 400; 
        this.recoilVelX = 0;
        this.recoilVelY = 0;
        this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE = 2; // How much boss recoils from Aegis player even if ram is on CD
        this.AEGIS_PASSIVE_BOSS_STUN_DURATION = 100; // Short stun for boss
    }

    draw(ctx) {
        if (!ctx) return;
        let effectiveColor = this.color;
        if (this.isFeared) {
            effectiveColor = 'rgba(255, 0, 255, 0.6)'; 
        } else if (this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer / 50) % 2 === 0) {
            effectiveColor = '#FFFFFF';
        } else if (this.bleedTimer > 0 && Math.floor(this.bleedTimer / 100) % 2 === 0) {
            effectiveColor = '#A00000';
        } else if (this.hitStunTimer > 0 || this.playerCollisionStunTimer > 0) {
            effectiveColor = `rgba(100, 100, 200, 0.8)`;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        const points = 8;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = (i % 2 === 0) ? this.radius : this.radius * 0.6;
            const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2 +
                          ((this.hitStunTimer > 0 || this.playerCollisionStunTimer > 0 || this.isFeared) ? Math.sin(Date.now() / 50) * 0.1 : 0);
            ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fillStyle = effectiveColor;
        ctx.fill();
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        super.draw(ctx); 
    }

    update(playerInstance, gameContext) {
        const { dt, canvasWidth, canvasHeight, postDamageImmunityTimer, isPlayerShieldOvercharging } = gameContext;

        super.update(dt, playerInstance, canvasWidth, canvasHeight); 
        if (this.health <= 0) return;

        const normalizedDtFactor = dt / (1000 / 60) || 1;

        if (this.isFeared) {
            // Base class update handles movement.
        } else if (this.playerCollisionStunTimer > 0) {
            this.playerCollisionStunTimer -= dt;
            this.x += this.recoilVelX * normalizedDtFactor;
            this.y += this.recoilVelY * normalizedDtFactor;
            this.recoilVelX *= 0.88; // Damping factor for recoil
            this.recoilVelY *= 0.88;
            if (Math.abs(this.recoilVelX) < 0.01) this.recoilVelX = 0;
            if (Math.abs(this.recoilVelY) < 0.01) this.recoilVelY = 0;
            if (this.playerCollisionStunTimer <= 0) {
                this.speed = this.baseSpeed;
            }
        } else if (this.hitStunTimer <= 0) { // Normal movement if not hit-stunned
            const angleToPlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
            this.x += Math.cos(angleToPlayer) * this.speed * normalizedDtFactor;
            this.y += Math.sin(angleToPlayer) * this.speed * normalizedDtFactor;
        }

        if (!this.isFeared) {
            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
        }

        if (checkCollision(this, playerInstance)) {
            const playerIsTeleporting = (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0);
            const playerIsShieldOverchargingCurrently = isPlayerShieldOvercharging; 
            const playerDamageImmuneFromHit = (postDamageImmunityTimer !== undefined && postDamageImmunityTimer > 0); // Immunity from recent damage
            
            // Player can interact if not teleporting or shield overcharging (Mage ability)
            const canPlayerPhysicallyInteract = !playerIsTeleporting && !playerIsShieldOverchargingCurrently;

            if (canPlayerPhysicallyInteract) {
                if (playerInstance.hasAegisPathHelm) {
                    // Player is Aegis Path
                    const pushAngleBoss = Math.atan2(this.y - playerInstance.y, this.x - playerInstance.x);
                    const overlap = (this.radius + playerInstance.radius) - Math.hypot(this.x - playerInstance.x, this.y - playerInstance.y);
                    if (overlap > 0) { // Ensure they are actually overlapping
                        this.x += Math.cos(pushAngleBoss) * overlap * 0.5; // Basic separation
                        this.y += Math.sin(pushAngleBoss) * overlap * 0.5;
                    }

                    if (playerInstance.aegisRamCooldownTimer <= 0) {
                        // Aegis offensive ram is ready. Signal for player.handleAegisCollisionWithBoss
                        if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                            // gameLogic (via main.js callback) will call player.handleAegisCollisionWithBoss
                            gameContext.playerCollidedWithBoss = { boss: this, type: "aegisOffensiveRam" };
                        }
                    } else {
                        // Aegis offensive ram is on COOLDOWN. Player takes NO damage from this body collision.
                        // Boss still gets a slight recoil from the player's mass.
                        this.recoilVelX += Math.cos(pushAngleBoss) * this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE;
                        this.recoilVelY += Math.sin(pushAngleBoss) * this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE;
                        this.playerCollisionStunTimer = Math.max(this.playerCollisionStunTimer, this.AEGIS_PASSIVE_BOSS_STUN_DURATION);
                        this.speed = 0; // Briefly stop the boss
                         // Player also gets a slight pushback
                        const playerPushAngle = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
                        playerInstance.velX += Math.cos(playerPushAngle) * this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE * 0.5;
                        playerInstance.velY += Math.sin(playerPushAngle) * this.AEGIS_PASSIVE_BOSS_RECOIL_FORCE * 0.5;
                    }
                } else {
                    // Player is NOT Aegis Path - Standard collision damage & knockback logic for the player
                    if (!playerDamageImmuneFromHit) { 
                        // Signal to gameLogic that a standard (damaging) collision occurred.
                        if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                             gameContext.playerCollidedWithBoss = { boss: this, type: "standardPlayerDamage" };
                        }
                        // Boss also gets recoiled and stunned by standard collision
                        const pushAngleBoss = Math.atan2(this.y - playerInstance.y, this.x - playerInstance.x);
                        this.recoilVelX = Math.cos(pushAngleBoss) * PLAYER_BOUNCE_FORCE_FROM_BOSS * 0.6;
                        this.recoilVelY = Math.sin(pushAngleBoss) * PLAYER_BOUNCE_FORCE_FROM_BOSS * 0.6;
                        this.playerCollisionStunTimer = this.PLAYER_COLLISION_STUN_DURATION;
                        this.speed = 0;
                    }
                }
            }
        }
    }
}