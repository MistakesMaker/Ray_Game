// js/bossManager.js
import * as CONSTANTS_IMPORTED from './constants.js';
import { ChaserBoss } from './chaserBoss.js';
import { MirrorShieldBoss } from './mirrorShieldBoss.js';
import { GravityWellBoss } from './gravityWellBoss.js';
import { LootDrop } from './entities.js'; // For standard loot drops
import {
    playSound, stopSound, gravityWellChargeSound,
    chaserSpawnSound as audioChaserSpawnSoundLocal,
    reflectorSpawnSound as audioReflectorSpawnSoundLocal,
    singularitySpawnSound as audioSingularitySpawnSoundLocal
} from './audio.js';

export class BossManager {
    constructor(initialBossSpawnStartScore, initialBossSpawnScoreInterval, audioContextConfig) {
        this.activeBosses = [];
        this.bossSpawnStartScore = initialBossSpawnStartScore;
        this.nextBossScoreThreshold = this.bossSpawnStartScore;
        this.bossSpawnScoreInterval = initialBossSpawnScoreInterval;
        this.bossTiers = { chaser: 0, reflector: 0, singularity: 0 };
        this.bossSpawnQueue = [];

        this.availableBossTypes = [ChaserBoss, MirrorShieldBoss, GravityWellBoss];
        this.bossTypeNames = ["CHASER", "REFLECTOR", "SINGULARITY"];
        this.bossTypeKeys = ["chaser", "reflector", "singularity"];

        this.isWaveInProgress = false;
        this.waveRewardTier = 0; 
        this.bossesToSpawnInCurrentWave = 0; 
        this.bossesDefeatedInCurrentWave = 0; 

        this.bossWarningActive = false;
        this.bossWarningTimer = 0;
        this.nextBossToSpawnInfo = null;

        this.playSound = (audioContextConfig && audioContextConfig.playSound) ? audioContextConfig.playSound : playSound;
        this.audioChaserSpawnSound = (audioContextConfig && audioContextConfig.audioChaserSpawnSound) ? audioContextConfig.audioChaserSpawnSound : audioChaserSpawnSoundLocal;
        this.audioReflectorSpawnSound = (audioContextConfig && audioContextConfig.audioReflectorSpawnSound) ? audioContextConfig.audioReflectorSpawnSound : audioReflectorSpawnSoundLocal;
        this.audioSingularitySpawnSound = (audioContextConfig && audioContextConfig.audioSingularitySpawnSound) ? audioContextConfig.audioSingularitySpawnSound : audioSingularitySpawnSoundLocal;
    }

    trySpawnBoss(currentScore) {
        if (this.activeBosses.length > 0 || this.bossSpawnQueue.length > 0 || this.bossWarningActive || this.isWaveInProgress) {
            return; 
        }

        if (currentScore >= this.nextBossScoreThreshold) {
            let scoreOverThreshold = currentScore - this.nextBossScoreThreshold;
            let numIntervalsPassed = 1 + Math.floor(scoreOverThreshold / this.bossSpawnScoreInterval);
            this.bossesToSpawnInCurrentWave = Math.min(numIntervalsPassed, CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP);
            let highestTierThisWave = 0; 
            let firstBossTierOfWave = 0;

            for (let i = 0; i < this.bossesToSpawnInCurrentWave; i++) {
                const randomIndex = Math.floor(Math.random() * this.availableBossTypes.length);
                const bossTypeConstructor = this.availableBossTypes[randomIndex];
                const bossTypeName = this.bossTypeNames[randomIndex];
                const bossTypeKey = this.bossTypeKeys[randomIndex];
                const tierForThisSpecificBossInstance = (this.bossTiers[bossTypeKey] || 0) + 1;

                if (i === 0) {
                    firstBossTierOfWave = tierForThisSpecificBossInstance; 
                }
                highestTierThisWave = Math.max(highestTierThisWave, tierForThisSpecificBossInstance);

                this.bossSpawnQueue.push({
                    constructor: bossTypeConstructor,
                    tier: tierForThisSpecificBossInstance, 
                    name: bossTypeName,
                    typeKey: bossTypeKey
                });
            }

            this.nextBossScoreThreshold += this.bossSpawnScoreInterval * this.bossesToSpawnInCurrentWave;
            if (highestTierThisWave >= 5) { this.nextBossScoreThreshold += highestTierThisWave * 15; }

            if (this.bossSpawnQueue.length > 0) {
                this.isWaveInProgress = true;
                this.waveRewardTier = firstBossTierOfWave; 
                this.bossesDefeatedInCurrentWave = 0; 

                const firstBossInWaveInfo = this.bossSpawnQueue[0];
                this.nextBossToSpawnInfo = { name: firstBossInWaveInfo.name, tier: firstBossInWaveInfo.tier };
                this.bossWarningActive = true;
                this.bossWarningTimer = CONSTANTS_IMPORTED.BOSS_WARNING_DURATION;

                if (firstBossInWaveInfo.typeKey === 'chaser') this.playSound(this.audioChaserSpawnSound);
                else if (firstBossInWaveInfo.typeKey === 'reflector') this.playSound(this.audioReflectorSpawnSound);
                else if (firstBossInWaveInfo.typeKey === 'singularity') this.playSound(this.audioSingularitySpawnSound);
            }
        }
    }

    processBossSpawnQueue(gameContext) {
        if (this.bossSpawnQueue.length > 0 && gameContext && gameContext.isAnyPauseActive && !gameContext.isAnyPauseActive()) {
            const bossInfo = this.bossSpawnQueue.shift(); 

            this.bossTiers[bossInfo.typeKey] = Math.max(this.bossTiers[bossInfo.typeKey] || 0, bossInfo.tier);

            const spawnX = gameContext.canvasWidth / 2 + (Math.random() - 0.5) * 200;
            const spawnY = 100 + (Math.random() - 0.5) * 50;
            const newBoss = new bossInfo.constructor(spawnX, spawnY, bossInfo.tier);
            this.activeBosses.push(newBoss);

            if (this.activeBosses.length > 0 && gameContext.callbacks && gameContext.callbacks.pausePickups) {
                gameContext.callbacks.pausePickups(true);
            }
            
            if (this.bossSpawnQueue.length > 0 && this.activeBosses.length < this.bossesToSpawnInCurrentWave && this.activeBosses.length < CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP) {
                 // Spawns next in wave almost immediately if conditions met
            } else {
                this.nextBossToSpawnInfo = null; 
            }
        }
    }

    update(playerInstance, gameContext) {
        if (!gameContext || typeof gameContext.dt === 'undefined') {
            // console.error(`BOSSMANAGER.JS: CRITICAL - gameContext or .dt undefined!`);
            return;
        }

        if (this.bossWarningActive) {
            this.bossWarningTimer -= gameContext.dt;
            if (this.bossWarningTimer <= 0) {
                this.bossWarningActive = false; 
                this.processBossSpawnQueue(gameContext); 
            }
        } else if (this.bossSpawnQueue.length > 0 && this.isWaveInProgress && !this.bossWarningActive && gameContext.isAnyPauseActive && !gameContext.isAnyPauseActive()) {
            if (this.activeBosses.length < CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP) {
                 this.processBossSpawnQueue(gameContext);
            }
        }


        const bossUpdateContext = {
            dt: gameContext.dt,
            canvasWidth: gameContext.canvasWidth,
            canvasHeight: gameContext.canvasHeight,
            postDamageImmunityTimer: gameContext.playerPostDamageImmunityTimer || 0,
            isPlayerShieldOvercharging: playerInstance ? playerInstance.isShieldOvercharging : false,
            allRays: gameContext.allRays,
            screenShakeParams: gameContext.screenShakeParams,
            bossDefeatEffectsArray: gameContext.bossDefeatEffectsArray,
            playerCollidedWithBoss: null,
            CONSTANTS: gameContext.CONSTANTS,
            getPooledRay: gameContext.getPooledRay,
        };

        for (let i = this.activeBosses.length - 1; i >= 0; i--) {
            const boss = this.activeBosses[i];
            boss.update(playerInstance, bossUpdateContext);

            if (bossUpdateContext.playerCollidedWithBoss && gameContext.callbacks && gameContext.callbacks.onPlayerBossCollision) {
                gameContext.callbacks.onPlayerBossCollision(bossUpdateContext.playerCollidedWithBoss);
                bossUpdateContext.playerCollidedWithBoss = null;
            }

            if (boss.health <= 0) {
                this.handleBossDefeat(boss, i, playerInstance, gameContext);
            }
        }
    }


    handleBossDefeat(defeatedBoss, index, playerInstance, gameContext) {
        if (!defeatedBoss) return;
        if (!gameContext || !gameContext.callbacks || !gameContext.firstBossDefeatedThisRunRef) { 
            // console.error("BossManager: Missing context for boss defeat handling.");
            return; 
        }

        if (defeatedBoss instanceof GravityWellBoss) { 
            stopSound(gravityWellChargeSound);
            if (defeatedBoss.gravityRay && defeatedBoss.gravityRay.isActive) defeatedBoss.gravityRay.isActive = false;
            if (defeatedBoss.isInitiatingSpawn) defeatedBoss.isInitiatingSpawn = false;
        }
        if (gameContext.bossDefeatEffectsArray) {
            gameContext.bossDefeatEffectsArray.push({ x: defeatedBoss.x, y: defeatedBoss.y, radius: defeatedBoss.radius * 1.2, opacity: 1, timer: 800, duration: 800, initialRadius: defeatedBoss.radius * 1.2, color: 'rgba(255, 255, 180, opacity)' });
        }
        this.activeBosses.splice(index, 1);

        let wasFirstBoss = !gameContext.firstBossDefeatedThisRunRef.get(); // ---- CHECK if it was the first ----

        if (this.isWaveInProgress) {
            this.bossesDefeatedInCurrentWave++;
            
            if (this.bossesDefeatedInCurrentWave >= this.bossesToSpawnInCurrentWave &&
                this.activeBosses.length === 0 && 
                this.bossSpawnQueue.length === 0) { 

                let scoreToGrant = CONSTANTS_IMPORTED.BOSS_REWARD_BASE_SCORE_PER_TIER * this.waveRewardTier;
                if (gameContext.callbacks.updateScore) gameContext.callbacks.updateScore(scoreToGrant);
                if(playerInstance && typeof playerInstance.totalDamageDealt === 'number') playerInstance.totalDamageDealt += scoreToGrant;

                this.isWaveInProgress = false;
                this.waveRewardTier = 0;
                this.bossesToSpawnInCurrentWave = 0;
                this.bossesDefeatedInCurrentWave = 0;
                this.nextBossToSpawnInfo = null;

                let lootGeneratedThisTurn = false;
                if (wasFirstBoss && gameContext.callbacks.requestFirstBossLoot) { // ---- FIRST BOSS LOOT ----
                    gameContext.callbacks.requestFirstBossLoot(defeatedBoss.x, defeatedBoss.y);
                    gameContext.firstBossDefeatedThisRunRef.set(true);
                    lootGeneratedThisTurn = true; // Special loot counts as generated
                } else if (!wasFirstBoss && gameContext.bossLootPool && playerInstance && gameContext.lootDropsArray) { // ---- REGULAR BOSS LOOT ----
                    const availableUpgrades = gameContext.bossLootPool.filter(upgrade => {
                        if (!playerInstance) return true; 
                        if (upgrade.type === 'ability' && upgrade.slot) {
                            if (playerInstance.activeAbilities[upgrade.slot] && playerInstance.activeAbilities[upgrade.slot].id === upgrade.id) return false; 
                        }
                        else if (upgrade.type === 'ability_mouse') {
                            if (upgrade.id === 'omegaLaser' && playerInstance.hasOmegaLaser) return false;
                            if (upgrade.id === 'shieldOvercharge' && playerInstance.hasShieldOvercharge) return false;
                        }
                        else if (playerInstance.acquiredBossUpgrades && playerInstance.acquiredBossUpgrades.includes(upgrade.id)) return false; 
                        return true; 
                    });
                    let choices = [];
                    if (availableUpgrades.length > 0) { choices = [...availableUpgrades].sort(() => 0.5 - Math.random()).slice(0, 3); }
                    if (choices.length > 0) {
                        const loot = new LootDrop(defeatedBoss.x, defeatedBoss.y, choices);
                        loot.isFirstBossLoot = false; // Mark as regular loot
                        gameContext.lootDropsArray.push(loot);
                        lootGeneratedThisTurn = true;
                    }
                }

                let evolutionTriggeredByThisDefeat = false;
                if (gameContext.callbacks.checkEvolutionEligibility) {
                    evolutionTriggeredByThisDefeat = gameContext.callbacks.checkEvolutionEligibility(!lootGeneratedThisTurn);
                }

                if (!lootGeneratedThisTurn && !evolutionTriggeredByThisDefeat && gameContext.callbacks.pausePickups) {
                    gameContext.callbacks.pausePickups(false);
                }
            } else if (this.bossSpawnQueue.length > 0 && this.activeBosses.length < CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP && !this.bossWarningActive) {
                this.processBossSpawnQueue(gameContext);
            } else if (this.activeBosses.length === 0 && this.bossSpawnQueue.length === 0 && this.isWaveInProgress) {
                this.isWaveInProgress = false;
                 if (gameContext.callbacks.pausePickups) {
                    gameContext.callbacks.pausePickups(false);
                }
            }
        } else { // Not a wave, or wave logic somehow bypassed (should mostly be first boss if not wave)
            if (wasFirstBoss && gameContext.callbacks.requestFirstBossLoot) { // ---- FIRST BOSS LOOT (non-wave context) ----
                gameContext.callbacks.requestFirstBossLoot(defeatedBoss.x, defeatedBoss.y);
                gameContext.firstBossDefeatedThisRunRef.set(true);
            } else if (this.activeBosses.length === 0 && this.bossSpawnQueue.length === 0) { // Single boss defeated, not first, or non-wave boss
                 if (gameContext.callbacks.pausePickups) {
                    gameContext.callbacks.pausePickups(false);
                }
                 // And potentially regular loot if it wasn't the very first boss
                 if (!wasFirstBoss && gameContext.bossLootPool && playerInstance && gameContext.lootDropsArray) {
                    const availableUpgrades = gameContext.bossLootPool.filter(upgrade => { /* same filter as above */ 
                        if (!playerInstance) return true; 
                        if (upgrade.type === 'ability' && upgrade.slot) {
                            if (playerInstance.activeAbilities[upgrade.slot] && playerInstance.activeAbilities[upgrade.slot].id === upgrade.id) return false; 
                        }
                        else if (upgrade.type === 'ability_mouse') {
                            if (upgrade.id === 'omegaLaser' && playerInstance.hasOmegaLaser) return false;
                            if (upgrade.id === 'shieldOvercharge' && playerInstance.hasShieldOvercharge) return false;
                        }
                        else if (playerInstance.acquiredBossUpgrades && playerInstance.acquiredBossUpgrades.includes(upgrade.id)) return false; 
                        return true; 
                    });
                    let choices = [];
                    if (availableUpgrades.length > 0) { choices = [...availableUpgrades].sort(() => 0.5 - Math.random()).slice(0, 3); }
                    if (choices.length > 0) {
                        const loot = new LootDrop(defeatedBoss.x, defeatedBoss.y, choices);
                        loot.isFirstBossLoot = false;
                        gameContext.lootDropsArray.push(loot);
                    }
                 }
            }
        }

        if (gameContext.callbacks.applyMusicPlayState) gameContext.callbacks.applyMusicPlayState();
    }

    draw(ctx, gameDrawContext) {
        if (!ctx) return;
        this.activeBosses.forEach(boss => boss.draw(ctx));

        if (this.bossWarningActive && this.nextBossToSpawnInfo && gameDrawContext && gameDrawContext.canvasWidth && gameDrawContext.canvasHeight) {
            ctx.save();
            ctx.textAlign = 'center';
            const warningAlpha = Math.min(1, (CONSTANTS_IMPORTED.BOSS_WARNING_DURATION - this.bossWarningTimer) / (CONSTANTS_IMPORTED.BOSS_WARNING_DURATION * 0.5));
            const textY = gameDrawContext.canvasHeight / 2 - 60;
            ctx.font = 'bold 52px Arial';
            ctx.fillStyle = `rgba(255, 80, 80, ${warningAlpha * 0.9})`;
            ctx.shadowColor = `rgba(0, 0, 0, ${warningAlpha * 0.7})`;
            ctx.shadowBlur = 12;
            ctx.fillText(`WARNING!`, gameDrawContext.canvasWidth / 2, textY - 50);
            ctx.font = 'bold 38px Arial';
            ctx.fillStyle = `rgba(255, 130, 130, ${warningAlpha})`;
            ctx.fillText(`TIER ${this.nextBossToSpawnInfo.tier} ${this.nextBossToSpawnInfo.name} INCOMING!`, gameDrawContext.canvasWidth / 2, textY);
            ctx.restore();
        }
    }

    reset() {
        this.activeBosses.forEach(boss => {
            if (boss instanceof GravityWellBoss) {
                stopSound(gravityWellChargeSound);
                if (boss.activeDetonationEffect) boss.activeDetonationEffect = null;
                if (boss.gravityRay && boss.gravityRay.isActive) boss.gravityRay.isActive = false;
            }
        });
        this.activeBosses = [];
        this.nextBossScoreThreshold = this.bossSpawnStartScore;
        this.bossTiers = { chaser: 0, reflector: 0, singularity: 0 };
        this.bossWarningActive = false; this.bossWarningTimer = 0; this.nextBossToSpawnInfo = null;
        this.bossSpawnQueue = [];
        this.isWaveInProgress = false; this.waveRewardTier = 0;
        this.bossesToSpawnInCurrentWave = 0; 
        this.bossesDefeatedInCurrentWave = 0;
        // Note: firstBossDefeatedThisRun is reset in main.js's initGame()
    }

    isBossSequenceActive() { return this.activeBosses.length > 0 || this.bossWarningActive || this.bossSpawnQueue.length > 0; }
    isBossWarningActiveProp() { return this.bossWarningActive; } 
    isBossInQueue() { return this.bossSpawnQueue.length > 0; }

}