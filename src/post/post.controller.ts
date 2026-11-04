import { Controller, Post, Body } from '@nestjs/common';
import { PostService } from './post.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';



@Controller('post')
export class PostController {
    constructor(private readonly postService: PostService) {}
    @Post('create')
    createPost(@Body() dto: CreatePostDto) {
        return this.postService.createPost(dto);
    }
}
