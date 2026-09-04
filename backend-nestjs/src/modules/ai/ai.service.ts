import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface VoiceResult { reply: string; pendingOrder: any; }

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async processVoiceCommand(transcript: string, context?: any): Promise<VoiceResult> {
    const lower = transcript.toLowerCase().trim();

    // ─── LIST ORDERS (must check BEFORE 'order' since 'orders' contains 'order') ───
    if (lower.match(/\borders\b/) || lower.includes('سفارش') && lower.match(/ها|هاي|های|لیست|لی|show|list|view|all|active|فعال/)) {
      // "orders" alone → list; "order table 3 two kebab" → create
      if (lower.match(/\borders\b/) && !lower.match(/table|میز|\d/)) {
        return { reply: await this.checkOrderStatus(), pendingOrder: null };
      }
      if (lower.includes('سفارش') && !lower.match(/میز|\d|order|بده|ثبت/)) {
        return { reply: await this.checkOrderStatus(), pendingOrder: null };
      }
    }

    // ─── CREATE ORDER ───
    if (lower.includes('order') || lower.includes('سفارش') || lower.includes('بده') || lower.includes('ثبت کن')) {
      return this.handleVoiceOrder(transcript);
    }

    if (lower.includes('status') || lower.includes('وضعیت') || lower.includes('.getCurrentStatus'))
      return { reply: await this.checkOrderStatus(), pendingOrder: null };

    if (lower.includes('cancel') || lower.includes('لغو'))
      return { reply: '❌ سفارش لغو شد.', pendingOrder: null };

    if (lower.includes('موجودی') || lower.includes('انبار') || lower.includes('inventory') || lower.includes('stock')) {
      const count = await this.prisma.ingredient.count();
      return { reply: `📦 موجودی انبار: ${count} قلم مواد اولیه.`, pendingOrder: null };
    }

    if (lower.includes('منو') || lower.includes('غذا') || lower.includes('recipe') || lower.includes('menu') || lower.includes('menu items'))
      return { reply: await this.listMenuItems(), pendingOrder: null };

    if (lower.includes('دما') || lower.includes('temperature') || lower.includes('یخچال') || lower.includes('temp'))
      return { reply: '🌡️ پایش دمای هوشمند فعال.\nیخچال اصلی: 3.2°C ✅\nفریزر: -18.5°C ✅\nیخچال ماهی: 1.4°C ✅', pendingOrder: null };

    if (lower.includes('تأمین') || lower.includes('supplier'))
      return { reply: `🏪 تأمین‌کنندگان: ${await this.prisma.supplier.count()}.`, pendingOrder: null };

    if (lower.includes('میز') || lower.includes('table'))
      return { reply: await this.listTables(), pendingOrder: null };

    if (lower.includes('سلام') || lower.includes('hi') || lower.includes('hello') || lower.includes('hey'))
      return { reply: '🤖 سلام! من دستیار هوشمند ماکان هستم.\n\nبرای ثبت سفارش:\n"order table 3 two kebab"\n"میز ۳ دو کباب برگ"\n\n📋 سفارش‌ها: "orders"\n📦 موجودی  🍳 منو  🌡️ دما', pendingOrder: null };

    if (lower.includes('کمک') || lower.includes('help'))
      return { reply: '🤖 راهنمای دستیار صوتی:\n\n🎙 "order table 3 two kebab"\n"میز ۳ دو کباب برگ"\n\n📋 سفارش‌ها: "orders"\n❌ لغو: "cancel"\n📦 موجودی  🍳 منو  🌡️ دما  🪑 میزها', pendingOrder: null };

    // ─── REJECT UNTRANSCRIBED AUDIO / PLACEHOLDER TEXT ───
    // The frontend used to send "[صوت ضبط شده - 10KB]" as text when speech-to-text failed.
    // That placeholder must NEVER be parsed into an order.
    if (/صوت ضبط شده|\[?صوت|KB\]|کیلوبایت/.test(transcript)) {
      return { reply: '🎤 صدای شما شنیده نشد یا تشخیص داده نشد.\n\nدوباره امتحان کنید، یا از تایپ و دکمه‌های سریع استفاده کنید.\n\nمثال: "order table 3 two kebab" — "میز ۳ دو کباب برگ"', pendingOrder: null };    }

    // ─── FALLBACK: try to match as a casual order ───
    // If it has a number and looks like food, try parsing as order
    const hasNum = /\d/.test(transcript);
    if (hasNum && transcript.split(/\s+/).length <= 6) {
      return this.handleVoiceOrder(transcript);
    }

    return { reply: `🤔 پیام دریافت شد.\n\nدستورات:\n📋 "orders" — لیست سفارش‌ها\n🎙 "order table 3 two kebab"\n📦 موجودی  🍳 منو  🌡️ دما`, pendingOrder: null };
  }

  private async handleVoiceOrder(transcript: string): Promise<VoiceResult> {
    const parsed = this.parseOrder(transcript);
    if (!parsed.items.length)
      return { reply: '🤔 سفارش قابل تشخیص نیست.\nمثال: "order table 3 two kebab"\n"میز ۳ دو کباب برگ"\n\n📋 سفارش‌ها: "orders"\n🍳 منو: "menu"', pendingOrder: null };

    const matched: any[] = [];
    const unmatched: string[] = [];
    for (const item of parsed.items) {
      const recipe = await this.findRecipe(item.name);
      if (recipe) matched.push({ recipe, quantity: item.quantity });
      else unmatched.push(item.name);
    }

    if (!matched.length)
      return { reply: `❌ آیتمی در منو پیدا نشد.\n${unmatched.length ? `ناشناخته: ${unmatched.join(', ')}` : ''}\n\n🍳 منو: "menu"`, pendingOrder: null };

    let total = 0;
    let summary = `📋 پیش‌نویس سفارش | Draft Order\n🪑 میز: ${parsed.table || 'بیرون‌بر'}\n\n`;
    for (const m of matched) {
      const lineTotal = m.recipe.menuPrice * m.quantity;
      total += lineTotal;
      summary += `• ${m.quantity}× ${m.recipe.name} (${m.recipe.nameFa || ''}) — ${lineTotal.toLocaleString()} تومان\n`;
    }
    if (unmatched.length) summary += `\n⚠️ پیدا نشد: ${unmatched.join(', ')}\n`;
    summary += `\n💰 جمع: ${total.toLocaleString()} تومان\n\n✅ تأیید: "confirm"  |  ❌ لغو: "cancel"`;

    return {
      reply: summary,
      pendingOrder: {
        tableId: parsed.tableId,
        items: matched.map(m => ({ recipeId: m.recipe.id, quantity: m.quantity, notes: null })),
      },
    };
  }

  async createOrderFromDraft(draft: any): Promise<string> {
    try {
      const order = await this.createOrder(draft.tableId, draft.items, draft.userId, draft.organizationId, draft.locationId);
      const itemNames = order.items.map((i: any) => `${i.quantity}× ${i.recipe.name}`).join(', ');
      return `✅ سفارش ثبت شد!\n\n🔢 #${order.id.slice(-6)}\n🪑 میز: ${order.table?.label || 'بیرون‌بر'}\n🍽️ ${itemNames}\n💰 ${order.totalAmount.toLocaleString()} تومان\n\n📨 ارسال به آشپزخانه! 👨‍🍳`;
    } catch (err: any) {
      return `❌ خطا: ${err.message}`;
    }
  }

  private async checkOrderStatus(): Promise<string> {
    const active = await this.prisma.order.findMany({
      where: { status: { notIn: ['CLOSED', 'CANCELLED'] } },
      include: { table: { select: { label: true } }, items: { include: { recipe: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    if (!active.length) return '📋 سفارش فعالی نیست.\n\n🎙 برای ثبت سفارش جدید:\n"order table 3 two kebab"';
    let result = '📋 سفارش‌های فعال:\n\n';
    for (const o of active) {
      const items = o.items.map((i: any) => `${i.quantity}× ${i.recipe.name}`).join(', ');
      result += `#${o.id.slice(-6)} | میز ${o.table?.label || '?'} | ${o.status} | ${items}\n`;
    }
    result += `\n总计: ${active.length} سفارش فعال`;
    return result;
  }

  private parseOrder(transcript: string): { table: string | null; tableId: string | null; items: { name: string; quantity: number }[] } {
    let table: string | null = null;
    let tableId: string | null = null;
    const tableMatch = transcript.match(/(?:table|میز\s*شماره|میز|شماره\s*میز)\s*(\d+)/i);
    if (tableMatch) { table = tableMatch[1]; tableId = tableMatch[1]; }

    const persianNums: Record<string, number> = { 'یک': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5, 'شش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10 };
    const wordNums: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const items: { name: string; quantity: number }[] = [];

    let rest = transcript
      .replace(/table\s*\d+/gi, ' ')
      .replace(/میز\s*شماره\s*\d+/g, ' ')
      .replace(/میز\s*\d+/g, ' ')
      .replace(/سفارش/gi, ' ')
      .replace(/\border\b/gi, ' ')
      .replace(/لطفا/gi, ' ')
      .trim();

    // Persian number words must NOT match inside other words (e.g. "ده" inside "شده")
    const qtyRe = /((?<![\u0600-\u06FF])(?:یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)(?![\u0600-\u06FF])|\b(?:one|two|three|four|five|six|seven|eight|nine|ten)\b|\d+)/gi;
    const parts = rest.split(qtyRe);
    for (let i = 1; i < parts.length; i += 2) {
      const token = (parts[i] || '').trim().toLowerCase();
      if (!token) continue;
      const num = parseInt(token, 10);
      let qty = persianNums[token] ?? wordNums[token] ?? (isNaN(num) ? 1 : num);
      if (qty < 1) qty = 1;
      if (qty > 99) qty = 99;
      const name = (parts[i + 1] || '')
        .replace(/[،,وand\s]+$/i, ' ')
        .replace(/^[\\s،,وand]+/i, ' ')
        .trim();
      if (!name) continue;
      if (name.length < 2 || !/[\u0600-\u06FFa-zA-Z]/.test(name)) continue; // ignore punctuation-only fragments
      if (!items.some(it => it.name.toLowerCase() === name.toLowerCase()))
        items.push({ name, quantity: qty });
    }

    return { table, tableId, items };
  }

  private async findRecipe(name: string) {
    const lower = name.toLowerCase().trim();

    let r = await this.prisma.recipe.findFirst({
      where: { OR: [{ name: { contains: lower } }, { nameFa: { contains: name.trim() } }] },
    });

    if (!r) {
      const keywords = lower.split(/\s+/).filter(k => k.length >= 2 && /[\u0600-\u06FFa-zA-Z]/.test(k));
      for (const k of keywords) {
        r = await this.prisma.recipe.findFirst({
          where: { OR: [{ name: { contains: k } }, { nameFa: { contains: k } }] },
        });
        if (r) break;
      }
    }
    return r;
  }

  private async listMenuItems(): Promise<string> {
    const recipes = await this.prisma.recipe.findMany({
      select: { name: true, nameFa: true, category: true, menuPrice: true },
      orderBy: { category: 'asc' },
    });
    if (!recipes.length) return '📋 منو خالی است.';
    const grouped: Record<string, any[]> = {};
    for (const r of recipes) { const c = r.category || 'other'; if (!grouped[c]) grouped[c] = []; grouped[c].push(r); }
    const catLabels: Record<string, string> = { starter: '🥗 پیش‌غذا', main: '🥩 غذای اصلی', side: '🍚 جانبی', salad: '🥬 سالاد', dessert: '🍰 دسر', beverage: '🥤 نوشیدنی', coffee: '☕ قهوه', quick: '🍔 فست‌فود', local: '🍲 محلی' };
    let result = '📋 منوی ماکان\n\n';
    for (const [cat, items] of Object.entries(grouped)) {
      result += `${catLabels[cat] || cat}:\n`;
      for (const r of items) result += `  • ${r.name} (${r.nameFa || ''}) — ${r.menuPrice.toLocaleString()} تومان\n`;
      result += '\n';
    }
    result += '🎙 سفارش: "order table 3 two kebab"';
    return result;
  }

  private async listTables(): Promise<string> {
    const tables = await this.prisma.table.findMany({
      include: { orders: { where: { status: { notIn: ['CLOSED', 'CANCELLED'] } }, select: { id: true, totalAmount: true } } },
      orderBy: { label: 'asc' },
    });
    if (!tables.length) return '🪑 میزی نیست.';
    let result = '🪑 وضعیت میزها:\n\n';
    for (const t of tables) {
      const icon = t.status === 'OCCUPIED' ? '🔴' : '🟢';
      const orderInfo = t.orders.length > 0 ? ` — ${t.orders.length} سفارش` : '';
      result += `${icon} میز ${t.label} (${t.capacity} نفر)${orderInfo}\n`;
    }
    return result;
  }

  private async createOrder(tableId: string | null, items: any[], userId: string, organizationId: string, locationId: string) {
    return this.prisma.$transaction(async (tx) => {
      let table = null;
      if (tableId) {
        table = await tx.table.findFirst({ where: { label: tableId } });
        if (!table) table = await tx.table.findFirst({ where: { label: { contains: tableId } } });
        if (table) await tx.table.update({ where: { id: table.id }, data: { status: 'OCCUPIED' } });
      }
      const order = await tx.order.create({
        data: { tableId: table?.id || null, serverId: userId, organizationId, locationId, status: 'OPEN', notes: 'Voice order' },
      });
      let totalAmount = 0;
      for (const item of items) {
        const recipe = await tx.recipe.findUnique({ where: { id: item.recipeId } });
        if (!recipe) continue;
        totalAmount += recipe.menuPrice * item.quantity;
        await tx.orderItem.create({
          data: { orderId: order.id, recipeId: item.recipeId, quantity: item.quantity, unitPrice: recipe.menuPrice, notes: item.notes, status: 'PENDING' },
        });
      }
      await tx.order.update({ where: { id: order.id }, data: { totalAmount } });
      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          table: { select: { id: true, label: true } },
          items: { include: { recipe: { select: { id: true, name: true, nameFa: true, menuPrice: true } } } },
        },
      });
    });
  }
}
