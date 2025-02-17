require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const commands = require('./commands');
const channels = require('./channels');

// Замените значение ниже на токен, полученный от BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;

// Создаем бота, который использует 'polling' для получения новых обновлений
const bot = new TelegramBot(token, {polling: true});

let lastMessage = null;
let selectedChannels = new Set();

// Функция для подсчета символов с учетом markdown
function countCharacters(text) {
  if (!text) return 0;
  // Убираем markdown-разметку
  const cleanText = text.replace(/\*|_|`|\[.*?\]|\(.*?\)/g, '');
  return cleanText.length;
}

// Обработчик команды /add_channel
bot.onText(/\/add_channel/, (msg) => {
  commands.addChannel(bot, msg);
});

// Обработчик сообщений от пользователей
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Проверяем, не в процессе ли добавления канала
  const isHandled = await commands.handleMessage(bot, msg);
  if (isHandled) return;

  // Игнорируем команды
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }

  // Проверяем наличие каналов
  const channelList = channels.getChannels();
  if (!channelList || channelList.length === 0) {
    bot.sendMessage(chatId, '❌ Нет добавленных каналов\n➕ Добавьте канал командой /add_channel');
    return;
  }

  // Сохраняем сообщение и очищаем выбранные каналы
  lastMessage = {
    text: msg.text,
    entities: msg.entities
  };
  selectedChannels.clear();

  const charCount = countCharacters(lastMessage.text);

  // Создаем клавиатуру с каналами для выбора
  const channelKeyboard = {
    inline_keyboard: [
      ...channelList.map(channel => [{
        text: `📢 ${channel.name}`,
        callback_data: `select_${channel.id}`
      }]),
      [
        { text: '📨 Отправить выбранные', callback_data: 'send' },
        { text: '📨 Отправить во все', callback_data: 'send_all' }
      ]
    ]
  };

  await bot.sendMessage(chatId, `📋 Выберите каналы для отправки:\n\n📊 Символов в сообщении: ${charCount}`, {
    reply_markup: channelKeyboard
  });
});

// Обработчик нажатий на кнопки клавиатуры
bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const messageToSend = lastMessage;
    const channelList = channels.getChannels();
    const charCount = countCharacters(messageToSend.text);

    if (!messageToSend) {
      await bot.answerCallbackQuery(query.id, '❌ Сообщение не найдено');
      return;
    }

    // Если это выбор канала
    if (data.startsWith('select_')) {
      const channelId = data.split('_')[1];
      // Добавляем/удаляем канал из выбранных
      if (selectedChannels.has(channelId)) {
        selectedChannels.delete(channelId);
        await bot.answerCallbackQuery(query.id, '❌ Канал убран');
      } else {
        selectedChannels.add(channelId);
        await bot.answerCallbackQuery(query.id, '✅ Канал выбран');
      }

      // Обновляем клавиатуру
      const newKeyboard = {
        inline_keyboard: [
          ...channelList.map(channel => [{
            text: `${selectedChannels.has(channel.id) ? '✅' : '📢'} ${channel.name}`,
            callback_data: `select_${channel.id}`
          }]),
          [
            { text: '📨 Отправить выбранные', callback_data: 'send' },
            { text: '📨 Отправить во все', callback_data: 'send_all' }
          ]
        ]
      };

      await bot.editMessageReplyMarkup(newKeyboard, {
        chat_id: chatId,
        message_id: messageId
      });
    } 
    // Если это отправка в выбранные каналы
    else if (data === 'send') {
      // Проверяем, выбран ли хоть один канал
      if (selectedChannels.size === 0) {
        await bot.answerCallbackQuery(query.id, '❌ Выберите хотя бы один канал');
        return;
      }

      let success = true;
      let successChannels = [];

      // Отправляем в выбранные каналы
      for (const channelId of selectedChannels) {
        try {
          await bot.sendMessage(channelId, messageToSend.text, {
            entities: messageToSend.entities
          });
          const channel = channelList.find(ch => ch.id === channelId);
          if (channel) {
            successChannels.push(channel.name);
          }
        } catch (error) {
          console.error(`Ошибка отправки в канал ${channelId}:`, error);
          success = false;
        }
      }

      bot.deleteMessage(chatId, messageId);
      await bot.answerCallbackQuery(query.id, success ? '✅ Отправлено' : '❌ Ошибка при отправке');
      
      // Отправляем статус с названиями каналов
      if (success) {
        const channelsText = successChannels.length > 1 ? 
          'каналы: ' + successChannels.join(', ') : 
          'канал: ' + successChannels[0];
        await bot.sendMessage(chatId, `✅ Сообщение отправлено в ${channelsText}`);
      } else {
        await bot.sendMessage(chatId, '❌ Ошибка при отправке сообщения');
      }
      
      selectedChannels.clear();
    } 
    // Если это отправка во все каналы
    else if (data === 'send_all') {
      let success = true;
      let successChannels = [];

      // Отправляем во все каналы
      for (const channel of channelList) {
        try {
          await bot.sendMessage(channel.id, messageToSend.text, {
            entities: messageToSend.entities
          });
          successChannels.push(channel.name);
        } catch (error) {
          console.error(`Ошибка отправки в канал ${channel.id}:`, error);
          success = false;
        }
      }

      bot.deleteMessage(chatId, messageId);
      await bot.answerCallbackQuery(query.id, success ? '✅ Отправлено' : '❌ Ошибка при отправке');
      
      // Отправляем статус
      if (success) {
        await bot.sendMessage(chatId, '✅ Сообщение отправлено во все каналы');
      } else {
        await bot.sendMessage(chatId, '❌ Ошибка при отправке сообщения');
      }
      
      selectedChannels.clear();
    }
  } catch (error) {
    console.error('Ошибка при отправке сообщения:', error);
    await bot.answerCallbackQuery(query.id, '❌ Ошибка при отправке сообщения');
  }
});
