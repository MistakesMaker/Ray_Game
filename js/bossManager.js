// js/bossManager.js
import * as CONSTANTS_IMPORTED from './constants.js';
import { ChaserBoss } from './chaserBoss.js';
import { MirrorShieldBoss } from './mirrorShieldBoss.js';
import { GravityWellBoss } from './gravityWellBoss.js';
import { NexusWeaverBoss } from './nexusWeaverBoss.js';
import { LootDrop } from './entities.js';
import {
playSound, stopSound, gravityWellChargeSound,
chaserSpawnSound as audioChaserSpawnSoundLocal,
reflectorSpawnSound as audioReflectorSpawnSoundLocal,
singularitySpawnSound as audioSingularitySpawnSoundLocal,
nexusWeaverSpawnSound as audioNexusWeaverSpawnSoundLocal
} from './audio.js';

export class BossManager {
constructor(initialBossSpawnStartScore, initialBossSpawnScoreInterval, audioContextConfig) {
this.activeBosses = [];
this.bossSpawnStartScore = initialBossSpawnStartScore;
this.nextBossScoreThreshold = this.bossSpawnStartScore;
this.bossSpawnScoreInterval = initialBossSpawnScoreInterval;
this.bossTiers = { chaser: 0, reflector: 0, singularity: 0, nexusWeaver: 0 };
this.bossSpawnQueue = [];

this.standardAvailableBossTypes = [ChaserBoss, MirrorShieldBoss, GravityWellBoss];
    this.standardBossTypeNames = ["CHASER", "REFLECTOR", "SINGULARITY"];
    this.standardBossTypeKeys = ["chaser", "reflector", "singularity"];

    this.nexusWeaverBossType = NexusWeaverBoss;
    this.nexusWeaverBossName = "NEXUS WEAVER";
    this.nexusWeaverBossKey = "nexusWeaver";
    this.nexusWeaverSpawnInterval = 5;
    this.totalBossEncountersTriggered = 0;

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
    this.audioNexusWeaverSpawnSound = (audioContextConfig && audioContextConfig.audioNexusWeaverSpawnSound) ? audioContextConfig.audioNexusWeaverSpawnSound : audioNexusWeaverSpawnSoundLocal;
}

trySpawnBoss(currentScore) {
        if (this.activeBosses.length > 0 || this.bossSpawnQueue.length > 0 || this.bossWarningActive || this.isWaveInProgress) {
            return;
        }

        if (currentScore >= this.nextBossScoreThreshold) {
            this.totalBossEncountersTriggered++;
            let scoreOverThreshold = currentScore - this.nextBossScoreThreshold;
            let numIntervalsPassed = 1 + Math.floor(scoreOverThreshold / this.bossSpawnScoreInterval); 

            let highestTierThisWave = 0;
            let firstBossTierOfWave = 0;
            let bossTypeToSpawnThisEncounter;
            let bossNameToSpawnThisEncounter;
            let bossKeyToSpawnThisEncounter;
            let spawnSoundToPlay;

            if (this.totalBossEncountersTriggered % this.nexusWeaverSpawnInterval === 0) {
                this.bossesToSpawnInCurrentWave = 1; 
                bossTypeToSpawnThisEncounter = this.nexusWeaverBossType;
                bossNameToSpawnThisEncounter = this.nexusWeaverBossName;
                bossKeyToSpawnThisEncounter = this.nexusWeaverBossKey;
                spawnSoundToPlay = this.audioNexusWeaverSpawnSound;
            } else {
                // ... (standard boss wave logic) ...
                this.bossesToSpawnInCurrentWave = Math.min(numIntervalsPassed, CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP);
                const randomIndex = Math.floor(Math.random() * this.standardAvailableBossTypes.length);
                bossTypeToSpawnThisEncounter = this.standardAvailableBossTypes[randomIndex];
                bossNameToSpawnThisEncounter = this.standardBossTypeNames[randomIndex];
                bossKeyToSpawnThisEncounter = this.standardBossTypeKeys[randomIndex];

                if (bossKeyToSpawnThisEncounter === 'chaser') spawnSoundToPlay = this.audioChaserSpawnSound;
                else if (bossKeyToSpawnThisEncounter === 'reflector') spawnSoundToPlay = this.audioReflectorSpawnSound;
                else if (bossKeyToSpawnThisEncounter === 'singularity') spawnSoundToPlay = this.audioSingularitySpawnSound;
            }

            for (let i = 0; i < this.bossesToSpawnInCurrentWave; i++) {
                let currentBossType, currentBossName, currentBossKey;
                if (i === 0) { 
                    currentBossType = bossTypeToSpawnThisEncounter;
                    currentBossName = bossNameToSpawnThisEncounter;
                    currentBossKey = bossKeyToSpawnThisEncounter;
                } else { 
                    const randomIndex = Math.floor(Math.random() * this.standardAvailableBossTypes.length);
                    currentBossType = this.standardAvailableBossTypes[randomIndex];
                    currentBossName = this.standardBossTypeNames[randomIndex];
                    currentBossKey = this.standardBossTypeKeys[randomIndex];
                }

                let tierForThisSpecificBossInstance = (this.bossTiers[currentBossKey] || 0) + 1;

                // <<< --- TEMPORARY MODIFICATION FOR TESTING --- >>>
                const FORCE_NEXUS_WEAVER_TIER = 3; // Set to null or remove this line for normal behavior
                if (currentBossKey === this.nexusWeaverBossKey && FORCE_NEXUS_WEAVER_TIER !== null) {
                    tierForThisSpecificBossInstance = FORCE_NEXUS_WEAVER_TIER;
                    console.warn(`BossManager: Forcing Nexus Weaver to Tier ${FORCE_NEXUS_WEAVER_TIER} for testing.`);
                }
                // <<< --- END OF TEMPORARY MODIFICATION --- >>>


                if (i === 0) {
                    firstBossTierOfWave = tierForThisSpecificBossInstance;
                }
                highestTierThisWave = Math.max(highestTierThisWave, tierForThisSpecificBossInstance);

                this.bossSpawnQueue.push({
                    constructor: currentBossType,
                    tier: tierForThisSpecificBossInstance, 
                    name: currentBossName,
                    typeKey: currentBossKey,
                    isNexusWeaverSpecialSpawn: (currentBossKey === this.nexusWeaverBossKey && this.totalBossEncountersTriggered % this.nexusWeaverSpawnInterval === 0)
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

            if (firstBossInWaveInfo.typeKey === 'nexusWeaver') this.playSound(this.audioNexusWeaverSpawnSound);
            else if (firstBossInWaveInfo.typeKey === 'chaser') this.playSound(this.audioChaserSpawnSound);
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
        } else {
            this.nextBossToSpawnInfo = null;
        }
    }
}

update(playerInstance, gameContext) { // gameContext here IS contextForBossMan from main.js
    // console.log("BOSSMANAGER.JS: Received gameContext:", gameContext); // Your debug log
    // if (gameContext && gameContext.callbacks && typeof gameContext.callbacks.onPlayerMinionCollision === 'function') {
    //     console.log("BOSSMANAGER.JS: gameContext.callbacks.onPlayerMinionCollision IS a function.");
    // } else {
    //     console.error("BOSSMANAGER.JS: gameContext.callbacks.onPlayerMinionCollision IS NOT a function or callbacks is missing!");
    // }

    if (!gameContext || typeof gameContext.dt === 'undefined') {
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
        playerCollidedWithMinion: null,
        playerCollidedWithBossAttack: null,
        CONSTANTS: gameContext.CONSTANTS,
        getPooledRay: gameContext.getPooledRay,
        callbacks: gameContext.callbacks // <<< ENSURE THIS LINE IS PRESENT AND CORRECT
    };
    // console.log("BOSSMANAGER.JS: bossUpdateContext being passed to boss.update:", bossUpdateContext); // Your debug log
    //  if (bossUpdateContext.callbacks && typeof bossUpdateContext.callbacks.onPlayerMinionCollision === 'function') {
    //     console.log("BOSSMANAGER.JS: onPlayerMinionCollision IS a function in bossUpdateContext.callbacks");
    // } else {
    //     console.error("BOSSMANAGER.JS: onPlayerMinionCollision IS NOT a function or callbacks object is missing in bossUpdateContext!");
    // }


    for (let i = this.activeBosses.length - 1; i >= 0; i--) {
        const boss = this.activeBosses[i];
        boss.update(playerInstance, bossUpdateContext);

        if (bossUpdateContext.playerCollidedWithBoss && bossUpdateContext.callbacks && bossUpdateContext.callbacks.onPlayerBossCollision) {
            bossUpdateContext.callbacks.onPlayerBossCollision(bossUpdateContext.playerCollidedWithBoss);
            bossUpdateContext.playerCollidedWithBoss = null;
        }
        if (bossUpdateContext.playerCollidedWithMinion && bossUpdateContext.callbacks && bossUpdateContext.callbacks.onPlayerMinionCollision) {
            bossUpdateContext.callbacks.onPlayerMinionCollision(bossUpdateContext.playerCollidedWithMinion);
            bossUpdateContext.playerCollidedWithMinion = null;
        }
        if (bossUpdateContext.playerCollidedWithBossAttack && bossUpdateContext.callbacks && bossUpdateContext.callbacks.onPlayerBossAttackCollision) {
            bossUpdateContext.callbacks.onPlayerBossAttackCollision(bossUpdateContext.playerCollidedWithBossAttack);
            bossUpdateContext.playerCollidedWithBossAttack = null;
        }

        if (boss.health <= 0) {
            this.handleBossDefeat(boss, i, playerInstance, gameContext);
        }
    }
}


handleBossDefeat(defeatedBoss, index, playerInstance, gameContext) {
    if (!defeatedBoss) return;
    if (!gameContext || !gameContext.callbacks || !gameContext.firstBossDefeatedThisRunRef) {
        return;
    }

    if (defeatedBoss instanceof GravityWellBoss) {
        stopSound(gravityWellChargeSound);
        if (defeatedBoss.gravityRay && defeatedBoss.gravityRay.isActive) defeatedBoss.gravityRay.isActive = false;
        if (defeatedBoss.isInitiatingSpawn) defeatedBoss.isInitiatingSpawn = false;
    }
    if (defeatedBoss instanceof NexusWeaverBoss) {
        if (defeatedBoss.activeMinions) {
            defeatedBoss.activeMinions.forEach(m => m.isActive = false);
            defeatedBoss.activeMinions = [];
        }
    }

    if (gameContext.bossDefeatEffectsArray) {
        gameContext.bossDefeatEffectsArray.push({ x: defeatedBoss.x, y: defeatedBoss.y, radius: defeatedBoss.radius * 1.2, opacity: 1, timer: 800, duration: 800, initialRadius: defeatedBoss.radius * 1.2, color: 'rgba(255, 255, 180, opacity)' });
    }
    this.activeBosses.splice(index, 1);

    let wasFirstBoss = !gameContext.firstBossDefeatedThisRunRef.get();

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
            if (wasFirstBoss && gameContext.callbacks.requestFirstBossLoot) {
                gameContext.callbacks.requestFirstBossLoot(defeatedBoss.x, defeatedBoss.y);
                gameContext.firstBossDefeatedThisRunRef.set(true);
                lootGeneratedThisTurn = true;
            } else if (!wasFirstBoss && gameContext.bossLootPool && playerInstance && gameContext.lootDropsArray) {
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
                    loot.isFirstBossLoot = false;
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
    } else {
        if (wasFirstBoss && gameContext.callbacks.requestFirstBossLoot) {
            gameContext.callbacks.requestFirstBossLoot(defeatedBoss.x, defeatedBoss.y);
            gameContext.firstBossDefeatedThisRunRef.set(true);
        } else if (this.activeBosses.length === 0 && this.bossSpawnQueue.length === 0) {
             if (gameContext.callbacks.pausePickups) {
                gameContext.callbacks.pausePickups(false);
            }
             if (!wasFirstBoss && gameContext.bossLootPool && playerInstance && gameContext.lootDropsArray) {
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
        if (boss instanceof NexusWeaverBoss) {
            if (boss.activeMinions) {
                boss.activeMinions.forEach(m => m.isActive = false);
                boss.activeMinions = [];
            }
        }
    });
    this.activeBosses = [];
    this.nextBossScoreThreshold = this.bossSpawnStartScore;
    this.bossTiers = { chaser: 0, reflector: 0, singularity: 0, nexusWeaver: 0 };
    this.totalBossEncountersTriggered = 0;
    this.bossWarningActive = false; this.bossWarningTimer = 0; this.nextBossToSpawnInfo = null;
    this.bossSpawnQueue = [];
    this.isWaveInProgress = false; this.waveRewardTier = 0;
    this.bossesToSpawnInCurrentWave = 0;
    this.bossesDefeatedInCurrentWave = 0;
}

isBossSequenceActive() { return this.activeBosses.length > 0 || this.bossWarningActive || this.bossSpawnQueue.length > 0; }
isBossWarningActiveProp() { return this.bossWarningActive; }
isBossInQueue() { return this.bossSpawnQueue.length > 0; }
}