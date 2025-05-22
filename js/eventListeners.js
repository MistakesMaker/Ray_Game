// js/eventListeners.js

export function setupEventListeners(canvasElement, gameContext) {
    window.addEventListener('keydown', (e) => {
        // ---- START OF FIX ----
        if (!e.key) { // Check if e.key is undefined or null
            // console.warn("Keydown event with undefined e.key:", e); // Optional: log the event for debugging
            return; // Exit early if no key property
        }
        const keyLower = e.key.toLowerCase();
        // ---- END OF FIX ----


        if (gameContext.inputState.keys.hasOwnProperty(e.key)) { // Still use original e.key for properties like 'ArrowUp'
            gameContext.inputState.keys[e.key] = true;
        }
        // Ensure 'd' and other wasd keys are handled correctly even if e.key is uppercase
        if (['w', 'a', 's', 'd'].includes(keyLower) && gameContext.inputState.keys.hasOwnProperty(keyLower) ) {
             gameContext.inputState.keys[keyLower] = true;
        }


        if (e.key === 'Escape' && gameContext.isGameRunning && gameContext.isGameRunning() && !gameContext.isGameOver()) { 
            if ((gameContext.isAnyPauseActiveExceptEsc && !gameContext.isAnyPauseActiveExceptEsc()) || (gameContext.isGamePausedByEsc && gameContext.isGamePausedByEsc())) {
                if (gameContext.callbacks.togglePauseMenu) gameContext.callbacks.togglePauseMenu();
            }
        }

        const playerInstance = gameContext.getPlayerInstance ? gameContext.getPlayerInstance() : null;
        if (playerInstance && gameContext.isGameRunning && gameContext.isGameRunning() && (!gameContext.isAnyPauseActiveExceptEsc || !gameContext.isAnyPauseActiveExceptEsc())) { 
            const abilityContext = gameContext.getForPlayerAbilityContext ? gameContext.getForPlayerAbilityContext() : {};
            if (e.key === '1') playerInstance.activateAbility('1', abilityContext);
            else if (e.key === '2') playerInstance.activateAbility('2', abilityContext);
            else if (e.key === '3') playerInstance.activateAbility('3', abilityContext);
            if (['1', '2', '3'].includes(e.key)) e.preventDefault();
        }

        if (e.key === 'F1') { // Keep original e.key for specific function keys
            if (gameContext.callbacks.debugSpawnBoss) {
                e.preventDefault();
                gameContext.callbacks.debugSpawnBoss(0);
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        // ---- START OF FIX ----
        if (!e.key) { // Check if e.key is undefined or null
            // console.warn("Keyup event with undefined e.key:", e);
            return; // Exit early
        }
        const keyLower = e.key.toLowerCase();
        // ---- END OF FIX ----

        if (gameContext.inputState.keys.hasOwnProperty(e.key)) {
            gameContext.inputState.keys[e.key] = false;
        }
        if (['w', 'a', 's', 'd'].includes(keyLower) && gameContext.inputState.keys.hasOwnProperty(keyLower) ) {
            gameContext.inputState.keys[keyLower] = false;
       }
    });

    canvasElement.addEventListener('mousemove', (e) => {
        const rect = canvasElement.getBoundingClientRect();
        gameContext.inputState.mouseX = e.clientX - rect.left;
        gameContext.inputState.mouseY = e.clientY - rect.top;
    });

    canvasElement.addEventListener('mousedown', (e) => {
        const playerInstance = gameContext.getPlayerInstance ? gameContext.getPlayerInstance() : null;
        const activeBuffsArray = gameContext.getActiveBuffNotificationsArray ? gameContext.getActiveBuffNotificationsArray() : [];

        if (playerInstance && gameContext.isGameRunning && gameContext.isGameRunning() && (!gameContext.isAnyPauseActiveExceptEsc || !gameContext.isAnyPauseActiveExceptEsc())) { 
            if (e.button === 0) { // Left Mouse Button
                if (playerInstance.hasOmegaLaser) {
                    playerInstance.activateOmegaLaser(activeBuffsArray);
                    e.preventDefault();
                }
            } else if (e.button === 2) { // Right Mouse Button
                if (playerInstance.hasShieldOvercharge) {
                    playerInstance.activateShieldOvercharge(activeBuffsArray);
                    e.preventDefault();
                }
            }
        }
    });

    canvasElement.addEventListener('contextmenu', e => e.preventDefault());

    window.addEventListener('resize', () => {
        if (gameContext.callbacks.onWindowResize) gameContext.callbacks.onWindowResize();
    });

    // Button Event Listeners
    const startGameButton = document.getElementById('startGameButton');
    if (startGameButton && gameContext.callbacks.startGame) {
        startGameButton.addEventListener('click', gameContext.callbacks.startGame);
    }
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton && gameContext.callbacks.showSettingsScreenFromStart) {
        settingsButton.addEventListener('click', gameContext.callbacks.showSettingsScreenFromStart);
    }
    const soundToggleButton = document.getElementById('soundToggleButton');
    if (soundToggleButton && gameContext.callbacks.toggleSound) {
        soundToggleButton.addEventListener('click', gameContext.callbacks.toggleSound);
    }
    const musicVolumeSlider = document.getElementById('musicVolumeSlider');
    if (musicVolumeSlider && gameContext.callbacks.updateMusicVolume) {
        musicVolumeSlider.addEventListener('input', (ev) => gameContext.callbacks.updateMusicVolume(ev.target.value));
    }
    const shootVolumeSlider = document.getElementById('shootVolumeSlider');
    if (shootVolumeSlider && gameContext.callbacks.updateSfxVolume) {
        shootVolumeSlider.addEventListener('input', (ev) => gameContext.callbacks.updateSfxVolume('shoot', ev.target.value));
    }
    const hitVolumeSlider = document.getElementById('hitVolumeSlider');
    if (hitVolumeSlider && gameContext.callbacks.updateSfxVolume) {
        hitVolumeSlider.addEventListener('input', (ev) => gameContext.callbacks.updateSfxVolume('hit', ev.target.value));
    }
    const pickupVolumeSlider = document.getElementById('pickupVolumeSlider');
    if (pickupVolumeSlider && gameContext.callbacks.updateSfxVolume) {
        pickupVolumeSlider.addEventListener('input', (ev) => gameContext.callbacks.updateSfxVolume('pickup', ev.target.value));
    }
    const uiVolumeSlider = document.getElementById('uiVolumeSlider');
    if (uiVolumeSlider && gameContext.callbacks.updateSfxVolume) {
        uiVolumeSlider.addEventListener('input', (ev) => gameContext.callbacks.updateSfxVolume('ui', ev.target.value));
    }
    const backButtonSettings = document.getElementById('backButtonSettings');
    if (backButtonSettings && gameContext.callbacks.goBackFromSettings) {
        backButtonSettings.addEventListener('click', gameContext.callbacks.goBackFromSettings);
    }
    const resumeGameButton = document.getElementById('resumeGameButton');
    if (resumeGameButton && gameContext.callbacks.resumeGameFromPause) {
        resumeGameButton.addEventListener('click', gameContext.callbacks.resumeGameFromPause);
    }
    const pauseSettingsButton = document.getElementById('pauseSettingsButton');
    if (pauseSettingsButton && gameContext.callbacks.showSettingsScreenFromPause) {
        pauseSettingsButton.addEventListener('click', gameContext.callbacks.showSettingsScreenFromPause);
    }
    const pauseMainMenuButton = document.getElementById('pauseMainMenuButton');
    if (pauseMainMenuButton && gameContext.callbacks.goToMainMenuFromPause) {
        pauseMainMenuButton.addEventListener('click', gameContext.callbacks.goToMainMenuFromPause);
    }
}