#!/usr/bin/env bash

# Bot Control Script
# Usage: ./bot.sh [start|stop|restart|status|logs]

BOT_DIR="/media/son/BackUp/OpenWrt/bot-hmonn"
LOG_FILE="$BOT_DIR/bot.log"
PID_FILE="$BOT_DIR/bot.pid"

cd "$BOT_DIR" || exit 1

case "$1" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "❌ Bot is already running (PID: $(cat "$PID_FILE"))"
      exit 1
    fi
    
    echo "🚀 Starting bot..."
    nohup bun src/index.ts > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    sleep 2
    
    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "✅ Bot started successfully (PID: $(cat "$PID_FILE"))"
      echo "📝 View logs: ./bot.sh logs"
    else
      echo "❌ Failed to start bot"
      rm -f "$PID_FILE"
      exit 1
    fi
    ;;
    
  stop)
    if [ ! -f "$PID_FILE" ]; then
      echo "⚠️ Bot is not running (no PID file)"
      exit 1
    fi
    
    PID=$(cat "$PID_FILE")
    echo "⏹️ Stopping bot (PID: $PID)..."
    
    if kill "$PID" 2>/dev/null; then
      sleep 2
      if kill -0 "$PID" 2>/dev/null; then
        kill -9 "$PID" 2>/dev/null
      fi
      rm -f "$PID_FILE"
      echo "✅ Bot stopped"
    else
      echo "⚠️ Bot process not found"
      rm -f "$PID_FILE"
    fi
    ;;
    
  restart)
    echo "🔄 Restarting bot..."
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      PID=$(cat "$PID_FILE")
      echo "✅ Bot is running (PID: $PID)"
      ps -p "$PID" -o pid,etime,%cpu,%mem,cmd
    else
      echo "❌ Bot is not running"
      [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    fi
    ;;
    
  logs)
    if [ ! -f "$LOG_FILE" ]; then
      echo "⚠️ No log file found"
      exit 1
    fi
    
    echo "📝 Bot logs (last 50 lines):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    tail -50 "$LOG_FILE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "💡 Follow logs: tail -f $LOG_FILE"
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start the bot"
    echo "  stop    - Stop the bot"
    echo "  restart - Restart the bot"
    echo "  status  - Check bot status"
    echo "  logs    - View bot logs"
    exit 1
    ;;
esac
