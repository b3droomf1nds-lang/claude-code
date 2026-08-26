import {
  startCompareHarnessServer,
  stopCompareHarnessServer
} from '../../scripts/compare-harness-server.mjs';

export default async function globalSetup() {
  await startCompareHarnessServer();
  return stopCompareHarnessServer;
}
