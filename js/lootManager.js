// js/lootManager.js
import * as CONSTANTS from './constants.js'; 
import * as GameState from './gameState.js'; 

let bossLootPool = [];
let firstBossPathChoices = [];

let _currentLootUIDependencies = {
    UIManager: null,
    playSound: null,
    onLootSelectedCallback: null, 
    onPathSelectedCallback: null,
    audioLootPickupSound: null,
    activeBuffNotificationsArray: null, 
};

/**
 * Initializes the loot pools.
 */
export function initializeLootPools(playerInstance, updateBuffIndicatorCallback) {
    bossLootPool = [
        { 
            id: 'momentumInjectors', type: 'gear', name: 'Momentum Injectors', 
            description: 'Your rays deal +5% damage per wall bounce (max +25%).', 
            apply: () => { if(playerInstance) { playerInstance.momentumDamageBonus = (playerInstance.momentumDamageBonus || 0) + 0.05; playerInstance.visualModifiers.momentumInjectors = true;} } 
        },
        { 
            id: 'ablativeSublayer', type: 'gear', name: 'Ablative Sub-layer', 
            description: 'Take 15% less damage from Boss projectiles. Enhances armor visual.', 
            apply: () => { if(playerInstance) { playerInstance.bossDamageReduction = (playerInstance.bossDamageReduction || 0) + 0.15; playerInstance.visualModifiers.ablativeSublayer = true;} } 
        },
        { 
            id: 'adaptiveShield', type: 'gear', name: 'Adaptive Shield Array', 
            description: 'Gain permanent immunity to up to 4 new random ray colors.',
            apply: (chosenColorsArray) => { 
                if (playerInstance && chosenColorsArray && Array.isArray(chosenColorsArray)) {
                    let appliedCount = 0;
                    chosenColorsArray.forEach(color => {
                        if (!playerInstance.immuneColorsList.includes(color)) { playerInstance.immuneColorsList.push(color); appliedCount++; }
                    });
                    if(appliedCount > 0) playerInstance.visualModifiers.adaptiveShield = true;
                    if (updateBuffIndicatorCallback) updateBuffIndicatorCallback(playerInstance.immuneColorsList);
                }
            }
        },
        { id: 'empBurst',        type: 'ability', slot: '1', name: 'EMP Burst',        description: 'Activate [1]: Destroy ALL non-boss rays on screen.', cooldown: 25000, radius: CONSTANTS.canvas?.width || 800, apply: ()=>{} },
        { id: 'miniGravityWell', type: 'ability', slot: '2', name: 'Mini Gravity Well',description: 'Activate [2]: Deploy a well that pulls rays. Activate again to launch them.', cooldown: 25000, duration: 7000, apply: ()=>{} },
        { id: 'teleport',        type: 'ability', slot: '3', name: 'Teleport',         description: 'Activate [3]: Instantly move to cursor. Brief immunity on arrival.', cooldown: 20000, duration: CONSTANTS.TELEPORT_IMMUNITY_DURATION, apply: ()=>{} },
        { 
            id: 'omegaLaser', type: 'ability_mouse', name: 'Omega Laser', 
            description: 'Hold Left Mouse: Fire a continuous damaging beam. Slows movement. Significant cooldown.', 
            cooldown: CONSTANTS.OMEGA_LASER_COOLDOWN, duration: CONSTANTS.OMEGA_LASER_DURATION, 
            apply: () => { if(playerInstance) playerInstance.hasOmegaLaser = true; } 
        },
        {
            id: 'shieldOvercharge', type: 'ability_mouse', name: 'Shield Overcharge',
            description: `Hold Right Mouse: Become invulnerable for ${CONSTANTS.SHIELD_OVERCHARGE_DURATION / 1000}s and absorb ANY ray to heal ${CONSTANTS.SHIELD_OVERCHARGE_HEAL_PER_RAY} HP per ray.`,
            cooldown: CONSTANTS.SHIELD_OVERCHARGE_COOLDOWN, duration: CONSTANTS.SHIELD_OVERCHARGE_DURATION,
            apply: () => { if(playerInstance) playerInstance.hasShieldOvercharge = true; }
        }
    ];

    firstBossPathChoices = [
        {
            id: 'perfectHarmony', type: 'path_buff', name: 'Path of Harmony',
            description: `If no damage is taken for ${CONSTANTS.PERFECT_HARMONY_NO_DAMAGE_DURATION_THRESHOLD/1000}s: +${CONSTANTS.PERFECT_HARMONY_RAY_DAMAGE_BONUS*100}% all ray damage, +${CONSTANTS.PERFECT_HARMONY_SPEED_BONUS*100}% speed, abilities cool ${CONSTANTS.PERFECT_HARMONY_COOLDOWN_REDUCTION*100}% faster. Broken on damage. Grants the Priest's Circlet.`
        },
        {
            id: 'berserkersEcho', type: 'path_buff', name: 'Path of Fury',
            description: `Per 10% missing Max HP: +${CONSTANTS.BERSERKERS_ECHO_DAMAGE_PER_10_HP*100}% normal ray damage & +${CONSTANTS.BERSERKERS_ECHO_SPEED_PER_10_HP*100}% speed. Grants the Berserker's Helm.`
        },
        {
            id: 'ultimateConfiguration', type: 'path_buff', name: 'Path of Power (Offense)',
            description: `Omega Laser Dmg x2, Mini-Well Launched Rays +100% Dmg. Numbered Ability Cooldowns +50%. Grants the Wizard's Hat.`
        }
    ];
}

/**
 * Gets the defined boss loot pool.
 * @returns {Array} The array of boss loot pool objects.
 */
export function getBossLootPoolReference() { // <<< NEW GETTER
    return bossLootPool;
}

export function getLootChoices(playerInstance, numberOfChoices = 3) {
    if (!playerInstance) {
        console.error("LootManager.getLootChoices: playerInstance is undefined.");
        return [];
    }
    const availableUpgrades = bossLootPool.filter(upgrade => {
        if (upgrade.type === 'ability' && upgrade.slot) {
            if (playerInstance.activeAbilities[upgrade.slot] && playerInstance.activeAbilities[upgrade.slot].id === upgrade.id) return false;
        } else if (upgrade.type === 'ability_mouse') {
            if (upgrade.id === 'omegaLaser' && playerInstance.hasOmegaLaser) return false;
            if (upgrade.id === 'shieldOvercharge' && playerInstance.hasShieldOvercharge) return false;
        } else if (playerInstance.acquiredBossUpgrades && playerInstance.acquiredBossUpgrades.includes(upgrade.id)) {
            return false;
        }
        return true;
    });

    let choices = [];
    if (availableUpgrades.length > 0) {
        choices = [...availableUpgrades].sort(() => 0.5 - Math.random()).slice(0, numberOfChoices);
    }
    return choices;
}

export function getFirstPathChoices() {
    return [...firstBossPathChoices]; 
}

export function presentLootUI(choices, playerInstance, dependencies, isFirstBossLoot = false) {
    if (!playerInstance || !choices || choices.length === 0 || !dependencies || !dependencies.UIManager || !dependencies.playSound) {
        console.error("LootManager.presentLootUI: Missing arguments or empty choices.");
        if(dependencies && dependencies.onLootSelectedCallback && !isFirstBossLoot) dependencies.onLootSelectedCallback(null, playerInstance, dependencies);
        if(dependencies && dependencies.onPathSelectedCallback && isFirstBossLoot) dependencies.onPathSelectedCallback(null, playerInstance, dependencies);
        return;
    }

    _currentLootUIDependencies = dependencies; 

    const title = isFirstBossLoot ? "Forge Your Path!" : "Salvaged Technology!";
    const description = isFirstBossLoot 
        ? "The first trial overcome. Choose a defining power for this journey (this choice is permanent):"
        : "Choose one permanent upgrade:";
    
    if (_currentLootUIDependencies.UIManager.lootChoiceScreen) { 
        const h2 = _currentLootUIDependencies.UIManager.lootChoiceScreen.querySelector('h2');
        const p = _currentLootUIDependencies.UIManager.lootChoiceScreen.querySelector('p');
        if(h2) h2.textContent = title;
        if(p) p.textContent = description;
    }
    
    const selectionCallback = isFirstBossLoot ? 
        (choice) => confirmPathSelection(choice, playerInstance) : 
        (choice) => confirmLootSelection(choice, playerInstance);

    _currentLootUIDependencies.UIManager.populateLootOptionsUI(
        choices,
        playerInstance,
        selectionCallback,
        GameState.getAllPossibleRayColors()
    );
}


function confirmLootSelection(chosenUpgrade, playerInstance) {
    if (!playerInstance || !chosenUpgrade || !_currentLootUIDependencies.onLootSelectedCallback) {
        console.error("LootManager.confirmLootSelection: Invalid arguments or missing callback.");
        if (_currentLootUIDependencies.onLootSelectedCallback) _currentLootUIDependencies.onLootSelectedCallback(null, playerInstance, _currentLootUIDependencies); 
        return;
    }

    if (chosenUpgrade.apply) {
        chosenUpgrade.apply(chosenUpgrade.chosenColors || chosenUpgrade.chosenColor, _currentLootUIDependencies); 
    }

    if (playerInstance && chosenUpgrade.id) {
        if(chosenUpgrade.type === 'ability_mouse') {
            if (chosenUpgrade.id === 'omegaLaser') playerInstance.hasOmegaLaser = true;
            if (chosenUpgrade.id === 'shieldOvercharge') playerInstance.hasShieldOvercharge = true;
        } else if (chosenUpgrade.type === 'ability' && chosenUpgrade.slot) {
            const slotStr = chosenUpgrade.slot;
            if (playerInstance.activeAbilities.hasOwnProperty(slotStr) && playerInstance.activeAbilities[slotStr] === null) {
                playerInstance.activeAbilities[slotStr] = {
                    id: chosenUpgrade.id,
                    cooldownTimer: 0,
                    cooldownDuration: chosenUpgrade.cooldown,
                    duration: chosenUpgrade.duration,
                    radius: chosenUpgrade.radius,
                    justBecameReady: true
                };
            } else {
                console.warn(`LootManager: Slot ${slotStr} for ability ${chosenUpgrade.id} already taken or invalid.`);
            }
        } else if (chosenUpgrade.type !== 'ability') { 
             playerInstance.acquiredBossUpgrades.push(chosenUpgrade.id);
        }
     }
    _currentLootUIDependencies.onLootSelectedCallback(chosenUpgrade, playerInstance, _currentLootUIDependencies);
}

function confirmPathSelection(chosenPathBuff, playerInstance) {
    if (!playerInstance || !chosenPathBuff || !_currentLootUIDependencies.onPathSelectedCallback) {
        console.error("LootManager.confirmPathSelection: Invalid arguments or missing callback.");
        if (_currentLootUIDependencies.onPathSelectedCallback) _currentLootUIDependencies.onPathSelectedCallback(null, playerInstance, _currentLootUIDependencies); 
        return;
    }

    if (chosenPathBuff.id === 'perfectHarmony') {
        playerInstance.hasPerfectHarmonyHelm = true;
    } else if (chosenPathBuff.id === 'berserkersEcho') {
        playerInstance.hasBerserkersEchoHelm = true;
    } else if (chosenPathBuff.id === 'ultimateConfiguration') {
        playerInstance.hasUltimateConfigurationHelm = true;
    }
    _currentLootUIDependencies.onPathSelectedCallback(chosenPathBuff, playerInstance, _currentLootUIDependencies);
}