import express from 'express';
import helmet from 'helmet';
import { engine } from 'express-handlebars';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { sessionMiddleware } from './session.js';
import { validateBook } from './books.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export function createApp(config, repository, store) {
  const app = express();
  app.disable('x-powered-by');
  if (config.production) app.set('trust proxy', 1);
  app.use(helmet());
  app.engine('hbs', engine({ extname: '.hbs', helpers: { money: value => new Intl.NumberFormat('vi-VN').format(value) + ' ₫' } }));
  app.set('view engine', 'hbs');
  app.set('views', root + 'views');
  app.use(express.static(root + 'public'));
  app.get('/health', async (req, res) => {
    try { await repository.ping(); res.json({ status: 'ok' }); }
    catch { res.status(503).json({ status: 'unavailable' }); }
  });
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(sessionMiddleware(config, store));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    req.session.csrf ??= randomBytes(32).toString('hex');
    res.locals = { ...res.locals, student: config, csrf: req.session.csrf };
    next();
  });
  async function render(req, res, status = 200, error = null, values = {}) {
    const books = await repository.list();
    res.status(status).render('home', { books, error, values, success: req.session.success, visits: req.session.visits || 0 });
  }
  app.get('/', async (req, res) => {
    req.session.visits = (req.session.visits || 0) + 1;
    await render(req, res);
    delete req.session.success;
  });
  app.post('/books', async (req, res) => {
    if (typeof req.body._csrf !== 'string' || req.body._csrf !== req.session.csrf) return res.status(403).render('error', { message: 'Phiên gửi biểu mẫu không hợp lệ. Hãy tải lại trang.' });
    let book;
    try { book = validateBook(req.body, config); }
    catch (error) { return render(req, res, 400, error.message, req.body); }
    try { await repository.insert(book); }
    catch (error) {
      if (error.code === 11000) return render(req, res, 409, 'Mã sách đã tồn tại.', req.body);
      throw error;
    }
    req.session.success = `Đã thêm sách ${book.code}.`;
    req.session.save(error => {
      if (error) return res.status(503).render('error', { message: 'Sách đã lưu nhưng không thể cập nhật phiên. Hãy tải lại danh sách.' });
      res.redirect(303, '/');
    });
  });
  app.use((req, res) => res.status(404).render('error', { message: 'Không tìm thấy trang.' }));
  app.use((error, req, res, next) => {
    console.error('Request failed:', error.code || error.name);
    if (res.headersSent) return next(error);
    res.status(503).render('error', { message: 'Dịch vụ tạm thời không khả dụng. Vui lòng thử lại.' });
  });
  return app;
}
