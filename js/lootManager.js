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
    ];

    firstBossPathChoices = [
        {
            id: 'aegisPath', 
            type: 'path_buff',
            name: 'Aegis Path',
            description: `Evolve into a spiked juggernaut, a living battering ram. HP Regeneration is 50% more effective. Colliding with bosses damages and knocks them back. Grants a fortified, spiky appearance. LMB: Hold to charge, release to dash. RMB: AoE Seismic Slam.`,
            grants_LMB: 'aegisCharge',
            grants_RMB: 'seismicSlam'
        },
        {
            id: 'berserkersEcho', 
            type: 'path_buff',
            name: 'Path of Fury',
            description: `Grants a permanent +3 Ray Damage. Per 10% missing Max HP: +${CONSTANTS.BERSERKERS_ECHO_DAMAGE_PER_10_HP*100}% normal ray damage & +${CONSTANTS.BERSERKERS_ECHO_SPEED_PER_10_HP*100}% speed. Grants Berserker's Helm. LMB: Activate Bloodpact for ray lifesteal. RMB: Savage Howl to fear enemies and boost attack speed.`,
            grants_LMB: 'bloodpact',
            grants_RMB: 'savageHowl'
        },
        {
            id: 'ultimateConfiguration', 
            type: 'path_buff',
            name: 'Path of Power',
            description: `Damaging effects of all abilities deal 2x damage. Kinetic Conversion charges with movement (no decay) & scales over time. Grants Wizard's Hat. LMB: Omega Laser. RMB: Shield Overcharge.`,
            grants_LMB: 'omegaLaser', 
            grants_RMB: 'shieldOvercharge' 
        }
    ];
}

/**
 * Gets the defined boss loot pool.
 * @returns {Array} The array of boss loot pool objects.
 */
export function getBossLootPoolReference() {
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
        ? "The first trial overcome. Choose a defining power for this journey (this choice is permanent and grants unique mouse abilities):"
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
        if (chosenUpgrade.type === 'ability' && chosenUpgrade.slot) {
            const slotStr = String(chosenUpgrade.slot);
            if (playerInstance.activeAbilities.hasOwnProperty(slotStr) && playerInstance.activeAbilities[slotStr] === null) {
                playerInstance.activeAbilities[slotStr] = {
                    id: chosenUpgrade.id,
                    cooldownTimer: 0,
                    cooldownDuration: chosenUpgrade.cooldown,
                    duration: chosenUpgrade.duration,
                    radius: chosenUpgrade.radius,
                    justBecameReady: true
                };
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

    playerInstance.currentPath = null;
    playerInstance.hasAegisPathHelm = false;
    playerInstance.hasBerserkersEchoHelm = false;
    playerInstance.hasUltimateConfigurationHelm = false;

    playerInstance.hasOmegaLaser = false;
    playerInstance.hasShieldOvercharge = false;
    playerInstance.hasAegisCharge = false;
    playerInstance.hasSeismicSlam = false;
    playerInstance.hasBloodpact = false;
    playerInstance.hasSavageHowl = false;
    
    playerInstance.berserkerPermanentRayDamageMultiplier = 1.0; 
    playerInstance.hpRegenPathMultiplier = 1.0; 

    // Reset Kinetic Conversion before setting for Mage
    playerInstance.kineticConversionLevel = 0;
    playerInstance.baseKineticChargeRate = 0;
    playerInstance.initialKineticDamageBonus = 0;
    playerInstance.magePathTimeElapsed = 0;
    playerInstance.kineticConversionScaleTimer = 0;


    if (chosenPathBuff.id === 'aegisPath') {
        playerInstance.currentPath = 'aegis';
        playerInstance.hasAegisPathHelm = true;
        playerInstance.hpRegenPathMultiplier = 1.5;
        if (chosenPathBuff.grants_LMB === 'aegisCharge') playerInstance.hasAegisCharge = true;
        if (chosenPathBuff.grants_RMB === 'seismicSlam') playerInstance.hasSeismicSlam = true;
    } else if (chosenPathBuff.id === 'berserkersEcho') {
        playerInstance.currentPath = 'berserker';
        playerInstance.hasBerserkersEchoHelm = true;
        playerInstance.rayDamageBonus += 3; // <<< THIS IS THE CHANGE
        if (chosenPathBuff.grants_LMB === 'bloodpact') playerInstance.hasBloodpact = true;
        if (chosenPathBuff.grants_RMB === 'savageHowl') playerInstance.hasSavageHowl = true;
    } else if (chosenPathBuff.id === 'ultimateConfiguration') {
        playerInstance.currentPath = 'mage';
        playerInstance.hasUltimateConfigurationHelm = true;
        if (chosenPathBuff.grants_LMB === 'omegaLaser') playerInstance.hasOmegaLaser = true;
        if (chosenPathBuff.grants_RMB === 'shieldOvercharge') playerInstance.hasShieldOvercharge = true;
        
        playerInstance.kineticConversionLevel = 1; 
        playerInstance.baseKineticChargeRate = CONSTANTS.KINETIC_BASE_CHARGE_RATE;
        playerInstance.initialKineticDamageBonus = CONSTANTS.KINETIC_INITIAL_DAMAGE_BONUS;
        playerInstance.magePathTimeElapsed = 0; 
        playerInstance.kineticConversionScaleTimer = 0; 
        
    } else {
        console.error("[LootManager] Unknown path ID chosen during confirmation:", chosenPathBuff.id);
    }
    _currentLootUIDependencies.onPathSelectedCallback(chosenPathBuff, playerInstance, _currentLootUIDependencies);
}