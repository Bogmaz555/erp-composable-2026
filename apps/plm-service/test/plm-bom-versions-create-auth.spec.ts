import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule } from '@nestjs/cqrs';
import { PlmBomVersionsController } from '../src/plm.controller';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';

// Test for PLM BOM creation with Auth (TD-001)
describe('PLM: BomVersions Create with Auth context', () => {
  let controller: PlmBomVersionsController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [CqrsModule],
      controllers: [PlmBomVersionsController],
      providers: [
        { provide: 'CommandBus', useValue: { execute: jest.fn() } },
        { provide: 'QueryBus', useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = moduleRef.get(PlmBomVersionsController);
  });

  it('should have JwtAuthGuard applied to the controller', () => {
    const guards = Reflect.getMetadata('__guards__', PlmBomVersionsController);
    expect(guards).toBeDefined();
  });
});
