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
    }

    draw(ctx) {
        if (!ctx) return;
        let effectiveColor = this.color;
        if (this.isFeared) {
            effectiveColor = 'rgba(255, 0, 255, 0.6)'; // Magenta when feared
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

        super.update(dt, playerInstance, canvasWidth, canvasHeight); // Pass canvas dimensions
        if (this.health <= 0) return;

        const normalizedDtFactor = dt / (1000 / 60) || 1;

        // If feared, base class update handles movement. Skip normal Chaser logic.
        if (this.isFeared) {
            // Potentially add specific Chaser reactions to fear if needed, otherwise base movement is fine
        } else if (this.playerCollisionStunTimer > 0) {
            this.playerCollisionStunTimer -= dt;
            this.x += this.recoilVelX * normalizedDtFactor;
            this.y += this.recoilVelY * normalizedDtFactor;
            this.recoilVelX *= 0.88;
            this.recoilVelY *= 0.88;
            if (Math.abs(this.recoilVelX) < 0.01) this.recoilVelX = 0;
            if (Math.abs(this.recoilVelY) < 0.01) this.recoilVelY = 0;
            if (this.playerCollisionStunTimer <= 0) {
                this.speed = this.baseSpeed;
            }
        } else if (this.hitStunTimer <= 0) {
            const angleToPlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
            this.x += Math.cos(angleToPlayer) * this.speed * normalizedDtFactor;
            this.y += Math.sin(angleToPlayer) * this.speed * normalizedDtFactor;
        }

        // Boundary check is now handled in super.update if feared, otherwise here
        if (!this.isFeared) {
            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
            this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
        }


        if (checkCollision(this, playerInstance)) {
            const playerIsTeleporting = (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0);
            const playerIsShieldOverchargingCurrently = isPlayerShieldOvercharging; 
            const playerDamageImmune = (postDamageImmunityTimer !== undefined && postDamageImmunityTimer > 0);
            const canPlayerInteract = !playerIsTeleporting && !playerIsShieldOverchargingCurrently;

            if (canPlayerInteract) {
                if (playerInstance.hasAegisPathHelm) {
                    if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                        gameContext.playerCollidedWithBoss = this; 
                    }
                } else {
                    if (!playerDamageImmune) { 
                        const collisionAnglePlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
                        playerInstance.velX = Math.cos(collisionAnglePlayer) * PLAYER_BOUNCE_FORCE_FROM_BOSS;
                        playerInstance.velY = Math.sin(collisionAnglePlayer) * PLAYER_BOUNCE_FORCE_FROM_BOSS;

                        const dist = Math.sqrt((this.x - playerInstance.x) ** 2 + (this.y - playerInstance.y) ** 2);
                        const overlap = (this.radius + playerInstance.radius) - dist;
                        if (overlap > 0) {
                            const pushAngleBoss = Math.atan2(this.y - playerInstance.y, this.x - playerInstance.x);
                            const pushAmount = overlap * 1.3; 
                            this.x += Math.cos(pushAngleBoss) * pushAmount;
                            this.y += Math.sin(pushAngleBoss) * pushAmount;

                            const knockbackForceBoss = PLAYER_BOUNCE_FORCE_FROM_BOSS * 0.6; 
                            this.recoilVelX = Math.cos(pushAngleBoss) * knockbackForceBoss;
                            this.recoilVelY = Math.sin(pushAngleBoss) * knockbackForceBoss;
                            this.playerCollisionStunTimer = this.PLAYER_COLLISION_STUN_DURATION; 
                            this.speed = 0;

                            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
                            this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
                        }
                        if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                            gameContext.playerCollidedWithBoss = this;
                        }
                    }
                }
            }
        }
    }
}