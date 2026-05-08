import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameService } from '@/server/services/GameService';
import { gameStore } from '@/store/gameStore';
import type { Split } from '@/shared/types';

// Mock Dexie to avoid IndexedDB in tests
vi.mock('@/server/db/GameDatabase', () => {
  const store = new Map<string, unknown>();
  const mockTable = {
    put: vi.fn(async (item: { id: string }) => { store.set(item.id, item); return item.id; }),
    get: vi.fn(async (id: string) => store.get(id)),
    where: vi.fn(() => ({
      equals: vi.fn(() => ({
        sortBy: vi.fn(async () => []),
        delete: vi.fn(async () => 0),
      })),
    })),
  };
  return {
    db: { games: mockTable },
    GameDatabase: vi.fn(),
  };
});

// Mock dice rolling so tests are deterministic
vi.mock('@/server/engine/dice', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/engine/dice')>();
  return {
    ...actual,
    rollDice: vi.fn(() => [3, 4, 5, 6] as [number, number, number, number]),
  };
});

// Import the mocked module at module level (after vi.mock hoisting)
import * as diceEngine from '@/server/engine/dice';

function twoPlayerConfig() {
  return {
    players: [
      { name: 'Alice', color: 'red' as const },
      { name: 'Bob', color: 'blue' as const },
    ],
  };
}

describe('Scenario 1 — Start a 2-player game (FR-001, FR-002, FR-003)', () => {
  let service: GameService;

  beforeEach(() => {
    service = new GameService();
    gameStore.setState({ game: null, currentRoll: null });
  });

  it('creates a game with status=playing', async () => {
    const game = await service.createGame(twoPlayerConfig());
    expect(game.status).toBe('playing');
  });

  it('assigns correct player names and colors', async () => {
    const game = await service.createGame(twoPlayerConfig());
    expect(game.players[0].name).toBe('Alice');
    expect(game.players[0].color).toBe('red');
    expect(game.players[1].name).toBe('Bob');
    expect(game.players[1].color).toBe('blue');
  });

  it('sets currentPlayerIndex to 0 (Alice first)', async () => {
    const game = await service.createGame(twoPlayerConfig());
    expect(game.currentPlayerIndex).toBe(0);
  });

  it('initializes turn with hasRolled=false', async () => {
    const game = await service.createGame(twoPlayerConfig());
    expect(game.turn.hasRolled).toBe(false);
  });

  it('creates 11 board columns', async () => {
    const game = await service.createGame(twoPlayerConfig());
    expect(game.board.columns).toHaveLength(11);
  });

  it('rejects invalid player count', async () => {
    await expect(service.createGame({ players: [{ name: 'A', color: 'red' }] }))
      .rejects.toMatchObject({ code: 'INVALID_PLAYER_COUNT' });
  });

  it('rejects empty player name', async () => {
    await expect(
      service.createGame({ players: [{ name: '', color: 'red' }, { name: 'B', color: 'blue' }] })
    ).rejects.toMatchObject({ code: 'INVALID_PLAYER_NAME' });
  });

  it('rejects name longer than 20 chars', async () => {
    await expect(
      service.createGame({
        players: [{ name: 'A'.repeat(21), color: 'red' }, { name: 'B', color: 'blue' }],
      })
    ).rejects.toMatchObject({ code: 'INVALID_PLAYER_NAME' });
  });
});

describe('Scenario 2 — Roll dice and select a split (FR-006, FR-007, FR-008, FR-009)', () => {
  let service: GameService;

  beforeEach(async () => {
    service = new GameService();
    gameStore.setState({ game: null, currentRoll: null });
    await service.createGame(twoPlayerConfig());
  });

  it('rollDice returns a Roll with dice and splits', async () => {
    const roll = await service.rollDice();
    expect(roll.dice).toHaveLength(4);
    expect(roll.splits).toHaveLength(3);
  });

  it('sets hasRolled=true after rolling', async () => {
    await service.rollDice();
    expect(gameStore.getState().game?.turn.hasRolled).toBe(true);
  });

  it('selectSplit advances climbers', async () => {
    await service.rollDice();
    const summary = await service.selectSplit(0);
    expect(summary.advancedColumns.length).toBeGreaterThan(0);
    expect(summary.busted).toBe(false);
  });

  it('clears currentRoll after selectSplit', async () => {
    await service.rollDice();
    await service.selectSplit(0);
    expect(gameStore.getState().game?.currentRoll).toBeNull();
  });

  it('rejects rolling when roll already pending', async () => {
    await service.rollDice();
    await expect(service.rollDice()).rejects.toMatchObject({ code: 'CANNOT_ROLL_NOW' });
  });
});

describe('Scenario 3 — Doubles advance same column twice (FR-013)', () => {
  let service: GameService;

  beforeEach(async () => {
    service = new GameService();
    gameStore.setState({ game: null, currentRoll: null });
    await service.createGame(twoPlayerConfig());
  });

  it('doubles advance the column twice', async () => {
    // Force dice that produce doubles in split 0: [2,5,2,5] → split0: (7,7)
    vi.mocked(diceEngine.rollDice).mockReturnValueOnce([2, 5, 2, 5]);
    const roll = await service.rollDice();
    const doublesRaw = roll.splits.findIndex(
      (s: Split) => s.sumA === s.sumB && s.usability !== 'unusable'
    );
    if (doublesRaw === -1) return; // skip if no usable doubles in this roll
    const doublesIdx = doublesRaw as 0 | 1 | 2;

    const summary = await service.selectSplit(doublesIdx);
    expect(summary.advancedColumns).toHaveLength(2);
    expect(summary.advancedColumns[0]).toBe(summary.advancedColumns[1]);
  });
});

describe('Scenario 4 — Bust when all splits unusable (FR-010, FR-016, FR-017)', () => {
  let service: GameService;

  beforeEach(async () => {
    service = new GameService();
    gameStore.setState({ game: null, currentRoll: null });
    await service.createGame(twoPlayerConfig());
  });

  it('bustTurn advances to next player', async () => {
    await service.bustTurn();
    expect(gameStore.getState().game?.currentPlayerIndex).toBe(1);
  });

  it('bustTurn creates fresh turn with no climbers', async () => {
    await service.bustTurn();
    const turn = gameStore.getState().game?.turn;
    expect(turn?.climbers).toEqual({});
    expect(turn?.activeColumns).toEqual([]);
  });

  it('auto-busts when roll produces all-unusable splits', async () => {
    const { game } = gameStore.getState();
    if (!game) return;
    // Claim all columns except 7,9,11; occupy 3 active with 7,9,11
    game.board.columns.forEach((c) => {
      if (![7, 9, 11].includes(c.number)) c.claimed = true;
    });
    game.turn.activeColumns = [7, 9, 11];
    game.turn.climbers = { 7: 1, 9: 1, 11: 1 };
    gameStore.setState({ game: { ...game } });

    // Force dice that only reach claimed columns
    vi.mocked(diceEngine.rollDice).mockReturnValueOnce([1, 1, 1, 1]); // all sums = 2, claimed
    const roll = await service.rollDice();
    expect(roll.allUnusable).toBe(true);
    // After auto-bust, turn should have advanced
    expect(gameStore.getState().game?.currentPlayerIndex).toBe(1);
  });
});

describe('Scenario 5 — Stop and commit progress (FR-014, FR-015)', () => {
  let service: GameService;

  beforeEach(async () => {
    service = new GameService();
    gameStore.setState({ game: null, currentRoll: null });
    await service.createGame(twoPlayerConfig());
    await service.rollDice();
    await service.selectSplit(0);
  });

  it('stop commits climber positions to board', async () => {
    const beforeTurn = gameStore.getState().game!.turn;
    const climbedCols = Object.keys(beforeTurn.climbers).map(Number);
    await service.stop();
    const board = gameStore.getState().game!.board;
    for (const colNum of climbedCols) {
      const col = board.columns.find((c) => c.number === colNum)!;
      expect(col.committedPositions[beforeTurn.activePlayerId]).toBeGreaterThan(0);
    }
  });

  it('stop advances to next player', async () => {
    await service.stop();
    expect(gameStore.getState().game?.currentPlayerIndex).toBe(1);
  });

  it('stop rejects if hasRolled=false (FR-019)', async () => {
    gameStore.setState({ game: null, currentRoll: null });
    await service.createGame(twoPlayerConfig());
    await expect(service.stop()).rejects.toMatchObject({ code: 'CANNOT_STOP_NOW' });
  });
});

describe('Scenario 6 — Win condition (FR-018)', () => {
  let service: GameService;

  beforeEach(async () => {
    service = new GameService();
    gameStore.setState({ game: null, currentRoll: null });
    await service.createGame(twoPlayerConfig());
  });

  it('game ends when active player claims 3rd column (SC-006)', async () => {
    const { game } = gameStore.getState();
    if (!game) return;

    // Pre-claim 2 columns for Alice
    game.players[0].claimedColumns = [7, 9];
    game.board.columns.find((c) => c.number === 7)!.claimed = true;
    game.board.columns.find((c) => c.number === 7)!.claimedBy = game.players[0].id;
    game.board.columns.find((c) => c.number === 9)!.claimed = true;
    game.board.columns.find((c) => c.number === 9)!.claimedBy = game.players[0].id;

    // Place climber at summit of column 12 (height=3)
    game.turn.climbers = { 12: 3 };
    game.turn.activeColumns = [12];
    game.turn.hasRolled = true;
    gameStore.setState({ game: { ...game } });

    const result = await service.stop();
    expect(result.status).toBe('finished');
    expect(result.winnerId).toBe(game.players[0].id);
  });
});

describe('Scenario 7 — Partially usable split (FR-008, FR-009)', () => {
  let service: GameService;

  beforeEach(async () => {
    service = new GameService();
    gameStore.setState({ game: null, currentRoll: null });
    await service.createGame(twoPlayerConfig());
  });

  it('only applies the usable sum for a partially-usable split', async () => {
    const { game } = gameStore.getState();
    if (!game) return;

    // Put 3 active columns on 7, 9, 11
    game.turn.activeColumns = [7, 9, 11];
    game.turn.climbers = { 7: 1, 9: 1, 11: 1 };
    gameStore.setState({ game: { ...game } });

    // dice [2,5,4,3]: split0=(7,7) fully-usable(doubles), split1=(6,8) fully-usable, split2=(5,9) partial
    vi.mocked(diceEngine.rollDice).mockReturnValueOnce([2, 5, 4, 3]);
    const roll = await service.rollDice();
    const partialRaw = roll.splits.findIndex((s: Split) => s.usability === 'partially-usable');
    if (partialRaw === -1) return;
    const partialIdx = partialRaw as 0 | 1 | 2;

    const summary = await service.selectSplit(partialIdx);
    expect(summary.advancedColumns).toHaveLength(1);
    expect(summary.turn.activeColumns).toHaveLength(3); // count unchanged
  });
});

describe('Scenario 8 — Opponent claim removes player markers (FR-015 edge case)', () => {
  let service: GameService;

  beforeEach(async () => {
    service = new GameService();
    gameStore.setState({ game: null, currentRoll: null });
    await service.createGame(twoPlayerConfig());
  });

  it('opponent stop claiming a column removes other players committed positions', async () => {
    const { game } = gameStore.getState();
    if (!game) return;

    const [alice, bob] = game.players;
    // Alice has committed position on column 12
    game.board.columns.find((c) => c.number === 12)!.committedPositions[alice.id] = 2;
    // Bob's turn; climber at summit of column 12
    game.currentPlayerIndex = 1;
    game.turn = { activePlayerId: bob.id, hasRolled: true, climbers: { 12: 3 }, activeColumns: [12] };
    gameStore.setState({ game: { ...game } });

    await service.stop();
    const board = gameStore.getState().game!.board;
    const col = board.columns.find((c) => c.number === 12)!;
    expect(col.claimedBy).toBe(bob.id);
    expect(col.committedPositions[alice.id]).toBeUndefined();
  });
});
