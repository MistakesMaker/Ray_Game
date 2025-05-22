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
let soundEnabled = true; // Will be loaded from localStorage

// --- Volume Levels ---
let currentMusicVolume = 0.1;
let shootSoundVolume = 0.25;
let hitSoundVolume = 0.25;
let pickupSoundVolume = 0.25;
let uiSoundVolume = 0.25;

// --- DOM Element References (queried internally or passed) ---
// These will be assigned in initializeAudio or a dedicated DOM ready function
let soundToggleButtonElem,
    musicVolumeSliderElem, musicVolumeValueElem,
    shootVolumeSliderElem, shootVolumeValueElem,
    hitVolumeSliderElem, hitVolumeValueElem,
    pickupVolumeSliderElem, pickupVolumeValueElem,
    uiVolumeSliderElem, uiVolumeValueElem,
    bgMusicAudioElement; // For the <audio> tag

// --- Functions ---

export function initializeAudio(audioDomElements) {
    if (audioInitialized) return;

    // Assign passed DOM elements
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
    bgMusicAudioElement = audioDomElements.bgMusic; // The <audio> element itself

    try {
        // It's good practice to point to actual files now if you have them
        // Assuming audio files are in the same directory as index.html or an 'assets/audio/' subfolder
        // Adjust paths as necessary, e.g., 'assets/audio/player_hit.mp3'

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
        abilityUseSound = new Audio('assets/audio/ability_use.mp3'); // Generic or make specific
        abilityReadySound = new Audio('assets/audio/ability_ready.mp3'); // Generic or make specific
        chaserSpawnSound = new Audio('assets/audio/chaser_spawn.mp3');
        reflectorSpawnSound = new Audio('assets/audio/reflector_spawn.mp3');
        singularitySpawnSound = new Audio('assets/audio/singularity_spawn.mp3');
        bossHitSound = new Audio('assets/audio/boss_hit_impact.mp3');
        teleportSound = new Audio('assets/audio/teleport_activate.mp3');
        empBurstSound = new Audio('assets/audio/emp_burst_activate.mp3');
        omegaLaserSound = new Audio('assets/audio/omega_laser.mp3');
        shieldOverchargeSound = new Audio('assets/audio/shield_overcharge.mp3');

        // The bgMusic is already an HTMLAudioElement, so we just use bgMusicAudioElement directly
        bgMusic = bgMusicAudioElement;


        loadVolumeSettingsInternal(); // Load and apply initial volumes
        loadSoundEnabledSettingInternal(); // Load sound enabled state

        audioInitialized = true;
    } catch (e) {
        console.error("Error creating Audio objects:", e);
    }
    applyMusicPlayState(); // Apply initial music play state
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
    if (!audioInitialized) return;
    soundEnabled = !soundEnabled;
    localStorage.setItem('lightBlasterSoundEnabled', JSON.stringify(soundEnabled));
    updateSoundButtonVisualInternal();
    applyMusicPlayState();
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
        // soundToggleButtonElem.classList.toggle('active', soundEnabled); // If you have an 'active' class
    }
}

export function applyMusicPlayState(isGameOver = false, isGameRunning = false, isAnyPauseCurrentlyActive = false, isPausedForPopup = false) {
    if (!audioInitialized || !bgMusic) return;

    const trulyPausedForGameplay = isAnyPauseCurrentlyActive && !isPausedForPopup;

    if (soundEnabled && !isGameOver && ((isGameRunning && !trulyPausedForGameplay) || isPausedForPopup)) {
        if (bgMusic.paused) {
            bgMusic.play().catch(e => console.warn("BG music play failed:", e));
        }
    } else {
        bgMusic.pause();
    }
}


export function updateMusicVolume(volume) {
    if (!audioInitialized) return;
    currentMusicVolume = parseFloat(volume);
    if (bgMusic) bgMusic.volume = currentMusicVolume;
    if (musicVolumeValueElem) musicVolumeValueElem.textContent = `${Math.round(currentMusicVolume * 100)}%`;
    localStorage.setItem('lightBlasterMusicVol', currentMusicVolume.toString());
}

export function updateSpecificSfxVolume(soundTypeKey, volume) {
    if (!audioInitialized) return;
    const vol = parseFloat(volume);
    let targetSoundObject = null;
    let storageKey = '';
    let displayElement = null;

    switch (soundTypeKey) {
        case 'shoot':
            shootSoundVolume = vol; targetSoundObject = shootSound; storageKey = 'lightBlasterShootVol'; displayElement = shootVolumeValueElem;
            if(omegaLaserSound) omegaLaserSound.volume = vol; // Group with shoot or UI
            break;
        case 'hit':
            hitSoundVolume = vol;
            // Apply to all hit sounds
            if(playerHitSound) playerHitSound.volume = vol;
            if(targetHitSound) targetHitSound.volume = vol;
            if(chainReactionSound) chainReactionSound.volume = vol;
            if(bossHitSound) bossHitSound.volume = vol;
            storageKey = 'lightBlasterHitVol'; displayElement = hitVolumeValueElem;
            break;
        case 'pickup':
            pickupSoundVolume = vol;
            if(heartSound) heartSound.volume = vol;
            if(bonusPickupSound) bonusPickupSound.volume = vol;
            if(lootPickupSound) lootPickupSound.volume = vol;
            storageKey = 'lightBlasterPickupVol'; displayElement = pickupVolumeValueElem;
            break;
        case 'ui':
            uiSoundVolume = vol;
            // Apply to all UI/Event sounds
            if(evolutionSound) evolutionSound.volume = vol;
            if(upgradeSound) upgradeSound.volume = vol;
            if(newColorSound) newColorSound.volume = vol;
            if(screenShakeSound) screenShakeSound.volume = vol;
            if(gameOverSoundFX) gameOverSoundFX.volume = vol;
            if(gravityWellChargeSound) gravityWellChargeSound.volume = vol * 0.7;
            if(gravityWellExplodeSound) gravityWellExplodeSound.volume = vol;
            if(playerWellDeploySound) playerWellDeploySound.volume = vol * 0.8;
            if(playerWellDetonateSound) playerWellDetonateSound.volume = vol;
            if(chaserSpawnSound) chaserSpawnSound.volume = vol;
            if(reflectorSpawnSound) reflectorSpawnSound.volume = vol;
            if(singularitySpawnSound) singularitySpawnSound.volume = vol;
            if(teleportSound) teleportSound.volume = vol;
            if(empBurstSound) empBurstSound.volume = vol;
            if(abilityUseSound) abilityUseSound.volume = vol;
            if(abilityReadySound) abilityReadySound.volume = vol;
            if(shieldOverchargeSound) shieldOverchargeSound.volume = vol;
            // OmegaLaser sound might fit here or shoot. Let's keep it separate or with shoot.
            storageKey = 'lightBlasterUiVol'; displayElement = uiVolumeValueElem;
            break;
        default:
            console.warn("Unknown soundTypeKey for volume update:", soundTypeKey);
            return;
    }

    if (displayElement) displayElement.textContent = `${Math.round(vol * 100)}%`;
    if (storageKey) localStorage.setItem(storageKey, vol.toString());
}


function loadVolumeSettingsInternal() {
    currentMusicVolume = parseFloat(localStorage.getItem('lightBlasterMusicVol') || 0.1);
    shootSoundVolume = parseFloat(localStorage.getItem('lightBlasterShootVol') || 0.25);
    hitSoundVolume = parseFloat(localStorage.getItem('lightBlasterHitVol') || 0.25);
    pickupSoundVolume = parseFloat(localStorage.getItem('lightBlasterPickupVol') || 0.25);
    uiSoundVolume = parseFloat(localStorage.getItem('lightBlasterUiVol') || 0.25);

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

    // Apply initial volumes to audio objects after they are created
    // This is now handled within initializeAudio after sound objects are created.
    // We call this function, then apply these loaded volumes to the newly created Audio objects.
    // The logic for applying to specific sound objects is now in updateSpecificSfxVolume,
    // so initializeAudio will call that after loading.

    // Re-applying after objects are created in initializeAudio
    if (audioInitialized) {
        updateMusicVolume(currentMusicVolume); // Applies to bgMusic
        updateSpecificSfxVolume('shoot', shootSoundVolume);
        updateSpecificSfxVolume('hit', hitSoundVolume);
        updateSpecificSfxVolume('pickup', pickupSoundVolume);
        updateSpecificSfxVolume('ui', uiSoundVolume);
    }
}

// --- Export specific sound instances if needed by other modules for direct play ---
// It's often better to have specific play functions like playPlayerHitSound() if granularity is needed,
// or pass the sound instance to the generic playSound() from the calling module.
// For now, let's make a few key ones available if other modules import them.
export {
    playerHitSound, targetHitSound, gameOverSoundFX, heartSound, shootSound,
    evolutionSound, upgradeSound, bonusPickupSound, newColorSound, screenShakeSound,
    gravityWellChargeSound, gravityWellExplodeSound, chainReactionSound, playerWellDeploySound,
    playerWellDetonateSound, lootPickupSound, abilityUseSound, abilityReadySound,
    chaserSpawnSound, reflectorSpawnSound, singularitySpawnSound, bossHitSound,
    teleportSound, empBurstSound, omegaLaserSound, shieldOverchargeSound,
    bgMusic // Exporting bgMusic itself if direct control over it is needed elsewhere
};