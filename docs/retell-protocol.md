# Retell WebSocket Protocol

This document describes the WebSocket protocol used to communicate with Retell AI.

## Connection

Retell initiates a WebSocket connection to your server when a call begins. The connection URL can include a `call_id` query parameter:

```
ws://your-server:8080?call_id=abc123
```

If no `call_id` is provided, the server generates a UUID.

## Message Flow

```
Retell                          Your Server
  |                                  |
  |-------- connection open -------->|
  |                                  |
  |<-------- ready to receive -------|
  |                                  |
  |-- update_only (transcript) ----->|
  |                                  |
  |-- response_required ------------>|
  |                                  |
  |<-------- response chunk 1 -------|
  |<-------- response chunk 2 -------|
  |<-------- response complete ------|
  |                                  |
  |-- update_only (with agent) ----->|
  |                                  |
  |         ... continues ...        |
  |                                  |
  |-------- connection close ------->|
```

## Incoming Messages

### Structure

```typescript
interface RetellRequest {
  interaction_type: "response_required" | "reminder_required" | "update_only" | "ping_pong";
  transcript?: TranscriptEntry[];
  response_id?: number;
}

interface TranscriptEntry {
  role: "agent" | "user";
  content: string;
}
```

### Interaction Types

#### `response_required`

The user has finished speaking and expects a response. The transcript contains the full conversation history.

```json
{
  "interaction_type": "response_required",
  "transcript": [
    { "role": "user", "content": "What's the weather like today?" }
  ]
}
```

#### `reminder_required`

The user hasn't spoken for a while. Your server should prompt them or ask if they're still there.

```json
{
  "interaction_type": "reminder_required",
  "transcript": [
    { "role": "agent", "content": "Hello, how can I help you?" }
  ]
}
```

#### `update_only`

Transcript update only. No response needed. This happens when Retell updates the transcript with the agent's response or intermediate transcription.

```json
{
  "interaction_type": "update_only",
  "transcript": [
    { "role": "user", "content": "Hello" },
    { "role": "agent", "content": "Hi there! How can I help?" }
  ]
}
```

#### `ping_pong`

Keep-alive message. Respond with a pong to maintain the connection.

```json
{
  "interaction_type": "ping_pong",
  "response_id": 1234567890
}
```

## Outgoing Messages

### Response Structure

```typescript
interface RetellResponse {
  response_id: number;
  content: string;
  content_complete: boolean;
  end_call: boolean;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `response_id` | number | Incrementing ID for this response sequence |
| `content` | string | Text chunk to speak |
| `content_complete` | boolean | `true` for the final chunk |
| `end_call` | boolean | `true` to hang up after this message |

### Streaming Responses

For natural conversation flow, stream responses in chunks:

```json
{ "response_id": 1, "content": "Sure, I can ", "content_complete": false, "end_call": false }
{ "response_id": 1, "content": "help you with that.", "content_complete": false, "end_call": false }
{ "response_id": 1, "content": "", "content_complete": true, "end_call": false }
```

### Pong Response

```json
{
  "response_type": "pong",
  "timestamp": 1234567890
}
```

### Ending a Call

To end the call gracefully:

```json
{
  "response_id": 5,
  "content": "Goodbye! Have a great day.",
  "content_complete": true,
  "end_call": true
}
```

## Best Practices

### Chunking

- Send chunks of 15-30 characters for smooth TTS
- Don't wait for the full response before sending
- Empty content with `content_complete: true` signals the end

### Latency

- Start streaming as soon as you have content
- Use streaming LLM APIs (not batch)
- Keep system prompts concise

### Error Handling

- If LLM fails, send a graceful error message
- Don't leave the connection hanging
- Log errors server-side for debugging

### Text-to-Speech Considerations

- Avoid markdown, URLs, and special characters
- Spell out abbreviations if needed
- Use natural sentence structures
- Keep responses concise (1-3 sentences ideal)

## Example Implementation

```typescript
// Handle response_required
async function handleResponseRequired(transcript: TranscriptEntry[]) {
  let responseId = ++this.responseId;

  // Stream from LLM
  await llm.stream(transcript, (chunk, done) => {
    ws.send(JSON.stringify({
      response_id: responseId,
      content: done ? "" : cleanForTTS(chunk),
      content_complete: done,
      end_call: false
    }));
  });
}
```

## References

- [Retell Custom LLM Documentation](https://docs.retellai.com/api-references/llm-websocket)
- [Retell Dashboard](https://dashboard.retellai.com)
