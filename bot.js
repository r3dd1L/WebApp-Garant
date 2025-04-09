require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// Конфигурация (эти данные безопасно хранятся в Render)
const token = process.env.TELEGRAM_TOKEN || '7958895679:AAFLy-2SA0DHGjTVj6xbHlcWwVtmU47_Xy4';
const CHANNEL_ID = process.env.CHANNEL_ID || -1002053611638;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://garantService:qi79uWEa9eC96O0a@cluster0.ghgfwuj.mongodb.net/garantService?retryWrites=true&w=majority';

// Подключение к MongoDB с обработкой ошибок
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Успешное подключение к MongoDB'))
.catch(err => console.error('❌ Ошибка MongoDB:', err.message));

// Модель для заявок
const requestSchema = new mongoose.Schema({
  userId: Number,
  userName: String,
  userLink: String,
  type: String,
  offer: String,
  want: String,
  partner: String,
  status: { type: String, default: 'pending' },
  acceptedBy: { type: String, default: null }
});

const Request = mongoose.model('Request', requestSchema);

// Инициализация бота
const bot = new TelegramBot(token, { polling: true });
app.use(express.json());

// Проверка работоспособности
app.get('/', (req, res) => {
  res.send('Garant Service Bot работает!');
});

// Обработчик заявок
app.post('/submit-request', async (req, res) => {
  try {
    const { user, type, offer, want, partner } = req.body;

    const newRequest = new Request({
      userId: user.id,
      userName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      userLink: `tg://user?id=${user.id}`,
      type,
      offer,
      want,
      partner
    });

    await newRequest.save();

    const message = `🆕 Нова заявка ${type === 'exchange' ? 'ОБМІН' : 'ПРОДАЖ'}\n` +
                   `😺 Від: [${newRequest.userName}](${newRequest.userLink})\n` +
                   `💠 Що міняє: ${offer}\n` +
                   `💠 На що: ${want}\n` +
                   `💠 З ким: ${partner}`;

    await bot.sendMessage(CHANNEL_ID, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{
          text: 'Прийняти',
          callback_data: `accept_${newRequest._id}`
        }]]
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обработка кнопки "Прийняти"
bot.on('callback_query', async (query) => {
  if (query.data.startsWith('accept_')) {
    const requestId = query.data.split('_')[1];
    const guarantor = query.from;

    try {
      const request = await Request.findByIdAndUpdate(
        requestId,
        { 
          status: 'accepted',
          acceptedBy: `${guarantor.first_name} (ID: ${guarantor.id})`
        },
        { new: true }
      );

      if (!request) {
        return bot.answerCallbackQuery(query.id, { text: 'Заявка не найдена!' });
      }

      await bot.editMessageText(`${query.message.text}\n\n✅ Прийняв: ${guarantor.first_name}`, {
        chat_id: CHANNEL_ID,
        message_id: query.message.message_id,
        parse_mode: 'Markdown'
      });

      await bot.sendMessage(
        request.userId,
        `✅ Вашу заявку прийняв гарант: ${guarantor.first_name}`
      );

      bot.answerCallbackQuery(query.id, { text: 'Заявку прийнято!' });
    } catch (error) {
      console.error('Ошибка:', error);
      bot.answerCallbackQuery(query.id, { text: 'Помилка!' });
    }
  }
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});