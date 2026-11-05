import { Controller, Get, Post, Put, Delete, Body,Param, Query } from '@nestjs/common';
import { UserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserService } from './user.service.js';
import { QueryUserDto } from './dto/query-user.dto.js';

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}
    @Post('add')
    createUser(@Body() dto: UserDto) {
        return this.userService.createUser(dto);
    }
    @Get('list')
    getUserList(@Query('pageNo') pageNo: number, @Query('pageSize') pageSize: number) {
        return this.userService.getUserList(pageNo, pageSize)
    }
    // 如果写成 @Get(':id')会和 下面的接口 冲突，所以要写成 user/:id
    // 原因就是 Express 按声明顺序匹配；`:id` 在前会吞掉后面的list 。
    @Get('user/:id')
    getUserById(@Param('id') id: string) {
        return this.userService.getUserById(id)
    }
    @Delete('delete/:id')
    deleteUser(@Param('id') id: string) {
        return this.userService.deleteUser(id)
    }
    @Put(':id')
    updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
        return this.userService.updateUser(id, dto)
    }
    @Get('search')
    searchUser(@Query() dto: QueryUserDto) {
        return this.userService.searchUsers(dto)
    }
}
