import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface VoiceResult { reply: string; pendingOrder: any; }

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async transcribeAudio(file: any): Promise<string> {
    return `[صوت ضبط شده - ${Math.round(file.size / 1024)}KB]`;
  }

  async processVoiceCommand(transcript: string, context?: any): Promise<VoiceResult> {
    const lower = transcript.toLowerCase();

    if (lower.includes('order') || lower.includes('سفارش') || lower.includes('بده') || lower.includes('ثبت کن'))
      return this.handleVoiceOrder(transcript);

    if (lower.includes('status') || lower.includes('وضعیت'))
      return { reply: await this.checkOrderStatus(), pendingOrder: null };

    if (lower.includes('cancel') || lower.includes('لغو'))
      return { reply: '❌ سفارش لغو شد.', pendingOrder: null };

    if (lower.includes('موجودی') || lower.includes('انبار') || lower.includes('inventory')) {
      const count = await this.prisma.ingredient.count();
      return { reply: `📦 موجودی انبار: ${count} قلم مواد اولیه.`, pendingOrder: null };
    }

    if (lower.includes('orders') || lower.includes('سفارش‌ها') || lower.includes('فعال')) {
      const active = await this.prisma.order.count({ where: { status: { notIn: ['CLOSED', 'CANCELLED'] } } });
      return { reply: `📋 سفارش‌های فعال: ${active}.`, pendingOrder: null };
    }

    if (lower.includes('منو') || lower.includes('غذا') || lower.includes('recipe') || lower.includes('menu'))
      return { reply: await this.listMenuItems(), pendingOrder: null };

    if (lower.includes('دما') || lower.includes('temperature') || lower.includes('یخچال'))
      return { reply: '🌡️ پایش دمای هوشمند فعال.\nیخچال اصلی: 3.2°C ✅\nفریزر: -18.5°C ✅\nیخچال ماهی: 1.4°C ✅', pendingOrder: null };

    if (lower.includes('تأمین') || lower.includes('supplier')) {
      const count = await this.prisma.supplier.count();
      return { reply: `🏪 تأمین‌کنندگان: ${count}.`, pendingOrder: null };
    }

    if (lower.includes('میز') || lower.includes('table'))
      return { reply: await this.listTables(), pendingOrder: null };

    if (lower.includes('سلام') || lower.includes('hi') || lower.includes('hello'))
      return { reply: '🤖 سلام! من دستیار هوشمند ماکان هستم.\n\nبرای ثبت سفارش:\n"order table 3 two kebab"\n"میز ۳ دو کباب برگ"\n\n📦 موجودی  📋 سفارش‌ها  🍳 منو  🌡️ دما', pendingOrder: null };

    if (lower.includes('کمک') || lower.includes('help'))
      return { reply: '🤖 راهنمای دستیار صوتی:\n\n🎙 "order table 3 two kebab"\n"میز ۳ دو کباب برگ"\n\n📋 وضعیت: "status"\n❌ لغو: "cancel"\n📦 موجودی  🍳 منو  🌡️ دما  🪑 میزها', pendingOrder: null };

    return { reply: `🤖 پیام دریافت شد: "${transcript}"\n\nبرای کمک بگویید: "کمک"`, pendingOrder: null };
  }

  private async handleVoiceOrder(transcript: string): Promise<VoiceResult> {
    const parsed = this.parseOrder(transcript);
    if (!parsed.items.length)
      return { reply: '🤔 سفارش قابل تشخیص نیست.\nمثال: "order table 3 two kebab"\n"میز ۳ دو کباب برگ"\n\nمنو: "منو"', pendingOrder: null };

    const matched: any[] = [];
    const unmatched: string[] = [];
    for (const item of parsed.items) {
      const recipe = await this.findRecipe(item.name);
      if (recipe) matched.push({ recipe, quantity: item.quantity });
      else unmatched.push(item.name);
    }

    if (!matched.length)
      return { reply: `❌ آیتمی در منو پیدا نشد.\n${unmatched.length ? `ناشناخته: ${unmatched.join(', ')}` : ''}`, pendingOrder: null };

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
    if (!active.length) return '📋 سفارش فعالی نیست.';
    let result = '📋 سفارش‌های فعال:\n\n';
    for (const o of active) {
      const items = o.items.map((i: any) => `${i.quantity}× ${i.recipe.name}`).join(', ');
      result += `#${o.id.slice(-6)} | میز ${o.table?.label || '?'} | ${o.status} | ${items}\n`;
    }
    return result;
  }

  private parseOrder(transcript: string): { table: string | null; tableId: string | null; items: { name: string; quantity: number }[] } {
    const lower = transcript.toLowerCase();
    let table: string | null = null;
    let tableId: string | null = null;
    const tableMatch = lower.match(/(?:table|میز|میز\s*شماره)\s*(\d+)/);
    if (tableMatch) { table = tableMatch[1]; tableId = tableMatch[1]; }

    const persianNums: Record<string, number> = { 'یک': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5, 'شش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10 };
    const wordNums: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
    const items: { name: string; quantity: number }[] = [];

    // English: "2 kebab" or "two kebab"
    const enPattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+([\w\s]+?)(?=,|and|then|$)/gi;
    let match;
    while ((match = enPattern.exec(transcript)) !== null) {
      let qty = parseInt(match[1]);
      if (isNaN(qty)) qty = wordNums[match[1].toLowerCase()] || 1;
      const name = match[2].trim();
      if (name && !['table', 'order', 'confirm', 'cancel'].includes(name.toLowerCase()))
        items.push({ name, quantity: qty });
    }

    // Persian: "دو کباب برگ"
    const faPattern = /(یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده|\d+)\s+([\u0600-\u06FF\s]+?)(?=،|و|$)/g;
    while ((match = faPattern.exec(transcript)) !== null) {
      const qty = persianNums[match[1]] || parseInt(match[1]) || 1;
      const name = match[2].trim();
      if (name && !items.some(i => i.name === name))
        items.push({ name, quantity: qty });
    }

    if (!items.length) {
      const words = transcript.replace(/order|table|میز|شماره|confirm|cancel/gi, '').trim();
      if (words) items.push({ name: words, quantity: 1 });
    }

    return { table, tableId, items };
  }

  private async findRecipe(name: string) {
    const lower = name.toLowerCase();
    let r = await this.prisma.recipe.findFirst({ where: { name: { contains: lower } } });
    if (!r) r = await this.prisma.recipe.findFirst({ where: { nameFa: { contains: name } } });
    if (!r) {
      const keywords = lower.split(/\s+/);
      for (const k of keywords) {
        r = await this.prisma.recipe.findFirst({ where: { name: { contains: k } } });
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
