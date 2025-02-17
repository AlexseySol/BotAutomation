// channels.js

const fs = require('fs');
const path = require('path');

const channelsPath = path.join(__dirname, 'channels.json');

// Создаем файл channels.json, если его нет
if (!fs.existsSync(channelsPath)) {
  fs.writeFileSync(channelsPath, JSON.stringify({ channels: [] }, null, 2));
}

module.exports = {
  getChannels: () => {
    try {
      if (!fs.existsSync(channelsPath)) {
        fs.writeFileSync(channelsPath, JSON.stringify({ channels: [] }, null, 2));
        return [];
      }
      const data = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
      return data.channels || [];
    } catch (error) {
      console.error('Ошибка при чтении channels.json:', error);
      return [];
    }
  },

  addChannel: (name, id) => {
    try {
      let data = { channels: [] };
      if (fs.existsSync(channelsPath)) {
        data = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));
      }
      if (!data.channels) {
        data.channels = [];
      }
      data.channels.push({ name, id });
      fs.writeFileSync(channelsPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Ошибка при добавлении канала:', error);
      throw error;
    }
  }
};
