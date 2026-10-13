# Voice dictation

The home and studio composers have a borderless microphone button. Recording displays an actual microphone waveform, elapsed time, cancel and finish controls. Cancel stops the tracks without uploading. Finish sends one bounded recording and appends its transcript without submitting the prompt. This is dictation with a transcript after finish, not live speech-to-speech conversation.

The selected model is `microsoft/mai-transcribe-2` through OpenRouter's dedicated audio transcription endpoint. Its advertised price is $0.10 per audio hour, approximately $0.00167/minute. At the inspected Artificial Analysis non-streaming benchmark it scored 2.0% AA-WER; cheaper models and models with lower error exist. It was chosen as a strong accuracy/cost option available through the requested provider, not as the absolute cheapest model.

The browser captures audio with Web Audio and encodes mono 16 kHz 16-bit PCM WAV. The server accepts only the canonical header, correct byte sizes, non-silent audio and 0.5–120 seconds. It accepts no arbitrary file/archive/audio URL. Authentication, origin/CSRF, request IDs, per-user rate/concurrency caps, row-locked credits and replay protection apply. Audio is not stored; the transcript/status is saved for recovery and account deletion removes it. OpenRouter receives the audio with ZDR/data-collection-deny routing; this policy may make unavailable endpoints fail rather than weakening it silently. Failed requests release the reservation.

A real synthetic English recording was transcribed successfully by OpenRouter. Browser tests use a fake microphone and intercepted provider response to verify waveform, cancel-without-upload, canonical WAV encoding and append behavior in both composers. Exact pixel-for-pixel copying of the Codex desktop UI was not inspected; the implemented control follows the requested microphone/waveform/cancel/finish interaction.

Sources: [Artificial Analysis](https://artificialanalysis.ai/speech-to-text/non-streaming), [OpenRouter MAI-Transcribe 2](https://openrouter.ai/microsoft/mai-transcribe-2), [OpenRouter transcription API](https://openrouter.ai/docs/guides/overview/multimodal/stt).
