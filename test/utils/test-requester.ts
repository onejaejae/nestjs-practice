import { INestApplication } from '@nestjs/common';
import { IApiResponse } from 'src/core/interceptor/apiResponse.interceptor';
import request from 'supertest';

class SupertestWrapper<T> {
  constructor(private readonly test: request.Test) {}

  send(data: any): this {
    this.test.send(data);
    return this;
  }

  async expect(status: number): Promise<IApiResponse<T>> {
    const res = await this.test.expect(status);
    return res.body;
  }
}

export class TestRequester {
  private readonly req;

  constructor(
    private readonly app: INestApplication,
    private readonly accessToken?: string,
  ) {
    this.req = request(this.app.getHttpServer());
  }

  private setAuth(r: request.Test) {
    if (this.accessToken) {
      return r.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return r;
  }

  get<T>(url: string) {
    return new SupertestWrapper<T>(this.setAuth(this.req.get(url)));
  }

  post<T>(url: string) {
    return new SupertestWrapper<T>(this.setAuth(this.req.post(url)));
  }

  patch<T>(url: string) {
    return new SupertestWrapper<T>(this.setAuth(this.req.patch(url)));
  }

  delete<T>(url: string) {
    return new SupertestWrapper<T>(this.setAuth(this.req.delete(url)));
  }
}
