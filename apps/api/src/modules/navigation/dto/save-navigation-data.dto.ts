import { IsInt, IsObject, Min } from 'class-validator'

export class SaveNavigationDataDto {
  @IsObject()
  data!: Record<string, unknown>

  @IsInt()
  @Min(0)
  revision!: number
}
