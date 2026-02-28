# MoE Orchestrator — SillyTavern Extension

**Mixture of Experts for your group chats.** Get two (or more) AI drafts, then let an Orchestrator character merge them into one polished response.

> Vibe-coded with Claude Opus ✨

## How It Works

```
You write a message
      ↓
 ┌────┴────┐
 ▼         ▼
Expert 1  Expert 2   ← each generates a response (visible in chat)
 └────┬────┘
      ▼
 Orchestrator         ← reads both drafts, merges into the final post
      ↓
  Final response
```

1. You send a message.
2. The extension triggers each **Expert** in the group one by one. Their responses appear in the chat so you can see every draft.
3. After all Experts have spoken, the **Orchestrator** character receives a merge instruction and writes the final, unified response.

That's it. One button to enable, pick who's the Orchestrator, and you're set.

## Why?

Born from a simple dream: *what if you could take two AI drafts and merge them into one perfect post?*

If you write third-person RP with a narrator who controls all characters at once, this gives you the best of both worlds — one model's creativity, another model's consistency, combined into a single polished output. The Orchestrator resolves contradictions, keeps the tone, and delivers a post that neither model could produce alone.

## Works great with st-multi-model-chat

This extension was designed to pair with [st-multi-model-chat](https://github.com/Punikki/st-multi-model-chat). Assign different AI models (Gemini, Claude, GPT, local models, etc.) to different characters, and MoE Orchestrator will chain their outputs automatically. That's the real power — combining the **strengths of different models** into one response.

## Requirements

- **SillyTavern** 1.10.0+
- A **Group Chat** with at least 2 characters + 1 orchestrator
- Group must be set to **Manual** activation mode  
  *(Group Settings → Response Order → Manual)*

## Installation

### Via SillyTavern Extension Installer (recommended)

1. Open SillyTavern → Extensions → Install Extension
2. Paste the repository URL:
   ```
   https://github.com/CATIOR/st-moe-orchestrator
   ```
3. Click Install. Done.

### Manual

1. Clone or download this repo into your SillyTavern extensions folder:
   ```
   SillyTavern/data/default-user/extensions/st-moe-orchestrator/
   ```
2. Restart or refresh SillyTavern.

## Setup

1. Open **Extensions** panel (puzzle piece icon).
2. Expand **MoE Orchestrator**.
3. Check **Enable MoE Sequence**.
4. Select the **Orchestrator Character** from the dropdown (everyone else in the group becomes an Expert).
5. *(Optional)* Customize the merge prompt — this is the instruction the Orchestrator sees before writing its response.

## Tips

- The default merge prompt works well out of the box, but feel free to tailor it to your writing style.
- Put your strongest / most expensive model on the Orchestrator — it does the heavy lifting.
- Experts can be cheap or fast models; they just provide raw material.
- The Orchestrator's own character card (system prompt, personality, etc.) still applies on top of the merge instruction.

## License

MIT — do whatever you want with it.

## Credits

Made by **CATIOR** — vibe-coded with Claude Opus.
