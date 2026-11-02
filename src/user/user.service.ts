import { Injectable } from '@nestjs/common';
import { UserDto } from './dto/create-user.dto.js'

@Injectable()
export class UserService {
    private users: Array<UserDto> = [
        {
            id: '1',
            name: 'lancegao',
            age: 25,
            email: 'lancegao@example.com',
        },
        {
            id: '2',
            name: 'lancegao2',
            age: 29,
            email: 'lancegao2@example.com',
        },
    ]
    getUser() {
        return {
            code: 0,
            msg: 'success',
            success: true,
            data: {
                name: 'lancegao',
                age: 25,
                email: 'lancegao@example.com',
            }
        }
    }
    createUser(dto: UserDto) {
        return {
            code: 0,
            msg: `用户${dto.name}创建成功`,
            success: true,
            data: {
                name: dto.name,
                age: dto.age,
                email: dto.email ?? '',
            }
        }
    }
    getUserById(id: string) {
        return {
            code: 0,
            msg: 'success',
            success: true,
            data: {
                id,
                name: 'lancegao',
                age: 25,
                email: 'lancegao@example.com',
            }
        }
    }
    getUserList(pageNo: number, pageSize: number) {
        return {
            code: 0,
            msg: 'success',
            success: true,
            data: [
                {
                    id: '1',
                    name: 'lancegao',
                    age: 25,
                    email: 'lancegao@example.com',
                },
                {
                    id: '2',
                    name: 'lancegao2',
                    age: 29,
                    email: 'lancegao2@example.com',
                }
                
            ]
        }
    }
    updateUser(id: string, user: UserDto) {
        const index = this.users.findIndex(item => item.id === id)
        if (index === -1) {
            return {
                code: 1,
                msg: `用户${id}不存在`,
                success: false,
                data: null,
            }
        }
        this.users[index] = user
        return {
            code: 0,
            msg: `用户${id}更新成功`,
            success: true,
            data: {
                ...user,
                id,
            },
        }
    }
    deleteUser(id: string) {
        const index = this.users.findIndex(item => item.id === id)
        if (index === -1) {
            return {
                code: 1,
                msg: `用户${id}不存在`,
                success: false,
                data: null,
            }
        }
        this.users.splice(index, 1)
        return {
            code: 0,
            msg: `用户${id}删除成功`,
            success: true,
            data: null,
        }
    }
}
