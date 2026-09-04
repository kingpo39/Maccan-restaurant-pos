import { Controller, Post, Body, UseGuards, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';

// Shared pending orders store (singleton across requests)
const pendingOrders = new Map<string, any>();

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('voice')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('audio'))
  async handleVoice(@UploadedFile() file: any, @Body() body: any) {
    // Accept text (from SpeechRecognition) or audio blob (fallback)
    const transcript = body?.text || (file ? `[صوت ضبط شده - ${Math.round(file.size / 1024)}KB]` : null);

    if (!transcript) {
      throw new BadRequestException('No text or audio provided');
    }

    const context = {
      userId: body.userId,
      organizationId: body.organizationId,
      locationId: body.locationId,
    };

    const sessionKey = body.sessionKey || body.userId || 'default';
    const lower = transcript.toLowerCase().trim();

    // ─── CONFIRM ───
    if (lower === 'confirm' || lower === 'تأیید' || lower === 'تایید') {
      const pending = pendingOrders.get(sessionKey);
      if (pending) {
        const reply = await this.aiService.createOrderFromDraft(pending);
        pendingOrders.delete(sessionKey);
        return { transcript, reply, timestamp: new Date().toISOString(), type: 'confirmation' };
      }
      return {
        transcript,
        reply: '❌ سفارشی برای تأیید وجود ندارد.\n\nاول سفارش بدید: "order table 3 two kebab"',
        timestamp: new Date().toISOString(),
        type: 'error',
      };
    }

    // ─── CANCEL ───
    if (lower === 'cancel' || lower === 'لغو') {
      if (pendingOrders.has(sessionKey)) {
        pendingOrders.delete(sessionKey);
        return { transcript, reply: '❌ سفارش لغو شد.', timestamp: new Date().toISOString(), type: 'cancel' };
      }
      return { transcript, reply: 'ℹ️ سفارش فعالی برای لغو وجود ندارد.', timestamp: new Date().toISOString(), type: 'response' };
    }

    // ─── PROCESS COMMAND ───
    const { reply, pendingOrder } = await this.aiService.processVoiceCommand(transcript, context);

    if (pendingOrder) {
      pendingOrders.set(sessionKey, { ...pendingOrder, userId: context.userId, organizationId: context.organizationId, locationId: context.locationId });
    }

    return { transcript, reply, timestamp: new Date().toISOString(), type: pendingOrder ? 'pending_confirmation' : 'response' };
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(@Body() body: { message: string; userId?: string; organizationId?: string; locationId?: string }) {
    if (!body?.message) throw new BadRequestException('No message provided');

    const context = { userId: body.userId, organizationId: body.organizationId, locationId: body.locationId };
    const sessionKey = body.userId || 'default';
    const lower = body.message.toLowerCase().trim();

    // ─── CONFIRM ───
    if (lower === 'confirm' || lower === 'تأیید' || lower === 'تایید') {
      const pending = pendingOrders.get(sessionKey);
      if (pending) {
        const reply = await this.aiService.createOrderFromDraft(pending);
        pendingOrders.delete(sessionKey);
        return { reply, timestamp: new Date().toISOString(), type: 'confirmation' };
      }
      return { reply: '❌ سفارشی برای تأیید وجود ندارد.', timestamp: new Date().toISOString(), type: 'error' };
    }

    // ─── CANCEL ───
    if (lower === 'cancel' || lower === 'لغو') {
      if (pendingOrders.has(sessionKey)) {
        pendingOrders.delete(sessionKey);
        return { reply: '❌ سفارش لغو شد.', timestamp: new Date().toISOString(), type: 'cancel' };
      }
      return { reply: 'ℹ️ سفارش فعالی برای لغو وجود ندارد.', timestamp: new Date().toISOString(), type: 'response' };
    }

    // ─── PROCESS ───
    const { reply, pendingOrder } = await this.aiService.processVoiceCommand(body.message, context);

    if (pendingOrder) {
      pendingOrders.set(sessionKey, { ...pendingOrder, userId: context.userId, organizationId: context.organizationId, locationId: context.locationId });
    }

    return { reply, timestamp: new Date().toISOString(), type: pendingOrder ? 'pending_confirmation' : 'response' };
  }
}
