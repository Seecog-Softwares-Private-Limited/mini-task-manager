import { UnprocessableEntityException } from '@nestjs/common';
import { DEFAULT_AI_SUBTASK_MAX_SUGGESTIONS } from '../../config/configuration';
import { buildSuggestSubtasksPrompt } from './prompts/suggest-subtasks.prompt';
import {
  filterNewSubtaskTitles,
  prepareSubtaskSuggestionInput,
  resolveMaxSubtaskSuggestions,
  SUBTASK_TITLE_MAX_LENGTH,
  validateSuggestionResponse,
} from './subtask-suggestion.util';

describe('suggest-subtasks prompt', () => {
  const built = buildSuggestSubtasksPrompt({
    title: 'Launch a website',
    description: 'Public marketing site',
    existingTitles: ['Design UI'],
    maxSuggestions: 8,
  });

  it('tells the model not to modify existing subtasks', () => {
    expect(built.system).toContain('Do not modify existing subtasks');
    expect(built.system).toContain('Never rewrite existing subtasks');
    expect(built.system).toContain('Never delete existing subtasks');
    expect(built.system).toContain('Never replace existing subtasks');
  });

  it('tells the model to suggest only missing subtasks and to return JSON only', () => {
    expect(built.system).toContain('suggest only missing subtasks');
    expect(built.system).toContain('Return JSON only');
  });

  it('sends title, plain description, and existing titles, not extra task fields', () => {
    expect(built.user).toContain('Launch a website');
    expect(built.user).toContain('Public marketing site');
    expect(built.user).toContain('- Design UI');
    expect(built.user).not.toContain('assignee');
    expect(built.user).not.toContain('@');
  });
});

describe('prepareSubtaskSuggestionInput', () => {
  it('strips HTML from a saved task and keeps only checklist titles', () => {
    const prepared = prepareSubtaskSuggestionInput({
      title: 'Fix office AC',
      description: '<p>The <b>lobby</b> unit is warm.</p><script>alert(1)</script>',
      subtasks: [
        { title: 'Check filters', completed: true } as { title: string },
        { title: '  ' },
      ],
    });
    expect(prepared.title).toBe('Fix office AC');
    expect(prepared.description).toBe('The lobby unit is warm.');
    expect(prepared.description).not.toContain('<');
    expect(prepared.existingTitles).toEqual(['Check filters']);
  });

  it('prepares an unsaved draft the same way', () => {
    const prepared = prepareSubtaskSuggestionInput({
      title: '  Launch a new website ',
      description: 'Plain draft',
      subtasks: [{ title: 'Design UI' }],
    });
    expect(prepared.title).toBe('Launch a new website');
    expect(prepared.description).toBe('Plain draft');
    expect(prepared.existingTitles).toEqual(['Design UI']);
  });
});

describe('validateSuggestionResponse', () => {
  it('accepts a valid AI response and returns titles only', () => {
    expect(
      validateSuggestionResponse(
        JSON.stringify({ suggestions: [{ title: 'Obtain required licenses' }] }),
      ),
    ).toEqual({ suggestions: [{ title: 'Obtain required licenses' }] });
  });

  it('rejects invalid JSON', () => {
    expect(() => validateSuggestionResponse('not json')).toThrow(UnprocessableEntityException);
    expect(() => validateSuggestionResponse('not json')).toThrow(/not valid JSON/);
  });

  it('rejects a missing suggestions field', () => {
    expect(() => validateSuggestionResponse(JSON.stringify({ items: [] }))).toThrow(/missing suggestions/);
  });

  it('rejects suggestions that are not an array', () => {
    expect(() => validateSuggestionResponse(JSON.stringify({ suggestions: { title: 'Nope' } }))).toThrow(
      /must be an array/,
    );
  });

  it('drops a suggestion with a missing title', () => {
    expect(validateSuggestionResponse(JSON.stringify({ suggestions: [{ note: 'x' }, { title: 'Keep me' }] }))).toEqual({
      suggestions: [{ title: 'Keep me' }],
    });
  });

  it('drops a non-string title', () => {
    expect(
      validateSuggestionResponse(JSON.stringify({ suggestions: [{ title: 12 }, { title: 'Keep me' }] })),
    ).toEqual({ suggestions: [{ title: 'Keep me' }] });
  });

  it('drops an empty title', () => {
    expect(validateSuggestionResponse(JSON.stringify({ suggestions: [{ title: '' }, { title: 'Keep me' }] }))).toEqual({
      suggestions: [{ title: 'Keep me' }],
    });
  });

  it('drops a whitespace-only title', () => {
    expect(
      validateSuggestionResponse(JSON.stringify({ suggestions: [{ title: '   ' }, { title: 'Keep me' }] })),
    ).toEqual({ suggestions: [{ title: 'Keep me' }] });
  });

  it('enforces the 200 character title limit', () => {
    const long = 'A'.repeat(SUBTASK_TITLE_MAX_LENGTH + 25);
    const result = validateSuggestionResponse(JSON.stringify({ suggestions: [{ title: long }] }));
    expect(result.suggestions[0].title).toHaveLength(SUBTASK_TITLE_MAX_LENGTH);
  });

  it('removes unsupported fields', () => {
    const result = validateSuggestionResponse(
      JSON.stringify({
        suggestions: [
          {
            title: 'Obtain required licenses',
            id: 'abc',
            assigneeId: 'user-1',
            priority: 'HIGH',
            dueDate: '2026-01-01',
            status: 'TODO',
          },
        ],
      }),
    );
    expect(result).toEqual({ suggestions: [{ title: 'Obtain required licenses' }] });
    expect(JSON.stringify(result)).not.toContain('assigneeId');
  });
});

describe('filterNewSubtaskTitles', () => {
  it('removes a suggestion that duplicates an existing subtask', () => {
    expect(filterNewSubtaskTitles(['Set up database', 'Write tests'], ['Set up database'], 8)).toEqual(['Write tests']);
  });

  it('removes a duplicate with different capitalization', () => {
    expect(filterNewSubtaskTitles(['set up database'], ['Set up database'], 8)).toEqual([]);
  });

  it('removes a duplicate with extra whitespace', () => {
    expect(filterNewSubtaskTitles(['Configure database'], ['Configure  database!'], 8)).toEqual([]);
  });

  it('removes a duplicate that differs only by punctuation', () => {
    expect(filterNewSubtaskTitles(['Configure database!'], ['Configure database'], 8)).toEqual([]);
  });

  it('keeps one suggestion when the model repeats the same title', () => {
    expect(
      filterNewSubtaskTitles(['Set up database', 'set up database', 'SET UP DATABASE'], [], 8),
    ).toEqual(['Set up database']);
  });

  it('returns an empty list when every suggestion is a duplicate', () => {
    expect(filterNewSubtaskTitles(['Set up database'], ['set up database'], 8)).toEqual([]);
  });

  it('limits the result to the configured maximum', () => {
    const titles = ['One', 'Two', 'Three', 'Four'];
    expect(filterNewSubtaskTitles(titles, [], 2)).toEqual(['One', 'Two']);
  });

  it('uses the Step 1 default when the maximum is missing', () => {
    expect(resolveMaxSubtaskSuggestions(undefined)).toBe(DEFAULT_AI_SUBTASK_MAX_SUGGESTIONS);
    expect(filterNewSubtaskTitles(['One', 'Two', 'Three'], [], undefined)).toHaveLength(
      Math.min(3, DEFAULT_AI_SUBTASK_MAX_SUGGESTIONS),
    );
  });
});
