export class SubtaskSuggestionDto {
  title!: string;
}

export class SubtaskSuggestionsResponseDto {
  suggestions!: SubtaskSuggestionDto[];
}

export function toSuggestionResponse(titles: string[]): SubtaskSuggestionsResponseDto {
  return {
    suggestions: titles.map((title) => ({ title })),
  };
}
