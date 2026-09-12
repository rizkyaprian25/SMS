import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pageMeta, pageParams } from '../common/pagination';
import { QueryAuditLogDto } from './dto/audit-log.dto';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryAuditLogDto) {
    const { page, limit, skip } = pageParams({
      page: String(query.page ?? 1),
      limit: String(query.limit ?? 30),
    });

    const where: Record<string, unknown> = {};
    if (query.aksi) {
      where.aksi = query.aksi;
    }
    if (query.entitas) {
      where.entitas = query.entitas;
    }
    if (query.q) {
      where.OR = [
        { aksi: { contains: query.q, mode: 'insensitive' } },
        { entitas: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { kapan: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: rows, meta: pageMeta(total, page, limit) };
  }
}
