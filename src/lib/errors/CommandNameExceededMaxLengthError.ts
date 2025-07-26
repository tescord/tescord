import { BaseError, BaseErrorConfig } from "./BaseError";
import kleur from "kleur";

export interface CommandNameExceededMaxLengthErrorConfig extends BaseErrorConfig {
  nameCombinationsSplited: string[][];
}

export class CommandNameExceededMaxLengthError extends BaseError<CommandNameExceededMaxLengthErrorConfig> {
  name = "CommandNameExceededMaxLengthError";
  constructor(config: CommandNameExceededMaxLengthErrorConfig) {
    super(config);
  }

  calculateError(): string {
    const { nameCombinationsSplited } = this.config;

    const exceededNames = nameCombinationsSplited.map((nameCombination) => {
      return nameCombination.map((name, i) => {
        return kleur.bgCyan().black(`${i >= 3 ? kleur.red().strikethrough(name) : (name.length > 32 ? kleur.underline(name) : name)} [${name.length}/32]`);
      }).join(" ");
    });

    return exceededNames.map((name) => `- ${name}`).join("\n");
  }
}