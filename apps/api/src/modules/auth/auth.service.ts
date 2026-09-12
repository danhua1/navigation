import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService
  ) {}

  private publicUser(user: { id: string; email: string; username: string; createdAt: Date }) {
    return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt }
  }

  private tokenFor(user: { id: string; email: string; username: string }) {
    return this.jwt.sign({ sub: user.id, email: user.email, username: user.username })
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase()
    const username = dto.username.trim()
    const exists = await this.prisma.user.findFirst({ where: { OR: [{ email }, { username }] } })
    if (exists) throw new ConflictException('邮箱或用户名已注册')

    const passwordHash = await bcrypt.hash(dto.password, 12)
    let user
    try {
      user = await this.prisma.user.create({
        data: { email, username, passwordHash }
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('邮箱或用户名已注册')
      }
      throw error
    }
    return { accessToken: this.tokenFor(user), user: this.publicUser(user) }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } })
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('邮箱或密码错误')
    }
    return { accessToken: this.tokenFor(user), user: this.publicUser(user) }
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException('用户不存在')
    return this.publicUser(user)
  }
}
