import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common'

type RateLimitEntry = { count: number; resetAt: number }

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly windowMs = 60_000
  private readonly maxAttempts = 10
  private readonly entries = new Map<string, RateLimitEntry>()

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    const key = request.ip || request.socket?.remoteAddress || 'unknown'
    const now = Date.now()
    const current = this.entries.get(key)
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + this.windowMs }
      : current

    entry.count += 1
    this.entries.set(key, entry)

    // 防止长期运行的单进程服务保留过多过期 IP 记录。
    if (this.entries.size > 10_000) {
      for (const [ip, value] of this.entries) {
        if (value.resetAt <= now) this.entries.delete(ip)
      }
    }

    if (entry.count > this.maxAttempts) {
      const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      context.switchToHttp().getResponse().setHeader('Retry-After', retryAfter)
      throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS)
    }

    return true
  }
}
