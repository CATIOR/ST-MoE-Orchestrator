/**
 * SillyTavern Mixture of Experts (MoE) Orchestrator
 * by CATIOR — vibe-coded with Claude Opus
 */

const MODULE_NAME = 'moe_orchestrator';
const VERSION = '1.0.0';
const DEFAULT_MERGE_PROMPT = `{{char}} is a vivid third-person omniscient narrator who directs all characters into one flowing scene.

{{char}} works like a film editor: the other characters have already performed their parts. {{char}}'s job is to interleave their dialogue, actions, and reactions into one cohesive narrative. {{char}} keeps each character's actual dialogue and distinctive moments — cutting lines is unacceptable.

{{char}} fiercely preserves each character's unique voice — harsh characters stay harsh, timid characters stay timid, quirky characters stay quirky. When quoting dialogue, use the character's exact words — never paraphrase or summarize what they said. {{char}} adds only the connective tissue needed: transitions, reaction beats, and cross-character awareness.

Never narrate or rewrite {{user}}'s actions — they are already established.

{{char}} continues from where {{char}} last left off. The other characters' messages since {{char}}'s last response are their individual performances of the current scene.

{{char}} never breaks the fourth wall.`;

let settings = {
    enabled: false,
    orchestratorChar: '',
    injectSystemPrompt: true,
    customMergePrompt: DEFAULT_MERGE_PROMPT
};

let isMoEActive = false;
const GROUP_ACTIVATION_MANUAL = 2; // group_activation_strategy.MANUAL in ST

// --- UI ---

function getSettingsHtml() {
    return `
        <div class="moe-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>MoE Orchestrator v${VERSION}</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="moe-info">
                        Triggers all group members (experts) sequentially, then the Orchestrator merges their outputs.
                        <br><br>
                        <strong>⚠️</strong> Group must be in <strong>Manual</strong> activation mode.
                    </div>

                    <div class="moe-option">
                        <input type="checkbox" id="moe_enabled" ${settings.enabled ? 'checked' : ''}>
                        <label for="moe_enabled">Enable MoE Sequence</label>
                    </div>

                    <div style="margin-top: 10px;">
                        <label for="moe_orchestrator_select">Orchestrator Character:</label>
                        <select id="moe_orchestrator_select">
                            <option value="">(None)</option>
                        </select>
                    </div>

                    <hr style="border-color: var(--SmartThemeBorderColor); margin: 12px 0;">

                    <div class="moe-option">
                        <input type="checkbox" id="moe_inject_prompt" ${settings.injectSystemPrompt ? 'checked' : ''}>
                        <label for="moe_inject_prompt">Inject merge prompt before Orchestrator</label>
                    </div>

                    <div id="moe_prompt_container" style="margin-top: 8px; ${settings.injectSystemPrompt ? '' : 'display:none;'}">
                        <label for="moe_custom_prompt" style="font-size: 0.85em;">Merge instruction (injected as system prompt):</label>
                        <textarea id="moe_custom_prompt" rows="4" style="width:100%; margin-top:4px; padding:6px; background:var(--SmartThemeBlurTintColor); color:var(--SmartThemeBodyColor); border:1px solid var(--SmartThemeBorderColor); border-radius:4px; resize:vertical; font-size:0.9em;">${settings.customMergePrompt}</textarea>
                        <div style="text-align:right; margin-top:4px;">
                            <span id="moe_reset_prompt" style="cursor:pointer; font-size:0.8em; opacity:0.7; text-decoration:underline;">Reset to default</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateOrchestratorDropdown() {
    const select = document.getElementById('moe_orchestrator_select');
    if (!select) return;

    const currentVal = settings.orchestratorChar;
    let options = '<option value="">(None)</option>';
    const context = SillyTavern.getContext();

    if (context.characters && Array.isArray(context.characters)) {
        context.characters.forEach(char => {
            if (char && char.name) {
                const selected = (currentVal === char.name) ? 'selected' : '';
                options += `<option value="${char.name}" ${selected}>${char.name}</option>`;
            }
        });
    }

    select.innerHTML = options;
}

function addSettingsUI() {
    const container = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.id = 'moe_settings_container';
    wrapper.innerHTML = getSettingsHtml();
    container.appendChild(wrapper);

    updateOrchestratorDropdown();

    // --- Event Listeners ---

    document.getElementById('moe_enabled').addEventListener('change', (e) => {
        settings.enabled = e.target.checked;
        saveSettings();
    });

    document.getElementById('moe_orchestrator_select').addEventListener('change', (e) => {
        settings.orchestratorChar = e.target.value;
        saveSettings();
    });

    document.getElementById('moe_inject_prompt').addEventListener('change', (e) => {
        settings.injectSystemPrompt = e.target.checked;
        // Show/hide the prompt textarea
        const promptContainer = document.getElementById('moe_prompt_container');
        if (promptContainer) {
            promptContainer.style.display = e.target.checked ? '' : 'none';
        }
        saveSettings();
    });

    document.getElementById('moe_custom_prompt').addEventListener('input', (e) => {
        settings.customMergePrompt = e.target.value;
        saveSettings();
    });

    document.getElementById('moe_reset_prompt').addEventListener('click', () => {
        settings.customMergePrompt = DEFAULT_MERGE_PROMPT;
        const textarea = document.getElementById('moe_custom_prompt');
        if (textarea) textarea.value = DEFAULT_MERGE_PROMPT;
        saveSettings();
    });
}

// --- Settings Persistence ---

function saveSettings() {
    const context = SillyTavern.getContext();
    context.extensionSettings[MODULE_NAME] = settings;
    context.saveSettingsDebounced();
}

function loadSettings() {
    const context = SillyTavern.getContext();
    if (context.extensionSettings && context.extensionSettings[MODULE_NAME]) {
        settings = Object.assign(settings, context.extensionSettings[MODULE_NAME]);
    }
    // Ensure customMergePrompt always has a value
    if (!settings.customMergePrompt) {
        settings.customMergePrompt = DEFAULT_MERGE_PROMPT;
    }
}

// --- Utility ---

function quoteName(name) {
    return name.includes(' ') ? `"${name}"` : name;
}

// --- MoE Core Logic ---

async function runMoESequence() {
    if (!settings.enabled || isMoEActive) return;

    const context = SillyTavern.getContext();

    // Only run in Group Chats
    if (!context.groupId) {
        console.log('[MoE] Not in a group chat, skipping.');
        return;
    }

    const group = context.groups.find(g => g.id === context.groupId);
    if (!group || !Array.isArray(group.members)) {
        console.log('[MoE] Could not find the active group data.');
        return;
    }

    // Guard: require Manual activation mode
    if (group.activation_strategy !== GROUP_ACTIVATION_MANUAL) {
        toastr.error(
            'MoE requires the group to be in <b>Manual</b> activation mode.<br>Group Settings → Response Order → <b>Manual</b>.',
            'MoE — Wrong Mode',
            { timeOut: 8000, escapeHtml: false }
        );
        return;
    }

    // Get active member names
    const disabledAvatars = group.disabled_members || [];
    const charNames = [...new Set(
        group.members
            .filter(avatar => !disabledAvatars.includes(avatar))
            .map(avatar => context.characters.find(c => c.avatar === avatar)?.name)
            .filter(Boolean)
    )];

    if (charNames.length < 2) {
        console.log('[MoE] Not enough active group members.');
        return;
    }

    if (!settings.orchestratorChar) {
        toastr.warning('No Orchestrator character selected!', 'MoE');
        return;
    }

    if (!charNames.includes(settings.orchestratorChar)) {
        toastr.warning(`Orchestrator "${settings.orchestratorChar}" is not in this group chat!`, 'MoE');
        return;
    }

    const experts = charNames.filter(name => name !== settings.orchestratorChar);

    if (experts.length === 0) {
        console.log('[MoE] No experts found (only the orchestrator is in the group).');
        return;
    }

    console.log(`[MoE] Starting sequence — Experts: [${experts.join(', ')}], Orchestrator: ${settings.orchestratorChar}`);
    isMoEActive = true;

    try {
        const { executeSlashCommandsWithOptions } = context;
        const INJECT_ID = 'moe_merge_prompt';
        const slashOpts = { handleExecutionErrors: true, handleParserErrors: true };

        // Step 1: Trigger each Expert sequentially
        for (const expertName of experts) {
            console.log(`[MoE] → Expert: ${expertName}`);
            await executeSlashCommandsWithOptions(`/trigger await=true ${quoteName(expertName)}`, slashOpts);
            await new Promise(r => setTimeout(r, 500));
        }

        // Step 2: Inject merge prompt (if enabled)
        if (settings.injectSystemPrompt && settings.customMergePrompt) {
            console.log('[MoE] Injecting merge prompt...');
            await executeSlashCommandsWithOptions(
                `/inject id="${INJECT_ID}" position=after depth=0 role=system ephemeral=true ${settings.customMergePrompt}`,
                slashOpts
            );
            await new Promise(r => setTimeout(r, 200));
        }

        // Step 3: Trigger Orchestrator
        console.log(`[MoE] → Orchestrator: ${settings.orchestratorChar}`);
        await executeSlashCommandsWithOptions(`/trigger await=true ${quoteName(settings.orchestratorChar)}`, slashOpts);

        console.log('[MoE] ✓ Sequence complete.');

    } catch (err) {
        console.error('[MoE] Sequence failed:', err);
        toastr.error('MoE sequence failed. Check the browser console for details.', 'MoE Error');
    } finally {
        isMoEActive = false;
    }
}

// --- Init ---

async function init() {
    const context = SillyTavern.getContext();
    loadSettings();
    addSettingsUI();

    // MESSAGE_SENT fires only for user messages — prevents infinite recursion
    context.eventSource.on(context.eventTypes.MESSAGE_SENT, async () => {
        if (settings.enabled && !isMoEActive) {
            console.log('[MoE] User message detected, starting sequence...');
            setTimeout(() => runMoESequence(), 1000);
        }
    });

    // Refresh dropdown on chat/group changes
    context.eventSource.on(context.eventTypes.CHAT_CHANGED, updateOrchestratorDropdown);
    context.eventSource.on(context.eventTypes.GROUP_UPDATED, updateOrchestratorDropdown);

    console.log(`[MoE] Orchestrator v${VERSION} initialized.`);
}

if (typeof jQuery !== 'undefined') {
    jQuery(init);
} else {
    window.addEventListener('DOMContentLoaded', init);
}
