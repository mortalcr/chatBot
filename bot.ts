import { createClient } from '@supabase/supabase-js';
import nodeFetch from 'node-fetch';
import FormData from 'form-data';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL!;
const BOT_ID = process.env.BOT_ID!;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const botEmail = process.env.BOT_EMAIL!;
const botPassword = process.env.BOT_PASSWORD!;
const weatherApiKey = process.env.WEATHER_API_KEY!;
const cookieKey = process.env.COOKIE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const REMINDERS_FILE_PATH = 'reminders.json';

let authToken: string | null = null;

function loadReminders(): any[] {
  try {
    if (fs.existsSync(REMINDERS_FILE_PATH)) {
      const data = fs.readFileSync(REMINDERS_FILE_PATH, 'utf-8');
      return data && data.trim() ? JSON.parse(data) : [];
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error al cargar recordatorios:", error);
    return [];
  }
}

function saveReminders(reminders: any[]): void {
  fs.writeFileSync(REMINDERS_FILE_PATH, JSON.stringify(reminders, null, 2));
}

async function authenticateBot() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: botEmail,
    password: botPassword,
  });

  if (error) {
    console.error('Error en la autenticación:', error.message);
    return;
  }

  authToken = data.session?.access_token || null;
  if (authToken) {
    console.log('Autenticación exitosa. Token obtenido y almacenado.');
  } else {
    console.error('No se pudo obtener el token de autenticación.');
  }
}

async function getWeather(): Promise<string> {
  const response = await nodeFetch(`https://api.openweathermap.org/data/2.5/weather?lat=9.748917&lon=-83.753428&appid=${weatherApiKey}&units=metric&lang=es`);
  const data = await response.json() as {
    name: string;
    weather: { description: string }[];
    main: { temp: number; feels_like: number };
  };

  return `Clima actual en Costa Rica: ${data.weather[0].description}, temperatura: ${data.main.temp}°C, sensación térmica: ${data.main.feels_like}°C.`;
}

async function sendMessage(conversationId: number, content: string) {
  if (!authToken) {
    console.error("El bot no está autenticado. No se puede enviar el mensaje.");
    return;
  }

  const formData = new FormData();
  formData.append('content', content);
  formData.append('sent_by', '1');

  try {
    const response = await nodeFetch(`${API_BASE_URL}/api/conversations/${conversationId}/send`, {
      method: 'POST',
      body: formData,
      headers: {
        ...formData.getHeaders(),
        'Cookie': `sb-qvasbmmzafwobuairjdm-auth-token=${cookieKey}`,
      },
    });

    if (!response.ok) {
      console.error("Error al enviar el mensaje:", await response.text());
    } else {
      console.log("Mensaje enviado exitosamente.");
    }
  } catch (error) {
    console.error("Error en la solicitud de envío del mensaje:", error);
  }
}

async function handleReminderCommand(conversationId: number, userId: string, content: string) {
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

async function searchCharacter(name: string): Promise<string> {
  const url = `https://rickandmortyapi.com/api/character/?name=${encodeURIComponent(name)}`;

  try {
    const response = await nodeFetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const character = data.results[0];
      return `👤 Nombre: ${character.name}
🩸 Estado: ${character.status}
🔹 Especie: ${character.species}
🌍 Origen: ${character.origin.name}
📍 Ubicación: ${character.location.name}`;
    } else {
      return `No se encontró ningún personaje llamado "${name}".`;
    }
  } catch (error) {
    console.error("Error al buscar el personaje:", error);
    return "Hubo un error al intentar buscar el personaje. Por favor, inténtalo de nuevo más tarde.";
  }
}

async function handleHelpCommand(conversationId: number) {
  const helpMessage = `
Comandos disponibles:
- /clima: Muestra el clima actual en Costa Rica.
- /recordar DD/MM/YYYY HH:MM mensaje: Configura un recordatorio con una fecha, hora y mensaje especificado.
- /rickAndMorty nombre: Busca información sobre un personaje de Rick and Morty.
- /help: Muestra este mensaje de ayuda.
  `;
  await sendMessage(conversationId, helpMessage);
}

async function listenForMessages() {
  await authenticateBot();

  supabase
    .channel('schema-db-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload) => {
        const message = payload.new as { content: string; conversation: number; sent_by: string };
        const content = message.content.trim();

        const { data: conversationData, error } = await supabase
          .from('conversations')
          .select('peer_a, peer_b')
          .eq('id', message.conversation)
          .single();

        if (error || !conversationData) {
          console.error("Error al obtener la conversación:", error?.message);
          return;
        }

        if (conversationData.peer_a === BOT_ID || conversationData.peer_b === BOT_ID) {
          if (content.startsWith('/help')) {
            await handleHelpCommand(message.conversation);
          } else if (content.startsWith('/clima')) {
            const weatherMessage = await getWeather();
            await sendMessage(message.conversation, weatherMessage);
          } else if (content.startsWith('/recordar')) {
            await handleReminderCommand(message.conversation, message.sent_by, content);
          } else if (content.startsWith('/rickAndMorty')) {
            const characterName = content.replace('/rickAndMorty', '').trim();
            if (!characterName) {
              await sendMessage(message.conversation, "Por favor, proporciona un nombre después de /rickAndMorty.");
              return;
            }
            const characterInfo = await searchCharacter(characterName);
            await sendMessage(message.conversation, characterInfo);
          }
        }
      }
    )
    .subscribe();
}

setInterval(checkReminders, 60000);
listenForMessages();
