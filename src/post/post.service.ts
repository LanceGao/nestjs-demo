import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { SearchPostDto } from './dto/search-post.dto.js';

@Injectable()
export class PostService {
    constructor(private readonly prismaService: PrismaService) {}
    // 创建文章
    async createPost(dto: CreatePostDto) {
        // 前置校验：作者不存在时返回 404，避免数据库抛 P2003 外键错误
        const author = await this.prismaService.user.findUnique({
            where: { id: dto.authorId },
        });
        if (!author) {
            throw new NotFoundException(`作者 id=${dto.authorId} 不存在`);
        }
        const post = await this.prismaService.post.create({
            data: {
                title: dto.title,
                content: dto.content,
                published: dto.published,
                author: { connect: { id: dto.authorId } },
            },
            include: {
                author: true, // 包含作者信息
            },
        });
        return {
            code: 200,
            message: 'Post created successfully',
            data: post,
        }
    }
    // 获取文章列表
    async getPostList() {
        return await this.prismaService.post.findMany({
            include: {
                author: true, // 包含作者信息
            },
        }).then((posts) => {
            return {
                code: 0,
                message: 'Post list successfully',
                data: posts,
            }
        }).catch(() => {
            return {
                code: 1,
                message: 'Post list failed',
                data: null,
            }
        })
    }
    async getPostDetail(id: string) {
        const post = await this.prismaService.post.findUnique({
            where: { id: parseInt(id) },
        });
        if (!post) {
            throw new NotFoundException(`文章 id=${id} 不存在`);
        }
        return {
            code: 0,
            message: 'Post detail successfully',
            data: post,
        }
    }
    async getPostByAuthorId(authorId: string) {
        const posts = await this.prismaService.post.findMany({
            where: { authorId: parseInt(authorId) },
            include: {
                author: true, // 包含作者信息
            },
        });
        return {
            code: 0,
            message: 'Post list successfully',
            data: {
                total: posts.length,
                posts,
            },
        }
    }
    async updatePost(id: number, updatePost: UpdatePostDto) {
        // 前置校验：文章不存在时返回 404，避免数据库抛 P2003 外键错误
        const post = await this.prismaService.post.findUnique({
            where: { id },
        })
        if (!post) {
            throw new NotFoundException(`文章 id=${id} 不存在`);
        }
        return this.prismaService.post.update({
            where: { id },
            data: updatePost, // 更新数据
            include: {
                author: true, // 包含作者信息
            },
        }).then((post) => {
            return {
                code: 0,
                message: 'Post updated successfully',
                data: post,
            }
        })
    }
    async deletePost(id: number) {
        // 前置校验：文章不存在时返回 404，避免数据库抛 P2003 外键错误
        const post = await this.prismaService.post.findUnique({
            where: { id },
        })
        if (!post) {
            throw new NotFoundException(`文章 id=${id} 不存在`);
        }
        return this.prismaService.post.delete({
            where: { id },
        }).then(() => {
            return {
                code: 0,
                message: 'Post deleted successfully',
                data: null,
            }
        })
    }
    async switchPublish(id: number) {
        // 前置校验：文章不存在时返回 404，避免数据库抛 P2003 外键错误
        const post = await this.prismaService.post.findUnique({
            where: { id },
        })
        if (!post) {
            return {
                code: 1,
                message: `文章 id=${id} 不存在`,
                success: false,
                data: null,
            }
        }
        const update = await this.prismaService.post.update({
            where: { id },
            data: { published: !post.published },
        })
        return {
            code: 0,
            message: 'Post published successfully',
            data: update,
        }
    }
    async searchPost(query: SearchPostDto) {
        const { pageNo = 1, pageSize = 10 } = query;
        const skip = (Number(pageNo) - 1) * Number(pageSize);
        const take = Number(pageSize);
        console.log('where:', query, skip, take)
        const where: any = {};
        if (query.title) {
            where.title = query.title;
        }
        if (query.content) {
            where.content = query.content;
        }
        if (query.authorId) {
            where.authorId = parseInt(query.authorId);
        }
        if (query.published !== undefined) {
            // query 参数是字符串，"false" 也是 truthy，不能用 Boolean() 直接转
            where.published = String(query.published) === 'true';
        }
        const [total, posts] = await this.prismaService.$transaction([
            this.prismaService.post.count({ where }),
            this.prismaService.post.findMany({
                where,
                skip,
                take,
                include: {
                    author: true, // 包含作者信息
                },
            })
        ])
        const totalPages = Math.ceil(total / take)
        const pagenotion = {
            total,
            pageSize: take,
            pageNo,
            totalPages,
        }
        return {
            code: 0,
            message: 'Post list successfully',
            data: {
                pagenotion,
                posts,
            },
        }
    }
}
