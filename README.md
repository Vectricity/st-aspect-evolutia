# Aspect: Evolutia

Aspect: Evolutia is a SillyTavern extension for swapping a character card’s static Description field on-demand with organized, trigger-aware Dynamic Fields.

It is designed for characters to evolve across arcs, stages, revelations, timelines, or roleplay conditions. Instead of stuffing every version of a character into the Description and asking the model to ignore irrelevant information, Aspect: Evolutia lets you split character-defining information into separate fields and inject only the fields that matter.

The goal is to make character cards cleaner, more stage-aware, and easier to maintain without permanently overwriting or deleting the original SillyTavern Description.

## What It Does

- Adds a Dynamic Fields mode to the character editor
- Hides the native Description field while Dynamic Fields mode is active
- Stores Dynamic Fields per character card using SillyTavern extension data
- Creates default fields for new setups:
  - Background
  - Personality
  - Appearance
- Lets each field contain focused character information
- Lets fields be manually enabled, disabled, duplicated, deleted, and reordered
- Supports trigger-aware injection through:
  - Activating Triggers
  - Enabling Triggers
  - Disabling Triggers
- Lets triggers scan different sources, including:
  - Last User Message
  - Last Assistant Message
  - System Prompts
  - Quiet Prompts
  - World Info / Lorebooks
- Supports optional Trigger Actions for custom behavior before field content becomes active
- Automatically manages the Aspect: Evolutia Prompt Manager prompt
- Preserves Prompt Manager ordering instead of forcing extension-prompt placement
- Uses a Prompt Interceptor to prepare Dynamic Fields before prompt construction
- Uses a read-only macro as the Prompt Manager insertion point
- Supports importing Dynamic Fields from:
  - Character Card
  - SillyTavern Fields
  - File (JSON)
  - Clipboard (JSON)
- Supports exporting Dynamic Fields to:
  - File (JSON)
  - Clipboard (JSON)
- Shows a Dynamic Fields token estimate while Dynamic Fields mode is active
- Includes extension drawer controls for cleanup and reset actions

## Dynamic Fields

Each Dynamic Field can define separate character information.

Examples:

- Background
- Personality
- Appearance
- Pre-Reveal State
- Post-Reveal State
- Combat Style
- Relationships
- Speech Pattern
- Knowledge
- Emotional State
- Inventory
- Injuries
- Wardrobe
- Current Outfit
- Current Form
- Current Location

Each field can be written and triggered separately, allowing the character to evolve without forcing every version of the character into the prompt at once.

Fields can also be manually reordered, which also controls the field’s injection order.

## Keyword Triggers

Keyword Triggers decide when a field becomes eligible for injection or when its Inject state should change.

Keyword Triggers are grouped into three types:

- Activating Triggers
- Enabling Triggers
- Disabling Triggers

Activating Triggers inject field Content when matched.

Enabling Triggers can turn Inject on when matched.

Disabling Triggers can turn Inject off when matched.

## Trigger Sources

Trigger Sources decide where a field looks for keyword matches.

Available Trigger Sources include:

- Quiet Prompts
- System Prompts
- Last Assistant Message
- Last User Message
- World Info / Lorebooks

For example, a field can be enabled when the assistant says a specific phrase, when a user message contains a keyword, or when relevant World Info / Lorebook content is active.

## Trigger Actions

Trigger Actions are optional action instructions that can inject before a field’s normal Content becomes active.

Trigger Actions are useful when a keyword should cause the character to perform an action before the new field content becomes part of the character’s active state.

Example Trigger Action:

```text
I get dressed in my nightwear.
```

Example Content that becomes active after the Trigger Action:

```text
I am currently wearing my nightwear.
```

Please consider tipping a job well done. 

<a href="https://ko-fi.com/genisai">
  <img src="https://github.com/Vectricity/st-aspect-destinia/raw/assets/assets/ko-fi_thumbnail_genisai.png" alt="Support Genisai on Ko-fi" width="400">
</a>
