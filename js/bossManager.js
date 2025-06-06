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
import { PENDING_RECORD_NAME } from './highScoreManager.js';


function formatMillisecondsToTimeInternal(ms) {
    if (typeof ms !== 'number' || isNaN(ms)) return "N/A";
    let milliseconds = Math.floor((ms % 1000) / 10);
    let seconds = Math.floor((ms / 1000) % 60);
    let minutes = Math.floor((ms / (1000 * 60)) % 60);

    minutes = (minutes < 10) ? "0" + minutes : minutes.toString();
    seconds = (seconds < 10) ? "0" + seconds : seconds.toString();
    milliseconds = (milliseconds < 10) ? "0" + milliseconds : milliseconds.toString();
    if (milliseconds.length === 1) milliseconds = "0" + milliseconds;

    return minutes + ":" + seconds + "." + milliseconds;
}

function getBossKeyFromName(bossInstance) {
    if (bossInstance instanceof ChaserBoss) return "chaser";
    if (bossInstance instanceof MirrorShieldBoss) return "reflector";
    if (bossInstance instanceof GravityWellBoss) return "singularity";
    if (bossInstance instanceof NexusWeaverBoss) return "nexusWeaver";
    return "unknown";
}


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

    this.nexusWeaverDefeatedThisRun = false;
    this.flawlessUniqueStandardBossTypesDefeatedThisRun = new Set(); 
    this.flawlessUniqueBossTypesDefeatedThisRun = new Set(); 


    this.playSound = (audioContextConfig && audioContextConfig.playSound) ? audioContextConfig.playSound : playSound;
    this.audioChaserSpawnSound = (audioContextConfig && audioContextConfig.audioChaserSpawnSound) ? audioContextConfig.audioChaserSpawnSound : audioChaserSpawnSoundLocal;
    this.audioReflectorSpawnSound = (audioContextConfig && audioContextConfig.audioReflectorSpawnSound) ? audioContextConfig.audioReflectorSpawnSound : audioReflectorSpawnSoundLocal;
    this.audioSingularitySpawnSound = (audioContextConfig && audioContextConfig.audioSingularitySpawnSound) ? audioContextConfig.audioSingularitySpawnSound : audioSingularitySpawnSoundLocal;
    this.audioNexusWeaverSpawnSound = (audioContextConfig && audioContextConfig.audioNexusWeaverSpawnSound) ? audioContextConfig.audioNexusWeaverSpawnSound : audioNexusWeaverSpawnSoundLocal;
}

trySpawnBoss(currentScore, playerInstance) {
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

            if (this.totalBossEncountersTriggered > 0 && (this.totalBossEncountersTriggered % this.nexusWeaverSpawnInterval === 0)) {
                this.bossesToSpawnInCurrentWave = 1;
                bossTypeToSpawnThisEncounter = this.nexusWeaverBossType;
                bossNameToSpawnThisEncounter = this.nexusWeaverBossName;
                bossKeyToSpawnThisEncounter = this.nexusWeaverBossKey;
            } else {
                this.bossesToSpawnInCurrentWave = Math.min(numIntervalsPassed, CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP);
                const randomIndex = Math.floor(Math.random() * this.standardAvailableBossTypes.length);
                bossTypeToSpawnThisEncounter = this.standardAvailableBossTypes[randomIndex];
                bossNameToSpawnThisEncounter = this.standardBossTypeNames[randomIndex];
                bossKeyToSpawnThisEncounter = this.standardBossTypeKeys[randomIndex];
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

                if (i === 0) {
                    firstBossTierOfWave = tierForThisSpecificBossInstance;
                }
                highestTierThisWave = Math.max(highestTierThisWave, tierForThisSpecificBossInstance);

                this.bossSpawnQueue.push({
                    constructor: currentBossType,
                    tier: tierForThisSpecificBossInstance,
                    name: currentBossName,
                    typeKey: currentBossKey
                });
            }

        this.nextBossScoreThreshold += this.bossSpawnScoreInterval * this.bossesToSpawnInCurrentWave;
        if (highestTierThisWave >= 5) { this.nextBossScoreThreshold += highestTierThisWave * 15; }

        if (this.bossSpawnQueue.length > 0) {
            this.isWaveInProgress = true;
            this.waveRewardTier = firstBossTierOfWave;
            this.bossesDefeatedInCurrentWave = 0;

            if (playerInstance) {
                playerInstance.usedAbilityInCurrentBossFight = false;
            }

            const firstBossInWaveInfo = this.bossSpawnQueue[0];
            this.nextBossToSpawnInfo = { name: firstBossInWaveInfo.name, tier: firstBossInWaveInfo.tier };
            this.bossWarningActive = true;
            this.bossWarningTimer = CONSTANTS_IMPORTED.BOSS_WARNING_DURATION;

            if (firstBossInWaveInfo.typeKey === this.nexusWeaverBossKey) this.playSound(this.audioNexusWeaverSpawnSound);
            else if (firstBossInWaveInfo.typeKey === 'chaser') this.playSound(this.audioChaserSpawnSound);
            else if (firstBossInWaveInfo.typeKey === 'reflector') this.playSound(this.audioReflectorSpawnSound);
            else if (firstBossInWaveInfo.typeKey === 'singularity') this.playSound(this.audioSingularitySpawnSound);
        }
    }
}

processBossSpawnQueue(gameContext) {
    if (this.bossSpawnQueue.length > 0 && gameContext && gameContext.isAnyPauseActive && !gameContext.isAnyPauseActive()) {
        const bossInfo = this.bossSpawnQueue.shift();

        const playerToUse = gameContext.player || (gameContext.callbacks && gameContext.callbacks.getPlayerInstance ? gameContext.callbacks.getPlayerInstance() : null);

        if (playerToUse) {
            playerToUse.damageTakenThisBossFight = 0;
            playerToUse.usedAbilityInCurrentBossFight = false;
            if (bossInfo.typeKey === 'nexusWeaver' && bossInfo.tier === 3) {
                playerToUse.nexusMinionsKilledThisNexusT3Fight = 0;
            }
            if (bossInfo.typeKey === 'nexusWeaver' && bossInfo.tier === 5 && playerToUse.currentPath === 'berserker') {
                playerToUse.maintainedHighRageThisBossFight = true; 
            }
        }

        this.bossTiers[bossInfo.typeKey] = Math.max(this.bossTiers[bossInfo.typeKey] || 0, bossInfo.tier);

        const spawnX = gameContext.canvasWidth / 2 + (Math.random() - 0.5) * 200;
        const spawnY = 100 + (Math.random() - 0.5) * 50;
        const newBoss = new bossInfo.constructor(spawnX, spawnY, bossInfo.tier);

        newBoss.damageSourcesThisFight = {
            primary: 0, omegaLaser: 0, miniGravityWell: 0, aegisCharge: 0,
            seismicSlam: 0, otherAbility: 0, aegisPassive: 0,
        };


        if (gameContext.callbacks && gameContext.callbacks.getGameplayTimeElapsed) {
            newBoss.spawnTimestamp = gameContext.callbacks.getGameplayTimeElapsed();
        } else {
            newBoss.spawnTimestamp = 0;
        }

        this.activeBosses.push(newBoss);


        if (this.bossSpawnQueue.length > 0 && this.activeBosses.length < this.bossesToSpawnInCurrentWave && this.activeBosses.length < CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP) {
        } else {
            this.nextBossToSpawnInfo = null;
        }
    }
}

update(playerInstance, gameContext) {
    if (!gameContext || typeof gameContext.dt === 'undefined') {
        return;
    }

    this.trySpawnBoss(gameContext.score, playerInstance);

    if (this.bossWarningActive) {
        this.bossWarningTimer -= gameContext.dt;
        if (this.bossWarningTimer <= 0) {
            this.bossWarningActive = false;
            this.processBossSpawnQueue({...gameContext, player: playerInstance });
        }
    } else if (this.bossSpawnQueue.length > 0 && this.isWaveInProgress && !this.bossWarningActive && gameContext.isAnyPauseActive && !gameContext.isAnyPauseActive()) {
        if (this.activeBosses.length < CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP) {
             this.processBossSpawnQueue({...gameContext, player: playerInstance });
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
        callbacks: gameContext.callbacks,
        nexusWeaverShootsOrbiterProjectile: gameContext.callbacks ? gameContext.callbacks.nexusWeaverShootsOrbiterProjectile : null
    };


    for (let i = this.activeBosses.length - 1; i >= 0; i--) {
        const boss = this.activeBosses[i];
        if (!boss) {
            this.activeBosses.splice(i, 1);
            continue;
        }
        
        if (playerInstance && playerInstance.currentPath === 'berserker' && 
            boss instanceof NexusWeaverBoss && boss.tier === 5 &&
            playerInstance.berserkerRagePercentage < 80) { // Check if rage dropped below threshold
            playerInstance.maintainedHighRageThisBossFight = false;
        }

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
    if (!defeatedBoss) {
        if (index >= 0 && index < this.activeBosses.length) {
            this.activeBosses.splice(index, 1);
        }
        return;
    }
    if (!gameContext || !gameContext.callbacks || !gameContext.firstBossDefeatedThisRunRef || typeof gameContext.currentRunId === 'undefined' || !playerInstance) {
        return;
    }
    const gameplayTimeAtKill = gameContext.callbacks.getGameplayTimeElapsed ? gameContext.callbacks.getGameplayTimeElapsed() : 0;
    const signalAchievement = gameContext.callbacks.signalAchievementEvent;
    if (!signalAchievement) return; // Can't proceed without this

    const bossKey = getBossKeyFromName(defeatedBoss);
    console.log(`[BossManager] Handling defeat of: ${bossKey} (Tier: ${defeatedBoss.tier}) | Flawless (this fight): ${playerInstance.damageTakenThisBossFight === 0} | Total Hits (this run): ${playerInstance.timesHit}`);

    if (defeatedBoss instanceof NexusWeaverBoss) {
        if (!this.nexusWeaverDefeatedThisRun) {
            signalAchievement("nexus_weaver_defeated_first_time_run");
            this.nexusWeaverDefeatedThisRun = true;
        }
        
        signalAchievement("event_nexus_weaver_defeated", { bossTier: defeatedBoss.tier });

        signalAchievement("nexus_tX_defeated_within_time", {
            bossTier: defeatedBoss.tier,
            timeTakenMs: gameplayTimeAtKill
        });
        if (!playerInstance.usedAbilityInCurrentBossFight) {
            signalAchievement("nexus_weaver_defeated_no_abilities_strict", { bossTier: defeatedBoss.tier });
        }
        if (defeatedBoss.tier === 1 && playerInstance.timesHit === 0) {
            signalAchievement("event_nexus_tX_defeated_flawless_run", { bossTier: 1 });
        }
        if (defeatedBoss.tier === 5 && !playerInstance.rerollsUsedThisRun && !playerInstance.blocksUsedThisRun && !playerInstance.freezesUsedThisRun) {
            signalAchievement("event_nexus_tX_defeated_no_evo_interaction_use", { bossTier: 5 });
        }
        if (defeatedBoss.tier === 5 && playerInstance.currentPath === 'berserker' && playerInstance.maintainedHighRageThisBossFight) {
             signalAchievement("event_berserker_boss_high_rage_kill", {
                bossKey: "nexusWeaver", bossTier: 5, path: "berserker", maintainedHighRageEntireFight: true
            });
        }
        if (defeatedBoss.tier === 3) {
            if (playerInstance.heartsCollectedThisRun === 0 && playerInstance.bonusPointsCollectedThisRun === 0) {
                signalAchievement("nexus_t3_defeated_no_pickups");
            }
            if (playerInstance.nexusMinionsKilledThisNexusT3Fight === 0) {
                signalAchievement("nexus_t3_defeated_no_minions_killed");
            }
        }
    }

    if (this.standardAvailableBossTypes.some(type => defeatedBoss instanceof type)) {
        signalAchievement("event_any_standard_boss_tier_X_defeated", { bossKey, bossTier: defeatedBoss.tier });
        if (defeatedBoss.tier === 6) { 
            signalAchievement("event_standard_boss_tX_defeated_no_class_evo", { bossTier: 6 });
        }
    }
    
    if (defeatedBoss.tier >= 5) { // Max Efficiency and Apex Predator
        signalAchievement("tX_boss_defeated_high_hp", {
            bossTier: defeatedBoss.tier, playerHpPercent: playerInstance.hp / playerInstance.maxHp
        });
        if (defeatedBoss instanceof NexusWeaverBoss && defeatedBoss.tier === 5 && playerInstance.currentPath === 'berserker') {
             if (playerInstance.isBloodpactActive && playerInstance.isSavageHowlAttackSpeedBuffActive) { 
                 signalAchievement("path_boss_buffed_kill", { bossKey, bossTier: 5, path: "berserker", bloodpactActive: true, savageHowlActive: true });
            }
        }
    }
    
    // Path-specific ability/buff kills
    if (defeatedBoss.damageSourcesThisFight && playerInstance.currentPath) {
        signalAchievement("path_boss_ability_only_kill", {
            bossKey, bossTier: defeatedBoss.tier, path: playerInstance.currentPath,
            damageSources: { ...defeatedBoss.damageSourcesThisFight } 
        });
        if (playerInstance.currentPath === 'berserker') {
            signalAchievement("path_boss_buffed_kill", {
                bossKey, bossTier: defeatedBoss.tier, path: "berserker",
                bloodpactActive: playerInstance.isBloodpactActive,
                savageHowlActive: playerInstance.isSavageHowlAttackSpeedBuffActive
            });
        }
    }

    // Flawless tracking
    if (playerInstance.damageTakenThisBossFight === 0) {
        signalAchievement("boss_defeated_flawless", { bossKey, bossTier: defeatedBoss.tier });

        if (!this.flawlessUniqueBossTypesDefeatedThisRun.has(bossKey)) {
            this.flawlessUniqueBossTypesDefeatedThisRun.add(bossKey);
            signalAchievement("event_multi_unique_boss_flawless_any_type"); // Data no longer needed, it's checked directly
        }

        // <<< BUG FIX: Add a separate check for the stricter Flawless Gauntlet >>>
        if (playerInstance.flawlessStreakActive && this.standardBossTypeKeys.includes(bossKey)) {
            if (!this.flawlessUniqueStandardBossTypesDefeatedThisRun.has(bossKey)) {
                 this.flawlessUniqueStandardBossTypesDefeatedThisRun.add(bossKey);
                 // This event is for the Master achievement, it now implies a stricter check
                 signalAchievement("event_multi_unique_standard_boss_flawless");
            }
        }
    }

    // Resourceful Fighter
    if (!(defeatedBoss instanceof NexusWeaverBoss) && defeatedBoss.tier === 2 && !playerInstance.usedAbilityInCurrentBossFight) {
        signalAchievement("boss_defeat_no_abilities", { bossKey, bossTier: 2, noAbilitiesUsedFromBossManager: true });
    }
    playerInstance.usedAbilityInCurrentBossFight = false;


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

    if (this.activeBosses[index] === defeatedBoss) {
        this.activeBosses.splice(index, 1);
    } else {
        const actualIndex = this.activeBosses.indexOf(defeatedBoss);
        if (actualIndex > -1) {
            this.activeBosses.splice(actualIndex, 1);
        }
    }


    if (defeatedBoss instanceof NexusWeaverBoss &&
        gameContext.callbacks.hasNexusWeaverTierTimeBeenRecordedThisRun &&
        !gameContext.callbacks.hasNexusWeaverTierTimeBeenRecordedThisRun(defeatedBoss.tier) &&
        gameContext.callbacks.getGameplayTimeElapsed) {

        const category = `nexusWeaverTier${defeatedBoss.tier}Time`;
        let statsSnapshotForBossKill = null;

        if (gameContext.callbacks.createStatsSnapshotForBossKill && playerInstance) {
            statsSnapshotForBossKill = gameContext.callbacks.createStatsSnapshotForBossKill(playerInstance, this.bossTiers);
        }

        let currentCategoryHighScores = [];
        if (gameContext.callbacks.getSpecificHighScores) {
            currentCategoryHighScores = gameContext.callbacks.getSpecificHighScores(category);
        }

        let isNewRecord = false;
        const MAX_ENTRIES_PER_CAT = 10;
        if (currentCategoryHighScores.length < MAX_ENTRIES_PER_CAT) {
            isNewRecord = true;
        } else {
            const slowestRecordTime = currentCategoryHighScores[currentCategoryHighScores.length - 1].value;
            if (gameplayTimeAtKill < slowestRecordTime) {
                isNewRecord = true;
            }
        }

        if (isNewRecord) {
            if (gameContext.callbacks.recordBossKillTime) {
                gameContext.callbacks.recordBossKillTime(category, PENDING_RECORD_NAME, gameplayTimeAtKill, statsSnapshotForBossKill, gameContext.currentRunId);
            }
            if (gameContext.activeBuffNotificationsArray && playerInstance) {
                gameContext.activeBuffNotificationsArray.push({
                    text: `New Record! Nexus T${defeatedBoss.tier}: ${formatMillisecondsToTimeInternal(gameplayTimeAtKill)}`,
                    timer: CONSTANTS_IMPORTED.BUFF_NOTIFICATION_DURATION * 2
                });
            }
        }
        if (gameContext.callbacks.markNexusWeaverTierTimeRecordedThisRun) {
            gameContext.callbacks.markNexusWeaverTierTimeRecordedThisRun(defeatedBoss.tier);
        }
    }


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
                if (availableUpgrades.length > 0) {
                    choices = [...availableUpgrades].sort(() => 0.5 - Math.random()).slice(0, 3);
                }

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
            }
        } else if (this.bossSpawnQueue.length > 0 && this.activeBosses.length < CONSTANTS_IMPORTED.MAX_BOSSES_IN_WAVE_CAP && !this.bossWarningActive) {
             if (playerInstance) playerInstance.damageTakenThisBossFight = 0;
            this.processBossSpawnQueue({...gameContext, player: playerInstance });
        } else if (this.activeBosses.length === 0 && this.bossSpawnQueue.length === 0 && this.isWaveInProgress) {
            this.isWaveInProgress = false;
             if (gameContext.callbacks.pausePickups) {
            }
        }
    } else {
        if (wasFirstBoss && gameContext.callbacks.requestFirstBossLoot) {
            gameContext.callbacks.requestFirstBossLoot(defeatedBoss.x, defeatedBoss.y);
            gameContext.firstBossDefeatedThisRunRef.set(true);
        } else if (this.activeBosses.length === 0 && this.bossSpawnQueue.length === 0) {
             if (gameContext.callbacks.pausePickups) {
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
    this.activeBosses.forEach(boss => {
        if (boss && typeof boss.draw === 'function') {
            boss.draw(ctx);
        } else if (boss) {
        } else {
        }
    });

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
    this.nexusWeaverDefeatedThisRun = false;
    this.flawlessUniqueStandardBossTypesDefeatedThisRun = new Set();
    this.flawlessUniqueBossTypesDefeatedThisRun = new Set(); 
}

isBossSequenceActive() { return this.activeBosses.length > 0 || this.bossWarningActive || this.bossSpawnQueue.length > 0; }
isBossWarningActiveProp() { return this.bossWarningActive; }
isBossInQueue() { return this.bossSpawnQueue.length > 0; }

debugSpawnBoss(tierToSpawn, bossTypeKey = 'nexusWeaver', playerInstance) {
    let constructorToUse;
    let nameToUse;
    switch(bossTypeKey) {
        case 'chaser': constructorToUse = ChaserBoss; nameToUse = "CHASER"; break;
        case 'reflector': constructorToUse = MirrorShieldBoss; nameToUse = "REFLECTOR"; break;
        case 'singularity': constructorToUse = GravityWellBoss; nameToUse = "SINGULARITY"; break;
        case 'nexusWeaver':
        default: constructorToUse = NexusWeaverBoss; nameToUse = "NEXUS WEAVER"; break;
    }

    const tier = tierToSpawn > 0 ? tierToSpawn : (this.bossTiers[bossTypeKey] || 0) + 1;
    this.bossSpawnQueue.push({
        constructor: constructorToUse,
        tier: tier,
        name: nameToUse,
        typeKey: bossTypeKey
    });
    this.isWaveInProgress = true;
    this.waveRewardTier = tier;
    this.bossesToSpawnInCurrentWave = 1;
    this.bossesDefeatedInCurrentWave = 0;

    if (playerInstance) {
        playerInstance.usedAbilityInCurrentBossFight = false;
        // The reset is now correctly in processBossSpawnQueue
        // playerInstance.damageTakenThisBossFight = 0;
        if (bossTypeKey === 'nexusWeaver' && tier === 3) {
            playerInstance.nexusMinionsKilledThisNexusT3Fight = 0;
        }
        if (bossTypeKey === 'nexusWeaver' && tier === 5 && playerInstance.currentPath === 'berserker') { 
            playerInstance.maintainedHighRageThisBossFight = true;
        }
    }

    const firstBossInWaveInfo = this.bossSpawnQueue[0];
    this.nextBossToSpawnInfo = { name: firstBossInWaveInfo.name, tier: firstBossInWaveInfo.tier };
    this.bossWarningActive = true;
    this.bossWarningTimer = CONSTANTS_IMPORTED.BOSS_WARNING_DURATION;

    if (firstBossInWaveInfo.typeKey === this.nexusWeaverBossKey) this.playSound(this.audioNexusWeaverSpawnSound);
     else if (firstBossInWaveInfo.typeKey === 'chaser') this.playSound(this.audioChaserSpawnSound);
     else if (firstBossInWaveInfo.typeKey === 'reflector') this.playSound(this.audioReflectorSpawnSound);
     else if (firstBossInWaveInfo.typeKey === 'singularity') this.playSound(this.audioSingularitySpawnSound);
}


}