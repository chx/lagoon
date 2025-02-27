// @flow

import uuid4 from 'uuid4';
import { logger } from '@lagoon/commons/dist/local-logging';
import { sendToLagoonLogs } from '@lagoon/commons/dist/logs';
import { harborScanningCompleted } from '../handlers/problems/harborScanningCompleted';
import { processHarborVulnerabilityList } from '../handlers/problems/processHarborVulnerabilityList';
import { processDrutinyResultset }  from '../handlers/problems/processDrutinyResults';

import {
  WebhookRequestData,
  Project
} from '../types';

// NOTE: Here we are going through the process of deprecating the Trivy integration
const enableHarborIntegration = (() => {
	if(process.env.ENABLE_DEPRECATED_TRIVY_INTEGRATION && process.env.ENABLE_DEPRECATED_TRIVY_INTEGRATION == "true") {
    console.log("ENABLE_DEPRECATED_TRIVY_INTEGRATION is 'true' -- enabling Harbor/Trivy");
		return true;
	}
  console.log("ENABLE_DEPRECATED_TRIVY_INTEGRATION is not 'true' -- Harbor/Trivy integration is not enabled");
	return false;
})();

export async function processProblems(
    rabbitMsg,
    channelWrapperWebhooks
  ): Promise<void> {
    const webhook: WebhookRequestData = JSON.parse(rabbitMsg.content.toString());
    const {
      webhooktype,
      event
    } = webhook;

    switch(webhook.event) {
      case 'harbor:scanningcompleted' :
        if(enableHarborIntegration == true) {
          console.log("NOTE: Harbor integration for Problems is deprecated and will be removed from Lagoon in an upcoming release");
          await handle(harborScanningCompleted, webhook, `${webhooktype}:${event}`, channelWrapperWebhooks);
        } else {
          console.log("NOTE: Harbor scan recieved but not processed because Harbor/Trivy integration is disabled");
        }

        break
      case 'harbor:scanningresultfetched' :
        if(enableHarborIntegration == true) {
          console.log("NOTE: Harbor integration for Problems is deprecated and will be removed from Lagoon in an upcoming release");
          await handle(processHarborVulnerabilityList, webhook, `${webhooktype}:${event}`, channelWrapperWebhooks);
        } else {
          console.log("NOTE: Harbor scan recieved but not processed because Harbor/Trivy integration is disabled");
        }
      break;
      case 'drutiny:resultset' :
        await handle(processDrutinyResultset, webhook, `${webhooktype}:${event}`, channelWrapperWebhooks);
      break;
    }
    channelWrapperWebhooks.ack(rabbitMsg);
};

async function handle(handler, webhook: WebhookRequestData, fullEvent: string, channelWrapperWebhooks) {
  const {
    uuid
  } = webhook;

  logger.info(`Handling ${fullEvent}`, {
    uuid
  });

  try {
    await handler(webhook, channelWrapperWebhooks);
  } catch (error) {
    logger.error(`Error handling ${fullEvent}`);
    logger.error(error);
  }
}

async function unhandled(webhook: WebhookRequestData, fullEvent: string) {
  const {
    uuid
  } = webhook;

  const meta = {
    fullEvent: fullEvent
  };
  sendToLagoonLogs(
    'info',
    '',
    uuid,
    `unhandledWebhook`,
    meta,
    `Unhandled webhook ${fullEvent}`
  );
  return;
}
