import { BaseError, BaseErrorConfig } from "./BaseError";

export interface CommandNameNoCombinationsErrorConfig extends BaseErrorConfig { }

export class CommandNameNoCombinationsError extends BaseError<CommandNameNoCombinationsErrorConfig> {
  name = "CommandNameNoCombinationsError";
  constructor(config: CommandNameNoCombinationsErrorConfig) {
    super(config);
  }
}