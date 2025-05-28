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
// export const detailedStatsDisplayContainer = document.getElementById('detailedStatsDisplayContainer'); // This ID is the overall flex container now

// --- NEW: Player Preview and Stats Wrapper Elements for Detailed High Scores ---
export const playerPreviewCanvas = document.getElementById('playerPreviewCanvas');
export const playerPreviewPlaceholder = document.getElementById('playerPreviewPlaceholder');
export const statsPanelWrapper = document.getElementById('statsPanelWrapper'); // The div that will contain pausePlayerStatsPanel

// Elements for Pause/Game Over Stats Panel (still needed for content population)
export const statsPanelTitle = document.getElementById('statsPanelTitle');
export const statsCoreDiv = document.getElementById('statsCore');
export const statsUpgradesUl = document.getElementById('statsUpgradesList');
export const statsImmunitiesContainer = document.getElementById('statsImmunitiesContainer');
export const statsAbilitiesDiv = document.getElementById('statsAbilities');
export const statsMouseAbilitiesDiv = document.getElementById('statsMouseAbilities');
export const statsBossTiersDiv = document.getElementById('statsBossTiers');

// Kinetic Charge UI Elements
export const kineticChargeUIElement = document.getElementById('kineticChargeUI');
export const kineticChargeBarFillElement = document.getElementById('kineticChargeBarFill');
export const kineticChargeTextElement = document.getElementById('kineticChargeText');