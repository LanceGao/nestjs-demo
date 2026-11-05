import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, ParseIntPipe } from '@nestjs/common';
import { PostService } from './post.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { SearchPostDto } from './dto/search-post.dto.js';



@Controller('post')
export class PostController {
    constructor(private readonly postService: PostService) {}
    @Post('create')
    createPost(@Body() dto: CreatePostDto) {
        return this.postService.createPost(dto);
    }
    @Get('list')
    getPostList() {
        return this.postService.getPostList();
    }
    @Get('get/:id')
    getPostDetail(@Param('id') id: string) {
        return this.postService.getPostDetail(id);
    }
    @Get('find/:authorId')
    getPostByAuthorId(@Param('authorId') authorId: string) {
        return this.postService.getPostByAuthorId(authorId);
    }
    @Put(':id')
    // ParseIntPipe nest的内置管道，将URL参数转换为整数
    updatePost(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto) {
        return this.postService.updatePost(id, dto);
    }
    @Delete(':id')
    deletePost(@Param('id', ParseIntPipe) id: number) {
        return this.postService.deletePost(id);
    }
    @Patch(':id/publish')
    publishPost(@Param('id', ParseIntPipe) id: number) {
        return this.postService.switchPublish(id);
    }
    @Get('search')
    searchPost(@Query() dto: SearchPostDto) {
        return this.postService.searchPost(dto);
    }
}
