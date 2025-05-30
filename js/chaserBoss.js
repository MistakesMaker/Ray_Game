// js/chaserBoss.js
import { BossNPC } from './bossBase.js';
import { PLAYER_BOUNCE_FORCE_FROM_BOSS } from './constants.js';
import { checkCollision } from './utils.js';

export class ChaserBoss extends BossNPC {
    constructor(x, y, tier) {
        super(x, y, tier, 25, 0.3, 20 + tier * 1.0, '#E50000');
        this.baseSpeed = 0.9 + tier * 0.07;
        this.speed = this.baseSpeed;
        this.PLAYER_COLLISION_STUN_DURATION = 400; // Stun duration when Chaser itself is affected by collision
        this.recoilVelX = 0;
        this.recoilVelY = 0;
        // playerCollisionStunTimer is inherited from BossNPC for this stun
    }

    draw(ctx) {
        if (!ctx) return;
        let effectiveColor = this.color;
        if (this.hitFlashTimer > 0 && Math.floor(this.hitFlashTimer / 50) % 2 === 0) {
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
                          ((this.hitStunTimer > 0 || this.playerCollisionStunTimer > 0) ? Math.sin(Date.now() / 50) * 0.1 : 0);
            ctx.lineTo(r * Math.cos(angle), r * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fillStyle = effectiveColor;
        ctx.fill();
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        super.draw(ctx); // Draw health bar
    }

    update(playerInstance, gameContext) {
        const { dt, canvasWidth, canvasHeight, postDamageImmunityTimer, isPlayerShieldOvercharging } = gameContext;

        super.update(dt, playerInstance);
        if (this.health <= 0) return;

        const normalizedDtFactor = dt / (1000 / 60) || 1;

        if (this.playerCollisionStunTimer > 0) {
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

        this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));

        if (checkCollision(this, playerInstance)) {
            const playerIsTeleporting = (playerInstance.teleporting && playerInstance.teleportEffectTimer > 0);
            const playerIsShieldOverchargingCurrently = isPlayerShieldOvercharging; // from gameContext
            const playerDamageImmune = (postDamageImmunityTimer !== undefined && postDamageImmunityTimer > 0);

            // Player can interact (either take damage or apply Aegis effect) if not generally immune/phasing
            const canPlayerInteract = !playerIsTeleporting && !playerIsShieldOverchargingCurrently;

            if (canPlayerInteract) {
                if (playerInstance.hasAegisPathHelm) {
                    // Aegis Path handles its own damage and knockback effects in player.js
                    // Chaser boss should still signal collision for the main game loop / player to react.
                    // The player's handleAegisCollisionWithBoss will apply knockback to this Chaser.
                    // Chaser boss itself does not initiate its strong bounce here.
                    if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                        gameContext.playerCollidedWithBoss = this; // Signal collision
                    }
                    // Aegis path makes player immune to this collision, so no player.takeDamage() here.
                    // The Chaser will take damage from player.handleAegisCollisionWithBoss()
                    // and also receive knockback from there.
                    // We might want a *very* minor recoil for the Chaser here, or let Aegis handle it all.
                    // For now, let Aegis handle all knockback effects on the boss.
                    // If the Chaser still feels too "sticky", a tiny self-push could be added here.

                } else {
                    // Normal collision: Player does NOT have Aegis Path
                    if (!playerDamageImmune) { // Player only takes damage if not under general post-hit immunity
                        // Standard Chaser "crazy bounce" logic
                        const collisionAnglePlayer = Math.atan2(playerInstance.y - this.y, playerInstance.x - this.x);
                        playerInstance.velX = Math.cos(collisionAnglePlayer) * PLAYER_BOUNCE_FORCE_FROM_BOSS;
                        playerInstance.velY = Math.sin(collisionAnglePlayer) * PLAYER_BOUNCE_FORCE_FROM_BOSS;

                        const dist = Math.sqrt((this.x - playerInstance.x) ** 2 + (this.y - playerInstance.y) ** 2);
                        const overlap = (this.radius + playerInstance.radius) - dist;
                        if (overlap > 0) {
                            const pushAngleBoss = Math.atan2(this.y - playerInstance.y, this.x - playerInstance.x);
                            const pushAmount = overlap * 1.3; // Stronger push for chaser
                            this.x += Math.cos(pushAngleBoss) * pushAmount;
                            this.y += Math.sin(pushAngleBoss) * pushAmount;

                            const knockbackForceBoss = PLAYER_BOUNCE_FORCE_FROM_BOSS * 0.6; // Chaser also recoils
                            this.recoilVelX = Math.cos(pushAngleBoss) * knockbackForceBoss;
                            this.recoilVelY = Math.sin(pushAngleBoss) * knockbackForceBoss;
                            this.playerCollisionStunTimer = this.PLAYER_COLLISION_STUN_DURATION; // Chaser gets stunned briefly
                            this.speed = 0;

                            this.x = Math.max(this.radius, Math.min(canvasWidth - this.radius, this.x));
                            this.y = Math.max(this.radius, Math.min(canvasHeight - this.radius, this.y));
                        }
                        // Signal to main.js/gameLogic that player collision occurred for damage processing
                        if (gameContext && gameContext.playerCollidedWithBoss !== undefined) {
                            gameContext.playerCollidedWithBoss = this;
                        }
                    }
                }
            }
        }
    }
}