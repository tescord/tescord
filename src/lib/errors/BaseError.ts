import kleur from "kleur";

export interface BaseErrorConfig {
  message: string;
}

export abstract class BaseError<TConfig extends BaseErrorConfig = BaseErrorConfig> extends Error {
  abstract name: string;
  constructor(public config: TConfig) {
    super();
  }

  calculateError(): string | null {
    return null;
  }

  toString() {
    const error = this.calculateError?.();
    return `${kleur.bold(this.name)}: ${kleur.italic(this.config.message)}${error ? `\n${error}` : ""}\n\n${this.stack}`;
  }
}