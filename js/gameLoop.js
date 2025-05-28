// js/gameLoop.js

let animationFrameId = null;
let lastTime = 0;
let isLoopRunning = false;

let _updateCallback = null;
let _drawCallback = null;
let _isGameOverCallback = null;
let _isGameRunningCallback = null; 
let _isAnyPauseActiveCallback = null; 


/**
 * Initializes the game loop module with necessary callbacks.
 * @param {function} isGameOverFn - Function that returns true if the game is over.
 * @param {function} isGameRunningFn - Function that returns true if the game is currently in a "running" logical state.
 * @param {function} isAnyPauseActiveFn - Function that returns true if any game pause (popups, Esc, countdown) is active.
 */
export function initGameLoop(isGameOverFn, isGameRunningFn, isAnyPauseActiveFn) {
    _isGameOverCallback = isGameOverFn;
    _isGameRunningCallback = isGameRunningFn;
    _isAnyPauseActiveCallback = isAnyPauseActiveFn; 
}

/**
 * The main loop function that calls update and draw.
 * @param {DOMHighResTimeStamp} timestamp - The current time provided by requestAnimationFrame.
 */
function loop(timestamp) {
    if (!_isGameOverCallback || !_isGameRunningCallback || !_updateCallback || !_drawCallback || !_isAnyPauseActiveCallback) {
        console.error("Game loop callbacks not properly initialized. Call initGameLoop first.");
        stopGameLoop(); 
        return;
    }

    if (!isLoopRunning) { 
        // Loop was explicitly stopped (e.g., by stopGameLoop call from orchestrateScreenChange when a popup is shown)
        // No need to request another frame here if isLoopRunning is false.
        return;
    }
    
    if (_isGameOverCallback()) {
        stopGameLoop(); // This will set isLoopRunning to false and cancel animationFrameId
        console.log("Game over detected by gameLoop.js, stopping loop.");
        return;
    }

    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Only call updateGame if the game is logically running AND not paused by popups/Esc/countdown.
    // GameState.isGameRunning() means it's not game over and not on start/settings screen.
    // GameState.isAnyPauseActive() checks for popups, Esc, countdown.
    if (_isGameRunningCallback() && !_isAnyPauseActiveCallback()) {
        _updateCallback(deltaTime || (1000 / 60)); // Fallback deltaTime if first frame or issue
    } else {
        // If paused, we might still want to update certain non-gameplay elements or animations
        // in the future. For now, we just skip the main game logic update.
        // The deltaTime is still calculated because _drawCallback might need it for UI animations.
        // console.log("Game update skipped due to pause or not running state."); // Optional debug
    }
    
    _drawCallback(); // Always draw (handles player glow during countdown, pause screen visuals etc.)

    // Request the next frame *only if* the loop is still supposed to be running.
    // This is crucial. If stopGameLoop was called, isLoopRunning will be false,
    // and we should not request another frame.
    if (isLoopRunning) {
        animationFrameId = requestAnimationFrame(loop);
    } else {
        // If isLoopRunning became false (e.g. due to gameOver inside this iteration),
        // ensure animationFrameId is cleared.
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }
}

/**
 * Starts the game loop.
 * @param {function} updateFn - The function to call for game updates.
 * @param {function} drawFn - The function to call for drawing the game.
 */
export function startGameLoop(updateFn, drawFn) {
    if (isLoopRunning && animationFrameId) { 
        // console.warn("startGameLoop called while loop is already running with an active frame.");
        return; // Avoid restarting if already properly running
    }
    if (typeof updateFn !== 'function' || typeof drawFn !== 'function') {
        console.error("startGameLoop requires valid update and draw functions.");
        return;
    }
    if (!_isGameOverCallback || !_isGameRunningCallback || !_isAnyPauseActiveCallback) {
        console.error("GameLoop not initialized with core state callbacks. Call initGameLoop first.");
        return;
    }


    _updateCallback = updateFn;
    _drawCallback = drawFn;

    console.log("Starting game loop (via startGameLoop)...");
    isLoopRunning = true;
    lastTime = performance.now(); 
    
    // Clear any existing frame just in case, though isLoopRunning check should prevent most overlaps
    if (animationFrameId) { 
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(loop);
}

/**
 * Stops the game loop.
 */
export function stopGameLoop() {
    // Check if there's anything to stop
    if (!isLoopRunning && !animationFrameId) {
        // console.log("stopGameLoop called but loop was not running or no frame ID.");
        return;
    }
    console.log("Stopping game loop (via stopGameLoop)...");
    isLoopRunning = false; // Primary flag to stop the loop's continuation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

/**
 * Provides the current animationFrameId, mainly for external cancellation if absolutely needed.
 * It's generally preferred to use stopGameLoop().
 * @returns {number|null} The current animation frame ID.
 */
export function getAnimationFrameId() {
    return animationFrameId;
}