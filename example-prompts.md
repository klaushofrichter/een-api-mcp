# Example Prompts for EEN MCP Server

These prompts demonstrate how to interact with Eagle Eye Networks cameras through Claude using the MCP server.

## Authentication & Account Management

- "What EEN accounts do I have configured?"
- "Show me my authentication status for Eagle Eye Networks"
- "Switch to my production EEN account"
- "Which EEN account am I currently using?"

## Camera Operations

- "List all my cameras"
- "Show me all online cameras"
- "Find cameras with 'lobby' in the name"
- "Get details for camera 1005963a"
- "Which cameras are currently offline?"
- "How many cameras do I have?"

## Live Images

- "Show me a live image from the front door camera"
- "Take a snapshot from camera 1005963a"
- "Get a live preview from all lobby cameras"
- "What does the parking lot camera see right now?"

## Recorded Footage

- "Show me footage from the back door camera at 3pm yesterday"
- "Get a recorded image from camera 1005963a at 2024-01-15T14:30:00Z"
- "What was happening at the main entrance an hour ago?"
- "Show me what the lobby camera recorded at noon today"

## Recording Intervals

- "When was the front door camera recording in the last hour?"
- "Show me recording intervals for camera 1005963a from the past 24 hours"
- "Check if there are any gaps in recording for the lobby camera today"
- "List all recordings from yesterday for the parking lot camera"

## Motion & Events

- "Were there any motion events on the front door camera in the last hour?"
- "Show me motion detection events from today"
- "What types of events can I query for?"
- "List all motion events from the lobby camera since midnight"
- "Were there any events detected on camera 1005963a between 2pm and 4pm?"

## Alerts

- "Show me recent alerts"
- "What alerts were triggered today?"
- "Are there any alerts for the front door camera?"
- "List high-priority alerts from the last 24 hours"

## Bridges

- "List all my bridges"
- "Show me online bridges"
- "Get details for bridge 100b3839"
- "How many cameras are connected to each bridge?"
- "Are any of my bridges offline?"

## Users

- "Who am I logged in as?"
- "List all users in my EEN account"
- "Show me details for user abc123"
- "How many users have access to my cameras?"

## Layouts

- "List all my camera layouts"
- "Show me the details of my lobby layout"
- "Which cameras are in the 'Main Entrance' layout?"
- "How many layouts do I have?"
- "Get details for layout abc123"
- "What are the display settings for my layouts?"
- "Show me layouts that contain camera 1005963a"

## Combined Queries

- "Give me a status overview of all my cameras and bridges"
- "Show me a live image and any recent motion events from the front door"
- "Check if the lobby camera recorded anything between 9am and 10am, and show me an image from that time"
- "List all offline devices (cameras and bridges)"

## Troubleshooting

- "Why can't I see images from camera X?" (triggers auth status check)
- "Is my EEN connection working?" (triggers auth status)
- "Help me understand what cameras I have access to"
