# Hear-Answer Standard Flow: Start/Stop Prompt Tones

## 1. Summary

- Change title: Add start/stop prompt-tone steps around recording in hear-answer standard flow.
- Date: 2026-03-03
- Type IDs involved: `speaking_hear_answer`
- Owner: Engine + Docs

## 2. Change

- Per-question recording loop updated to:
  - prompt tone (start recording)
  - answer/recording step
  - prompt tone (stop recording)

Default audio URLs:

- `/static/audio/开始录音.mp3`
- `/static/audio/停止录音.mp3`

## 3. Compatibility

- Added migration for cached legacy standard module:
  - detect old 5-step default with single `small_time` prompt tone;
  - upgrade to new 6-step baseline automatically.

## 4. Verification

- `node --test` passed.

