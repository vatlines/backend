import { VatsimAuthGuard } from './vatsim-auth.guard';

describe('VatsimAuthGuard', () => {
  it('should be defined', () => {
    expect(new VatsimAuthGuard()).toBeDefined();
  });
});
