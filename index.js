// ============================================================================
// ============================================================================
// SillyTavern Extension - Aspect: Evolutia                  created by Genisai
// ============================================================================
// ============================================================================

// ============================================================================
// Section 1. Imports
// ============================================================================
// Owns all external dependencies used by this extension file.
// Keep this section limited to import statements only.
// ============================================================================

import { getContext as importedGetContext } from '../../../extensions.js';
import { promptManager } from '../../../openai.js';
import { MacrosParser } from '../../../macros.js';

// ============================================================================
// Section 2. Module Constants and State
// ============================================================================
// Purpose:
// - Own stable identifiers, default settings, UI element IDs, and runtime state.
// - Other components may read these constants and maps for consistent behavior.
// ============================================================================

const MODULE_NAME = 'st-description-swap-fields';
const FIELD_PURPOSE_PLACEHOLDER = '{field_purpose}';
const LEGACY_FIELD_INSTRUCTION = 'The following is defining information about this character, specifically regarding';
const DEFAULT_FIELD_INSTRUCTION = `${LEGACY_FIELD_INSTRUCTION} ${FIELD_PURPOSE_PLACEHOLDER}:`;

const ASPECT_PROMPT_ID = 'aspectEvolutiaDescription';
const ASPECT_PROMPT_NAME = 'Aspect: Evolutia Description';
const ASPECT_MACRO_NAME = 'aspectEvolutiaDescription';
const ASPECT_MACRO_TEXT = `{{${ASPECT_MACRO_NAME}}}`;
const NATIVE_DESCRIPTION_PROMPT_ID = 'charDescription';

const KEYWORD_MODE = Object.freeze({
    ANY: 'any',
    ALL: 'all',
});

const IMPORT_SOURCE = Object.freeze({
    CHARACTER_CARD: 'character_card',
    NATIVE_FIELDS: 'native_fields',
    FILE_JSON: 'file_json',
    CLIPBOARD_JSON: 'clipboard_json',
});

const EXPORT_TARGET = Object.freeze({
    FILE_JSON: 'file_json',
    CLIPBOARD_JSON: 'clipboard_json',
});

const NATIVE_IMPORT_HEADINGS = new Set([
    'appearance',
    'backstory',
    'background',
    'personality',
    'scenario',
    'relationships',
    'relationship',
    'knowledge',
    'abilities',
    'ability',
    'powers',
    'power',
    'combat style',
    'inventory',
    'stats',
    'attributes',
    'rules',
    'behavior',
    'behaviour',
]);

const UI = Object.freeze({
    STYLE_ID: 'dsf_style',
    BAR_ID: 'dsf_swap_bar',
    PANEL_ID: 'dsf_panel',
    BOTTOM_ACTIONS_ID: 'dsf_bottom_actions',
    TOKEN_ROW_ID: 'dsf_token_row',
    SWAP_ID: 'dsf_swap_enabled',
    DELETE_ALL_TOP_ID: 'dsf_delete_all_fields_top',
    ADD_TOP_ID: 'dsf_add_field_top',
    ADD_BOTTOM_ID: 'dsf_add_field_bottom',
    IMPORT_ID: 'dsf_import',
    IMPORT_MENU_ID: 'dsf_import_menu',
    EXPORT_ID: 'dsf_export',
    EXPORT_MENU_ID: 'dsf_export_menu',
    CHARACTER_CARD_IMPORT_FILE_ID: 'dsf_character_card_import_file',
    DYNAMIC_FIELDS_IMPORT_FILE_ID: 'dsf_dynamic_fields_import_file',
    WI_SCAN_ID: 'dsf_allow_wi_scan',
    WI_SCAN_WRAP_ID: 'dsf_wi_scan_wrap',
    TOKEN_ID: 'dsf_token_estimate',
    SETTINGS_ID: 'dsf_extension_settings',
    SETTINGS_VERSION_ID: 'dsf_settings_version',
    SETTINGS_AUTHOR_ID: 'dsf_settings_author',
    SETTINGS_REMOVE_FIELDS_ID: 'dsf_remove_all_fields',
    SETTINGS_REMOVE_CURRENT_FIELDS_ID: 'dsf_remove_current_fields',
    SETTINGS_RESET_EXTENSION_ID: 'dsf_reset_extension',
});

const DEFAULT_STATE = Object.freeze({
    swapEnabled: false,
    allowWorldInfoScan: false,
    initializedDefaults: false,
    fields: [],
});

const DEFAULT_MANIFEST_META = Object.freeze({
    version: '0.0.0',
    author: 'Genisai',
});

const STANDARD_TOKEN_COUNTER_SELECTORS = [
    '#result_info',
    '#result_info_total',
    '#result_info_permanent',
    '#character_tokens',
    '#character_token_counter',
    '#char_token_counter',
    '.result_info',
    '.tokenCounterDisplay',
    '.character_tokens',
    '.character-token-counter',
    '.char-token-counter',
    '.tokens_total',
    '.tokens_permanent',
    '[data-token-counter]',
    '[data-testid="character-token-counter"]',
];

let booted = false;
let saveTimer = null;
let mountTimer = null;
let currentGenerationCharacterId = undefined;
let tokenUpdateSerial = 0;
let manifestMeta = { ...DEFAULT_MANIFEST_META };
let fieldPointerDrag = null;
let fieldDragAutoScrollFrame = null;

const FIELD_DRAG_AUTOSCROLL_MARGIN = 80;
const FIELD_DRAG_AUTOSCROLL_MAX_SPEED = 22;

const stateCache = new Map();
const descriptionBackups = new Map();

// ============================================================================
// Section 3. Shared Utilities
// ============================================================================
// Purpose:
// - Own generic helpers used across components.
// - Other components may call these helpers for cloning, IDs, escaping, and notices.
// ============================================================================

// -----------------------------------------------------------------------------
// Shared Utilities - General Helpers
// -----------------------------------------------------------------------------

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(Object(obj), key);
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function makeId() {
    return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function notify(type, message) {
    if (globalThis.toastr?.[type]) {
        globalThis.toastr[type](message);
        return;
    }

    const method = type === 'error' ? 'error' : 'log';
    console[method](`[${MODULE_NAME}] ${message}`);
}

function getAuthorName(author) {
    if (typeof author === 'string') {
        return author;
    }

    if (Array.isArray(author)) {
        return author
            .map((entry) => getAuthorName(entry))
            .filter(Boolean)
            .join(', ');
    }

    if (author && typeof author === 'object') {
        return String(author.name || author.author || author.display_name || '').trim();
    }

    return '';
}

function sanitizeFilename(value) {
    return String(value || 'character')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120) || 'character';
}

function titleCase(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeHeadingKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function splitLinesForJson(value) {
    const text = String(value ?? '');

    if (!text) {
        return [];
    }

    return text.replace(/\r\n/g, '\n').split('\n');
}

function joinLinesFromJson(value) {
    if (Array.isArray(value)) {
        return value.map((line) => String(line ?? '')).join('\n');
    }

    return String(value ?? '');
}

function getPositionInputWidth(value) {
    const text = String(value ?? '').trim();
    const characterCount = Math.max(1, text.length || 1);

    return `${Math.max(2, Math.ceil(characterCount * 1.5))}ch`;
}

function syncPositionInputWidth(input) {
    if (!input) {
        return;
    }

    input.style.width = getPositionInputWidth(input.value);
}

// -----------------------------------------------------------------------------
// Shared Utilities - HTML Escaping
// -----------------------------------------------------------------------------

function escapeAttribute(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function escapeTextarea(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

// -----------------------------------------------------------------------------
// Shared Utilities - File and Clipboard Helpers
// -----------------------------------------------------------------------------

function downloadJsonFile(filename, payload) {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
}

async function copyTextToClipboard(text) {
    if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard write is unavailable.');
    }

    await navigator.clipboard.writeText(text);
}

async function readTextFromClipboard() {
    if (!navigator.clipboard?.readText) {
        throw new Error('Clipboard read is unavailable.');
    }

    return navigator.clipboard.readText();
}

// ============================================================================
// Section 4. SillyTavern Context and Character Access
// ============================================================================
// Purpose:
// - Own safe access to SillyTavern context, active character IDs, and characters.
// - Other components may call this to read the currently selected character.
// ============================================================================

// -----------------------------------------------------------------------------
// SillyTavern Context and Character Access - Context Resolution
// -----------------------------------------------------------------------------

function getContext() {
    return globalThis.SillyTavern?.getContext?.() ?? importedGetContext();
}

// -----------------------------------------------------------------------------
// SillyTavern Context and Character Access - Character Resolution
// -----------------------------------------------------------------------------

function getActiveCharacterId() {
    const ctx = getContext();
    const id = ctx?.characterId;

    if (id === undefined || id === null || id === '') {
        return undefined;
    }

    return id;
}

function normalizeCharacterId(characterId) {
    const text = String(characterId);

    if (/^\d+$/.test(text)) {
        return Number(text);
    }

    return characterId;
}

function getGenerationCharacterId(options = {}) {
    const forced = options?.force_chid;

    if (forced !== undefined && forced !== null && forced !== '') {
        return normalizeCharacterId(forced);
    }

    return getActiveCharacterId();
}

function getMacroCharacterId() {
    if (currentGenerationCharacterId !== undefined && currentGenerationCharacterId !== null && currentGenerationCharacterId !== '') {
        return currentGenerationCharacterId;
    }

    return getActiveCharacterId();
}

function getCharacter(characterId = getActiveCharacterId()) {
    const ctx = getContext();

    if (characterId === undefined || characterId === null || characterId === '') {
        return null;
    }

    return ctx?.characters?.[characterId] ?? null;
}

function getCharacterName(characterId = getMacroCharacterId()) {
    const character = getCharacter(characterId);
    return String(character?.name ?? character?.data?.name ?? 'this character').trim() || 'this character';
}

function getCacheKey(characterId = getActiveCharacterId()) {
    return characterId === undefined || characterId === null ? '__none__' : String(characterId);
}

function getNativeDescriptionForCharacter(character) {
    return String(character?.description ?? character?.data?.description ?? '').trim();
}

function getNativePersonalityForCharacter(character) {
    return String(character?.personality ?? character?.data?.personality ?? '').trim();
}

// -----------------------------------------------------------------------------
// SillyTavern Context and Character Access - Character Collections
// -----------------------------------------------------------------------------

function getAllCharacterIds() {
    const ctx = getContext();
    const characters = ctx?.characters;

    if (!characters || typeof characters !== 'object') {
        return [];
    }

    return Object.entries(characters)
        .filter(([, character]) => Boolean(character))
        .map(([rawCharacterId]) => normalizeCharacterId(rawCharacterId));
}

function getCurrentGroupId() {
    const ctx = getContext();
    const groupId = ctx?.groupId ?? ctx?.selected_group ?? ctx?.selectedGroup;

    if (groupId === undefined || groupId === null || groupId === '') {
        return undefined;
    }

    return groupId;
}

function isCurrentGroupChatOpen() {
    return getCurrentGroupId() !== undefined;
}

function getCurrentGroup() {
    const ctx = getContext();
    const groupId = getCurrentGroupId();

    if (groupId === undefined) {
        return null;
    }

    const groups = Array.isArray(ctx?.groups)
        ? ctx.groups
        : Object.values(ctx?.groups || {});

    return groups.find((group) => {
        const possibleIds = [
            group?.id,
            group?._id,
            group?.groupId,
            group?.group_id,
            group?.name,
        ].map((value) => String(value ?? ''));

        return possibleIds.includes(String(groupId));
    }) ?? null;
}

function getGroupMemberReferences(group) {
    if (!group || typeof group !== 'object') {
        return [];
    }

    if (Array.isArray(group.members)) {
        return group.members;
    }

    if (Array.isArray(group.characters)) {
        return group.characters;
    }

    if (Array.isArray(group.charIds)) {
        return group.charIds;
    }

    if (Array.isArray(group.characterIds)) {
        return group.characterIds;
    }

    return [];
}

function findCharacterIdForMemberReference(memberReference) {
    const ctx = getContext();
    const characters = ctx?.characters;

    if (!characters || typeof characters !== 'object') {
        return undefined;
    }

    if (memberReference === undefined || memberReference === null || memberReference === '') {
        return undefined;
    }

    if (typeof memberReference === 'number' && characters[memberReference]) {
        return memberReference;
    }

    if (typeof memberReference === 'string' && /^\d+$/.test(memberReference) && characters[Number(memberReference)]) {
        return Number(memberReference);
    }

    if (typeof memberReference === 'object') {
        const nestedCandidates = [
            memberReference.id,
            memberReference._id,
            memberReference.characterId,
            memberReference.chid,
            memberReference.index,
            memberReference.avatar,
            memberReference.name,
            memberReference.filename,
            memberReference.file_name,
            memberReference.item?.id,
            memberReference.item?.avatar,
            memberReference.item?.name,
        ];

        for (const candidate of nestedCandidates) {
            const characterId = findCharacterIdForMemberReference(candidate);

            if (characterId !== undefined) {
                return characterId;
            }
        }

        return undefined;
    }

    const target = String(memberReference).trim().toLowerCase();

    if (!target) {
        return undefined;
    }

    for (const [rawCharacterId, character] of Object.entries(characters)) {
        if (!character) {
            continue;
        }

        const possibleValues = [
            character.avatar,
            character.name,
            character.filename,
            character.file_name,
            character.data?.name,
            character.data?.avatar,
            character.data?.filename,
            character.data?.extensions?.filename,
        ]
            .map((value) => String(value ?? '').trim().toLowerCase())
            .filter(Boolean);

        if (possibleValues.includes(target)) {
            return normalizeCharacterId(rawCharacterId);
        }
    }

    return undefined;
}

function getCurrentChatCharacterIds() {
    const ctx = getContext();

    if (isCurrentGroupChatOpen()) {
        const group = getCurrentGroup();
        const memberReferences = getGroupMemberReferences(group);

        return [
            ...new Set(
                memberReferences
                    .map((memberReference) => findCharacterIdForMemberReference(memberReference))
                    .filter((characterId) => characterId !== undefined),
            ),
        ];
    }

    const characterId = ctx?.characterId;

    if (characterId === undefined || characterId === null || characterId === '') {
        return [];
    }

    return [normalizeCharacterId(characterId)];
}

function getCurrentCharactersButtonLabel() {
    return isCurrentGroupChatOpen()
        ? 'Remove All Fields for Current Characters'
        : 'Remove All Fields for Current Character';
}

// ============================================================================
// Section 5. Field and State Model
// ============================================================================
// Purpose:
// - Own normalization of saved extension data into predictable runtime objects.
// - Other components may call this before reading or persisting state.
// ============================================================================

// -----------------------------------------------------------------------------
// Field and State Model - Field Normalization
// -----------------------------------------------------------------------------

function createDefaultFields() {
    return [
        normalizeField({
            name: 'Background',
            purpose: 'Background',
            instruction: DEFAULT_FIELD_INSTRUCTION,
            exposeInstruction: false,
            keywords: '',
            keywordMode: KEYWORD_MODE.ALL,
            content: '',
            enabled: true,
        }),
        normalizeField({
            name: 'Personality',
            purpose: 'Personality',
            instruction: DEFAULT_FIELD_INSTRUCTION,
            exposeInstruction: false,
            keywords: '',
            keywordMode: KEYWORD_MODE.ALL,
            content: '',
            enabled: true,
        }),
        normalizeField({
            name: 'Appearance',
            purpose: 'Appearance',
            instruction: DEFAULT_FIELD_INSTRUCTION,
            exposeInstruction: false,
            keywords: '',
            keywordMode: KEYWORD_MODE.ALL,
            content: '',
            enabled: true,
        }),
    ];
}

function createOutOfBoxState() {
    return normalizeState({
        swapEnabled: false,
        allowWorldInfoScan: false,
        initializedDefaults: true,
        fields: createDefaultFields(),
    });
}

function createEmptyFieldsState(characterId = getActiveCharacterId()) {
    const state = readState(characterId);

    state.initializedDefaults = true;
    state.fields = [];

    return normalizeState(state);
}

function normalizeInstruction(rawInstruction) {
    const instruction = String(rawInstruction ?? DEFAULT_FIELD_INSTRUCTION).trim();

    if (!instruction || instruction === LEGACY_FIELD_INSTRUCTION) {
        return DEFAULT_FIELD_INSTRUCTION;
    }

    return instruction;
}

function normalizeKeywordMode(rawMode) {
    return rawMode === KEYWORD_MODE.ANY ? KEYWORD_MODE.ANY : KEYWORD_MODE.ALL;
}

function normalizeField(field = {}) {
    return {
        id: typeof field.id === 'string' && field.id.trim() ? field.id : makeId(),
        enabled: field.enabled !== false,
        name: String(field.name ?? ''),
        purpose: String(field.purpose ?? ''),
        instruction: normalizeInstruction(field.instruction),
        exposeInstruction: Boolean(field.exposeInstruction),
        keywords: String(field.keywords ?? ''),
        keywordMode: normalizeKeywordMode(field.keywordMode),
        content: String(field.content ?? ''),
    };
}

// -----------------------------------------------------------------------------
// Field and State Model - State Normalization
// -----------------------------------------------------------------------------

function normalizeState(rawState = {}) {
    const source = rawState && typeof rawState === 'object' ? rawState : {};
    const hasSavedFields = Array.isArray(source.fields);
    const initializedDefaults = Boolean(source.initializedDefaults);

    let fields = hasSavedFields
        ? source.fields.map(normalizeField)
        : createDefaultFields();

    if (!initializedDefaults && fields.length === 0) {
        fields = createDefaultFields();
    }

    return {
        ...clone(DEFAULT_STATE),
        swapEnabled: Boolean(source.swapEnabled),
        allowWorldInfoScan: Boolean(source.allowWorldInfoScan),
        initializedDefaults: true,
        fields,
    };
}

function findField(state, fieldId) {
    return state.fields.find((field) => field.id === fieldId);
}

function getUniqueFieldName(existingFields, requestedName) {
    const baseName = String(requestedName || 'Imported Field').trim() || 'Imported Field';
    const existingNames = new Set(existingFields.map((field) => String(field.name || '').trim().toLowerCase()));

    if (!existingNames.has(baseName.toLowerCase())) {
        return baseName;
    }

    let counter = 2;

    while (existingNames.has(`${baseName} ${counter}`.toLowerCase())) {
        counter += 1;
    }

    return `${baseName} ${counter}`;
}

function prepareImportedFields(fields, existingFields = []) {
    const result = [];
    const nameContext = [...existingFields];

    for (const rawField of fields) {
        const normalized = normalizeField({
            ...rawField,
            id: makeId(),
            enabled: rawField?.enabled !== false,
            keywordMode: normalizeKeywordMode(rawField?.keywordMode),
        });

        normalized.name = getUniqueFieldName(nameContext, normalized.name);
        normalized.purpose = normalized.purpose.trim() || normalized.name;
        nameContext.push(normalized);
        result.push(normalized);
    }

    return result;
}

// -----------------------------------------------------------------------------
// Field and State Model - Clean Import / Export Conversion
// -----------------------------------------------------------------------------

function exportFieldForJson(field, index = 0) {
    const normalized = normalizeField(field);

    return {
        order: index + 1,
        name: normalized.name,
        purpose: normalized.purpose,
        inject: normalized.enabled,
        keywordMode: normalized.keywordMode,
        keywords: splitKeywords(normalized.keywords),
        instruction: splitLinesForJson(normalized.instruction),
        revealInstruction: normalized.exposeInstruction,
        content: splitLinesForJson(normalized.content),
    };
}

function importFieldFromJson(field = {}) {
    const enabled = hasOwn(field, 'inject')
        ? Boolean(field.inject)
        : field.enabled !== false;

    return normalizeField({
        id: makeId(),
        enabled,
        name: String(field.name ?? ''),
        purpose: String(field.purpose ?? field.name ?? ''),
        instruction: joinLinesFromJson(field.instruction || DEFAULT_FIELD_INSTRUCTION),
        exposeInstruction: Boolean(field.revealInstruction ?? field.exposeInstruction),
        keywords: Array.isArray(field.keywords)
            ? field.keywords.map((keyword) => String(keyword ?? '')).join('\n')
            : String(field.keywords ?? ''),
        keywordMode: normalizeKeywordMode(field.keywordMode),
        content: joinLinesFromJson(field.content),
    });
}

// -----------------------------------------------------------------------------
// Field and State Model - State Status Checks
// -----------------------------------------------------------------------------

function areFieldsRemovedForCharacter(characterId) {
    const state = readState(characterId);
    return state.fields.length === 0;
}

function areFieldsRemovedForCharacters(characterIds) {
    return characterIds.length > 0 && characterIds.every((characterId) => areFieldsRemovedForCharacter(characterId));
}

function getComparableField(field) {
    const normalized = normalizeField(field);

    return {
        enabled: normalized.enabled,
        name: normalized.name,
        purpose: normalized.purpose,
        instruction: normalized.instruction,
        exposeInstruction: normalized.exposeInstruction,
        keywords: normalized.keywords,
        keywordMode: normalized.keywordMode,
        content: normalized.content,
    };
}

function areFieldsOutOfBox(fields) {
    const normalizedFields = Array.isArray(fields)
        ? fields.map(normalizeField)
        : [];

    const defaultFields = createDefaultFields();

    if (normalizedFields.length !== defaultFields.length) {
        return false;
    }

    return normalizedFields.every((field, index) => {
        const actual = getComparableField(field);
        const expected = getComparableField(defaultFields[index]);

        return JSON.stringify(actual) === JSON.stringify(expected);
    });
}

function isStateOutOfBox(state) {
    const normalized = normalizeState(state);

    return (
        normalized.swapEnabled === false &&
        normalized.allowWorldInfoScan === false &&
        areFieldsOutOfBox(normalized.fields)
    );
}

function isCharacterOutOfBox(characterId) {
    return isStateOutOfBox(readState(characterId));
}

function areCharactersOutOfBox(characterIds) {
    return characterIds.length > 0 && characterIds.every((characterId) => isCharacterOutOfBox(characterId));
}

// ============================================================================
// Section 6. Character Extension Persistence
// ============================================================================
// Purpose:
// - Own reading, caching, and saving per-character Aspect: Exolutia data.
// - Other components may call readState/updateState to mutate extension settings.
// ============================================================================

// -----------------------------------------------------------------------------
// Character Extension Persistence - Read and Cache
// -----------------------------------------------------------------------------

function readState(characterId = getActiveCharacterId()) {
    const key = getCacheKey(characterId);

    if (stateCache.has(key)) {
        return clone(stateCache.get(key));
    }

    const character = getCharacter(characterId);
    const rawState = character?.data?.extensions?.[MODULE_NAME];
    const state = normalizeState(rawState);

    stateCache.set(key, state);
    return clone(state);
}

function cacheState(characterId, state) {
    const normalized = normalizeState(state);
    stateCache.set(getCacheKey(characterId), normalized);
    return clone(normalized);
}

// -----------------------------------------------------------------------------
// Character Extension Persistence - Save
// -----------------------------------------------------------------------------

async function saveStateNow(characterId, state) {
    const ctx = getContext();

    if (characterId === undefined || characterId === null || characterId === '') {
        return;
    }

    if (typeof ctx?.writeExtensionField !== 'function') {
        notify('error', 'writeExtensionField is unavailable in this SillyTavern build.');
        return;
    }

    try {
        await ctx.writeExtensionField(characterId, MODULE_NAME, normalizeState(state));
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to save character extension data:`, error);
        notify('error', 'Failed to save Aspect: Exolutia fields.');
    }
}

function scheduleSave(characterId, state) {
    const normalized = cacheState(characterId, state);

    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveStateNow(characterId, normalized);
    }, 400);
}

function updateState(mutator, { rerender = false, syncPromptManager = false } = {}) {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before editing Dynamic Fields.');
        return;
    }

    const state = readState(characterId);
    mutator(state);
    scheduleSave(characterId, state);

    if (rerender) {
        renderPanel();
    } else {
        applyUiVisibility();
    }

    if (syncPromptManager) {
        syncPromptManagerForState(state);
    }

    updateTokenEstimate();
    updateSettingsActionState();
}

// ============================================================================
// Section 7. Current Input Tracking
// ============================================================================
// Purpose:
// - Own current unsent user-input capture for keyword trigger matching.
// - Other components may call buildScanText to evaluate current-input triggers.
// ============================================================================

// -----------------------------------------------------------------------------
// Last User Message Tracking - Message Text Extraction
// -----------------------------------------------------------------------------

function getChatMessageText(message) {
    if (!message || typeof message !== 'object') {
        return '';
    }

    const candidates = [
        message.mes,
        message.message,
        message.content,
        message.text,
        message.msg,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }

    return '';
}

function isUserChatMessage(message) {
    if (!message || typeof message !== 'object') {
        return false;
    }

    if (message.is_system || message.system || message.is_narrator) {
        return false;
    }

    if (message.is_user === true) {
        return true;
    }

    if (String(message.role || '').toLowerCase() === 'user') {
        return true;
    }

    const ctx = getContext();
    const userName = String(ctx?.name1 || '').trim();

    if (userName && String(message.name || '').trim() === userName) {
        return true;
    }

    return false;
}

function getLastUserMessageText() {
    const ctx = getContext();
    const chat = Array.isArray(ctx?.chat) ? ctx.chat : [];

    for (let index = chat.length - 1; index >= 0; index -= 1) {
        const message = chat[index];

        if (!isUserChatMessage(message)) {
            continue;
        }

        const text = getChatMessageText(message);

        if (text) {
            return text;
        }
    }

    return '';
}

// -----------------------------------------------------------------------------
// Last User Message Tracking - Trigger Text
// -----------------------------------------------------------------------------

function buildScanText() {
    return getLastUserMessageText().toLowerCase();
}

// ============================================================================
// Section 8. Dynamic Field Matching and Prompt Assembly
// ============================================================================
// Purpose:
// - Own keyword matching, active field selection, and replacement prompt text.
// - Other components may call buildReplacementPrompt before generation or tokens.
// ============================================================================

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Keyword Matching
// -----------------------------------------------------------------------------

function splitKeywords(rawKeywords) {
    return String(rawKeywords || '')
        .split(/\r?\n|[,;]/g)
        .map((keyword) => keyword.trim())
        .filter(Boolean);
}

function fieldMatches(field, scanText) {
    const normalized = normalizeField(field);

    if (!normalized.enabled) {
        return false;
    }

    if (!normalized.content.trim()) {
        return false;
    }

    const keywords = splitKeywords(normalized.keywords);

    if (keywords.length === 0) {
        return true;
    }

    const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase());

    if (normalized.keywordMode === KEYWORD_MODE.ALL) {
        return loweredKeywords.every((keyword) => scanText.includes(keyword));
    }

    return loweredKeywords.some((keyword) => scanText.includes(keyword));
}

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Prompt Formatting
// -----------------------------------------------------------------------------

function resolveFieldInstruction(field) {
    const normalized = normalizeField(field);
    const purpose = normalized.purpose.trim() || normalized.name.trim() || 'this field';
    const instruction = normalizeInstruction(normalized.instruction);

    if (instruction.includes(FIELD_PURPOSE_PLACEHOLDER)) {
        return instruction.replaceAll(FIELD_PURPOSE_PLACEHOLDER, purpose);
    }

    return instruction;
}

function formatFieldForPrompt(field) {
    const normalized = normalizeField(field);
    const name = normalized.name.trim() || 'Unnamed Dynamic Field';
    const content = normalized.content.trim();

    return [
        `[DEFINITION: ${name}]`,
        resolveFieldInstruction(normalized),
        content,
        `[END DEFINITION: ${name}]`,
    ].join('\n');
}

function wrapDynamicFieldsPrompt(characterId, fieldText) {
    const characterName = getCharacterName(characterId);

    return [
        `[CHARACTER DEFINITIONS]`,
        `These definitions apply only to ${characterName}.`,
        '',
        fieldText,
        '',
        `[END CHARACTER DEFINITIONS: ${characterName}]`,
    ].join('\n');
}

function buildReplacementPrompt(characterId = getActiveCharacterId()) {
    const state = readState(characterId);

    if (!state.swapEnabled) {
        return '';
    }

    const scanText = buildScanText();
    const activeFields = state.fields.filter((field) => fieldMatches(field, scanText));

    if (!activeFields.length) {
        return '';
    }

    return wrapDynamicFieldsPrompt(
        characterId,
        activeFields.map(formatFieldForPrompt).join('\n\n'),
    );
}

function buildAspectEvolutiaMacroValue() {
    const characterId = getMacroCharacterId();
    const character = getCharacter(characterId);

    if (!character) {
        return '';
    }

    const state = readState(characterId);

    if (!state.swapEnabled) {
        return getNativeDescriptionForCharacter(character);
    }

    return buildReplacementPrompt(characterId);
}

// ============================================================================
// Section 9. Prompt Manager Integration
// ============================================================================
// Purpose:
// - Own the custom Prompt Manager prompt and macro used as Description replacement.
// - Dynamic Fields toggles may call this to switch between native Description and Aspect.
// - This section must NOT mutate SillyTavern's native Description field.
// ============================================================================

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Macro Registration
// -----------------------------------------------------------------------------

function registerAspectMacro() {
    try {
        MacrosParser.registerMacro(
            ASPECT_MACRO_NAME,
            () => buildAspectEvolutiaMacroValue(),
            'Aspect: Evolutia effective character Description. Returns Dynamic Fields when enabled, otherwise the native Description.',
        );
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to register macro:`, error);
        notify('error', 'Failed to register Aspect: Evolutia macro.');
    }
}

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Prompt Manager Access
// -----------------------------------------------------------------------------

function getPromptManagerInstance() {
    if (!promptManager || !promptManager.serviceSettings) {
        return null;
    }

    return promptManager;
}

function getPromptManagerTargetCharacter(manager = getPromptManagerInstance()) {
    if (!manager) {
        return null;
    }

    if (manager.activeCharacter) {
        return manager.activeCharacter;
    }

    if (manager.configuration?.promptOrder?.strategy === 'global') {
        return { id: manager.configuration.promptOrder.dummyId };
    }

    return null;
}

function getPromptOrder(manager = getPromptManagerInstance()) {
    const targetCharacter = getPromptManagerTargetCharacter(manager);

    if (!manager || !targetCharacter || typeof manager.getPromptOrderForCharacter !== 'function') {
        return [];
    }

    return manager.getPromptOrderForCharacter(targetCharacter);
}

function getPromptOrderEntryById(order, identifier) {
    return order.find((entry) => entry?.identifier === identifier) ?? null;
}

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Prompt Creation and Toggling
// -----------------------------------------------------------------------------

function ensureAspectPromptExists(manager) {
    const existingPrompt = manager.getPromptById?.(ASPECT_PROMPT_ID);

    const promptData = {
        name: ASPECT_PROMPT_NAME,
        role: 'system',
        content: ASPECT_MACRO_TEXT,
        system_prompt: false,
        marker: false,
        extension: true,
        injection_position: 0,
        injection_depth: 4,
        forbid_overrides: false,
    };

    if (existingPrompt) {
        Object.assign(existingPrompt, promptData);
        return existingPrompt;
    }

    manager.addPrompt(promptData, ASPECT_PROMPT_ID);
    return manager.getPromptById?.(ASPECT_PROMPT_ID);
}

function ensureAspectPromptOrderEntry(manager) {
    const order = getPromptOrder(manager);

    if (!order.length) {
        return null;
    }

    const existingAspectIndex = order.findIndex((entry) => entry?.identifier === ASPECT_PROMPT_ID);

    if (existingAspectIndex >= 0) {
        return order[existingAspectIndex];
    }

    const nativeIndex = order.findIndex((entry) => entry?.identifier === NATIVE_DESCRIPTION_PROMPT_ID);
    const personaIndex = order.findIndex((entry) => entry?.identifier === 'personaDescription');

    const insertIndex = nativeIndex >= 0
        ? nativeIndex
        : personaIndex >= 0
            ? personaIndex + 1
            : 0;

    const aspectEntry = {
        identifier: ASPECT_PROMPT_ID,
        enabled: false,
    };

    order.splice(insertIndex, 0, aspectEntry);
    return aspectEntry;
}

async function saveAndRenderPromptManager(manager) {
    if (typeof manager.saveServiceSettings === 'function') {
        await manager.saveServiceSettings();
    }

    if (typeof manager.render === 'function') {
        manager.render(false);
    }
}

async function syncPromptManagerForState(state) {
    const manager = getPromptManagerInstance();

    if (!manager) {
        notify('warning', 'Prompt Manager is unavailable. Dynamic Fields saved, but prompt toggles could not be synchronized.');
        return;
    }

    try {
        ensureAspectPromptExists(manager);

        const order = getPromptOrder(manager);

        if (!order.length) {
            notify('warning', 'Prompt Manager order is unavailable. Open Chat Completion Presets and try again.');
            return;
        }

        const aspectEntry = ensureAspectPromptOrderEntry(manager);
        const nativeEntry = getPromptOrderEntryById(order, NATIVE_DESCRIPTION_PROMPT_ID);

        if (!aspectEntry) {
            notify('warning', 'Could not create Aspect: Evolutia Prompt Manager entry.');
            return;
        }

        if (state.swapEnabled) {
            aspectEntry.enabled = true;

            if (nativeEntry) {
                nativeEntry.enabled = false;
            }
        } else {
            aspectEntry.enabled = false;

            if (nativeEntry) {
                nativeEntry.enabled = true;
            }
        }

        await saveAndRenderPromptManager(manager);
        updateSettingsActionState();
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to synchronize Prompt Manager:`, error);
        notify('error', 'Failed to synchronize Aspect: Evolutia with Prompt Manager.');
    }
}

async function syncPromptManagerWithActiveState() {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        return;
    }

    const state = readState(characterId);
    await syncPromptManagerForState(state);
}

// ============================================================================
// Section 10. Description Safety Cleanup
// ============================================================================
// Purpose:
// - Own cleanup for legacy in-memory Description suppression backups.
// - Generation flow may call this defensively if older runtime state exists.
// - This section must NOT suppress or overwrite Description anymore.
// ============================================================================

// -----------------------------------------------------------------------------
// Description Safety Cleanup - Restore Legacy Backups
// -----------------------------------------------------------------------------

function restoreSuppressedDescriptions() {
    const ctx = getContext();

    for (const [key, backup] of descriptionBackups.entries()) {
        const character = ctx?.characters?.[backup.characterId];

        if (!character) {
            descriptionBackups.delete(key);
            continue;
        }

        if (backup.hadTopDescription) {
            character.description = backup.topDescription;
        } else {
            delete character.description;
        }

        if (backup.hadData) {
            if (!character.data || typeof character.data !== 'object') {
                character.data = {};
            }

            if (backup.hadDataDescription) {
                character.data.description = backup.dataDescription;
            } else {
                delete character.data.description;
            }
        } else {
            delete character.data;
        }

        descriptionBackups.delete(key);
    }
}

// ============================================================================
// Section 11. Dynamic Token Estimate
// ============================================================================
// Purpose:
// - Own the local Dynamic Fields token badge shown when Dynamic Fields are active.
// - UI and input handlers may call this after field/input changes.
// ============================================================================

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Calculation
// -----------------------------------------------------------------------------

async function getDynamicTokenCount(characterId = getActiveCharacterId()) {
    const ctx = getContext();
    const prompt = buildReplacementPrompt(characterId);

    if (!prompt) {
        return 0;
    }

    if (typeof ctx?.getTokenCountAsync !== 'function') {
        return null;
    }

    return ctx.getTokenCountAsync(prompt, 0);
}

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Rendering
// -----------------------------------------------------------------------------

async function updateTokenEstimate() {
    const characterId = getActiveCharacterId();
    const state = readState(characterId);
    const $token = $(`#${UI.TOKEN_ID}`);

    if (!$token.length) {
        return;
    }

    if (!state.swapEnabled) {
        $token.text('');
        return;
    }

    const serial = ++tokenUpdateSerial;
    $token.text('Tokens: …');

    try {
        const count = await getDynamicTokenCount(characterId);

        if (serial !== tokenUpdateSerial) {
            return;
        }

        if (count === null) {
            $token.text('Tokens: unavailable');
            return;
        }

        $token.text(`Tokens: ${count}`);
    } catch (error) {
        if (serial !== tokenUpdateSerial) {
            return;
        }

        console.warn(`[${MODULE_NAME}] Failed to estimate Dynamic Fields tokens:`, error);
        $token.text('Tokens: unavailable');
    }
}

// ============================================================================
// Section 12. Import / Export
// ============================================================================
// Purpose:
// - Own Import and Export menu actions for Dynamic Fields.
// - This section must NOT alter native Description or native Personality.
// ============================================================================

// -----------------------------------------------------------------------------
// Import / Export - Dynamic Field Payload Handling
// -----------------------------------------------------------------------------

function buildDynamicFieldsExportPayload(characterId = getActiveCharacterId()) {
    const state = readState(characterId);

    return {
        fields: state.fields.map(exportFieldForJson),
    };
}

function getFieldsFromDynamicFieldsPayload(payload) {
    const source = typeof payload === 'string' ? JSON.parse(payload) : payload;

    if (Array.isArray(source)) {
        return source.map(importFieldFromJson);
    }

    if (!source || typeof source !== 'object') {
        return [];
    }

    if (Array.isArray(source.fields)) {
        return source.fields.map(importFieldFromJson);
    }

    const extensionState =
        source?.data?.extensions?.[MODULE_NAME] ??
        source?.extensions?.[MODULE_NAME] ??
        source?.character?.data?.extensions?.[MODULE_NAME];

    if (extensionState?.fields && Array.isArray(extensionState.fields)) {
        return extensionState.fields.map(importFieldFromJson);
    }

    return [];
}

function appendImportedFieldsToActiveCharacter(fields, successMessage) {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before importing Dynamic Fields.');
        return;
    }

    const normalizedFields = Array.isArray(fields)
        ? fields.map(normalizeField).filter((field) => field.content.trim() || field.name.trim())
        : [];

    if (!normalizedFields.length) {
        notify('warning', 'No Dynamic Fields were found to import.');
        return;
    }

    updateState((state) => {
        const importedFields = prepareImportedFields(normalizedFields, state.fields);
        state.fields.push(...importedFields);
    }, { rerender: true });

    notify('success', successMessage || `Imported ${normalizedFields.length} Dynamic Field(s).`);
}

// -----------------------------------------------------------------------------
// Import / Export - Native Description / Personality Import
// -----------------------------------------------------------------------------

function isLikelyNativeImportHeadingName(candidate, isStrongSyntax = false) {
    const text = String(candidate || '').trim();

    if (!text || text.length > 60) {
        return false;
    }

    if (/[.!?]$/.test(text)) {
        return false;
    }

    if (!/^[A-Za-z0-9][A-Za-z0-9\s/&'’()_-]*$/.test(text)) {
        return false;
    }

    const key = normalizeHeadingKey(text);

    if (NATIVE_IMPORT_HEADINGS.has(key)) {
        return true;
    }

    const wordCount = key.split(/\s+/).filter(Boolean).length;

    return isStrongSyntax && wordCount >= 1 && wordCount <= 5;
}

function parseNativeHeadingLine(line) {
    const text = String(line || '').trim();

    if (!text) {
        return null;
    }

    let match = text.match(/^#{1,6}\s+(.+?)\s*$/);

    if (match && isLikelyNativeImportHeadingName(match[1], true)) {
        return titleCase(match[1]);
    }

    match = text.match(/^\[\s*([^\[\]]{1,60})\s*\]$/);

    if (match && isLikelyNativeImportHeadingName(match[1], true)) {
        return titleCase(match[1]);
    }

    match = text.match(/^<\s*([^<>]{1,60})\s*>$/);

    if (match && isLikelyNativeImportHeadingName(match[1], true)) {
        return titleCase(match[1]);
    }

    match = text.match(/^([A-Za-z0-9][A-Za-z0-9\s/&'’()_-]{0,59})\s*(?::|-|—)\s*$/);

    if (match && isLikelyNativeImportHeadingName(match[1], false)) {
        return titleCase(match[1]);
    }

    return null;
}

function parseHeaderedNativeSections(text) {
    const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
    const sections = [];
    let currentSection = null;

    for (const line of lines) {
        const heading = parseNativeHeadingLine(line);

        if (heading) {
            if (currentSection) {
                const content = currentSection.contentLines.join('\n').trim();

                if (content) {
                    sections.push({
                        name: currentSection.name,
                        content,
                    });
                }
            }

            currentSection = {
                name: heading,
                contentLines: [],
            };

            continue;
        }

        if (currentSection) {
            currentSection.contentLines.push(line);
        }
    }

    if (currentSection) {
        const content = currentSection.contentLines.join('\n').trim();

        if (content) {
            sections.push({
                name: currentSection.name,
                content,
            });
        }
    }

    return sections;
}

function createFieldFromNativeImport(name, content) {
    return normalizeField({
        name,
        purpose: name,
        instruction: DEFAULT_FIELD_INSTRUCTION,
        exposeInstruction: false,
        keywords: '',
        keywordMode: KEYWORD_MODE.ALL,
        content,
        enabled: true,
    });
}

function buildNativeFieldImportsFromCharacter(character) {
    const description = getNativeDescriptionForCharacter(character);
    const personality = getNativePersonalityForCharacter(character);
    const importedFields = [];

    if (description) {
        const descriptionSections = parseHeaderedNativeSections(description);
        const shouldSkipDescriptionPersonality = Boolean(personality.trim());

        if (descriptionSections.length) {
            for (const section of descriptionSections) {
                if (shouldSkipDescriptionPersonality && normalizeHeadingKey(section.name) === 'personality') {
                    continue;
                }

                importedFields.push(createFieldFromNativeImport(section.name, section.content));
            }
        } else {
            importedFields.push(createFieldFromNativeImport('Background', description));
        }
    }

    if (personality) {
        importedFields.push(createFieldFromNativeImport('Personality', personality));
    }

    return importedFields;
}

// -----------------------------------------------------------------------------
// Import / Export - Import Actions
// -----------------------------------------------------------------------------

function importDynamicFieldsFromCharacterCardFile() {
    $(`#${UI.CHARACTER_CARD_IMPORT_FILE_ID}`).val('').trigger('click');
}

function importDynamicFieldsFromFileJson() {
    $(`#${UI.DYNAMIC_FIELDS_IMPORT_FILE_ID}`).val('').trigger('click');
}

async function handleCharacterCardImportFileSelected(event) {
    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const fields = getFieldsFromDynamicFieldsPayload(payload);

        appendImportedFieldsToActiveCharacter(fields, `Imported ${fields.length} Dynamic Field(s) from character card.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to import character card Dynamic Fields:`, error);
        notify('error', 'Failed to import Dynamic Fields from character card JSON.');
    } finally {
        $(`#${UI.CHARACTER_CARD_IMPORT_FILE_ID}`).val('');
    }
}

async function handleDynamicFieldsImportFileSelected(event) {
    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const fields = getFieldsFromDynamicFieldsPayload(payload);

        appendImportedFieldsToActiveCharacter(fields, `Imported ${fields.length} Dynamic Field(s) from JSON file.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to import Dynamic Fields JSON file:`, error);
        notify('error', 'Failed to import Dynamic Fields from JSON file.');
    } finally {
        $(`#${UI.DYNAMIC_FIELDS_IMPORT_FILE_ID}`).val('');
    }
}

function importDynamicFieldsFromNativeFields() {
    const characterId = getActiveCharacterId();
    const character = getCharacter(characterId);

    if (!character) {
        notify('warning', 'Select a character before importing native fields.');
        return;
    }

    const importedFields = buildNativeFieldImportsFromCharacter(character);

    appendImportedFieldsToActiveCharacter(
        importedFields,
        `Imported ${importedFields.length} Dynamic Field(s) from native fields.`,
    );
}

async function importDynamicFieldsFromClipboardJson() {
    try {
        const text = await readTextFromClipboard();
        const fields = getFieldsFromDynamicFieldsPayload(text);

        appendImportedFieldsToActiveCharacter(fields, `Imported ${fields.length} Dynamic Field(s) from clipboard JSON.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to import clipboard Dynamic Fields:`, error);
        notify('error', 'Failed to import Dynamic Fields from clipboard JSON.');
    }
}

// -----------------------------------------------------------------------------
// Import / Export - Export Actions
// -----------------------------------------------------------------------------

function exportDynamicFieldsToFileJson() {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before exporting Dynamic Fields.');
        return;
    }

    const characterName = getCharacterName(characterId);
    const payload = buildDynamicFieldsExportPayload(characterId);

    downloadJsonFile(`${sanitizeFilename(characterName)}_aspect_evolutia_dynamic_fields.json`, payload);
    notify('success', 'Exported Dynamic Fields JSON file.');
}

async function exportDynamicFieldsToClipboardJson() {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before copying Dynamic Fields.');
        return;
    }

    try {
        const payload = buildDynamicFieldsExportPayload(characterId);
        await copyTextToClipboard(JSON.stringify(payload, null, 2));
        notify('success', 'Copied Dynamic Fields JSON to clipboard.');
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to copy Dynamic Fields JSON:`, error);
        notify('error', 'Failed to copy Dynamic Fields JSON to clipboard.');
    }
}

// ============================================================================
// Section 12A. Extensions Drawer Settings
// ============================================================================
// Purpose:
// - Own the Aspect: Evolutia settings drawer in SillyTavern's Extensions tab.
// - Settings controls may reset or remove Dynamic Fields data.
// - This section must NOT own character-card field editor rendering.
// ============================================================================

// -----------------------------------------------------------------------------
// Extensions Drawer Settings - Manifest Metadata
// -----------------------------------------------------------------------------

async function loadManifestMetadata() {
    try {
        const manifestUrl = new URL('./manifest.json', import.meta.url);
        const response = await fetch(manifestUrl);

        if (!response.ok) {
            throw new Error(`Manifest request failed: ${response.status}`);
        }

        const manifest = await response.json();
        const version = String(manifest.version || DEFAULT_MANIFEST_META.version).trim();
        const author = getAuthorName(manifest.author).trim() || DEFAULT_MANIFEST_META.author;

        manifestMeta = {
            version,
            author,
        };

        renderSettingsFooter();
    } catch (error) {
        console.warn(`[${MODULE_NAME}] Failed to load manifest metadata:`, error);

        manifestMeta = {
            ...DEFAULT_MANIFEST_META,
        };

        renderSettingsFooter();
    }
}

// -----------------------------------------------------------------------------
// Extensions Drawer Settings - Actions
// -----------------------------------------------------------------------------

async function removeAllFieldsForAllCharacters() {
    const characterIds = getAllCharacterIds();

    if (!characterIds.length) {
        notify('warning', 'No character cards were found in Character Management.');
        updateSettingsActionState();
        return;
    }

    if (areFieldsRemovedForCharacters(characterIds)) {
        notify('info', 'All Dynamic Fields are already removed from every character card.');
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        'Remove all Dynamic Fields from all character cards in Character Management?\n\n' +
        'This keeps each character’s Dynamic Fields toggle and WI Scan setting as they are, but removes every Dynamic Field from every character card.',
    );

    if (!confirmed) {
        return;
    }

    for (const characterId of characterIds) {
        const nextState = createEmptyFieldsState(characterId);

        cacheState(characterId, nextState);
        await saveStateNow(characterId, nextState);
    }

    stateCache.clear();
    restoreSuppressedDescriptions();

    renderPanel();
    applyUiVisibility();
    updateTokenEstimate();
    updateSettingsActionState();

    notify('success', `Removed all Dynamic Fields from ${characterIds.length} character card(s).`);
}

async function removeAllFieldsForCurrentChatCharacters() {
    const characterIds = getCurrentChatCharacterIds();
    const isGroup = isCurrentGroupChatOpen();

    if (!characterIds.length) {
        notify('warning', 'Open a character or group chat before removing current Dynamic Fields.');
        updateSettingsActionState();
        return;
    }

    if (areFieldsRemovedForCharacters(characterIds)) {
        notify(
            'info',
            isGroup
                ? 'All Dynamic Fields are already removed from the current characters.'
                : 'All Dynamic Fields are already removed from the current character.',
        );
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        isGroup
            ? 'Remove all Dynamic Fields from every character in the currently open group chat?\n\nThis keeps each character’s Dynamic Fields toggle and WI Scan setting as they are.'
            : 'Remove all Dynamic Fields from the character in the currently open chat?\n\nThis keeps the character’s Dynamic Fields toggle and WI Scan setting as they are.',
    );

    if (!confirmed) {
        return;
    }

    for (const characterId of characterIds) {
        const nextState = createEmptyFieldsState(characterId);

        cacheState(characterId, nextState);
        await saveStateNow(characterId, nextState);
    }

    stateCache.clear();

    renderPanel();
    applyUiVisibility();
    updateTokenEstimate();
    updateSettingsActionState();

    notify(
        'success',
        isGroup
            ? `Removed all Dynamic Fields from ${characterIds.length} current character(s).`
            : 'Removed all Dynamic Fields from the current character.',
    );
}

async function resetAllCharactersToOutOfBox() {
    const characterIds = getAllCharacterIds();

    if (!characterIds.length) {
        notify('warning', 'No character cards were found in Character Management.');
        updateSettingsActionState();
        return;
    }

    if (areCharactersOutOfBox(characterIds)) {
        notify('info', 'Aspect: Evolutia is already reset for every character card.');
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        'Reset Aspect: Evolutia for all character cards in Character Management?\n\n' +
        'This will turn Dynamic Fields off, disable WI Scan, and restore the default Background, Personality, and Appearance fields.',
    );

    if (!confirmed) {
        return;
    }

    for (const characterId of characterIds) {
        const outOfBoxState = createOutOfBoxState();

        cacheState(characterId, outOfBoxState);
        await saveStateNow(characterId, outOfBoxState);
    }

    stateCache.clear();
    restoreSuppressedDescriptions();
    await syncPromptManagerWithActiveState();

    renderPanel();
    applyUiVisibility();
    updateTokenEstimate();
    updateSettingsActionState();

    notify('success', `Reset Aspect: Evolutia for ${characterIds.length} character card(s).`);
}

// -----------------------------------------------------------------------------
// Extensions Drawer Settings - Rendering
// -----------------------------------------------------------------------------

function renderSettingsFooter() {
    const $version = $(`#${UI.SETTINGS_VERSION_ID}`);
    const $author = $(`#${UI.SETTINGS_AUTHOR_ID}`);

    if ($version.length) {
        $version.text(`Version ${manifestMeta.version}`);
    }

    if ($author.length) {
        $author.text(manifestMeta.author);
    }
}

function setSettingsButtonState(buttonId, { text, disabled, title }) {
    const $button = $(`#${buttonId}`);

    if (!$button.length) {
        return;
    }

    if (text !== undefined) {
        $button.text(text);
    }

    $button
        .prop('disabled', Boolean(disabled))
        .toggleClass('disabled', Boolean(disabled))
        .attr('title', title || '');
}

function updateSettingsActionState() {
    const allCharacterIds = getAllCharacterIds();
    const currentCharacterIds = getCurrentChatCharacterIds();

    const allFieldsRemoved = areFieldsRemovedForCharacters(allCharacterIds);
    const currentFieldsRemoved = areFieldsRemovedForCharacters(currentCharacterIds);
    const allOutOfBox = areCharactersOutOfBox(allCharacterIds);

    const noAllCharacters = allCharacterIds.length === 0;
    const noCurrentCharacters = currentCharacterIds.length === 0;
    const isGroup = isCurrentGroupChatOpen();

    setSettingsButtonState(UI.SETTINGS_REMOVE_FIELDS_ID, {
        disabled: noAllCharacters || allFieldsRemoved,
        title: noAllCharacters
            ? 'No character cards were found in Character Management.'
            : allFieldsRemoved
                ? 'All Dynamic Fields are already removed from every character card in Character Management.'
                : 'Remove all Dynamic Fields from every character card in Character Management. This keeps each character’s Dynamic Fields toggle and WI Scan setting as they are.',
    });

    setSettingsButtonState(UI.SETTINGS_REMOVE_CURRENT_FIELDS_ID, {
        text: getCurrentCharactersButtonLabel(),
        disabled: noCurrentCharacters || currentFieldsRemoved,
        title: noCurrentCharacters
            ? 'Open a character or group chat to use this option.'
            : currentFieldsRemoved
                ? (
                    isGroup
                        ? 'All Dynamic Fields are already removed from the current characters.'
                        : 'All Dynamic Fields are already removed from the current character.'
                )
                : (
                    isGroup
                        ? 'Remove all Dynamic Fields from every character in the currently open group chat. This keeps each character’s Dynamic Fields toggle and WI Scan setting as they are.'
                        : 'Remove all Dynamic Fields from the character in the currently open chat. This keeps the character’s Dynamic Fields toggle and WI Scan setting as they are.'
                ),
    });

    setSettingsButtonState(UI.SETTINGS_RESET_EXTENSION_ID, {
        disabled: noAllCharacters || allOutOfBox,
        title: noAllCharacters
            ? 'No character cards were found in Character Management.'
            : allOutOfBox
                ? 'Aspect: Evolutia is already reset for every character card in Character Management.'
                : 'Reset Aspect: Evolutia for every character card in Character Management. Dynamic Fields will be turned off, WI Scan will be disabled, and the default Background, Personality, and Appearance fields will be restored.',
    });
}

function mountExtensionSettings() {
    const $target = $('#extensions_settings2');

    if (!$target.length) {
        setTimeout(mountExtensionSettings, 250);
        return;
    }

    if ($(`#${UI.SETTINGS_ID}`).length) {
        renderSettingsFooter();
        updateSettingsActionState();
        return;
    }

    const $settings = $(`
        <div id="${UI.SETTINGS_ID}" class="aspect-evolutia-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Aspect: Evolutia</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>

                <div class="inline-drawer-content">
                    <div class="dsf-settings-box">
                        <div class="dsf-settings-actions">
                            <button
                                id="${UI.SETTINGS_REMOVE_FIELDS_ID}"
                                type="button"
                                class="menu_button danger_button"
                                title="Remove all Dynamic Fields from every character card in Character Management. This keeps each character's Dynamic Fields toggle and WI Scan setting as they are."
                            >
                                Remove All Fields for All Characters
                            </button>

                            <button
                                id="${UI.SETTINGS_REMOVE_CURRENT_FIELDS_ID}"
                                type="button"
                                class="menu_button danger_button"
                                title="Open a character or group chat to use this option."
                                disabled
                            >
                                Remove All Fields for Current Character
                            </button>

                            <button
                                id="${UI.SETTINGS_RESET_EXTENSION_ID}"
                                type="button"
                                class="menu_button danger_button"
                                title="Reset Aspect: Evolutia for every character card in Character Management. Dynamic Fields will be turned off, WI Scan will be disabled, and the default Background, Personality, and Appearance fields will be restored."
                            >
                                Reset Extension
                            </button>
                        </div>

                        <div class="dsf-settings-footer">
                            <span id="${UI.SETTINGS_VERSION_ID}">Version ${escapeTextarea(manifestMeta.version)}</span>
                            <span id="${UI.SETTINGS_AUTHOR_ID}">${escapeTextarea(manifestMeta.author)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);

    $target.append($settings);

    bindExtensionSettingsEvents();
    renderSettingsFooter();
    updateSettingsActionState();
}

// -----------------------------------------------------------------------------
// Extensions Drawer Settings - Events
// -----------------------------------------------------------------------------

function bindExtensionSettingsEvents() {
    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_REMOVE_FIELDS_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_REMOVE_FIELDS_ID}`, removeAllFieldsForAllCharacters);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_REMOVE_CURRENT_FIELDS_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_REMOVE_CURRENT_FIELDS_ID}`, removeAllFieldsForCurrentChatCharacters);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_RESET_EXTENSION_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_RESET_EXTENSION_ID}`, resetAllCharactersToOutOfBox);
}

// ============================================================================
// Section 13. User Interface Rendering
// ============================================================================
// Purpose:
// - Own CSS, DOM mounting, field-list rendering, and visibility rules.
// - Event handlers may call this after state changes.
// ============================================================================

// -----------------------------------------------------------------------------
// User Interface Rendering - Description Textarea Lookup
// -----------------------------------------------------------------------------

function getDescriptionTextarea() {
    return $('#description_textarea, textarea[name="description"], textarea[data-name="description"]').first();
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Standard Token Counter Lookup
// -----------------------------------------------------------------------------

function getCharacterEditorRoot() {
    const $description = getDescriptionTextarea();
    const $root = $description
        .closest('#character_popup, #rm_ch_create_block, #character_edit_dialogue, .character_popup, .character_editor')
        .first();

    return $root.length ? $root : $description.parent();
}

function getStandardCharacterTokenCounters() {
    const $root = getCharacterEditorRoot();

    if (!$root.length) {
        return $();
    }

    const $selectorMatches = $root
        .find(STANDARD_TOKEN_COUNTER_SELECTORS.join(','))
        .not(`#${UI.BAR_ID}`)
        .not(`#${UI.BAR_ID} *`);

    const $textMatches = $root
        .find('div, span, small, label')
        .filter(function filterTokenCounterText() {
            if ($(this).closest(`#${UI.BAR_ID}`).length) {
                return false;
            }

            const id = String(this.id || '').toLowerCase();
            const className = typeof this.className === 'string'
                ? this.className
                : String(this.className?.baseVal || '');
            const idClass = `${id} ${className}`.toLowerCase();
            const text = String($(this).text() || '').trim();

            return idClass.includes('token') && /token|permanent/i.test(text);
        });

    return $selectorMatches.add($textMatches);
}

function setStandardTokenCounterHidden(hidden) {
    getStandardCharacterTokenCounters().each(function toggleStandardTokenCounter() {
        const $element = $(this);

        if (hidden) {
            if (!$element.attr('data-dsf-original-display')) {
                $element.attr('data-dsf-original-display', $element.css('display') || '');
            }

            $element.css('display', 'none');
            return;
        }

        const originalDisplay = $element.attr('data-dsf-original-display');

        if (originalDisplay !== undefined) {
            $element.css('display', originalDisplay === 'none' ? '' : originalDisplay);
            $element.removeAttr('data-dsf-original-display');
        }
    });
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Styles
// -----------------------------------------------------------------------------

function ensureStyles() {
    if (document.getElementById(UI.STYLE_ID)) {
        return;
    }

    const style = document.createElement('style');
    style.id = UI.STYLE_ID;
    style.textContent = `
        #${UI.BAR_ID} {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin: 6px 0;
            padding: 8px;
            border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.15));
            border-radius: 10px;
            background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.10));
        }

        #${UI.BAR_ID} .dsf-top-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
        }

        #${UI.BAR_ID} .dsf-left-controls,
        #${UI.BAR_ID} .dsf-right-controls,
        #${UI.BAR_ID} .dsf-bottom-controls {
            display: inline-flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }

        #${UI.BAR_ID} .dsf-right-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex: 1 1 auto;
            margin-left: auto;
        }

        #${UI.BAR_ID} .dsf-top-action-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            width: 100%;
        }

        #${UI.DELETE_ALL_TOP_ID} {
            margin-right: auto;
        }

        #${UI.ADD_TOP_ID} {
            margin-left: auto;
        }

        #${UI.BAR_ID} label {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin: 0;
        }

        #${UI.BOTTOM_ACTIONS_ID} {
            display: none;
            align-items: center;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
            margin-top: 4px;
        }

        #${UI.DELETE_ALL_TOP_ID},
        #${UI.ADD_TOP_ID},
        #${UI.ADD_BOTTOM_ID},
        #${UI.IMPORT_ID},
        #${UI.EXPORT_ID} {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            width: auto;
            min-width: max-content;
            flex: 0 0 auto;
        }

        #${UI.DELETE_ALL_TOP_ID}:disabled {
            opacity: 0.45;
            cursor: not-allowed;
            filter: grayscale(0.35);
        }

        #${UI.ADD_BOTTOM_ID} {
            margin-left: auto;
        }

        #${UI.PANEL_ID} {
            display: none;
        }

        #${UI.PANEL_ID} .dsf-field {
            padding: 8px;
            margin: 8px 0;
            border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.12));
            border-radius: 8px;
            background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.08));
        }

        #${UI.PANEL_ID} .dsf-field.dsf-dragging {
            opacity: 0.55;
            outline: 1px dashed var(--SmartThemeBorderColor, rgba(255,255,255,0.35));
        }

        #${UI.PANEL_ID} .dsf-field:first-child {
            margin-top: 0;
        }

        #${UI.PANEL_ID} .dsf-field:last-child {
            margin-bottom: 0;
        }

        #${UI.PANEL_ID} .dsf-field-top-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 6px;
            width: 100%;
        }

        #${UI.PANEL_ID} .dsf-field-order-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            width: 100%;
            opacity: 0.9;
            font-size: 0.9em;
        }

        #${UI.PANEL_ID} .dsf-position-control {
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            margin-left: auto;
        }

        #${UI.PANEL_ID} .dsf-field-order {
            width: auto;
            min-width: 2ch;
            max-width: 10ch;
            text-align: right;
            box-sizing: content-box;
            padding-left: 4px;
            padding-right: 4px;
        }

        #${UI.PANEL_ID} .dsf-drag-handle {
            cursor: grab;
            width: auto;
            min-width: max-content;
            white-space: nowrap;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            margin-right: auto;
        }

        #${UI.PANEL_ID} .dsf-drag-handle:active {
            cursor: grabbing;
        }

        #${UI.PANEL_ID} .dsf-label {
            font-size: 0.85em;
            opacity: 0.85;
            margin: 6px 0 2px;
        }

        #${UI.PANEL_ID} .dsf-keyword-mode-row {
            display: flex;
            justify-content: flex-end;
            margin-top: 4px;
        }

        #${UI.PANEL_ID} .dsf-keyword-mode-wrap {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-left: auto;
            font-size: 0.85em;
            opacity: 0.9;
        }

        #${UI.PANEL_ID} .dsf-keyword-mode {
            width: auto;
            min-width: 5.5em;
        }

        #${UI.PANEL_ID} .dsf-reveal-instruction-row {
            display: flex;
            justify-content: flex-end;
            margin-top: 6px;
        }

        #${UI.PANEL_ID} .dsf-reveal-instruction-wrap {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-left: auto;
        }

        #${UI.PANEL_ID} .dsf-instruction-editor {
            margin-top: 6px;
        }

        #${UI.PANEL_ID} .dsf-instruction-actions {
            display: flex;
            justify-content: flex-start;
            margin-top: 6px;
        }

        #${UI.PANEL_ID} .dsf-instruction-actions button {
            white-space: nowrap;
            width: auto;
            min-width: max-content;
        }

        #${UI.PANEL_ID} .dsf-bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }

        #${UI.PANEL_ID} .dsf-field-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 8px;
            margin-left: auto;
        }

        #${UI.PANEL_ID} .dsf-field-actions button {
            white-space: nowrap;
            width: auto;
            min-width: max-content;
        }

        #${UI.PANEL_ID} .dsf-inject-row {
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }

        #${UI.PANEL_ID} .dsf-inject-row label {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin: 0;
        }

        #${UI.PANEL_ID} input[type="text"],
        #${UI.PANEL_ID} input[type="number"],
        #${UI.PANEL_ID} textarea {
            width: 100%;
            box-sizing: border-box;
        }

        #${UI.PANEL_ID} .dsf-field-instruction {
            min-height: 48px;
            resize: vertical;
        }

        #${UI.PANEL_ID} .dsf-keywords {
            min-height: 48px;
            resize: vertical;
        }

        #${UI.PANEL_ID} .dsf-content {
            min-height: 100px;
            resize: vertical;
        }

        #${UI.PANEL_ID} .dsf-empty {
            opacity: 0.75;
            font-style: italic;
            padding: 8px 0;
        }

        #${UI.TOKEN_ROW_ID} {
            display: none;
            align-items: center;
            justify-content: flex-end;
            min-height: 1.2em;
            width: 100%;
        }

        #${UI.TOKEN_ID} {
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            white-space: nowrap;
            opacity: 0.8;
            font-size: 0.9em;
            text-align: right;
            margin-left: auto;
        }

        #${UI.BAR_ID} .dsf-menu-wrap {
            position: relative;
            display: inline-flex;
        }

        #${UI.BAR_ID} .dsf-menu {
            display: none;
            position: absolute;
            left: 0;
            top: calc(100% + 4px);
            z-index: 10000;
            min-width: 190px;
            padding: 6px;
            border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.25));
            border-radius: 8px;
            background: var(--SmartThemeBlurTintColor, var(--SmartThemeBodyColor, #1e1e1e));
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        }

        #${UI.BAR_ID} .dsf-menu.dsf-menu-open {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        #${UI.BAR_ID} .dsf-menu button {
            justify-content: flex-start;
            width: 100%;
            white-space: nowrap;
        }

        #${UI.SETTINGS_ID} .dsf-settings-box {
            border: 1px solid #000;
            border-radius: 10px;
            padding: 10px;
            margin: 8px 0;
        }

        #${UI.SETTINGS_ID} .dsf-settings-actions {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px 0;
        }

        #${UI.SETTINGS_ID} .dsf-settings-actions button {
            white-space: nowrap;
            width: auto;
            min-width: max-content;
        }

        #${UI.SETTINGS_ID} .dsf-settings-actions button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
            filter: grayscale(0.35);
        }

        #${UI.SETTINGS_ID} .dsf-settings-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding-top: 8px;
            margin-top: 8px;
            border-top: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.15));
            opacity: 0.75;
            font-size: 0.9em;
        }

        #${UI.SETTINGS_AUTHOR_ID} {
            text-align: right;
            margin-left: auto;
        }
    `;

    document.head.appendChild(style);
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Mount
// -----------------------------------------------------------------------------

function mountUi() {
    const $description = getDescriptionTextarea();

    if (!$description.length) {
        return;
    }

    ensureStyles();

    if (!$(`#${UI.BAR_ID}`).length) {
        const $bar = $(`
            <div id="${UI.BAR_ID}">
                <div class="dsf-top-controls">
                    <div class="dsf-left-controls">
                        <label class="checkbox_label" title="When enabled, Description is hidden in the editor, native charDescription is disabled in Prompt Manager, and Aspect: Evolutia's prompt is enabled.">
                            <input id="${UI.SWAP_ID}" type="checkbox" />
                            <span>Dynamic Fields</span>
                        </label>

                        <label id="${UI.WI_SCAN_WRAP_ID}" class="checkbox_label" title="Reserved for compatibility. Prompt Manager macro injection does not use extension prompt WI Scan.">
                            <input id="${UI.WI_SCAN_ID}" type="checkbox">
                            <span>WI Scan</span>
                        </label>
                    </div>

                    <div class="dsf-top-action-row">
                        <button
                            id="${UI.DELETE_ALL_TOP_ID}"
                            type="button"
                            class="menu_button danger_button"
                            title="Delete all Dynamic Fields for this character."
                        >
                            Delete All
                        </button>

                        <button id="${UI.ADD_TOP_ID}" type="button" class="menu_button">Add Field</button>
                    </div>
                </div>

                <div id="${UI.PANEL_ID}"></div>

                <div id="${UI.BOTTOM_ACTIONS_ID}">
                    <div class="dsf-menu-wrap">
                        <button id="${UI.IMPORT_ID}" type="button" class="menu_button" title="Import Dynamic Fields.">Import</button>
                        <div id="${UI.IMPORT_MENU_ID}" class="dsf-menu">
                            <button type="button" class="menu_button" data-dsf-import="${IMPORT_SOURCE.CHARACTER_CARD}">Character Card</button>
                            <button type="button" class="menu_button" data-dsf-import="${IMPORT_SOURCE.NATIVE_FIELDS}">SillyTavern Fields</button>
                            <button type="button" class="menu_button" data-dsf-import="${IMPORT_SOURCE.FILE_JSON}">File (JSON)</button>
                            <button type="button" class="menu_button" data-dsf-import="${IMPORT_SOURCE.CLIPBOARD_JSON}">Clipboard (JSON)</button>
                        </div>
                    </div>

                    <div class="dsf-menu-wrap">
                        <button id="${UI.EXPORT_ID}" type="button" class="menu_button" title="Export Dynamic Fields.">Export</button>
                        <div id="${UI.EXPORT_MENU_ID}" class="dsf-menu">
                            <button type="button" class="menu_button" data-dsf-export="${EXPORT_TARGET.FILE_JSON}">File (JSON)</button>
                            <button type="button" class="menu_button" data-dsf-export="${EXPORT_TARGET.CLIPBOARD_JSON}">Clipboard (JSON)</button>
                        </div>
                    </div>

                    <button id="${UI.ADD_BOTTOM_ID}" type="button" class="menu_button">Add Field</button>
                    <input id="${UI.CHARACTER_CARD_IMPORT_FILE_ID}" type="file" accept=".json,application/json" hidden>
                    <input id="${UI.DYNAMIC_FIELDS_IMPORT_FILE_ID}" type="file" accept=".json,application/json" hidden>
                </div>

                <div id="${UI.TOKEN_ROW_ID}">
                    <span id="${UI.TOKEN_ID}" aria-live="polite"></span>
                </div>
            </div>
        `);

        $description.before($bar);
    }

    bindUiHandlers();
    renderPanel();
    applyUiVisibility();
    updateTokenEstimate();
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Visibility
// -----------------------------------------------------------------------------

function applyUiVisibility() {
    const characterId = getActiveCharacterId();
    const state = readState(characterId);
    const $description = getDescriptionTextarea();
    const $panel = $(`#${UI.PANEL_ID}`);
    const hasFields = state.fields.length > 0;

    $(`#${UI.SWAP_ID}`).prop('checked', state.swapEnabled);
    $(`#${UI.WI_SCAN_ID}`).prop('checked', state.allowWorldInfoScan);

    $(`#${UI.DELETE_ALL_TOP_ID}`)
        .toggle(state.swapEnabled)
        .prop('disabled', !hasFields)
        .toggleClass('disabled', !hasFields)
        .attr(
            'title',
            hasFields
                ? 'Delete all Dynamic Fields for this character.'
                : 'There are no Dynamic Fields to delete.',
        );

    $(`#${UI.ADD_TOP_ID}`).toggle(state.swapEnabled);
    $(`#${UI.BOTTOM_ACTIONS_ID}`).css('display', state.swapEnabled ? 'flex' : 'none');
    $(`#${UI.ADD_BOTTOM_ID}`).toggle(state.swapEnabled);
    $(`#${UI.WI_SCAN_WRAP_ID}`).toggle(state.swapEnabled);
    $(`#${UI.TOKEN_ROW_ID}`).css('display', state.swapEnabled ? 'flex' : 'none');

    $description.toggle(!state.swapEnabled);
    $panel.toggle(state.swapEnabled);
    setStandardTokenCounterHidden(state.swapEnabled);
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Field List
// -----------------------------------------------------------------------------

function renderPanel() {
    const characterId = getActiveCharacterId();
    const state = readState(characterId);
    const $panel = $(`#${UI.PANEL_ID}`);

    if (!$panel.length) {
        return;
    }

    const fieldsHtml = state.fields.length
        ? state.fields.map((field, index) => renderFieldHtml(field, index)).join('')
        : '<div class="dsf-empty">No dynamic fields yet.</div>';

    $panel.html(`
        <div class="dsf-fields">
            ${fieldsHtml}
        </div>
    `);

    applyUiVisibility();
    updateTokenEstimate();
}

function renderFieldHtml(field, index = 0) {
    const normalized = normalizeField(field);
    const keywordMode = normalizeKeywordMode(normalized.keywordMode);
    const instructionEditorHtml = normalized.exposeInstruction
        ? `
            <div class="dsf-instruction-editor">
                <div class="dsf-label">Instruction</div>
                <textarea class="text_pole dsf-field-instruction" placeholder="${escapeAttribute(DEFAULT_FIELD_INSTRUCTION)}">${escapeTextarea(normalized.instruction)}</textarea>

                <div class="dsf-instruction-actions">
                    <button type="button" class="menu_button dsf-reset-instruction">Reset</button>
                </div>
            </div>
        `
        : '';

    return `
        <div class="dsf-field" data-field-id="${escapeAttribute(normalized.id)}">
            <div class="dsf-field-top-row">
                <div class="dsf-field-order-wrap">
                    <button type="button" class="menu_button dsf-drag-handle" title="Hold and drag to reorder">↕</button>
                    <label class="dsf-position-control">
                        <input
                            class="text_pole dsf-field-order"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            value="${index + 1}"
                            style="width: ${getPositionInputWidth(index + 1)};"
                        >
                        <span>Position</span>
                    </label>
                </div>
            </div>

            <div class="dsf-label">Field Name</div>
            <input class="text_pole dsf-field-name" type="text" placeholder="Example: Background" value="${escapeAttribute(normalized.name)}">

            <div class="dsf-label">Field Purpose</div>
            <input class="text_pole dsf-field-purpose" type="text" placeholder="Example: Appearance, Personality, or Background" value="${escapeAttribute(normalized.purpose)}">

            <div class="dsf-reveal-instruction-row">
                <label class="checkbox_label dsf-reveal-instruction-wrap" title="Show and customize the instruction used for this field.">
                    <input class="dsf-expose-instruction" type="checkbox" ${normalized.exposeInstruction ? 'checked' : ''}>
                    <span>Reveal Instruction</span>
                </label>
            </div>

            ${instructionEditorHtml}

            <div class="dsf-label">Keyword Triggers (Separate by comma, semicolon, or newline).</div>
            <textarea class="text_pole dsf-keywords" placeholder="Example: Intro, Pre-Reveal, EVOLUTION_STAGE: Pre-War Arc">${escapeTextarea(normalized.keywords)}</textarea>
            <div class="dsf-keyword-mode-row">
                <label class="dsf-keyword-mode-wrap" title="Any means at least one trigger must match. All means every trigger must match.">
                    <span>Match</span>
                    <select class="text_pole dsf-keyword-mode">
                        <option value="${KEYWORD_MODE.ANY}" ${keywordMode === KEYWORD_MODE.ANY ? 'selected' : ''}>Any</option>
                        <option value="${KEYWORD_MODE.ALL}" ${keywordMode === KEYWORD_MODE.ALL ? 'selected' : ''}>All</option>
                    </select>
                </label>
            </div>

            <div class="dsf-label">Content (Leave empty to prevent injection).</div>
            <textarea class="text_pole dsf-content" placeholder="">${escapeTextarea(normalized.content)}</textarea>

            <div class="dsf-bottom-row">
                <div class="dsf-inject-row">
                    <label class="checkbox_label" title="When enabled, this field can be injected if its content and keyword conditions allow it.">
                        <input class="dsf-field-enabled" type="checkbox" ${normalized.enabled ? 'checked' : ''}>
                        <span>Inject</span>
                    </label>
                </div>

                <div class="dsf-field-actions">
                    <button type="button" class="menu_button dsf-duplicate-field">Duplicate</button>
                    <button type="button" class="menu_button danger_button dsf-delete-field">Delete</button>
                </div>
            </div>
        </div>
    `;
}

// ============================================================================
// Section 14. User Interface Events
// ============================================================================
// Purpose:
// - Own DOM event binding for controls and field editors.
// - UI rendering may call this after mounting.
// ============================================================================

// -----------------------------------------------------------------------------
// User Interface Events - Top Bar Controls
// -----------------------------------------------------------------------------

function deleteAllDynamicFieldsForCurrentCharacter() {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before deleting Dynamic Fields.');
        return;
    }

    const state = readState(characterId);

    if (!state.fields.length) {
        notify('info', 'There are no Dynamic Fields to delete.');
        applyUiVisibility();
        return;
    }

    const confirmed = window.confirm(
        'Delete all Dynamic Fields for this character?\n\n' +
        'This only affects Aspect: Evolutia Dynamic Fields. Native SillyTavern fields are not changed.',
    );

    if (!confirmed) {
        return;
    }

    updateState((nextState) => {
        nextState.fields = [];
    }, { rerender: true });

    notify('success', 'Deleted all Dynamic Fields for this character.');
}

function bindUiHandlers() {
    $(document)
        .off(`change.${MODULE_NAME}`, `#${UI.SWAP_ID}`)
        .on(`change.${MODULE_NAME}`, `#${UI.SWAP_ID}`, function onSwapChanged() {
            updateState((state) => {
                state.swapEnabled = Boolean(this.checked);
            }, { rerender: false, syncPromptManager: true });
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.DELETE_ALL_TOP_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.DELETE_ALL_TOP_ID}`, deleteAllDynamicFieldsForCurrentCharacter);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.ADD_TOP_ID}, #${UI.ADD_BOTTOM_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.ADD_TOP_ID}, #${UI.ADD_BOTTOM_ID}`, function onAddField() {
            updateState((state) => {
                state.fields.push(normalizeField({
                    name: '',
                    purpose: '',
                    instruction: DEFAULT_FIELD_INSTRUCTION,
                    exposeInstruction: false,
                    keywords: '',
                    keywordMode: KEYWORD_MODE.ALL,
                    content: '',
                    enabled: true,
                }));
            }, { rerender: true });
        });

    $(document)
        .off(`change.${MODULE_NAME}`, `#${UI.WI_SCAN_ID}`)
        .on(`change.${MODULE_NAME}`, `#${UI.WI_SCAN_ID}`, function onWiScanChanged() {
            updateState((state) => {
                state.allowWorldInfoScan = Boolean(this.checked);
            }, { rerender: false });
        });

    bindFieldEditHandlers();
    bindFieldActionHandlers();
    bindFieldReorderHandlers();
    bindImportExportHandlers();
}

// -----------------------------------------------------------------------------
// User Interface Events - Field Editing
// -----------------------------------------------------------------------------

function bindFieldEditHandlers() {
    $(document)
        .off(`change.${MODULE_NAME}`, '.dsf-field-enabled')
        .on(`change.${MODULE_NAME}`, '.dsf-field-enabled', function onFieldEnabledChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.enabled = Boolean(this.checked);
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-field-name')
        .on(`input.${MODULE_NAME}`, '.dsf-field-name', function onFieldNameChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.name = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-field-purpose')
        .on(`input.${MODULE_NAME}`, '.dsf-field-purpose', function onFieldPurposeChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.purpose = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`change.${MODULE_NAME}`, '.dsf-expose-instruction')
        .on(`change.${MODULE_NAME}`, '.dsf-expose-instruction', function onExposeInstructionChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);

                if (field) {
                    field.exposeInstruction = Boolean(this.checked);
                    field.instruction = normalizeInstruction(field.instruction);
                }
            }, { rerender: true });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-field-instruction')
        .on(`input.${MODULE_NAME}`, '.dsf-field-instruction', function onFieldInstructionChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.instruction = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`change.${MODULE_NAME}`, '.dsf-keyword-mode')
        .on(`change.${MODULE_NAME}`, '.dsf-keyword-mode', function onKeywordModeChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.keywordMode = normalizeKeywordMode(this.value);
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-keywords')
        .on(`input.${MODULE_NAME}`, '.dsf-keywords', function onKeywordsChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.keywords = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-content')
        .on(`input.${MODULE_NAME}`, '.dsf-content', function onContentChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.content = this.value;
            }, { rerender: false });
        });
}

// -----------------------------------------------------------------------------
// User Interface Events - Field Actions
// -----------------------------------------------------------------------------

function bindFieldActionHandlers() {
    $(document)
        .off(`click.${MODULE_NAME}`, '.dsf-reset-instruction')
        .on(`click.${MODULE_NAME}`, '.dsf-reset-instruction', function onResetInstruction() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.instruction = DEFAULT_FIELD_INSTRUCTION;
            }, { rerender: true });
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '.dsf-delete-field')
        .on(`click.${MODULE_NAME}`, '.dsf-delete-field', function onDeleteField() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                state.fields = state.fields.filter((field) => field.id !== fieldId);
            }, { rerender: true });
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '.dsf-duplicate-field')
        .on(`click.${MODULE_NAME}`, '.dsf-duplicate-field', function onDuplicateField() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');

            updateState((state) => {
                const index = state.fields.findIndex((field) => field.id === fieldId);
                if (index === -1) return;

                const copy = normalizeField({
                    ...state.fields[index],
                    id: makeId(),
                    name: `${state.fields[index].name || 'Field'} Copy`,
                });

                state.fields.splice(index + 1, 0, copy);
            }, { rerender: true });
        });
}

// -----------------------------------------------------------------------------
// User Interface Events - Field Reordering
// -----------------------------------------------------------------------------

function moveFieldToOrder(state, fieldId, requestedOrder) {
    const currentIndex = state.fields.findIndex((field) => field.id === fieldId);

    if (currentIndex === -1) {
        return;
    }

    const boundedOrder = Math.max(1, Math.min(Number(requestedOrder) || 1, state.fields.length));
    const [field] = state.fields.splice(currentIndex, 1);

    state.fields.splice(boundedOrder - 1, 0, field);
}

function commitDomFieldOrder() {
    const orderedIds = $(`#${UI.PANEL_ID} .dsf-field`)
        .map(function mapFieldId() {
            return String($(this).data('field-id') || '');
        })
        .get()
        .filter(Boolean);

    if (!orderedIds.length) {
        return;
    }

    updateState((state) => {
        const fieldsById = new Map(state.fields.map((field) => [String(field.id), field]));
        const orderedFields = orderedIds
            .map((fieldId) => fieldsById.get(String(fieldId)))
            .filter(Boolean);

        if (orderedFields.length === state.fields.length) {
            state.fields = orderedFields;
        }
    }, { rerender: true });
}

function getFieldDragScrollParent(element) {
    let parent = element?.parentElement;

    while (parent && parent !== document.body && parent !== document.documentElement) {
        const style = getComputedStyle(parent);
        const overflowY = `${style.overflowY} ${style.overflow}`;

        if (/(auto|scroll)/i.test(overflowY) && parent.scrollHeight > parent.clientHeight) {
            return parent;
        }

        parent = parent.parentElement;
    }

    return document.scrollingElement || document.documentElement;
}

function getFieldDragScrollBounds(scrollElement) {
    if (
        scrollElement === document.scrollingElement ||
        scrollElement === document.documentElement ||
        scrollElement === document.body
    ) {
        return {
            top: 0,
            bottom: window.innerHeight,
        };
    }

    const rect = scrollElement.getBoundingClientRect();

    return {
        top: rect.top,
        bottom: rect.bottom,
    };
}

function getFieldDragAutoScrollAmount(scrollElement, clientY) {
    const bounds = getFieldDragScrollBounds(scrollElement);
    const topDistance = clientY - bounds.top;
    const bottomDistance = bounds.bottom - clientY;

    if (topDistance >= 0 && topDistance < FIELD_DRAG_AUTOSCROLL_MARGIN) {
        const strength = 1 - (topDistance / FIELD_DRAG_AUTOSCROLL_MARGIN);
        return -Math.ceil(strength * FIELD_DRAG_AUTOSCROLL_MAX_SPEED);
    }

    if (bottomDistance >= 0 && bottomDistance < FIELD_DRAG_AUTOSCROLL_MARGIN) {
        const strength = 1 - (bottomDistance / FIELD_DRAG_AUTOSCROLL_MARGIN);
        return Math.ceil(strength * FIELD_DRAG_AUTOSCROLL_MAX_SPEED);
    }

    return 0;
}

function scrollFieldDragContainer(scrollElement, amount) {
    if (!amount) {
        return;
    }

    if (
        scrollElement === document.scrollingElement ||
        scrollElement === document.documentElement ||
        scrollElement === document.body
    ) {
        window.scrollBy(0, amount);
        return;
    }

    scrollElement.scrollTop += amount;
}

function moveDraggedFieldAtPoint(clientX, clientY) {
    if (!fieldPointerDrag?.fieldElement) {
        return;
    }

    const elementAtPoint = document.elementFromPoint(clientX, clientY);
    const targetField = elementAtPoint?.closest?.('.dsf-field');

    if (!targetField || targetField === fieldPointerDrag.fieldElement) {
        return;
    }

    const rect = targetField.getBoundingClientRect();
    const placeAfter = clientY > rect.top + rect.height / 2;

    if (placeAfter) {
        targetField.after(fieldPointerDrag.fieldElement);
    } else {
        targetField.before(fieldPointerDrag.fieldElement);
    }
}

function startFieldDragAutoScroll() {
    if (fieldDragAutoScrollFrame) {
        return;
    }

    const tick = () => {
        if (!fieldPointerDrag) {
            fieldDragAutoScrollFrame = null;
            return;
        }

        const amount = getFieldDragAutoScrollAmount(
            fieldPointerDrag.scrollElement,
            fieldPointerDrag.lastClientY,
        );

        if (amount) {
            scrollFieldDragContainer(fieldPointerDrag.scrollElement, amount);
            moveDraggedFieldAtPoint(fieldPointerDrag.lastClientX, fieldPointerDrag.lastClientY);
        }

        fieldDragAutoScrollFrame = requestAnimationFrame(tick);
    };

    fieldDragAutoScrollFrame = requestAnimationFrame(tick);
}

function stopFieldDragAutoScroll() {
    if (fieldDragAutoScrollFrame) {
        cancelAnimationFrame(fieldDragAutoScrollFrame);
        fieldDragAutoScrollFrame = null;
    }
}

function bindFieldReorderHandlers() {
    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-field-order')
        .on(`input.${MODULE_NAME}`, '.dsf-field-order', function onPositionInputChanged() {
            this.value = String(this.value || '').replace(/[^\d]/g, '');
            syncPositionInputWidth(this);
        });

    $(document)
        .off(`change.${MODULE_NAME}`, '.dsf-field-order')
        .on(`change.${MODULE_NAME}`, '.dsf-field-order', function onOrderChanged() {
            const fieldId = $(this).closest('.dsf-field').data('field-id');
            const cleanedValue = String(this.value || '').replace(/[^\d]/g, '');
            const requestedOrder = Number(cleanedValue || 1);

            this.value = String(requestedOrder);
            syncPositionInputWidth(this);

            updateState((state) => {
                moveFieldToOrder(state, fieldId, requestedOrder);
            }, { rerender: true });
        });

    $(document)
        .off(`pointerdown.${MODULE_NAME}`, '.dsf-drag-handle')
        .on(`pointerdown.${MODULE_NAME}`, '.dsf-drag-handle', function onPointerDown(event) {
            const originalEvent = event.originalEvent;
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.data('field-id') || '');

            if (!fieldId || !originalEvent) {
                return;
            }

            event.preventDefault();

            fieldPointerDrag = {
                fieldId,
                pointerId: originalEvent.pointerId,
                fieldElement: $field[0],
                scrollElement: getFieldDragScrollParent($field[0]),
                lastClientX: originalEvent.clientX,
                lastClientY: originalEvent.clientY,
            };

            $field.addClass('dsf-dragging');

            try {
                this.setPointerCapture?.(originalEvent.pointerId);
            } catch {
                // Some mobile browsers do not allow capture from delegated handlers.
            }

            startFieldDragAutoScroll();
        });

    $(document)
        .off(`pointermove.${MODULE_NAME}`)
        .on(`pointermove.${MODULE_NAME}`, function onPointerMove(event) {
            if (!fieldPointerDrag) {
                return;
            }

            const originalEvent = event.originalEvent;

            if (!originalEvent || originalEvent.pointerId !== fieldPointerDrag.pointerId) {
                return;
            }

            event.preventDefault();

            fieldPointerDrag.lastClientX = originalEvent.clientX;
            fieldPointerDrag.lastClientY = originalEvent.clientY;

            moveDraggedFieldAtPoint(originalEvent.clientX, originalEvent.clientY);
            startFieldDragAutoScroll();
        });

    $(document)
        .off(`pointerup.${MODULE_NAME} pointercancel.${MODULE_NAME}`)
        .on(`pointerup.${MODULE_NAME} pointercancel.${MODULE_NAME}`, function onPointerUp(event) {
            if (!fieldPointerDrag) {
                return;
            }

            const originalEvent = event.originalEvent;

            if (originalEvent && originalEvent.pointerId !== fieldPointerDrag.pointerId) {
                return;
            }

            $('.dsf-field').removeClass('dsf-dragging');
            stopFieldDragAutoScroll();
            fieldPointerDrag = null;
            commitDomFieldOrder();
        });
}

// -----------------------------------------------------------------------------
// User Interface Events - Import / Export Menus
// -----------------------------------------------------------------------------

function closeImportExportMenus() {
    $(`#${UI.IMPORT_MENU_ID}, #${UI.EXPORT_MENU_ID}`).removeClass('dsf-menu-open');
}

function toggleMenu(menuId) {
    const $menu = $(`#${menuId}`);
    const wasOpen = $menu.hasClass('dsf-menu-open');

    closeImportExportMenus();

    if (!wasOpen) {
        $menu.addClass('dsf-menu-open');
    }
}

function bindImportExportHandlers() {
    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.IMPORT_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.IMPORT_ID}`, function onImportClicked(event) {
            event.stopPropagation();
            toggleMenu(UI.IMPORT_MENU_ID);
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.EXPORT_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.EXPORT_ID}`, function onExportClicked(event) {
            event.stopPropagation();
            toggleMenu(UI.EXPORT_MENU_ID);
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.IMPORT_MENU_ID}, #${UI.EXPORT_MENU_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.IMPORT_MENU_ID}, #${UI.EXPORT_MENU_ID}`, function onMenuClicked(event) {
            event.stopPropagation();
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '[data-dsf-import]')
        .on(`click.${MODULE_NAME}`, '[data-dsf-import]', function onImportActionClicked() {
            const action = String($(this).data('dsf-import') || '');
            closeImportExportMenus();

            if (action === IMPORT_SOURCE.CHARACTER_CARD) {
                importDynamicFieldsFromCharacterCardFile();
            } else if (action === IMPORT_SOURCE.NATIVE_FIELDS) {
                importDynamicFieldsFromNativeFields();
            } else if (action === IMPORT_SOURCE.FILE_JSON) {
                importDynamicFieldsFromFileJson();
            } else if (action === IMPORT_SOURCE.CLIPBOARD_JSON) {
                importDynamicFieldsFromClipboardJson();
            }
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '[data-dsf-export]')
        .on(`click.${MODULE_NAME}`, '[data-dsf-export]', function onExportActionClicked() {
            const action = String($(this).data('dsf-export') || '');
            closeImportExportMenus();

            if (action === EXPORT_TARGET.FILE_JSON) {
                exportDynamicFieldsToFileJson();
            } else if (action === EXPORT_TARGET.CLIPBOARD_JSON) {
                exportDynamicFieldsToClipboardJson();
            }
        });

    $(document)
        .off(`change.${MODULE_NAME}`, `#${UI.CHARACTER_CARD_IMPORT_FILE_ID}`)
        .on(`change.${MODULE_NAME}`, `#${UI.CHARACTER_CARD_IMPORT_FILE_ID}`, handleCharacterCardImportFileSelected);

    $(document)
        .off(`change.${MODULE_NAME}`, `#${UI.DYNAMIC_FIELDS_IMPORT_FILE_ID}`)
        .on(`change.${MODULE_NAME}`, `#${UI.DYNAMIC_FIELDS_IMPORT_FILE_ID}`, handleDynamicFieldsImportFileSelected);

    $(document)
        .off(`click.${MODULE_NAME}.menus`)
        .on(`click.${MODULE_NAME}.menus`, closeImportExportMenus);
}

// ============================================================================
// Section 15. Generation Flow
// ============================================================================
// Purpose:
// - Own generation-time behavior needed by the Prompt Manager macro.
// - SillyTavern event wiring may call this during generation lifecycle events.
// ============================================================================

// -----------------------------------------------------------------------------
// Generation Flow - Start
// -----------------------------------------------------------------------------

function onGenerationStarted(_type, options = {}) {
    currentGenerationCharacterId = getGenerationCharacterId(options);
}

// -----------------------------------------------------------------------------
// Generation Flow - Cleanup
// -----------------------------------------------------------------------------

function onGenerationPromptBuilt() {
    restoreSuppressedDescriptions();
    currentGenerationCharacterId = undefined;
}

function onGenerationFinished() {
    restoreSuppressedDescriptions();
    currentGenerationCharacterId = undefined;
}

// ============================================================================
// Section 16. SillyTavern Event Wiring
// ============================================================================
// Purpose:
// - Own subscriptions to SillyTavern app, character, chat, and generation events.
// - Bootstrapping may call this once during activation.
// ============================================================================

// -----------------------------------------------------------------------------
// SillyTavern Event Wiring - Registration
// -----------------------------------------------------------------------------

function registerEvents() {
    const ctx = getContext();
    const eventSource = ctx?.eventSource;
    const eventTypes = ctx?.eventTypes ?? ctx?.event_types;

    if (!eventSource || !eventTypes) {
        setTimeout(registerEvents, 250);
        return;
    }

    eventSource.on(eventTypes.APP_READY, () => {
        mountExtensionSettings();
        mountUi();
        updateSettingsActionState();
        syncPromptManagerWithActiveState();
    });

    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        stateCache.clear();
        restoreSuppressedDescriptions();
        currentGenerationCharacterId = undefined;
        scheduleMount();
        updateSettingsActionState();
        syncPromptManagerWithActiveState();
    });

    eventSource.on(eventTypes.CHARACTER_EDITED, () => {
        stateCache.clear();
        restoreSuppressedDescriptions();
        scheduleMount();
        updateSettingsActionState();
        syncPromptManagerWithActiveState();
    });

    eventSource.on(eventTypes.CHARACTER_PAGE_LOADED, () => {
        stateCache.clear();
        scheduleMount();
        updateSettingsActionState();
        syncPromptManagerWithActiveState();
    });

    eventSource.on(eventTypes.GENERATION_STARTED, onGenerationStarted);

    if (eventTypes.GENERATE_AFTER_DATA) {
        eventSource.on(eventTypes.GENERATE_AFTER_DATA, onGenerationPromptBuilt);
    }

    if (eventTypes.GENERATE_AFTER_COMBINE_PROMPTS) {
        eventSource.on(eventTypes.GENERATE_AFTER_COMBINE_PROMPTS, onGenerationPromptBuilt);
    }

    if (eventTypes.GENERATION_ENDED) {
        eventSource.on(eventTypes.GENERATION_ENDED, onGenerationFinished);
    }

    if (eventTypes.GENERATION_STOPPED) {
        eventSource.on(eventTypes.GENERATION_STOPPED, onGenerationFinished);
    }

    if (eventTypes.OAI_PRESET_CHANGED_AFTER) {
        eventSource.on(eventTypes.OAI_PRESET_CHANGED_AFTER, () => {
            setTimeout(() => {
                updateSettingsActionState();
                syncPromptManagerWithActiveState();
            }, 100);
        });
    }

    if (eventTypes.SETTINGS_UPDATED) {
        eventSource.on(eventTypes.SETTINGS_UPDATED, () => {
            setTimeout(updateSettingsActionState, 100);
        });
    }
}

// ============================================================================
// Section 17. DOM Mount Observer
// ============================================================================
// Purpose:
// - Own remounting the UI when SillyTavern replaces character editor DOM.
// - Bootstrapping may call this once during activation.
// ============================================================================

// -----------------------------------------------------------------------------
// DOM Mount Observer - Scheduled Mount
// -----------------------------------------------------------------------------

function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mountUi, 150);
}

// -----------------------------------------------------------------------------
// DOM Mount Observer - Mutation Watch
// -----------------------------------------------------------------------------

function observeDom() {
    if (!document.body) {
        return;
    }

    const observer = new MutationObserver(() => {
        if (!document.getElementById(UI.BAR_ID) || !document.getElementById(UI.PANEL_ID)) {
            scheduleMount();
        }

        if (!document.getElementById(UI.SETTINGS_ID)) {
            mountExtensionSettings();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// ============================================================================
// Section 18. Extension Activation
// ============================================================================
// Purpose:
// - Own one-time startup for Aspect: Evolutia.
// - Module self-boots for compatibility.
// ============================================================================

// -----------------------------------------------------------------------------
// Extension Activation - Boot
// -----------------------------------------------------------------------------

function boot() {
    if (booted) {
        return;
    }

    booted = true;

    registerAspectMacro();
    loadManifestMetadata();
    registerEvents();
    observeDom();

    jQuery(() => {
        mountExtensionSettings();
        mountUi();
        updateSettingsActionState();
        syncPromptManagerWithActiveState();
    });
}

// -----------------------------------------------------------------------------
// Extension Activation - SillyTavern Entry Point
// -----------------------------------------------------------------------------

export function activate() {
    boot();
}

boot();