import { Module, forwardRef } from '@nestjs/common';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { AutomationsModule } from '../automations/automations.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { OrgEventsService } from './org-events.service';

@Module({
  imports: [
    WebhooksModule,
    forwardRef(() => AutomationsModule),
    IntegrationsModule,
  ],
  providers: [OrgEventsService],
  exports: [OrgEventsService],
})
export class OrgEventsModule {}
