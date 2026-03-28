import { test, expect } from 'vitest';
import fc from 'fast-check';
import { transition, initialState } from './stateMachine';
import type { GameState, GamePhase } from './stateMachine';

// Generator for a valid subset of states if we want to run full coverage
const generateState = () => fc.record({
  phase: fc.constantFrom<GamePhase>('idle', 'scanning', 'item', 'narrative', 'challenge', 'resolving', 'story_complete'),
  scannedLabel: fc.option(fc.string(), { nil: null }),
  generatedItem: fc.option(fc.record({
    name: fc.string(),
    description: fc.string(),
    mechanicTag: fc.string()
  }), { nil: null }),
  challengeStep: fc.integer({min: 1, max: 3})
}) as fc.Arbitrary<GameState>;

const generateEvent = () => fc.oneof(
  fc.record({ type: fc.constant('START_SCAN' as const) }),
  fc.record({ type: fc.constant('OBJECT_DETECTED' as const), label: fc.string() }),
  fc.record({ type: fc.constant('ITEM_GENERATED' as const), item: fc.record({ name: fc.string(), description: fc.string(), mechanicTag: fc.string() }) }),
  fc.record({ type: fc.constant('NARRATIVE_DONE' as const) }),
  fc.record({ type: fc.constant('SUBMIT_CHOICE' as const) }),
  fc.record({ type: fc.constant('NEXT_CHALLENGE' as const) }),
  fc.record({ type: fc.constant('END_STORY' as const) }),
  fc.record({ type: fc.constant('RESET' as const) })
);

test('No Invalid State Transitions', () => {
  fc.assert(
    fc.property(generateState(), generateEvent(), (state, event) => {
      const nextState = transition(state, event as any);
      // Valid phase check
      expect(['idle', 'scanning', 'item', 'narrative', 'challenge', 'resolving', 'story_complete']).toContain(nextState.phase);
      
      // RESET always returns idle
      if (event.type === 'RESET') {
        expect(nextState.phase).toBe('idle');
      }
    })
  );
});

test('Valid progression from scanner to challenge', () => {
    let state = initialState;
    expect(state.phase).toBe('idle');
    
    state = transition(state, { type: 'START_SCAN' });
    expect(state.phase).toBe('scanning');
    
    state = transition(state, { type: 'OBJECT_DETECTED', label: 'apple' });
    expect(state.phase).toBe('item');
    
    state = transition(state, { type: 'ITEM_GENERATED', item: { name: 'A', description: 'B', mechanicTag: 'combat' } });
    expect(state.phase).toBe('narrative');
    
    state = transition(state, { type: 'NARRATIVE_DONE' });
    expect(state.phase).toBe('challenge');
});
