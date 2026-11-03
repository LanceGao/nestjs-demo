import { Controller, Get, Post, Put, Delete, Body,Param, Query } from '@nestjs/common';
import { UserDto } from './dto/create-user.dto.js'
import { UserService } from './user.service.js'

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}
    // @Get('getUser')
    // getUser() {
    //     return this.userService.getUser()
    // }
    @Post('add')
    createUser(@Body() dto: UserDto) {
        return this.userService.createUser(dto);
    }
    // 如果写成 @Get(':id')会和 下面的接口 冲突，所以要写成 user/:id
    // 原因就是 Express 按声明顺序匹配；`:id` 在前会吞掉后面的list 。
    // @Get('user/:id')
    // getUserById(@Param('id') id: string) {
    //     return this.userService.getUserById(id)
    // }
    // @Get('list')
    // getUserList(@Query('pageNo') pageNo: number, @Query('pageSize') pageSize: number) {
    //     return this.userService.getUserList(pageNo, pageSize)
    // }
    // @Put('update/:id')
    // updateUser(@Param('id') id: string, @Body() user: UserDto) {
    //     return this.userService.updateUser(id, user)
    // }
    // @Delete('delete/:id')
    // deleteUser(@Param('id') id: string) {
    //     return this.userService.deleteUser(id)
    // }
}
