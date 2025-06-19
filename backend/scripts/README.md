# Daily Chat Maintenance

This directory contains the permanent solution for chat maintenance and parent summaries.

## Daily Maintenance Script

### Run Daily Maintenance
```bash
npm run maintenance
```

This single script handles everything:
- **Cleanup**: Processes old chat messages into summaries
- **Parent Summaries**: Generates notifications for yesterday's conversations  
- **Expired Cleanup**: Removes notifications older than 7 days

### Setting Up Automation

Add to crontab for daily execution at 2 AM:
```bash
# Edit crontab
crontab -e

# Add this line:
0 2 * * * cd /path/to/tutor_ai/backend && npm run maintenance >> logs/maintenance.log 2>&1
```

Create the logs directory:
```bash
mkdir -p /path/to/tutor_ai/backend/logs
```

## Manual Operations

### Manual Batch Cleanup Only
If you only want to run cleanup without parent summaries:
```bash
npm run cleanup:batch
```

### View Help
```bash
npm run maintenance -- --help
```

## How It Works

```
Daily Process (2 AM):
┌─────────────────────┐
│ Old Chat Messages   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Batch Cleanup       │
│ (Creates Summaries) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Yesterday's Chats   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Parent Notifications│
│ (Daily Generation)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Cleanup Expired     │
│ (>7 days old)       │
└─────────────────────┘
```

## What Parents See

Parents get daily insights including:
- **Key Highlights**: "✅ Mastered fraction multiplication"
- **Subjects Discussed**: Math, Science, etc.
- **Learning Progress**: Problems solved, engagement level
- **Parent Suggestions**: "Consider extra practice with word problems"

## Monitoring

Check these tables in Supabase:
- `parent_conversation_notifications` - Generated summaries for parents
- `conversation_summaries` - Technical summaries from cleanup
- `chat_cleanup_reports` - Daily cleanup statistics

## Troubleshooting

**No parent summaries generated?**
- Ensure children had conversations yesterday
- Check conversations have minimum 6 messages
- Verify OpenAI API key is set in .env
- Check script logs for errors

**Script not running automatically?**
- Verify cron job is set up correctly
- Check that the path in crontab is absolute
- Ensure the backend directory has write permissions for logs
- Test manually first: `npm run maintenance`

The script is designed to be robust and handle errors gracefully while providing detailed logging.