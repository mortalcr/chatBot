"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const node_fetch_1 = __importDefault(require("node-fetch"));
const form_data_1 = __importDefault(require("form-data"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const API_BASE_URL = process.env.API_BASE_URL;
const BOT_ID = process.env.BOT_ID;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const botEmail = process.env.BOT_EMAIL;
const botPassword = process.env.BOT_PASSWORD;
const weatherApiKey = process.env.WEATHER_API_KEY;
const cookieKey = process.env.COOKIE_KEY;
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
const REMINDERS_FILE_PATH = 'reminders.json';
let authToken = null;
function loadReminders() {
    try {
        if (fs_1.default.existsSync(REMINDERS_FILE_PATH)) {
            const data = fs_1.default.readFileSync(REMINDERS_FILE_PATH, 'utf-8');
            return data && data.trim() ? JSON.parse(data) : [];
        }
        else {
            return [];
        }
    }
    catch (error) {
        console.error("Error al cargar recordatorios:", error);
        return [];
    }
}
function saveReminders(reminders) {
    fs_1.default.writeFileSync(REMINDERS_FILE_PATH, JSON.stringify(reminders, null, 2));
}
function authenticateBot() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const { data, error } = yield supabase.auth.signInWithPassword({
            email: botEmail,
            password: botPassword,
        });
        if (error) {
            console.error('Error en la autenticación:', error.message);
            return;
        }
        authToken = ((_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) || null;
        if (authToken) {
            console.log('Autenticación exitosa. Token obtenido y almacenado.');
        }
        else {
            console.error('No se pudo obtener el token de autenticación.');
        }
    });
}
function getWeather() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield (0, node_fetch_1.default)(`https://api.openweathermap.org/data/2.5/weather?lat=9.748917&lon=-83.753428&appid=${weatherApiKey}&units=metric&lang=es`);
        const data = yield response.json();
        return `Clima actual en Costa Rica: ${data.weather[0].description}, temperatura: ${data.main.temp}°C, sensación térmica: ${data.main.feels_like}°C.`;
    });
}
function sendMessage(conversationId, content) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!authToken) {
            console.error("El bot no está autenticado. No se puede enviar el mensaje.");
            return;
        }
        const formData = new form_data_1.default();
        formData.append('content', content);
        formData.append('sent_by', '1');
        try {
            const response = yield (0, node_fetch_1.default)(`${API_BASE_URL}/api/conversations/${conversationId}/send`, {
                method: 'POST',
                body: formData,
                headers: Object.assign(Object.assign({}, formData.getHeaders()), { 'Cookie': `sb-qvasbmmzafwobuairjdm-auth-token=${cookieKey}` }),
            });
            if (!response.ok) {
                console.error("Error al enviar el mensaje:", yield response.text());
            }
            else {
                console.log("Mensaje enviado exitosamente.");
            }
        }
        catch (error) {
            console.error("Error en la solicitud de envío del mensaje:", error);
        }
    });
}
function handleReminderCommand(conversationId, userId, content) {
    return __awaiter(this, void 0, void 0, function* () {
        const reminderRegex = /\/recordar\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s+(.+)/;
        const match = content.match(reminderRegex);
        if (!match) {
            sendMessage(conversationId, "Formato incorrecto. Usa: /recordar DD/MM/YYYY HH:MM mensaje");
            return;
        }
        const [_, dateStr, timeStr, reminderMessage] = match;
        const remindAt = new Date(`${dateStr.split('/').reverse().join('-')}T${timeStr}:00`);
        const reminders = loadReminders();
        reminders.push({
            conversation_id: conversationId,
            user_id: userId,
            remind_at: remindAt.toISOString(),
            message: reminderMessage,
        });
        saveReminders(reminders);
        sendMessage(conversationId, `Recordatorio configurado para ${dateStr} ${timeStr}: ${reminderMessage}`);
    });
}
function checkReminders() {
    const reminders = loadReminders();
    const now = new Date();
    const remainingReminders = reminders.filter(reminder => {
        const remindAt = new Date(reminder.remind_at);
        if (remindAt <= now) {
            sendMessage(reminder.conversation_id, `Recordatorio: ${reminder.message}`);
            return false;
        }
        return true;
    });
    saveReminders(remainingReminders);
}
function searchCharacter(name) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://rickandmortyapi.com/api/character/?name=${encodeURIComponent(name)}`;
        try {
            const response = yield (0, node_fetch_1.default)(url);
            const data = yield response.json();
            if (data.results && data.results.length > 0) {
                const character = data.results[0];
                return `👤 Nombre: ${character.name}
🩸 Estado: ${character.status}
🔹 Especie: ${character.species}
🌍 Origen: ${character.origin.name}
📍 Ubicación: ${character.location.name}`;
            }
            else {
                return `No se encontró ningún personaje llamado "${name}".`;
            }
        }
        catch (error) {
            console.error("Error al buscar el personaje:", error);
            return "Hubo un error al intentar buscar el personaje. Por favor, inténtalo de nuevo más tarde.";
        }
    });
}
function handleHelpCommand(conversationId) {
    return __awaiter(this, void 0, void 0, function* () {
        const helpMessage = `
Comandos disponibles:
- /clima: Muestra el clima actual en Costa Rica.
- /recordar DD/MM/YYYY HH:MM mensaje: Configura un recordatorio con una fecha, hora y mensaje especificado.
- /rickAndMorty nombre: Busca información sobre un personaje de Rick and Morty.
- /help: Muestra este mensaje de ayuda.
  `;
        yield sendMessage(conversationId, helpMessage);
    });
}
function listenForMessages() {
    return __awaiter(this, void 0, void 0, function* () {
        yield authenticateBot();
        supabase
            .channel('schema-db-changes')
            .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
        }, (payload) => __awaiter(this, void 0, void 0, function* () {
            const message = payload.new;
            const content = message.content.trim();
            const { data: conversationData, error } = yield supabase
                .from('conversations')
                .select('peer_a, peer_b')
                .eq('id', message.conversation)
                .single();
            if (error || !conversationData) {
                console.error("Error al obtener la conversación:", error === null || error === void 0 ? void 0 : error.message);
                return;
            }
            if (conversationData.peer_a === BOT_ID || conversationData.peer_b === BOT_ID) {
                if (content.startsWith('/help')) {
                    yield handleHelpCommand(message.conversation);
                }
                else if (content.startsWith('/clima')) {
                    const weatherMessage = yield getWeather();
                    yield sendMessage(message.conversation, weatherMessage);
                }
                else if (content.startsWith('/recordar')) {
                    yield handleReminderCommand(message.conversation, message.sent_by, content);
                }
                else if (content.startsWith('/rickAndMorty')) {
                    const characterName = content.replace('/rickAndMorty', '').trim();
                    if (!characterName) {
                        yield sendMessage(message.conversation, "Por favor, proporciona un nombre después de /rickAndMorty.");
                        return;
                    }
                    const characterInfo = yield searchCharacter(characterName);
                    yield sendMessage(message.conversation, characterInfo);
                }
            }
        }))
            .subscribe();
    });
}
setInterval(checkReminders, 60000);
listenForMessages();
