// js/highScoreManager.js

const HIGH_SCORES_KEY = 'lightBlasterOmegaHighScoresII_Modular_Categorized'; 
const MAX_ENTRIES_PER_CATEGORY = 10;
export const PENDING_RECORD_NAME = "PENDING..."; // Export for use in bossManager

/**
 * Retrieves all high scores from localStorage.
 * @returns {Object} An object where keys are categories and values are arrays of score objects.
 *                   Returns a default structure if none are found or data is corrupt.
 */
export function getHighScores() {
    const scoresJson = localStorage.getItem(HIGH_SCORES_KEY);
    let scores = {};
    const defaultCategories = ["survival", "nexusWeaverTier1Time", "nexusWeaverTier2Time", "nexusWeaverTier3Time", "nexusWeaverTier4Time", "nexusWeaverTier5Time"];

    try {
        if (scoresJson) {
            scores = JSON.parse(scoresJson);
            defaultCategories.forEach(cat => {
                if (!Array.isArray(scores[cat])) {
                    scores[cat] = [];
                }
            });
        } else {
            defaultCategories.forEach(cat => {
                scores[cat] = [];
            });
        }
    } catch (error) {
        console.error("Error parsing high scores from localStorage:", error);
        defaultCategories.forEach(cat => {
            scores[cat] = [];
        });
    }
    return scores;
}

/**
 * Adds a new high score to a specific category in localStorage.
 * @param {string} category - The category of the high score.
 * @param {string} name - The name of the player.
 * @param {number} value - The score or time achieved.
 * @param {Object} finalStatsSnapshot - A snapshot of the player's final stats.
 * @param {number} runId - The unique ID for the current game run.
 * @returns {Array} The top scores for the specified category after adding the new one.
 */
export function addHighScore(category, name, value, finalStatsSnapshot, runId) { // <<< ADD runId parameter
    if (typeof category !== 'string' || typeof name !== 'string' || typeof value !== 'number' || typeof finalStatsSnapshot === 'undefined' || typeof runId === 'undefined') {
        console.error("Invalid arguments for addHighScore:", { category, name, value, finalStatsSnapshot, runId });
        const allScoresOnError = getHighScores();
        return allScoresOnError[category] || [];
    }

    const allScores = getHighScores(); 

    if (!Array.isArray(allScores[category])) {
        allScores[category] = []; 
    }

    const categoryScores = allScores[category];

    const newScoreEntry = {
        name: name.trim().substring(0, 10) || "ANON",
        value: value, 
        timestamp: Date.now(),
        stats: finalStatsSnapshot,
        runId: runId // <<< STORE runId
    };

    const isTimeBased = category.toLowerCase().includes('time');

    if (categoryScores.length < MAX_ENTRIES_PER_CATEGORY) {
        categoryScores.push(newScoreEntry);
    } else {
        if (isTimeBased) {
            if (value < categoryScores[MAX_ENTRIES_PER_CATEGORY - 1].value) {
                categoryScores.pop(); 
                categoryScores.push(newScoreEntry);
            }
        } else {
            if (value > categoryScores[MAX_ENTRIES_PER_CATEGORY - 1].value) {
                categoryScores.pop(); 
                categoryScores.push(newScoreEntry);
            }
        }
    }

    if (isTimeBased) {
        categoryScores.sort((a, b) => a.value - b.value); 
    } else {
        categoryScores.sort((a, b) => b.value - a.value); 
    }

    allScores[category] = categoryScores.slice(0, MAX_ENTRIES_PER_CATEGORY);

    try {
        localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(allScores));
    } catch (error) {
        console.error("Error saving high scores to localStorage:", error);
    }
    return allScores[category]; 
}


/**
 * Updates the names of pending tier records for a specific runId.
 * @param {number} runIdToUpdate - The runId of the records to update.
 * @param {string} newPlayerName - The new name to set for these records.
 */
export function updatePendingTierRecordNames(runIdToUpdate, newPlayerName) {
    if (typeof runIdToUpdate === 'undefined' || typeof newPlayerName !== 'string') {
        console.error("Invalid arguments for updatePendingTierRecordNames");
        return;
    }

    const allScores = getHighScores();
    let scoresUpdated = false;

    for (const category in allScores) {
        if (category.toLowerCase().includes('time')) { // Only update tier time records
            let categoryModified = false;
            allScores[category].forEach(entry => {
                if (entry.runId === runIdToUpdate && entry.name === PENDING_RECORD_NAME) {
                    entry.name = newPlayerName.trim().substring(0, 10) || "ANON";
                    categoryModified = true;
                }
            });
            if (categoryModified) {
                // Re-sort if names changed, though sorting is primarily by value
                allScores[category].sort((a, b) => a.value - b.value);
                scoresUpdated = true;
            }
        }
    }

    if (scoresUpdated) {
        try {
            localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(allScores));
            console.log(`Updated pending tier records for runId ${runIdToUpdate} with name ${newPlayerName}`);
        } catch (error) {
            console.error("Error saving updated high scores to localStorage:", error);
        }
    }
}