import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length, Matches } from 'class-validator'

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string

  @ApiProperty({ example: 'navigation_user' })
  @IsString()
  @Length(3, 64)
  @Matches(/^[a-zA-Z0-9_\-]+$/)
  username!: string

  @ApiProperty({ example: 'At-least-8-password' })
  @IsString()
  @Length(8, 128)
  password!: string
}
