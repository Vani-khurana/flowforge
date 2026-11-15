import { createApp } from './app';
import { config } from './config/env';

const app = createApp();

app.listen(config.port, () => {
  console.log(`🚀 FlowForge API running on port ${config.port} [${config.nodeEnv}]`);
});
