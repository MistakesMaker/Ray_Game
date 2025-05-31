// js/eventListeners.js

export function setupEventListeners(canvasElement, gameContext) {
    // Initialize shiftPressed state if it doesn't exist
    if (gameContext.inputState.shiftPressed === undefined) {
        gameContext.inputState.shiftPressed = false;
    }

    window.addEventListener('keydown', (e) => {
        if (!e.key) {
            return;
        }
        const keyLower = e.key.toLowerCase();

        if (gameContext.inputState.keys.hasOwnProperty(e.key)) {
            gameContext.inputState.keys[e.key] = true;
        }
        if (['w', 'a', 's', 'd'].includes(keyLower) && gameContext.inputState.keys.hasOwnProperty(keyLower) ) {
             gameContext.inputState.keys[keyLower] = true;
        }

        // --- SHIFT KEY LOGIC for Evolution Screen ---
        if (e.key === 'Shift') {
            if (!gameContext.inputState.shiftPressed) { // Prevent re-triggering if already held
                gameContext.inputState.shiftPressed = true;
                if (gameContext.isEvolutionScreenActive && gameContext.isEvolutionScreenActive() && gameContext.callbacks.redrawEvolutionOptions) {
                    gameContext.callbacks.redrawEvolutionOptions();
                }
            }
        }
        // --- END SHIFT KEY LOGIC ---


        // --- ESCAPE KEY LOGIC ---
        if (e.key === 'Escape') {
            const activeScreen = gameContext.getCurrentActiveScreen ? gameContext.getCurrentActiveScreen() : null;
            const settingsScreenElement = gameContext.getSettingsScreenElement ? gameContext.getSettingsScreenElement() : null;
            const detailedHighScoresScreenElement = gameContext.getDetailedHighScoresScreenElement ? gameContext.getDetailedHighScoresScreenElement() : null;


            if (activeScreen === settingsScreenElement && gameContext.callbacks.goBackFromSettings) {
                e.preventDefault();
                gameContext.callbacks.goBackFromSettings();
            } else if (activeScreen === detailedHighScoresScreenElement && gameContext.callbacks.goBackFromDetailedHighScores) {
                e.preventDefault();
                gameContext.callbacks.goBackFromDetailedHighScores();
            } else if (gameContext.isGameRunning && gameContext.isGameRunning() && !gameContext.isGameOver()) {
                if ((gameContext.isAnyPauseActiveExceptEsc && !gameContext.isAnyPauseActiveExceptEsc()) ||
                    (gameContext.isGamePausedByEsc && gameContext.isGamePausedByEsc()) ||
                    (!gameContext.isAnyPauseActiveExceptEsc || !gameContext.isAnyPauseActiveExceptEsc()) && (!gameContext.isGamePausedByEsc || !gameContext.isGamePausedByEsc())
                   ) {
                    if (gameContext.callbacks.togglePauseMenu) {
                        e.preventDefault();
                        gameContext.callbacks.togglePauseMenu();
                    }
                }
            }
        }

        // --- ABILITY & INTERACTION KEY LOGIC ---
        const playerInstance = gameContext.getPlayerInstance ? gameContext.getPlayerInstance() : null;

        if (playerInstance && gameContext.isGameRunning && gameContext.isGameRunning() &&
            (!gameContext.isAnyPauseActiveExceptEsc || !gameContext.isAnyPauseActiveExceptEsc()) &&
            (!gameContext.isGamePausedByEsc || !gameContext.isGamePausedByEsc())
           ) {
            const abilityContext = gameContext.getForPlayerAbilityContext ? gameContext.getForPlayerAbilityContext() : {};
            if (e.key === '1') playerInstance.activateAbility('1', abilityContext);
            else if (e.key === '2') playerInstance.activateAbility('2', abilityContext);
            else if (e.key === '3') playerInstance.activateAbility('3', abilityContext);
            if (['1', '2', '3'].includes(e.key)) e.preventDefault();
        }

        if (keyLower === 'r' &&
            gameContext.isEvolutionScreenActive && gameContext.isEvolutionScreenActive() &&
            gameContext.callbacks.handleEvolutionReRoll) {
            e.preventDefault();
            gameContext.callbacks.handleEvolutionReRoll();
        }

        if (keyLower === 'x' &&
            gameContext.isEvolutionScreenActive && gameContext.isEvolutionScreenActive() &&
            gameContext.callbacks.toggleBlockMode) {
            e.preventDefault();
            gameContext.callbacks.toggleBlockMode();
        }

        if (keyLower === 'f' &&
            gameContext.isEvolutionScreenActive && gameContext.isEvolutionScreenActive() &&
            gameContext.callbacks.toggleFreezeMode) {
            e.preventDefault();
            gameContext.callbacks.toggleFreezeMode();
        }


        if (e.key === 'F1') {
            if (gameContext.callbacks.debugSpawnBoss) {
                e.preventDefault();
                gameContext.callbacks.debugSpawnBoss(0);
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        if (!e.key) {
            return;
        }
        const keyLower = e.key.toLowerCase();

        if (gameContext.inputState.keys.hasOwnProperty(e.key)) {
            gameContext.inputState.keys[e.key] = false;
        }
        if (['w', 'a', 's', 'd'].includes(keyLower) && gameContext.inputState.keys.hasOwnProperty(keyLower) ) {
             gameContext.inputState.keys[keyLower] = false;
       }

        // --- SHIFT KEY LOGIC for Evolution Screen ---
        if (e.key === 'Shift') {
            if (gameContext.inputState.shiftPressed) {
                gameContext.inputState.shiftPressed = false;
                if (gameContext.isEvolutionScreenActive && gameContext.isEvolutionScreenActive() && gameContext.callbacks.redrawEvolutionOptions) {
                    gameContext.callbacks.redrawEvolutionOptions();
                }
            }
        }
        // --- END SHIFT KEY LOGIC ---
    });

    // --- MODIFIED MOUSEMOVE LISTENER: Attached to window ---
    window.addEventListener('mousemove', (e) => {
        if (!canvasElement || !gameContext || !gameContext.inputState) return; 

        const rect = canvasElement.getBoundingClientRect();
        const canvasMouseX = e.clientX - rect.left;
        const canvasMouseY = e.clientY - rect.top;

        gameContext.inputState.mouseX = canvasMouseX;
        gameContext.inputState.mouseY = canvasMouseY;
    });

    canvasElement.addEventListener('mousedown', (e) => {
        const playerInstance = gameContext.getPlayerInstance ? gameContext.getPlayerInstance() : null;
        const abilityContext = gameContext.getForPlayerAbilityContext ? gameContext.getForPlayerAbilityContext() : {};

        if (playerInstance && gameContext.isGameRunning && gameContext.isGameRunning() &&
            (!gameContext.isAnyPauseActiveExceptEsc || !gameContext.isAnyPauseActiveExceptEsc()) &&
            (!gameContext.isGamePausedByEsc || !gameContext.isGamePausedByEsc())
            ) {
            if (e.button === 0) { // Left Mouse Button
                if (playerInstance.activateLMB) { // Check if the method exists
                    playerInstance.activateLMB(abilityContext, false); // Pass false for isRelease on mousedown
                    e.preventDefault();
                }
            } else if (e.button === 2) { // Right Mouse Button
                if (playerInstance.activateRMB) { // Check if the method exists
                    playerInstance.activateRMB(abilityContext);
                    e.preventDefault();
                }
            }
        }
    });
    
    // Aegis Charge needs mouseup to release the charge
    canvasElement.addEventListener('mouseup', (e) => {
        const playerInstance = gameContext.getPlayerInstance ? gameContext.getPlayerInstance() : null;
        const abilityContext = gameContext.getForPlayerAbilityContext ? gameContext.getForPlayerAbilityContext() : {};

        if (playerInstance && gameContext.isGameRunning && gameContext.isGameRunning() &&
            (!gameContext.isAnyPauseActiveExceptEsc || !gameContext.isAnyPauseActiveExceptEsc()) &&
            (!gameContext.isGamePausedByEsc || !gameContext.isGamePausedByEsc())
        ) {
            if (e.button === 0) { // Left Mouse Button release
                // Specifically for Aegis Charge release or similar hold-and-release abilities
                if (playerInstance.currentPath === 'aegis' && playerInstance.hasAegisCharge && playerInstance.isChargingAegisCharge) {
                     if (playerInstance.activateAegisCharge_LMB_Aegis) {
                        playerInstance.activateAegisCharge_LMB_Aegis(abilityContext, true); // Pass true for isRelease
                        e.preventDefault();
                    }
                }
                // Other paths might not have a mouseup action for LMB
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