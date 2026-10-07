export function validateBook(input, config) {
  const code = typeof input.code === 'string' ? input.code.trim() : '';
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const author = typeof input.author === 'string' ? input.author.trim() : '';
  const rawPrice = typeof input.price === 'string' ? input.price.trim() : '';
  if (!code.startsWith(config.prefix) || !/^[0-9A-Za-z-]{3,40}$/.test(code)) throw new Error(`Mã sách phải bắt đầu bằng ${config.prefix}, tối đa 40 ký tự chữ, số hoặc dấu -.`);
  if (!title || title.length > 200) throw new Error('Tên sách phải có từ 1 đến 200 ký tự.');
  if (!author || author.length > 120) throw new Error('Tác giả phải có từ 1 đến 120 ký tự.');
  if (!/^\d{1,9}$/.test(rawPrice)) throw new Error('Giá phải là số nguyên từ 0 đến 999999999 đồng.');
  const price = Number(rawPrice);
  return { code, title, author, price, vat: config.vat, priceAfterTax: Math.round(price * (100 + config.vat) / 100), createdAt: new Date() };
}
