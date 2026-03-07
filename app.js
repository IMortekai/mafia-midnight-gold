// Mafia Midnight Gold Core Application State

const ROLES = {
    MAFIA: 'Mafia',
    POLICEMAN: 'Policeman',
    DOCTOR: 'Doctor',
    LADY: 'Lady',
    JOKER: 'Joker',
    CITIZEN: 'Citizen'
};

const PHASES = {
    SETUP: 'SETUP',
    ASSIGNMENT: 'ASSIGNMENT',
    GAMEPLAY: 'GAMEPLAY',
    END: 'END'
};

// Default State Blueprint
const defaultState = {
    players: [], // { id, name, originalRole, currentRole, isActive, eliminationType, effects: [] }
    settings: {
        ladyEnabled: false,
        jokerEnabled: false
    },
    gameState: {
        phase: PHASES.SETUP,
        cycle: 1,
        currentStep: 0, // Maps to logic flow steps
        history: [], // narrator reference details
        publicSummary: [], // what the narrator reads out loud at start of day
        turnActions: {
            mafiaTargetId: null,
            ladyTargetId: null,
            doctorTargetId: null
        },
        winner: null // 'Town' | 'Mafia' | 'Joker' | null
    }
};

// State Container & Local Storage Manager
let appState = null;

function loadState() {
    const stored = localStorage.getItem('mafiaState');
    if (stored) {
        try {
            appState = JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse stored state, resetting.", e);
            appState = JSON.parse(JSON.stringify(defaultState));
        }
    } else {
        appState = JSON.parse(JSON.stringify(defaultState));
    }

    // Ensure scoreboard exists (migrating old state)
    if (!appState.scoreboard) {
        appState.scoreboard = { Town: 0, Mafia: 0, Joker: 0 };
    }
}

function saveState() {
    localStorage.setItem('mafiaState', JSON.stringify(appState));
}

// Ensure state is loaded
loadState();

window.appState = appState;
window.saveState = saveState;

// Simple View Router
function renderView() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = ''; // Clear current view

    switch (appState.gameState.phase) {
        case PHASES.SETUP:
            appEl.appendChild(createSetupView());
            break;
        case PHASES.ASSIGNMENT:
            appEl.appendChild(createAssignmentView());
            break;
        case PHASES.GAMEPLAY:
            appEl.appendChild(createGameplayView());
            break;
        case PHASES.END:
            appEl.appendChild(createEndView());
            break;
        default:
            appEl.appendChild(createSetupView());
    }
}

// --- View Scaffolding --- //
function createSetupView() {
    const div = document.createElement('div');
    div.className = 'view setup-view';

    // Header
    const header = document.createElement('h2');
    header.innerText = 'Midnight Setup';
    div.appendChild(header);

    // Player Input
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-group';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Enter player name...';
    nameInput.className = 'input-field';

    const addBtn = document.createElement('button');
    addBtn.innerText = 'Add';
    addBtn.className = 'btn btn-secondary';

    addBtn.onclick = () => {
        const val = nameInput.value.trim();
        if (val) {
            appState.players.unshift({
                id: Date.now().toString(),
                name: val,
                originalRole: null,
                currentRole: null,
                isActive: true,
                eliminationType: null,
                effects: []
            });
            saveState();
            renderView();
        }
    };

    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addBtn.click();
    });

    inputContainer.appendChild(nameInput);
    inputContainer.appendChild(addBtn);
    div.appendChild(inputContainer);

    // Player List
    const playerList = document.createElement('div');
    playerList.className = 'player-list panel';
    if (appState.players.length === 0) {
        playerList.innerHTML = '<p class="text-muted">No players added.</p>';
    } else {
        appState.players.forEach((p, idx) => {
            const pRow = document.createElement('div');
            pRow.className = 'player-row';
            pRow.innerHTML = `<span>${p.name}</span>`;

            const remBtn = document.createElement('button');
            remBtn.innerText = '✕';
            remBtn.className = 'btn-icon text-danger';
            remBtn.onclick = () => {
                appState.players.splice(idx, 1);
                saveState();
                renderView();
            };
            pRow.appendChild(remBtn);
            playerList.appendChild(pRow);
        });
    }
    div.appendChild(playerList);

    // Role Toggles
    const togglesContainer = document.createElement('div');
    togglesContainer.className = 'toggles-container panel';

    const countInfo = document.createElement('p');
    countInfo.className = 'text-gold mb-1';

    // Calculate roles
    const totalPlayers = appState.players.length;
    let activeRoles = 1; // Mafia
    if (appState.settings.ladyEnabled) activeRoles++;
    if (appState.settings.jokerEnabled) activeRoles++;
    const isDoctorActive = true; activeRoles++;
    const isPolicemanActive = true; activeRoles++;

    const citizensCount = Math.max(0, totalPlayers - activeRoles);

    countInfo.innerHTML = `Total Players: ${totalPlayers} <br> Citizens: ${citizensCount}`;
    togglesContainer.appendChild(countInfo);

    // Lady Toggle
    const ladyRowEl = document.createElement('div');
    ladyRowEl.className = 'toggle-row';
    ladyRowEl.innerHTML = `
        <span>Lady Role</span>
        <label class="switch">
            <input type="checkbox" id="ladyToggle" ${appState.settings.ladyEnabled ? 'checked' : ''}>
            <span class="slider round"></span>
        </label>
    `;
    togglesContainer.appendChild(ladyRowEl);

    // Joker Toggle
    const jokerRowEl = document.createElement('div');
    jokerRowEl.className = 'toggle-row';
    jokerRowEl.innerHTML = `
        <span>Joker Role</span>
        <label class="switch">
            <input type="checkbox" id="jokerToggle" ${appState.settings.jokerEnabled ? 'checked' : ''}>
            <span class="slider round"></span>
        </label>
    `;
    togglesContainer.appendChild(jokerRowEl);

    div.appendChild(togglesContainer);

    // Event listeners for toggles
    setTimeout(() => { // ensure DOM is mounted
        const lTog = document.getElementById('ladyToggle');
        if (lTog) {
            lTog.onchange = (e) => {
                appState.settings.ladyEnabled = e.target.checked;
                saveState();
                renderView();
            };
        }
        const jTog = document.getElementById('jokerToggle');
        if (jTog) {
            jTog.onchange = (e) => {
                appState.settings.jokerEnabled = e.target.checked;
                saveState();
                renderView();
            };
        }
    }, 0);

    // Start Session Button
    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-primary';
    startBtn.innerText = 'Start Game';

    // Validation
    if (totalPlayers < 6) { // Fixed minimum player count
        startBtn.disabled = true;
        startBtn.innerText = `Need at least 6 players`;
    }

    startBtn.onclick = () => {
        startAssignmentPhase();
    };

    div.appendChild(startBtn);

    return div;
}

function startAssignmentPhase() {
    // 1. Randomize pass order
    shuffleArray(appState.players);

    // 2. Assign Roles
    const rolesToAssign = [ROLES.MAFIA, ROLES.POLICEMAN, ROLES.DOCTOR];
    if (appState.settings.ladyEnabled) rolesToAssign.push(ROLES.LADY);
    if (appState.settings.jokerEnabled) rolesToAssign.push(ROLES.JOKER);

    // Fill the rest with Citizens
    const totalPlayers = appState.players.length;
    while (rolesToAssign.length < totalPlayers) {
        rolesToAssign.push(ROLES.CITIZEN);
    }

    shuffleArray(rolesToAssign);

    appState.players.forEach((p, idx) => {
        p.originalRole = rolesToAssign[idx];
        p.currentRole = rolesToAssign[idx];
        p.isActive = true;
        p.eliminationType = null;
        p.effects = [];
    });

    // Prep assignment flow state
    appState.gameState.phase = PHASES.ASSIGNMENT;
    appState.gameState.assignmentIndex = 0; // Track who is holding the phone
    appState.gameState.cycle = 1;
    appState.gameState.currentStep = 0;
    appState.gameState.history = [];

    saveState();
    renderView();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function createAssignmentView() {
    const div = document.createElement('div');
    div.className = 'view assignment-view flex-center';

    const index = appState.gameState.assignmentIndex;
    const isNarratorTurn = index >= appState.players.length;

    let targetName = isNarratorTurn ? "Narrator" : appState.players[index].name;

    // Title
    const title = document.createElement('h2');
    title.className = 'text-gold mb-1 text-center';
    title.innerText = `Pass the phone to ${targetName}`;
    div.appendChild(title);

    // Context message
    const desc = document.createElement('p');
    desc.className = 'text-center text-muted mb-2';
    desc.innerText = isNarratorTurn ? 'Hold to enter Narrator Dashboard' : 'Hold the button to reveal your secret role.';
    div.appendChild(desc);

    // The Reveal Container
    const revealBox = document.createElement('div');
    revealBox.className = 'reveal-box hidden';

    if (!isNarratorTurn) {
        const roleText = document.createElement('h1');
        roleText.className = 'reveal-role text-gold';
        roleText.innerText = appState.players[index].originalRole;

        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-primary mt-2';
        nextBtn.innerText = 'Next';
        nextBtn.onclick = () => {
            appState.gameState.assignmentIndex++;
            saveState();
            renderView(); // re-renders Assignment View for next player or Narrator
        };

        revealBox.appendChild(roleText);
        revealBox.appendChild(nextBtn);
    }

    // The Hold Button
    const holdBtnContainer = document.createElement('div');
    holdBtnContainer.className = 'hold-btn-container';

    const ring = document.createElement('div');
    ring.className = 'progress-ring';

    const holdBtn = document.createElement('button');
    holdBtn.className = 'btn-circle-gold';
    holdBtn.innerText = 'REVEAL';

    holdBtnContainer.appendChild(ring);
    holdBtnContainer.appendChild(holdBtn);

    let holdTimer = null;
    let holdDuration = 2000; // 2 seconds to reveal
    let startTime = 0;

    const startHold = (e) => {
        // Only prevent default on touch devices to avoid scrolling.
        // Preventing default on mousedown breaks standard mouse behavior on desktop.
        if (e.type === 'touchstart' && e.cancelable) e.preventDefault();

        // Prevent multiple simultaneous triggers
        if (holdTimer) return;

        holdBtn.classList.add('holding');
        ring.style.animation = `fillRing ${holdDuration}ms linear forwards`;

        startTime = Date.now();
        holdTimer = setTimeout(() => {
            endHold(e); // Cleanup active visual state immediately on success

            holdBtnContainer.classList.add('hidden');
            if (isNarratorTurn) {
                // Enter Gameplay
                appState.gameState.phase = PHASES.GAMEPLAY;
                saveState();
                renderView();
            } else {
                // Show reveal box
                revealBox.classList.remove('hidden');
                title.innerText = `Your role is:`;
                desc.classList.add('hidden');
            }
        }, holdDuration);
    };

    const endHold = (e) => {
        if (holdTimer) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
        holdBtn.classList.remove('holding');
        ring.style.animation = 'none';
        ring.offsetHeight; // trigger reflow
    };

    // Attach all handlers directly to the button, to avoid global window leaks
    holdBtn.addEventListener('mousedown', startHold);
    holdBtn.addEventListener('touchstart', startHold, { passive: false });

    // Cancellation events
    holdBtn.addEventListener('mouseup', endHold);
    holdBtn.addEventListener('mouseleave', endHold); // Ends if mouse drags off the button
    holdBtn.addEventListener('touchend', endHold);
    holdBtn.addEventListener('touchcancel', endHold);

    div.appendChild(holdBtnContainer);
    div.appendChild(revealBox);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn text-muted mt-2';
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.textDecoration = 'underline';
    cancelBtn.innerText = 'Cancel Session';
    cancelBtn.onclick = () => {
        if (confirm("Are you sure you want to cancel the session? Player setup will be kept.")) {
            appState.gameState = {
                phase: PHASES.SETUP,
                cycle: 1, // Reset to 1
                currentStep: 0,
                history: [],
                publicSummary: [],
                turnActions: { mafiaTargetId: null, ladyTargetId: null, doctorTargetId: null },
                winner: null
            };
            appState.gameState._scoreRecorded = false;

            appState.players.forEach(p => {
                p.currentRole = null;
                p.originalRole = null;
                p.isActive = true;
                p.eliminationType = null;
                p.effects = [];
            });
            saveState();
            renderView();
        }
    };
    div.appendChild(cancelBtn);

    return div;
}

// The order we want for active players:
const ROLE_ORDER = {
    [ROLES.MAFIA]: 1,
    [ROLES.LADY]: 2,
    [ROLES.POLICEMAN]: 3,
    [ROLES.DOCTOR]: 4,
    [ROLES.JOKER]: 5,
    [ROLES.CITIZEN]: 6
};

function createGameplayView() {
    const div = document.createElement('div');
    div.className = 'view gameplay-view';

    // Header
    const header = document.createElement('div');
    header.className = 'dashboard-header panel text-center';

    // Cycle and Step Name
    const cycleInfo = document.createElement('h2');
    cycleInfo.className = 'text-gold';
    cycleInfo.innerText = `Cycle ${appState.gameState.cycle}`;

    const stepNames = [
        "Step 1: Mafia",
        "Step 2: Lady",
        "Step 3: Policeman",
        "Step 4: Doctor",
        "Step 5: Joker",
        "Step 6: Resolve & Summary",
        "Step 8: Voting Phase" // Skip 7 visually, since 7 is just Details on 6
    ];
    // Map currentStep (0-8 range based on state machine)
    const stepLabel = document.createElement('h4');
    stepLabel.className = 'text-muted';
    stepLabel.innerText = getStepTitle(appState.gameState.currentStep);

    header.appendChild(cycleInfo);
    header.appendChild(stepLabel);
    div.appendChild(header);

    // Active Players Section
    const activeSection = document.createElement('div');
    activeSection.className = 'panel';
    const activeTitle = document.createElement('h3');
    activeTitle.innerText = "Active Players";
    activeTitle.className = "mb-1 text-gold";
    activeSection.appendChild(activeTitle);

    const activePlayers = appState.players.filter(p => p.isActive).sort((a, b) => {
        // Sort by role order, then by name
        const aOrder = ROLE_ORDER[a.currentRole] || 99;
        const bOrder = ROLE_ORDER[b.currentRole] || 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
    });

    const activeList = document.createElement('div');
    activeList.className = 'active-player-list';

    activePlayers.forEach(p => {
        const row = document.createElement('div');
        row.className = 'player-card active-card';

        let roleDisplay = p.currentRole;
        if (p.originalRole === ROLES.LADY && p.currentRole === ROLES.MAFIA) {
            roleDisplay = '<span class="text-danger">Lady (New Mafia)</span>';
        }

        let effectsDisplay = '';
        if (p.effects.includes('shushed')) effectsDisplay += '<span class="badge badge-warning">Shushed</span>';
        if (p.effects.includes('protected')) effectsDisplay += '<span class="badge badge-info">Protected</span>';

        row.innerHTML = `
            <div class="card-left">
                <strong>${p.name}</strong>
                <div class="text-muted text-sm">${roleDisplay}</div>
            </div>
            <div class="card-right">${effectsDisplay}</div>
        `;
        activeList.appendChild(row);
    });
    activeSection.appendChild(activeList);
    div.appendChild(activeSection);

    // Flow Controller (The Action Interface)
    const flowSection = document.createElement('div');
    flowSection.className = 'panel flow-panel';
    flowSection.appendChild(createStepInterface());
    div.appendChild(flowSection);

    // Inactive Players Section
    const inactivePlayers = appState.players.filter(p => !p.isActive);
    if (inactivePlayers.length > 0) {
        const inactiveSection = document.createElement('div');
        inactiveSection.className = 'panel';
        const inactiveTitle = document.createElement('h3');
        inactiveTitle.innerText = "Inactive Players";
        inactiveTitle.className = "mb-1 text-muted";
        inactiveSection.appendChild(inactiveTitle);

        inactivePlayers.forEach(p => {
            const row = document.createElement('div');
            row.className = 'player-card inactive-card';

            let statusBadge = p.eliminationType === 'killed'
                ? '<span class="badge badge-danger">Killed</span>'
                : '<span class="badge badge-warning">Voted Out</span>';

            let roleDisplay = p.currentRole;
            if (p.originalRole === ROLES.LADY && p.currentRole === ROLES.MAFIA) {
                roleDisplay = 'Lady (New Mafia)';
            }

            row.innerHTML = `
                <div class="card-left">
                    <strong class="text-muted" style="text-decoration: line-through;">${p.name}</strong>
                    <div class="text-muted text-sm">${roleDisplay}</div>
                </div>
                <div class="card-right">${statusBadge}</div>
            `;
            inactiveSection.appendChild(row);
        });
        div.appendChild(inactiveSection);
    }

    // End Session Button at the bottom
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary mt-2 w-100';
    cancelBtn.innerText = 'End Session (Return to Setup)';
    cancelBtn.onclick = () => {
        if (confirm("Are you sure you want to end this game early? Progress will be lost, but players will be kept.")) {
            appState.gameState = {
                phase: PHASES.SETUP,
                cycle: 1,
                currentStep: 0,
                history: [],
                publicSummary: [],
                turnActions: { mafiaTargetId: null, ladyTargetId: null, doctorTargetId: null },
                winner: null
            };
            appState.gameState._scoreRecorded = false;

            appState.players.forEach(p => {
                p.currentRole = null;
                p.originalRole = null;
                p.isActive = true;
                p.eliminationType = null;
                p.effects = [];
            });
            saveState();
            renderView();
        }
    };
    div.appendChild(cancelBtn);

    return div;
}

// Game Flow State Machine Steps
const STEP_IDS = {
    NIGHT_MAFIA: 0,
    NIGHT_LADY: 1,
    NIGHT_POLICEMAN: 2,
    NIGHT_DOCTOR: 3,
    NIGHT_JOKER: 4,
    NIGHT_RESOLVE: 5, // Shows public summary + narrator details
    DAY_VOTING: 6
};

function getStepTitle(stepId) {
    switch (stepId) {
        case STEP_IDS.NIGHT_MAFIA: return "Step 1: Mafia Step";
        case STEP_IDS.NIGHT_LADY: return "Step 2: Lady Step";
        case STEP_IDS.NIGHT_POLICEMAN: return "Step 3: Policeman Step";
        case STEP_IDS.NIGHT_DOCTOR: return "Step 4: Doctor Step";
        case STEP_IDS.NIGHT_JOKER: return "Step 5: Joker Step";
        case STEP_IDS.NIGHT_RESOLVE: return "Step 6: Resolve & Public Summary";
        case STEP_IDS.DAY_VOTING: return "Step 8: Voting Phase";
        default: return "Unknown Step";
    }
}

function createStepInterface() {
    const container = document.createElement('div');
    const stepId = appState.gameState.currentStep;

    // Check if step is skipped structurally (e.g. Lady disabled)
    if (stepId === STEP_IDS.NIGHT_LADY && !appState.settings.ladyEnabled) {
        handleNextStep();
        return container; // Skip immediately
    }
    if (stepId === STEP_IDS.NIGHT_JOKER && !appState.settings.jokerEnabled) {
        handleNextStep();
        return container;
    }

    const activePlayers = appState.players.filter(p => p.isActive);

    // Setup generic interface wrapper
    const promptQuote = document.createElement('h3');
    promptQuote.className = 'text-gold mb-1';

    const uiBox = document.createElement('div');
    uiBox.className = 'step-ui-box';

    let selectedTargetId = null;

    const buildSelector = (options, onChange) => {
        const select = document.createElement('select');
        select.className = 'input-field w-100 mb-1';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.innerText = "-- Select a Target --";
        select.appendChild(defaultOpt);

        options.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt.id;
            el.innerText = opt.label;
            el.disabled = !!opt.disabled;
            select.appendChild(el);
        });

        select.addEventListener('change', (e) => onChange(e.target.value));
        return select;
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary w-100 mt-2';
    confirmBtn.innerText = 'Confirm & Next';

    // Default next handler wrapper
    const doConfirm = () => {
        // Record action based on step
        if (stepId === STEP_IDS.NIGHT_MAFIA) {
            appState.gameState.turnActions.mafiaTargetId = selectedTargetId;
        } else if (stepId === STEP_IDS.NIGHT_LADY) {
            appState.gameState.turnActions.ladyTargetId = selectedTargetId;
            const target = appState.players.find(p => p.id === selectedTargetId);
            if (target && !target.effects.includes('shushed')) {
                target.effects.push('shushed');
            }
        } else if (stepId === STEP_IDS.NIGHT_DOCTOR) {
            appState.gameState.turnActions.doctorTargetId = selectedTargetId;
            const target = appState.players.find(p => p.id === selectedTargetId);
            if (target && !target.effects.includes('protected')) {
                target.effects.push('protected');
            }
        }

        handleNextStep();
    };

    // Build specific step UI
    if (stepId === STEP_IDS.NIGHT_MAFIA) {
        promptQuote.innerText = '"Mafia is waking up."';
        const actingMafia = activePlayers.find(p => p.currentRole === ROLES.MAFIA);
        const reminder = document.createElement('p');
        reminder.className = 'text-muted text-sm mb-1';
        reminder.innerText = `Acting Mafia: ${actingMafia ? actingMafia.name : 'None?'}`;
        uiBox.appendChild(reminder);

        const targets = activePlayers.filter(p => p.currentRole !== ROLES.LADY && p.currentRole !== ROLES.MAFIA).map(p => ({
            id: p.id,
            label: p.name
        }));

        confirmBtn.disabled = true;
        uiBox.appendChild(buildSelector(targets, (val) => {
            selectedTargetId = val;
            confirmBtn.disabled = !val;
        }));
        confirmBtn.onclick = doConfirm;

    } else if (stepId === STEP_IDS.NIGHT_LADY) {
        promptQuote.innerText = '"Lady is waking up."';
        const lady = appState.players.find(p => p.originalRole === ROLES.LADY);

        if (!lady || !lady.isActive || lady.currentRole === ROLES.MAFIA) {
            // Lady is dead or converted. Still show step, but no action allowed.
            const msg = document.createElement('p');
            msg.className = 'text-muted mb-1';
            msg.innerText = lady && !lady.isActive ? "Lady is no longer active." : "Lady has converted to Mafia.";
            uiBox.appendChild(msg);
            confirmBtn.innerText = 'Next';
            confirmBtn.onclick = handleNextStep;
        } else {
            const targets = activePlayers.map(p => ({ id: p.id, label: p.name }));
            confirmBtn.disabled = true;
            uiBox.appendChild(buildSelector(targets, (val) => {
                selectedTargetId = val;
                confirmBtn.disabled = !val;
            }));
            confirmBtn.onclick = doConfirm;
        }

    } else if (stepId === STEP_IDS.NIGHT_POLICEMAN) {
        promptQuote.innerText = '"Policeman is waking up."';
        const actingMafia = activePlayers.find(p => p.currentRole === ROLES.MAFIA);

        const reminder = document.createElement('div');
        reminder.innerHTML = `
            <p class="mb-1">Policeman points to a player in real life.</p>
            <p class="text-danger mb-1">Mafia is: <strong>${actingMafia ? actingMafia.name : 'Unknown'}</strong></p>
            <p class="text-muted">Confirm result by nodding yes/no in real life.</p>
        `;
        uiBox.appendChild(reminder);
        confirmBtn.innerText = 'Next';
        confirmBtn.onclick = handleNextStep;

    } else if (stepId === STEP_IDS.NIGHT_DOCTOR) {
        promptQuote.innerText = '"Doctor is waking up."';

        // Order targets: Doctor first, Policeman second, then rest
        const doctor = activePlayers.find(p => p.currentRole === ROLES.DOCTOR);
        const police = activePlayers.find(p => p.currentRole === ROLES.POLICEMAN);
        const others = activePlayers.filter(p => p.currentRole !== ROLES.DOCTOR && p.currentRole !== ROLES.POLICEMAN);

        let orderedActive = [];
        if (doctor) orderedActive.push(doctor);
        if (police) orderedActive.push(police);
        orderedActive = orderedActive.concat(others);

        const prevDocTarget = appState.gameState.history.length > 0
            ? appState.gameState.history[appState.gameState.history.length - 1].doctorTargetId
            : null;

        const targets = orderedActive.map(p => {
            const isSelf = p.currentRole === ROLES.DOCTOR;
            const selfProtectedLastTime = isSelf && (p.id === prevDocTarget);
            let label = p.name;
            if (isSelf) label += ' (Self)';
            if (selfProtectedLastTime) label += ' - Cannot protect twice in a row';

            return {
                id: p.id,
                label: label,
                disabled: selfProtectedLastTime
            };
        });

        confirmBtn.disabled = true;
        uiBox.appendChild(buildSelector(targets, (val) => {
            selectedTargetId = val;
            confirmBtn.disabled = !val;
        }));
        confirmBtn.onclick = doConfirm;

    } else if (stepId === STEP_IDS.NIGHT_JOKER) {
        promptQuote.innerText = '"Joker is waking up."';
        const msg = document.createElement('p');
        msg.className = 'text-muted mb-1';
        msg.innerText = "No action required in the app.";
        uiBox.appendChild(msg);
        confirmBtn.innerText = 'Next';
        confirmBtn.onclick = handleNextStep;

    } else if (stepId === STEP_IDS.NIGHT_RESOLVE) {
        promptQuote.innerText = '"The Night is Over."';

        // --- Resolution Logic ---
        // We only want to process the resolution once when entering this step.
        // To avoid re-processing on re-render, we do it inline and saveState immediately,
        // but guard it so it only runs once per cycle.

        // Use a simple guard property on turnActions
        if (!appState.gameState.turnActions._resolved) {
            const actions = appState.gameState.turnActions;
            const summaryLines = [];
            const detailLines = [];

            // 1. Shush (Lady)
            if (actions.ladyTargetId) {
                const target = appState.players.find(p => p.id === actions.ladyTargetId);
                if (target) {
                    summaryLines.push(`${target.name} is shushed.`);
                    const ladyPlayer = appState.players.find(p => p.originalRole === ROLES.LADY);
                    detailLines.push(`Lady (${ladyPlayer ? ladyPlayer.name : '?'}) shushed: ${target.name}`);
                }
            }

            // 2. Protect (Doctor)
            if (actions.doctorTargetId) {
                const target = appState.players.find(p => p.id === actions.doctorTargetId);
                if (target) {
                    const docPlayer = appState.players.find(p => p.currentRole === ROLES.DOCTOR);
                    detailLines.push(`Doctor (${docPlayer ? docPlayer.name : '?'}) protected: ${target.name}`);
                }
            }

            // 3. Kill (Mafia)
            if (actions.mafiaTargetId) {
                const target = appState.players.find(p => p.id === actions.mafiaTargetId);
                if (target) {
                    const actingMafia = appState.players.find(p => p.currentRole === ROLES.MAFIA);
                    detailLines.push(`Mafia (${actingMafia ? actingMafia.name : '?'}) targeted: ${target.name}`);

                    if (actions.doctorTargetId === actions.mafiaTargetId) {
                        // Protected!
                        summaryLines.push(`There was an attempted murder, but nobody died.`);
                        detailLines.push(`-> Attempted murder (target: ${target.name})`);
                    } else {
                        // Dead
                        target.isActive = false;
                        target.eliminationType = 'killed';
                        summaryLines.push(`${target.name} was killed.`);
                        detailLines.push(`-> ${target.name} died.`);
                    }
                }
            }

            if (summaryLines.length === 0) {
                summaryLines.push("It was a quiet night.");
            }

            // Save history
            appState.gameState.history.push({
                cycle: appState.gameState.cycle,
                doctorTargetId: actions.doctorTargetId,
                details: detailLines
            });

            appState.gameState.publicSummary = summaryLines;
            appState.gameState.turnActions._resolved = true;
            saveState();

            // Check win condition instantly in case someone died
            if (checkWinConditions()) {
                return renderView(); // Exit immediately to end screen
            }
        } // end guard

        // Render Summary
        const summaryBox = document.createElement('div');
        summaryBox.className = 'panel';
        summaryBox.style.background = 'rgba(212, 175, 55, 0.1)';
        summaryBox.style.border = '1px solid var(--clr-gold-main)';
        summaryBox.innerHTML = `
            <h4 class="text-gold mb-1">Public Summary (Read Aloud)</h4>
            <ul style="padding-left: 20px;" class="mb-1">
                ${appState.gameState.publicSummary.map(l => `<li>${l}</li>`).join('')}
            </ul>
        `;
        uiBox.appendChild(summaryBox);

        // Render Internal Details
        const currentDetails = appState.gameState.history.find(h => h.cycle === appState.gameState.cycle)?.details || [];
        const detailBox = document.createElement('div');
        detailBox.className = 'panel';
        detailBox.innerHTML = `
            <h4 class="text-muted mb-1">Narrator Details (Private)</h4>
            <ul style="padding-left: 20px;" class="text-muted text-sm">
                ${currentDetails.length > 0 ? currentDetails.map(l => `<li>${l}</li>`).join('') : '<li>No actions.</li>'}
            </ul>
        `;
        uiBox.appendChild(detailBox);

        confirmBtn.innerText = 'Next Phase (Day)';
        confirmBtn.onclick = handleNextStep;

    } else if (stepId === STEP_IDS.DAY_VOTING) {
        promptQuote.innerText = '"Voting Phase"';

        const info = document.createElement('p');
        info.className = 'text-muted mb-1';
        info.innerText = "Discuss and optionally vote out one player.";
        uiBox.appendChild(info);

        const targets = activePlayers.map(p => {
            // Shushed players cannot vote, but they CAN be voted out. 
            // We just list them for narrator to mark who gets the boot.
            let tag = p.effects.includes('shushed') ? ' (Shushed)' : '';
            return { id: p.id, label: p.name + tag };
        });

        uiBox.appendChild(buildSelector(targets, (val) => {
            selectedTargetId = val;
        }));

        confirmBtn.innerText = 'Vote Out Target';
        confirmBtn.onclick = () => {
            if (!selectedTargetId) {
                alert("Please select a target first, or click Skip.");
                return;
            }

            const target = appState.players.find(p => p.id === selectedTargetId);
            if (confirm(`Are you sure you want to vote out ${target.name}?`)) {
                target.isActive = false;
                target.eliminationType = 'votedOut';

                // Joker Win Check
                if (target.currentRole === ROLES.JOKER) {
                    checkWinConditions(true); // Force check where joker won
                    return renderView();
                }

                // Lady Takeover Check
                if (target.currentRole === ROLES.MAFIA) {
                    const lady = appState.players.find(p => p.currentRole === ROLES.LADY && p.isActive);
                    if (lady) {
                        lady.currentRole = ROLES.MAFIA; // Transform
                        lady.originalRole = ROLES.LADY; // keep reference
                        alert(`Mafia is eliminated! Lady (${lady.name}) has taken over as the new Mafia.`);
                    }
                }

                if (checkWinConditions()) return renderView();
                handleNextStep();
            }
        };

        const skipBtn = document.createElement('button');
        skipBtn.className = 'btn btn-secondary w-100 mt-2';
        skipBtn.innerText = 'Skip Voting (No one dies)';
        skipBtn.onclick = handleNextStep;

        uiBox.appendChild(skipBtn);

    } else {
        // Fallback
        uiBox.innerHTML = `<p class="text-center text-muted">Action UI for ${getStepTitle(stepId)}</p>`;
        confirmBtn.onclick = handleNextStep;
    }

    container.appendChild(promptQuote);
    container.appendChild(uiBox);
    container.appendChild(confirmBtn);
    return container;
}

// Logic to check win states
function checkWinConditions(forceJokerWin = false) {
    let winFaction = null;

    if (forceJokerWin) {
        winFaction = 'Joker';
    } else {
        const activePlayers = appState.players.filter(p => p.isActive);
        const mafiaAlive = activePlayers.some(p => p.currentRole === ROLES.MAFIA);
        const ladyAlive = activePlayers.some(p => p.currentRole === ROLES.LADY);

        // Check Town Win: Mafia voted out AND Lady voted out (Lady cannot be killed at night)
        if (!mafiaAlive && !ladyAlive) {
            winFaction = 'Town';
        } else {
            // Check Mafia Win: Mafia + Lady + Exactly 1 other active player
            // Or generally: If the number of non-(mafia/lady) players is <= total mafia/lady players.
            // In simpler terms: if only 1 citizen-aligned (doctor/police/etc) is left against mafia/lady, mafia wins.
            const evilCount = activePlayers.filter(p => p.currentRole === ROLES.MAFIA || p.currentRole === ROLES.LADY).length;
            const goodCount = activePlayers.length - evilCount;

            // Based on requirements: "if only one non-(mafia/lady) active player remains, mafia side wins"
            if (goodCount <= 1 && evilCount > 0) {
                winFaction = 'Mafia';
            }
        }
    }

    if (winFaction) {
        appState.gameState.winner = winFaction;
        appState.gameState.phase = PHASES.END;

        // Update Scoreboard once per game win
        if (!appState.gameState._scoreRecorded) {
            appState.scoreboard[winFaction] = (appState.scoreboard[winFaction] || 0) + 1;
            appState.gameState._scoreRecorded = true;
        }

        saveState();
        return true;
    }

    return false;
}

function handleNextStep() {
    let nextStep = appState.gameState.currentStep + 1;

    // Skip optional disabled roles
    if (nextStep === STEP_IDS.NIGHT_LADY && !appState.settings.ladyEnabled) nextStep++;
    // Policeman always ON, Doctor always ON
    if (nextStep === STEP_IDS.NIGHT_JOKER && !appState.settings.jokerEnabled) nextStep++;

    appState.gameState.currentStep = nextStep;

    // If we transition past Voting, wrap back to Night Setup
    // AND clear yesterday's temporary effects so they don't show up tonight!
    if (appState.gameState.currentStep > STEP_IDS.DAY_VOTING) {
        appState.gameState.currentStep = 0;
        appState.gameState.cycle++;
        appState.gameState.turnActions = {
            mafiaTargetId: null,
            ladyTargetId: null,
            doctorTargetId: null
        };

        // Clear all temporary effects
        appState.players.forEach(p => {
            if (p.isActive) p.effects = [];
        });
    }

    saveState();
    renderView();
}

function createEndView() {
    const div = document.createElement('div');
    div.className = 'view end-view flex-center text-center';

    const banner = document.createElement('div');
    banner.className = 'panel w-100 mt-2 mb-2';

    const winnerText = document.createElement('h1');
    winnerText.className = 'text-gold';
    winnerText.style.fontSize = '3rem';
    winnerText.style.margin = '20px 0';
    winnerText.innerText = `${appState.gameState.winner} Wins!`;
    banner.appendChild(winnerText);
    div.appendChild(banner);

    const scorePanel = document.createElement('div');
    scorePanel.className = 'panel w-100 mb-2';
    scorePanel.innerHTML = `
        <h3 class="mb-1">Scoreboard</h3>
        <div class="score-row flex" style="display:flex; justify-content:space-between; margin-bottom: 8px;">
            <span class="text-gold">Town:</span>
            <strong>${appState.scoreboard.Town || 0}</strong>
        </div>
        <div class="score-row flex" style="display:flex; justify-content:space-between; margin-bottom: 8px;">
            <span class="text-danger">Mafia:</span>
            <strong>${appState.scoreboard.Mafia || 0}</strong>
        </div>
        <div class="score-row flex" style="display:flex; justify-content:space-between; margin-bottom: 8px;">
            <span class="text-muted">Joker:</span>
            <strong>${appState.scoreboard.Joker || 0}</strong>
        </div>
    `;
    div.appendChild(scorePanel);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-primary w-100 mb-1';
    nextBtn.innerText = 'Next Session (Keep Players)';
    nextBtn.onclick = () => {
        // Reset game state but keep players and settings
        appState.gameState = {
            phase: PHASES.SETUP,
            cycle: 1,
            currentStep: 0,
            history: [],
            publicSummary: [],
            turnActions: { mafiaTargetId: null, ladyTargetId: null, doctorTargetId: null },
            winner: null
        };
        saveState();
        renderView();
    };
    div.appendChild(nextBtn);

    const endBtn = document.createElement('button');
    endBtn.className = 'btn btn-secondary w-100';
    endBtn.innerText = 'End Game (Reset All)';
    endBtn.onclick = () => {
        if (confirm("This will clear all players and scores. Are you sure?")) {
            appState = JSON.parse(JSON.stringify(defaultState));
            saveState();
            renderView();
        }
    };
    div.appendChild(endBtn);

    return div;
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
    renderView();
});
