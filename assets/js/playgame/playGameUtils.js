/**
 * This file implements common functions related to game access.
 * (c) Simon Logan 2019
 */

mapDrawModeEnum = {
    AUTO_ALL: 'autoAll',
    AUTO_VISITED: 'autoVisited',
    MANUAL: 'manual'
}

function allObjectivesCompleted() {
    for (var i = 0; i < g_currentRealmData.objectives.length; i++) {
        // Special treatment for the "start at" objective. That's
        // really a dummy objective and is implicitly completed
        // by starting the game, so don't count it.
        if (!g_currentRealmData.objectives[i].completed &&
            g_currentRealmData.objectives[i].type !== "Start at") {
            return false;
        }
    }

    return true;
}
