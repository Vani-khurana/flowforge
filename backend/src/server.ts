import { createApp } from './app';
import { config } from './config/env';

export const app = createApp();

if (process.env.VERCEL !== '1') {
  app.listen(config.port, () => {
    console.log(`🚀 FlowForge API running on port ${config.port} [${config.nodeEnv}]`);
  });
}

export default app;
