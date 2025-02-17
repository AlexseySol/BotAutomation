// commands.js

const channels = require('./channels');

let addChannelStates = {};

// Функция для валидации ID канала
function validateChannelId(id) {
  // ID должен начинаться с -100 и содержать цифры после
  const pattern = /^-100\d+$/;
  return pattern.test(id);
}

// Обработчик добавления канала
const addChannel = async (bot, msg) => {
  const chatId = msg.chat.id;
  addChannelStates[chatId] = { step: 'waiting_name' };
  bot.sendMessage(chatId, '📝 Введите название для канала:');
};

// Обработчик сообщений в процессе добавления канала
const handleMessage = async (bot, msg) => {
  const chatId = msg.chat.id;
  const state = addChannelStates[chatId];

  if (!state) {
    return false;
  }

  if (state.step === 'waiting_name') {
    const channelName = msg.text;
    addChannelStates[chatId] = { step: 'waiting_id', channelName };
    bot.sendMessage(chatId, '🔑 Введите ID канала:');
    return true;
  }

  if (state.step === 'waiting_id') {
    const channelId = msg.text;
    
    // Проверяем валидность ID
    if (!validateChannelId(channelId)) {
      bot.sendMessage(chatId, '❌ Неверный формат ID канала!\n\n✅ ID должен начинаться с -100\n\n🔄 Попробуйте еще раз:');
      return true;
    }

    try {
      channels.addChannel(state.channelName, channelId);
      bot.sendMessage(chatId, '✅ Канал успешно добавлен!');
    } catch (error) {
      bot.sendMessage(chatId, '❌ Ошибка при добавлении канала');
      console.error('Ошибка при добавлении канала:', error);
    }
    delete addChannelStates[chatId];
    return true;
  }

  return false;
};

module.exports = {
  addChannel,
  handleMessage
};
