#!/bin/bash
# Setup script for automated chat cleanup cron job

# Get the absolute path to the project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_PATH="$PROJECT_DIR/scripts/batch-chat-cleanup.js"
CRON_LOG_PATH="$PROJECT_DIR/logs/chat-cleanup-cron.log"

echo "🔧 Setting up automated chat cleanup cron job..."
echo "📂 Project directory: $PROJECT_DIR"
echo "📄 Script path: $SCRIPT_PATH"
echo "📋 Log path: $CRON_LOG_PATH"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Check if the cleanup script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Error: Cleanup script not found at $SCRIPT_PATH"
    exit 1
fi

# Create a wrapper script that sets up the environment
WRAPPER_SCRIPT="$PROJECT_DIR/scripts/run-cleanup-cron.sh"
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
# Auto-generated cron wrapper script for chat cleanup

# Set working directory
cd "$PROJECT_DIR"

# Source environment if .env exists
if [ -f ".env" ]; then
    export \$(cat .env | grep -v '^#' | xargs)
fi

# Run the cleanup script and log output
echo "[\$(date)] Starting automated chat cleanup..." >> "$CRON_LOG_PATH"
node "$SCRIPT_PATH" --batch-size 3 >> "$CRON_LOG_PATH" 2>&1
echo "[\$(date)] Cleanup completed with exit code: \$?" >> "$CRON_LOG_PATH"
echo "---" >> "$CRON_LOG_PATH"
EOF

# Make wrapper script executable
chmod +x "$WRAPPER_SCRIPT"

echo "✅ Created wrapper script: $WRAPPER_SCRIPT"

# Show cron job options
echo ""
echo "🕐 Choose a cron schedule:"
echo "1. Daily at 2:00 AM"
echo "2. Daily at 3:00 AM" 
echo "3. Twice daily (2:00 AM and 2:00 PM)"
echo "4. Weekly on Sunday at 2:00 AM"
echo "5. Custom schedule"
echo "6. Show current crontab (no changes)"

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * *"
        ;;
    3)
        CRON_SCHEDULE="0 2,14 * * *"
        ;;
    4)
        CRON_SCHEDULE="0 2 * * 0"
        ;;
    5)
        echo "Enter custom cron schedule (e.g., '0 2 * * *' for daily at 2 AM):"
        read -p "Schedule: " CRON_SCHEDULE
        ;;
    6)
        echo "📋 Current crontab:"
        crontab -l 2>/dev/null || echo "No crontab currently set"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

# Create the cron job entry
CRON_ENTRY="$CRON_SCHEDULE $WRAPPER_SCRIPT"

echo ""
echo "📅 Proposed cron job:"
echo "$CRON_ENTRY"
echo ""

read -p "Add this cron job? (y/N): " confirm

if [[ $confirm =~ ^[Yy]$ ]]; then
    # Backup current crontab
    crontab -l 2>/dev/null > "$PROJECT_DIR/crontab.backup" || true
    echo "💾 Backed up current crontab to crontab.backup"
    
    # Add new cron job (remove any existing chat cleanup jobs first)
    (crontab -l 2>/dev/null | grep -v "batch-chat-cleanup.js" | grep -v "run-cleanup-cron.sh"; echo "$CRON_ENTRY") | crontab -
    
    echo "✅ Cron job added successfully!"
    echo ""
    echo "📊 Verification:"
    echo "Current crontab:"
    crontab -l | grep -E "(batch-chat-cleanup|run-cleanup-cron)" || echo "⚠️  Cron job not found in listing"
    
    echo ""
    echo "📝 Log file location: $CRON_LOG_PATH"
    echo "🔍 Monitor logs with: tail -f $CRON_LOG_PATH"
    echo ""
    echo "🛠️  To remove the cron job later:"
    echo "   crontab -e"
    echo "   (then delete the line containing run-cleanup-cron.sh)"
else
    echo "❌ Cron job setup cancelled"
fi

echo ""
echo "🎯 Manual testing:"
echo "Test the cleanup script manually with:"
echo "   cd $PROJECT_DIR"
echo "   node scripts/batch-chat-cleanup.js"
echo ""
echo "Test the cron wrapper with:"
echo "   $WRAPPER_SCRIPT"