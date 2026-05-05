// ============================================================================
// ============================================================================
// SillyTavern Extension - Aspect: Evolutia                  created by Genisai
// ============================================================================
// ============================================================================

// ============================================================================
// Section 1. Imports
// ============================================================================
// Owns all external dependencies used by this extension file.
// ============================================================================

import { saveSettingsDebounced as importedSaveSettingsDebounced } from '../../../../script.js';
import { getContext as importedGetContext } from '../../../extensions.js';
import { promptManager } from '../../../openai.js';
import { MacrosParser } from '../../../macros.js';
import { user_avatar } from '../../../personas.js';
import { persona_description_positions, power_user } from '../../../power-user.js';

// ============================================================================
// Section 2. Module Constants and State
// ============================================================================
// Purpose:
// - Own stable identifiers, default settings, UI element IDs, and runtime state.
// ============================================================================

const MODULE_NAME = 'st-description-swap-fields';

const TARGET_SCOPE = Object.freeze({
    CHARACTER: 'character',
    PERSONA: 'persona',
});

const CHARACTER_ASPECT_PROMPT_ID = 'aspectEvolutiaCharDescription';
const CHARACTER_ASPECT_PROMPT_NAME = 'Char Description (Evolutia)';
const CHARACTER_ASPECT_MACRO_NAME = 'aspectEvolutiaCharDescription';
const CHARACTER_ASPECT_MACRO_TEXT = `{{${CHARACTER_ASPECT_MACRO_NAME}}}`;

const PERSONA_ASPECT_PROMPT_ID = 'aspectEvolutiaPersonaDescription';
const PERSONA_ASPECT_PROMPT_NAME = 'Persona Description (Evolutia)';
const PERSONA_ASPECT_MACRO_NAME = 'aspectEvolutiaPersonaDescription';
const PERSONA_ASPECT_MACRO_TEXT = `{{${PERSONA_ASPECT_MACRO_NAME}}}`;

const ASPECT_INTERCEPTOR_NAME = 'aspectEvolutiaGenerateInterceptor';

const NATIVE_DESCRIPTION_PROMPT_ID = 'charDescription';
const NATIVE_PERSONA_PROMPT_ID = 'personaDescription';

// Backward-compatible aliases for the existing character-side implementation.
// Later sections should prefer the CHARACTER_* names directly.
const ASPECT_PROMPT_ID = CHARACTER_ASPECT_PROMPT_ID;
const ASPECT_PROMPT_NAME = CHARACTER_ASPECT_PROMPT_NAME;
const ASPECT_MACRO_NAME = CHARACTER_ASPECT_MACRO_NAME;
const ASPECT_MACRO_TEXT = CHARACTER_ASPECT_MACRO_TEXT;

const KEYWORD_MODE = Object.freeze({
    ANY: 'any',
    ALL: 'all',
});

const TRIGGER_SOURCE = Object.freeze({
    QUIET_PROMPTS: 'quiet_prompts',
    SYSTEM_PROMPTS: 'system_prompts',
    LAST_ASSISTANT_MESSAGE: 'last_assistant_message',
    LAST_USER_MESSAGE: 'last_user_message',
    WORLD_INFO_LOREBOOKS: 'world_info_lorebooks',
});

const LEGACY_TRIGGER_SOURCE_ALIASES = Object.freeze({
    assistant_messages: TRIGGER_SOURCE.LAST_ASSISTANT_MESSAGE,
    world_info: TRIGGER_SOURCE.WORLD_INFO_LOREBOOKS,
    lorebooks: TRIGGER_SOURCE.WORLD_INFO_LOREBOOKS,
});

const TRIGGER_SOURCE_LABELS = Object.freeze({
    [TRIGGER_SOURCE.QUIET_PROMPTS]: 'Quiet Prompts',
    [TRIGGER_SOURCE.SYSTEM_PROMPTS]: 'System Prompts',
    [TRIGGER_SOURCE.LAST_ASSISTANT_MESSAGE]: 'Last Assistant Message',
    [TRIGGER_SOURCE.LAST_USER_MESSAGE]: 'Last User Message',
    [TRIGGER_SOURCE.WORLD_INFO_LOREBOOKS]: 'World Info / Lorebooks',
});

const TRIGGER_ACTION_PHASE = Object.freeze({
    IDLE: 'idle',
    ACTION_INJECTED: 'action_injected',
    CONTENT_READY: 'content_ready',
});

const DEFAULT_TRIGGER_SOURCES = Object.freeze([
    TRIGGER_SOURCE.LAST_USER_MESSAGE,
]);

const IMPORT_SOURCE = Object.freeze({
    CHARACTER_CARD: 'character_card',
    NATIVE_FIELDS: 'native_fields',
    PERSONA_DESCRIPTION: 'persona_description',
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

const PERSONA_STATE_SETTINGS_KEY = 'personaDynamicFields';
const PERSONA_STATE_UNKNOWN_KEY = '__unknown_persona__';

const UI = Object.freeze({
    STYLE_ID: 'dsf_style',

    // Character editor UI
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
    TOKEN_ID: 'dsf_token_estimate',

    // Persona management UI
    PERSONA_BAR_ID: 'dsf_persona_swap_bar',
    PERSONA_PANEL_ID: 'dsf_persona_panel',
    PERSONA_BOTTOM_ACTIONS_ID: 'dsf_persona_bottom_actions',
    PERSONA_TOKEN_ROW_ID: 'dsf_persona_token_row',
    PERSONA_SWAP_ID: 'dsf_persona_swap_enabled',
    PERSONA_DELETE_ALL_TOP_ID: 'dsf_persona_delete_all_fields_top',
    PERSONA_ADD_TOP_ID: 'dsf_persona_add_field_top',
    PERSONA_ADD_BOTTOM_ID: 'dsf_persona_add_field_bottom',
    PERSONA_IMPORT_ID: 'dsf_persona_import',
    PERSONA_IMPORT_MENU_ID: 'dsf_persona_import_menu',
    PERSONA_EXPORT_ID: 'dsf_persona_export',
    PERSONA_EXPORT_MENU_ID: 'dsf_persona_export_menu',
    PERSONA_DYNAMIC_FIELDS_IMPORT_FILE_ID: 'dsf_persona_dynamic_fields_import_file',
    PERSONA_TOKEN_ID: 'dsf_persona_token_estimate',

    // Extension drawer UI
    SETTINGS_ID: 'dsf_extension_settings',
    SETTINGS_VERSION_ID: 'dsf_settings_version',
    SETTINGS_AUTHOR_ID: 'dsf_settings_author',

    SETTINGS_CHARACTER_BOX_ID: 'dsf_settings_character_box',
    SETTINGS_CHARACTER_REMOVE_FIELDS_ID: 'dsf_character_remove_all_fields',
    SETTINGS_CHARACTER_REMOVE_CURRENT_FIELDS_ID: 'dsf_character_remove_current_fields',
    SETTINGS_CHARACTER_RESET_EXTENSION_ID: 'dsf_character_reset_extension',

    SETTINGS_PERSONA_BOX_ID: 'dsf_settings_persona_box',
    SETTINGS_PERSONA_REMOVE_FIELDS_ID: 'dsf_persona_remove_all_fields',
    SETTINGS_PERSONA_REMOVE_CURRENT_FIELDS_ID: 'dsf_persona_remove_current_fields',
    SETTINGS_PERSONA_RESET_EXTENSION_ID: 'dsf_persona_reset_extension',

    // Backward-compatible aliases for existing character settings references.
    SETTINGS_REMOVE_FIELDS_ID: 'dsf_character_remove_all_fields',
    SETTINGS_REMOVE_CURRENT_FIELDS_ID: 'dsf_character_remove_current_fields',
    SETTINGS_RESET_EXTENSION_ID: 'dsf_character_reset_extension',
});

const DEFAULT_STATE = Object.freeze({
    swapEnabled: false,
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

const PERSONA_TOKEN_COUNTER_SELECTORS = [
    '#persona_description_tokens',
    '#persona_description_token_counter',
    '#persona_token_counter',
    '#persona_tokens',
    '.persona_description_tokens',
    '.persona-description-tokens',
    '.persona_token_counter',
    '.persona-token-counter',
    '.persona_tokens',
    '.persona-tokens',
    '[data-persona-token-counter]',
    '[data-testid="persona-description-token-counter"]',
];

let booted = false;
let saveTimer = null;
let personaSaveTimer = null;
let mountTimer = null;
let personaMountTimer = null;
let currentGenerationCharacterId = undefined;
let currentGenerationPersonaId = undefined;
let currentGenerationId = 0;
let generationSerial = 0;
let tokenUpdateSerial = 0;
let personaTokenUpdateSerial = 0;
let manifestMeta = { ...DEFAULT_MANIFEST_META };
let fieldPointerDrag = null;
let fieldDragAutoScrollFrame = null;

const FIELD_DRAG_AUTOSCROLL_MARGIN = 80;
const FIELD_DRAG_AUTOSCROLL_MAX_SPEED = 22;

const stateCache = new Map();
const personaStateCache = new Map();
const descriptionBackups = new Map();
const preparedPromptCache = new Map();

// ============================================================================
// Section 3. Shared Utilities
// ============================================================================
// Purpose:
// - Own generic helpers used across components.
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
// Section 4. SillyTavern Context, Character, and Persona Access
// ============================================================================
// Purpose:
// - Own safe access to SillyTavern context, active character IDs, active persona IDs,
//   character records, persona records, and native Description text.
// ============================================================================

// -----------------------------------------------------------------------------
// SillyTavern Context, Character, and Persona Access - Context Resolution
// -----------------------------------------------------------------------------

function getContext() {
    return globalThis.SillyTavern?.getContext?.() ?? importedGetContext();
}

function getPowerUserSettings() {
    return power_user ?? getContext()?.power_user ?? getContext()?.powerUser ?? globalThis.power_user ?? null;
}

function getSaveSettingsDebounced() {
    return (
        importedSaveSettingsDebounced ??
        getContext()?.saveSettingsDebounced ??
        globalThis.saveSettingsDebounced ??
        null
    );
}

// -----------------------------------------------------------------------------
// SillyTavern Context, Character, and Persona Access - Character Resolution
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
    const forced = options?.force_chid ?? options?.chid ?? options?.characterId;

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
// SillyTavern Context, Character, and Persona Access - Character Collections
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

// -----------------------------------------------------------------------------
// SillyTavern Context, Character, and Persona Access - Persona Resolution
// -----------------------------------------------------------------------------

function normalizePersonaId(personaId) {
    if (personaId === undefined || personaId === null || personaId === '') {
        return undefined;
    }

    if (typeof personaId === 'object') {
        const nestedCandidates = [
            personaId.avatarId,
            personaId.avatar_id,
            personaId.user_avatar,
            personaId.userAvatar,
            personaId.id,
        ];

        for (const candidate of nestedCandidates) {
            const normalized = normalizePersonaId(candidate);

            if (normalized) {
                return normalized;
            }
        }

        return undefined;
    }

    const text = String(personaId).trim();
    return text || undefined;
}

function getPersonaIdFromDom() {
    const candidates = [
        $('#user_avatar_block .avatar-container.selected').attr('data-avatar-id'),
        $('#user_avatar_block .avatar-container.selected').data('avatar-id'),
        $('#user_avatar_block .avatar-container.selected .avatar').attr('data-avatar-id'),
        $('#user_avatar_block .avatar-container.selected .avatar').data('avatar-id'),

        $('#user_avatar_block .avatar.default_persona').attr('data-avatar-id'),
        $('#user_avatar_block .avatar.default_persona').data('avatar-id'),

        $('#persona_container .avatar-container.selected').attr('data-avatar-id'),
        $('#persona_container .avatar-container.selected').data('avatar-id'),
        $('#persona_container .avatar-container.selected .avatar').attr('data-avatar-id'),
        $('#persona_container .avatar-container.selected .avatar').data('avatar-id'),

        $('#persona_list .avatar-container.selected').attr('data-avatar-id'),
        $('#persona_list .avatar-container.selected').data('avatar-id'),
        $('#persona_list .avatar-container.selected .avatar').attr('data-avatar-id'),
        $('#persona_list .avatar-container.selected .avatar').data('avatar-id'),

        $('.persona_selected').attr('data-avatar-id'),
        $('.persona_selected').data('avatar-id'),
        $('.persona_selected .avatar').attr('data-avatar-id'),
        $('.persona_selected .avatar').data('avatar-id'),

        // Legacy/defensive fallback only.
        $('#user_avatar_block .avatar').attr('imgfile'),
        $('#user_avatar_block img').attr('imgfile'),
        $('#user_avatar').attr('imgfile'),
    ];

    for (const candidate of candidates) {
        const normalized = normalizePersonaId(candidate);

        if (normalized) {
            return normalized;
        }
    }

    return undefined;
}

function getActivePersonaId() {
    const candidates = [
        user_avatar,
        getContext()?.user_avatar,
        getContext()?.userAvatar,
        getContext()?.personaId,
        getContext()?.activePersonaId,
        getContext()?.active_persona_id,
        getPersonaIdFromDom(),
    ];

    for (const candidate of candidates) {
        const normalized = normalizePersonaId(candidate);

        if (normalized) {
            return normalized;
        }
    }

    return undefined;
}

function getGenerationPersonaId(options = {}) {
    const forced = (
        options?.force_persona_id ??
        options?.forcePersonaId ??
        options?.personaId ??
        options?.user_avatar ??
        options?.userAvatar
    );

    if (forced !== undefined && forced !== null && forced !== '') {
        return normalizePersonaId(forced);
    }

    return getActivePersonaId();
}

function getMacroPersonaId() {
    if (currentGenerationPersonaId !== undefined && currentGenerationPersonaId !== null && currentGenerationPersonaId !== '') {
        return currentGenerationPersonaId;
    }

    return getActivePersonaId();
}

function getPersonaCacheKey(personaId = getActivePersonaId()) {
    const normalized = normalizePersonaId(personaId);
    return normalized || PERSONA_STATE_UNKNOWN_KEY;
}

function getPersonaName(personaId = getMacroPersonaId()) {
    const normalizedPersonaId = normalizePersonaId(personaId);
    const powerUser = getPowerUserSettings();
    const ctx = getContext();

    const candidates = [
        normalizedPersonaId ? powerUser?.personas?.[normalizedPersonaId] : '',
        ctx?.name1,
        globalThis.name1,
        $('#your_name').text(),
        $('#your_name').val(),
        $('#user_name').val(),
    ];

    for (const candidate of candidates) {
        const text = String(candidate ?? '').trim();

        if (text) {
            return text;
        }
    }

    return 'the user persona';
}

function getPersonaDescriptionObject(personaId = getActivePersonaId()) {
    const normalizedPersonaId = normalizePersonaId(personaId);
    const powerUser = getPowerUserSettings();

    if (!normalizedPersonaId || !powerUser || typeof powerUser !== 'object') {
        return null;
    }

    const existing = powerUser.persona_descriptions?.[normalizedPersonaId];

    if (existing && typeof existing === 'object') {
        return existing;
    }

    if (typeof existing === 'string') {
        return {
            description: existing,
            position: persona_description_positions.IN_PROMPT,
        };
    }

    return null;
}

function getActivePersonaDescriptionObject() {
    const personaId = getActivePersonaId();
    const descriptionObject = getPersonaDescriptionObject(personaId);

    if (descriptionObject) {
        return descriptionObject;
    }

    const powerUser = getPowerUserSettings();

    if (!powerUser || typeof powerUser !== 'object') {
        return null;
    }

    return {
        description: powerUser.persona_description ?? '',
        position: powerUser.persona_description_position ?? persona_description_positions.IN_PROMPT,
        depth: powerUser.persona_description_depth,
        role: powerUser.persona_description_role,
        lorebook: powerUser.persona_description_lorebook,
    };
}

function getNativePersonaDescriptionForPersona(personaId = getActivePersonaId()) {
    const normalizedPersonaId = normalizePersonaId(personaId);
    const activePersonaId = normalizePersonaId(getActivePersonaId());

    const descriptionObject = normalizedPersonaId === activePersonaId
        ? getActivePersonaDescriptionObject()
        : getPersonaDescriptionObject(normalizedPersonaId);

    return String(descriptionObject?.description ?? '').trim();
}

function getPersonaDescriptionPosition(personaId = getActivePersonaId()) {
    const normalizedPersonaId = normalizePersonaId(personaId);
    const activePersonaId = normalizePersonaId(getActivePersonaId());

    const descriptionObject = normalizedPersonaId === activePersonaId
        ? getActivePersonaDescriptionObject()
        : getPersonaDescriptionObject(normalizedPersonaId);

    const rawPosition = descriptionObject?.position;

    if (rawPosition === undefined || rawPosition === null || rawPosition === '') {
        return persona_description_positions.IN_PROMPT;
    }

    const numeric = Number(rawPosition);

    if (Number.isFinite(numeric)) {
        return numeric;
    }

    return String(rawPosition).trim();
}

function isPersonaDescriptionInPromptManagerPosition(personaId = getActivePersonaId()) {
    const position = getPersonaDescriptionPosition(personaId);

    if (position === persona_description_positions.IN_PROMPT) {
        return true;
    }

    const text = String(position).trim().toLowerCase();

    return [
        String(persona_description_positions.IN_PROMPT),
        'in_prompt',
        'prompt',
        'prompt_manager',
        'story_string',
        'in story string',
        'in story string / prompt manager',
    ].includes(text);
}

function getAllPersonaIds() {
    const powerUser = getPowerUserSettings();

    if (!powerUser || typeof powerUser !== 'object') {
        const activePersonaId = getActivePersonaId();
        return activePersonaId ? [activePersonaId] : [];
    }

    const ids = new Set();

    for (const key of Object.keys(powerUser.personas || {})) {
        const normalized = normalizePersonaId(key);

        if (normalized) {
            ids.add(normalized);
        }
    }

    for (const key of Object.keys(powerUser.persona_descriptions || {})) {
        const normalized = normalizePersonaId(key);

        if (normalized) {
            ids.add(normalized);
        }
    }

    const activePersonaId = getActivePersonaId();

    if (activePersonaId) {
        ids.add(activePersonaId);
    }

    return [...ids];
}

function getCurrentPersonaIds() {
    const personaId = getActivePersonaId();
    return personaId ? [personaId] : [];
}

function getCurrentPersonaButtonLabel() {
    return 'Remove All Fields for Current Persona';
}

// -----------------------------------------------------------------------------
// SillyTavern Context, Character, and Persona Access - Persona Extension Storage
// -----------------------------------------------------------------------------

function getPersonaExtensionRoot({ create = false } = {}) {
    const powerUser = getPowerUserSettings();

    if (!powerUser || typeof powerUser !== 'object') {
        return null;
    }

    if (!powerUser[MODULE_NAME] || typeof powerUser[MODULE_NAME] !== 'object') {
        if (!create) {
            return null;
        }

        powerUser[MODULE_NAME] = {};
    }

    if (!powerUser[MODULE_NAME][PERSONA_STATE_SETTINGS_KEY] || typeof powerUser[MODULE_NAME][PERSONA_STATE_SETTINGS_KEY] !== 'object') {
        if (!create) {
            return null;
        }

        powerUser[MODULE_NAME][PERSONA_STATE_SETTINGS_KEY] = {};
    }

    return powerUser[MODULE_NAME][PERSONA_STATE_SETTINGS_KEY];
}

function getPersonaExtensionStateRecord(personaId = getActivePersonaId()) {
    const key = getPersonaCacheKey(personaId);
    const root = getPersonaExtensionRoot();

    if (!root || typeof root !== 'object') {
        return undefined;
    }

    return root[key];
}

function setPersonaExtensionStateRecord(personaId, state) {
    const key = getPersonaCacheKey(personaId);
    const root = getPersonaExtensionRoot({ create: true });

    if (!root || typeof root !== 'object') {
        return false;
    }

    root[key] = state;
    return true;
}

function deletePersonaExtensionStateRecord(personaId) {
    const key = getPersonaCacheKey(personaId);
    const root = getPersonaExtensionRoot();

    if (!root || typeof root !== 'object') {
        return false;
    }

    delete root[key];
    return true;
}

// ============================================================================
// Section 5. Field and State Model
// ============================================================================
// Purpose:
// - Own normalization of saved extension data into predictable runtime objects.
// ============================================================================

// -----------------------------------------------------------------------------
// Field and State Model - Field Normalization
// -----------------------------------------------------------------------------

function createDefaultFields() {
    return [
        normalizeField({
            name: 'Background',
            activatingTriggers: '',
            enablingTriggers: '',
            disablingTriggers: '',
            triggerSources: [...DEFAULT_TRIGGER_SOURCES],
            activatingKeywordMode: KEYWORD_MODE.ALL,
            enablingKeywordMode: KEYWORD_MODE.ALL,
            disablingKeywordMode: KEYWORD_MODE.ALL,
            triggerActionInstruction: '',
            triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
            triggerActionGenerationId: 0,
            triggerActionEnabledByGeneration: false,
            content: '',
            enabled: true,
        }),
        normalizeField({
            name: 'Personality',
            activatingTriggers: '',
            enablingTriggers: '',
            disablingTriggers: '',
            triggerSources: [...DEFAULT_TRIGGER_SOURCES],
            activatingKeywordMode: KEYWORD_MODE.ALL,
            enablingKeywordMode: KEYWORD_MODE.ALL,
            disablingKeywordMode: KEYWORD_MODE.ALL,
            triggerActionInstruction: '',
            triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
            triggerActionGenerationId: 0,
            triggerActionEnabledByGeneration: false,
            content: '',
            enabled: true,
        }),
        normalizeField({
            name: 'Appearance',
            activatingTriggers: '',
            enablingTriggers: '',
            disablingTriggers: '',
            triggerSources: [...DEFAULT_TRIGGER_SOURCES],
            activatingKeywordMode: KEYWORD_MODE.ALL,
            enablingKeywordMode: KEYWORD_MODE.ALL,
            disablingKeywordMode: KEYWORD_MODE.ALL,
            triggerActionInstruction: '',
            triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
            triggerActionGenerationId: 0,
            triggerActionEnabledByGeneration: false,
            content: '',
            enabled: true,
        }),
    ];
}

function createOutOfBoxState() {
    return normalizeState({
        swapEnabled: false,
        initializedDefaults: true,
        fields: createDefaultFields(),
    });
}

function createOutOfBoxPersonaState() {
    return normalizePersonaState({
        swapEnabled: false,
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

function createEmptyPersonaFieldsState(personaId = getActivePersonaId()) {
    const state = readPersonaState(personaId);

    state.initializedDefaults = true;
    state.fields = [];

    return normalizePersonaState(state);
}

function normalizeKeywordMode(rawMode) {
    return rawMode === KEYWORD_MODE.ANY ? KEYWORD_MODE.ANY : KEYWORD_MODE.ALL;
}

function normalizeTriggerSources(rawSources) {
    const validSources = new Set(Object.values(TRIGGER_SOURCE));
    const sourceArray = Array.isArray(rawSources)
        ? rawSources
        : typeof rawSources === 'string'
            ? rawSources.split(/[,;]/g)
            : [];

    const normalized = sourceArray
        .map((source) => {
            const value = String(source ?? '').trim();
            return LEGACY_TRIGGER_SOURCE_ALIASES[value] || value;
        })
        .filter((source) => validSources.has(source));

    if (!normalized.length) {
        return [...DEFAULT_TRIGGER_SOURCES];
    }

    return [...new Set(normalized)];
}

function normalizeTriggerActionPhase(rawPhase) {
    const phase = String(rawPhase ?? '').trim();

    if (Object.values(TRIGGER_ACTION_PHASE).includes(phase)) {
        return phase;
    }

    return TRIGGER_ACTION_PHASE.IDLE;
}

function shouldIncludeTriggerActions(options = {}) {
    if (options.includeTriggerActions !== undefined) {
        return Boolean(options.includeTriggerActions);
    }

    return options.targetScope !== TARGET_SCOPE.PERSONA;
}

function normalizeField(field = {}, options = {}) {
    const activatingTriggers = field.activatingTriggers ?? field.keywords ?? '';
    const legacyKeywordMode = field.keywordMode;
    const generationId = Number(field.triggerActionGenerationId);
    const includeTriggerActions = shouldIncludeTriggerActions(options);

    return {
        id: typeof field.id === 'string' && field.id.trim() ? field.id : makeId(),
        enabled: field.enabled !== false,
        name: String(field.name ?? ''),
        activatingTriggers: String(activatingTriggers ?? ''),
        enablingTriggers: String(field.enablingTriggers ?? ''),
        disablingTriggers: String(field.disablingTriggers ?? ''),
        triggerSources: normalizeTriggerSources(field.triggerSources),
        activatingKeywordMode: normalizeKeywordMode(field.activatingKeywordMode ?? legacyKeywordMode),
        enablingKeywordMode: normalizeKeywordMode(field.enablingKeywordMode ?? legacyKeywordMode),
        disablingKeywordMode: normalizeKeywordMode(field.disablingKeywordMode ?? legacyKeywordMode),
        triggerActionInstruction: includeTriggerActions ? String(field.triggerActionInstruction ?? '') : '',
        triggerActionPhase: includeTriggerActions ? normalizeTriggerActionPhase(field.triggerActionPhase) : TRIGGER_ACTION_PHASE.IDLE,
        triggerActionGenerationId: includeTriggerActions && Number.isFinite(generationId) ? Math.max(0, generationId) : 0,
        triggerActionEnabledByGeneration: includeTriggerActions ? Boolean(field.triggerActionEnabledByGeneration) : false,
        content: String(field.content ?? ''),
    };
}

function normalizeCharacterField(field = {}) {
    return normalizeField(field, {
        targetScope: TARGET_SCOPE.CHARACTER,
        includeTriggerActions: true,
    });
}

function normalizePersonaField(field = {}) {
    return normalizeField(field, {
        targetScope: TARGET_SCOPE.PERSONA,
        includeTriggerActions: false,
    });
}

// -----------------------------------------------------------------------------
// Field and State Model - State Normalization
// -----------------------------------------------------------------------------

function normalizeState(rawState = {}, options = {}) {
    const source = rawState && typeof rawState === 'object' ? rawState : {};
    const hasSavedFields = Array.isArray(source.fields);
    const initializedDefaults = Boolean(source.initializedDefaults);
    const includeTriggerActions = shouldIncludeTriggerActions(options);

    let fields = hasSavedFields
        ? source.fields.map((field) => normalizeField(field, { ...options, includeTriggerActions }))
        : createDefaultFields().map((field) => normalizeField(field, { ...options, includeTriggerActions }));

    if (!initializedDefaults && fields.length === 0) {
        fields = createDefaultFields().map((field) => normalizeField(field, { ...options, includeTriggerActions }));
    }

    return {
        ...clone(DEFAULT_STATE),
        swapEnabled: Boolean(source.swapEnabled),
        initializedDefaults: true,
        fields,
    };
}

function normalizeCharacterState(rawState = {}) {
    return normalizeState(rawState, {
        targetScope: TARGET_SCOPE.CHARACTER,
        includeTriggerActions: true,
    });
}

function normalizePersonaState(rawState = {}) {
    return normalizeState(rawState, {
        targetScope: TARGET_SCOPE.PERSONA,
        includeTriggerActions: false,
    });
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

function prepareImportedFields(fields, existingFields = [], options = {}) {
    const result = [];
    const nameContext = [...existingFields];
    const includeTriggerActions = shouldIncludeTriggerActions(options);

    for (const rawField of fields) {
        const normalized = normalizeField({
            ...rawField,
            id: makeId(),
            enabled: rawField?.enabled !== false,
            triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
            triggerActionGenerationId: 0,
            triggerActionEnabledByGeneration: false,
            keywordMode: normalizeKeywordMode(rawField?.keywordMode),
        }, {
            ...options,
            includeTriggerActions,
        });

        normalized.name = getUniqueFieldName(nameContext, normalized.name);
        nameContext.push(normalized);
        result.push(normalized);
    }

    return result;
}

function prepareImportedPersonaFields(fields, existingFields = []) {
    return prepareImportedFields(fields, existingFields, {
        targetScope: TARGET_SCOPE.PERSONA,
        includeTriggerActions: false,
    });
}

function prepareImportedCharacterFields(fields, existingFields = []) {
    return prepareImportedFields(fields, existingFields, {
        targetScope: TARGET_SCOPE.CHARACTER,
        includeTriggerActions: true,
    });
}

// -----------------------------------------------------------------------------
// Field and State Model - Clean Import / Export Conversion
// -----------------------------------------------------------------------------

function exportFieldForJson(field, index = 0, options = {}) {
    const includeTriggerActions = shouldIncludeTriggerActions(options);
    const normalized = normalizeField(field, {
        ...options,
        includeTriggerActions,
    });

    const payload = {
        order: index + 1,
        name: normalized.name,
        inject: normalized.enabled,
        triggerSources: normalized.triggerSources,
        activatingKeywordMode: normalized.activatingKeywordMode,
        enablingKeywordMode: normalized.enablingKeywordMode,
        disablingKeywordMode: normalized.disablingKeywordMode,
        activatingTriggers: splitKeywords(normalized.activatingTriggers),
        enablingTriggers: splitKeywords(normalized.enablingTriggers),
        disablingTriggers: splitKeywords(normalized.disablingTriggers),
        content: splitLinesForJson(normalized.content),
    };

    if (includeTriggerActions) {
        payload.triggerActionInstruction = splitLinesForJson(normalized.triggerActionInstruction);
    }

    return payload;
}

function exportCharacterFieldForJson(field, index = 0) {
    return exportFieldForJson(field, index, {
        targetScope: TARGET_SCOPE.CHARACTER,
        includeTriggerActions: true,
    });
}

function exportPersonaFieldForJson(field, index = 0) {
    return exportFieldForJson(field, index, {
        targetScope: TARGET_SCOPE.PERSONA,
        includeTriggerActions: false,
    });
}

function importFieldFromJson(field = {}, options = {}) {
    const includeTriggerActions = shouldIncludeTriggerActions(options);
    const enabled = hasOwn(field, 'inject')
        ? Boolean(field.inject)
        : field.enabled !== false;

    const activatingTriggers = field.activatingTriggers ?? field.keywords ?? '';

    return normalizeField({
        id: makeId(),
        enabled,
        name: String(field.name ?? ''),
        activatingTriggers: Array.isArray(activatingTriggers)
            ? activatingTriggers.map((keyword) => String(keyword ?? '')).join('\n')
            : String(activatingTriggers ?? ''),
        enablingTriggers: Array.isArray(field.enablingTriggers)
            ? field.enablingTriggers.map((keyword) => String(keyword ?? '')).join('\n')
            : String(field.enablingTriggers ?? ''),
        disablingTriggers: Array.isArray(field.disablingTriggers)
            ? field.disablingTriggers.map((keyword) => String(keyword ?? '')).join('\n')
            : String(field.disablingTriggers ?? ''),
        triggerSources: normalizeTriggerSources(field.triggerSources),
        activatingKeywordMode: normalizeKeywordMode(field.activatingKeywordMode ?? field.keywordMode),
        enablingKeywordMode: normalizeKeywordMode(field.enablingKeywordMode ?? field.keywordMode),
        disablingKeywordMode: normalizeKeywordMode(field.disablingKeywordMode ?? field.keywordMode),
        triggerActionInstruction: includeTriggerActions ? joinLinesFromJson(field.triggerActionInstruction) : '',
        triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
        triggerActionGenerationId: 0,
        triggerActionEnabledByGeneration: false,
        content: joinLinesFromJson(field.content),
    }, {
        ...options,
        includeTriggerActions,
    });
}

function importCharacterFieldFromJson(field = {}) {
    return importFieldFromJson(field, {
        targetScope: TARGET_SCOPE.CHARACTER,
        includeTriggerActions: true,
    });
}

function importPersonaFieldFromJson(field = {}) {
    return importFieldFromJson(field, {
        targetScope: TARGET_SCOPE.PERSONA,
        includeTriggerActions: false,
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

function areFieldsRemovedForPersona(personaId) {
    const state = readPersonaState(personaId);
    return state.fields.length === 0;
}

function areFieldsRemovedForPersonas(personaIds) {
    return personaIds.length > 0 && personaIds.every((personaId) => areFieldsRemovedForPersona(personaId));
}

function getComparableField(field, options = {}) {
    const includeTriggerActions = shouldIncludeTriggerActions(options);
    const normalized = normalizeField(field, {
        ...options,
        includeTriggerActions,
    });

    const comparable = {
        enabled: normalized.enabled,
        name: normalized.name,
        activatingTriggers: normalized.activatingTriggers,
        enablingTriggers: normalized.enablingTriggers,
        disablingTriggers: normalized.disablingTriggers,
        triggerSources: normalized.triggerSources,
        activatingKeywordMode: normalized.activatingKeywordMode,
        enablingKeywordMode: normalized.enablingKeywordMode,
        disablingKeywordMode: normalized.disablingKeywordMode,
        content: normalized.content,
    };

    if (includeTriggerActions) {
        comparable.triggerActionInstruction = normalized.triggerActionInstruction;
        comparable.triggerActionPhase = normalized.triggerActionPhase;
        comparable.triggerActionGenerationId = normalized.triggerActionGenerationId;
        comparable.triggerActionEnabledByGeneration = normalized.triggerActionEnabledByGeneration;
    }

    return comparable;
}

function areFieldsOutOfBox(fields, options = {}) {
    const includeTriggerActions = shouldIncludeTriggerActions(options);
    const normalizedFields = Array.isArray(fields)
        ? fields.map((field) => normalizeField(field, { ...options, includeTriggerActions }))
        : [];

    const defaultFields = createDefaultFields()
        .map((field) => normalizeField(field, { ...options, includeTriggerActions }));

    if (normalizedFields.length !== defaultFields.length) {
        return false;
    }

    return normalizedFields.every((field, index) => {
        const actual = getComparableField(field, { ...options, includeTriggerActions });
        const expected = getComparableField(defaultFields[index], { ...options, includeTriggerActions });

        return JSON.stringify(actual) === JSON.stringify(expected);
    });
}

function isStateOutOfBox(state) {
    const normalized = normalizeCharacterState(state);

    return (
        normalized.swapEnabled === false &&
        areFieldsOutOfBox(normalized.fields, {
            targetScope: TARGET_SCOPE.CHARACTER,
            includeTriggerActions: true,
        })
    );
}

function isPersonaStateOutOfBox(state) {
    const normalized = normalizePersonaState(state);

    return (
        normalized.swapEnabled === false &&
        areFieldsOutOfBox(normalized.fields, {
            targetScope: TARGET_SCOPE.PERSONA,
            includeTriggerActions: false,
        })
    );
}

function isCharacterOutOfBox(characterId) {
    return isStateOutOfBox(readState(characterId));
}

function areCharactersOutOfBox(characterIds) {
    return characterIds.length > 0 && characterIds.every((characterId) => isCharacterOutOfBox(characterId));
}

function isPersonaOutOfBox(personaId) {
    return isPersonaStateOutOfBox(readPersonaState(personaId));
}

function arePersonasOutOfBox(personaIds) {
    return personaIds.length > 0 && personaIds.every((personaId) => isPersonaOutOfBox(personaId));
}

// ============================================================================
// Section 6. Character and Persona Extension Persistence
// ============================================================================
// Purpose:
// - Own reading, caching, and saving per-character Aspect: Evolutia data.
// - Own reading, caching, and saving per-persona Aspect: Evolutia data.
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
    const state = normalizeCharacterState(rawState);

    stateCache.set(key, state);
    return clone(state);
}

function cacheState(characterId, state) {
    const normalized = normalizeCharacterState(state);
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
        await ctx.writeExtensionField(characterId, MODULE_NAME, normalizeCharacterState(state));
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to save character extension data:`, error);
        notify('error', 'Failed to save Aspect: Evolutia character fields.');
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
        notify('warning', 'Select a character before editing Character Dynamic Fields.');
        return;
    }

    const state = readState(characterId);
    mutator(state);

    const normalized = normalizeCharacterState(state);
    scheduleSave(characterId, normalized);

    if (rerender) {
        renderPanel();
    } else {
        applyUiVisibility();
    }

    if (syncPromptManager) {
        syncPromptManagerForState(normalized);
    }

    updateTokenEstimate();
    updateSettingsActionState();
}

// -----------------------------------------------------------------------------
// Persona Extension Persistence - Read and Cache
// -----------------------------------------------------------------------------

function readPersonaState(personaId = getActivePersonaId()) {
    const key = getPersonaCacheKey(personaId);

    if (personaStateCache.has(key)) {
        return clone(personaStateCache.get(key));
    }

    const rawState = getPersonaExtensionStateRecord(personaId);
    const state = normalizePersonaState(rawState);

    personaStateCache.set(key, state);
    return clone(state);
}

function cachePersonaState(personaId, state) {
    const normalized = normalizePersonaState(state);
    personaStateCache.set(getPersonaCacheKey(personaId), normalized);
    return clone(normalized);
}

function clearPersonaStateCache(personaId = undefined) {
    if (personaId === undefined || personaId === null || personaId === '') {
        personaStateCache.clear();
        return;
    }

    personaStateCache.delete(getPersonaCacheKey(personaId));
}

// -----------------------------------------------------------------------------
// Persona Extension Persistence - Save
// -----------------------------------------------------------------------------

async function savePersonaStateNow(personaId, state) {
    const normalizedPersonaId = normalizePersonaId(personaId);

    if (!normalizedPersonaId) {
        return;
    }

    const normalizedState = normalizePersonaState(state);
    const savedToSettings = setPersonaExtensionStateRecord(normalizedPersonaId, normalizedState);

    if (!savedToSettings) {
        notify('error', 'Persona settings are unavailable in this SillyTavern build.');
        return;
    }

    cachePersonaState(normalizedPersonaId, normalizedState);

    try {
        const saveSettingsDebounced = getSaveSettingsDebounced();

        if (typeof saveSettingsDebounced === 'function') {
            saveSettingsDebounced();
            return;
        }

        const ctx = getContext();

        if (typeof ctx?.saveSettings === 'function') {
            await ctx.saveSettings();
            return;
        }

        if (typeof globalThis.saveSettings === 'function') {
            await globalThis.saveSettings();
            return;
        }

        if (typeof ctx?.saveSettingsDebounced === 'function') {
            ctx.saveSettingsDebounced();
            return;
        }

        console.warn(`[${MODULE_NAME}] Persona Dynamic Fields were cached, but no settings save hook was found.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to save persona extension data:`, error);
        notify('error', 'Failed to save Aspect: Evolutia persona fields.');
    }
}

function schedulePersonaSave(personaId, state) {
    const normalizedPersonaId = normalizePersonaId(personaId);

    if (!normalizedPersonaId) {
        return;
    }

    const normalized = cachePersonaState(normalizedPersonaId, state);

    clearTimeout(personaSaveTimer);
    personaSaveTimer = setTimeout(() => {
        savePersonaStateNow(normalizedPersonaId, normalized);
    }, 400);
}

function updatePersonaState(mutator, { rerender = false, syncPromptManager = false } = {}) {
    const personaId = getActivePersonaId();

    if (!personaId) {
        notify('warning', 'Select a persona before editing Persona Dynamic Fields.');
        return;
    }

    const state = readPersonaState(personaId);
    mutator(state);

    const normalized = normalizePersonaState(state);
    schedulePersonaSave(personaId, normalized);

    if (rerender) {
        renderPersonaPanel();
    } else {
        applyPersonaUiVisibility();
    }

    if (syncPromptManager) {
        syncPromptManagerForPersonaState(normalized);
    }

    updatePersonaTokenEstimate();
    updateSettingsActionState();
}

// -----------------------------------------------------------------------------
// Character and Persona Extension Persistence - Bulk Cache Utilities
// -----------------------------------------------------------------------------

function clearAllStateCaches() {
    stateCache.clear();
    personaStateCache.clear();
}

function clearRuntimeCachesForCharacterAndPersona() {
    clearAllStateCaches();
    clearAllPreparedPrompts();
    clearGenerationLifecycle();
}

// ============================================================================
// Section 7. Current Input Tracking
// ============================================================================
// Purpose:
// - Own trigger source text collection for Dynamic Field trigger matching.
// ============================================================================

// -----------------------------------------------------------------------------
// Trigger Source Text Collection - Generic Text Extraction
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

function stringifyTriggerSourceValue(value, seen = new WeakSet()) {
    if (value === undefined || value === null) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (Array.isArray(value)) {
        return value
            .map((entry) => stringifyTriggerSourceValue(entry, seen))
            .filter(Boolean)
            .join('\n');
    }

    if (typeof value === 'object') {
        if (seen.has(value)) {
            return '';
        }

        seen.add(value);

        const preferredText = [
            value.content,
            value.text,
            value.message,
            value.mes,
            value.prompt,
            value.value,
            value.entries,
            value.entry,
        ]
            .map((entry) => stringifyTriggerSourceValue(entry, seen))
            .filter(Boolean)
            .join('\n');

        if (preferredText) {
            return preferredText;
        }

        return Object.values(value)
            .map((entry) => stringifyTriggerSourceValue(entry, seen))
            .filter(Boolean)
            .join('\n');
    }

    return '';
}

// -----------------------------------------------------------------------------
// Trigger Source Text Collection - Chat Message Classification
// -----------------------------------------------------------------------------

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

function isAssistantChatMessage(message) {
    if (!message || typeof message !== 'object') {
        return false;
    }

    if (message.is_system || message.system || message.is_narrator) {
        return false;
    }

    if (message.is_user === true) {
        return false;
    }

    if (String(message.role || '').toLowerCase() === 'assistant') {
        return true;
    }

    const characterName = getCharacterName();

    if (characterName && String(message.name || '').trim() === characterName) {
        return true;
    }

    return false;
}

function isSystemChatMessage(message) {
    if (!message || typeof message !== 'object') {
        return false;
    }

    return Boolean(
        message.is_system ||
        message.system ||
        String(message.role || '').toLowerCase() === 'system',
    );
}

// -----------------------------------------------------------------------------
// Trigger Source Text Collection - Chat Source Readers
// -----------------------------------------------------------------------------

function getChatSource(chatOverride) {
    if (Array.isArray(chatOverride)) {
        return chatOverride;
    }

    const ctx = getContext();
    return Array.isArray(ctx?.chat) ? ctx.chat : [];
}

function getLatestMatchingChatMessageText(predicate, chatOverride) {
    const chat = getChatSource(chatOverride);

    for (let index = chat.length - 1; index >= 0; index -= 1) {
        const message = chat[index];

        if (!predicate(message)) {
            continue;
        }

        const text = getChatMessageText(message);

        if (text) {
            return text;
        }
    }

    return '';
}

function getLastUserMessageText(chatOverride) {
    return getLatestMatchingChatMessageText(isUserChatMessage, chatOverride);
}

function getLastAssistantMessageText(chatOverride) {
    return getLatestMatchingChatMessageText(isAssistantChatMessage, chatOverride);
}

function getSystemChatMessagesText(chatOverride) {
    return getChatSource(chatOverride)
        .filter(isSystemChatMessage)
        .map(getChatMessageText)
        .filter(Boolean)
        .join('\n');
}

// -----------------------------------------------------------------------------
// Trigger Source Text Collection - Prompt and World Info Source Readers
// -----------------------------------------------------------------------------

function getQuietPromptText() {
    const ctx = getContext();

    const candidates = [
        ctx?.extensionPrompts,
        ctx?.quietPrompts,
        ctx?.quiet_prompts,
        ctx?.promptBias,
        ctx?.prompt_bias,
    ];

    return candidates
        .map((candidate) => stringifyTriggerSourceValue(candidate))
        .filter(Boolean)
        .join('\n');
}

function getSystemPromptText(chatOverride) {
    const manager = getPromptManagerInstance?.();
    const promptOrder = getPromptOrder?.(manager) || [];

    const promptManagerText = promptOrder
        .filter((entry) => entry?.enabled !== false)
        .map((entry) => {
            const prompt = manager?.getPromptById?.(entry.identifier);
            const role = String(prompt?.role || '').toLowerCase();

            if (role !== 'system') {
                return '';
            }

            return stringifyTriggerSourceValue(prompt?.content);
        })
        .filter(Boolean)
        .join('\n');

    return [
        getSystemChatMessagesText(chatOverride),
        promptManagerText,
    ]
        .filter(Boolean)
        .join('\n');
}

function getWorldInfoLorebookText() {
    const ctx = getContext();

    const candidates = [
        ctx?.worldInfo,
        ctx?.world_info,
        ctx?.worldInfoCache,
        ctx?.world_info_cache,
        ctx?.activatedWorldInfo,
        ctx?.activated_world_info,
        ctx?.wiEntries,
        ctx?.wi_entries,
        ctx?.lorebooks,
        ctx?.loreBooks,
        ctx?.activatedLorebooks,
        ctx?.activated_lorebooks,
        ctx?.lorebookEntries,
        ctx?.lorebook_entries,
    ];

    return candidates
        .map((candidate) => stringifyTriggerSourceValue(candidate))
        .filter(Boolean)
        .join('\n');
}

// -----------------------------------------------------------------------------
// Trigger Source Text Collection - Source Dispatcher
// -----------------------------------------------------------------------------

function getTriggerSourceText(source, chatOverride) {
    if (source === TRIGGER_SOURCE.QUIET_PROMPTS) {
        return getQuietPromptText();
    }

    if (source === TRIGGER_SOURCE.SYSTEM_PROMPTS) {
        return getSystemPromptText(chatOverride);
    }

    if (source === TRIGGER_SOURCE.LAST_ASSISTANT_MESSAGE) {
        return getLastAssistantMessageText(chatOverride);
    }

    if (source === TRIGGER_SOURCE.LAST_USER_MESSAGE) {
        return getLastUserMessageText(chatOverride);
    }

    if (source === TRIGGER_SOURCE.WORLD_INFO_LOREBOOKS) {
        return getWorldInfoLorebookText();
    }

    return '';
}

function buildScanText(triggerSources = DEFAULT_TRIGGER_SOURCES, chatOverride = undefined) {
    const sources = normalizeTriggerSources(triggerSources);

    return sources
        .map((source) => getTriggerSourceText(source, chatOverride))
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
}

// ============================================================================
// Section 8. Dynamic Field Matching and Prompt Assembly
// ============================================================================
// Purpose:
// - Own keyword matching, trigger-action handling, prepared prompt text, and macro reads.
// ============================================================================

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Trigger Matching
// -----------------------------------------------------------------------------

function splitKeywords(rawKeywords) {
    return String(rawKeywords || '')
        .split(/\r?\n|[,;]/g)
        .map((keyword) => keyword.trim())
        .filter(Boolean);
}

function triggerListMatches(rawTriggers, scanText, keywordMode = KEYWORD_MODE.ALL) {
    const triggers = splitKeywords(rawTriggers);

    if (!triggers.length) {
        return false;
    }

    const loweredTriggers = triggers.map((trigger) => trigger.toLowerCase());

    if (keywordMode === KEYWORD_MODE.ALL) {
        return loweredTriggers.every((trigger) => scanText.includes(trigger));
    }

    return loweredTriggers.some((trigger) => scanText.includes(trigger));
}

function activationTriggersAreSatisfied(field, scanText, options = {}) {
    const normalized = normalizeField(field, options);
    const triggers = splitKeywords(normalized.activatingTriggers);

    if (!triggers.length) {
        return true;
    }

    return triggerListMatches(
        normalized.activatingTriggers,
        scanText,
        normalized.activatingKeywordMode,
    );
}

function activationTriggersFired(field, scanText, options = {}) {
    const normalized = normalizeField(field, options);

    if (!splitKeywords(normalized.activatingTriggers).length) {
        return false;
    }

    return triggerListMatches(
        normalized.activatingTriggers,
        scanText,
        normalized.activatingKeywordMode,
    );
}

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Prepared Prompt Cache
// -----------------------------------------------------------------------------

function getPreparedPromptCacheKey(targetScope = TARGET_SCOPE.CHARACTER, entityId = undefined) {
    const scope = targetScope === TARGET_SCOPE.PERSONA ? TARGET_SCOPE.PERSONA : TARGET_SCOPE.CHARACTER;

    if (scope === TARGET_SCOPE.PERSONA) {
        return `${scope}:${getPersonaCacheKey(entityId)}`;
    }

    return `${scope}:${getCacheKey(entityId)}`;
}

function setPreparedPromptForTarget(targetScope, entityId, generationId, prompt) {
    preparedPromptCache.set(getPreparedPromptCacheKey(targetScope, entityId), {
        targetScope,
        entityId,
        generationId,
        prompt: String(prompt || ''),
    });
}

function getPreparedPromptForTarget(targetScope, entityId) {
    const prepared = preparedPromptCache.get(getPreparedPromptCacheKey(targetScope, entityId));
    return String(prepared?.prompt || '');
}

function clearPreparedPromptForTarget(targetScope, entityId) {
    preparedPromptCache.delete(getPreparedPromptCacheKey(targetScope, entityId));
}

function setPreparedPrompt(characterId, generationId, prompt) {
    setPreparedPromptForTarget(TARGET_SCOPE.CHARACTER, characterId, generationId, prompt);
}

function getPreparedPrompt(characterId = getMacroCharacterId()) {
    return getPreparedPromptForTarget(TARGET_SCOPE.CHARACTER, characterId);
}

function clearPreparedPrompt(characterId = getMacroCharacterId()) {
    clearPreparedPromptForTarget(TARGET_SCOPE.CHARACTER, characterId);
}

function setPreparedPersonaPrompt(personaId, generationId, prompt) {
    setPreparedPromptForTarget(TARGET_SCOPE.PERSONA, personaId, generationId, prompt);
}

function getPreparedPersonaPrompt(personaId = getMacroPersonaId()) {
    return getPreparedPromptForTarget(TARGET_SCOPE.PERSONA, personaId);
}

function clearPreparedPersonaPrompt(personaId = getMacroPersonaId()) {
    clearPreparedPromptForTarget(TARGET_SCOPE.PERSONA, personaId);
}

function clearAllPreparedPrompts() {
    preparedPromptCache.clear();
}

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Trigger Action State
// -----------------------------------------------------------------------------

function applyMutableFieldState(field, updates) {
    Object.assign(field, updates);
}

function resetTriggerActionLifecycle(field) {
    applyMutableFieldState(field, {
        triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
        triggerActionGenerationId: 0,
        triggerActionEnabledByGeneration: false,
    });
}

function markTriggerActionInjectedForGeneration(field, generationId, enabledByGeneration = false) {
    applyMutableFieldState(field, {
        triggerActionPhase: TRIGGER_ACTION_PHASE.ACTION_INJECTED,
        triggerActionGenerationId: generationId,
        triggerActionEnabledByGeneration: Boolean(enabledByGeneration),
    });
}

function markContentReadyForNextGeneration(field, generationId, enabledByGeneration = false) {
    applyMutableFieldState(field, {
        triggerActionPhase: TRIGGER_ACTION_PHASE.CONTENT_READY,
        triggerActionGenerationId: generationId,
        triggerActionEnabledByGeneration: Boolean(enabledByGeneration),
    });
}

function isActionInjectedForThisGeneration(field, generationId) {
    const normalized = normalizeCharacterField(field);

    return (
        normalized.triggerActionPhase === TRIGGER_ACTION_PHASE.ACTION_INJECTED &&
        normalized.triggerActionGenerationId === generationId
    );
}

function isActionInjectedFromEarlierGeneration(field, generationId) {
    const normalized = normalizeCharacterField(field);

    return (
        normalized.triggerActionPhase === TRIGGER_ACTION_PHASE.ACTION_INJECTED &&
        normalized.triggerActionGenerationId > 0 &&
        normalized.triggerActionGenerationId !== generationId
    );
}

function isContentReadyForThisGeneration(field, generationId) {
    const normalized = normalizeCharacterField(field);

    return (
        normalized.triggerActionPhase === TRIGGER_ACTION_PHASE.CONTENT_READY &&
        normalized.triggerActionGenerationId !== generationId
    );
}

function isContentLockedUntilNextGeneration(field, generationId) {
    const normalized = normalizeCharacterField(field);

    return (
        normalized.triggerActionPhase === TRIGGER_ACTION_PHASE.CONTENT_READY &&
        normalized.triggerActionGenerationId === generationId
    );
}

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Entry Selection
// -----------------------------------------------------------------------------

function buildFieldPromptEntriesForGeneration(state, {
    targetScope = TARGET_SCOPE.CHARACTER,
    characterId,
    personaId,
    generationId,
    chat,
    mutate = false,
} = {}) {
    const entries = [];
    let changed = false;
    const isPersona = targetScope === TARGET_SCOPE.PERSONA;
    const normalizeForTarget = isPersona ? normalizePersonaField : normalizeCharacterField;

    for (const field of state.fields) {
        const normalized = normalizeForTarget(field);
        const scanText = buildScanText(normalized.triggerSources, chat);
        const content = normalized.content.trim();
        const triggerActionInstruction = isPersona ? '' : normalized.triggerActionInstruction.trim();

        const disablingTriggered = triggerListMatches(
            normalized.disablingTriggers,
            scanText,
            normalized.disablingKeywordMode,
        );

        if (disablingTriggered) {
            if (mutate && (
                field.enabled !== false ||
                normalized.triggerActionPhase !== TRIGGER_ACTION_PHASE.IDLE ||
                normalized.triggerActionGenerationId !== 0 ||
                normalized.triggerActionEnabledByGeneration !== false
            )) {
                applyMutableFieldState(field, { enabled: false });
                resetTriggerActionLifecycle(field);
                changed = true;
            }

            continue;
        }

        const enablingTriggered = triggerListMatches(
            normalized.enablingTriggers,
            scanText,
            normalized.enablingKeywordMode,
        );

        const enablingTransition = normalized.enabled === false && enablingTriggered;
        const activatingTriggered = activationTriggersFired(normalized, scanText, {
            targetScope,
            includeTriggerActions: !isPersona,
        });
        const activationSatisfied = activationTriggersAreSatisfied(normalized, scanText, {
            targetScope,
            includeTriggerActions: !isPersona,
        });

        // Enabling Triggers turn Inject on.
        //
        // Characters:
        // - If Trigger Actions has text, Trigger Action must inject first and Content
        //   must wait until the next completed generation.
        // - If Trigger Actions is empty, Content may inject immediately if normal
        //   content conditions allow it.
        //
        // Personas:
        // - Trigger Actions are intentionally unsupported.
        // - Enabling Triggers simply turn Inject on, and Content may inject immediately
        //   if normal content conditions allow it.
        if (enablingTransition) {
            if (mutate) {
                applyMutableFieldState(field, { enabled: true });
                resetTriggerActionLifecycle(field);
                changed = true;
            }

            if (!isPersona && triggerActionInstruction) {
                entries.push(formatTriggerActionForPrompt(normalized, triggerActionInstruction));

                if (mutate) {
                    markTriggerActionInjectedForGeneration(field, generationId, true);
                    changed = true;
                }

                continue;
            }

            if (content && activationSatisfied) {
                entries.push(formatFieldForPrompt(normalized));
            }

            continue;
        }

        if (isPersona) {
            if (!normalized.enabled || !content) {
                continue;
            }

            if (activationSatisfied) {
                entries.push(formatFieldForPrompt(normalized));
            }

            continue;
        }

        // If Trigger Action already emitted during this generation, repeated prompt
        // preparation for the same generation must keep returning Trigger Action,
        // never Content.
        if (isActionInjectedForThisGeneration(normalized, generationId)) {
            if (triggerActionInstruction) {
                entries.push(formatTriggerActionForPrompt(normalized, triggerActionInstruction));
            } else if (mutate) {
                resetTriggerActionLifecycle(field);
                changed = true;
            }

            continue;
        }

        // If a prior generation emitted Trigger Action but the generation-end event
        // failed to promote it, recover by treating it as Content-ready now.
        if (isActionInjectedFromEarlierGeneration(normalized, generationId)) {
            if (normalized.enabled && content && activationSatisfied) {
                entries.push(formatFieldForPrompt(normalized));
            }

            if (mutate) {
                resetTriggerActionLifecycle(field);
                changed = true;
            }

            continue;
        }

        // If Content was made ready by a previous completed generation, inject it now.
        if (isContentReadyForThisGeneration(normalized, generationId)) {
            if (normalized.enabled && content && activationSatisfied) {
                entries.push(formatFieldForPrompt(normalized));
            }

            if (mutate) {
                resetTriggerActionLifecycle(field);
                changed = true;
            }

            continue;
        }

        // If Content was marked ready during this same generation, keep it locked.
        if (isContentLockedUntilNextGeneration(normalized, generationId)) {
            continue;
        }

        if (!normalized.enabled) {
            continue;
        }

        // Character Activating Triggers can fire Trigger Action repeatedly, but still
        // block same-generation Content when Trigger Action text exists.
        if (triggerActionInstruction && activatingTriggered) {
            entries.push(formatTriggerActionForPrompt(normalized, triggerActionInstruction));

            if (mutate) {
                markTriggerActionInjectedForGeneration(field, generationId, false);
                changed = true;
            }

            continue;
        }

        if (!content) {
            continue;
        }

        if (activationSatisfied) {
            entries.push(formatFieldForPrompt(normalized));
        }
    }

    return {
        entries,
        changed,
    };
}

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Prompt Formatting
// -----------------------------------------------------------------------------

function formatFieldForPrompt(field) {
    const normalized = normalizeField(field);
    const name = normalized.name.trim() || 'Unnamed Dynamic Field';
    const content = normalized.content.trim();

    return [
        `[DEFINITION: ${name}]`,
        content,
        `[END DEFINITION: ${name}]`,
    ].join('\n');
}

function formatTriggerActionForPrompt(field, instruction) {
    const normalized = normalizeCharacterField(field);

    return [
        `[TRIGGER ACTION]`,
        `You must ensure the following actions occur:`,
        instruction.trim(),
        `[END TRIGGER ACTION]`,
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
        `[END CHARACTER DEFINITIONS]`,
    ].join('\n');
}

function wrapPersonaDynamicFieldsPrompt(personaId, fieldText) {
    const personaName = getPersonaName(personaId);

    return [
        `[USER PERSONA DEFINITIONS]`,
        `These definitions apply only to ${personaName}.`,
        '',
        fieldText,
        '',
        `[END USER PERSONA DEFINITIONS]`,
    ].join('\n');
}

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Character Prompt Preparation
// -----------------------------------------------------------------------------

function prepareReplacementPromptForGeneration(characterId, generationId, chat, { mutate = true } = {}) {
    const state = readState(characterId);

    if (!state.swapEnabled) {
        return '';
    }

    const { entries, changed } = buildFieldPromptEntriesForGeneration(state, {
        targetScope: TARGET_SCOPE.CHARACTER,
        characterId,
        generationId,
        chat,
        mutate,
    });

    if (mutate && changed) {
        scheduleSave(characterId, state);

        setTimeout(() => {
            renderPanel();
            updateTokenEstimate();
            updateSettingsActionState();
        }, 0);
    }

    if (!entries.length) {
        return '';
    }

    return wrapDynamicFieldsPrompt(
        characterId,
        entries.join('\n\n'),
    );
}

function buildReplacementPrompt(characterId = getActiveCharacterId()) {
    return getPreparedPrompt(characterId);
}

function buildAspectEvolutiaMacroValue() {
    return buildAspectEvolutiaCharacterMacroValue();
}

function buildAspectEvolutiaCharacterMacroValue() {
    const characterId = getMacroCharacterId();
    const character = getCharacter(characterId);

    if (!character) {
        return '';
    }

    const state = readState(characterId);

    if (!state.swapEnabled) {
        return getNativeDescriptionForCharacter(character);
    }

    return getPreparedPrompt(characterId);
}

// -----------------------------------------------------------------------------
// Dynamic Field Matching and Prompt Assembly - Persona Prompt Preparation
// -----------------------------------------------------------------------------

function preparePersonaReplacementPromptForGeneration(personaId, generationId, chat, { mutate = true } = {}) {
    const normalizedPersonaId = normalizePersonaId(personaId);

    if (!normalizedPersonaId) {
        return '';
    }

    const state = readPersonaState(normalizedPersonaId);

    if (!state.swapEnabled) {
        return '';
    }

    const { entries, changed } = buildFieldPromptEntriesForGeneration(state, {
        targetScope: TARGET_SCOPE.PERSONA,
        personaId: normalizedPersonaId,
        generationId,
        chat,
        mutate,
    });

    if (mutate && changed) {
        schedulePersonaSave(normalizedPersonaId, state);

        setTimeout(() => {
            renderPersonaPanel();
            updatePersonaTokenEstimate();
            updateSettingsActionState();
        }, 0);
    }

    if (!entries.length) {
        return '';
    }

    return wrapPersonaDynamicFieldsPrompt(
        normalizedPersonaId,
        entries.join('\n\n'),
    );
}

function buildPersonaReplacementPrompt(personaId = getActivePersonaId()) {
    return getPreparedPersonaPrompt(personaId);
}

function buildAspectEvolutiaPersonaMacroValue() {
    const personaId = getMacroPersonaId();

    if (!personaId) {
        return '';
    }

    const state = readPersonaState(personaId);

    if (!state.swapEnabled) {
        return getNativePersonaDescriptionForPersona(personaId);
    }

    return getPreparedPersonaPrompt(personaId);
}

// ============================================================================
// Section 9. Prompt Manager Integration
// ============================================================================
// Purpose:
// - Own the custom Prompt Manager prompts and macros used as Description replacements.
// ============================================================================

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Macro Registration
// -----------------------------------------------------------------------------

function safelyRegisterMacro(name, handler, description) {
    try {
        MacrosParser.registerMacro(name, handler, description);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to register macro "${name}":`, error);
        notify('error', `Failed to register Aspect: Evolutia macro "${name}".`);
    }
}

function registerAspectMacro() {
    safelyRegisterMacro(
        CHARACTER_ASPECT_MACRO_NAME,
        () => buildAspectEvolutiaCharacterMacroValue(),
        'Aspect: Evolutia effective Character Description. Returns Character Dynamic Fields when enabled, otherwise the native Character Description.',
    );

    safelyRegisterMacro(
        PERSONA_ASPECT_MACRO_NAME,
        () => buildAspectEvolutiaPersonaMacroValue(),
        'Aspect: Evolutia effective Persona Description. Returns Persona Dynamic Fields when enabled, otherwise the native Persona Description.',
    );

    // Compatibility alias for earlier builds that used {{aspectEvolutiaDescription}}.
    // New Prompt Manager entries use {{aspectEvolutiaCharDescription}}.
    safelyRegisterMacro(
        'aspectEvolutiaDescription',
        () => buildAspectEvolutiaCharacterMacroValue(),
        'Legacy Aspect: Evolutia Character Description macro. Prefer {{aspectEvolutiaCharDescription}}.',
    );
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

function getPromptByName(manager, name) {
    if (!manager || !name) {
        return null;
    }

    if (typeof manager.getPromptCollection === 'function') {
        const collection = manager.getPromptCollection();

        if (collection && typeof collection === 'object') {
            const prompts = Array.isArray(collection)
                ? collection
                : Object.values(collection);

            const found = prompts.find((prompt) => String(prompt?.name || '') === name);

            if (found) {
                return found;
            }
        }
    }

    const serviceSettingsPrompts = manager.serviceSettings?.prompts;

    if (serviceSettingsPrompts && typeof serviceSettingsPrompts === 'object') {
        const prompts = Array.isArray(serviceSettingsPrompts)
            ? serviceSettingsPrompts
            : Object.values(serviceSettingsPrompts);

        const found = prompts.find((prompt) => String(prompt?.name || '') === name);

        if (found) {
            return found;
        }
    }

    return null;
}

function getPromptIdentifier(prompt, fallbackIdentifier = '') {
    return String(
        prompt?.identifier ??
        prompt?.id ??
        prompt?.name ??
        fallbackIdentifier ??
        '',
    );
}

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Prompt Creation
// -----------------------------------------------------------------------------

function getAspectPromptData({ name, macroText }) {
    return {
        name,
        role: 'system',
        content: macroText,
        system_prompt: false,
        marker: false,
        extension: true,
        injection_position: 0,
        injection_depth: 4,
        forbid_overrides: false,
    };
}

function ensurePromptExists(manager, promptId, promptData) {
    const existingPrompt = manager.getPromptById?.(promptId);

    if (existingPrompt) {
        Object.assign(existingPrompt, promptData);
        return existingPrompt;
    }

    manager.addPrompt(promptData, promptId);
    return manager.getPromptById?.(promptId);
}

function ensureCharacterAspectPromptExists(manager) {
    return ensurePromptExists(
        manager,
        CHARACTER_ASPECT_PROMPT_ID,
        getAspectPromptData({
            name: CHARACTER_ASPECT_PROMPT_NAME,
            macroText: CHARACTER_ASPECT_MACRO_TEXT,
        }),
    );
}

function ensurePersonaAspectPromptExists(manager) {
    return ensurePromptExists(
        manager,
        PERSONA_ASPECT_PROMPT_ID,
        getAspectPromptData({
            name: PERSONA_ASPECT_PROMPT_NAME,
            macroText: PERSONA_ASPECT_MACRO_TEXT,
        }),
    );
}

function ensureAspectPromptExists(manager) {
    return ensureCharacterAspectPromptExists(manager);
}

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Prompt Ordering
// -----------------------------------------------------------------------------

function ensurePromptOrderEntryNearNative(manager, {
    aspectPromptId,
    nativePromptId,
    fallbackPromptId,
    insertAfterFallback = false,
} = {}) {
    const order = getPromptOrder(manager);

    if (!order.length || !aspectPromptId) {
        return null;
    }

    const existingAspectIndex = order.findIndex((entry) => entry?.identifier === aspectPromptId);

    if (existingAspectIndex >= 0) {
        return order[existingAspectIndex];
    }

    const nativeIndex = nativePromptId
        ? order.findIndex((entry) => entry?.identifier === nativePromptId)
        : -1;

    const fallbackIndex = fallbackPromptId
        ? order.findIndex((entry) => entry?.identifier === fallbackPromptId)
        : -1;

    let insertIndex = 0;

    if (nativeIndex >= 0) {
        insertIndex = nativeIndex;
    } else if (fallbackIndex >= 0) {
        insertIndex = fallbackIndex + (insertAfterFallback ? 1 : 0);
    }

    const aspectEntry = {
        identifier: aspectPromptId,
        enabled: false,
    };

    order.splice(insertIndex, 0, aspectEntry);
    return aspectEntry;
}

function ensureCharacterAspectPromptOrderEntry(manager) {
    return ensurePromptOrderEntryNearNative(manager, {
        aspectPromptId: CHARACTER_ASPECT_PROMPT_ID,
        nativePromptId: NATIVE_DESCRIPTION_PROMPT_ID,
        fallbackPromptId: 'personaDescription',
        insertAfterFallback: true,
    });
}

function ensurePersonaAspectPromptOrderEntry(manager) {
    return ensurePromptOrderEntryNearNative(manager, {
        aspectPromptId: PERSONA_ASPECT_PROMPT_ID,
        nativePromptId: NATIVE_PERSONA_PROMPT_ID,
        fallbackPromptId: NATIVE_DESCRIPTION_PROMPT_ID,
        insertAfterFallback: false,
    });
}

function ensureAspectPromptOrderEntry(manager) {
    return ensureCharacterAspectPromptOrderEntry(manager);
}

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Legacy Prompt Cleanup
// -----------------------------------------------------------------------------

function disableLegacyAspectPromptIfPresent(manager) {
    const order = getPromptOrder(manager);

    if (!order.length) {
        return;
    }

    const legacyPromptIds = new Set([
        'aspectEvolutiaDescription',
    ]);

    for (const entry of order) {
        const identifier = String(entry?.identifier || '');

        if (legacyPromptIds.has(identifier)) {
            entry.enabled = false;
            continue;
        }

        const prompt = manager.getPromptById?.(identifier);

        if (
            String(prompt?.name || '') === 'Aspect: Evolutia Description' ||
            String(prompt?.content || '').trim() === '{{aspectEvolutiaDescription}}'
        ) {
            entry.enabled = false;
        }
    }
}

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Prompt Manager Save / Render
// -----------------------------------------------------------------------------

async function saveAndRenderPromptManager(manager) {
    if (typeof manager.saveServiceSettings === 'function') {
        await manager.saveServiceSettings();
    }

    if (typeof manager.render === 'function') {
        manager.render(false);
    }
}

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Character Prompt Toggling
// -----------------------------------------------------------------------------

async function syncPromptManagerForState(state) {
    const manager = getPromptManagerInstance();

    if (!manager) {
        notify('warning', 'Prompt Manager is unavailable. Character Dynamic Fields saved, but prompt toggles could not be synchronized.');
        return;
    }

    try {
        ensureCharacterAspectPromptExists(manager);

        const order = getPromptOrder(manager);

        if (!order.length) {
            notify('warning', 'Prompt Manager order is unavailable. Open Chat Completion Presets and try again.');
            return;
        }

        const aspectEntry = ensureCharacterAspectPromptOrderEntry(manager);
        const nativeEntry = getPromptOrderEntryById(order, NATIVE_DESCRIPTION_PROMPT_ID);

        if (!aspectEntry) {
            notify('warning', 'Could not create Char Description (Evolutia) Prompt Manager entry.');
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

        disableLegacyAspectPromptIfPresent(manager);

        await saveAndRenderPromptManager(manager);
        updateSettingsActionState();
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to synchronize Character Prompt Manager entry:`, error);
        notify('error', 'Failed to synchronize Character Dynamic Fields with Prompt Manager.');
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

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Persona Prompt Toggling
// -----------------------------------------------------------------------------

async function syncPromptManagerForPersonaState(state) {
    const personaId = getActivePersonaId();

    if (!personaId) {
        return;
    }

    const manager = getPromptManagerInstance();

    if (!manager) {
        notify('warning', 'Prompt Manager is unavailable. Persona Dynamic Fields saved, but prompt toggles could not be synchronized.');
        return;
    }

    if (state.swapEnabled && !isPersonaDescriptionInPromptManagerPosition(personaId)) {
        notify(
            'warning',
            'Persona Dynamic Fields currently support only the Persona Description Prompt Manager / story-string position. Switch the Persona Description position to Prompt Manager for injection.',
        );
    }

    try {
        ensurePersonaAspectPromptExists(manager);

        const order = getPromptOrder(manager);

        if (!order.length) {
            notify('warning', 'Prompt Manager order is unavailable. Open Chat Completion Presets and try again.');
            return;
        }

        const aspectEntry = ensurePersonaAspectPromptOrderEntry(manager);
        const nativeEntry = getPromptOrderEntryById(order, NATIVE_PERSONA_PROMPT_ID);

        if (!aspectEntry) {
            notify('warning', 'Could not create Persona Description (Evolutia) Prompt Manager entry.');
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
        console.error(`[${MODULE_NAME}] Failed to synchronize Persona Prompt Manager entry:`, error);
        notify('error', 'Failed to synchronize Persona Dynamic Fields with Prompt Manager.');
    }
}

async function syncPromptManagerWithActivePersonaState() {
    const personaId = getActivePersonaId();

    if (!personaId) {
        return;
    }

    const state = readPersonaState(personaId);
    await syncPromptManagerForPersonaState(state);
}

// -----------------------------------------------------------------------------
// Prompt Manager Integration - Combined Sync Helpers
// -----------------------------------------------------------------------------

async function syncPromptManagerWithActiveStates() {
    await syncPromptManagerWithActiveState();
    await syncPromptManagerWithActivePersonaState();
}

// ============================================================================
// Section 10. Description Safety Cleanup
// ============================================================================
// Purpose:
// - Own cleanup for legacy in-memory Description suppression backups.
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
// - Own the local Dynamic Fields token badges shown when Dynamic Fields are active.
// ============================================================================

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Shared Preview Helpers
// -----------------------------------------------------------------------------

function getPreviewGenerationId() {
    return currentGenerationId || generationSerial + 1;
}

function getCurrentChatForTokenPreview() {
    const ctx = getContext();
    return Array.isArray(ctx?.chat) ? ctx.chat : [];
}

async function getTokenCountForPrompt(prompt) {
    const ctx = getContext();

    if (!prompt) {
        return 0;
    }

    if (typeof ctx?.getTokenCountAsync !== 'function') {
        return null;
    }

    return ctx.getTokenCountAsync(prompt, 0);
}

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Character Preview Prompt
// -----------------------------------------------------------------------------

function buildDynamicTokenPreviewPrompt(characterId = getActiveCharacterId()) {
    if (characterId === undefined || characterId === null || characterId === '') {
        return '';
    }

    const state = readState(characterId);

    if (!state.swapEnabled) {
        return '';
    }

    return prepareReplacementPromptForGeneration(
        characterId,
        getPreviewGenerationId(),
        getCurrentChatForTokenPreview(),
        {
            mutate: false,
        },
    );
}

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Persona Preview Prompt
// -----------------------------------------------------------------------------

function buildPersonaDynamicTokenPreviewPrompt(personaId = getActivePersonaId()) {
    const normalizedPersonaId = normalizePersonaId(personaId);

    if (!normalizedPersonaId) {
        return '';
    }

    const state = readPersonaState(normalizedPersonaId);

    if (!state.swapEnabled) {
        return '';
    }

    return preparePersonaReplacementPromptForGeneration(
        normalizedPersonaId,
        getPreviewGenerationId(),
        getCurrentChatForTokenPreview(),
        {
            mutate: false,
        },
    );
}

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Character Calculation
// -----------------------------------------------------------------------------

async function getDynamicTokenCount(characterId = getActiveCharacterId()) {
    const prompt = buildDynamicTokenPreviewPrompt(characterId);
    return getTokenCountForPrompt(prompt);
}

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Persona Calculation
// -----------------------------------------------------------------------------

async function getPersonaDynamicTokenCount(personaId = getActivePersonaId()) {
    const prompt = buildPersonaDynamicTokenPreviewPrompt(personaId);
    return getTokenCountForPrompt(prompt);
}

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Character Rendering
// -----------------------------------------------------------------------------

async function updateTokenEstimate() {
    const characterId = getActiveCharacterId();
    const $token = $(`#${UI.TOKEN_ID}`);

    if (!$token.length) {
        return;
    }

    if (characterId === undefined || characterId === null || characterId === '') {
        $token.text('');
        return;
    }

    const state = readState(characterId);

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

        console.warn(`[${MODULE_NAME}] Failed to estimate Character Dynamic Fields tokens:`, error);
        $token.text('Tokens: unavailable');
    }
}

// -----------------------------------------------------------------------------
// Dynamic Token Estimate - Persona Rendering
// -----------------------------------------------------------------------------

async function updatePersonaTokenEstimate() {
    const personaId = getActivePersonaId();
    const $token = $(`#${UI.PERSONA_TOKEN_ID}`);

    if (!$token.length) {
        return;
    }

    if (!personaId) {
        $token.text('');
        return;
    }

    const state = readPersonaState(personaId);

    if (!state.swapEnabled) {
        $token.text('');
        return;
    }

    const serial = ++personaTokenUpdateSerial;
    $token.text('Tokens: …');

    try {
        const count = await getPersonaDynamicTokenCount(personaId);

        if (serial !== personaTokenUpdateSerial) {
            return;
        }

        if (count === null) {
            $token.text('Tokens: unavailable');
            return;
        }

        $token.text(`Tokens: ${count}`);
    } catch (error) {
        if (serial !== personaTokenUpdateSerial) {
            return;
        }

        console.warn(`[${MODULE_NAME}] Failed to estimate Persona Dynamic Fields tokens:`, error);
        $token.text('Tokens: unavailable');
    }
}

// ============================================================================
// Section 12. Import / Export
// ============================================================================
// Purpose:
// - Own Import and Export menu actions for Character Dynamic Fields.
// - Own Import and Export menu actions for Persona Dynamic Fields.
// ============================================================================

// -----------------------------------------------------------------------------
// Import / Export - Dynamic Field Payload Handling
// -----------------------------------------------------------------------------

function buildDynamicFieldsExportPayload(characterId = getActiveCharacterId()) {
    const state = readState(characterId);

    return {
        type: 'aspect_evolutia_character_dynamic_fields',
        version: 1,
        fields: state.fields.map(exportCharacterFieldForJson),
    };
}

function buildPersonaDynamicFieldsExportPayload(personaId = getActivePersonaId()) {
    const state = readPersonaState(personaId);

    return {
        type: 'aspect_evolutia_persona_dynamic_fields',
        version: 1,
        fields: state.fields.map(exportPersonaFieldForJson),
    };
}

function getFieldArrayFromPayloadSource(source) {
    if (Array.isArray(source)) {
        return source;
    }

    if (!source || typeof source !== 'object') {
        return [];
    }

    if (Array.isArray(source.fields)) {
        return source.fields;
    }

    const directExtensionState =
        source?.data?.extensions?.[MODULE_NAME] ??
        source?.extensions?.[MODULE_NAME] ??
        source?.character?.data?.extensions?.[MODULE_NAME];

    if (Array.isArray(directExtensionState?.fields)) {
        return directExtensionState.fields;
    }

    const personaExtensionStates =
        source?.[MODULE_NAME]?.[PERSONA_STATE_SETTINGS_KEY] ??
        source?.settings?.[MODULE_NAME]?.[PERSONA_STATE_SETTINGS_KEY] ??
        source?.power_user?.[MODULE_NAME]?.[PERSONA_STATE_SETTINGS_KEY];

    if (personaExtensionStates && typeof personaExtensionStates === 'object') {
        const allPersonaFields = Object.values(personaExtensionStates)
            .flatMap((state) => Array.isArray(state?.fields) ? state.fields : []);

        if (allPersonaFields.length) {
            return allPersonaFields;
        }
    }

    return [];
}

function parseDynamicFieldsPayload(payload) {
    return typeof payload === 'string' ? JSON.parse(payload) : payload;
}

function getFieldsFromDynamicFieldsPayload(payload) {
    const source = parseDynamicFieldsPayload(payload);
    const fields = getFieldArrayFromPayloadSource(source);

    return fields.map(importCharacterFieldFromJson);
}

function getPersonaFieldsFromDynamicFieldsPayload(payload) {
    const source = parseDynamicFieldsPayload(payload);
    const fields = getFieldArrayFromPayloadSource(source);

    return fields.map(importPersonaFieldFromJson);
}

function filterImportableFields(fields) {
    return Array.isArray(fields)
        ? fields.map(normalizeField).filter((field) => field.content.trim() || field.name.trim())
        : [];
}

function filterImportableCharacterFields(fields) {
    return Array.isArray(fields)
        ? fields.map(normalizeCharacterField).filter((field) => field.content.trim() || field.name.trim())
        : [];
}

function filterImportablePersonaFields(fields) {
    return Array.isArray(fields)
        ? fields.map(normalizePersonaField).filter((field) => field.content.trim() || field.name.trim())
        : [];
}

function appendImportedFieldsToActiveCharacter(fields, successMessage) {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before importing Character Dynamic Fields.');
        return;
    }

    const normalizedFields = filterImportableCharacterFields(fields);

    if (!normalizedFields.length) {
        notify('warning', 'No Character Dynamic Fields were found to import.');
        return;
    }

    updateState((state) => {
        const importedFields = prepareImportedCharacterFields(normalizedFields, state.fields);
        state.fields.push(...importedFields);
    }, { rerender: true });

    notify('success', successMessage || `Imported ${normalizedFields.length} Character Dynamic Field(s).`);
}

function appendImportedFieldsToActivePersona(fields, successMessage) {
    const personaId = getActivePersonaId();

    if (!personaId) {
        notify('warning', 'Select a persona before importing Persona Dynamic Fields.');
        return;
    }

    const normalizedFields = filterImportablePersonaFields(fields);

    if (!normalizedFields.length) {
        notify('warning', 'No Persona Dynamic Fields were found to import.');
        return;
    }

    updatePersonaState((state) => {
        const importedFields = prepareImportedPersonaFields(normalizedFields, state.fields);
        state.fields.push(...importedFields);
    }, { rerender: true });

    notify('success', successMessage || `Imported ${normalizedFields.length} Persona Dynamic Field(s).`);
}

// -----------------------------------------------------------------------------
// Import / Export - Native Character Description / Personality Import
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
    return normalizeCharacterField({
        name,
        activatingTriggers: '',
        enablingTriggers: '',
        disablingTriggers: '',
        triggerSources: [...DEFAULT_TRIGGER_SOURCES],
        activatingKeywordMode: KEYWORD_MODE.ALL,
        enablingKeywordMode: KEYWORD_MODE.ALL,
        disablingKeywordMode: KEYWORD_MODE.ALL,
        triggerActionInstruction: '',
        triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
        triggerActionGenerationId: 0,
        triggerActionEnabledByGeneration: false,
        content,
        enabled: true,
    });
}

function createPersonaFieldFromNativeImport(name, content) {
    return normalizePersonaField({
        name,
        activatingTriggers: '',
        enablingTriggers: '',
        disablingTriggers: '',
        triggerSources: [...DEFAULT_TRIGGER_SOURCES],
        activatingKeywordMode: KEYWORD_MODE.ALL,
        enablingKeywordMode: KEYWORD_MODE.ALL,
        disablingKeywordMode: KEYWORD_MODE.ALL,
        triggerActionInstruction: '',
        triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
        triggerActionGenerationId: 0,
        triggerActionEnabledByGeneration: false,
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

function buildPersonaDescriptionImports(personaId = getActivePersonaId()) {
    const description = getNativePersonaDescriptionForPersona(personaId);
    const importedFields = [];

    if (!description) {
        return importedFields;
    }

    const descriptionSections = parseHeaderedNativeSections(description);

    if (descriptionSections.length) {
        for (const section of descriptionSections) {
            importedFields.push(createPersonaFieldFromNativeImport(section.name, section.content));
        }
    } else {
        importedFields.push(createPersonaFieldFromNativeImport('Background', description));
    }

    return importedFields;
}

// -----------------------------------------------------------------------------
// Import / Export - Character Import Actions
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

        appendImportedFieldsToActiveCharacter(fields, `Imported ${fields.length} Character Dynamic Field(s) from character description.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to import character description Dynamic Fields:`, error);
        notify('error', 'Failed to import Character Dynamic Fields from character description JSON.');
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

        appendImportedFieldsToActiveCharacter(fields, `Imported ${fields.length} Character Dynamic Field(s) from JSON file.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to import Character Dynamic Fields JSON file:`, error);
        notify('error', 'Failed to import Character Dynamic Fields from JSON file.');
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
        `Imported ${importedFields.length} Character Dynamic Field(s) from native fields.`,
    );
}

async function importDynamicFieldsFromClipboardJson() {
    try {
        const text = await readTextFromClipboard();
        const fields = getFieldsFromDynamicFieldsPayload(text);

        appendImportedFieldsToActiveCharacter(fields, `Imported ${fields.length} Character Dynamic Field(s) from clipboard JSON.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to import clipboard Character Dynamic Fields:`, error);
        notify('error', 'Failed to import Character Dynamic Fields from clipboard JSON.');
    }
}

// -----------------------------------------------------------------------------
// Import / Export - Persona Import Actions
// -----------------------------------------------------------------------------

function importPersonaDynamicFieldsFromFileJson() {
    $(`#${UI.PERSONA_DYNAMIC_FIELDS_IMPORT_FILE_ID}`).val('').trigger('click');
}

function importPersonaDynamicFieldsFromPersonaDescription() {
    const personaId = getActivePersonaId();

    if (!personaId) {
        notify('warning', 'Select a persona before importing Persona Description.');
        return;
    }

    const importedFields = buildPersonaDescriptionImports(personaId);

    appendImportedFieldsToActivePersona(
        importedFields,
        `Imported ${importedFields.length} Persona Dynamic Field(s) from Persona Description.`,
    );
}

async function handlePersonaDynamicFieldsImportFileSelected(event) {
    const file = event.target.files?.[0];

    if (!file) {
        return;
    }

    try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const fields = getPersonaFieldsFromDynamicFieldsPayload(payload);

        appendImportedFieldsToActivePersona(fields, `Imported ${fields.length} Persona Dynamic Field(s) from JSON file.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to import Persona Dynamic Fields JSON file:`, error);
        notify('error', 'Failed to import Persona Dynamic Fields from JSON file.');
    } finally {
        $(`#${UI.PERSONA_DYNAMIC_FIELDS_IMPORT_FILE_ID}`).val('');
    }
}

async function importPersonaDynamicFieldsFromClipboardJson() {
    try {
        const text = await readTextFromClipboard();
        const fields = getPersonaFieldsFromDynamicFieldsPayload(text);

        appendImportedFieldsToActivePersona(fields, `Imported ${fields.length} Persona Dynamic Field(s) from clipboard JSON.`);
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to import clipboard Persona Dynamic Fields:`, error);
        notify('error', 'Failed to import Persona Dynamic Fields from clipboard JSON.');
    }
}

// -----------------------------------------------------------------------------
// Import / Export - Character Export Actions
// -----------------------------------------------------------------------------

function exportDynamicFieldsToFileJson() {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before exporting Character Dynamic Fields.');
        return;
    }

    const characterName = getCharacterName(characterId);
    const payload = buildDynamicFieldsExportPayload(characterId);

    downloadJsonFile(`${sanitizeFilename(characterName)}_aspect_evolutia_character_dynamic_fields.json`, payload);
    notify('success', 'Exported Character Dynamic Fields JSON file.');
}

async function exportDynamicFieldsToClipboardJson() {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before copying Character Dynamic Fields.');
        return;
    }

    try {
        const payload = buildDynamicFieldsExportPayload(characterId);
        await copyTextToClipboard(JSON.stringify(payload, null, 2));
        notify('success', 'Copied Character Dynamic Fields JSON to clipboard.');
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to copy Character Dynamic Fields JSON:`, error);
        notify('error', 'Failed to copy Character Dynamic Fields JSON to clipboard.');
    }
}

// -----------------------------------------------------------------------------
// Import / Export - Persona Export Actions
// -----------------------------------------------------------------------------

function exportPersonaDynamicFieldsToFileJson() {
    const personaId = getActivePersonaId();

    if (!personaId) {
        notify('warning', 'Select a persona before exporting Persona Dynamic Fields.');
        return;
    }

    const personaName = getPersonaName(personaId);
    const payload = buildPersonaDynamicFieldsExportPayload(personaId);

    downloadJsonFile(`${sanitizeFilename(personaName)}_aspect_evolutia_persona_dynamic_fields.json`, payload);
    notify('success', 'Exported Persona Dynamic Fields JSON file.');
}

async function exportPersonaDynamicFieldsToClipboardJson() {
    const personaId = getActivePersonaId();

    if (!personaId) {
        notify('warning', 'Select a persona before copying Persona Dynamic Fields.');
        return;
    }

    try {
        const payload = buildPersonaDynamicFieldsExportPayload(personaId);
        await copyTextToClipboard(JSON.stringify(payload, null, 2));
        notify('success', 'Copied Persona Dynamic Fields JSON to clipboard.');
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to copy Persona Dynamic Fields JSON:`, error);
        notify('error', 'Failed to copy Persona Dynamic Fields JSON to clipboard.');
    }
}

// ============================================================================
// Section 13. Extensions Drawer Settings
// ============================================================================
// Purpose:
// - Own the Aspect: Evolutia settings drawer in SillyTavern's Extensions tab.
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
// Extensions Drawer Settings - Character Actions
// -----------------------------------------------------------------------------

async function removeAllFieldsForAllCharacters() {
    const characterIds = getAllCharacterIds();

    if (!characterIds.length) {
        notify('warning', 'No characters were found in Character Management.');
        updateSettingsActionState();
        return;
    }

    if (areFieldsRemovedForCharacters(characterIds)) {
        notify('info', 'All Character Dynamic Fields are already removed from every character.');
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        'Remove all Character Dynamic Fields from all characters in Character Management?\n\n' +
        'This keeps each character’s Character Dynamic Fields toggle as it is, but removes every Character Dynamic Field from every character.',
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

    notify('success', `Removed all Character Dynamic Fields from ${characterIds.length} character(s).`);
}

async function removeAllFieldsForCurrentChatCharacters() {
    const characterIds = getCurrentChatCharacterIds();
    const isGroup = isCurrentGroupChatOpen();

    if (!characterIds.length) {
        notify('warning', 'Open a character or group chat before removing current Character Dynamic Fields.');
        updateSettingsActionState();
        return;
    }

    if (areFieldsRemovedForCharacters(characterIds)) {
        notify(
            'info',
            isGroup
                ? 'All Character Dynamic Fields are already removed from the current characters.'
                : 'All Character Dynamic Fields are already removed from the current character.',
        );
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        isGroup
            ? 'Remove all Character Dynamic Fields from every character in the currently open group chat?\n\nThis keeps each character’s Character Dynamic Fields toggle as they are.'
            : 'Remove all Character Dynamic Fields from the character in the currently open chat?\n\nThis keeps the character’s Character Dynamic Fields toggle as it is.',
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
            ? `Removed all Character Dynamic Fields from ${characterIds.length} current character(s).`
            : 'Removed all Character Dynamic Fields from the current character.',
    );
}

async function resetAllCharactersToOutOfBox() {
    const characterIds = getAllCharacterIds();

    if (!characterIds.length) {
        notify('warning', 'No characters were found in Character Management.');
        updateSettingsActionState();
        return;
    }

    if (areCharactersOutOfBox(characterIds)) {
        notify('info', 'Aspect: Evolutia is already reset for every character.');
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        'Reset Aspect: Evolutia extension state for all characters in Character Management?\n\n' +
        'This will turn Character Dynamic Fields off and restore the default Background, Personality, and Appearance fields for every character.',
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

    await syncPromptManagerForState(createOutOfBoxState());

    renderPanel();
    applyUiVisibility();
    updateTokenEstimate();
    updateSettingsActionState();

    notify('success', `Reset Aspect: Evolutia extension state for ${characterIds.length} character(s).`);
}

// -----------------------------------------------------------------------------
// Extensions Drawer Settings - Persona Actions
// -----------------------------------------------------------------------------

async function removeAllFieldsForAllPersonas() {
    const personaIds = getAllPersonaIds();

    if (!personaIds.length) {
        notify('warning', 'No personas were found in Persona Management.');
        updateSettingsActionState();
        return;
    }

    if (areFieldsRemovedForPersonas(personaIds)) {
        notify('info', 'All Persona Dynamic Fields are already removed from every persona.');
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        'Remove all Persona Dynamic Fields from all personas?\n\n' +
        'This keeps each persona’s Persona Dynamic Fields toggle as it is, but removes every Persona Dynamic Field from every persona.',
    );

    if (!confirmed) {
        return;
    }

    for (const personaId of personaIds) {
        const nextState = createEmptyPersonaFieldsState(personaId);

        cachePersonaState(personaId, nextState);
        await savePersonaStateNow(personaId, nextState);
    }

    personaStateCache.clear();

    renderPersonaPanel();
    applyPersonaUiVisibility();
    updatePersonaTokenEstimate();
    updateSettingsActionState();

    notify('success', `Removed all Persona Dynamic Fields from ${personaIds.length} persona(s).`);
}

async function removeAllFieldsForCurrentPersona() {
    const personaIds = getCurrentPersonaIds();

    if (!personaIds.length) {
        notify('warning', 'Select a persona before removing current Persona Dynamic Fields.');
        updateSettingsActionState();
        return;
    }

    if (areFieldsRemovedForPersonas(personaIds)) {
        notify('info', 'All Persona Dynamic Fields are already removed from the current persona.');
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        'Remove all Persona Dynamic Fields from the current persona?\n\n' +
        'This keeps the current persona’s Persona Dynamic Fields toggle as it is.',
    );

    if (!confirmed) {
        return;
    }

    for (const personaId of personaIds) {
        const nextState = createEmptyPersonaFieldsState(personaId);

        cachePersonaState(personaId, nextState);
        await savePersonaStateNow(personaId, nextState);
    }

    personaStateCache.clear();

    renderPersonaPanel();
    applyPersonaUiVisibility();
    updatePersonaTokenEstimate();
    updateSettingsActionState();

    notify('success', 'Removed all Persona Dynamic Fields from the current persona.');
}

async function resetAllPersonasToOutOfBox() {
    const personaIds = getAllPersonaIds();

    if (!personaIds.length) {
        notify('warning', 'No personas were found in Persona Management.');
        updateSettingsActionState();
        return;
    }

    if (arePersonasOutOfBox(personaIds)) {
        notify('info', 'Aspect: Evolutia is already reset for every persona.');
        updateSettingsActionState();
        return;
    }

    const confirmed = window.confirm(
        'Reset Aspect: Evolutia extension state for all personas?\n\n' +
        'This will turn Persona Dynamic Fields off and restore the default Background, Personality, and Appearance fields for every persona.',
    );

    if (!confirmed) {
        return;
    }

    for (const personaId of personaIds) {
        const outOfBoxState = createOutOfBoxPersonaState();

        cachePersonaState(personaId, outOfBoxState);
        await savePersonaStateNow(personaId, outOfBoxState);
    }

    personaStateCache.clear();

    await syncPromptManagerForPersonaState(createOutOfBoxPersonaState());

    renderPersonaPanel();
    applyPersonaUiVisibility();
    updatePersonaTokenEstimate();
    updateSettingsActionState();

    notify('success', `Reset Aspect: Evolutia extension state for ${personaIds.length} persona(s).`);
}

// -----------------------------------------------------------------------------
// Extensions Drawer Settings - Rendering Helpers
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

// -----------------------------------------------------------------------------
// Extensions Drawer Settings - Action State
// -----------------------------------------------------------------------------

function updateCharacterSettingsActionState() {
    const allCharacterIds = getAllCharacterIds();
    const currentCharacterIds = getCurrentChatCharacterIds();

    const allFieldsRemoved = areFieldsRemovedForCharacters(allCharacterIds);
    const currentFieldsRemoved = areFieldsRemovedForCharacters(currentCharacterIds);
    const allOutOfBox = areCharactersOutOfBox(allCharacterIds);

    const noAllCharacters = allCharacterIds.length === 0;
    const noCurrentCharacters = currentCharacterIds.length === 0;
    const isGroup = isCurrentGroupChatOpen();

    setSettingsButtonState(UI.SETTINGS_CHARACTER_REMOVE_FIELDS_ID, {
        disabled: noAllCharacters || allFieldsRemoved,
        title: noAllCharacters
            ? 'No characters were found in Character Management.'
            : allFieldsRemoved
                ? 'All Character Dynamic Fields are already removed from every character in Character Management.'
                : 'Remove all Character Dynamic Fields from every character in Character Management. This keeps each character’s Character Dynamic Fields toggle as it is.',
    });

    setSettingsButtonState(UI.SETTINGS_CHARACTER_REMOVE_CURRENT_FIELDS_ID, {
        text: getCurrentCharactersButtonLabel(),
        disabled: noCurrentCharacters || currentFieldsRemoved,
        title: noCurrentCharacters
            ? 'Open a character or group chat to use this option.'
            : currentFieldsRemoved
                ? (
                    isGroup
                        ? 'All Character Dynamic Fields are already removed from the current characters.'
                        : 'All Character Dynamic Fields are already removed from the current character.'
                )
                : (
                    isGroup
                        ? 'Remove all Character Dynamic Fields from every character in the currently open group chat. This keeps each character’s Character Dynamic Fields toggle as they are.'
                        : 'Remove all Character Dynamic Fields from the character in the currently open chat. This keeps the character’s Character Dynamic Fields toggle as it is.'
                ),
    });

    setSettingsButtonState(UI.SETTINGS_CHARACTER_RESET_EXTENSION_ID, {
        text: 'Reset Extension (Characters)',
        disabled: noAllCharacters || allOutOfBox,
        title: noAllCharacters
            ? 'No characters were found in Character Management.'
            : allOutOfBox
                ? 'Aspect: Evolutia is already reset for every character in Character Management.'
                : 'Reset Aspect: Evolutia extension state for every character in Character Management. Character Dynamic Fields will be turned off, and the default Background, Personality, and Appearance fields will be restored.',
    });
}

function updatePersonaSettingsActionState() {
    const allPersonaIds = getAllPersonaIds();
    const currentPersonaIds = getCurrentPersonaIds();

    const allFieldsRemoved = areFieldsRemovedForPersonas(allPersonaIds);
    const currentFieldsRemoved = areFieldsRemovedForPersonas(currentPersonaIds);
    const allOutOfBox = arePersonasOutOfBox(allPersonaIds);

    const noAllPersonas = allPersonaIds.length === 0;
    const noCurrentPersona = currentPersonaIds.length === 0;

    setSettingsButtonState(UI.SETTINGS_PERSONA_REMOVE_FIELDS_ID, {
        disabled: noAllPersonas || allFieldsRemoved,
        title: noAllPersonas
            ? 'No personas were found in Persona Management.'
            : allFieldsRemoved
                ? 'All Persona Dynamic Fields are already removed from every persona.'
                : 'Remove all Persona Dynamic Fields from every persona. This keeps each persona’s Persona Dynamic Fields toggle as it is.',
    });

    setSettingsButtonState(UI.SETTINGS_PERSONA_REMOVE_CURRENT_FIELDS_ID, {
        text: getCurrentPersonaButtonLabel(),
        disabled: noCurrentPersona || currentFieldsRemoved,
        title: noCurrentPersona
            ? 'Select a persona to use this option.'
            : currentFieldsRemoved
                ? 'All Persona Dynamic Fields are already removed from the current persona.'
                : 'Remove all Persona Dynamic Fields from the current persona. This keeps the current persona’s Persona Dynamic Fields toggle as it is.',
    });

    setSettingsButtonState(UI.SETTINGS_PERSONA_RESET_EXTENSION_ID, {
        text: 'Reset Extension (Personas)',
        disabled: noAllPersonas || allOutOfBox,
        title: noAllPersonas
            ? 'No personas were found in Persona Management.'
            : allOutOfBox
                ? 'Aspect: Evolutia is already reset for every persona.'
                : 'Reset Aspect: Evolutia extension state for every persona. Persona Dynamic Fields will be turned off, and the default Background, Personality, and Appearance fields will be restored.',
    });
}

function updateSettingsActionState() {
    updateCharacterSettingsActionState();
    updatePersonaSettingsActionState();
}

// -----------------------------------------------------------------------------
// Extensions Drawer Settings - Mount
// -----------------------------------------------------------------------------

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
						<div class="dsf-settings-tagline">The Aspect of Evolution</div>

						<div
							id="${UI.SETTINGS_CHARACTER_BOX_ID}"
                            class="dsf-settings-scope-box dsf-settings-character-box"
                        >
                            <div class="dsf-settings-scope-title">Character Dynamic Fields</div>
                            <div class="dsf-settings-scope-description">
                                Manage Dynamic Fields that replace character Description injection.
                            </div>

                            <div class="dsf-settings-actions">
                                <button
                                    id="${UI.SETTINGS_CHARACTER_REMOVE_FIELDS_ID}"
                                    type="button"
                                    class="menu_button danger_button"
                                    title="Remove all Character Dynamic Fields from every character in Character Management. This keeps each character's Character Dynamic Fields toggle as it is."
                                >
                                    Remove All Fields for All Characters
                                </button>

                                <button
                                    id="${UI.SETTINGS_CHARACTER_REMOVE_CURRENT_FIELDS_ID}"
                                    type="button"
                                    class="menu_button danger_button"
                                    title="Open a character or group chat to use this option."
                                    disabled
                                >
                                    Remove All Fields for Current Character
                                </button>

                                <button
                                    id="${UI.SETTINGS_CHARACTER_RESET_EXTENSION_ID}"
                                    type="button"
                                    class="menu_button danger_button"
                                    title="Reset Aspect: Evolutia extension state for every character in Character Management. Character Dynamic Fields will be turned off, and the default Background, Personality, and Appearance fields will be restored."
                                >
                                    Reset Extension (Characters)
                                </button>
                            </div>
                        </div>

                        <div
                            id="${UI.SETTINGS_PERSONA_BOX_ID}"
                            class="dsf-settings-scope-box dsf-settings-persona-box"
                        >
                            <div class="dsf-settings-scope-title">Persona Dynamic Fields</div>
                            <div class="dsf-settings-scope-description">
                                Manage Dynamic Fields that replace Persona Description injection through Prompt Manager.
                            </div>

                            <div class="dsf-settings-actions">
                                <button
                                    id="${UI.SETTINGS_PERSONA_REMOVE_FIELDS_ID}"
                                    type="button"
                                    class="menu_button danger_button"
                                    title="Remove all Persona Dynamic Fields from every persona. This keeps each persona's Persona Dynamic Fields toggle as it is."
                                >
                                    Remove All Fields for All Personas
                                </button>

                                <button
                                    id="${UI.SETTINGS_PERSONA_REMOVE_CURRENT_FIELDS_ID}"
                                    type="button"
                                    class="menu_button danger_button"
                                    title="Select a persona to use this option."
                                    disabled
                                >
                                    Remove All Fields for Current Persona
                                </button>

                                <button
                                    id="${UI.SETTINGS_PERSONA_RESET_EXTENSION_ID}"
                                    type="button"
                                    class="menu_button danger_button"
                                    title="Reset Aspect: Evolutia extension state for every persona. Persona Dynamic Fields will be turned off, and the default Background, Personality, and Appearance fields will be restored."
                                >
                                    Reset Extension (Personas)
                                </button>
                            </div>
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
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_CHARACTER_REMOVE_FIELDS_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_CHARACTER_REMOVE_FIELDS_ID}`, removeAllFieldsForAllCharacters);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_CHARACTER_REMOVE_CURRENT_FIELDS_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_CHARACTER_REMOVE_CURRENT_FIELDS_ID}`, removeAllFieldsForCurrentChatCharacters);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_CHARACTER_RESET_EXTENSION_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_CHARACTER_RESET_EXTENSION_ID}`, resetAllCharactersToOutOfBox);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_PERSONA_REMOVE_FIELDS_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_PERSONA_REMOVE_FIELDS_ID}`, removeAllFieldsForAllPersonas);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_PERSONA_REMOVE_CURRENT_FIELDS_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_PERSONA_REMOVE_CURRENT_FIELDS_ID}`, removeAllFieldsForCurrentPersona);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.SETTINGS_PERSONA_RESET_EXTENSION_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.SETTINGS_PERSONA_RESET_EXTENSION_ID}`, resetAllPersonasToOutOfBox);
}

// ============================================================================
// Section 14. User Interface Rendering
// ============================================================================
// Purpose:
// - Own CSS, DOM mounting, field-list rendering, and visibility rules.
// - Character UI mounts near the Character Description field.
// - Persona UI mounts immediately before SillyTavern's native Persona
//   Description + Position block, which places it beneath Current Persona's
//   More... row and above the native Persona Description controls.
// - Character Dynamic Fields include Trigger Actions.
// - Persona Dynamic Fields intentionally omit Trigger Actions.
// - Event handlers may call this after state changes.
// ============================================================================

// -----------------------------------------------------------------------------
// User Interface Rendering - Character Description Textarea Lookup
// -----------------------------------------------------------------------------

function getDescriptionTextarea() {
    return $('#description_textarea, textarea[name="description"], textarea[data-name="description"]').first();
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Persona Description Textarea Lookup
// -----------------------------------------------------------------------------

function getPersonaDescriptionTextarea() {
    const directSelectors = [
        '#persona_description',
        '#persona_description_textarea',
        'textarea[name="persona_description"]',
        'textarea[name="personaDescription"]',
        'textarea[data-name="persona_description"]',
        'textarea[data-name="personaDescription"]',
        'textarea[data-testid="persona-description"]',
    ];

    for (const selector of directSelectors) {
        const $match = $(selector).filter('textarea').first();

        if ($match.length) {
            return $match;
        }
    }

    const containerSelectors = [
        '#persona_description_block',
        '#persona_description_container',
        '#persona_description_holder',
        '.persona_description',
        '.persona-description',
        '[data-testid="persona-description-container"]',
    ];

    for (const selector of containerSelectors) {
        const $textarea = $(selector).find('textarea').first();

        if ($textarea.length) {
            return $textarea;
        }
    }

    const $root = getPersonaEditorRootFromDocument();

    if ($root.length) {
        const $textarea = $root
            .find('textarea')
            .filter(function findPersonaDescriptionTextareaByContext() {
                const id = String(this.id || '').toLowerCase();
                const name = String(this.getAttribute('name') || '').toLowerCase();
                const dataName = String(this.getAttribute('data-name') || '').toLowerCase();
                const ariaLabel = String(this.getAttribute('aria-label') || '').toLowerCase();
                const placeholder = String(this.getAttribute('placeholder') || '').toLowerCase();
                const joined = `${id} ${name} ${dataName} ${ariaLabel} ${placeholder}`;

                return joined.includes('persona') && joined.includes('description');
            })
            .first();

        if ($textarea.length) {
            return $textarea;
        }
    }

    return $();
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Character Editor Root and Token Counter Lookup
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
        .not(`#${UI.BAR_ID} *`)
        .not(`#${UI.PERSONA_BAR_ID}`)
        .not(`#${UI.PERSONA_BAR_ID} *`);

    const $textMatches = $root
        .find('div, span, small, label')
        .filter(function filterTokenCounterText() {
            if ($(this).closest(`#${UI.BAR_ID}, #${UI.PERSONA_BAR_ID}`).length) {
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
// User Interface Rendering - Persona Editor Root and Token Counter Lookup
// -----------------------------------------------------------------------------

function getPersonaEditorRootFromDocument() {
    const rootSelectors = [
        '#persona-management-button .drawer-content',
        '#persona_management',
        '#persona-management',
        '#persona_settings',
        '#persona-settings',
        '#persona_panel',
        '#persona-panel',
        '#persona_container',
        '#persona-container',
        '#user_avatar_block',
        '#user-settings-block',
        '.persona_management',
        '.persona-management',
        '.persona_settings',
        '.persona-settings',
        '.persona_editor',
        '.persona-editor',
    ];

    for (const selector of rootSelectors) {
        const $root = $(selector).first();

        if ($root.length) {
            return $root;
        }
    }

    return $();
}

function getPersonaEditorRoot() {
    const $description = getPersonaDescriptionTextarea();
    const $root = $description
        .closest(
            [
                '#persona-management-button .drawer-content',
                '#persona_management',
                '#persona-management',
                '#persona_settings',
                '#persona-settings',
                '#persona_panel',
                '#persona-panel',
                '#persona_container',
                '#persona-container',
                '#user_avatar_block',
                '#user-settings-block',
                '.persona_management',
                '.persona-management',
                '.persona_settings',
                '.persona-settings',
                '.persona_editor',
                '.persona-editor',
                '.inline-drawer-content',
            ].join(', '),
        )
        .first();

    if ($root.length) {
        return $root;
    }

    const $documentRoot = getPersonaEditorRootFromDocument();

    return $documentRoot.length ? $documentRoot : $description.parent();
}

function getPersonaDescriptionTokenCounters() {
    const $root = getPersonaEditorRoot();

    if (!$root.length) {
        return $();
    }

    const $selectorMatches = $root
        .find(PERSONA_TOKEN_COUNTER_SELECTORS.join(','))
        .add('#persona_description_token_count')
        .not(`#${UI.PERSONA_BAR_ID}`)
        .not(`#${UI.PERSONA_BAR_ID} *`)
        .not(`#${UI.BAR_ID}`)
        .not(`#${UI.BAR_ID} *`);

    const $textMatches = $root
        .find('div, span, small, label')
        .filter(function filterPersonaTokenCounterText() {
            if ($(this).closest(`#${UI.PERSONA_BAR_ID}, #${UI.BAR_ID}`).length) {
                return false;
            }

            const id = String(this.id || '').toLowerCase();
            const className = typeof this.className === 'string'
                ? this.className
                : String(this.className?.baseVal || '');
            const idClass = `${id} ${className}`.toLowerCase();
            const text = String($(this).text() || '').trim().toLowerCase();

            return (
                idClass.includes('persona') &&
                idClass.includes('token') &&
                /token/.test(text)
            );
        });

    return $selectorMatches.add($textMatches);
}

function setPersonaTokenCounterHidden(hidden) {
    getPersonaDescriptionTokenCounters().each(function togglePersonaTokenCounter() {
        const $element = $(this);

        if (hidden) {
            if (!$element.attr('data-dsf-persona-token-original-display')) {
                $element.attr('data-dsf-persona-token-original-display', $element.css('display') || '');
            }

            $element.css('display', 'none');
            return;
        }

        const originalDisplay = $element.attr('data-dsf-persona-token-original-display');

        if (originalDisplay !== undefined) {
            $element.css('display', originalDisplay === 'none' ? '' : originalDisplay);
            $element.removeAttr('data-dsf-persona-token-original-display');
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
        #${UI.BAR_ID},
        #${UI.PERSONA_BAR_ID} {
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 100%;
            max-width: none;
            min-width: 0;
            flex: 1 1 100%;
            align-self: stretch;
            grid-column: 1 / -1;
            box-sizing: border-box;
            margin: 6px 0;
            padding: 8px;
            border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.15));
            border-radius: 10px;
            background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.10));
        }

        #${UI.PERSONA_BAR_ID} {
            clear: both;
        }

        #${UI.BAR_ID} *,
        #${UI.PERSONA_BAR_ID} * {
            box-sizing: border-box;
        }

        #${UI.BAR_ID} .dsf-top-controls,
        #${UI.PERSONA_BAR_ID} .dsf-top-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
            min-width: 0;
        }

        #${UI.BAR_ID} .dsf-left-controls,
        #${UI.BAR_ID} .dsf-right-controls,
        #${UI.BAR_ID} .dsf-bottom-controls,
        #${UI.PERSONA_BAR_ID} .dsf-left-controls,
        #${UI.PERSONA_BAR_ID} .dsf-right-controls,
        #${UI.PERSONA_BAR_ID} .dsf-bottom-controls {
            display: inline-flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
            min-width: 0;
        }

        #${UI.BAR_ID} .dsf-right-controls,
        #${UI.PERSONA_BAR_ID} .dsf-right-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex: 1 1 auto;
            margin-left: auto;
        }

        #${UI.BAR_ID} .dsf-top-action-row,
        #${UI.PERSONA_BAR_ID} .dsf-top-action-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            width: 100%;
            min-width: 0;
        }

        #${UI.DELETE_ALL_TOP_ID},
        #${UI.PERSONA_DELETE_ALL_TOP_ID} {
            margin-right: auto;
        }

        #${UI.ADD_TOP_ID},
        #${UI.PERSONA_ADD_TOP_ID} {
            margin-left: auto;
        }

        #${UI.BAR_ID} label,
        #${UI.PERSONA_BAR_ID} label {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin: 0;
        }

        #${UI.BAR_ID} .dsf-dynamic-toggle-label,
        #${UI.PERSONA_BAR_ID} .dsf-dynamic-toggle-label {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            margin: 0;
            padding: 5px 10px;
            line-height: 1;
            border: 1px solid #b76e79;
            outline: 1px solid #b76e79;
            outline-offset: 2px;
            border-radius: 10px;
            background: rgba(183, 110, 121, 0.08);
            box-sizing: border-box;
        }

        #${UI.BAR_ID} .dsf-dynamic-toggle-label input,
        #${UI.PERSONA_BAR_ID} .dsf-dynamic-toggle-label input {
            margin: 0;
            flex: 0 0 auto;
        }

        #${UI.BAR_ID} .dsf-dynamic-toggle-label span,
        #${UI.PERSONA_BAR_ID} .dsf-dynamic-toggle-label span {
            display: inline-flex;
            align-items: center;
            line-height: 1;
        }

        #${UI.BOTTOM_ACTIONS_ID},
        #${UI.PERSONA_BOTTOM_ACTIONS_ID} {
            display: none;
            align-items: center;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
            min-width: 0;
            margin-top: 4px;
        }

        #${UI.DELETE_ALL_TOP_ID},
        #${UI.ADD_TOP_ID},
        #${UI.ADD_BOTTOM_ID},
        #${UI.IMPORT_ID},
        #${UI.EXPORT_ID},
        #${UI.PERSONA_DELETE_ALL_TOP_ID},
        #${UI.PERSONA_ADD_TOP_ID},
        #${UI.PERSONA_ADD_BOTTOM_ID},
        #${UI.PERSONA_IMPORT_ID},
        #${UI.PERSONA_EXPORT_ID} {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            width: auto;
            min-width: max-content;
            flex: 0 0 auto;
        }

        #${UI.DELETE_ALL_TOP_ID}:disabled,
        #${UI.PERSONA_DELETE_ALL_TOP_ID}:disabled {
            opacity: 0.45;
            cursor: not-allowed;
            filter: grayscale(0.35);
        }

        #${UI.ADD_BOTTOM_ID},
        #${UI.PERSONA_ADD_BOTTOM_ID} {
            margin-left: auto;
        }

        #${UI.PANEL_ID},
        #${UI.PERSONA_PANEL_ID} {
            display: none;
            width: 100%;
            max-width: none;
            min-width: 0;
            flex: 1 1 100%;
            align-self: stretch;
        }

        #${UI.PANEL_ID} .dsf-fields,
        #${UI.PERSONA_PANEL_ID} .dsf-fields {
            width: 100%;
            max-width: none;
            min-width: 0;
        }

        #${UI.PANEL_ID} .dsf-field,
        #${UI.PERSONA_PANEL_ID} .dsf-field {
            width: 100%;
            max-width: none;
            min-width: 0;
            padding: 8px;
            margin: 8px 0;
            border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.12));
            border-radius: 8px;
            background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.08));
        }

        #${UI.PANEL_ID} .dsf-field.dsf-dragging,
        #${UI.PERSONA_PANEL_ID} .dsf-field.dsf-dragging {
            opacity: 0.55;
            outline: 1px dashed var(--SmartThemeBorderColor, rgba(255,255,255,0.35));
        }

        #${UI.PANEL_ID} .dsf-field:first-child,
        #${UI.PERSONA_PANEL_ID} .dsf-field:first-child {
            margin-top: 0;
        }

        #${UI.PANEL_ID} .dsf-field:last-child,
        #${UI.PERSONA_PANEL_ID} .dsf-field:last-child {
            margin-bottom: 0;
        }

        #${UI.PANEL_ID} .dsf-field-top-row,
        #${UI.PERSONA_PANEL_ID} .dsf-field-top-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 6px;
            width: 100%;
            min-width: 0;
        }

        #${UI.PANEL_ID} .dsf-field-order-wrap,
        #${UI.PERSONA_PANEL_ID} .dsf-field-order-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: space-between;
            gap: 6px;
            width: 100%;
            opacity: 0.9;
            font-size: 0.9em;
        }

        #${UI.PANEL_ID} .dsf-position-control,
        #${UI.PERSONA_PANEL_ID} .dsf-position-control {
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            margin-left: auto;
        }

        #${UI.PANEL_ID} .dsf-field-order,
        #${UI.PERSONA_PANEL_ID} .dsf-field-order {
            width: auto;
            min-width: 2ch;
            max-width: 10ch;
            text-align: right;
            box-sizing: content-box;
            padding-left: 4px;
            padding-right: 4px;
        }

        #${UI.PANEL_ID} .dsf-drag-handle,
        #${UI.PERSONA_PANEL_ID} .dsf-drag-handle {
            cursor: grab;
            width: auto;
            min-width: max-content;
            white-space: nowrap;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            margin-right: auto;
        }

        #${UI.PANEL_ID} .dsf-drag-handle:active,
        #${UI.PERSONA_PANEL_ID} .dsf-drag-handle:active {
            cursor: grabbing;
        }

        #${UI.PANEL_ID} .dsf-label,
        #${UI.PERSONA_PANEL_ID} .dsf-label {
            font-size: 0.85em;
            opacity: 0.85;
            margin: 6px 0 2px;
        }

        #${UI.PANEL_ID} .dsf-trigger-mode-row,
        #${UI.PERSONA_PANEL_ID} .dsf-trigger-mode-row {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            width: 100%;
            margin-top: 4px;
            margin-bottom: 8px;
        }

        #${UI.PANEL_ID} .dsf-keyword-mode-wrap,
        #${UI.PERSONA_PANEL_ID} .dsf-keyword-mode-wrap {
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            gap: 6px;
            margin-left: auto;
            font-size: 0.85em;
            opacity: 0.9;
        }

        #${UI.PANEL_ID} .dsf-activating-keyword-mode,
        #${UI.PANEL_ID} .dsf-enabling-keyword-mode,
        #${UI.PANEL_ID} .dsf-disabling-keyword-mode,
        #${UI.PERSONA_PANEL_ID} .dsf-activating-keyword-mode,
        #${UI.PERSONA_PANEL_ID} .dsf-enabling-keyword-mode,
        #${UI.PERSONA_PANEL_ID} .dsf-disabling-keyword-mode {
            width: auto;
            min-width: 5.5em;
        }

        #${UI.PANEL_ID} .dsf-trigger-menu-stack,
        #${UI.PERSONA_PANEL_ID} .dsf-trigger-menu-stack {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 6px;
            width: 100%;
            min-width: 0;
        }

        #${UI.PANEL_ID} .dsf-trigger-control-row,
        #${UI.PERSONA_PANEL_ID} .dsf-trigger-control-row {
            display: inline-flex;
            align-items: center;
            justify-content: flex-start;
            flex: 0 0 auto;
            gap: 8px;
        }

        #${UI.PANEL_ID} .dsf-keyword-triggers-wrap,
        #${UI.PANEL_ID} .dsf-trigger-actions-wrap,
        #${UI.PANEL_ID} .dsf-triggered-by-wrap,
        #${UI.PERSONA_PANEL_ID} .dsf-keyword-triggers-wrap,
        #${UI.PERSONA_PANEL_ID} .dsf-triggered-by-wrap {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: flex-start;
        }

        #${UI.PANEL_ID} .dsf-keyword-triggers-button,
        #${UI.PANEL_ID} .dsf-trigger-actions-button,
        #${UI.PANEL_ID} .dsf-triggered-by-button,
        #${UI.PERSONA_PANEL_ID} .dsf-keyword-triggers-button,
        #${UI.PERSONA_PANEL_ID} .dsf-triggered-by-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            width: auto;
            min-width: max-content;
            flex: 0 0 auto;
        }

        #${UI.PANEL_ID} .dsf-keyword-triggers-menu,
        #${UI.PANEL_ID} .dsf-trigger-actions-menu,
        #${UI.PANEL_ID} .dsf-triggered-by-menu,
        #${UI.PERSONA_PANEL_ID} .dsf-keyword-triggers-menu,
        #${UI.PERSONA_PANEL_ID} .dsf-triggered-by-menu {
            display: none;
            position: absolute;
            left: 0;
            top: calc(100% + 4px);
            z-index: 10000;
            min-width: 210px;
            max-width: calc(100vw - 16px);
            box-sizing: border-box;
            padding: 8px;
            border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.25));
            border-radius: 8px;
            background: var(--SmartThemeBlurTintColor, var(--SmartThemeBodyColor, #1e1e1e));
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        }

        #${UI.PANEL_ID} .dsf-keyword-triggers-menu,
        #${UI.PANEL_ID} .dsf-trigger-actions-menu,
        #${UI.PERSONA_PANEL_ID} .dsf-keyword-triggers-menu {
            width: min(520px, calc(100vw - 16px));
        }

        #${UI.PANEL_ID} .dsf-keyword-triggers-menu.dsf-menu-open,
        #${UI.PANEL_ID} .dsf-trigger-actions-menu.dsf-menu-open,
        #${UI.PANEL_ID} .dsf-triggered-by-menu.dsf-menu-open,
        #${UI.PERSONA_PANEL_ID} .dsf-keyword-triggers-menu.dsf-menu-open,
        #${UI.PERSONA_PANEL_ID} .dsf-triggered-by-menu.dsf-menu-open {
            position: fixed;
            left: var(--dsf-menu-left, 8px);
            top: var(--dsf-menu-top, 8px);
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: calc(100vh - 16px);
            overflow: auto;
        }

        #${UI.PANEL_ID} .dsf-trigger-source-option,
        #${UI.PERSONA_PANEL_ID} .dsf-trigger-source-option {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 6px;
            width: 100%;
            margin: 0;
            white-space: nowrap;
        }

        #${UI.PANEL_ID} .dsf-trigger-source-option input,
        #${UI.PERSONA_PANEL_ID} .dsf-trigger-source-option input {
            width: auto;
            min-width: unset;
        }

        #${UI.PANEL_ID} .dsf-trigger-textarea,
        #${UI.PANEL_ID} .dsf-trigger-action-instruction,
        #${UI.PERSONA_PANEL_ID} .dsf-trigger-textarea {
            min-height: 44px;
            resize: vertical;
        }

        #${UI.PANEL_ID} .dsf-keyword-trigger-group,
        #${UI.PERSONA_PANEL_ID} .dsf-keyword-trigger-group {
            display: flex;
            flex-direction: column;
            width: 100%;
        }

        #${UI.PANEL_ID} .dsf-bottom-row,
        #${UI.PERSONA_PANEL_ID} .dsf-bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
            width: 100%;
            min-width: 0;
        }

        #${UI.PANEL_ID} .dsf-field-actions,
        #${UI.PERSONA_PANEL_ID} .dsf-field-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 8px;
            margin-left: auto;
        }

        #${UI.PANEL_ID} .dsf-field-actions button,
        #${UI.PERSONA_PANEL_ID} .dsf-field-actions button {
            white-space: nowrap;
            width: auto;
            min-width: max-content;
        }

        #${UI.PANEL_ID} .dsf-inject-row,
        #${UI.PERSONA_PANEL_ID} .dsf-inject-row {
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }

        #${UI.PANEL_ID} .dsf-inject-row label,
        #${UI.PERSONA_PANEL_ID} .dsf-inject-row label {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin: 0;
        }

        #${UI.PANEL_ID} input[type="text"],
        #${UI.PANEL_ID} input[type="number"],
        #${UI.PANEL_ID} textarea,
        #${UI.PERSONA_PANEL_ID} input[type="text"],
        #${UI.PERSONA_PANEL_ID} input[type="number"],
        #${UI.PERSONA_PANEL_ID} textarea {
            width: 100%;
            box-sizing: border-box;
        }

        #${UI.PANEL_ID} .dsf-activating-triggers,
        #${UI.PANEL_ID} .dsf-enabling-triggers,
        #${UI.PANEL_ID} .dsf-disabling-triggers,
        #${UI.PERSONA_PANEL_ID} .dsf-activating-triggers,
        #${UI.PERSONA_PANEL_ID} .dsf-enabling-triggers,
        #${UI.PERSONA_PANEL_ID} .dsf-disabling-triggers {
            min-height: 44px;
            resize: vertical;
        }

        #${UI.PANEL_ID} .dsf-content,
        #${UI.PERSONA_PANEL_ID} .dsf-content {
            min-height: 100px;
            resize: vertical;
        }

        #${UI.PANEL_ID} .dsf-empty,
        #${UI.PERSONA_PANEL_ID} .dsf-empty {
            opacity: 0.75;
            font-style: italic;
            padding: 8px 0;
        }

        #${UI.TOKEN_ROW_ID},
        #${UI.PERSONA_TOKEN_ROW_ID} {
            display: none;
            align-items: center;
            justify-content: flex-end;
            min-height: 1.2em;
            width: 100%;
        }

        #${UI.TOKEN_ID},
        #${UI.PERSONA_TOKEN_ID} {
            display: inline-flex;
            align-items: center;
            justify-content: flex-end;
            white-space: nowrap;
            opacity: 0.8;
            font-size: 0.9em;
            text-align: right;
            margin-left: auto;
        }

        #${UI.BAR_ID} .dsf-menu-wrap,
        #${UI.PERSONA_BAR_ID} .dsf-menu-wrap {
            position: relative;
            display: inline-flex;
        }

        #${UI.BAR_ID} .dsf-menu,
        #${UI.PERSONA_BAR_ID} .dsf-menu {
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

        #${UI.BAR_ID} .dsf-menu.dsf-menu-open,
        #${UI.PERSONA_BAR_ID} .dsf-menu.dsf-menu-open {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        #${UI.BAR_ID} .dsf-menu button,
        #${UI.PERSONA_BAR_ID} .dsf-menu button {
            justify-content: flex-start;
            width: 100%;
            white-space: nowrap;
        }

        #${UI.SETTINGS_ID} .dsf-settings-tagline {
            font: inherit;
            font-size: 0.9em;
            opacity: 0.75;
            text-align: right;
            margin: 0 0 8px;
        }

        #${UI.SETTINGS_ID} .dsf-settings-box {
            border: 1px solid #000;
            border-radius: 10px;
            padding: 10px;
            margin: 8px 0;
        }

        #${UI.SETTINGS_ID} .dsf-settings-scope-box {
            border: 1px solid rgba(183, 110, 121, 0.65);
            outline: 1px solid rgba(183, 110, 121, 0.65);
            outline-offset: 2px;
            border-radius: 12px;
            padding: 10px;
            margin: 10px 0 14px;
            background: var(--SmartThemeBlurTintColor, rgba(0,0,0,0.08));
        }

        #${UI.SETTINGS_ID} .dsf-settings-scope-title {
            font-weight: 700;
            margin-bottom: 4px;
        }

        #${UI.SETTINGS_ID} .dsf-settings-scope-description {
            opacity: 0.78;
            font-size: 0.9em;
            margin-bottom: 8px;
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
// User Interface Rendering - Character Mount Helpers
// -----------------------------------------------------------------------------

function getDescriptionInsertTarget($description) {
    const descriptionElement = $description?.[0];

    if (!descriptionElement) {
        return $description;
    }

    const $root = getCharacterEditorRoot();
    const id = String($description.attr('id') || '');
    let $label = $();

    if ($root.length && id) {
        $label = $root
            .find('label')
            .filter(function findLabelForDescriptionTextarea() {
                return String(this.getAttribute('for') || '') === id;
            })
            .first();
    }

    if (!$label.length && $root.length) {
        $label = $root
            .find('label, div, span, strong')
            .filter(function findDescriptionLabelByText() {
                return String($(this).text() || '').trim() === 'Description';
            })
            .filter(function excludeAspectEvolutiaUi() {
                return !$(this).closest(`#${UI.BAR_ID}, #${UI.PERSONA_BAR_ID}`).length;
            })
            .first();
    }

    const labelElement = $label[0];

    if (labelElement) {
        let node = descriptionElement.parentElement;

        while (node && node !== document.body && node !== document.documentElement) {
            const $node = $(node);

            if (node.contains(descriptionElement) && node.contains(labelElement)) {
                if (
                    !$node.is('#character_popup, #rm_ch_create_block, #character_edit_dialogue, .character_popup, .character_editor, .inline-drawer-content')
                ) {
                    return $node;
                }
            }

            if ($root.length && node === $root[0]) {
                break;
            }

            node = node.parentElement;
        }
    }

    const $fieldBlock = $description
        .closest('.range-block, .form-group, .marginBot5, .wide100p')
        .first();

    return $fieldBlock.length ? $fieldBlock : $description;
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Persona Mount Helpers
// -----------------------------------------------------------------------------

function normalizePersonaUiText(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .replace(/[:：]+$/g, '')
        .trim()
        .toLowerCase();
}

function getOwnText(element) {
    return normalizePersonaUiText(
        Array.from(element?.childNodes || [])
            .filter((node) => node.nodeType === Node.TEXT_NODE)
            .map((node) => node.textContent || '')
            .join(' '),
    );
}

function isAspectEvolutiaUiElement(element) {
    return Boolean($(element).closest(`#${UI.PERSONA_BAR_ID}, #${UI.BAR_ID}`).length);
}

function isHighLevelPersonaRoot($element) {
    return $element.is(
        [
            '#persona-management-button .drawer-content',
            '#persona_management',
            '#persona-management',
            '#persona_settings',
            '#persona-settings',
            '#persona_panel',
            '#persona-panel',
            '#persona_container',
            '#persona-container',
            '#user_avatar_block',
            '#user-settings-block',
            '.persona_management',
            '.persona-management',
            '.persona_settings',
            '.persona-settings',
            '.persona_editor',
            '.persona-editor',
            '.inline-drawer-content',
        ].join(', '),
    );
}

function compareElementOrder(first, second) {
    if (!first || !second || first === second) {
        return 0;
    }

    const position = first.compareDocumentPosition(second);

    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
        return -1;
    }

    if (position & Node.DOCUMENT_POSITION_PRECEDING) {
        return 1;
    }

    return 0;
}

function isElementBefore(first, second) {
    return compareElementOrder(first, second) < 0;
}

function isElementAfter(first, second) {
    return compareElementOrder(first, second) > 0;
}

function isRenderablePersonaUiElement() {
    if (this.nodeType !== Node.ELEMENT_NODE) {
        return false;
    }

    if (isAspectEvolutiaUiElement(this)) {
        return false;
    }

    const tagName = String(this.tagName || '').toLowerCase();

    return !['script', 'style', 'template'].includes(tagName);
}

function getPersonaDescriptionLabel($description = getPersonaDescriptionTextarea()) {
    const descriptionElement = $description?.[0];

    if (!descriptionElement) {
        return $();
    }

    const $root = getPersonaEditorRoot();
    const id = String($description.attr('id') || '');

    if ($root.length && id) {
        const $forLabel = $root
            .find(`label[for="${CSS.escape(id)}"]`)
            .filter(function filterExactLabel() {
                return !isAspectEvolutiaUiElement(this);
            })
            .first();

        if ($forLabel.length) {
            return $forLabel;
        }
    }

    return $root
        .find('h1, h2, h3, h4, h5, h6, label, div, span, strong')
        .filter(function findPersonaDescriptionTextLabel() {
            if (isAspectEvolutiaUiElement(this)) {
                return false;
            }

            if (!isElementBefore(this, descriptionElement)) {
                return false;
            }

            if ($(this).find('textarea, select, button, input, .menu_button').length) {
                return false;
            }

            const ownText = getOwnText(this);
            const allText = normalizePersonaUiText($(this).text());

            return ownText === 'persona description' || allText === 'persona description';
        })
        .last();
}

function getPersonaConnectionsBoundary() {
    const $description = getPersonaDescriptionTextarea();
    const descriptionElement = $description[0];
    const $root = getPersonaEditorRoot();

    if (!$root.length || !descriptionElement) {
        return $();
    }

    return $root
        .find('h1, h2, h3, h4, h5, h6, label, div, span, strong')
        .filter(function findConnectionsBoundary() {
            if (isAspectEvolutiaUiElement(this)) {
                return false;
            }

            if (!isElementAfter(this, descriptionElement)) {
                return false;
            }

            if ($(this).find('textarea, select, button, input, .menu_button').length) {
                return false;
            }

            const ownText = getOwnText(this);
            const allText = normalizePersonaUiText($(this).text());

            return ownText === 'connections' || allText === 'connections';
        })
        .first();
}

function getSmallestSharedPersonaNativeBlock($description = getPersonaDescriptionTextarea()) {
    const descriptionElement = $description[0];
    const positionElement = document.getElementById('persona_description_position');
    const depthElement = document.getElementById('persona_depth_position_settings');
    const tokenElement = document.getElementById('persona_description_token_count');

    if (!descriptionElement) {
        return $();
    }

    const $root = getPersonaEditorRoot();
    const rootElement = $root[0] || document.body;
    const elementsToContain = [descriptionElement, positionElement, depthElement, tokenElement].filter(Boolean);

    let node = descriptionElement.parentElement;

    while (node && node !== rootElement && node !== document.body && node !== document.documentElement) {
        const $node = $(node);

        if (isHighLevelPersonaRoot($node)) {
            break;
        }

        const containsAll = elementsToContain.every((element) => node.contains(element));

        if (containsAll) {
            const text = normalizePersonaUiText($node.text());

            if (
                !text.includes('connections') &&
                !text.includes('global settings') &&
                !text.includes('global persona settings') &&
                !$node.find('#user_avatar_block, .avatar-container').length
            ) {
                return $node;
            }
        }

        node = node.parentElement;
    }

    return $();
}

function getPersonaNativeSatelliteControls() {
    const $description = getPersonaDescriptionTextarea();
    const descriptionElement = $description[0];
    const $root = getPersonaEditorRoot();

    if (!$root.length || !descriptionElement) {
        return $();
    }

    const descriptionIds = [
        'persona_description',
        'persona_description_textarea',
    ];

    const $expandButtons = $root
        .find(
            [
                '.editor_maximize',
                '.right_menu_button',
                '[title="Expand the editor"]',
                '[data-i18n*="Expand the editor"]',
                '[data-for="persona_description"]',
                '[data-for="persona_description_textarea"]',
            ].join(', '),
        )
        .filter(function filterPersonaDescriptionExpandButton() {
            if (isAspectEvolutiaUiElement(this)) {
                return false;
            }

            const dataFor = String(this.getAttribute('data-for') || '').trim();
            const title = String(this.getAttribute('title') || '').trim().toLowerCase();
            const i18n = String(this.getAttribute('data-i18n') || '').trim().toLowerCase();
            const className = typeof this.className === 'string'
                ? this.className
                : String(this.className?.baseVal || '');

            const pointsAtPersonaDescription = descriptionIds.includes(dataFor);
            const looksLikeExpandButton = (
                className.includes('editor_maximize') ||
                title === 'expand the editor' ||
                i18n.includes('expand the editor')
            );

            return pointsAtPersonaDescription && looksLikeExpandButton;
        });

    const $position = $('#persona_description_position');
    const positionElement = $position[0];

    const $positionForLabels = $('label[for="persona_description_position"]');

    const $positionTextLabels = $root
		.find('h1, h2, h3, h4, h5, h6, label, div, span, strong, [data-i18n="Position"]')
		.filter(function filterPersonaPositionLabel() {
			if (isAspectEvolutiaUiElement(this)) {
				return false;
			}

			if (!positionElement) {
				return false;
			}

			if (!isElementBefore(this, positionElement)) {
				return false;
			}

			if ($(this).find('textarea, select, button, input, .menu_button').length) {
				return false;
			}

			const ownText = getOwnText(this);
			const fullText = normalizePersonaUiText($(this).text());
			const i18n = normalizePersonaUiText(this.getAttribute('data-i18n'));

			return ownText === 'position' || fullText === 'position' || i18n === 'position';
		})
		.last();

    return $expandButtons
        .add($positionForLabels)
        .add($positionTextLabels);
}

function getPersonaNativeRegionTargets() {
    const $description = getPersonaDescriptionTextarea();

    if (!$description.length) {
        return $();
    }

    const $sharedBlock = getSmallestSharedPersonaNativeBlock($description);

    if ($sharedBlock.length) {
		return $sharedBlock.add(getPersonaNativeSatelliteControls());
	}

    const $label = getPersonaDescriptionLabel($description);
    const $position = $('#persona_description_position');
    const $positionLabel = $('label[for="persona_description_position"]');
    const $depthSettings = $('#persona_depth_position_settings');
    const $tokenCounter = $('#persona_description_token_count').closest('.extension_token_counter, .tokenCounterDisplay, div').first();

    let $fallback = $label
        .add($description)
        .add($tokenCounter)
        .add($positionLabel)
        .add($position)
        .add($depthSettings);

    const $connectionsBoundary = getPersonaConnectionsBoundary();

    if ($connectionsBoundary.length) {
        const boundaryElement = $connectionsBoundary[0];

        $fallback = $fallback.filter(function keepBeforeConnections() {
            return this === boundaryElement || isElementBefore(this, boundaryElement);
        });
    }

    return $fallback
    .add(getPersonaNativeSatelliteControls())
    .filter(isRenderablePersonaUiElement);
}

function getPersonaDynamicFieldsInsertTarget() {
    const $nativeTargets = getPersonaNativeRegionTargets();

    if ($nativeTargets.length) {
        return $nativeTargets.first();
    }

    const $description = getPersonaDescriptionTextarea();

    if ($description.length) {
        const $label = getPersonaDescriptionLabel($description);

        if ($label.length) {
            return $label;
        }

        return $description;
    }

    return $();
}

function restorePersonaNativeRegionVisibility() {
    $('[data-dsf-persona-native-region="true"]').each(function restorePersonaRegionElement() {
        const $element = $(this);
        const originalDisplay = $element.attr('data-dsf-persona-original-display');

        if (originalDisplay !== undefined) {
            $element.css('display', originalDisplay || '');
        } else {
            $element.css('display', '');
        }

        $element
            .removeAttr('data-dsf-persona-native-region')
            .removeAttr('data-dsf-persona-original-display');
    });
}

function setPersonaNativeRegionHidden(hidden) {
    restorePersonaNativeRegionVisibility();

    if (!hidden) {
        return;
    }

    const $region = getPersonaNativeRegionTargets();

    $region.each(function hidePersonaRegionElement() {
        if (isAspectEvolutiaUiElement(this)) {
            return;
        }

        const $element = $(this);

        if (!$element.attr('data-dsf-persona-original-display')) {
            $element.attr('data-dsf-persona-original-display', $element.css('display') || '');
        }

        $element
            .attr('data-dsf-persona-native-region', 'true')
            .css('display', 'none');
    });
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Character Mount
// -----------------------------------------------------------------------------

function mountUi() {
    const $description = getDescriptionTextarea();

    if (!$description.length) {
        return;
    }

    ensureStyles();

    if (!$(`#${UI.BAR_ID}`).length) {
        const $bar = $(`
            <div id="${UI.BAR_ID}" data-target-scope="${TARGET_SCOPE.CHARACTER}">
                <div class="dsf-top-controls">
                    <div class="dsf-left-controls">
                        <label class="checkbox_label dsf-dynamic-toggle-label" title="When enabled, Character Description is hidden in the editor, native charDescription is disabled in Prompt Manager, and Char Description (Evolutia) is enabled.">
                            <input id="${UI.SWAP_ID}" type="checkbox" />
                            <span>Dynamic Fields</span>
                        </label>
                    </div>

                    <div class="dsf-top-action-row">
                        <button
                            id="${UI.DELETE_ALL_TOP_ID}"
                            type="button"
                            class="menu_button danger_button"
                            title="Delete all Character Dynamic Fields for this character."
                        >
                            Delete All
                        </button>

                        <button id="${UI.ADD_TOP_ID}" type="button" class="menu_button">Add Field</button>
                    </div>
                </div>

                <div id="${UI.PANEL_ID}" data-target-scope="${TARGET_SCOPE.CHARACTER}"></div>

                <div id="${UI.BOTTOM_ACTIONS_ID}">
                    <div class="dsf-menu-wrap">
                        <button id="${UI.IMPORT_ID}" type="button" class="menu_button" title="Import Character Dynamic Fields.">Import</button>
                        <div id="${UI.IMPORT_MENU_ID}" class="dsf-menu">
                            <button type="button" class="menu_button" data-dsf-import="${IMPORT_SOURCE.CHARACTER_CARD}">Character Description</button>
                            <button type="button" class="menu_button" data-dsf-import="${IMPORT_SOURCE.NATIVE_FIELDS}">SillyTavern Fields</button>
                            <button type="button" class="menu_button" data-dsf-import="${IMPORT_SOURCE.FILE_JSON}">File (JSON)</button>
                            <button type="button" class="menu_button" data-dsf-import="${IMPORT_SOURCE.CLIPBOARD_JSON}">Clipboard (JSON)</button>
                        </div>
                    </div>

                    <div class="dsf-menu-wrap">
                        <button id="${UI.EXPORT_ID}" type="button" class="menu_button" title="Export Character Dynamic Fields.">Export</button>
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

        getDescriptionInsertTarget($description).before($bar);
    }

    bindUiHandlers();
    renderPanel();
    applyUiVisibility();
    updateTokenEstimate();
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Persona Mount
// -----------------------------------------------------------------------------

function mountPersonaUi() {
    const $description = getPersonaDescriptionTextarea();

    if (!$description.length) {
        return;
    }

    ensureStyles();

    const $insertTarget = getPersonaDynamicFieldsInsertTarget();
    const $existingBar = $(`#${UI.PERSONA_BAR_ID}`);

    if ($existingBar.length) {
        if ($insertTarget.length && $existingBar.next()[0] !== $insertTarget[0]) {
            restorePersonaNativeRegionVisibility();
            $insertTarget.before($existingBar);
        }
    } else {
        const $bar = $(`
            <div id="${UI.PERSONA_BAR_ID}" data-target-scope="${TARGET_SCOPE.PERSONA}">
                <div class="dsf-top-controls">
                    <div class="dsf-left-controls">
                        <label class="checkbox_label dsf-dynamic-toggle-label" title="When enabled, Persona Description and Position are hidden in Persona Management, native personaDescription is disabled in Prompt Manager, and Persona Description (Evolutia) is enabled. Persona Dynamic Fields support Prompt Manager / story-string injection only.">
                            <input id="${UI.PERSONA_SWAP_ID}" type="checkbox" />
                            <span>Dynamic Fields</span>
                        </label>
                    </div>

                    <div class="dsf-top-action-row">
                        <button
                            id="${UI.PERSONA_DELETE_ALL_TOP_ID}"
                            type="button"
                            class="menu_button danger_button"
                            title="Delete all Persona Dynamic Fields for this persona."
                        >
                            Delete All
                        </button>

                        <button id="${UI.PERSONA_ADD_TOP_ID}" type="button" class="menu_button">Add Field</button>
                    </div>
                </div>

                <div id="${UI.PERSONA_PANEL_ID}" data-target-scope="${TARGET_SCOPE.PERSONA}"></div>

                <div id="${UI.PERSONA_BOTTOM_ACTIONS_ID}">
                    <div class="dsf-menu-wrap">
                        <button id="${UI.PERSONA_IMPORT_ID}" type="button" class="menu_button" title="Import Persona Dynamic Fields.">Import</button>
                        <div id="${UI.PERSONA_IMPORT_MENU_ID}" class="dsf-menu">
                            <button type="button" class="menu_button" data-dsf-persona-import="${IMPORT_SOURCE.PERSONA_DESCRIPTION}">Persona Description</button>
                            <button type="button" class="menu_button" data-dsf-persona-import="${IMPORT_SOURCE.FILE_JSON}">File (JSON)</button>
                            <button type="button" class="menu_button" data-dsf-persona-import="${IMPORT_SOURCE.CLIPBOARD_JSON}">Clipboard (JSON)</button>
                        </div>
                    </div>

                    <div class="dsf-menu-wrap">
                        <button id="${UI.PERSONA_EXPORT_ID}" type="button" class="menu_button" title="Export Persona Dynamic Fields.">Export</button>
                        <div id="${UI.PERSONA_EXPORT_MENU_ID}" class="dsf-menu">
                            <button type="button" class="menu_button" data-dsf-persona-export="${EXPORT_TARGET.FILE_JSON}">File (JSON)</button>
                            <button type="button" class="menu_button" data-dsf-persona-export="${EXPORT_TARGET.CLIPBOARD_JSON}">Clipboard (JSON)</button>
                        </div>
                    </div>

                    <button id="${UI.PERSONA_ADD_BOTTOM_ID}" type="button" class="menu_button">Add Field</button>
                    <input id="${UI.PERSONA_DYNAMIC_FIELDS_IMPORT_FILE_ID}" type="file" accept=".json,application/json" hidden>
                </div>

                <div id="${UI.PERSONA_TOKEN_ROW_ID}">
                    <span id="${UI.PERSONA_TOKEN_ID}" aria-live="polite"></span>
                </div>
            </div>
        `);

        if ($insertTarget.length) {
            $insertTarget.before($bar);
        } else {
            $description.before($bar);
        }
    }

    if (typeof bindPersonaUiHandlers === 'function') {
        bindPersonaUiHandlers();
    }

    renderPersonaPanel();
    applyPersonaUiVisibility();
    updatePersonaTokenEstimate();
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Character Visibility
// -----------------------------------------------------------------------------

function applyUiVisibility() {
    const characterId = getActiveCharacterId();
    const state = readState(characterId);
    const $description = getDescriptionTextarea();
    const $panel = $(`#${UI.PANEL_ID}`);
    const hasFields = state.fields.length > 0;

    $(`#${UI.SWAP_ID}`).prop('checked', state.swapEnabled);

    $(`#${UI.DELETE_ALL_TOP_ID}`)
        .toggle(state.swapEnabled)
        .prop('disabled', !hasFields)
        .toggleClass('disabled', !hasFields)
        .attr(
            'title',
            hasFields
                ? 'Delete all Character Dynamic Fields for this character.'
                : 'There are no Character Dynamic Fields to delete.',
        );

    $(`#${UI.ADD_TOP_ID}`).toggle(state.swapEnabled);
    $(`#${UI.BAR_ID} .dsf-top-action-row`).css('display', state.swapEnabled ? 'flex' : 'none');
    $(`#${UI.BOTTOM_ACTIONS_ID}`).css('display', state.swapEnabled ? 'flex' : 'none');
    $(`#${UI.ADD_BOTTOM_ID}`).toggle(state.swapEnabled);
    $(`#${UI.TOKEN_ROW_ID}`).css('display', state.swapEnabled ? 'flex' : 'none');

    if ($description.length) {
        getDescriptionInsertTarget($description).toggle(!state.swapEnabled);
    }

    $panel.toggle(state.swapEnabled);
    setStandardTokenCounterHidden(state.swapEnabled);
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Persona Visibility
// -----------------------------------------------------------------------------

function applyPersonaUiVisibility() {
    const personaId = getActivePersonaId();
    const state = personaId ? readPersonaState(personaId) : createOutOfBoxPersonaState();
    const $panel = $(`#${UI.PERSONA_PANEL_ID}`);
    const hasFields = state.fields.length > 0;

    $(`#${UI.PERSONA_SWAP_ID}`).prop('checked', state.swapEnabled);

    $(`#${UI.PERSONA_DELETE_ALL_TOP_ID}`)
        .toggle(state.swapEnabled)
        .prop('disabled', !hasFields)
        .toggleClass('disabled', !hasFields)
        .attr(
            'title',
            hasFields
                ? 'Delete all Persona Dynamic Fields for this persona.'
                : 'There are no Persona Dynamic Fields to delete.',
        );

    $(`#${UI.PERSONA_ADD_TOP_ID}`).toggle(state.swapEnabled);
    $(`#${UI.PERSONA_BAR_ID} .dsf-top-action-row`).css('display', state.swapEnabled ? 'flex' : 'none');
    $(`#${UI.PERSONA_BOTTOM_ACTIONS_ID}`).css('display', state.swapEnabled ? 'flex' : 'none');
    $(`#${UI.PERSONA_ADD_BOTTOM_ID}`).toggle(state.swapEnabled);
    $(`#${UI.PERSONA_TOKEN_ROW_ID}`).css('display', state.swapEnabled ? 'flex' : 'none');

    setPersonaNativeRegionHidden(state.swapEnabled);

    $panel.toggle(state.swapEnabled);
    setPersonaTokenCounterHidden(state.swapEnabled);
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Character Field List
// -----------------------------------------------------------------------------

function renderPanel() {
    const characterId = getActiveCharacterId();
    const state = readState(characterId);
    const $panel = $(`#${UI.PANEL_ID}`);

    if (!$panel.length) {
        return;
    }

    const fieldsHtml = state.fields.length
        ? state.fields.map((field, index) => renderFieldHtml(field, index, {
            targetScope: TARGET_SCOPE.CHARACTER,
        })).join('')
        : '<div class="dsf-empty">No Character Dynamic Fields yet.</div>';

    $panel.html(`
        <div class="dsf-fields" data-target-scope="${TARGET_SCOPE.CHARACTER}">
            ${fieldsHtml}
        </div>
    `);

    applyUiVisibility();
    updateTokenEstimate();
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Persona Field List
// -----------------------------------------------------------------------------

function renderPersonaPanel() {
    const personaId = getActivePersonaId();
    const state = personaId ? readPersonaState(personaId) : createOutOfBoxPersonaState();
    const $panel = $(`#${UI.PERSONA_PANEL_ID}`);

    if (!$panel.length) {
        return;
    }

    const fieldsHtml = state.fields.length
        ? state.fields.map((field, index) => renderFieldHtml(field, index, {
            targetScope: TARGET_SCOPE.PERSONA,
        })).join('')
        : '<div class="dsf-empty">No Persona Dynamic Fields yet.</div>';

    $panel.html(`
        <div class="dsf-fields" data-target-scope="${TARGET_SCOPE.PERSONA}">
            ${fieldsHtml}
        </div>
    `);

    applyPersonaUiVisibility();
    updatePersonaTokenEstimate();
}

// -----------------------------------------------------------------------------
// User Interface Rendering - Field HTML
// -----------------------------------------------------------------------------

function renderFieldHtml(field, index = 0, { targetScope = TARGET_SCOPE.CHARACTER } = {}) {
    const isPersona = targetScope === TARGET_SCOPE.PERSONA;
    const normalized = isPersona ? normalizePersonaField(field) : normalizeCharacterField(field);
    const triggerSources = normalizeTriggerSources(normalized.triggerSources);

    const triggerSourceOptionsHtml = Object.values(TRIGGER_SOURCE)
        .map((source) => `
            <label class="checkbox_label dsf-trigger-source-option">
                <input
                    class="dsf-trigger-source"
                    type="checkbox"
                    value="${escapeAttribute(source)}"
                    ${triggerSources.includes(source) ? 'checked' : ''}
                >
                <span>${escapeTextarea(TRIGGER_SOURCE_LABELS[source])}</span>
            </label>
        `)
        .join('');

    const triggerActionsHtml = isPersona
        ? ''
        : `
            <div class="dsf-trigger-control-row">
                <div class="dsf-trigger-actions-wrap">
                    <button type="button" class="menu_button dsf-trigger-actions-button">Trigger Actions</button>
                    <div class="dsf-trigger-actions-menu">
                        <div class="dsf-label">Actions</div>
                        <textarea class="text_pole dsf-trigger-action-instruction" placeholder="Example: I transform into a werewolf.">${escapeTextarea(normalized.triggerActionInstruction)}</textarea>
                    </div>
                </div>
            </div>
        `;

    return `
        <div
            class="dsf-field"
            data-field-id="${escapeAttribute(normalized.id)}"
            data-target-scope="${escapeAttribute(targetScope)}"
        >
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

            <div class="dsf-label">Content (Leave empty to prevent injection).</div>
            <textarea class="text_pole dsf-content" placeholder="">${escapeTextarea(normalized.content)}</textarea>

            <div class="dsf-trigger-menu-stack">
                <div class="dsf-trigger-control-row">
                    <div class="dsf-keyword-triggers-wrap">
                        <button type="button" class="menu_button dsf-keyword-triggers-button">Keyword Triggers</button>
                        <div class="dsf-keyword-triggers-menu">
                            <div class="dsf-keyword-trigger-group">
                                <div class="dsf-label">Activating Triggers (Separate by comma, semicolon, or newline).</div>
                                <textarea class="text_pole dsf-activating-triggers dsf-trigger-textarea" placeholder="Example: Intro, Pre-Reveal, EVOLUTION_STAGE: Pre-War Arc">${escapeTextarea(normalized.activatingTriggers)}</textarea>
                                <div class="dsf-trigger-mode-row">
                                    <label class="dsf-keyword-mode-wrap" title="Any means at least one activating trigger must match. All means every activating trigger must match.">
                                        <span>Match</span>
                                        <select class="text_pole dsf-activating-keyword-mode">
                                            <option value="${KEYWORD_MODE.ANY}" ${normalized.activatingKeywordMode === KEYWORD_MODE.ANY ? 'selected' : ''}>Any</option>
                                            <option value="${KEYWORD_MODE.ALL}" ${normalized.activatingKeywordMode === KEYWORD_MODE.ALL ? 'selected' : ''}>All</option>
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <div class="dsf-keyword-trigger-group">
                                <div class="dsf-label">Enabling Triggers (Separate by comma, semicolon, or newline).</div>
                                <textarea class="text_pole dsf-enabling-triggers dsf-trigger-textarea" placeholder="Example: werewolf transformation">${escapeTextarea(normalized.enablingTriggers)}</textarea>
                                <div class="dsf-trigger-mode-row">
                                    <label class="dsf-keyword-mode-wrap" title="Any means at least one enabling trigger must match. All means every enabling trigger must match.">
                                        <span>Match</span>
                                        <select class="text_pole dsf-enabling-keyword-mode">
                                            <option value="${KEYWORD_MODE.ANY}" ${normalized.enablingKeywordMode === KEYWORD_MODE.ANY ? 'selected' : ''}>Any</option>
                                            <option value="${KEYWORD_MODE.ALL}" ${normalized.enablingKeywordMode === KEYWORD_MODE.ALL ? 'selected' : ''}>All</option>
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <div class="dsf-keyword-trigger-group">
                                <div class="dsf-label">Disabling Triggers (Separate by comma, semicolon, or newline).</div>
                                <textarea class="text_pole dsf-disabling-triggers dsf-trigger-textarea" placeholder="Example: human transformation">${escapeTextarea(normalized.disablingTriggers)}</textarea>
                                <div class="dsf-trigger-mode-row">
                                    <label class="dsf-keyword-mode-wrap" title="Any means at least one disabling trigger must match. All means every disabling trigger must match.">
                                        <span>Match</span>
                                        <select class="text_pole dsf-disabling-keyword-mode">
                                            <option value="${KEYWORD_MODE.ANY}" ${normalized.disablingKeywordMode === KEYWORD_MODE.ANY ? 'selected' : ''}>Any</option>
                                            <option value="${KEYWORD_MODE.ALL}" ${normalized.disablingKeywordMode === KEYWORD_MODE.ALL ? 'selected' : ''}>All</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                ${triggerActionsHtml}

                <div class="dsf-trigger-control-row">
                    <div class="dsf-triggered-by-wrap">
                        <button type="button" class="menu_button dsf-triggered-by-button">Trigger Sources</button>
                        <div class="dsf-triggered-by-menu">
                            ${triggerSourceOptionsHtml}
                        </div>
                    </div>
                </div>
            </div>

            <div class="dsf-bottom-row">
                <div class="dsf-inject-row">
                    <label class="checkbox_label" title="When enabled, this field can be injected if its content and trigger conditions allow it.">
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
// Section 15. User Interface Events
// ============================================================================
// Purpose:
// - Own DOM event binding for Character Dynamic Fields controls.
// - Own DOM event binding for Persona Dynamic Fields controls.
// ============================================================================

// -----------------------------------------------------------------------------
// User Interface Events - Target Scope Helpers
// -----------------------------------------------------------------------------

function getFieldTargetScope($field) {
    const rawScope = String(
        $field?.attr('data-target-scope') ||
        $field?.closest('[data-target-scope]').attr('data-target-scope') ||
        '',
    );

    return rawScope === TARGET_SCOPE.PERSONA
        ? TARGET_SCOPE.PERSONA
        : TARGET_SCOPE.CHARACTER;
}

function getPanelSelectorForTargetScope(targetScope) {
    return targetScope === TARGET_SCOPE.PERSONA
        ? `#${UI.PERSONA_PANEL_ID}`
        : `#${UI.PANEL_ID}`;
}

function normalizeFieldForTargetScope(field, targetScope) {
    return targetScope === TARGET_SCOPE.PERSONA
        ? normalizePersonaField(field)
        : normalizeCharacterField(field);
}

function updateStateForTargetScope(targetScope, mutator, options = {}) {
    if (targetScope === TARGET_SCOPE.PERSONA) {
        updatePersonaState(mutator, options);
        return;
    }

    updateState(mutator, options);
}

function getFieldStateOptionsForTargetScope(targetScope, options = {}) {
    return {
        ...options,
        targetScope,
        includeTriggerActions: targetScope !== TARGET_SCOPE.PERSONA,
    };
}

function createBlankFieldForTargetScope(targetScope) {
    return normalizeFieldForTargetScope({
        name: '',
        activatingTriggers: '',
        enablingTriggers: '',
        disablingTriggers: '',
        triggerSources: [...DEFAULT_TRIGGER_SOURCES],
        activatingKeywordMode: KEYWORD_MODE.ALL,
        enablingKeywordMode: KEYWORD_MODE.ALL,
        disablingKeywordMode: KEYWORD_MODE.ALL,
        triggerActionInstruction: '',
        triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
        triggerActionGenerationId: 0,
        triggerActionEnabledByGeneration: false,
        content: '',
        enabled: true,
    }, targetScope);
}

function getCurrentPanelFieldOrder(targetScope) {
    return $(`${getPanelSelectorForTargetScope(targetScope)} .dsf-field`)
        .map(function mapFieldId() {
            return String($(this).attr('data-field-id') || $(this).data('field-id') || '');
        })
        .get()
        .filter(Boolean);
}

// -----------------------------------------------------------------------------
// User Interface Events - Character Top Bar Controls
// -----------------------------------------------------------------------------

function deleteAllDynamicFieldsForCurrentCharacter() {
    const characterId = getActiveCharacterId();

    if (characterId === undefined) {
        notify('warning', 'Select a character before deleting Character Dynamic Fields.');
        return;
    }

    const state = readState(characterId);

    if (!state.fields.length) {
        notify('info', 'There are no Character Dynamic Fields to delete.');
        applyUiVisibility();
        return;
    }

    const confirmed = window.confirm(
        'Delete all Character Dynamic Fields for this character?\n\n' +
        'This only affects Aspect: Evolutia Character Dynamic Fields. Native SillyTavern fields are not changed.',
    );

    if (!confirmed) {
        return;
    }

    updateState((nextState) => {
        nextState.fields = [];
    }, { rerender: true });

    notify('success', 'Deleted all Character Dynamic Fields for this character.');
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
                state.fields.push(createBlankFieldForTargetScope(TARGET_SCOPE.CHARACTER));
            }, { rerender: true });
        });

    bindFieldEditHandlers();
    bindFieldActionHandlers();
    bindFieldReorderHandlers();
    bindImportExportHandlers();
}

// -----------------------------------------------------------------------------
// User Interface Events - Persona Top Bar Controls
// -----------------------------------------------------------------------------

function deleteAllDynamicFieldsForCurrentPersona() {
    const personaId = getActivePersonaId();

    if (!personaId) {
        notify('warning', 'Select a persona before deleting Persona Dynamic Fields.');
        return;
    }

    const state = readPersonaState(personaId);

    if (!state.fields.length) {
        notify('info', 'There are no Persona Dynamic Fields to delete.');
        applyPersonaUiVisibility();
        return;
    }

    const confirmed = window.confirm(
        'Delete all Persona Dynamic Fields for this persona?\n\n' +
        'This only affects Aspect: Evolutia Persona Dynamic Fields. Native SillyTavern Persona Description is not changed.',
    );

    if (!confirmed) {
        return;
    }

    updatePersonaState((nextState) => {
        nextState.fields = [];
    }, { rerender: true });

    notify('success', 'Deleted all Persona Dynamic Fields for this persona.');
}

function bindPersonaUiHandlers() {
    $(document)
        .off(`change.${MODULE_NAME}`, `#${UI.PERSONA_SWAP_ID}`)
        .on(`change.${MODULE_NAME}`, `#${UI.PERSONA_SWAP_ID}`, function onPersonaSwapChanged() {
            updatePersonaState((state) => {
                state.swapEnabled = Boolean(this.checked);
            }, { rerender: false, syncPromptManager: true });
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.PERSONA_DELETE_ALL_TOP_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.PERSONA_DELETE_ALL_TOP_ID}`, deleteAllDynamicFieldsForCurrentPersona);

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.PERSONA_ADD_TOP_ID}, #${UI.PERSONA_ADD_BOTTOM_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.PERSONA_ADD_TOP_ID}, #${UI.PERSONA_ADD_BOTTOM_ID}`, function onPersonaAddField() {
            updatePersonaState((state) => {
                state.fields.push(createBlankFieldForTargetScope(TARGET_SCOPE.PERSONA));
            }, { rerender: true });
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
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);

                if (!field) {
                    return;
                }

                field.enabled = Boolean(this.checked);

                if (!field.enabled) {
                    resetTriggerActionLifecycle(field);
                }
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-field-name')
        .on(`input.${MODULE_NAME}`, '.dsf-field-name', function onFieldNameChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);
                if (field) field.name = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-activating-triggers')
        .on(`input.${MODULE_NAME}`, '.dsf-activating-triggers', function onActivatingTriggersChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);
                if (field) field.activatingTriggers = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-enabling-triggers')
        .on(`input.${MODULE_NAME}`, '.dsf-enabling-triggers', function onEnablingTriggersChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);
                if (field) field.enablingTriggers = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-disabling-triggers')
        .on(`input.${MODULE_NAME}`, '.dsf-disabling-triggers', function onDisablingTriggersChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);
                if (field) field.disablingTriggers = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`change.${MODULE_NAME}`, '.dsf-activating-keyword-mode')
        .on(`change.${MODULE_NAME}`, '.dsf-activating-keyword-mode', function onActivatingKeywordModeChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);
                if (field) field.activatingKeywordMode = normalizeKeywordMode(this.value);
            }, { rerender: false });
        });

    $(document)
        .off(`change.${MODULE_NAME}`, '.dsf-enabling-keyword-mode')
        .on(`change.${MODULE_NAME}`, '.dsf-enabling-keyword-mode', function onEnablingKeywordModeChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);
                if (field) field.enablingKeywordMode = normalizeKeywordMode(this.value);
            }, { rerender: false });
        });

    $(document)
        .off(`change.${MODULE_NAME}`, '.dsf-disabling-keyword-mode')
        .on(`change.${MODULE_NAME}`, '.dsf-disabling-keyword-mode', function onDisablingKeywordModeChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);
                if (field) field.disablingKeywordMode = normalizeKeywordMode(this.value);
            }, { rerender: false });
        });

    $(document)
        .off(`change.${MODULE_NAME}`, '.dsf-trigger-source')
        .on(`change.${MODULE_NAME}`, '.dsf-trigger-source', function onTriggerSourceChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);
            const selectedSources = $field
                .find('.dsf-trigger-source:checked')
                .map(function mapSource() {
                    return this.value;
                })
                .get();

            updateStateForTargetScope(targetScope, (state) => {
                const field = findField(state, fieldId);
                if (field) field.triggerSources = normalizeTriggerSources(selectedSources);
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-trigger-action-instruction')
        .on(`input.${MODULE_NAME}`, '.dsf-trigger-action-instruction', function onTriggerActionInstructionChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            if (targetScope === TARGET_SCOPE.PERSONA) {
                return;
            }

            updateState((state) => {
                const field = findField(state, fieldId);
                if (field) field.triggerActionInstruction = this.value;
            }, { rerender: false });
        });

    $(document)
        .off(`input.${MODULE_NAME}`, '.dsf-content')
        .on(`input.${MODULE_NAME}`, '.dsf-content', function onContentChanged() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
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
        .off(`click.${MODULE_NAME}`, '.dsf-delete-field')
        .on(`click.${MODULE_NAME}`, '.dsf-delete-field', function onDeleteField() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                state.fields = state.fields.filter((field) => String(field.id) !== fieldId);
            }, { rerender: true });
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '.dsf-duplicate-field')
        .on(`click.${MODULE_NAME}`, '.dsf-duplicate-field', function onDuplicateField() {
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            updateStateForTargetScope(targetScope, (state) => {
                const index = state.fields.findIndex((field) => String(field.id) === fieldId);
                if (index === -1) return;

                const copy = normalizeFieldForTargetScope({
                    ...state.fields[index],
                    id: makeId(),
                    name: `${state.fields[index].name || 'Field'} Copy`,
                    triggerActionPhase: TRIGGER_ACTION_PHASE.IDLE,
                    triggerActionGenerationId: 0,
                    triggerActionEnabledByGeneration: false,
                }, targetScope);

                state.fields.splice(index + 1, 0, copy);
            }, { rerender: true });
        });
}

// -----------------------------------------------------------------------------
// User Interface Events - Field Reordering
// -----------------------------------------------------------------------------

function moveFieldToOrder(state, fieldId, requestedOrder) {
    const currentIndex = state.fields.findIndex((field) => String(field.id) === String(fieldId));

    if (currentIndex === -1) {
        return;
    }

    const boundedOrder = Math.max(1, Math.min(Number(requestedOrder) || 1, state.fields.length));
    const [field] = state.fields.splice(currentIndex, 1);

    state.fields.splice(boundedOrder - 1, 0, field);
}

function commitDomFieldOrder(targetScope = TARGET_SCOPE.CHARACTER) {
    const orderedIds = getCurrentPanelFieldOrder(targetScope);

    if (!orderedIds.length) {
        return;
    }

    updateStateForTargetScope(targetScope, (state) => {
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

    const targetScope = String(targetField.getAttribute('data-target-scope') || TARGET_SCOPE.CHARACTER);

    if (targetScope !== fieldPointerDrag.targetScope) {
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
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);
            const cleanedValue = String(this.value || '').replace(/[^\d]/g, '');
            const requestedOrder = Number(cleanedValue || 1);

            this.value = String(requestedOrder);
            syncPositionInputWidth(this);

            updateStateForTargetScope(targetScope, (state) => {
                moveFieldToOrder(state, fieldId, requestedOrder);
            }, { rerender: true });
        });

    $(document)
        .off(`pointerdown.${MODULE_NAME}`, '.dsf-drag-handle')
        .on(`pointerdown.${MODULE_NAME}`, '.dsf-drag-handle', function onPointerDown(event) {
            const originalEvent = event.originalEvent;
            const $field = $(this).closest('.dsf-field');
            const fieldId = String($field.attr('data-field-id') || $field.data('field-id') || '');
            const targetScope = getFieldTargetScope($field);

            if (!fieldId || !originalEvent) {
                return;
            }

            event.preventDefault();

            fieldPointerDrag = {
                fieldId,
                targetScope,
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

            const targetScope = fieldPointerDrag.targetScope;

            $('.dsf-field').removeClass('dsf-dragging');
            stopFieldDragAutoScroll();
            fieldPointerDrag = null;
            commitDomFieldOrder(targetScope);
        });
}

// -----------------------------------------------------------------------------
// User Interface Events - Import / Export and Field Menus
// -----------------------------------------------------------------------------

function closeFieldMenus() {
    $('.dsf-keyword-triggers-menu, .dsf-trigger-actions-menu, .dsf-triggered-by-menu')
        .removeClass('dsf-menu-open')
        .css({
            '--dsf-menu-left': '',
            '--dsf-menu-top': '',
        });
}

function closeImportExportMenus() {
    $(`#${UI.IMPORT_MENU_ID}, #${UI.EXPORT_MENU_ID}, #${UI.PERSONA_IMPORT_MENU_ID}, #${UI.PERSONA_EXPORT_MENU_ID}`)
        .removeClass('dsf-menu-open');

    closeFieldMenus();
}

function toggleMenu(menuId) {
    const $menu = $(`#${menuId}`);
    const wasOpen = $menu.hasClass('dsf-menu-open');

    closeImportExportMenus();

    if (!wasOpen) {
        $menu.addClass('dsf-menu-open');
    }
}

function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function positionFloatingFieldMenuInViewport($menu, button) {
    const menuElement = $menu?.[0];

    if (!menuElement || !button) {
        return;
    }

    const margin = 8;
    const buttonRect = button.getBoundingClientRect();

    $menu.css({
        '--dsf-menu-left': `${margin}px`,
        '--dsf-menu-top': `${margin}px`,
    });

    requestAnimationFrame(() => {
        if (!$menu.hasClass('dsf-menu-open')) {
            return;
        }

        const menuWidth = Math.min(
            menuElement.offsetWidth || 210,
            window.innerWidth - (margin * 2),
        );
        const menuHeight = Math.min(
            menuElement.offsetHeight || 0,
            window.innerHeight - (margin * 2),
        );

        const maxLeft = Math.max(margin, window.innerWidth - menuWidth - margin);
        const maxTop = Math.max(margin, window.innerHeight - menuHeight - margin);

        const left = clampNumber(buttonRect.left, margin, maxLeft);
        let top = buttonRect.bottom + 4;

        if (top > maxTop && buttonRect.top - menuHeight - 4 >= margin) {
            top = buttonRect.top - menuHeight - 4;
        }

        top = clampNumber(top, margin, maxTop);

        $menu.css({
            '--dsf-menu-left': `${left}px`,
            '--dsf-menu-top': `${top}px`,
        });
    });
}

function toggleSiblingFieldMenu(button, menuSelector) {
    const $menu = $(button).siblings(menuSelector);
    const wasOpen = $menu.hasClass('dsf-menu-open');

    closeImportExportMenus();

    if (!wasOpen) {
        $menu.addClass('dsf-menu-open');
        positionFloatingFieldMenuInViewport($menu, button);
    }
}

function isDynamicFieldsMenuTarget(target) {
    const $target = $(target);

    return Boolean(
        $target.closest([
            '.dsf-menu-wrap',
            '.dsf-menu',
            '.dsf-keyword-triggers-wrap',
            '.dsf-trigger-actions-wrap',
            '.dsf-triggered-by-wrap',
            '.dsf-keyword-triggers-menu',
            '.dsf-trigger-actions-menu',
            '.dsf-triggered-by-menu',
            '.dsf-keyword-triggers-button',
            '.dsf-trigger-actions-button',
            '.dsf-triggered-by-button',
        ].join(', ')).length,
    );
}

function stopMenuEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
}

function bindImportExportHandlers() {
    $(document)
        .off(`click.${MODULE_NAME}`, '.dsf-keyword-triggers-button')
        .on(`click.${MODULE_NAME}`, '.dsf-keyword-triggers-button', function onKeywordTriggersClicked(event) {
            stopMenuEvent(event);
            toggleSiblingFieldMenu(this, '.dsf-keyword-triggers-menu');
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '.dsf-trigger-actions-button')
        .on(`click.${MODULE_NAME}`, '.dsf-trigger-actions-button', function onTriggerActionsClicked(event) {
            stopMenuEvent(event);
            toggleSiblingFieldMenu(this, '.dsf-trigger-actions-menu');
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '.dsf-triggered-by-button')
        .on(`click.${MODULE_NAME}`, '.dsf-triggered-by-button', function onTriggerSourcesClicked(event) {
            stopMenuEvent(event);
            toggleSiblingFieldMenu(this, '.dsf-triggered-by-menu');
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '.dsf-keyword-triggers-menu, .dsf-trigger-actions-menu, .dsf-triggered-by-menu')
        .on(`click.${MODULE_NAME}`, '.dsf-keyword-triggers-menu, .dsf-trigger-actions-menu, .dsf-triggered-by-menu', function onFieldMenuClicked(event) {
            event.stopPropagation();
            event.stopImmediatePropagation();
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.IMPORT_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.IMPORT_ID}`, function onImportClicked(event) {
            stopMenuEvent(event);
            toggleMenu(UI.IMPORT_MENU_ID);
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.EXPORT_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.EXPORT_ID}`, function onExportClicked(event) {
            stopMenuEvent(event);
            toggleMenu(UI.EXPORT_MENU_ID);
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.PERSONA_IMPORT_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.PERSONA_IMPORT_ID}`, function onPersonaImportClicked(event) {
            stopMenuEvent(event);
            toggleMenu(UI.PERSONA_IMPORT_MENU_ID);
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.PERSONA_EXPORT_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.PERSONA_EXPORT_ID}`, function onPersonaExportClicked(event) {
            stopMenuEvent(event);
            toggleMenu(UI.PERSONA_EXPORT_MENU_ID);
        });

    $(document)
        .off(`click.${MODULE_NAME}`, `#${UI.IMPORT_MENU_ID}, #${UI.EXPORT_MENU_ID}, #${UI.PERSONA_IMPORT_MENU_ID}, #${UI.PERSONA_EXPORT_MENU_ID}`)
        .on(`click.${MODULE_NAME}`, `#${UI.IMPORT_MENU_ID}, #${UI.EXPORT_MENU_ID}, #${UI.PERSONA_IMPORT_MENU_ID}, #${UI.PERSONA_EXPORT_MENU_ID}`, function onMenuClicked(event) {
            event.stopPropagation();
            event.stopImmediatePropagation();
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '[data-dsf-import]')
        .on(`click.${MODULE_NAME}`, '[data-dsf-import]', function onImportActionClicked(event) {
            event.stopPropagation();
            event.stopImmediatePropagation();

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
        .on(`click.${MODULE_NAME}`, '[data-dsf-export]', function onExportActionClicked(event) {
            event.stopPropagation();
            event.stopImmediatePropagation();

            const action = String($(this).data('dsf-export') || '');
            closeImportExportMenus();

            if (action === EXPORT_TARGET.FILE_JSON) {
                exportDynamicFieldsToFileJson();
            } else if (action === EXPORT_TARGET.CLIPBOARD_JSON) {
                exportDynamicFieldsToClipboardJson();
            }
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '[data-dsf-persona-import]')
        .on(`click.${MODULE_NAME}`, '[data-dsf-persona-import]', function onPersonaImportActionClicked(event) {
            event.stopPropagation();
            event.stopImmediatePropagation();

            const action = String($(this).data('dsf-persona-import') || '');
            closeImportExportMenus();

            if (action === IMPORT_SOURCE.PERSONA_DESCRIPTION) {
                importPersonaDynamicFieldsFromPersonaDescription();
            } else if (action === IMPORT_SOURCE.FILE_JSON) {
                importPersonaDynamicFieldsFromFileJson();
            } else if (action === IMPORT_SOURCE.CLIPBOARD_JSON) {
                importPersonaDynamicFieldsFromClipboardJson();
            }
        });

    $(document)
        .off(`click.${MODULE_NAME}`, '[data-dsf-persona-export]')
        .on(`click.${MODULE_NAME}`, '[data-dsf-persona-export]', function onPersonaExportActionClicked(event) {
            event.stopPropagation();
            event.stopImmediatePropagation();

            const action = String($(this).data('dsf-persona-export') || '');
            closeImportExportMenus();

            if (action === EXPORT_TARGET.FILE_JSON) {
                exportPersonaDynamicFieldsToFileJson();
            } else if (action === EXPORT_TARGET.CLIPBOARD_JSON) {
                exportPersonaDynamicFieldsToClipboardJson();
            }
        });

    $(document)
        .off(`change.${MODULE_NAME}`, `#${UI.CHARACTER_CARD_IMPORT_FILE_ID}`)
        .on(`change.${MODULE_NAME}`, `#${UI.CHARACTER_CARD_IMPORT_FILE_ID}`, handleCharacterCardImportFileSelected);

    $(document)
        .off(`change.${MODULE_NAME}`, `#${UI.DYNAMIC_FIELDS_IMPORT_FILE_ID}`)
        .on(`change.${MODULE_NAME}`, `#${UI.DYNAMIC_FIELDS_IMPORT_FILE_ID}`, handleDynamicFieldsImportFileSelected);

    $(document)
        .off(`change.${MODULE_NAME}`, `#${UI.PERSONA_DYNAMIC_FIELDS_IMPORT_FILE_ID}`)
        .on(`change.${MODULE_NAME}`, `#${UI.PERSONA_DYNAMIC_FIELDS_IMPORT_FILE_ID}`, handlePersonaDynamicFieldsImportFileSelected);

    $(document)
        .off(`click.${MODULE_NAME}.menus`)
        .on(`click.${MODULE_NAME}.menus`, function onDocumentClickedForMenus(event) {
            if (isDynamicFieldsMenuTarget(event.target)) {
                return;
            }

            closeImportExportMenus();
        });

    $(window)
        .off(`resize.${MODULE_NAME}.menus scroll.${MODULE_NAME}.menus`)
        .on(`resize.${MODULE_NAME}.menus scroll.${MODULE_NAME}.menus`, function onViewportChangedForMenus() {
            closeImportExportMenus();
        });
}

// ============================================================================
// Section 16. Generation Flow
// ============================================================================
// Purpose:
// - Own Prompt Interceptor preparation and generation completion cleanup.
// ============================================================================

// -----------------------------------------------------------------------------
// Generation Flow - Interceptor Argument Helpers
// -----------------------------------------------------------------------------

function getInterceptorOptionsFromArgs(args = []) {
    const objects = args.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry));

    return Object.assign({}, ...objects);
}

function getInterceptorChatFromArgs(args = []) {
    const firstArray = args.find((entry) => Array.isArray(entry));

    if (Array.isArray(firstArray)) {
        return firstArray;
    }

    const options = getInterceptorOptionsFromArgs(args);
    const optionChat = options.chat ?? options.messages ?? options.promptMessages;

    return Array.isArray(optionChat) ? optionChat : [];
}

// -----------------------------------------------------------------------------
// Generation Flow - Lifecycle Helpers
// -----------------------------------------------------------------------------

function generationEntityIdsMatch(characterId, personaId) {
    const normalizedCharacterId = characterId === undefined || characterId === null || characterId === ''
        ? undefined
        : normalizeCharacterId(characterId);
    const normalizedPersonaId = normalizePersonaId(personaId);

    const currentCharacterMatches = (
        currentGenerationCharacterId === normalizedCharacterId ||
        String(currentGenerationCharacterId ?? '') === String(normalizedCharacterId ?? '')
    );

    const currentPersonaMatches = (
        currentGenerationPersonaId === normalizedPersonaId ||
        String(currentGenerationPersonaId ?? '') === String(normalizedPersonaId ?? '')
    );

    return currentCharacterMatches && currentPersonaMatches;
}

function beginGenerationLifecycle(characterId, personaId = getActivePersonaId()) {
    const normalizedCharacterId = characterId === undefined || characterId === null || characterId === ''
        ? undefined
        : normalizeCharacterId(characterId);
    const normalizedPersonaId = normalizePersonaId(personaId);

    // SillyTavern may build/prepare prompt data more than once during one logical
    // generation. Reusing the active lifecycle prevents Character Trigger Action
    // state from being treated as "earlier generation" during repeated prompt builds.
    if (
        currentGenerationId &&
        generationEntityIdsMatch(normalizedCharacterId, normalizedPersonaId)
    ) {
        clearPreparedPrompt(normalizedCharacterId);
        clearPreparedPersonaPrompt(normalizedPersonaId);
        return currentGenerationId;
    }

    generationSerial += 1;
    currentGenerationId = generationSerial;
    currentGenerationCharacterId = normalizedCharacterId;
    currentGenerationPersonaId = normalizedPersonaId;

    clearPreparedPrompt(normalizedCharacterId);
    clearPreparedPersonaPrompt(normalizedPersonaId);

    return currentGenerationId;
}

function clearGenerationLifecycle() {
    currentGenerationCharacterId = undefined;
    currentGenerationPersonaId = undefined;
    currentGenerationId = 0;
}

function resolveInterceptorCharacterId(options = {}) {
    if (options && Object.keys(options).length) {
        const generationCharacterId = getGenerationCharacterId(options);

        if (generationCharacterId !== undefined && generationCharacterId !== null && generationCharacterId !== '') {
            return generationCharacterId;
        }
    }

    if (currentGenerationCharacterId !== undefined && currentGenerationCharacterId !== null && currentGenerationCharacterId !== '') {
        return currentGenerationCharacterId;
    }

    return getActiveCharacterId();
}

function resolveInterceptorPersonaId(options = {}) {
    if (options && Object.keys(options).length) {
        const generationPersonaId = getGenerationPersonaId(options);

        if (generationPersonaId !== undefined && generationPersonaId !== null && generationPersonaId !== '') {
            return generationPersonaId;
        }
    }

    if (currentGenerationPersonaId !== undefined && currentGenerationPersonaId !== null && currentGenerationPersonaId !== '') {
        return currentGenerationPersonaId;
    }

    return getActivePersonaId();
}

// -----------------------------------------------------------------------------
// Generation Flow - Character Trigger Action Finalization
// -----------------------------------------------------------------------------

function finalizeTriggerActionLifecycle({ cancel = false } = {}) {
    const characterId = currentGenerationCharacterId;
    const generationId = currentGenerationId;

    if (characterId === undefined || characterId === null || characterId === '' || !generationId) {
        return;
    }

    const state = readState(characterId);

    if (!state.swapEnabled) {
        return;
    }

    let changed = false;

    for (const field of state.fields) {
        const normalized = normalizeCharacterField(field);

        if (
            normalized.triggerActionPhase !== TRIGGER_ACTION_PHASE.ACTION_INJECTED ||
            normalized.triggerActionGenerationId !== generationId
        ) {
            continue;
        }

        if (cancel) {
            if (normalized.triggerActionEnabledByGeneration) {
                applyMutableFieldState(field, { enabled: false });
            }

            resetTriggerActionLifecycle(field);
        } else {
            applyMutableFieldState(field, {
                triggerActionPhase: TRIGGER_ACTION_PHASE.CONTENT_READY,
                triggerActionGenerationId: generationId,
                triggerActionEnabledByGeneration: false,
            });
        }

        changed = true;
    }

    if (changed) {
        scheduleSave(characterId, state);

        setTimeout(() => {
            renderPanel();
            updateTokenEstimate();
            updateSettingsActionState();
        }, 0);
    }
}

// -----------------------------------------------------------------------------
// Generation Flow - Completion Cleanup
// -----------------------------------------------------------------------------

function finishGenerationLifecycle({ cancel = false } = {}) {
    const characterId = currentGenerationCharacterId;
    const personaId = currentGenerationPersonaId;

    finalizeTriggerActionLifecycle({ cancel });
    restoreSuppressedDescriptions();

    if (characterId !== undefined && characterId !== null && characterId !== '') {
        clearPreparedPrompt(characterId);
    }

    if (personaId !== undefined && personaId !== null && personaId !== '') {
        clearPreparedPersonaPrompt(personaId);
    }

    clearGenerationLifecycle();
}

// -----------------------------------------------------------------------------
// Generation Flow - Prompt Interceptor
// -----------------------------------------------------------------------------

async function aspectEvolutiaGenerateInterceptor(...args) {
    const chat = getInterceptorChatFromArgs(args);
    const options = getInterceptorOptionsFromArgs(args);

    const characterId = resolveInterceptorCharacterId(options);
    const personaId = resolveInterceptorPersonaId(options);

    if (
        (characterId === undefined || characterId === null || characterId === '') &&
        !personaId
    ) {
        clearAllPreparedPrompts();
        clearGenerationLifecycle();
        return;
    }

    const generationId = beginGenerationLifecycle(characterId, personaId);

    if (characterId !== undefined && characterId !== null && characterId !== '') {
        const characterState = readState(characterId);

        if (characterState.swapEnabled) {
            const characterPrompt = prepareReplacementPromptForGeneration(
                characterId,
                generationId,
                Array.isArray(chat) ? chat : [],
                {
                    mutate: true,
                },
            );

            setPreparedPrompt(characterId, generationId, characterPrompt);
        } else {
            clearPreparedPrompt(characterId);
        }
    }

    if (personaId) {
        const personaState = readPersonaState(personaId);

        if (personaState.swapEnabled && isPersonaDescriptionInPromptManagerPosition(personaId)) {
            const personaPrompt = preparePersonaReplacementPromptForGeneration(
                personaId,
                generationId,
                Array.isArray(chat) ? chat : [],
                {
                    mutate: true,
                },
            );

            setPreparedPersonaPrompt(personaId, generationId, personaPrompt);
        } else {
            clearPreparedPersonaPrompt(personaId);
        }
    }
}

globalThis[ASPECT_INTERCEPTOR_NAME] = aspectEvolutiaGenerateInterceptor;

// -----------------------------------------------------------------------------
// Generation Flow - Prompt Build Cleanup
// -----------------------------------------------------------------------------

function onGenerationPromptBuilt() {
    restoreSuppressedDescriptions();
}

// -----------------------------------------------------------------------------
// Generation Flow - Completion
// -----------------------------------------------------------------------------

function onGenerationFinished() {
    finishGenerationLifecycle({ cancel: false });
}

function onGenerationStopped() {
    finishGenerationLifecycle({ cancel: true });
}

// ============================================================================
// Section 17. SillyTavern Event Wiring
// ============================================================================
// Purpose:
// - Own subscriptions to SillyTavern app, character, persona, chat, prompt,
//   settings, and generation events.
// ============================================================================

// -----------------------------------------------------------------------------
// SillyTavern Event Wiring - Dynamic Fields Menu State
// -----------------------------------------------------------------------------

function isAnyDynamicFieldsMenuOpen() {
    return Boolean(
        $([
            `#${UI.IMPORT_MENU_ID}.dsf-menu-open`,
            `#${UI.EXPORT_MENU_ID}.dsf-menu-open`,
            `#${UI.PERSONA_IMPORT_MENU_ID}.dsf-menu-open`,
            `#${UI.PERSONA_EXPORT_MENU_ID}.dsf-menu-open`,
            '.dsf-keyword-triggers-menu.dsf-menu-open',
            '.dsf-trigger-actions-menu.dsf-menu-open',
            '.dsf-triggered-by-menu.dsf-menu-open',
        ].join(',')).length,
    );
}

function closeDynamicFieldsMenusForHardRefresh() {
    if (typeof closeImportExportMenus === 'function') {
        closeImportExportMenus();
        return;
    }

    $('.dsf-menu-open').removeClass('dsf-menu-open');
}

// -----------------------------------------------------------------------------
// SillyTavern Event Wiring - Persona Mount Safety
// -----------------------------------------------------------------------------

function isPersonaUiMounted() {
    return Boolean(
        document.getElementById(UI.PERSONA_BAR_ID) &&
        document.getElementById(UI.PERSONA_PANEL_ID),
    );
}

function canMountPersonaUi() {
    return Boolean(getPersonaDescriptionTextarea().length);
}

function mountPersonaUiIfMissing() {
    if (!canMountPersonaUi()) {
        return;
    }

    if (isPersonaUiMounted()) {
        applyPersonaUiVisibility();
        updatePersonaTokenEstimate();
        updateSettingsActionState();
        return;
    }

    mountPersonaUi();
}

function schedulePersonaMountIfMissing() {
    clearTimeout(personaMountTimer);

    personaMountTimer = setTimeout(() => {
        mountPersonaUiIfMissing();
    }, 150);
}

function scheduleAllMountsIfMissing() {
    if (typeof scheduleMount === 'function') {
        scheduleMount();
    } else {
        setTimeout(mountUi, 150);
    }

    schedulePersonaMountIfMissing();
}

function ensurePersonaDomObserver() {
    if (ensurePersonaDomObserver.observer || !document.body) {
        return;
    }

    const observer = new MutationObserver(() => {
        // Only mount after SillyTavern has actually created/replaced the Persona
        // description area and our Persona UI is missing. Never remount simply
        // because Persona Management mutated unrelated DOM.
        if (canMountPersonaUi() && !isPersonaUiMounted()) {
            schedulePersonaMountIfMissing();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    ensurePersonaDomObserver.observer = observer;
}

// -----------------------------------------------------------------------------
// SillyTavern Event Wiring - Shared Refresh Helpers
// -----------------------------------------------------------------------------

function refreshCharacterUiAfterStateChange() {
    closeDynamicFieldsMenusForHardRefresh();

    stateCache.clear();
    clearAllPreparedPrompts();
    clearGenerationLifecycle();
    restoreSuppressedDescriptions();

    if (typeof scheduleMount === 'function') {
        scheduleMount();
    } else {
        setTimeout(mountUi, 150);
    }

    updateSettingsActionState();
    syncPromptManagerWithActiveState();
}

function refreshPersonaUiAfterPersonaChanged() {
    // Persona changes are a real identity/context switch. Closing menus here is
    // correct because the open field editor may now belong to a different persona.
    closeDynamicFieldsMenusForHardRefresh();

    clearPersonaStateCache();
    clearAllPreparedPrompts();
    clearGenerationLifecycle();

    if (isPersonaUiMounted()) {
        renderPersonaPanel();
        applyPersonaUiVisibility();
        updatePersonaTokenEstimate();
    } else {
        schedulePersonaMountIfMissing();
    }

    updateSettingsActionState();
    syncPromptManagerWithActivePersonaState();
}

function refreshAllUiAfterStateChange() {
    closeDynamicFieldsMenusForHardRefresh();

    clearAllStateCaches();
    clearAllPreparedPrompts();
    clearGenerationLifecycle();
    restoreSuppressedDescriptions();

    scheduleAllMountsIfMissing();

    updateSettingsActionState();
    syncPromptManagerWithActiveStates();
}

function refreshTokenEstimatesAfterContextChange() {
    updateTokenEstimate();
    updatePersonaTokenEstimate();
}

function refreshAfterGenericSettingsUpdate() {
    // SETTINGS_UPDATED also fires after our own debounced saves and Prompt Manager
    // syncs. Do not mount or render panels here; doing so destroys open popout DOM.
    updateSettingsActionState();
    refreshTokenEstimatesAfterContextChange();

    if (!isPersonaUiMounted()) {
        schedulePersonaMountIfMissing();
    } else {
        applyPersonaUiVisibility();
    }
}

function runAfterSettingsSettle(callback, delay = 100) {
    setTimeout(callback, delay);
}

function registerEventHandler(eventSource, eventTypes, eventName, handler) {
    const eventType = eventTypes?.[eventName];

    if (!eventType || typeof eventSource?.on !== 'function') {
        return false;
    }

    eventSource.on(eventType, handler);
    return true;
}

// -----------------------------------------------------------------------------
// SillyTavern Event Wiring - Registration
// -----------------------------------------------------------------------------

function registerEvents() {
    if (registerEvents.registered) {
        return;
    }

    const ctx = getContext();
    const eventSource = ctx?.eventSource;
    const eventTypes = ctx?.eventTypes ?? ctx?.event_types;

    if (!eventSource || !eventTypes) {
        setTimeout(registerEvents, 250);
        return;
    }

    registerEvents.registered = true;
    ensurePersonaDomObserver();

    const onAppReady = () => {
        mountExtensionSettings();
        mountUi();
        mountPersonaUiIfMissing();
        updateSettingsActionState();
        syncPromptManagerWithActiveStates();
    };

    registerEventHandler(eventSource, eventTypes, 'APP_INITIALIZED', () => {
        mountExtensionSettings();
        mountUi();
        mountPersonaUiIfMissing();
        updateSettingsActionState();
    });

    registerEventHandler(eventSource, eventTypes, 'APP_READY', onAppReady);

    registerEventHandler(eventSource, eventTypes, 'CHAT_CHANGED', () => {
        refreshAllUiAfterStateChange();
    });

    registerEventHandler(eventSource, eventTypes, 'CHARACTER_EDITED', () => {
        refreshCharacterUiAfterStateChange();
    });

    registerEventHandler(eventSource, eventTypes, 'CHARACTER_PAGE_LOADED', () => {
        refreshCharacterUiAfterStateChange();
    });

    registerEventHandler(eventSource, eventTypes, 'PERSONA_CHANGED', () => {
        refreshPersonaUiAfterPersonaChanged();
    });

    registerEventHandler(eventSource, eventTypes, 'MESSAGE_SENT', () => {
        runAfterSettingsSettle(refreshTokenEstimatesAfterContextChange, 50);
    });

    registerEventHandler(eventSource, eventTypes, 'MESSAGE_RECEIVED', () => {
        runAfterSettingsSettle(refreshTokenEstimatesAfterContextChange, 50);
    });

    registerEventHandler(eventSource, eventTypes, 'USER_MESSAGE_RENDERED', () => {
        runAfterSettingsSettle(refreshTokenEstimatesAfterContextChange, 50);
    });

    registerEventHandler(eventSource, eventTypes, 'GENERATE_AFTER_DATA', onGenerationPromptBuilt);
    registerEventHandler(eventSource, eventTypes, 'GENERATE_AFTER_COMBINE_PROMPTS', onGenerationPromptBuilt);

    registerEventHandler(eventSource, eventTypes, 'GENERATION_ENDED', onGenerationFinished);
    registerEventHandler(eventSource, eventTypes, 'GENERATION_STOPPED', onGenerationStopped);

    registerEventHandler(eventSource, eventTypes, 'OAI_PRESET_CHANGED_AFTER', () => {
        runAfterSettingsSettle(() => {
            updateSettingsActionState();
            syncPromptManagerWithActiveStates();
        });
    });

    registerEventHandler(eventSource, eventTypes, 'PRESET_CHANGED', () => {
        runAfterSettingsSettle(() => {
            updateSettingsActionState();
            syncPromptManagerWithActiveStates();
        });
    });

    registerEventHandler(eventSource, eventTypes, 'SETTINGS_UPDATED', () => {
        runAfterSettingsSettle(refreshAfterGenericSettingsUpdate, 100);
    });

    registerEventHandler(eventSource, eventTypes, 'WORLDINFO_UPDATED', () => {
        runAfterSettingsSettle(refreshTokenEstimatesAfterContextChange, 50);
    });

    registerEventHandler(eventSource, eventTypes, 'WORLDINFO_SETTINGS_UPDATED', () => {
        runAfterSettingsSettle(refreshTokenEstimatesAfterContextChange, 50);
    });
}

// ============================================================================
// Section 18. DOM Mount Observer
// ============================================================================
// Purpose:
// - Own remounting the UI when SillyTavern replaces character editor DOM.
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
// Section 19. Extension Activation
// ============================================================================
// Purpose:
// - Own one-time startup for Aspect: Evolutia.
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