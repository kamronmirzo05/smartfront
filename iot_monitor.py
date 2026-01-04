import logging
import asyncio
import time
import requests
from telegram import Update
from telegram.ext import Application, MessageHandler, filters, ContextTypes
import re

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Monitor bot token (alohida token kerak)
MONITOR_BOT_TOKEN = "8562869800:AAESHchv-RVWsHjJCTYlxEv1F8mooMpc1Fs"

# API base URL
API_BASE_URL = "https://deklorantapi.cdcgroup.uz/api"
# Optional: limit processing to a specific Telegram group ID
# Set this to your group ID (e.g., -1001234567890) or None to accept from any chat
MONITORED_CHAT_ID = -1003670768026  # Replace with your group ID, for example: -1001234567890

class IoTMonitorBot:
    def __init__(self):
        self.bot_token = MONITOR_BOT_TOKEN
        self.api_base_url = API_BASE_URL
        self.api_token = None
        self.login_credentials = {
            'login': 'superadmin',
            'password': '123'
        }
    
    def login_to_api(self):
        """Login to API and get authentication token"""
        try:
            response = requests.post(
                f"{self.api_base_url}/auth/login/",
                json=self.login_credentials
            )
            
            if response.status_code == 200:
                data = response.json()
                self.api_token = data.get('token')
                logger.info("Successfully logged in to API")
                return True
            else:
                logger.error(f"Login failed: {response.status_code}, {response.text}")
                return False
        except Exception as e:
            logger.error(f"Login exception: {e}")
            return False
    
    def get_auth_headers(self):
        """Get authentication headers for API requests"""
        if not self.api_token:
            if not self.login_to_api():
                return None
        
        return {
            'Authorization': f'Token {self.api_token}',
            'Content-Type': 'application/json'
        }
    
    def extract_sensor_data(self, message_text: str):
        """Extract sensor data from message.
        Supports both legacy and new formats.
        New expected format example:
            🆔 0420101
            🌡 21.7°C 💧 43.9%
            ⏱ 2000s
        Legacy supported format:
            Qurilma: ESP-100FDA
            🌡 Harorat: 18.9 °C
            💧 Havo namligi: 43.0 %
            ⏱ Sleep: 1800 sekund
        """
        # Enhanced parsing for the specific format you mentioned
        # Try to extract device ID with explicit 🆔 emoji first
        id_emoji_match = re.search(r'🆔\s*([A-Za-z0-9_-]+)', message_text)
        device_id = None
        if id_emoji_match:
            device_id = id_emoji_match.group(1).strip()
        else:
            # Fallback to any potential ID pattern if no emoji is found
            id_match = re.search(r'(?:ID|id|:\s*)?([A-Za-z0-9_-]{3,})', message_text)
            if id_match:
                device_id = id_match.group(1).strip()
        
        # Enhanced temperature extraction - look for 🌡 emoji followed by value
        temperature = None
        # Look for pattern: 🌡 21.7°C
        temp_match = re.search(r'🌡\s*([-+]?\d+(?:[\.,]\d+)?)\s*°?C?', message_text, re.IGNORECASE)
        if temp_match:
            temperature = float(temp_match.group(1).replace(',', '.'))
        else:
            # Legacy format: 🌡 Harorat: 18.9 °C
            temp_legacy = re.search(r'Harorat:\s*([-+]?\d+(?:[\.,]\d+)?)\s*°?C', message_text, re.IGNORECASE)
            if temp_legacy:
                temperature = float(temp_legacy.group(1).replace(',', '.'))
        
        # Enhanced humidity extraction - look for 💧 emoji followed by value
        humidity = None
        # Look for pattern: 💧 43.9%
        hum_match = re.search(r'💧\s*([-+]?\d+(?:[\.,]\d+)?)\s*%', message_text)
        if hum_match:
            humidity = float(hum_match.group(1).replace(',', '.'))
        else:
            hum_legacy = re.search(r'Havo\s+namligi:\s*([-+]?\d+(?:[\.,]\d+)?)\s*%', message_text, re.IGNORECASE)
            if hum_legacy:
                humidity = float(hum_legacy.group(1).replace(',', '.'))
        
        # Enhanced sleep time extraction - look for ⏱ emoji followed by value
        sleep_seconds = None
        # Look for pattern: ⏱ 2000s
        sleep_match = re.search(r'⏱\s*(\d+)\s*s', message_text, re.IGNORECASE)
        if sleep_match:
            sleep_seconds = int(sleep_match.group(1))
        else:
            sleep_legacy = re.search(r'Sleep:\s*(\d+)\s*sekund', message_text, re.IGNORECASE)
            if sleep_legacy:
                sleep_seconds = int(sleep_legacy.group(1))
        
        # Only return data if we have at least a device ID and one of temperature or humidity
        if device_id and (temperature is not None or humidity is not None):
            return {
                'device_id': device_id,
                'temperature': temperature,
                'humidity': humidity,
                'sleep_seconds': sleep_seconds
            }
        return None

    async def send_sensor_data_to_platform(self, sensor_data: dict):
        """Send sensor data to the platform using the IoT device data endpoint"""
        try:
            # Get authentication headers
            headers = self.get_auth_headers()
            if not headers:
                logger.error("Failed to get authentication headers")
                return None
            
            # Prepare the data to send
            data_to_send = {
                'device_id': sensor_data['device_id'],
                'temperature': sensor_data.get('temperature'),
                'humidity': sensor_data.get('humidity'),
                'sleep_seconds': sensor_data.get('sleep_seconds'),
                'timestamp': int(time.time())
            }
            
            # Send data to the IoT device data endpoint
            response = requests.post(
                f"{self.api_base_url}/iot-devices/data/update/",
                json=data_to_send,
                headers=headers
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully sent sensor data for device {sensor_data['device_id']} to platform")
                return response.json()
            else:
                logger.error(f"Error sending sensor data: {response.status_code}, {response.text}")
                return None
        except Exception as e:
            logger.error(f"Exception sending sensor data: {e}")
            return None

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle messages from the monitored channel"""
        if not update.message or not update.message.text:
            return
        
        chat = update.message.chat
        # If a specific chat ID is configured, only process messages from that chat
        if MONITORED_CHAT_ID is not None:
            if str(chat.id) != str(MONITORED_CHAT_ID):
                return
        
        message_text = update.message.text
        
        # Extract sensor data (supports multiple formats)
        sensor_data = self.extract_sensor_data(message_text)
        
        if not sensor_data:
            return
        
        logger.info(f"Sensor data extracted: {sensor_data}")
        
        # Send the data to the platform
        result = await self.send_sensor_data_to_platform(sensor_data)
        
        if result:
            logger.info(f"Sensor data successfully sent to platform: {result}")
        else:
            logger.error("Failed to send sensor data to platform")

def main():
    """Start the IoT monitoring bot"""
    try:
        # Create bot instance
        iot_bot = IoTMonitorBot()
        
        # Create application using builder pattern
        application = Application.builder().token(MONITOR_BOT_TOKEN).build()
        
        # Add message handler for channel messages
        application.add_handler(MessageHandler(filters.TEXT, iot_bot.handle_message))
        
        logger.info("IoT Monitor Bot is starting...")
        logger.info(f"Monitoring chat ID: {MONITORED_CHAT_ID}")
        
        # Clear any pending updates first
        application.run_polling(
            allowed_updates=Update.ALL_TYPES, 
            drop_pending_updates=True,
            close_loop=False
        )
    except Exception as e:
        if "Conflict" in str(e) and "getUpdates" in str(e):
            logger.error("Bot conflict detected! Another instance is running with the same token.")
            logger.error("Please stop all other bot instances and try again.")
            logger.error("You can run: taskkill /F /IM python.exe (Windows) to stop all Python processes.")
        else:
            logger.error(f"Error starting IoT Monitor Bot: {e}")
        raise

if __name__ == '__main__':
    main()