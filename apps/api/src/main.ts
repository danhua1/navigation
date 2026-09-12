import 'reflect-metadata'
import { ValidationPipe, VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import compression = require('compression')
const helmet = require('helmet')
import { json } from 'express'
import { AppModule } from './app.module'
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false })
  const config = app.get(ConfigService)
  app.use(helmet())
  app.use(compression())
  // 导航数据服务端上限为 1MB，额外留出 JSON 包装和请求头空间。
  app.use(json({ limit: '1.1mb' }))
  app.use((request: { headers: Record<string, string | string[] | undefined>; requestId?: string }, response: { setHeader: (name: string, value: string) => void }, next: () => void) => {
    const incoming = request.headers['x-request-id']
    const requestId = Array.isArray(incoming) ? incoming[0] : incoming
    request.requestId = requestId || crypto.randomUUID()
    response.setHeader('x-request-id', request.requestId)
    next()
  })
  app.enableCors({ origin: config.get<string>('webOrigin') })
  app.setGlobalPrefix('api')
  app.enableVersioning({ type: VersioningType.URI })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor())

  const swagger = new DocumentBuilder().setTitle('Navigation API').setVersion('1').addBearerAuth().build()
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger))
  await app.listen(config.get<number>('port', 3001))
}

bootstrap()
