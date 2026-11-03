// DTO 就是一个普通的 TypeScript 类
// 用来描述 POST 请求体里有哪些字段、每个字段是什么类型
export class UserDto {
    name: string;
    email: string;
    password: string;
    role: string;
}
