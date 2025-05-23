// js/player.js
import {
    PLAYER_BASE_RADIUS, MIN_PLAYER_BASE_RADIUS, PLAYER_BASE_COLOR, PLAYER_MAX_HP,
    RAY_DAMAGE_TO_PLAYER, HP_REGEN_NO_DAMAGE_THRESHOLD, HP_REGEN_INTERVAL, PLAYER_SPEED_BASE,
    PLAYER_AIM_INDICATOR_LENGTH, TELEPORT_IMMUNITY_DURATION,
    OMEGA_LASER_DURATION, OMEGA_LASER_COOLDOWN, OMEGA_LASER_TICK_INTERVAL, OMEGA_LASER_DAMAGE_PER_TICK,
    OMEGA_LASER_RANGE, OMEGA_LASER_WIDTH,
    SHIELD_OVERCHARGE_DURATION, SHIELD_OVERCHARGE_COOLDOWN, SHIELD_OVERCHARGE_HEAL_PER_RAY,
    SCREEN_SHAKE_DURATION_PLAYER_HIT, SCREEN_SHAKE_MAGNITUDE_PLAYER_HIT,
    POST_POPUP_IMMUNITY_DURATION,
    POST_DAMAGE_IMMUNITY_DURATION,
    PLAYER_BOUNCE_FORCE_FROM_GRAVITY_BALL,
    RAY_SPAWN_GRACE_PERIOD
} from './constants.js';

import { checkCollision, hexToRgb, lightenColor, isLineSegmentIntersectingCircle } from './utils.js';
import {
    playSound, stopSound,
    playerHitSound, shieldOverchargeSound, omegaLaserSound, teleportSound, empBurstSound,
    playerWellDeploySound, playerWellDetonateSound
} from './audio.js';
import { PlayerGravityWell } from './ray.js';


export class Player {
    constructor(x, y, initialPlayerSpeed) {
        this.x = x; this.y = y;
        this.initialBaseRadius = PLAYER_BASE_RADIUS;
        this.bonusBaseRadius = 0;
        this.baseRadius = this.initialBaseRadius + this.bonusBaseRadius;
        this.scoreBasedSize = 0;
        this.scoreOffsetForSizing = 0;
        this.radius = this.baseRadius;

        this.hp = PLAYER_MAX_HP; this.maxHp = PLAYER_MAX_HP; this.aimAngle = 0;
        this.immuneColorsList = [];
        this.velX = 0; this.velY = 0;
        this.pickupAttractionLevel = 0; this.pickupAttractionRadius = 0;
        this.evolutionIntervalModifier = 1.0; this.rayDamageBonus = 0;
        this.hasTargetPierce = false; this.chainReactionChance = 0.0;
        this.scatterShotLevel = 0; this.ownRaySpeedMultiplier = 1.0;
        this.damageReductionFactor = 0.0; this.hpPickupBonus = 0;
        this.abilityDamageMultiplier = 1.0;
        this.temporalEchoChance = 0.0;
        this.temporalEchoFixedReduction = 2000;

        // Kinetic Conversion Properties
        this.kineticCharge = 0;                            // Current charge (0-100)
        this.baseKineticChargeRate = 1;                    // Base charge rate if evo is not taken (or level 0)
        this.kineticChargeRatePerLevel = 0.25;             // Additional charge rate per level of Kinetic Conversion evo
        this.kineticDecayRate = 2.0;                       // Units per second when not moving fast
        this.kineticChargeSpeedThresholdFactor = 0.70;     // Player must be moving at this factor of currentSpeed
        this.kineticConversionLevel = 0;                   // How many times Kinetic Conversion evo has been picked
        this.initialKineticDamageBonus = 0.30;             // Damage bonus from the first pick (30%) at full charge
        this.additionalKineticDamageBonusPerLevel = 0.20;  // Additional bonus per pick AFTER the first (20%) at full charge
        this.kineticChargeConsumption = 100;               // Consume up to this much charge for max effect

        this.currentOmegaLaserKineticBoost = 1.0;    // Temp boost for current Omega Laser firing
        this.currentGravityWellKineticBoost = 1.0; // Temp boost for next Gravity Well launch


        this.timeSinceLastHit = Number.MAX_SAFE_INTEGER;
        this.hpRegenTimer = 0; this.baseHpRegenAmount = 1;
        this.hpRegenBonusFromEvolution = 0;
        this.acquiredBossUpgrades = [];
        this.activeAbilities = {
            '1': null,
            '2': null,
            '3': null
        };
        this.visualModifiers = {};
        this.bleedOnHit = false; this.momentumDamageBonus = 0;
        this.bossDamageReduction = 0;
        this.teleporting = false; this.teleportEffectTimer = 0;
        this.activeMiniWell = null;
        this.phaseStabilizerAnimTimer = Math.random() * 5000;
        this.naniteAnimTimer = Math.random() * 5000;
        this.momentumAnimTimer = Math.random() * 5000;
        this.ablativeAnimTimer = Math.random() * 5000;
        this.timesHit = 0;
        this.totalDamageDealt = 0;

        this.hasShieldOvercharge = false;
        this.isShieldOvercharging = false;
        this.shieldOverchargeTimer = 0;
        this.shieldOverchargeDuration = SHIELD_OVERCHARGE_DURATION;
        this.shieldOverchargeCooldownTimer = 0;
        this.shieldOverchargeCooldown = SHIELD_OVERCHARGE_COOLDOWN;

        this.hasOmegaLaser = false;
        this.isFiringOmegaLaser = false;
        this.omegaLaserTimer = 0;
        this.omegaLaserDuration = OMEGA_LASER_DURATION;
        this.omegaLaserCooldownTimer = 0;
        this.omegaLaserCooldown = OMEGA_LASER_COOLDOWN;
        this.omegaLaserAngle = 0;
        this.omegaLaserDamagePerTick = OMEGA_LASER_DAMAGE_PER_TICK;
        this.omegaLaserTickInterval = OMEGA_LASER_TICK_INTERVAL;
        this.omegaLaserCurrentTickTimer = 0;
        this.omegaLaserRange = OMEGA_LASER_RANGE;
        this.omegaLaserWidth = OMEGA_LASER_WIDTH;
        this.originalPlayerSpeed = initialPlayerSpeed;
        this.currentSpeed = initialPlayerSpeed;
    }

    drawHpBar(ctx) {
        if (!this || typeof this.hp === 'undefined' || typeof this.maxHp === 'undefined' || typeof this.radius === 'undefined' || isNaN(this.radius)) {
            return;
        }
        if (this.hp <= 0 || !ctx) return;
        const barWidth = this.radius * 2.5; const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - this.radius - 18;
        const healthPercentage = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(100,100,100,0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        const hpColor = healthPercentage > 0.6 ? '#00FF00' : healthPercentage > 0.3 ? '#FFFF00' : '#FF0000';
        ctx.fillStyle = hpColor;
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    draw(ctx, gameContext = {}) {
        if (!ctx) return;
        const { isCountingDownToResume = false,
                postPopupImmunityTimer: postPopupTimerFromCtx = 0,
                postDamageImmunityTimer: postDamageTimerFromCtx = 0
              } = gameContext;
        const now = Date.now();
        this.naniteAnimTimer = now; this.momentumAnimTimer = now; this.ablativeAnimTimer = now;

        this.drawHpBar(ctx);

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.teleporting && this.teleportEffectTimer > 0) {
            const effectProgress = 1 - (this.teleportEffectTimer / TELEPORT_IMMUNITY_DURATION);
            const alpha = 0.5 * (1 - effectProgress) + Math.abs(Math.sin(now / 80)) * 0.3;
            ctx.globalAlpha = alpha;
        }

        const isImmuneActive = postPopupTimerFromCtx > 0 || postDamageTimerFromCtx > 0 || this.isShieldOvercharging;
        if (isImmuneActive && !(this.teleporting && this.teleportEffectTimer > 0)) {
            ctx.beginPath();
            let shieldRadius = this.radius + 5;
            let shieldAlpha = 0.3;
            let shieldLineWidth = 3;
            let shieldColor = `rgba(150,150,255,${shieldAlpha})`;

            if (this.isShieldOvercharging) {
                shieldRadius = this.radius + 8;
                shieldAlpha = 0.6 + Math.abs(Math.sin(now / 80)) * 0.3;
                shieldLineWidth = 5;
                const r = 180 + Math.floor(Math.sin(now / 100) * 50);
                const g = 180 + Math.floor(Math.sin(now / 120) * 50);
                const b = 255;
                shieldColor = `rgba(${r},${g},${b},${shieldAlpha})`;

                ctx.save();
                ctx.globalAlpha = shieldAlpha * 0.5;
                const innerGlowRadius = this.radius + 2;
                const innerGradient = ctx.createRadialGradient(0,0, 0, 0,0, innerGlowRadius);
                innerGradient.addColorStop(0, `rgba(${r},${g},${b}, 0.6)`);
                innerGradient.addColorStop(1, `rgba(${r},${g},${b}, 0)`);
                ctx.fillStyle = innerGradient;
                ctx.arc(0,0, innerGlowRadius, 0, Math.PI*2);
                ctx.fill();
                ctx.restore();

            } else {
                shieldAlpha = Math.max(
                    (postPopupTimerFromCtx / POST_POPUP_IMMUNITY_DURATION) * 0.4,
                    (postDamageTimerFromCtx / POST_DAMAGE_IMMUNITY_DURATION) * 0.6
                ) + 0.3;
                shieldColor = `rgba(200,200,255,${shieldAlpha})`;
            }
            ctx.strokeStyle = shieldColor;
            ctx.lineWidth = shieldLineWidth;
            ctx.arc(0, 0, shieldRadius, 0, Math.PI * 2);
            ctx.stroke();
        }


        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = PLAYER_BASE_COLOR;
        ctx.fill();

        if (this.visualModifiers.ablativeSublayer) {
            ctx.save(); ctx.clip(); const pS = 10; const pA = 0.08+Math.abs(Math.sin(this.ablativeAnimTimer/800))*0.04; ctx.lineWidth=1; ctx.strokeStyle=`rgba(160,160,255,${pA})`; for(let i=-this.radius*2;i<this.radius*2;i+=pS){ctx.beginPath();ctx.moveTo(i,-this.radius*2);ctx.lineTo(i+this.radius*2,this.radius*2);ctx.stroke();ctx.beginPath();ctx.moveTo(-this.radius*2,i);ctx.lineTo(this.radius*2,i+this.radius*2);ctx.stroke();} ctx.restore();
        }

        if (this.immuneColorsList.length > 0) {
            const sliceAngle = (Math.PI * 2) / this.immuneColorsList.length;
            for (let i = 0; i < this.immuneColorsList.length; i++) {
                ctx.beginPath(); ctx.moveTo(0, 0);
                const startAngle = i * sliceAngle; const endAngle = (i + 1) * sliceAngle;
                ctx.arc(0, 0, this.radius, startAngle, endAngle); ctx.closePath();
                const color = this.immuneColorsList[i]; ctx.fillStyle = color;
                if (this.visualModifiers.adaptiveShield && this.visualModifiers.adaptiveHarmonicColor === color) {
                    ctx.fillStyle = lightenColor(color, 30); ctx.fill();
                    ctx.beginPath(); ctx.arc(0, 0, this.radius, startAngle, endAngle); ctx.closePath();
                    ctx.strokeStyle = 'white'; ctx.lineWidth = 1.5; ctx.stroke();
                } else { ctx.fill(); }
            }
        }

        ctx.beginPath(); ctx.arc(0,0,this.radius,0,Math.PI*2);
        const isAbl = this.visualModifiers.ablativeSublayer;
        ctx.lineWidth = isAbl ? 3 : 2; ctx.strokeStyle = isAbl ? '#B0C0FF' : '#FFFFFF'; ctx.stroke();
        if(isAbl){ctx.beginPath();ctx.arc(0,0,this.radius-2,0,Math.PI*2);ctx.strokeStyle='rgba(160,180,255,0.3)';ctx.lineWidth=1;ctx.stroke();}
        ctx.closePath();


        if (this.visualModifiers.momentumInjectors) {
            const nV=2; const vAO=Math.PI/2.5; const vL=this.radius*0.4; const vW=this.radius*0.15; ctx.fillStyle='#AAAAAA'; for(let i=0;i<nV;i++){const a=-Math.PI+(i===0?-vAO:vAO); ctx.save();ctx.rotate(a);ctx.fillRect(-this.radius*0.9,-vW/2,vL,vW);ctx.restore();}}

        if (this.visualModifiers.phaseStabilizers) {
            const hBW = this.radius*1.8; const hBH = this.radius*0.3; const hTW = this.radius*1.2; const hTH = this.radius*1.1; const hYO = -this.radius*0.8; ctx.fillStyle='#333'; ctx.strokeStyle='#111'; ctx.lineWidth=1; ctx.beginPath(); ctx.rect(-hBW/2, hYO-hBH/2, hBW,hBH);ctx.fill();ctx.stroke(); ctx.beginPath();ctx.rect(-hTW/2,hYO-hBH/2-hTH,hTW,hTH);ctx.fill();ctx.stroke();
        }

        if (this.visualModifiers.serratedNanites) {
            const nG=3; const oR=this.radius+9; const gS=1/600; ctx.fillStyle='rgba(255,50,50,0.95)'; ctx.strokeStyle='rgba(255,100,100,0.5)'; ctx.lineWidth=1; for(let i=0;i<nG;i++){const a=(this.naniteAnimTimer*gS+(i*Math.PI*2/nG))%(Math.PI*2); const gx=Math.cos(a)*oR; const gy=Math.sin(a)*oR; const gSize=3.5; ctx.save();ctx.translate(gx,gy);ctx.rotate(a+Math.PI/2); ctx.beginPath();ctx.moveTo(0,-gSize*0.6);ctx.lineTo(-gSize*0.5,gSize*0.4);ctx.lineTo(gSize*0.5,gSize*0.4);ctx.closePath();ctx.fill(); const pA=a-gS*50;const pX=Math.cos(pA)*oR;const pY=Math.sin(pA)*oR; ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(pX-gx,pY-gy);ctx.stroke(); ctx.restore();}}

        if (this.isFiringOmegaLaser) {
            ctx.save(); ctx.rotate(this.omegaLaserAngle);
            ctx.beginPath(); ctx.moveTo(this.radius, -this.omegaLaserWidth / 2);
            ctx.lineTo(this.radius + this.omegaLaserRange, -this.omegaLaserWidth / 2);
            ctx.lineTo(this.radius + this.omegaLaserRange, this.omegaLaserWidth / 2);
            ctx.lineTo(this.radius, this.omegaLaserWidth / 2); ctx.closePath();
            const laserIntensity = 0.7 + Math.abs(Math.sin(Date.now() / 50)) * 0.3;
            ctx.fillStyle = `rgba(255, 0, 0, ${laserIntensity * 0.8})`; ctx.fill();
            ctx.strokeStyle = `rgba(255, 100, 100, ${laserIntensity})`; ctx.lineWidth = 2; ctx.stroke();
            ctx.restore();
        } else {
             ctx.save(); ctx.rotate(this.aimAngle);
             if (this.visualModifiers.momentumInjectors) {
                ctx.beginPath(); ctx.moveTo(this.radius*0.8,0); ctx.lineTo(this.radius+PLAYER_AIM_INDICATOR_LENGTH+5,0); const pW=1+Math.sin(this.momentumAnimTimer/150)*0.5; ctx.strokeStyle='rgba(255,225,50,0.8)'; ctx.lineWidth=3+pW; ctx.stroke();
             } else {
                ctx.beginPath(); ctx.moveTo(this.radius*0.8,0); ctx.lineTo(this.radius+PLAYER_AIM_INDICATOR_LENGTH,0); ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=3; ctx.stroke();
             }
             ctx.restore();
        }

        let abilityIndicatorAngle = -Math.PI/2 - 0.3; const angleStep = 0.3;
        for(const slot in this.activeAbilities){
            const ability=this.activeAbilities[slot];
            if (ability) {
                ctx.beginPath(); const ix=Math.cos(abilityIndicatorAngle)*(this.radius+4); const iy=Math.sin(abilityIndicatorAngle)*(this.radius+4);
                ctx.arc(ix,iy,4,0,Math.PI*2); ctx.fillStyle=ability.cooldownTimer<=0?'#80FF80':'#FF8080'; ctx.fill();
                ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.stroke(); abilityIndicatorAngle-=angleStep;
            }
        }

        if (isCountingDownToResume) {
            ctx.save(); const pA=Math.abs(Math.sin(now/200))*5; const gR=this.radius+8+pA; const gLW=3+Math.abs(Math.sin(now/150))*2; const bGA=0.5+Math.abs(Math.sin(now/200))*0.4; ctx.shadowBlur=15+Math.abs(Math.sin(now/200))*10; ctx.lineWidth=gLW;
            if(this.immuneColorsList.length===0){ ctx.beginPath();ctx.arc(0,0,gR,0,Math.PI*2); ctx.strokeStyle=`rgba(200,200,220,${bGA})`; ctx.shadowColor=`rgba(200,200,255,0.7)`; ctx.stroke();}
            else{const sA=(Math.PI*2)/this.immuneColorsList.length; for(let i=0;i<this.immuneColorsList.length;i++){ ctx.beginPath();const stAG=i*sA;const eAG=(i+1)*sA; ctx.arc(0,0,gR,stAG,eAG,false); let iC=this.immuneColorsList[i];let gSC=iC;let sC=iC; if(iC.startsWith('#')){const rgb=hexToRgb(iC);if(rgb)gSC=`rgba(${rgb.r},${rgb.g},${rgb.b},${bGA*0.8})`;else gSC=`rgba(200,200,220,${bGA*0.8})`;}else if(iC.startsWith('rgb(')){gSC=iC.replace('rgb(','rgba(').replace(')',`,${bGA*0.8})`);}else{gSC=`rgba(200,200,220,${bGA*0.8})`;sC=`rgba(200,200,255,0.7)`;} ctx.strokeStyle=gSC;ctx.shadowColor=sC;ctx.stroke();}}
            ctx.restore();
        }

        ctx.restore();
    }

    update(gameContext) {
        const { dt, keys, mouseX, mouseY, canvasWidth, canvasHeight, targets, activeBosses,
                currentGrowthFactor, 
                currentEffectiveDefaultGrowthFactor, 
                updateHealthDisplayCallback, updateAbilityCooldownCallback,
                isAnyPauseActiveCallback, decoysArray, bossDefeatEffectsArray, allRays,
                screenShakeParams, activeBuffNotificationsArray, score,
                evolutionChoices, 
                ui 
              } = gameContext;

        if (this.teleporting && this.teleportEffectTimer > 0) {
            this.teleportEffectTimer -= dt;
            if (this.teleportEffectTimer <= 0) {
                this.teleporting = false; this.teleportEffectTimer = 0;
            }
        }

        let numericAbilityUIUpdateNeeded = false;
        for (const slot in this.activeAbilities) {
             if (this.activeAbilities[slot] && this.activeAbilities[slot].cooldownTimer > 0) {
                this.activeAbilities[slot].cooldownTimer -= dt;
                numericAbilityUIUpdateNeeded = true;
                if (this.activeAbilities[slot].cooldownTimer <= 0) {
                    this.activeAbilities[slot].cooldownTimer = 0;
                    this.activeAbilities[slot].justBecameReady = true;
                } else {
                    this.activeAbilities[slot].justBecameReady = false;
                }
            } else if (this.activeAbilities[slot] && this.activeAbilities[slot].cooldownTimer <= 0 && !this.activeAbilities[slot].justBecameReady) {
                 this.activeAbilities[slot].justBecameReady = true;
                 numericAbilityUIUpdateNeeded = true;
            }
        }

        let mouseAbilityUIUpdateNeeded = false;
        if (this.hasShieldOvercharge) {
            if (this.isShieldOvercharging) {
                this.shieldOverchargeTimer -= dt;
                mouseAbilityUIUpdateNeeded = true;
                if (this.shieldOverchargeTimer <= 0) {
                    this.isShieldOvercharging = false;
                    this.shieldOverchargeCooldownTimer = this.shieldOverchargeCooldown;
                }
            } else if (this.shieldOverchargeCooldownTimer > 0) {
                this.shieldOverchargeCooldownTimer -= dt;
                mouseAbilityUIUpdateNeeded = true;
                if (this.shieldOverchargeCooldownTimer < 0) this.shieldOverchargeCooldownTimer = 0;
            }
        }

        if (this.hasOmegaLaser) {
            if (this.isFiringOmegaLaser) {
                this.currentSpeed = this.originalPlayerSpeed / 2;
                this.omegaLaserAngle = Math.atan2(mouseY - this.y, mouseX - this.x);

                this.omegaLaserTimer -= dt;
                this.omegaLaserCurrentTickTimer -= dt;
                mouseAbilityUIUpdateNeeded = true;

                if (this.omegaLaserCurrentTickTimer <= 0) {
                    const laserDamageContext = {
                        updateScoreCallback: gameContext.updateScoreCallback,
                    };
                    this.dealOmegaLaserDamage(targets, activeBosses, laserDamageContext);
                    this.omegaLaserCurrentTickTimer = OMEGA_LASER_TICK_INTERVAL;
                }
                if (this.omegaLaserTimer <= 0) {
                    this.isFiringOmegaLaser = false;
                    this.currentSpeed = this.originalPlayerSpeed;
                    stopSound(omegaLaserSound);
                    this.omegaLaserCooldownTimer = this.omegaLaserCooldown;
                    this.currentOmegaLaserKineticBoost = 1.0; 
                }
            } else {
                if (this.currentSpeed !== this.originalPlayerSpeed) this.currentSpeed = this.originalPlayerSpeed;
                if (this.omegaLaserCooldownTimer > 0) {
                    this.omegaLaserCooldownTimer -= dt;
                    mouseAbilityUIUpdateNeeded = true;
                    if (this.omegaLaserCooldownTimer < 0) this.omegaLaserCooldownTimer = 0;
                }
            }
        }

        const forceUIUpdate = gameContext && gameContext.forceAbilityUIUpdate;
        if (numericAbilityUIUpdateNeeded || mouseAbilityUIUpdateNeeded || forceUIUpdate) {
            if (updateAbilityCooldownCallback) updateAbilityCooldownCallback(this);
            if(forceUIUpdate && gameContext) gameContext.forceAbilityUIUpdate = false;
        }


        this.x += this.velX; this.y += this.velY;
        this.velX *= 0.95; this.velY *= 0.95;
        if (Math.abs(this.velX) < 0.1) this.velX = 0;
        if (Math.abs(this.velY) < 0.1) this.velY = 0;

        let dxMovement = 0, dyMovement = 0;
        if (keys.ArrowUp || keys.w) dyMovement -= 1;
        if (keys.ArrowDown || keys.s) dyMovement += 1;
        if (keys.ArrowLeft || keys.a) dxMovement -= 1;
        if (keys.ArrowRight || keys.d) dxMovement += 1;

        let playerIsActuallyMoving = false;
        if (dxMovement !== 0 || dyMovement !== 0) {
            playerIsActuallyMoving = true;
            if (dxMovement !== 0 && dyMovement !== 0) {
                const m = Math.sqrt(2);
                dxMovement = (dxMovement / m) * this.currentSpeed;
                dyMovement = (dyMovement / m) * this.currentSpeed;
            } else {
                dxMovement *= this.currentSpeed;
                dyMovement *= this.currentSpeed;
            }
        }

        // Kinetic Charge Update
        let currentTotalKineticChargeRate = this.baseKineticChargeRate;
        if (this.kineticConversionLevel > 0) { 
            currentTotalKineticChargeRate += this.kineticConversionLevel * this.kineticChargeRatePerLevel;
        }

        if (playerIsActuallyMoving) {
            this.kineticCharge = Math.min(100, this.kineticCharge + currentTotalKineticChargeRate * (dt / 1000));
        } else {
            this.kineticCharge = Math.max(0, this.kineticCharge - this.kineticDecayRate * (dt / 1000));
        }

        if (ui && ui.updateKineticChargeUI) {
            let maxPotencyAtFullCharge = 0;
            if (this.kineticConversionLevel > 0) {
                maxPotencyAtFullCharge = this.initialKineticDamageBonus + (Math.max(0, this.kineticConversionLevel - 1) * this.additionalKineticDamageBonusPerLevel);
            }
            // ---- START OF FIX ----
            // Add a log here to confirm this specific call from player.update
            // console.log(`[Debug PLAYER_UPDATE_KINETIC_UI] Calling updateKineticChargeUI. Player Level: ${this.kineticConversionLevel}, Visible Arg: ${this.kineticConversionLevel > 0}`);
            ui.updateKineticChargeUI(this.kineticCharge, this.kineticChargeConsumption, maxPotencyAtFullCharge, this.kineticConversionLevel > 0);
            // ---- END OF FIX ----
        }


        let nX = this.x + dxMovement; let nY = this.y + dyMovement;

        if(targets && targets.length > 0){
            for (const t of targets) { if (checkCollision({ x: nX, y: this.y, radius: this.radius }, t)) { nX = this.x; break; } }
            for (const t of targets) { if (checkCollision({ x: this.x, y: nY, radius: this.radius }, t)) { nY = this.y; break; } }
        }
        if (activeBosses && activeBosses.length > 0) {
            if (!(this.teleporting && this.teleportEffectTimer > 0)) {
                for (const boss of activeBosses) { if (checkCollision({ x: nX, y: this.y, radius: this.radius }, boss)) { nX = this.x; break; } }
                for (const boss of activeBosses) { if (checkCollision({ x: this.x, y: nY, radius: this.radius }, boss)) { nY = this.y; break; } }
            }
        }

        this.x = nX; this.y = nY;

        this.baseRadius = this.initialBaseRadius + this.bonusBaseRadius;
        let effectiveScoreForSizing = Math.max(0, score - this.scoreOffsetForSizing);

        if (currentGrowthFactor > 0) {
            this.scoreBasedSize = effectiveScoreForSizing * currentGrowthFactor;
        }
        this.radius = this.baseRadius + this.scoreBasedSize;
        this.radius = Math.max(MIN_PLAYER_BASE_RADIUS, this.radius);


        this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
        this.y = Math.max(this.radius, Math.min(this.y, canvasHeight - this.radius));

        if (!this.isFiringOmegaLaser) {
            this.aimAngle = Math.atan2(mouseY - this.y, mouseX - this.x);
        }

        this.timeSinceLastHit += dt;
        if (this.hp > 0 && this.hp < this.maxHp) {
            this.hpRegenTimer += dt;
            if (this.hpRegenTimer >= HP_REGEN_INTERVAL) {
                this.hpRegenTimer -= HP_REGEN_INTERVAL;
                this.gainHealth(this.baseHpRegenAmount + this.hpRegenBonusFromEvolution, updateHealthDisplayCallback);
            }
        }
    }

    takeDamage(hittingRay, gameContext, damageContext) {
        const postPopupTimerFromCtx = gameContext.postPopupImmunityTimer || 0;
        const postDamageTimerFromCtx = gameContext.postDamageImmunityTimer || 0;

        if (this.isShieldOvercharging) {
            if (hittingRay) {
                const isOwnFreshRay = !hittingRay.isBossProjectile &&
                                    !hittingRay.isCorruptedByGravityWell &&
                                    !hittingRay.isCorruptedByPlayerWell &&
                                    hittingRay.spawnGraceTimer > (RAY_SPAWN_GRACE_PERIOD - 100);

                if (!isOwnFreshRay) {
                    hittingRay.isActive = false;
                    this.gainHealth(SHIELD_OVERCHARGE_HEAL_PER_RAY, gameContext.updateHealthDisplayCallback);
                } else {
                    hittingRay.isActive = false;
                }
            }
            return 0;
        }

        if (postPopupTimerFromCtx > 0 || postDamageTimerFromCtx > 0 || (this.teleporting && this.teleportEffectTimer > 0)) {
            if (hittingRay && !hittingRay.isBossProjectile && !hittingRay.isCorruptedByGravityWell && !hittingRay.isCorruptedByPlayerWell) {
                hittingRay.isActive = false;
            }
            return 0;
        }


        this.timesHit++;
        this.timeSinceLastHit = 0;

        let damageToTake = RAY_DAMAGE_TO_PLAYER;
        if (hittingRay && typeof hittingRay.damageValue === 'number') {
            damageToTake = hittingRay.damageValue;
        } else if (!hittingRay) {
        }


        if (this.damageReductionFactor > 0) damageToTake *= (1 - this.damageReductionFactor);
        if (hittingRay && hittingRay.isBossProjectile && this.visualModifiers.ablativeSublayer) {
            damageToTake *= (1 - (this.bossDamageReduction || 0));
        }
        damageToTake = Math.max(1, Math.round(damageToTake));

        this.hp -= damageToTake;
        if (this.hp < 0) this.hp = 0;
        if (gameContext.updateHealthDisplayCallback) gameContext.updateHealthDisplayCallback(this.hp, this.maxHp);

        const { screenShakeParams } = damageContext;
        if (screenShakeParams) {
            screenShakeParams.isScreenShaking = true;
            screenShakeParams.screenShakeTimer = SCREEN_SHAKE_DURATION_PLAYER_HIT;
            screenShakeParams.currentShakeMagnitude = SCREEN_SHAKE_MAGNITUDE_PLAYER_HIT;
            screenShakeParams.currentShakeType = 'playerHit';
            if (hittingRay && hittingRay.dx !== undefined) {
                const impactAngle = Math.atan2(hittingRay.dy, hittingRay.dx);
                screenShakeParams.hitShakeDx = -Math.cos(impactAngle);
                screenShakeParams.hitShakeDy = -Math.sin(impactAngle);
            } else {
                screenShakeParams.hitShakeDx = (Math.random() - 0.5) * 2;
                screenShakeParams.hitShakeDy = (Math.random() - 0.5) * 2;
                const mag = Math.sqrt(screenShakeParams.hitShakeDx**2 + screenShakeParams.hitShakeDy**2);
                if (mag > 0) { screenShakeParams.hitShakeDx /= mag; screenShakeParams.hitShakeDy /= mag; }
                else { screenShakeParams.hitShakeDx = 1; screenShakeParams.hitShakeDy = 0;}
            }
        }
        playSound(playerHitSound);

        if (this.hp <= 0) {
            if (gameContext.endGameCallback) gameContext.endGameCallback();
        }
        return damageToTake;
    }

    gainHealth(amount, updateHealthDisplayCallback) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        if (updateHealthDisplayCallback) updateHealthDisplayCallback(this.hp, this.maxHp);
    }

    consumeKineticChargeForDamageBoost() {
        if (this.kineticCharge <= 0 || this.kineticConversionLevel <= 0) {
            return 1.0; // No boost if no charge or no levels in the evolution
        }

        let chargeToConsume = Math.min(this.kineticCharge, this.kineticChargeConsumption);
        let effectScale = chargeToConsume / this.kineticChargeConsumption; // Proportional effect based on charge spent

        let maxPossiblePotencyBonus;
        if (this.kineticConversionLevel === 1) {
            maxPossiblePotencyBonus = this.initialKineticDamageBonus;
        } else { // For levels > 1
            maxPossiblePotencyBonus = this.initialKineticDamageBonus +
                                      ((this.kineticConversionLevel - 1) * this.additionalKineticDamageBonusPerLevel);
        }

        let currentPotencyBonus = effectScale * maxPossiblePotencyBonus;
        let finalDamageMultiplier = 1.0 + currentPotencyBonus;

        this.kineticCharge -= chargeToConsume;
        return finalDamageMultiplier;
    }

    procTemporalEcho(abilityIdJustUsed, abilityContext) {
        if (this.temporalEchoChance > 0 && Math.random() < this.temporalEchoChance) {
            let echoApplied = false;
            const { updateAbilityCooldownCallback } = abilityContext || {};

            for (const otherSlotKey in this.activeAbilities) {
                const otherAbility = this.activeAbilities[otherSlotKey];
                if (otherAbility && otherAbility.id !== abilityIdJustUsed && otherAbility.cooldownTimer > 0) {
                    otherAbility.cooldownTimer = Math.max(0, otherAbility.cooldownTimer - this.temporalEchoFixedReduction);
                    if (otherAbility.cooldownTimer === 0 && !otherAbility.justBecameReady) {
                        otherAbility.justBecameReady = true;
                    }
                    echoApplied = true;
                }
            }

            if (this.hasOmegaLaser && abilityIdJustUsed !== 'omegaLaser' && this.omegaLaserCooldownTimer > 0) {
                this.omegaLaserCooldownTimer = Math.max(0, this.omegaLaserCooldownTimer - this.temporalEchoFixedReduction);
                echoApplied = true;
            }

            if (this.hasShieldOvercharge && abilityIdJustUsed !== 'shieldOvercharge' && this.shieldOverchargeCooldownTimer > 0) {
                this.shieldOverchargeCooldownTimer = Math.max(0, this.shieldOverchargeCooldownTimer - this.temporalEchoFixedReduction);
                echoApplied = true;
            }

            if (echoApplied && updateAbilityCooldownCallback) {
                updateAbilityCooldownCallback(this);
            }
        }
    }

    activateAbility(slot, abilityContext) {
        const { isAnyPauseActiveCallback, updateAbilityCooldownCallback } = abilityContext;
        if (isAnyPauseActiveCallback && isAnyPauseActiveCallback()) return;

        const slotStr = String(slot);
        const ability = this.activeAbilities[slotStr];
        if (!ability) return;

        let abilityWasSuccessfullyTriggered = false;

        if (ability.id === 'miniGravityWell') {
            if (this.activeMiniWell && this.activeMiniWell.isActive) {
                this.currentGravityWellKineticBoost = this.consumeKineticChargeForDamageBoost();
                this.activeMiniWell.detonate({ targetX: abilityContext.mouseX, targetY: abilityContext.mouseY, player: this });
                ability.cooldownTimer = ability.cooldownDuration;
                ability.justBecameReady = false;
                abilityWasSuccessfullyTriggered = true;
                this.procTemporalEcho(ability.id, abilityContext);
            } else if (ability.cooldownTimer <= 0) {
                this.deployMiniGravityWell(ability.duration, abilityContext.decoysArray, abilityContext.mouseX, abilityContext.mouseY);
                if (this.activeMiniWell) {
                    this.procTemporalEcho(ability.id, abilityContext);
                    abilityWasSuccessfullyTriggered = true;
                }
            }
        } else if (ability.cooldownTimer <= 0) { 
            switch (ability.id) {
                case 'teleport':
                    this.doTeleport(abilityContext.bossDefeatEffectsArray, abilityContext.mouseX, abilityContext.mouseY, abilityContext.canvasWidth, abilityContext.canvasHeight);
                    ability.cooldownTimer = ability.cooldownDuration;
                    ability.justBecameReady = false;
                    abilityWasSuccessfullyTriggered = true;
                    this.procTemporalEcho(ability.id, abilityContext);
                    break;
                case 'empBurst':
                    this.triggerEmpBurst(abilityContext.bossDefeatEffectsArray, abilityContext.allRays, abilityContext.screenShakeParams, abilityContext.canvasWidth, abilityContext.canvasHeight);
                    ability.cooldownTimer = ability.cooldownDuration;
                    ability.justBecameReady = false;
                    abilityWasSuccessfullyTriggered = true;
                    this.procTemporalEcho(ability.id, abilityContext);
                    break;
            }
        }

        if (updateAbilityCooldownCallback) updateAbilityCooldownCallback(this);
    }

    deployMiniGravityWell(duration, decoysArray, mouseX, mouseY) {
        if (this.activeMiniWell && this.activeMiniWell.isActive) {
            console.warn("deployMiniGravityWell called while a well is already active.");
            return;
        }
        this.currentGravityWellKineticBoost = 1.0; 
        this.activeMiniWell = new PlayerGravityWell(mouseX, mouseY, duration);
        if (decoysArray) decoysArray.push(this.activeMiniWell);
        playSound(playerWellDeploySound);
    }


    doTeleport(bossDefeatEffectsArray, mouseX, mouseY, canvasWidth, canvasHeight) {
        if (this.teleporting && this.teleportEffectTimer > 0) return;
        const oldX = this.x; const oldY = this.y;
        this.x = mouseX; this.y = mouseY;
        this.x = Math.max(this.radius, Math.min(this.x, canvasWidth - this.radius));
        this.y = Math.max(this.radius, Math.min(this.y, canvasHeight - this.radius));
        this.teleporting = true; this.teleportEffectTimer = TELEPORT_IMMUNITY_DURATION;
        if (bossDefeatEffectsArray) {
            bossDefeatEffectsArray.push({ x: oldX, y: oldY, radius: this.radius * 2.5, maxRadius: this.radius * 0.5, opacity: 0.8, timer: 200, duration: 200, color: 'rgba(180, 180, 255, opacity)', initialRadius: this.radius * 2.5, shrink: true });
            bossDefeatEffectsArray.push({ x: this.x, y: this.y, radius: this.radius * 0.2, maxRadius: this.radius * 1.8, opacity: 0.8, timer: 350, duration: 350, color: 'rgba(200, 200, 255, opacity)', initialRadius: this.radius * 0.2 });
        }
        playSound(teleportSound);
    }

    triggerEmpBurst(bossDefeatEffectsArray, allRays, screenShakeParams, canvasWidth, canvasHeight) {
        if (bossDefeatEffectsArray) {
            bossDefeatEffectsArray.push({ x: this.x, y: this.y, radius: 10, maxRadius: Math.max(canvasWidth, canvasHeight) * 0.75, opacity: 0.8, timer: 400, duration: 400, color: 'rgba(100, 150, 255, opacity)', initialRadius: 10 });
        }
        if (allRays) {
            for (let i = allRays.length - 1; i >= 0; i--) {
                const ray = allRays[i];
                if (ray && !ray.isGravityWellRay) {
                    ray.isActive = false;
                }
            }
        }
        if (screenShakeParams) {
            screenShakeParams.isScreenShaking = true;
            screenShakeParams.screenShakeTimer = 400;
            screenShakeParams.currentShakeMagnitude = 8;
            screenShakeParams.currentShakeType = 'playerHit';
            screenShakeParams.hitShakeDx = 0; screenShakeParams.hitShakeDy = 0;
        }
        playSound(empBurstSound);
    }

    activateOmegaLaser(activeBuffNotificationsArray, abilityContext) {
        if (this.hasOmegaLaser && !this.isFiringOmegaLaser && this.omegaLaserCooldownTimer <= 0) {
            this.isFiringOmegaLaser = true;
            this.omegaLaserTimer = this.omegaLaserDuration;
            this.omegaLaserCurrentTickTimer = 0;
            this.omegaLaserAngle = this.aimAngle;
            playSound(omegaLaserSound, true);
            if(activeBuffNotificationsArray) activeBuffNotificationsArray.push({ text: `Omega Laser Firing!`, timer: this.omegaLaserDuration });

            this.currentOmegaLaserKineticBoost = this.consumeKineticChargeForDamageBoost();

            this.procTemporalEcho('omegaLaser', abilityContext);
            if (abilityContext && abilityContext.updateAbilityCooldownCallback) abilityContext.updateAbilityCooldownCallback(this);
        }
    }

    activateShieldOvercharge(activeBuffNotificationsArray, abilityContext) {
        if (this.hasShieldOvercharge && !this.isShieldOvercharging && this.shieldOverchargeCooldownTimer <= 0) {
            this.isShieldOvercharging = true;
            this.shieldOverchargeTimer = SHIELD_OVERCHARGE_DURATION;
            playSound(shieldOverchargeSound);
            if(activeBuffNotificationsArray) activeBuffNotificationsArray.push({ text: `Shield Overcharge Active! Healing!`, timer: SHIELD_OVERCHARGE_DURATION });

            this.procTemporalEcho('shieldOvercharge', abilityContext);
            if (abilityContext && abilityContext.updateAbilityCooldownCallback) abilityContext.updateAbilityCooldownCallback(this);
        }
    }

    dealOmegaLaserDamage(targetsArray, activeBossesArray, laserDamageContext) {
        const beamStartX = this.x + Math.cos(this.omegaLaserAngle) * this.radius;
        const beamStartY = this.y + Math.sin(this.omegaLaserAngle) * this.radius;
        const beamEndX = this.x + Math.cos(this.omegaLaserAngle) * (this.radius + this.omegaLaserRange);
        const beamEndY = this.y + Math.sin(this.omegaLaserAngle) * (this.radius + this.omegaLaserRange);

        const finalDamagePerTick = Math.round(this.omegaLaserDamagePerTick * this.abilityDamageMultiplier * this.currentOmegaLaserKineticBoost);

        if (targetsArray) {
            for (let i = targetsArray.length - 1; i >= 0; i--) {
                const target = targetsArray[i];
                if (target && isLineSegmentIntersectingCircle(beamStartX, beamStartY, beamEndX, beamEndY, target.x, target.y, target.radius + this.omegaLaserWidth / 2)) {
                    targetsArray.splice(i, 1);
                    this.totalDamageDealt += Math.round(10 * this.abilityDamageMultiplier * this.currentOmegaLaserKineticBoost);
                    if (laserDamageContext && laserDamageContext.updateScoreCallback) laserDamageContext.updateScoreCallback(10);
                }
            }
        }

        if (activeBossesArray) {
            activeBossesArray.forEach(boss => {
                if (boss && isLineSegmentIntersectingCircle(beamStartX, beamStartY, beamEndX, beamEndY, boss.x, boss.y, boss.radius + this.omegaLaserWidth / 2)) {
                    if (typeof boss.takeDamage === 'function') {
                        boss.takeDamage(finalDamagePerTick, null, this, {});
                    }
                    this.totalDamageDealt += finalDamagePerTick;
                }
            });
        }
    }
}