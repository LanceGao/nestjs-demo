import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js'
import { UserDto } from './dto/create-user.dto.js'
import { UpdateUserDto } from './dto/update-user.dto.js'
import { QueryUserDto } from './dto/query-user.dto.js'

@Injectable()
export class UserService {
    constructor(private readonly prismaService: PrismaService) {}
    async createUser(dto: UserDto) {
        const user = await this.prismaService.user.create({
            data: {
                name: dto.name,
                email: dto.email,
                password: dto.password,
                role: dto.role,
            }
        })
        return {
            code: 0,
            msg: `用户${dto.name}创建成功`,
            success: true,
            data: user
        }
    }
    async getUserById(id: string) {
        const user = await this.prismaService.user.findUnique({
            where: {
                id: parseInt(id),
            },
            // 选择查询的字段，因为默认查询所有字段，默认字段中包含password敏感字段，所以要手动选择查询的字段
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                // 关联查询用户发布的文章，选择查询文章的id、title、content、createdAt、updatedAt字段
                posts: {
                    select: {
                        id: true,
                        title: true,
                        content: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    // 按创建时间降序排序， desc-降序，asc-升序
                    orderBy: {
                        createdAt: 'desc',
                    }
                }
            }
        })
        if (!user) {
            return {
                code: 1,
                msg: `用户${id}不存在`,
                success: false,
                data: null,
            }
        }
        return {
            code: 0,
            msg: `用户${id}查询成功`,
            success: true,
            data: user
        }
    }
    async getUserList(pageNo: number, pageSize: number) {
        const users = await this.prismaService.user.findMany({
            skip: (Number(pageNo) - 1) * Number(pageSize),
            take: Number(pageSize),
            orderBy: { // 按创建时间降序排序， desc-降序，asc-升序
                createdAt: 'desc',
            },
            // 指定查询的字段
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                // 关联查询用户发布的文章，选择查询文章的id、title、content、createdAt、updatedAt字段
                posts: {
                    select: {
                        id: true,
                        title: true,
                        content: true,
                        createdAt: true,
                        updatedAt: true,
                    }
                }
            }
        })
        return {
            code: 0,
            msg: 'success',
            success: true,
            data: {
                users,
                total: await this.prismaService.user.count(),
                pageNo,
                pageSize,
                totalPage: Math.ceil(await this.prismaService.user.count() / Number(pageSize)),
            }
        }
    }
    async deleteUser(id: string) {
        // const user = await this.prismaService.user.findUnique({
        //     where: {id: parseInt(id)},
        // })
        // if (!user) {
        //     return {
        //         code: 1,
        //         msg: `用户${id}不存在`,
        //         success: false,
        //         data: null,
        //     }
        // }
        // await this.prismaService.user.delete({
        //     where: {
        //         id: parseInt(id),
        //     },
        // })
        // return {
        //     code: 0,
        //     msg: `用户${id}删除成功`,
        //     success: true,
        //     data: null,
        // }
        return this.prismaService.user.delete({
            where: {id: parseInt(id)}
        }).then(() => {
            return {
                code: 0,
                msg: `用户${id}删除成功`,
                success: true,
                data: null,
            }
        }).catch((err) => {
            return {
                code: 1,
                msg: `用户${id}不存在`,
                success: false,
                data: null,
            }
        })
    }
    updateUser(id: string, user: UpdateUserDto) {
        return this.prismaService.user.update({
            where: {id: parseInt(id)},
            data: user,
        }).then((res) => {
            return {
                code: 0,
                msg: `用户${id}更新成功`,
                success: true,
                data: res,
            }
        }).catch(() => {
            return {
                code: 1,
                msg: `用户${id}不存在`,
                success: false,
                data: null,
            }
        })
    }
    async searchUsers(dto: QueryUserDto) {
        const {pageNo = 1, pageSize = 10} = dto
        // 分页偏移量 即从第几条索引开始查询
        // 第1页： skip = (1-1) * 10 = 0
        // 第2页： skip = (2-1) * 10 = 10
        // 第3页： skip = (3-1) * 10 = 20
        const skip = (Number(pageNo || 1) - 1) * Number(pageSize || 10)
        const take = Number(pageSize || 10)
        // 第一种写法
        // return this.prismaService.user.findMany({
        //     where: {
        //         // name: dto.name || undefined,
        //         // 加一些控制条件：模糊查询，不区分大小写
        //         name: dto.name ? {
        //             contains: dto.name, // 包含用户名(模糊查询)
        //             mode: 'insensitive', // 不区分大小写
        //         } : undefined,
        //         email: dto.email || undefined,
        //         role: dto.role || undefined,
        //     },
        //     skip,
        //     take,
        //     select: {
        //         id: true,
        //         name: true,
        //         email: true,
        //         role: true,
        //         createdAt: true,
        //         updatedAt: true,
        //     },
        //     orderBy: { // 按创建时间降序排序， desc-降序，asc-升序
        //         createdAt: 'desc',
        //     },
        // }).then((users) => {
        //     return {
        //         code: 0,
        //         msg: `用户查询成功`,
        //         success: true,
        //         data: users,
        //     }
        // }).catch(() => {
        //     return {
        //         code: 1,
        //         msg: `用户查询失败`,
        //         success: false,
        //         data: null,
        //     }
        // })
        // 第二种写法
        const where: any = {}
        if (dto.name) {
            where.name = {
                contains: dto.name, // 包含用户名(模糊查询)
                mode: 'insensitive', // 不区分大小写
            }
        }
        if (dto.email) {
            where.email = dto.email
        }
        if (dto.role) {
            where.role = dto.role
        }
        // $transaction 事务操作，确保查询和更新操作同时进行
        const [total, users] = await this.prismaService.$transaction([
            this.prismaService.user.count({where}), // 查询总条数
            this.prismaService.user.findMany({
                where,
                skip,
                take,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    createdAt: true,
                    updatedAt: true,
                },
                orderBy: { // 按创建时间降序排序， desc-降序，asc-升序
                    createdAt: 'desc',
                },
            })
        ])
        // 计算总页数 向上取整
        const totalPage = Math.ceil(total / take)
        const pagenation = {
            pageNo,
            pageSize: take,
            totalPage,
            total,
        }
        return {
            code: 0,
            msg: `用户查询成功`,
            success: true,
            data: {
                pagenation,
                userList: users,
            }
        }
    }
}
