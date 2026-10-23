import { getBreakpoint } from '../useBreakpoint';

describe('getBreakpoint', () => {
  it('uses the compact breakpoint below 600 pixels', () => {
    expect(getBreakpoint(599)).toBe('compact');
    expect(getBreakpoint(600)).toBe('medium');
  });

  it('uses the expanded breakpoint from 1024 pixels', () => {
    expect(getBreakpoint(1023)).toBe('medium');
    expect(getBreakpoint(1024)).toBe('expanded');
  });
});
