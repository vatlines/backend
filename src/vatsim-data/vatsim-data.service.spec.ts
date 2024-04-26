import { Test, TestingModule } from '@nestjs/testing';
import { VatsimDataService } from './vatsim-data.service';

describe('VatsimDataService', () => {
  let service: VatsimDataService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VatsimDataService],
    }).compile();

    service = module.get<VatsimDataService>(VatsimDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
