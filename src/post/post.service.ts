import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';

@Injectable()
export class PostService {
    constructor(private readonly prisma: PrismaService) {}
    async createPost(dto: CreatePostDto) {
        // 前置校验：作者不存在时返回 404，避免数据库抛 P2003 外键错误
        const author = await this.prisma.user.findUnique({
            where: { id: dto.authorId },
        });
        if (!author) {
            throw new NotFoundException(`作者 id=${dto.authorId} 不存在`);
        }
        const post = await this.prisma.post.create({
            data: {
                title: dto.title,
                content: dto.content,
                published: dto.published,
                author: { connect: { id: dto.authorId } },
            },
        });
        return {
            code: 200,
            message: 'Post created successfully',
            data: post,
        }
    }
    
}
