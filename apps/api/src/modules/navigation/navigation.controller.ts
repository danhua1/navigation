import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { SaveNavigationDataDto } from './dto/save-navigation-data.dto'
import { NavigationService } from './navigation.service'

@ApiTags('navigation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'navigation', version: '1' })
export class NavigationController {
  constructor(private readonly navigation: NavigationService) {}

  @Get()
  get(@CurrentUser() user: { sub: string }) {
    return this.navigation.get(user.sub)
  }

  @Put()
  save(@CurrentUser() user: { sub: string }, @Body() dto: SaveNavigationDataDto) {
    return this.navigation.save(user.sub, dto.data, dto.revision)
  }
}
