import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SplitSelector } from '@/client/components/SplitSelector';
import type { Roll } from '@/shared/types';

vi.mock('@/server/services/GameService', () => ({
  gameService: {
    selectSplit: vi.fn(async () => ({
      turn: { activePlayerId: 'p1', hasRolled: true, climbers: {}, activeColumns: [] },
      advancedColumns: [7],
      climbersAtSummit: [],
      busted: false,
    })),
    rollDice: vi.fn(),
    stop: vi.fn(),
    createGame: vi.fn(),
    restoreGame: vi.fn(),
    clearFinishedGames: vi.fn(),
  },
}));

function makeRoll(overrides: Partial<Roll> = {}): Roll {
  return {
    dice: [3, 4, 5, 6],
    splits: [
      { index: 0, sumA: 7, sumB: 11, usability: 'fully-usable', diceIndices: [[0,1],[2,3]] },
      { index: 1, sumA: 9, sumB: 9, usability: 'partially-usable', diceIndices: [[0,2],[1,3]] },
      { index: 2, sumA: 8, sumB: 10, usability: 'unusable', diceIndices: [[0,3],[1,2]] },
    ],
    allUnusable: false,
    ...overrides,
  };
}

describe('SplitSelector — FR-023 always shows all 3 splits', () => {
  it('renders all 3 split buttons', () => {
    render(<SplitSelector roll={makeRoll()} />);
    const group = screen.getByRole('group', { name: 'Split options' });
    const buttons = group.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('disabled split has aria-disabled=true', () => {
    render(<SplitSelector roll={makeRoll()} />);
    const disabled = screen.getByLabelText(/Split 3.*unusable/i);
    expect(disabled).toBeDisabled();
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
  });

  it('fully-usable split is enabled', () => {
    render(<SplitSelector roll={makeRoll()} />);
    const enabled = screen.getByLabelText(/Split 1.*fully-usable/i);
    expect(enabled).not.toBeDisabled();
  });

  it('partially-usable split is enabled', () => {
    render(<SplitSelector roll={makeRoll()} />);
    const partial = screen.getByLabelText(/Split 2.*partially-usable/i);
    expect(partial).not.toBeDisabled();
  });
});

describe('SplitSelector — displays dice values', () => {
  it('renders 4 dice values', () => {
    render(<SplitSelector roll={makeRoll()} />);
    const diceContainer = screen.getByLabelText('Dice results');
    const dice = diceContainer.querySelectorAll('span');
    expect(dice).toHaveLength(4);
  });
});
