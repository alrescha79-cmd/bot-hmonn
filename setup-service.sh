#!/bin/bash
#
# Setup script for hmonn-bot systemd service
# Run with: sudo ./setup-service.sh
#

SERVICE_FILE="hmonn-bot.service"
SERVICE_NAME="hmonn-bot"
SYSTEMD_DIR="/etc/systemd/system"

echo "🤖 Setting up Huawei Modem Bot Service..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (sudo ./setup-service.sh)"
    exit 1
fi

# Check if service file exists
if [ ! -f "$SERVICE_FILE" ]; then
    echo "❌ Service file not found: $SERVICE_FILE"
    exit 1
fi

# Copy service file to systemd directory
echo "📁 Copying service file to $SYSTEMD_DIR..."
cp "$SERVICE_FILE" "$SYSTEMD_DIR/"

# Reload systemd daemon
echo "🔄 Reloading systemd daemon..."
systemctl daemon-reload

# Enable service to start on boot
echo "✅ Enabling service to start on boot..."
systemctl enable "$SERVICE_NAME"

# Start the service
echo "▶️ Starting the service..."
systemctl start "$SERVICE_NAME"

# Check status
echo ""
echo "📊 Service status:"
systemctl status "$SERVICE_NAME" --no-pager

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Useful commands:"
echo "   sudo systemctl status $SERVICE_NAME   # Check status"
echo "   sudo systemctl stop $SERVICE_NAME     # Stop bot"
echo "   sudo systemctl start $SERVICE_NAME    # Start bot"
echo "   sudo systemctl restart $SERVICE_NAME  # Restart bot"
echo "   sudo journalctl -u $SERVICE_NAME -f   # View logs"
