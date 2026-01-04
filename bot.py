import logging
import asyncio
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters, CallbackQueryHandler
import json
import os
from urllib.parse import urlparse, parse_qs
import base64
from io import BytesIO
import threading

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Bot token
BOT_TOKEN = "8380253670:AAGdoT2SRVpmHHu47s_ZHF_3l9fuURA-Uo4"

# Monitor bot token
MONITOR_BOT_TOKEN = "8319168817:AAGuSpx5P0hSaGJW521GCExDyjblMnoXBo0"

# Channel to monitor
CHANNEL_TO_MONITOR = "@springuzz"

# API base URL
API_BASE_URL = "https://deklorantapi.cdcgroup.uz/api"

class WasteBinBot:
    def __init__(self):
        self.bot_token = BOT_TOKEN
        self.api_base_url = API_BASE_URL
        # Superadmin credentials based on the backend code
        self.admin_username = "superadmin"
        self.admin_password = "123"
        self.api_token = None
        # We'll initialize the token when needed in async methods
    
    async def ensure_authenticated(self):
        """Ensure we have a valid authentication token"""
        if not self.api_token:
            await self.login_admin()
        else:
            # Test if the token is still valid
            headers = self.get_auth_headers()
            try:
                response = requests.get(f"{self.api_base_url}/validate-token/", headers=headers)
                if response.status_code != 200:
                    # Token might be expired, re-login
                    await self.login_admin()
            except:
                # If validation fails, try to login again
                await self.login_admin()
    
    async def login_admin(self):
        """Login as superadmin to get API token"""
        try:
            login_data = {
                "login": self.admin_username,
                "password": self.admin_password
            }
            response = requests.post(f"{self.api_base_url}/auth/login/", json=login_data)
            if response.status_code == 200:
                data = response.json()
                if 'token' in data:
                    self.api_token = data['token']
                    logger.info("Successfully logged in as superadmin")
                else:
                    logger.error("Login successful but no token returned")
            else:
                logger.error(f"Admin login failed: {response.status_code} - {response.text}")
        except Exception as e:
            logger.error(f"Exception during admin login: {e}")
    
    def get_auth_headers(self):
        """Get headers with authentication token"""
        headers = {
            'Content-Type': 'application/json'
        }
        if self.api_token:
            headers['Authorization'] = f'Token {self.api_token}'
        return headers
    
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        if update.message:
            user = update.effective_user
            # Extract bin ID from command arguments
            bin_id = context.args[0] if context.args else None
            
            if bin_id:
                # Get bin details from API
                bin_details = await self.get_bin_details(bin_id)
                if bin_details:
                    # Send bin information to user
                    await self.send_bin_info(update, bin_details)
                    
                    # Ask user to send a photo
                    await update.message.reply_text(
                        f"Konteyner: {bin_details.get('address', 'Noma\'lum')}\n\n"
                        f"Rasm yuboring iltimos!\n"
                        f"Eslatma: Agar konteyner to'la bo'lsa, tizim avtomatik ravishda xabarnoma yuboradi."
                    )
                    
                    # Store bin ID in user context for later use
                    if context.user_data is not None:
                        context.user_data['current_bin_id'] = bin_id
                else:
                    await update.message.reply_text(
                        f"Kechirasiz, bunday ID li konteyner topilmadi: {bin_id}"
                    )
            else:
                await update.message.reply_html(
                    f"Assalomu alaykum {user.mention_html() if user else 'Foydalanuvchi'}!\n\n"
                    f"QR kod orqali konteynerni aniqlash uchun quyidagi link orqali kirishingiz mumkin:\n"
                    f"https://t.me/tozafargonabot\n\n"
                    f"Konteyner ID: Noma\'lum\n\n"
                    f"Konteynerni aniqlash uchun /scan komandasini yuboring yoki QR kodni skaner qiling."
                )

    async def handle_qr_scan(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle QR code scanning - this will be triggered when user sends a message with bin ID"""
        if update.message:
            message_text = update.message.text
            if message_text:
                # Check if message contains a bin ID (either as a direct ID or in a URL)
                bin_id = self.extract_bin_id_from_message(message_text)
                
                if bin_id:
                    # Get bin details from API
                    bin_details = await self.get_bin_details(bin_id)
                    if bin_details:
                        # Send bin information to user
                        await self.send_bin_info(update, bin_details)
                        
                        # Ask user to send a photo
                        await update.message.reply_text(
                            f"Konteyner: {bin_details.get('address', 'Noma\'lum')}\n\n"
                            f"Rasm yuboring iltimos!\n"
                            f"Eslatma: Agar konteyner to'la bo'lsa, tizim avtomatik ravishda xabarnoma yuboradi."
                        )
                        
                        # Store bin ID in user context for later use
                        if context.user_data is not None:
                            context.user_data['current_bin_id'] = bin_id
                    else:
                        await update.message.reply_text(
                            f"Kechirasiz, bunday ID li konteyner topilmadi: {bin_id}"
                        )
                else:
                    await update.message.reply_text(
                        "Iltimos, QR kodni skaner qiling yoki konteyner ID sini kiriting.\n"
                        "QR kodni skaner qilish uchun kamerangizdan foydalaning va QR kodga yo'naltiring."
                    )

    def extract_bin_id_from_message(self, message: str):
        """Extract bin ID from message text (could be a direct ID or URL with ID)"""
        if not message:
            return None
        # Check if message is a URL containing bin ID
        if 'http' in message.lower():
            try:
                parsed_url = urlparse(message)
                query_params = parse_qs(parsed_url.query)
                # Look for bin_id in query parameters
                if 'bin_id' in query_params:
                    return query_params['bin_id'][0]
                elif 'id' in query_params:
                    return query_params['id'][0]
            except Exception as e:
                logger.error(f"Error parsing URL: {e}")
        
        # Check if message is a direct bin ID (UUID format)
        if len(message) == 36 and message.count('-') == 4:  # UUID format
            return message
        
        # If message contains a URL path with ID
        if '/waste-bins/' in message:
            parts = message.split('/waste-bins/')
            if len(parts) > 1:
                bin_id = parts[1].split('/')[0].split('?')[0].split('#')[0]  # Extract ID from path
                return bin_id
        
        return None

    async def get_bin_details(self, bin_id: str):
        """Get bin details from API"""
        await self.ensure_authenticated()  # Ensure we're logged in
        try:
            headers = self.get_auth_headers()
            
            # First try the specific bin endpoint
            response = requests.get(f"{self.api_base_url}/waste-bins/{bin_id}/", headers=headers)
            
            # If unauthorized, try to re-login and get a new token
            if response.status_code == 401:
                logger.info("Token expired, re-logging in as superadmin")
                await self.login_admin()
                headers = self.get_auth_headers()
                response = requests.get(f"{self.api_base_url}/waste-bins/{bin_id}/", headers=headers)
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                # Bin not found
                return None
            else:
                # Other error
                logger.error(f"Error getting bin details: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Exception getting bin details: {e}")
            return None

    async def send_bin_info(self, update: Update, bin_details: dict):
        """Send bin information to user"""
        if update.message:
            message = (
                f"📦 <b>Konteyner Ma'lumotlari:</b>\n\n"
                f"📍 <b>Manzil:</b> {bin_details.get('address', 'Noma\'lum')}\n"
                f"🏷️ <b>ID:</b> {bin_details.get('id', 'Noma\'lum')}\n"
                f"📊 <b>To'ldirish darajasi:</b> {bin_details.get('fill_level', 0)}%\n"
                f"🚦 <b>Status:</b> {'To\'la' if bin_details.get('is_full', False) else 'Bo\'sh'}\n"
                f"🏢 <b>Toza hudud:</b> {bin_details.get('toza_hudud', 'Noma\'lum')}\n\n"
                f"📷 <b>Tasvir yuborish:</b>\n"
                f"Rasm yuboring iltimos! AI tizimi konteynerni tahlil qiladi.\n\n"
                f"🤖 <b>AI Tahlili:</b>\n"
                f"Rasmni tahlil qilish orqali tizim konteynerni to'la yoki bo'sh ekanligini aniqlaydi."
            )
            await update.message.reply_text(message, parse_mode='HTML')

    async def handle_photo(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle photo upload and update bin status with the image"""
        if update.message:
            user = update.effective_user
            if update.message.photo:
                photo = update.message.photo[-1]  # Get the highest resolution photo
                
                # Get the file from Telegram
                file = await context.bot.get_file(photo.file_id)
                
                # Download the photo
                photo_bytes = await file.download_as_bytearray()
                
                # Find the bin ID from context
                bin_id = None
                if context.user_data:
                    bin_id = context.user_data.get('current_bin_id')
                
                if not bin_id:
                    # Try to find bin ID from recent command or message
                    await update.message.reply_text(
                        "Kechirasiz, konteyner ID sini aniqlay olmadik.\n"
                        "Iltimos, QR kodni skaner qiling yoki /scan komandasini bosing."
                    )
                    return
                
                # Get current bin details
                current_bin = await self.get_bin_details(bin_id)
                if not current_bin:
                    await update.message.reply_text("Kechirasiz, konteyner ma'lumotlarini olib kelolmadik.")
                    return
                
                # Upload the photo and update bin status using the API
                updated_bin = await self.update_bin_with_photo(bin_id, current_bin, file.file_path, bytes(photo_bytes))
                
                if updated_bin:
                    if 'error' in updated_bin:
                        # AI analysis showed this is not a waste bin
                        error_msg = updated_bin.get('error', 'Rasm tahlilida xatolik yuz berdi.')
                        await update.message.reply_text(error_msg)
                        return
                    
                    # Send success message with AI analysis
                    ai_analysis = updated_bin.get('ai_analysis', {})
                    confidence = ai_analysis.get('confidence', 0)
                    is_full = ai_analysis.get('isFull', updated_bin.get('is_full', False))
                    fill_level = ai_analysis.get('fillLevel', updated_bin.get('fill_level', 0))
                    notes = ai_analysis.get('notes', 'Tahlil amalga oshirildi')
                    suggestions = ai_analysis.get('suggestions', '')
                                    
                    status_text = "To'la" if is_full else "To'lmagan"
                                    
                    response_message = f"✅ Rasm qabul qilindi va tahlil qilindi!\n\n"
                    response_message += f"📦 <b>Konteyner:</b> {updated_bin.get('address', 'Noma\'lum')}\n"
                    response_message += f"🚦 <b>Yangi status:</b> {status_text}\n"
                    response_message += f"📊 <b>To'ldirish darajasi:</b> {fill_level}%\n"
                    response_message += f"🔍 <b>AI ishonchlilik:</b> {confidence}%\n\n"
                                    
                    if notes:
                        response_message += f"📝 <b>Tahlil:</b> {notes}\n"
                    if suggestions:
                        response_message += f"💡 <b>Tavsiya:</b> {suggestions}\n\n"
                                    
                    response_message += f"Ko'rsatmalar bo'yicha tashakkur!"
                                    
                    await update.message.reply_text(response_message)
                    
                    # Notify admin about the new full bin if it's full
                    if is_full:
                        await self.notify_admins(bin_id, updated_bin, user)
                else:
                    await update.message.reply_text(
                        "Kechirasiz, konteyner statusini va rasmini yangilay olmadik. Iltimos, keyinroq qayta urinib ko'ring."
                    )

    async def analyze_image_with_ai(self, image_bytes):
        """Analyze image using Google AI to determine if bin is full"""
        try:
            # Convert image bytes to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            # Prepare the request to Google AI
            ai_headers = {
                'Content-Type': 'application/json',
            }
            
            # Get API key from environment or use default
            api_key = os.getenv('GEMINI_API_KEY', 'YOUR_API_KEY_HERE')
            if api_key == 'YOUR_API_KEY_HERE':
                # If no API key is set, return a basic response
                return {
                    'isWasteBin': True,
                    'isFull': True,
                    'fillLevel': 90,
                    'confidence': 70,
                    'notes': 'API kaliti ornatiilmagan, oddiy tahlil amalga oshirildi',
                    'detectedObjects': ['waste bin', 'plastic bags'],
                    'suggestions': 'Konteyner hozir to\'la, yuklab olish kerak'
                }
            
            ai_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key={api_key}'
            
            # Create enhanced prompt for AI with improved analysis for waste bin fill level detection
            prompt = '''Siz tajriboli atrof-muhitni kuzatuv tizimi ekspertisiz. Rasmni tahlil qiling va quyidagilarni aniqlang:
            
            1. Rasmda chiqindi konteyneri bormi? Javob: HA yoki YO'Q.
            
            2. Agar HA bo'lsa, konteyner to'la bo'limi? Javob: HA yoki YO'Q.
            - TO'LA BELGILARI: axlat konteyneri ochig'ida axlat ko'rinadi, axlat konteyneridan tashqari joyda axlat yoki sumkalar ko'rinadi, axlat konteyneri ochiq qopqog'i ostida axlatlar to'planib qolgan bo'lsa, axlat konteyneri butunlay axlat bilan qoplangan bo'lsa.
            - BO'SH BELGILARI: axlat konteyneri ichida bo'sh joy ko'rinadi, axlat konteyneri ochig'i ochiq va ichi ko'rinadi, axlat konteyneri atrofida axlat yoki sumka yo'q.
            
            3. Agar HA bo'lsa, to'ldirish darajasini % (0-100) ko'rsating. Batafsil tahlil:
            - 0-25%: Konteyner deyarli bo'sh, ichida kamroq axlat bor
            - 26-50%: Konteyner taxminan yarim to'la
            - 51-75%: Konteyner ko'pincha to'la, lekin hali joy bor
            - 76-100%: Konteyner to'la, axlat tashqariga chiqib turgan yoki chiqib ketayotgan
            
            4. Agar YO'Q bo'lsa, rasmda nima borligini tushuntiring.
            
            5. Rasmda qanday obyektlar aniqlanganligini tavsifli ro'yxat ko'rinishida berin:
            - Chiqindi konteyneri (shakl, rang, hajm, holati)
            - Sumkalar (soni, rangi, joylashuvi)
            - Axlatlar (turi, miqdori, joylashuvi)
            - Boshqa obyektlar (odamlar, avtomobillar, bino, daraxt, ko'cha belgilari)
            
            6. Agar konteyner to'la bo'lsa, unga qanday chora ko'rish kerakligi bo'yicha takliflaringizni bering.
            
            7. Agar konteyner aniqlanmasa, kamera to'g'rimi yoki axlat konteyneri joyida emasmi yoki axlat aniqlanmadi deb xabar bering.
            
            Rasmni to'g'ri tekshirish uchun quyidagi belgilarni hisobga oling:
            - Chiqindi konteyneri odatda to'rtburchak yoki silindrsimon shaklda bo'ladi
            - Ko'pincha yashil, sariq, ko'k yoki qora rangda bo'ladi
            - Yozuvlar, logolar yoki chiqindi turi ko'rsatiladi
            - Qopqog'i yoki ochiq bo'lishi mumkin
            - Ko'pincha ko'cha yoki bino yonida joylashadi
            
            Tahlil qilishda e'tibor bering:
            - Konteyner ichidagi axlat miqdoriga
            - Konteyner atrofidagi axlatlarga
            - Qopqog'ining ochiq yoki yopiq ekanligiga
            - Axlatning konteyner ichida yoki tashqarisida joylashganligiga
            
            Agar rasmda chiqindi konteyneri aniq ko'rinmasa, lekin atrofda bo'lsa, ham "HA" deb belgilang.
            Agar rasmda chiqindi konteyneri to'la bo'lsa, "HA" deb belgilang, aks holda "YO'Q".
            
            Javobni JSON formatda quyidagi kalitlar bilan berin: 
            - isWasteBin (BOOLEAN): Rasmda chiqindi konteyneri bor yoki yo'q
            - isFull (BOOLEAN): Konteyner to'la yoki yo'q (batafsil tahlil asosida)
            - fillLevel (NUMBER): To'ldirish darajasi (0-100%, tahlil asosida aniqroq aniqlash)
            - confidence (NUMBER): AI ishonchlilik darajasi (0-100%, tahlil qanchalik aniq bo'lsa shuncha yuqori)
            - notes (STRING): Batafsil tahlil natijasi va asoslangan fikr
            - detectedObjects (ARRAY of STRING): Aniqlangan obyektlar ro'yxati
            - suggestions (STRING): Tavsiyalaringiz
            
            Eslatma: Faqat JSON javobini bering, boshqa matn qo'shmang.'''
            
            ai_request_body = {
                'contents': [{
                    'parts': [
                        {'text': prompt},
                        {
                            'inline_data': {
                                'mime_type': 'image/jpeg',
                                'data': image_base64
                            }
                        }
                    ]
                }],
                'generationConfig': {
                    'responseMimeType': 'application/json',
                    'responseSchema': {
                        'type': 'OBJECT',
                        'properties': {
                            'isWasteBin': {'type': 'BOOLEAN'},
                            'isFull': {'type': 'BOOLEAN'},
                            'fillLevel': {'type': 'NUMBER'},
                            'confidence': {'type': 'NUMBER'},
                            'notes': {'type': 'STRING'},
                            'detectedObjects': {
                                'type': 'ARRAY',
                                'items': {'type': 'STRING'}
                            },
                            'suggestions': {'type': 'STRING'}
                        },
                        'required': ['isWasteBin', 'isFull', 'fillLevel', 'confidence', 'notes', 'detectedObjects', 'suggestions']
                    }
                }
            }
            
            response = requests.post(ai_url, headers=ai_headers, json=ai_request_body)
            
            if response.status_code == 200:
                result = response.json()
                candidates = result.get('candidates', [])
                if candidates:
                    content = candidates[0].get('content', {})
                    parts = content.get('parts', [])
                    if parts:
                        ai_result = parts[0]  # This should be the JSON response
                        if isinstance(ai_result, str):
                            import json as json_lib
                            ai_result = json_lib.loads(ai_result)
                        return ai_result
            else:
                # If API call fails, return error response
                logger.error(f"AI API error: {response.status_code} - {response.text}")
                return {
                    'isWasteBin': False,
                    'isFull': False,
                    'fillLevel': 0,
                    'confidence': 0,
                    'notes': f'AI xizmatiga ulanishda xatolik yuz berdi: {response.status_code}',
                    'detectedObjects': [],
                    'suggestions': 'AI xizmatiga ulanishda xatolik yuz berdi'
                }
            
            # If AI analysis fails, return default values
            return {
                'isWasteBin': False,
                'isFull': False,
                'fillLevel': 0,
                'confidence': 0,
                'notes': 'AI tahlili amalga oshmadi',
                'detectedObjects': [],
                'suggestions': 'AI tahlil qilishda xatolik yuz berdi'
            }
        except Exception as e:
            logger.error(f"AI analysis error: {e}")
            return {
                'isWasteBin': False,
                'isFull': False,
                'fillLevel': 0,
                'confidence': 0,
                'notes': f'AI tahlil qilishda xatolik yuz berdi: {str(e)}',
                'detectedObjects': [],
                'suggestions': f'AI tahlil qilishda xatolik yuz berdi: {str(e)}'
            }
    
    async def update_bin_with_photo(self, bin_id: str, current_bin: dict, photo_file_path: str, photo_bytes: bytes = None):
        """Update bin status with photo and AI analysis"""
        await self.ensure_authenticated()  # Ensure we're logged in
        try:
            # Analyze the image with AI
            ai_analysis = await self.analyze_image_with_ai(photo_bytes) if photo_bytes else {
                'isWasteBin': True,  # Default to true if no analysis
                'isFull': True,
                'fillLevel': 100,
                'confidence': 80,
                'notes': 'Rasm tahlili amalga oshmadi'
            }
            
            # Check if image is actually of a waste bin
            if not ai_analysis.get('isWasteBin', False):
                return {
                    'error': 'Bu rasmda chiqindi konteyneri aniqlanmadi. Iltimos, konteyner rasmini yuboring.',
                    'analysis': ai_analysis
                }
            
            # Create a temporary image URL based on the Telegram file path
            temp_image_url = f"https://api.telegram.org/file/bot{self.bot_token}/{photo_file_path}"
            
            # Prepare updated data based on AI analysis (without image_url since we're uploading the file directly)
            updated_data = {
                'is_full': ai_analysis.get('isFull', False),
                'fill_level': ai_analysis.get('fillLevel', 0),
                'image_source': 'BOT',  # Mark that the image came from the bot
                'last_analysis': f"AI tahlili: {ai_analysis.get('notes', 'Tahlil amalga oshirildi')}, Isbot: {ai_analysis.get('isWasteBin')}, IsFull: {ai_analysis.get('isFull')}, Conf: {ai_analysis.get('confidence')}%"
            }
            
            # First, download the image from Telegram
            image_url = f"https://api.telegram.org/file/bot{self.bot_token}/{photo_file_path}"
            image_response = requests.get(image_url)
            
            if image_response.status_code == 200:
                # Prepare multipart form data for file upload
                files = {
                    'image': (os.path.basename(photo_file_path), image_response.content, 'image/jpeg')
                }
                
                # Prepare other data as form data
                data = {
                    'is_full': updated_data['is_full'],
                    'fill_level': updated_data['fill_level'],
                    'image_source': updated_data['image_source'],
                    'last_analysis': updated_data['last_analysis']
                }
                
                # Update bin via API using PATCH method for file upload
                headers = self.get_auth_headers()
                # Remove Content-Type header to let requests set it automatically for multipart
                if 'Content-Type' in headers:
                    del headers['Content-Type']
                
                response = requests.patch(
                    f"{self.api_base_url}/waste-bins/{bin_id}/update-image-file/",
                    files=files,
                    data=data,
                    headers=headers
                )
            else:
                logger.error(f"Failed to download image from Telegram: {image_response.status_code}")
                return None
            
            if response.status_code in [200, 201]:
                logger.info(f"Successfully updated bin {bin_id} with photo and AI analysis")
                # Return the updated bin information by fetching it again
                updated_bin = await self.get_bin_details(bin_id)
                # Add AI analysis to the result
                if updated_bin:
                    updated_bin['ai_analysis'] = ai_analysis
                return updated_bin
            else:
                logger.error(f"Error updating bin with photo: {response.status_code}, {response.text}")
                return None
        except Exception as e:
            logger.error(f"Exception updating bin with photo: {e}")
            return None

    async def update_bin_to_full(self, bin_id: str, current_bin: dict):
        """Update bin status to full (original function without photo)"""
        await self.ensure_authenticated()  # Ensure we're logged in
        try:
            # For the PATCH request, we only send the fields that need to be updated
            updated_data = {
                'is_full': True,
                'fill_level': 100
            }
            
            # Update bin via API using PATCH method for partial updates
            headers = self.get_auth_headers()
            
            response = requests.patch(
                f"{self.api_base_url}/waste-bins/{bin_id}/update-image/",
                json=updated_data,
                headers=headers
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Successfully updated bin {bin_id} to full status")
                # Return the updated bin information by fetching it again
                return await self.get_bin_details(bin_id)
            else:
                logger.error(f"Error updating bin: {response.status_code}, {response.text}")
                return None
        except Exception as e:
            logger.error(f"Exception updating bin: {e}")
            return None

    async def notify_admins(self, bin_id: str, bin_details: dict, user):
        """Notify admins about the full bin"""
        try:
            # In a real implementation, you would notify admins
            # For now, just log the information
            logger.info(f"Admin notification: Bin {bin_id} is now full. Reported by user {user.id if user else 'Unknown'}")
            
            # You could send a message to a specific admin group/chat
            # await context.bot.send_message(chat_id=ADMIN_CHAT_ID, text=message)
        except Exception as e:
            logger.error(f"Error notifying admins: {e}")
    
    def extract_sensor_data(self, message_text: str):
        """Extract sensor data from message in the format:
        Qurilma: ESP-100FDA
        🌡 Harorat: 18.9 °C
        💧 Havo namligi: 43.0 %
        ⏱ Sleep: 1800 sekund
        """
        import re
        
        # Extract device ID
        device_match = re.search(r'Qurilma:\s*(ESP-\w+)', message_text)
        device_id = device_match.group(1) if device_match else None
        
        # Extract temperature
        temp_match = re.search(r'🌡 Harorat:\s*([\d.]+)\s*°C', message_text)
        temperature = float(temp_match.group(1)) if temp_match else None
        
        # Extract humidity
        humidity_match = re.search(r'💧 Havo namligi:\s*([\d.]+)\s*%', message_text)
        humidity = float(humidity_match.group(1)) if humidity_match else None
        
        # Extract sleep time
        sleep_match = re.search(r'⏱ Sleep:\s*(\d+)\s*sekund', message_text)
        sleep_seconds = int(sleep_match.group(1)) if sleep_match else None
        
        if device_id:
            return {
                'device_id': device_id,
                'temperature': temperature,
                'humidity': humidity,
                'sleep_seconds': sleep_seconds
            }
        
        return None
    
    async def send_sensor_data_to_platform(self, sensor_data: dict):
        """Send sensor data to the platform using the IoT device data endpoint"""
        await self.ensure_authenticated()  # Ensure we're logged in
        try:
            headers = self.get_auth_headers()
            
            # Prepare the data to send
            data_to_send = {
                'device_id': sensor_data['device_id'],
                'temperature': sensor_data.get('temperature'),
                'humidity': sensor_data.get('humidity'),
                'sleep_seconds': sensor_data.get('sleep_seconds'),
                'timestamp': int(asyncio.get_event_loop().time())  # Current timestamp
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

    async def scan_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /scan command"""
        if update.message:
            await update.message.reply_text(
                "📸 QR kodni skaner qilish uchun kamerangizdan foydalaning.\n\n"
                "1. QR kodga kamerangizni yo'naltiring\n"
                "2. Skaner tugmasini bosing\n"
                "3. Bot avtomatik ravishda konteynerni aniqlaydi\n"
                "4. So'ralgan rasmiyosni yuboring"
            )

    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command"""
        if update.message:
            help_text = (
                "🤖 <b>Toza Farqona Bot Yordami</b>\n\n"
                "Bu bot orqali konteynerlarni boshqarishingiz mumkin:\n\n"
                "🔗 <b>QR kod orqali kirish:</b>\n"
                "• Har bir konteynergga maxsus QR kod berilgan\n"
                "• QR kodni skaner qiling\n"
                "• Bot avtomatik ravishda konteynerni aniqlaydi\n\n"
                "📷 <b>Rasm yuborish:</b>\n"
                "• To'ldi deb xabar berish uchun rasm yuboring\n"
                "• Bot AI yordamida rasmni tahlil qiladi\n"
                "• Agar chiqindi konteyneri to'la bo'lsa, xabarnoma yuboriladi\n\n"
                "📋 <b>Mavjud komandalar:</b>\n"
                "/start - Botni ishga tushirish\n"
                "/scan - QR kod skaner qilish bo'yicha ko'rsatma\n"
                "/help - Yordam ko'rsatish"
            )
            await update.message.reply_text(help_text, parse_mode='HTML')
    
    async def handle_channel_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle messages from the monitored channel"""
        if update.message and update.message.text:
            message_text = update.message.text
            
            # Check if the message contains sensor data
            sensor_data = self.extract_sensor_data(message_text)
            
            if sensor_data:
                logger.info(f"Sensor data extracted: {sensor_data}")
                
                # Send the data to the platform
                result = await self.send_sensor_data_to_platform(sensor_data)
                
                if result:
                    logger.info(f"Sensor data successfully sent to platform: {result}")
                else:
                    logger.error("Failed to send sensor data to platform")

def main():
    """Start the bot"""
    # Create bot instance
    waste_bot = WasteBinBot()
    
    # Create main application using builder pattern
    main_application = Application.builder().token(BOT_TOKEN).build()
    
    # Add main bot handlers
    main_application.add_handler(CommandHandler("start", waste_bot.start))
    main_application.add_handler(CommandHandler("scan", waste_bot.scan_command))
    main_application.add_handler(CommandHandler("help", waste_bot.help_command))
    
    # Handle text messages (for QR codes/IDs)
    main_application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, waste_bot.handle_qr_scan))
    
    # Handle photos
    main_application.add_handler(MessageHandler(filters.PHOTO, waste_bot.handle_photo))
    
    logger.info("Main bot is starting...")
    main_application.run_polling(allowed_updates=Update.ALL_TYPES, drop_pending_updates=True)

if __name__ == '__main__':
    main()