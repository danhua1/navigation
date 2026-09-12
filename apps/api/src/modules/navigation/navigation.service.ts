import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

const MAX_DATA_BYTES = 1024 * 1024
const MAX_CATEGORIES = 500
const MAX_SITES_PER_CATEGORY = 5000
const MAX_GROUPS_PER_CATEGORY = 100
const MAX_TEXT_LENGTH = { categoryName: 60, siteName: 120, description: 300, icon: 16 }
const IMAGE_DATA_URL_RE = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/]+={0,2}$/i

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).every(key => keys.includes(key))
}

function isValidSiteIcon(icon: unknown) {
  if (typeof icon !== 'string') return false
  // 普通图标仍按短文本处理；书签导出的安全位图图标受整份导航数据 1MB 上限约束。
  return icon.length <= MAX_TEXT_LENGTH.icon || IMAGE_DATA_URL_RE.test(icon)
}

export function validateNavigationData(data: Record<string, unknown>) {
  const version = data.version
  if (!hasOnlyKeys(data, ['version', 'categories', 'settings']) ||
      typeof version !== 'number' || !Number.isInteger(version) || version < 1 || version > 1) {
    throw new BadRequestException('导航数据版本或字段不合法')
  }
  if (!Array.isArray(data.categories)) {
    throw new BadRequestException('数据格式不正确：缺少 categories 字段')
  }
  if (data.categories.length > MAX_CATEGORIES) {
    throw new BadRequestException(`分类数量不能超过 ${MAX_CATEGORIES}`)
  }

  const categoryIds = new Set<string>()
  const siteIds = new Set<string>()
  for (const category of data.categories) {
    if (!category || typeof category !== 'object' || Array.isArray(category)) {
      throw new BadRequestException('分类数据格式不正确')
    }
    const cat = category as Record<string, unknown>
    if (!hasOnlyKeys(cat, ['id', 'name', 'icon', 'groups', 'sites'])) {
      throw new BadRequestException('分类包含不支持的字段')
    }
    if (typeof cat.id !== 'string' || cat.id.length === 0 || cat.id.length > 64 || categoryIds.has(cat.id)) {
      throw new BadRequestException('分类 ID 不合法或重复')
    }
    categoryIds.add(cat.id)
    if (typeof cat.name !== 'string' || cat.name.length === 0 || cat.name.length > MAX_TEXT_LENGTH.categoryName) {
      throw new BadRequestException('分类名称不合法')
    }
    if (typeof cat.icon !== 'string' || cat.icon.length > MAX_TEXT_LENGTH.icon) {
      throw new BadRequestException('分类图标不合法')
    }
    const groupIds = new Set<string>()
    if (cat.groups !== undefined) {
      if (!Array.isArray(cat.groups) || cat.groups.length === 0 || cat.groups.length > MAX_GROUPS_PER_CATEGORY) {
        throw new BadRequestException('分类分组数据不合法或数量过多')
      }
      for (const group of cat.groups) {
        if (!group || typeof group !== 'object' || Array.isArray(group)) {
          throw new BadRequestException('分组数据格式不正确')
        }
        const item = group as Record<string, unknown>
        if (!hasOnlyKeys(item, ['id', 'name']) || typeof item.id !== 'string' || item.id.length === 0 || item.id.length > 64 || groupIds.has(item.id) ||
            typeof item.name !== 'string' || item.name.length === 0 || item.name.length > 48) {
          throw new BadRequestException('分组字段不合法')
        }
        groupIds.add(item.id)
      }
    }
    if (!Array.isArray(cat.sites) || cat.sites.length > MAX_SITES_PER_CATEGORY) {
      throw new BadRequestException('分类网站数据不合法或数量过多')
    }
    for (const site of cat.sites) {
      if (!site || typeof site !== 'object' || Array.isArray(site)) {
        throw new BadRequestException('网站数据格式不正确')
      }
      const item = site as Record<string, unknown>
      if (!hasOnlyKeys(item, ['id', 'name', 'url', 'description', 'icon', 'groupId'])) {
        throw new BadRequestException('网站包含不支持的字段')
      }
      if (typeof item.id !== 'string' || item.id.length === 0 || item.id.length > 64 || siteIds.has(item.id)) {
        throw new BadRequestException('网站 ID 不合法或重复')
      }
      siteIds.add(item.id)
      if (typeof item.name !== 'string' || item.name.length === 0 || item.name.length > MAX_TEXT_LENGTH.siteName) {
        throw new BadRequestException('网站名称不合法')
      }
      if (typeof item.url !== 'string' || item.url.length > 2048) {
        throw new BadRequestException('网站地址不合法')
      }
      try {
        const url = new URL(item.url)
        if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error()
      } catch {
        throw new BadRequestException('网站地址仅支持有效的 http/https 地址')
      }
      if (typeof item.description !== 'string' || item.description.length > MAX_TEXT_LENGTH.description ||
          !isValidSiteIcon(item.icon)) {
        throw new BadRequestException('网站字段长度不合法')
      }
      if (item.groupId !== undefined && (typeof item.groupId !== 'string' || !groupIds.has(item.groupId))) {
        throw new BadRequestException('网站分组不合法')
      }
    }
  }

  if (!data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) {
    throw new BadRequestException('导航设置不合法')
  }
  const settings = data.settings as Record<string, unknown>
  if (!hasOnlyKeys(settings, ['theme', 'searchEngine']) ||
      !['light', 'dark'].includes(settings.theme as string) ||
      typeof settings.searchEngine !== 'string' || settings.searchEngine.length === 0 || settings.searchEngine.length > 32) {
    throw new BadRequestException('导航设置不合法')
  }
}

@Injectable()
export class NavigationService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { navigationData: true, navigationRevision: true }
    })
    if (!user) throw new UnauthorizedException('用户不存在')
    return { data: user.navigationData ?? null, revision: user.navigationRevision }
  }

  async save(userId: string, data: Record<string, unknown>, revision: number) {
    validateNavigationData(data)

    const serialized = JSON.stringify(data)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_DATA_BYTES) {
      throw new BadRequestException('导航数据过大，最多支持 1MB')
    }

    const updated = await this.prisma.user.updateMany({
      where: { id: userId, navigationRevision: revision },
      data: {
        navigationData: data as Prisma.InputJsonValue,
        navigationRevision: { increment: 1 }
      }
    })
    if (updated.count === 0) {
      const exists = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      if (!exists) throw new UnauthorizedException('用户不存在')
      throw new ConflictException('导航数据已在其他位置更新，请刷新后再试')
    }
    return { saved: true, revision: revision + 1 }
  }
}
