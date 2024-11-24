import { Logger } from "@pefish/js-logger";
import "dotenv/config";

export interface StartArgs {
  logger: Logger;
  abortSignal: AbortSignal;
}

export default class Starter {
  static start(
    method: (args: StartArgs) => Promise<void>,
    onExit?: (err: Error) => Promise<void>
  ): void {
    let shutDownCount = 0;
    const abortController = new AbortController();
    const logger = new Logger();

    method({
      logger: logger,
      abortSignal: abortController.signal,
    })
      .then(() => {
        onExit &&
          onExit(null).then(() => {
            process.exit(0);
          });
      })
      .catch((err: Error) => {
        logger.error(err);
        onExit &&
          onExit(err).then(() => {
            process.exit(1);
          });
      });

    const cleanupAndExit = () => {
      if (shutDownCount > 3) {
        return;
      }
      if (shutDownCount < 3) {
        abortController.abort("Ctrl C");
        logger.info(`Got interrupt, exiting... ${3 - shutDownCount}`);
        return;
      }
      logger.info(`Got interrupt, exiting...`);
      onExit &&
        onExit(null).then(() => {
          process.exit(0);
        });
    };

    process.on("SIGINT", () => {
      shutDownCount++;
      logger.info("Received SIGINT (Ctrl+C). Cleaning up...");
      cleanupAndExit();
    });

    process.on("SIGTERM", () => {
      shutDownCount++;
      logger.info("Received SIGTERM. Cleaning up...");
      cleanupAndExit();
    });
  }
}
