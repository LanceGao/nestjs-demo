import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World-nestjs!';
  }
  getGsw(): string {
    return 'Hello GSW-nestjs!';
  }
}
