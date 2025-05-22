// js/audio.js

// --- Audio Object Variables ---
let bgMusic, playerHitSound, targetHitSound, gameOverSoundFX, heartSound, shootSound,
    evolutionSound, upgradeSound, bonusPickupSound, newColorSound, screenShakeSound,
    gravityWellChargeSound, gravityWellExplodeSound, chainReactionSound, playerWellDeploySound,
    playerWellDetonateSound, lootPickupSound, abilityUseSound, abilityReadySound,
    chaserSpawnSound, reflectorSpawnSound, singularitySpawnSound, bossHitSound,
    teleportSound, empBurstSound, omegaLaserSound, shieldOverchargeSound;

// --- Audio State ---
let audioInitialized = false;
let soundEnabled = true;

// --- Volume Levels ---
let currentMusicVolume = 0.25; // << SET YOUR DESIRED DEFAULT HERE (e.g., 0.0 for muted, 0.05 for 5%)
let shootSoundVolume = 0.25;
let hitSoundVolume = 0.25;
let pickupSoundVolume = 0.25;
let uiSoundVolume = 0.25;

// --- DOM Element References (queried internally or passed) ---
let soundToggleButtonElem,
    musicVolumeSliderElem, musicVolumeValueElem,
    shootVolumeSliderElem, shootVolumeValueElem,
    hitVolumeSliderElem, hitVolumeValueElem,
    pickupVolumeSliderElem, pickupVolumeValueElem,
    uiVolumeSliderElem, uiVolumeValueElem,
    bgMusicAudioElement;

// --- Functions ---

export function initializeAudio(audioDomElements) {
    // if (audioInitialized) return; // Can keep this to prevent re-initialization if called multiple times

    soundToggleButtonElem = audioDomElements.soundToggleButton;
    musicVolumeSliderElem = audioDomElements.musicVolumeSlider;
    musicVolumeValueElem = audioDomElements.musicVolumeValue;
    shootVolumeSliderElem = audioDomElements.shootVolumeSlider;
    shootVolumeValueElem = audioDomElements.shootVolumeValue;
    hitVolumeSliderElem = audioDomElements.hitVolumeSlider;
    hitVolumeValueElem = audioDomElements.hitVolumeValue;
    pickupVolumeSliderElem = audioDomElements.pickupVolumeSlider;
    pickupVolumeValueElem = audioDomElements.pickupVolumeValue;
    uiVolumeSliderElem = audioDomElements.uiVolumeSlider;
    uiVolumeValueElem = audioDomElements.uiVolumeValue;
    bgMusicAudioElement = audioDomElements.bgMusic;

    try {
        // --- Create Audio Objects First ---
        playerHitSound = new Audio('assets/audio/player_hit.mp3');
        targetHitSound = new Audio('assets/audio/target_explode.mp3');
        gameOverSoundFX = new Audio('assets/audio/game_over_explosion.mp3');
        heartSound = new Audio('assets/audio/heart_pickup.mp3');
        shootSound = new Audio('assets/audio/laser_shoot.mp3');
        evolutionSound = new Audio('assets/audio/evolution_powerup.mp3');
        upgradeSound = new Audio('assets/audio/upgrade_achieved.mp3');
        bonusPickupSound = new Audio('assets/audio/bonus_pickup.mp3');
        newColorSound = new Audio('assets/audio/new_color_unleashed.mp3');
        screenShakeSound = new Audio('assets/audio/screen_shake.mp3');
        gravityWellChargeSound = new Audio('assets/audio/gravity_well_charge.mp3');
        gravityWellExplodeSound = new Audio('assets/audio/gravity_well_explode.mp3');
        chainReactionSound = new Audio('assets/audio/chain_reaction.mp3');
        playerWellDeploySound = new Audio('assets/audio/player_well_deploy.mp3');
        playerWellDetonateSound = new Audio('assets/audio/player_well_detonate.mp3');
        lootPickupSound = new Audio('assets/audio/loot_pickup_shine.mp3');
        abilityUseSound = new Audio('assets/audio/ability_use.mp3');
        abilityReadySound = new Audio('assets/audio/ability_ready.mp3');
        chaserSpawnSound = new Audio('assets/audio/chaser_spawn.mp3');
        reflectorSpawnSound = new Audio('assets/audio/reflector_spawn.mp3');
        singularitySpawnSound = new Audio('assets/audio/singularity_spawn.mp3');
        bossHitSound = new Audio('assets/audio/boss_hit_impact.mp3');
        teleportSound = new Audio('assets/audio/teleport_activate.mp3');
        empBurstSound = new Audio('assets/audio/emp_burst_activate.mp3');
        omegaLaserSound = new Audio('assets/audio/omega_laser.mp3');
        shieldOverchargeSound = new Audio('assets/audio/shield_overcharge.mp3');
        bgMusic = bgMusicAudioElement;

        // --- Set audioInitialized to true AFTER audio objects are created but BEFORE volumes are applied ---
        audioInitialized = true;

        // --- Load settings and apply them ---
        // These functions will now correctly apply volumes because audioInitialized is true
        loadVolumeSettingsInternal();
        loadSoundEnabledSettingInternal(); // This also calls updateSoundButtonVisualInternal

        // Initial music play state is typically handled by main.js after UI is ready
        // or by the first call to applyMusicPlayState from main.js

    } catch (e) {
        console.error("Error creating Audio objects:", e);
        audioInitialized = false; // Ensure it's false on error
    }
}

export function playSound(soundEffectInstance, loop = false) {
    if (!soundEnabled || !soundEffectInstance || !audioInitialized) return;
    soundEffectInstance.currentTime = 0;
    soundEffectInstance.loop = loop;
    soundEffectInstance.play().catch(e => console.warn("Sound play failed for:", soundEffectInstance.src, e));
}

export function stopSound(soundEffectInstance) {
    if (soundEffectInstance && audioInitialized && !soundEffectInstance.paused) {
        soundEffectInstance.pause();
        soundEffectInstance.currentTime = 0;
    }
}

export function toggleSoundEnabled() {
    // This function will be called by an event listener in main.js or eventListeners.js
    // It should then trigger a call to applyMusicPlayState from main.js
    if (!audioInitialized) return;
    soundEnabled = !soundEnabled;
    localStorage.setItem('lightBlasterSoundEnabled', JSON.stringify(soundEnabled));
    updateSoundButtonVisualInternal();
    // The actual starting/stopping of music should be handled by a call to applyMusicPlayState
    // from the main game logic, which knows the current game state.
}

function loadSoundEnabledSettingInternal() {
    const storedSetting = localStorage.getItem('lightBlasterSoundEnabled');
    if (storedSetting !== null) {
        soundEnabled = JSON.parse(storedSetting);
    }
    updateSoundButtonVisualInternal();
}

function updateSoundButtonVisualInternal() {
    if (soundToggleButtonElem) {
        soundToggleButtonElem.textContent = soundEnabled ? 'ON' : 'OFF';
    }
}

export function applyMusicPlayState(
    isGameOver = false,
    isGameRunning = false,
    isAnyPauseCurrentlyActive = false,
    isPausedForPopup = false,
    currentVisibleScreen = null
) {
    if (!audioInitialized || !bgMusic) return;

    const trulyPausedForGameplay = isAnyPauseCurrentlyActive && !isPausedForPopup;

    const shouldPlayMusic = soundEnabled && !isGameOver &&
        (
            (isGameRunning && !trulyPausedForGameplay) ||
            isPausedForPopup ||
            (currentVisibleScreen && currentVisibleScreen.id === 'startScreen') ||
            (currentVisibleScreen && currentVisibleScreen.id === 'settingsScreen') ||
            (currentVisibleScreen && currentVisibleScreen.id === 'detailedHighScoresScreen')
        );

    if (shouldPlayMusic) {
        if (bgMusic.paused) {
            bgMusic.play().catch(e => console.warn("BG music play failed:", e));
        }
    } else {
        bgMusic.pause();
    }
}


export function updateMusicVolume(volume) {
    currentMusicVolume = parseFloat(volume);
    if (bgMusic && audioInitialized) { // Ensure bgMusic exists and audio is initialized
         bgMusic.volume = currentMusicVolume;
    }
    if (musicVolumeValueElem) musicVolumeValueElem.textContent = `${Math.round(currentMusicVolume * 100)}%`;
    localStorage.setItem('lightBlasterMusicVol', currentMusicVolume.toString());
}

export function updateSpecificSfxVolume(soundTypeKey, volume) {
    const vol = parseFloat(volume);
    let storageKey = '';
    let displayElement = null;
    let soundObjectsToUpdate = []; // Array to hold {sound: object, multiplier: optional_float}

    switch (soundTypeKey) {
        case 'shoot':
            shootSoundVolume = vol;
            if(shootSound) soundObjectsToUpdate.push({sound: shootSound});
            if(omegaLaserSound) soundObjectsToUpdate.push({sound: omegaLaserSound});
            storageKey = 'lightBlasterShootVol'; displayElement = shootVolumeValueElem;
            break;
        case 'hit':
            hitSoundVolume = vol;
            if(playerHitSound) soundObjectsToUpdate.push({sound: playerHitSound});
            if(targetHitSound) soundObjectsToUpdate.push({sound: targetHitSound});
            if(chainReactionSound) soundObjectsToUpdate.push({sound: chainReactionSound});
            if(bossHitSound) soundObjectsToUpdate.push({sound: bossHitSound});
            storageKey = 'lightBlasterHitVol'; displayElement = hitVolumeValueElem;
            break;
        case 'pickup':
            pickupSoundVolume = vol;
            if(heartSound) soundObjectsToUpdate.push({sound: heartSound});
            if(bonusPickupSound) soundObjectsToUpdate.push({sound: bonusPickupSound});
            if(lootPickupSound) soundObjectsToUpdate.push({sound: lootPickupSound});
            storageKey = 'lightBlasterPickupVol'; displayElement = pickupVolumeValueElem;
            break;
        case 'ui':
            uiSoundVolume = vol;
            if(evolutionSound) soundObjectsToUpdate.push({sound: evolutionSound});
            if(upgradeSound) soundObjectsToUpdate.push({sound: upgradeSound});
            if(newColorSound) soundObjectsToUpdate.push({sound: newColorSound});
            if(screenShakeSound) soundObjectsToUpdate.push({sound: screenShakeSound});
            if(gameOverSoundFX) soundObjectsToUpdate.push({sound: gameOverSoundFX});
            if(gravityWellChargeSound) soundObjectsToUpdate.push({sound: gravityWellChargeSound, multiplier: 0.7});
            if(gravityWellExplodeSound) soundObjectsToUpdate.push({sound: gravityWellExplodeSound});
            if(playerWellDeploySound) soundObjectsToUpdate.push({sound: playerWellDeploySound, multiplier: 0.8});
            if(playerWellDetonateSound) soundObjectsToUpdate.push({sound: playerWellDetonateSound});
            if(chaserSpawnSound) soundObjectsToUpdate.push({sound: chaserSpawnSound});
            if(reflectorSpawnSound) soundObjectsToUpdate.push({sound: reflectorSpawnSound});
            if(singularitySpawnSound) soundObjectsToUpdate.push({sound: singularitySpawnSound});
            if(teleportSound) soundObjectsToUpdate.push({sound: teleportSound});
            if(empBurstSound) soundObjectsToUpdate.push({sound: empBurstSound});
            if(abilityUseSound) soundObjectsToUpdate.push({sound: abilityUseSound});
            if(abilityReadySound) soundObjectsToUpdate.push({sound: abilityReadySound});
            if(shieldOverchargeSound) soundObjectsToUpdate.push({sound: shieldOverchargeSound});
            storageKey = 'lightBlasterUiVol'; displayElement = uiVolumeValueElem;
            break;
        default:
            console.warn("Unknown soundTypeKey for volume update:", soundTypeKey);
            return;
    }

    if (audioInitialized) { // Only try to set volume if audio objects are created
        soundObjectsToUpdate.forEach(item => {
            if (item && item.sound) {
                item.sound.volume = vol * (item.multiplier || 1.0);
            }
        });
    }

    if (displayElement) displayElement.textContent = `${Math.round(vol * 100)}%`;
    if (storageKey) localStorage.setItem(storageKey, vol.toString());
}


function loadVolumeSettingsInternal() {
    // Load from localStorage or use the hardcoded defaults
    currentMusicVolume = parseFloat(localStorage.getItem('lightBlasterMusicVol') || currentMusicVolume); // Use existing default if not in localStorage
    shootSoundVolume = parseFloat(localStorage.getItem('lightBlasterShootVol') || shootSoundVolume);
    hitSoundVolume = parseFloat(localStorage.getItem('lightBlasterHitVol') || hitSoundVolume);
    pickupSoundVolume = parseFloat(localStorage.getItem('lightBlasterPickupVol') || pickupSoundVolume);
    uiSoundVolume = parseFloat(localStorage.getItem('lightBlasterUiVol') || uiSoundVolume);

    // Update UI sliders
    if (musicVolumeSliderElem) musicVolumeSliderElem.value = currentMusicVolume.toString();
    if (musicVolumeValueElem) musicVolumeValueElem.textContent = `${Math.round(currentMusicVolume * 100)}%`;
    if (shootVolumeSliderElem) shootVolumeSliderElem.value = shootSoundVolume.toString();
    if (shootVolumeValueElem) shootVolumeValueElem.textContent = `${Math.round(shootSoundVolume * 100)}%`;
    if (hitVolumeSliderElem) hitVolumeSliderElem.value = hitSoundVolume.toString();
    if (hitVolumeValueElem) hitVolumeValueElem.textContent = `${Math.round(hitSoundVolume * 100)}%`;
    if (pickupVolumeSliderElem) pickupVolumeSliderElem.value = pickupSoundVolume.toString();
    if (pickupVolumeValueElem) pickupVolumeValueElem.textContent = `${Math.round(pickupSoundVolume * 100)}%`;
    if (uiVolumeSliderElem) uiVolumeSliderElem.value = uiSoundVolume.toString();
    if (uiVolumeValueElem) uiVolumeValueElem.textContent = `${Math.round(uiSoundVolume * 100)}%`;

    // Apply volumes to actual audio objects IF they are initialized
    if (audioInitialized) {
        updateMusicVolume(currentMusicVolume); // This will set bgMusic.volume
        updateSpecificSfxVolume('shoot', shootSoundVolume);
        updateSpecificSfxVolume('hit', hitSoundVolume);
        updateSpecificSfxVolume('pickup', pickupSoundVolume);
        updateSpecificSfxVolume('ui', uiSoundVolume);
    }
}

export {
    playerHitSound, targetHitSound, gameOverSoundFX, heartSound, shootSound,
    evolutionSound, upgradeSound, bonusPickupSound, newColorSound, screenShakeSound,
    gravityWellChargeSound, gravityWellExplodeSound, chainReactionSound, playerWellDeploySound,
    playerWellDetonateSound, lootPickupSound, abilityUseSound, abilityReadySound,
    chaserSpawnSound, reflectorSpawnSound, singularitySpawnSound, bossHitSound,
    teleportSound, empBurstSound, omegaLaserSound, shieldOverchargeSound,
    bgMusic
};