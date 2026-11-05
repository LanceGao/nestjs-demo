export class SearchPostDto {
    pageNo?: number;
    pageSize?: number;
    title?: string;
    content?: string;
    authorId?: string;
    published?: boolean;
}