import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../config/configuration';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TasksModule } from '../tasks/tasks.module';
import { AiController } from './ai.controller';
import { SubtaskSuggestionsService } from './subtask-suggestions.service';
import { AddSubtasksByTitleService } from './add-subtasks-by-title.service';
import {
  AI_COMPLETION_PROVIDER,
  AiCompletionProvider,
  AiProviderUnavailableError,
} from './providers/ai-completion.provider';
import { GroqCompletionProvider } from './providers/groq-completion.provider';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => OrganizationsModule),
    forwardRef(() => TasksModule),
  ],
  controllers: [AiController],
  providers: [
    GroqCompletionProvider,
    {
      provide: AI_COMPLETION_PROVIDER,
      useFactory: (
        config: ConfigService<Configuration>,
        groq: GroqCompletionProvider,
      ): AiCompletionProvider => {
        const provider = config.get('ai', { infer: true })?.provider;
        if (provider === 'groq') return groq;
        return {
          completeJson: async () => {
            throw new AiProviderUnavailableError();
          },
        };
      },
      inject: [ConfigService, GroqCompletionProvider],
    },
    SubtaskSuggestionsService,
    AddSubtasksByTitleService,
  ],
})
export class AiModule {}
