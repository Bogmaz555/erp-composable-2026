import { Test, TestingModule } from '@nestjs/testing';
import { ApprovalsServiceController } from './approvals-service.controller';
import { ApprovalsServiceService } from './approvals-service.service';

describe('ApprovalsServiceController', () => {
  let approvalsServiceController: ApprovalsServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ApprovalsServiceController],
      providers: [ApprovalsServiceService],
    }).compile();

    approvalsServiceController = app.get<ApprovalsServiceController>(ApprovalsServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(approvalsServiceController.getHello()).toBe('Hello World!');
    });
  });
});
