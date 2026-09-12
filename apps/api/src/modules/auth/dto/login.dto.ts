import { ApiProperty } from '@nestjs/swagger'
import { IsString, Length } from 'class-validator'

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @Length(3, 191)
  email!: string

  @ApiProperty({ example: 'At-least-8-password' })
  @IsString()
  @Length(8, 128)
  password!: string
}
