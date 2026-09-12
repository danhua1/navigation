import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './modules/auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import configuration from './config/configuration'
import { validationSchema } from './config/validation.schema'
import { HealthController } from './health.controller'
import { NavigationModule } from './modules/navigation/navigation.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validationSchema }),
    PrismaModule,
    AuthModule,
    NavigationModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
