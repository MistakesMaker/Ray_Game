// js/ui.js

// --- DOM Element Exports ---
export const canvas = document.getElementById('gameCanvas');
export const scoreDisplayElem = document.getElementById('scoreDisplay');
export const healthDisplayElem = document.getElementById('healthDisplay');
export const buffIndicatorContainer = document.getElementById('buffIndicatorContainer');
export const survivalBonusIndicator = document.getElementById('survivalBonusIndicator');
export const activeBuffIndicator = document.getElementById('activeBuffIndicator');
export const uiHighScoreContainer = document.getElementById('highScoreContainer');
export const highScoreListDisplay = document.getElementById('highScoreList');
export const startScreenHighScoresDiv = document.getElementById('startScreenHighScores');
// <<< THIS IS THE FIX >>>
export const gameTimerDisplay = document.getElementById('gameTimerDisplay');

export const startScreen = document.getElementById('startScreen');
export const settingsScreen = document.getElementById('settingsScreen');
export const gameOverScreen = document.getElementById('gameOverScreen');
export const evolutionScreen = document.getElementById('evolutionScreen');
export const evolutionOptionsContainer = document.getElementById('evolutionOptionsContainer');

export const rerollEvolutionButton = document.getElementById('rerollEvolutionButton');
export const rerollInfoSpan = document.getElementById('rerollInfo');
export const blockInfoSpan = document.getElementById('blockInfo');
export const toggleBlockModeButton = document.getElementById('toggleBlockModeButton');
export const toggleFreezeModeButton = document.getElementById('toggleFreezeModeButton');
export const freezeInfoSpan = document.getElementById('freezeInfo');

export const freeUpgradeScreen = document.getElementById('freeUpgradeScreen');
export const freeUpgradeOptionContainer = document.getElementById('freeUpgradeOptionContainer');
export const closeFreeUpgradeButton = document.getElementById('closeFreeUpgradeButton');
export const lootChoiceScreen = document.getElementById('lootChoiceScreen');
export const lootOptionsContainer = document.getElementById('lootOptionsContainer');
export const abilityCooldownUI = document.getElementById('abilityCooldownUI');
export const evolutionTooltip = document.getElementById('evolutionTooltip');
export const countdownOverlay = document.getElementById('countdownOverlay');

export const pauseScreen = document.getElementById('pauseScreen');
export const pausePlayerStatsPanel = document.getElementById('pausePlayerStatsPanel');

// Detailed High Scores Screen Elements
export const detailedHighScoresScreen = document.getElementById('detailedHighScoresScreen');
export const highScoreCategorySelect = document.getElementById('highScoreCategorySelect');
export const detailedScoresList = document.getElementById('detailedScoresList');

// Player Preview and Stats Wrapper Elements for Detailed High Scores
export const playerPreviewCanvas = document.getElementById('playerPreviewCanvas');
export const playerPreviewPlaceholder = document.getElementById('playerPreviewPlaceholder');
export const statsPanelWrapper = document.getElementById('statsPanelWrapper');

// Achievements Screen Elements (NEW)
export const achievementsScreen = document.getElementById('achievementsScreen');
export const achievementTierSelectorContainer = document.getElementById('achievementTierSelectorContainer');
export const achievementsListContainer = document.getElementById('achievementsListContainer');
export const backToMainMenuFromAchievementsButton = document.getElementById('backToMainMenuFromAchievementsButton');


// Elements for Pause/Game Over Stats Panel (still needed for content population)
export const statsPanelTitle = document.getElementById('statsPanelTitle'); // Note: This might be less used if titles are dynamic
export const statsCoreDiv = document.getElementById('statsCore'); // This ID is not in the HTML
export const statsUpgradesUl = document.getElementById('statsUpgradesList'); // This ID is not in the HTML
export const statsImmunitiesContainer = document.getElementById('statsImmunitiesContainer');
export const statsAbilitiesDiv = document.getElementById('statsAbilities');
export const statsMouseAbilitiesDiv = document.getElementById('statsMouseAbilities'); // This ID is not in the HTML
export const statsBossTiersDiv = document.getElementById('statsBossTiers');

// Kinetic Charge UI Elements
export const kineticChargeUIElement = document.getElementById('kineticChargeUI');
export const kineticChargeBarFillElement = document.getElementById('kineticChargeBarFill');
export const kineticChargeTextElement = document.getElementById('kineticChargeText');

// Berserker Rage UI Elements
export const berserkerRageUIElement = document.getElementById('berserkerRageUI');
export const berserkerRageBarFillElement = document.getElementById('berserkerRageBarFill');
export const berserkerRageTextElement = document.getElementById('berserkerRageText');