# 🚧 Not Yet Ready! Work in Progress. 🚧

# Aspect: Evolutia

Aspect: Evolutia is a SillyTavern extension for swapping a character card’s static Description field on-demand with organized, trigger-aware Dynamic Fields.

It is designed for characters to evolve across arcs, stages, revelations, timelines, or roleplay conditions. Instead of stuffing every version of a character into the Description and asking the model ignores irrelevant information, Aspect: Evolutia lets you split character-defining information into separate fields and inject only the fields that matter.

The goal is to make character cards cleaner, more stage-aware, and easier to maintain without permanently overwriting or deleting the original SillyTavern Description.

## What It Does

- Adds a Dynamic Fields mode to the character editor
- Hides the normal Description editor while Dynamic Fields mode is enabled
- Stores Dynamic Fields per character card using SillyTavern extension data
- Creates default fields for new Dynamic Fields setups:
  - Background
  - Personality
  - Appearance
- Lets you add, duplicate, delete, and edit custom Dynamic Fields
- Lets each field have:
  - Field Name
  - Field Purpose
  - Keyword Triggers
  - Content
  - Inject toggle
  - Optional custom instruction text
- Supports keyword-triggered field injection
- Treats blank keyword triggers as always eligible for injection
- Treats blank content as non-injectable
- Uses current unsent input for keyword trigger matching
- Wraps Dynamic Fields in clear, LLM-readable bracket tags
- Identifies the fields as applying to the assistant-written character, not the user persona
- Automatically creates and manages an Aspect: Evolutia Prompt Manager prompt
- Automatically toggles native Character Description off when Dynamic Fields mode is enabled
- Automatically toggles native Character Description back on when Dynamic Fields mode is disabled
- Uses a custom macro to inject either:
  - Dynamic Fields when Dynamic Fields mode is enabled
  - The native Description when Dynamic Fields mode is disabled
- Keeps Prompt Manager ordering available instead of forcing extension-prompt ordering
- Shows a Dynamic Fields token estimate while Dynamic Fields mode is active
- Hides the standard character token counter while Dynamic Fields mode is active
- Includes extension drawer controls for field cleanup and reset actions

## Dynamic Fields

Each Dynamic Field represents one focused piece of character-defining information.

Examples:

- Background
- Personality
- Appearance
- Pre-Reveal State
- Post-Reveal State
- Combat Style
- Relationships
- Speech Pattern
- Knowledge Limits
- Emotional State
- Inventory
- Injuries
- Faction Role

Each field can be written and triggered separately, allowing the character to evolve without forcing every version of the character into the prompt at once.

## Keyword Triggers

Keyword Triggers decide when a field becomes eligible for injection.

Triggers may be separated by:

- Commas
- Semicolons
- New lines

Example:

```text
Intro, Pre-Reveal, EVOLUTION_STAGE: Pre-War Arc
```

Please consider tipping a job well done. 

<a href="https://ko-fi.com/genisai">
  <img src="https://github.com/Vectricity/st-aspect-destinia/raw/assets/assets/ko-fi_thumbnail_genisai.png" alt="Support Genisai on Ko-fi" width="400">
</a>
