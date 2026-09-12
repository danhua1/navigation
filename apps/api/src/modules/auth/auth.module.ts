import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { AuthRateLimitGuard } from '../../common/guards/auth-rate-limit.guard'

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
        signOptions: { expiresIn: config.get<string>('jwt.expiresIn', '15m') }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AuthRateLimitGuard],
  exports: [JwtAuthGuard, JwtModule]
})
export class AuthModule {}
