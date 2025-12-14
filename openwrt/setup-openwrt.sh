#!/bin/sh
#
# Setup script for OpenWrt deployment
# Run on OpenWrt: sh setup-openwrt.sh
#

echo "🤖 Setting up Huawei Modem Bot on OpenWrt..."

# Check if running on OpenWrt
if [ ! -f /etc/openwrt_release ]; then
    echo "⚠️ Warning: This doesn't appear to be OpenWrt"
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    opkg update
    opkg install node node-npm
fi

# Check node version
echo "📌 Node.js version: $(node -v)"

# Create .env if not exists
if [ ! -f ".env" ]; then
    echo "⚠️ .env file not found!"
    echo "Please create .env with your bot token:"
    echo "  TELEGRAM_BOT_TOKEN=your_token_here"
    echo "  MODEM_IP=192.168.8.1"
    echo "  MODEM_USERNAME=admin"
    echo "  MODEM_PASSWORD=your_password"
    exit 1
fi

# Copy init script
echo "📁 Installing init script..."
cp openwrt/hmonn-bot /etc/init.d/
chmod +x /etc/init.d/hmonn-bot

# Enable and start service
echo "✅ Enabling service..."
/etc/init.d/hmonn-bot enable

echo "▶️ Starting service..."
/etc/init.d/hmonn-bot start

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Commands:"
echo "   /etc/init.d/hmonn-bot start    # Start bot"
echo "   /etc/init.d/hmonn-bot stop     # Stop bot"
echo "   /etc/init.d/hmonn-bot restart  # Restart bot"
echo "   logread -f                      # View logs"
